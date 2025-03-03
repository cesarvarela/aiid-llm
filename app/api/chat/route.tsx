import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Search } from '../../../lib/Search';
import { createEmbeddingProvider } from '@/lib/utils';
export const maxDuration = 30;

const embeddings = createEmbeddingProvider('openai');
const search = new Search(embeddings);

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o'),
        system: 'You are a helpful assistant that can answer questions about the user\'s knowledge base.',
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