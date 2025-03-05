import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Search } from '../../../lib/Search';
import { createEmbeddingProvider } from '@/lib/utils';
import { db } from '@/db';
import { incidents } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
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
    // Fetch all featured incidents from the database in a single query
    const featuredIncidents = await db.query.incidents.findMany({
        where: inArray(incidents.incidentId, featuredIncidentIds)
    });

    let incidentsList = '';
    let count = 1;

    for (const incident of featuredIncidents) {
        incidentsList += `${count}) Incident ID: ${incident.incidentId}\n   Title: ${incident.title}\n   Brief Description: ${incident.description || 'No description available'}\n\n`;
        count++;
    }

    return basePrompt.replace('FEATURED_INCIDENTS_PLACEHOLDER', incidentsList);
}

export async function POST(req: Request) {
    const { messages } = await req.json();

    // Get the system prompt with featured incidents
    const prompt = await getSystemPrompt();

    const result = streamText({
        model: openai('gpt-4o'),
        system: prompt,
        messages,
        tools: {
            getReportInformation: tool({
                description: `get information about a specific report`,
                parameters: z.object({
                    reportNumber: z.number().describe('the report number'),
                }),
                execute: async ({ reportNumber }) => {

                    const report = await search.findReportByNumber(reportNumber);

                    if (!report) {
                        return { error: 'Report not found' };
                    }

                    return report;
                },
            }),
            getIncidentInformation: tool({
                description: `get information about a specific incident`,
                parameters: z.object({
                    incidentId: z.number().describe('the incident id'),
                }),
                execute: async ({ incidentId }) => {
                    const incident = await search.findIncidentById(incidentId);

                    return incident;
                },
            }),
            getSimilarIncidentsByIncidentId: tool({
                description: `Get similar incidents to an incident by incident id`,
                parameters: z.object({
                    incidentId: z.number().describe('the incident id'),
                }),
                execute: async ({ incidentId }) => {
                    const results = await search.findSimilarIncidentsByIncidentId(incidentId);

                    return results;
                },
            }),
            getSimilarIncidentsByText: tool({
                description: `Get similar incidents by text`,
                parameters: z.object({
                    text: z.string().describe('the text to search for'),
                }),
                execute: async ({ text }) => {
                    const results = await search.findSimilarIncidentsByText(text);

                    return results;
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