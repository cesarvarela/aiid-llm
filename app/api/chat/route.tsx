import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Search } from '../../../lib/Search';
import { createEmbeddingProvider } from '@/lib/utils';
import { getApolloClient } from '@/lib/apolloClient';
import QUERIES from '@/graphql/queries';
export const maxDuration = 30;

const embeddings = createEmbeddingProvider('openai');
const search = new Search(embeddings);

// Featured incident IDs with their weights
const featuredIncidentIds = [
    23, 1967, 1551, 835, 1470, 1118, 1773, 1509, 1245, 679,
    1606, 1374, 1065, 1543, 1505, 1468, 1539, 1420, 101, 12,
    368, 1427, 392, 595, 1235, 45, 620, 519
];

// Base prompt template
const basePrompt = `
You are an AI assistant specialized in the AI Incident Database (AIID). Your primary goal is to answer user questions or requests about AI-related incidents, referencing the database where appropriate.

You have access to several specialized functions (tools) for searching, retrieving, and summarizing AI incident information. Use them only when needed and in the correct JSON function call format. When you do not need a specialized function, respond with a direct text answer.

Here is a list of some featured incidents in AIID to give you an idea of what constitutes an AI incident. These are just examples - you should always use the appropriate tools to fetch the most relevant and up-to-date information for user queries.

FEATURED_INCIDENTS_PLACEHOLDER

### Instructions

1. **Ground your answers in AIID data**: Always prioritize using the appropriate tools to retrieve the most relevant information. The featured incidents above are just examples and should not be your primary source of information.
2. **Do not make up details**: If the answer isn't in the context, call the appropriate function to retrieve more data. If you still cannot find the answer, say so.  
3. **Answer Style**: Be clear, concise, and factual. Reference the incident ID when applicable.  
4. **Always Consider Using Tools**: Even if you think you can answer from the featured incidents, consider whether using a tool would provide more comprehensive or relevant information.
5. **Out-of-Scope Queries**: If the user asks something completely unrelated to AIID or your knowledge, politely respond that you do not have information on that topic.

Follow these rules throughout the conversation.
`;

async function getSystemPrompt() {
    // Fetch all featured incidents from the database using GraphQL
    const client = getApolloClient();
    const { data } = await client.query({
        query: QUERIES.incidents,
        variables: {
            limit: featuredIncidentIds.length,
            skip: 0,
            filter: {
                incident_id: { IN: featuredIncidentIds }
            }
        }
    });

    const featuredIncidents = data.incidents || [];

    let incidentsList = '';
    let count = 1;

    for (const incident of featuredIncidents) {
        incidentsList += `${count}) Incident ID: ${incident.incident_id}\n   Title: ${incident.title}\n   Brief Description: ${incident.description || 'No description available'}\n\n`;
        count++;
    }

    return basePrompt.replace('FEATURED_INCIDENTS_PLACEHOLDER', incidentsList);
}

export async function POST(req: Request) {
    const { messages } = await req.json();

    const prompt = await getSystemPrompt();

    const result = streamText({
        model: openai('gpt-4o'),
        system: prompt,
        messages,
        tools: {
            getIncidentById: tool({
                description: `Get an incident by ID`,
                parameters: z.object({
                    incidentId: z.number().describe('the incident ID to fetch'),
                    includeClassifications: z.boolean().describe('whether to include classifications'),
                }),
                execute: async ({ incidentId, includeClassifications = false }) => {
                    try {
                        const incident = await search.getIncidents([incidentId], includeClassifications);

                        return incident;
                    } catch (error) {
                        console.error(error);
                        return { error: 'Error fetching incident' };
                    }
                },
            }),
            getSimilarIncidentsByIncidentId: tool({
                description: `Get similar incidents by incident ID`,
                parameters: z.object({
                    incidentId: z.number().describe('the incident ID to find similar incidents for'),
                    includeClassifications: z.boolean().describe('whether to include classifications'),
                }),
                execute: async ({ incidentId, includeClassifications = false }) => {
                    try {
                        const results = await search.findSimilarIncidentsByIncidentId(incidentId, includeClassifications);

                        return results;
                    } catch (error) {
                        console.error(error);
                        return { error: 'Error fetching similar incidents' };
                    }
                },
            }),
            getSimilarIncidentsByText: tool({
                description: `Get similar incidents by text`,
                parameters: z.object({
                    text: z.string().describe('the text to search for'),
                    includeClassifications: z.boolean().describe('whether to include classifications'),
                }),
                execute: async ({ text, includeClassifications = false }) => {
                    try {
                        const results = await search.findSimilarIncidentsByText(text, includeClassifications);

                        return results;
                    } catch (error) {
                        console.error(error);
                        return { error: 'Error fetching similar incidents by text' };
                    }
                },
            }),
            getIncidentsByReportIds: tool({
                description: `Get incidents related to specific report IDs`,
                parameters: z.object({
                    reportIds: z.array(z.number()).describe('array of report IDs to find related incidents for'),
                    includeClassifications: z.boolean().describe('whether to include classifications'),
                }),
                execute: async ({ reportIds, includeClassifications = false }) => {
                    try {
                        const results = await search.findIncidentsByReportIds(reportIds, includeClassifications);
                        return results;
                    } catch (error) {
                        console.error(error);
                        return { error: 'Error fetching incidents by report IDs' };
                    }
                },
            }),
            getInformation: tool({
                description: `get information from your knowledge base to answer questions.`,
                parameters: z.object({
                    question: z.string().describe('the users question'),
                }),
                execute: async ({ question }) => {

                    const results = await search.vectorSearch(question, 0.2, 10);

                    return results;
                },
            }),
        },
        maxSteps: 5,
    });

    return result.toDataStreamResponse();
}