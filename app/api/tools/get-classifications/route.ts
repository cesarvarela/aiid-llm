import { NextResponse } from 'next/server';
import { Search } from '@/lib/Search';
import { createEmbeddingProvider } from '@/lib/utils';
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { gql } from 'graphql-tag';
import { SearchResult, IncidentWithClassifications, SimilarIncidentsResult } from '@/lib/types';
import { Taxa } from '@/graphql/generated/graphql';
import { getApolloClient } from '@/lib/apolloClient';

const search = new Search(createEmbeddingProvider('openai'));
const client = getApolloClient();

async function fetchTaxonomyDetails(namespace: string): Promise<Taxa | null> {

  const FETCH_TAXONOMY_DETAILS = gql`
    query FetchTaxonomyDetails($namespace: String!) {
      taxa(filter: { namespace: { EQ: $namespace } }) {
        namespace
        weight
        description
        field_list {
          short_name
          short_description
        }
      }
    }
  `;

  try {
    const response = await client.query({
      query: FETCH_TAXONOMY_DETAILS,
      variables: { namespace },
    });

    return response.data.taxa;

  }
  catch (error) {
    console.error(`Error fetching taxonomy details for ${namespace}:`, error);
    return null;
  }
}

async function getSimilarIncidentsClassifications(text: string, taxonomy: string): Promise<SimilarIncidentsResult> {

  const results = await search.vectorSearch(text) as SearchResult[];

  if (results.length === 0) {
    return {
      incidents: [],
      taxonomyData: {
        namespace: taxonomy,
        classificationCount: 0,
        message: 'No similar incidents found.'
      }
    };
  }

  const incidentIds = results
    .filter(result => result.sourceType === 'incident')
    .map(result => parseInt(result.sourceId, 10));

  const incidents = await search.getIncidents(incidentIds, true) as IncidentWithClassifications[];

  const incidentsWithClassifications = incidents
    .filter(incident => incident.classifications && incident.classifications.length > 0)
    .filter(incident => incident.classifications.some(classification => classification.namespace === taxonomy));

  if (incidentsWithClassifications.length === 0) {
    return {
      incidents: incidents,
      taxonomyData: {
        namespace: taxonomy,
        classificationCount: 0,
        message: `Found similar incidents, but none have classifications for the '${taxonomy}' taxonomy. Try a different taxonomy namespace.`
      }
    };
  }

  const sortedIncidents = incidentsWithClassifications
    .sort((a, b) => {
      const aResult = results.find(r => r.sourceType === 'incident' && parseInt(r.sourceId, 10) === a.incidentId);
      const bResult = results.find(r => r.sourceType === 'incident' && parseInt(r.sourceId, 10) === b.incidentId);
      const aScore = aResult ? Number(aResult.score) : 0;
      const bScore = bResult ? Number(bResult.score) : 0;
      return bScore - aScore;
    })
    .map(incident => ({
      ...incident,
      classifications: incident.classifications
        .filter(c => c.namespace === taxonomy)
    }));

  return {
    incidents: sortedIncidents.slice(0, 5), // Return top 5 similar incidents
    taxonomyData: {
      namespace: taxonomy,
      classificationCount: sortedIncidents.length
    }
  };
}

function printSimilarIncidentsClassifications(result: Awaited<ReturnType<typeof getSimilarIncidentsClassifications>>) {
  const { incidents } = result;

  if (incidents.length === 0) {
    return `No similar incidents found.`;
  }

  let output = '';

  incidents.forEach(incident => {
    output += `Id: ${incident.incidentId}
title: ${incident.title}
description: ${incident.description || 'No description available'}

classifications:
`;

    if (!incident.classifications || incident.classifications.length === 0) {
      output += `No classifications available\n`;
    } else {
      incident.classifications.forEach(classification => {
        output += `${JSON.stringify(classification, null, 2)}\n`;
      });
    }

    output += `\n---\n\n`;
  });

  output += `Taxonomy: ${result.taxonomyData.namespace}
Classification Count: ${result.taxonomyData.classificationCount}`;

  if ('message' in result.taxonomyData && result.taxonomyData.message) {
    output += `\nMessage: ${result.taxonomyData.message}`;
  }

  return output;
}

async function getPrompt(text: string, taxonomy: string) {

  const taxonomyData = await fetchTaxonomyDetails(taxonomy);

  if (!taxonomyData) {
    throw `Taxonomy '${taxonomy}' not found. Please provide a valid taxonomy namespace.`;
  }

  const similar = await getSimilarIncidentsClassifications(text, taxonomy);
  const similarOutput = printSimilarIncidentsClassifications(similar);

  const prompt = `You are an AI assistant that helps classify AI incidents according to a taxonomy.

Your task is to analyze the provided incident text and classify it according to the specified taxonomy.

Always require both the incident text and the taxonomy namespace to perform classification.

Here is the incident text to classify:
${text}

Here is the taxonomy namespace to use for classification:
${taxonomy}

Here is the taxonomy data:
${JSON.stringify(taxonomyData, null, 2)}

Here are similar incidents and their classifications:
${similarOutput}

Based on the incident text and the taxonomy, provide a classification for this incident.

Return your response as a JSON object with the following structure:

{
  "classification": {
    "attribute1": "value1",
    "attribute2": "value2",
    ...
  },
  "explanation": "A detailed explanation of your classification choices.",
  "confidence": "A confidence score between 0"
}
  
DO NOT include any other text in your response, nor any other characters.
`;

  return prompt;
}


export async function POST(req: Request) {
  try {
    const { text, taxonomy } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid question' },
        { status: 400 }
      );
    }

    if (!taxonomy || typeof taxonomy !== 'string' || !taxonomy.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid taxonomy namespace' },
        { status: 400 }
      );
    }

    const prompt = await getPrompt(text, taxonomy);

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    return NextResponse.json(result.text);
  }
  catch (error) {
    console.error('Error in get-information API:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 