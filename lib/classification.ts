import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { DataAccess, EmbeddingsTable } from '@/lib/DataAccess';
import { createEmbeddingProvider } from '@/lib/utils';
import * as schema from '@/db/schema';
import { Attribute, Classification, Incident } from '@/graphql/generated/graphql';

interface LlmClassificationOutput {
  classification: Partial<Classification>;
  explanation?: string;
  confidence?: number;
}

export function printSimilarIncidentsClassifications(
  result: { incidents: Incident[]; taxonomyData: { namespace: string; classificationCount: number; message?: string } },
  attributeShortNames?: string[]
) {
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

    if (!incident.reports || !Array.isArray(incident.reports) || incident.reports.length === 0) {
      console.warn(`No reports array found for incident ${incident.incident_id}`);
      output += 'No report array found';
    } else if (incident.reports[0] && incident.reports[0].text) {
      console.log(`Debug: Found report text for incident ${incident.incident_id}: ${incident.reports[0].text.substring(0, 50)}...`);
      output += incident.reports[0].text;
    } else {
      console.warn(`No report text available for incident ${incident.incident_id}, report object: ${JSON.stringify(incident.reports[0])}`);
      output += 'No report text available';
    }

    output += '\n\nclassifications:\n';


    if (!Array.isArray(incident.classifications) || incident.classifications.length === 0) {
      output += `No classifications available\n`;
    }
    else {

      incident.classifications.forEach((classification: Classification) => {

        let relevantAttributes: Attribute[];



        if (attributeShortNames && attributeShortNames.length > 0) {
          const requestedNamesSet = new Set(attributeShortNames);
          relevantAttributes = (classification.attributes || []).filter((attribute: Attribute) =>
            attribute.short_name && requestedNamesSet.has(attribute.short_name)
          );
        }
        else {

          relevantAttributes = classification.attributes || [];
        }


        if (relevantAttributes.length === 0) {

          output += `  No attributes available${attributeShortNames ? ' for the specified attributes' : ''} in classification ${classification.namespace || '(unknown namespace)'}\n`;
        }
        else {
          relevantAttributes.forEach((attribute: Attribute) => {

            let formattedValue = attribute.value_json;
            try {
              let parsedValue = JSON.parse(attribute.value_json);
              if (typeof parsedValue === 'string') {
                try {
                  const innerParsed = JSON.parse(parsedValue);
                  formattedValue = JSON.stringify(innerParsed);
                } catch (innerError) {
                  formattedValue = JSON.stringify(parsedValue);
                }
              } else {
                formattedValue = JSON.stringify(parsedValue);
              }
            } catch (e) {

              formattedValue = JSON.stringify(attribute.value_json);
            }

            const outputAttribute = {
              short_name: attribute.short_name,
              value_json: formattedValue
            };

            output += `  ${JSON.stringify(outputAttribute, null, 2).replace(/\n/g, '\n  ')}\n`;
          });
        }
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

export async function getPrompt(text: string, taxonomy: string, embeddingsTable: EmbeddingsTable = schema.embeddings, attributeShortNames?: string[]) {
  const dataAccess = new DataAccess(createEmbeddingProvider('openai'), embeddingsTable);

  const taxonomyData = await dataAccess.fetchTaxonomyDetails(taxonomy);
  const similar = await dataAccess.getSimilarIncidentsClassifications(text, taxonomy, 10);
  const similarOutput = printSimilarIncidentsClassifications(similar, attributeShortNames);

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

export async function getSingleAttributePrompt(text: string, taxonomy: string, attributeShortName: string, embeddingsTable: EmbeddingsTable = schema.embeddings) {
  const dataAccess = new DataAccess(createEmbeddingProvider('openai'), embeddingsTable);

  const taxonomyData = await dataAccess.fetchTaxonomyDetails(taxonomy);
  const similar = await dataAccess.getSimilarIncidentsClassifications(text, taxonomy, 10);
  const similarOutput = printSimilarIncidentsClassifications(similar);

  const targetField = taxonomyData.field_list?.find(field => field?.short_name === attributeShortName);
  if (!targetField) {
    throw new Error(`Attribute "${attributeShortName}" not found in taxonomy "${taxonomy}"`);
  }

  const prompt = `You are an AI assistant that helps classify AI incidents according to a specific taxonomy attribute.

Your task is to analyze the provided incident text and classify it ONLY for the specified taxonomy attribute: "${attributeShortName}".

Always require the incident text, the taxonomy namespace, and the specific attribute short_name to perform classification.

Here is the incident text to classify:
${text}

Here is the taxonomy namespace:
${taxonomy}

Here is the specific attribute to classify:
${attributeShortName}

Here is the definition for the target attribute "${attributeShortName}":
${JSON.stringify(targetField, null, 2)} 

Here are similar incidents and their full classifications (use for context):
${similarOutput}

Based on the incident text and the taxonomy definition provided, provide a classification ONLY for the attribute "${attributeShortName}".

IMPORTANT: Your classification MUST include ONLY the following taxonomy attribute:
${attributeShortName}

For maximum accuracy and completeness:
1. Focus ONLY on the required field "${attributeShortName}".
2. Use the permitted_values for this attribute from the definition provided.
3. Review similar incidents to understand how this specific field is typically used.

Return your response as a JSON object with the following structure:

{
  "classification": {
    "namespace": "${taxonomy}",
    "attributes": [
      {"short_name": "${attributeShortName}", "value_json": "\"value\""} 
    ]
  },
  "explanation": "A detailed explanation of your classification choice for ${attributeShortName}.",
  "confidence": "A confidence score between 0 and 1 for this attribute classification"
}

DO NOT include any other text in your response, nor any other characters.
DO NOT start your response with \`\`\`json or \`\`\`
Ensure that ONLY the attribute "${attributeShortName}" is included in your classification.
`;

  return prompt;
}

export async function generateClassificationForAttributes(
  text: string,
  taxonomy: string,
  attributeShortNames: string[],
  embeddingsTable: EmbeddingsTable = schema.embeddings,
  model: string = 'gpt-4o'
): Promise<LlmClassificationOutput> {
  if (!text) throw new Error('Please provide a valid text');
  if (!taxonomy) throw new Error('Please provide a valid taxonomy namespace');

  console.log(`Generating classifications for specific attributes: ${attributeShortNames.join(', ')}`);
  const mergedResult: LlmClassificationOutput = {
    classification: { namespace: taxonomy, attributes: [] },
    explanation: ''
  };
  const explanations: string[] = [];

  for (const attributeShortName of attributeShortNames) {
    console.log(`-- Generating prompt for attribute: ${attributeShortName}`);
    const prompt = await getSingleAttributePrompt(text, taxonomy, attributeShortName, embeddingsTable);
    console.log(`---- Generating classification for ${attributeShortName}...`);

    const result = await generateText({
      model: openai(model, { structuredOutputs: true }),
      prompt,

      temperature: model === 'o4-mini' ? 1 : 0
    });

    let resultText = result.text;
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/^```json\n|\n```$/g, '');
    }

    try {
      const singleResult: LlmClassificationOutput = JSON.parse(resultText);
      if (singleResult.classification?.attributes?.length) {
        mergedResult.classification.attributes.push(singleResult.classification.attributes[0]);
        if (singleResult.explanation) explanations.push(`[${attributeShortName}]: ${singleResult.explanation}`);
      } else {
        console.warn(`---- WARNING: Parsed result for ${attributeShortName} lacked expected structure.`);
      }
    } catch {
      console.error(`---- ERROR parsing JSON for ${attributeShortName}. Raw: ${resultText}`);
    }
  }

  mergedResult.explanation = explanations.join('\n---\n');
  console.log('---- Final Merged Result:');
  console.log(JSON.stringify(mergedResult, null, 2));
  return mergedResult;
}

export async function generateClassification(
  text: string,
  taxonomy: string,
  embeddingsTable: EmbeddingsTable = schema.embeddings,
  model: string = 'gpt-4o'
): Promise<LlmClassificationOutput> {
  if (!text) throw new Error('Please provide a valid text');
  if (!taxonomy) throw new Error('Please provide a valid taxonomy namespace');

  console.log('Generating prompt for all attributes.');
  const prompt = await getPrompt(text, taxonomy, embeddingsTable);
  console.log('Generating classification for all attributes...');
  const result = await generateText({
    model: openai(model, { structuredOutputs: true }),
    prompt
  });

  let resultText = result.text;
  if (resultText.startsWith('```json')) {
    resultText = resultText.replace(/^```json\n|\n```$/g, '');
  }

  try {
    const finalResult: LlmClassificationOutput = JSON.parse(resultText);
    console.log('Final Result (all attributes):');
    console.log(JSON.stringify(finalResult, null, 2));
    return finalResult;
  } catch (e) {
    console.error('ERROR parsing JSON for all attributes:', e);
    console.error(`Raw: ${resultText}`);
    throw new Error('Failed to parse classification result from LLM.');
  }
}