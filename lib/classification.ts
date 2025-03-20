import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { DataAccess, EmbeddingsTable } from '@/lib/DataAccess';
import { createEmbeddingProvider } from '@/lib/utils';
import * as schema from '@/db/schema';


export function printSimilarIncidentsClassifications(result: any) {
    const { incidents } = result;

    if (incidents.length === 0) {
        return `No similar incidents found.`;
    }

    let output = '';

    for (const incident of incidents) {
        if (!incident.title) {
            throw new Error(`Incident ${incident.incident_id} is missing title`);
        }

        output += `Id: ${incident.incident_id}
title: ${incident.title}
description: `;

        if (!incident.description) {
            output += 'No description available';
        } else {
            output += incident.description;
        }

        output += '\n\nfirst report text: ';

        // First check if reports array exists and has items
        if (!incident.reports || !Array.isArray(incident.reports) || incident.reports.length === 0) {
            console.warn(`No reports array found for incident ${incident.incidentId}`);
            output += 'No report array found';
        }
        // Then check if the first report has a text property that is not null, undefined, or empty
        else if (incident.reports[0] && incident.reports[0].text) {
            console.log(`Debug: Found report text for incident ${incident.incidentId}: ${incident.reports[0].text.substring(0, 50)}...`);
            output += incident.reports[0].text;
        }
        else {
            // Either the report object is missing or it doesn't have a text property
            console.warn(`No report text available for incident ${incident.incidentId}, report object: ${JSON.stringify(incident.reports[0])}`);
            output += 'No report text available';
        }

        output += '\n\nclassifications:\n';

        if (!incident.classifications || incident.classifications.length === 0) {
            output += `No classifications available\n`;
        } else {
            incident.classifications.forEach(classification => {
                output += `${JSON.stringify(classification, null, 2)}\n`;
            });
        }

        output += `\n---\n\n`;
    }

    output += `Taxonomy: ${result.taxonomyData.namespace}
Classification Count: ${result.taxonomyData.classificationCount}`;

    if ('message' in result.taxonomyData && result.taxonomyData.message) {
        output += `\nMessage: ${result.taxonomyData.message}`;
    }

    return output;
}

export async function getPrompt(text: string, taxonomy: string, embeddingsTable: EmbeddingsTable = schema.embeddings) {
    const dataAccess = new DataAccess(createEmbeddingProvider('openai'), embeddingsTable);

    const taxonomyData = await dataAccess.fetchTaxonomyDetails(taxonomy);
    const similar = await dataAccess.getSimilarIncidentsClassifications(text, taxonomy, 10);
    const similarOutput = printSimilarIncidentsClassifications(similar);

    // Extract all field_list short_names to use in the prompt
    const requiredFields = taxonomyData.field_list?.map(field => field?.short_name).filter(Boolean) || [];
    
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

IMPORTANT: Your classification MUST include ALL of the following taxonomy attributes:
${requiredFields.join(', ')}

For maximum accuracy and completeness:
1. Include EVERY single required field listed above in your response
2. Do not omit any attributes from the taxonomy field_list
3. Use the permitted_values from the taxonomy when provided
4. Review similar incidents to understand how each field is typically used

Return your response as a JSON object with the following structure:

{
  "classification": {
    "namespace": "${taxonomy}",
    "attributes": [
      {"short_name": "attribute1", "value_json": "\"value1\""},
      {"short_name": "attribute2", "value_json": "\"value2\""},
      // Include ALL attributes from the field_list above
    ]
  },
  "explanation": "A detailed explanation of your classification choices.",
  "confidence": "A confidence score between 0 and 1"
}
  
DO NOT include any other text in your response, nor any other characters. 
DO NOT start your response with \`\`\`json or \`\`\`
Ensure that each attribute in the field_list is included in your classification, even if you need to use a default or "unknown" value.
`;

    return prompt;
}

export async function generateClassification(text: string, taxonomy: string, embeddingsTable: EmbeddingsTable = schema.embeddings): Promise<string> {
    if (!text) throw new Error('Please provide a valid text');
    if (!taxonomy) throw new Error('Please provide a valid taxonomy namespace');

    const prompt = await getPrompt(text, taxonomy, embeddingsTable);

    console.log('Prompt:');
    console.log(prompt);

    console.log('Generating classification...');
    const result = await generateText({
        model: openai("gpt-4o", { structuredOutputs: true }),
        prompt: prompt,
    });

    let resultText = result.text;

    console.log('Result:');
    console.log(resultText);

    if (resultText.startsWith('```json')) {
        resultText = resultText.replace(/^```json\n|\n```$/g, '');
    }

    return resultText;
} 