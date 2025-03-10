import { db } from '../db';
import * as schema from '../db/schema';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { EmbeddingProvider } from '../types';
import { createEmbeddingProvider } from '@/lib/utils';
import pLimit from 'p-limit';
import { getApolloClient } from '@/lib/apolloClient';
import QUERIES from '@/graphql/queries';
import { gql } from '@apollo/client';

// Reducing chunk size to avoid token limit errors
// OpenAI's text-embedding-3-small has a limit of 8192 tokens
// Setting a conservative limit to ensure we stay under the token limit
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
// Limit concurrent API calls to avoid rate limits
const CONCURRENCY_LIMIT = 5;

function chunkText(text: string): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
        if (currentLength + word.length > CHUNK_SIZE) {
            chunks.push(currentChunk.join(' '));
            // Take the last N words from the current chunk to create overlap
            const overlapWords = currentChunk.slice(-Math.floor(CHUNK_OVERLAP / 20));
            currentChunk = [...overlapWords];
            currentLength = currentChunk.join(' ').length;
        }
        currentChunk.push(word);
        currentLength += word.length + 1;
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }
    return chunks;
}

async function processReport(reportNumber: number, provider: EmbeddingProvider) {
    console.log(`Processing report ${reportNumber}`);

    const client = getApolloClient();
    const { data } = await client.query({
        query: QUERIES.reports,
        variables: {
            limit: 1,
            skip: 0,
            filter: {
                report_number: { EQ: reportNumber }
            }
        }
    });

    const report = data.reports?.[0];

    if (!report) {
        console.error(`Report ${reportNumber} not found`);
        return;
    }

    const metadataChunk = [
        `Title: ${report.title}`,
        `URL: ${report.url}`,
        `Language: ${report.language}`,
        `Source: ${report.source_domain}`,
        `Authors: ${report.authors?.join(', ') || ''}`,
        `Tags: ${report.tags?.join(', ') || ''}`,
        `Date Published: ${report.date_published || ''}`
    ].join('\n');

    try {
        // Create an array to collect all embeddings
        const allEmbeddings: typeof schema.embeddings.$inferInsert[] = [];

        // Process metadata chunk
        const { embedding: metadataEmbedding, model } = await provider.getEmbedding(metadataChunk);

        // Add metadata embedding to the collection
        allEmbeddings.push({
            sourceType: 'report',
            sourceId: reportNumber.toString(),
            chunkIndex: 0,
            chunkText: metadataChunk,
            embedding: metadataEmbedding,
            model: model,
            metadata: {
                reportNumber: reportNumber,
                title: report.title,
                url: report.url
            }
        } as typeof schema.embeddings.$inferInsert);

        const chunks = report.plain_text ? chunkText(report.plain_text) : [];

        // Process all chunks and collect their embeddings
        const chunkEmbeddings = await Promise.all(
            chunks.map(async (chunk, i) => {
                const { embedding, model } = await provider.getEmbedding(chunk);
                return {
                    sourceType: 'report',
                    sourceId: reportNumber.toString(),
                    chunkIndex: i + 1,
                    chunkText: chunk,
                    embedding: embedding,
                    model: model,
                    metadata: {
                        reportNumber: reportNumber,
                        title: report.title,
                        url: report.url
                    }
                } as typeof schema.embeddings.$inferInsert;
            })
        );

        // Add chunk embeddings to the collection
        allEmbeddings.push(...chunkEmbeddings);

        // Insert all embeddings in a single operation
        if (allEmbeddings.length > 0) {
            await db.insert(schema.embeddings).values(allEmbeddings);
        }

        console.log(`Processed report ${reportNumber}, ${chunks.length} chunks`);
    } catch (error) {
        console.error(`Error processing report ${reportNumber}:`, error);
        throw error; // Re-throw to allow caller to handle
    }
}

async function processIncident(incidentId: number, provider: EmbeddingProvider) {
    console.log(`Processing incident ${incidentId}`);

    const client = getApolloClient();
    const { data } = await client.query({
        query: QUERIES.incidents,
        variables: {
            limit: 1,
            skip: 0,
            filter: {
                incident_id: { EQ: incidentId }
            }
        }
    });

    const incident = data.incidents?.[0];

    if (!incident) {
        console.error(`Incident ${incidentId} not found`);
        return;
    }

    const metadataChunk = [
        `Title: ${incident.title}`,
        `Editor Notes: ${incident.editor_notes || ''}`,
        `Date: ${incident.date || ''}`
    ].join('\n');

    try {
        // Create an array to collect all embeddings
        const allEmbeddings: typeof schema.embeddings.$inferInsert[] = [];

        // Process metadata chunk
        const { embedding: metadataEmbedding, model } = await provider.getEmbedding(metadataChunk);

        // Add metadata embedding to the collection
        allEmbeddings.push({
            sourceType: 'incident',
            sourceId: incidentId.toString(),
            chunkIndex: 0,
            chunkText: metadataChunk,
            embedding: metadataEmbedding,
            model: model,
            metadata: {
                incidentId: incidentId,
                title: incident.title,
                date: incident.date
            }
        } as typeof schema.embeddings.$inferInsert);

        const chunks = incident.description ? chunkText(incident.description) : [];

        // Process all chunks and collect their embeddings
        const chunkEmbeddings = await Promise.all(
            chunks.map(async (chunk, i) => {
                const { embedding, model } = await provider.getEmbedding(chunk);
                return {
                    sourceType: 'incident',
                    sourceId: incidentId.toString(),
                    chunkIndex: i + 1,
                    chunkText: chunk,
                    embedding: embedding,
                    model: model,
                    metadata: {
                        incidentId: incidentId,
                        title: incident.title,
                        date: incident.date
                    }
                } as typeof schema.embeddings.$inferInsert;
            })
        );

        // Add chunk embeddings to the collection
        allEmbeddings.push(...chunkEmbeddings);

        // Insert all embeddings in a single operation
        if (allEmbeddings.length > 0) {
            await db.insert(schema.embeddings).values(allEmbeddings);
        }

        console.log(`Processed incident ${incidentId}, ${chunks.length} chunks`);
    } catch (error) {
        console.error(`Error processing incident ${incidentId}:`, error);
        throw error; // Re-throw to allow caller to handle
    }
}

async function processClassification(classificationId: string, provider: EmbeddingProvider) {
    console.log(`Processing classification ${classificationId}`);

    const client = getApolloClient();
    const { data } = await client.query({
        query: QUERIES.classifications,
        variables: {
            limit: 1,
            skip: 0,
            filter: {
                _id: { EQ: classificationId }
            }
        }
    });

    const classification = data.classifications?.[0];

    if (!classification) {
        console.error(`Classification ${classificationId} not found`);
        return;
    }

    // Create metadata chunk from classification data
    const attributesText = classification.attributes 
        ? classification.attributes.map(attr => `${attr.short_name}: ${attr.value_json}`).join('\n')
        : '';

    const metadataChunk = [
        `Namespace: ${classification.namespace}`,
        `Notes: ${classification.notes || ''}`,
        `Attributes: ${attributesText}`
    ].join('\n');

    try {
        // Create an array to collect all embeddings
        const allEmbeddings: typeof schema.embeddings.$inferInsert[] = [];

        // Process metadata chunk
        const { embedding: metadataEmbedding, model } = await provider.getEmbedding(metadataChunk);

        // Add metadata embedding to the collection
        allEmbeddings.push({
            sourceType: 'classification',
            sourceId: classificationId,
            chunkIndex: 0,
            chunkText: metadataChunk,
            embedding: metadataEmbedding,
            model: model,
            metadata: {
                classificationId: classificationId,
                namespace: classification.namespace
            }
        } as typeof schema.embeddings.$inferInsert);

        // Insert all embeddings in a single operation
        if (allEmbeddings.length > 0) {
            await db.insert(schema.embeddings).values(allEmbeddings);
        }

        console.log(`Processed classification ${classificationId}`);
    } catch (error) {
        console.error(`Error processing classification ${classificationId}:`, error);
        throw error; // Re-throw to allow caller to handle
    }
}

interface ProcessOptions {
    provider: EmbeddingProvider;
}

async function parseAndValidateArgs(): Promise<ProcessOptions | null> {
    const argv = await yargs(hideBin(process.argv))
        .option('provider', {
            type: 'string',
            description: 'Embedding provider to use (openai or voyageai)',
            default: 'openai'
        })
        .argv;

    const provider = createEmbeddingProvider(argv.provider);

    return {
        provider
    };
}

async function processItems(options: {
    provider: EmbeddingProvider;
}) {
    const { provider } = options;

    // Create a concurrency limiter
    const limit = pLimit(CONCURRENCY_LIMIT);

    // Get all existing embeddings in a single query
    const existingEmbeddings = await db.select({
        sourceType: schema.embeddings.sourceType,
        sourceId: schema.embeddings.sourceId
    })
    .from(schema.embeddings)
    .groupBy(schema.embeddings.sourceType, schema.embeddings.sourceId);

    // Create sets of existing embeddings for faster lookups
    const existingReportEmbeddings = new Set(
        existingEmbeddings
            .filter(e => e.sourceType === 'report')
            .map(e => e.sourceId)
    );
    
    const existingIncidentEmbeddings = new Set(
        existingEmbeddings
            .filter(e => e.sourceType === 'incident')
            .map(e => e.sourceId)
    );
    
    const existingClassificationEmbeddings = new Set(
        existingEmbeddings
            .filter(e => e.sourceType === 'classification')
            .map(e => e.sourceId)
    );

    // Fetch data in smaller batches with only necessary fields
    const client = getApolloClient();
    
    // Custom GraphQL queries with minimal fields
    const reportsMinimalQuery = gql`
      query FetchReportsMinimal($limit: Int!, $skip: Int!) {
        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }) {
          report_number
        }
      }
    `;
    
    const incidentsMinimalQuery = gql`
      query FetchIncidentsMinimal($limit: Int!, $skip: Int!) {
        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }) {
          incident_id
        }
      }
    `;
    
    const classificationsMinimalQuery = gql`
      query FetchClassificationsMinimal($limit: Int!, $skip: Int!) {
        classifications(pagination: { limit: $limit, skip: $skip }) {
          _id
        }
      }
    `;

    // Fetch IDs only first
    const batchSize = 500;
    let allReportIds: number[] = [];
    let allIncidentIds: number[] = [];
    let allClassificationIds: string[] = [];
    
    // Fetch report IDs
    let hasMoreReports = true;
    let reportSkip = 0;
    
    while (hasMoreReports) {
        const { data } = await client.query({
            query: reportsMinimalQuery,
            variables: {
                limit: batchSize,
                skip: reportSkip
            }
        });
        
        const batchReports = data.reports || [];
        allReportIds = [...allReportIds, ...batchReports.map(r => r.report_number)];
        
        reportSkip += batchSize;
        hasMoreReports = batchReports.length === batchSize;
    }
    
    // Fetch incident IDs
    let hasMoreIncidents = true;
    let incidentSkip = 0;
    
    while (hasMoreIncidents) {
        const { data } = await client.query({
            query: incidentsMinimalQuery,
            variables: {
                limit: batchSize,
                skip: incidentSkip
            }
        });
        
        const batchIncidents = data.incidents || [];
        allIncidentIds = [...allIncidentIds, ...batchIncidents.map(i => i.incident_id)];
        
        incidentSkip += batchSize;
        hasMoreIncidents = batchIncidents.length === batchSize;
    }
    
    // Fetch classification IDs
    let hasMoreClassifications = true;
    let classificationSkip = 0;
    
    while (hasMoreClassifications) {
        const { data } = await client.query({
            query: classificationsMinimalQuery,
            variables: {
                limit: batchSize,
                skip: classificationSkip
            }
        });
        
        const batchClassifications = data.classifications || [];
        allClassificationIds = [...allClassificationIds, ...batchClassifications.map(c => c._id)];
        
        classificationSkip += batchSize;
        hasMoreClassifications = batchClassifications.length === batchSize;
    }
    
    console.log(`Found ${allReportIds.length} reports, ${allIncidentIds.length} incidents, and ${allClassificationIds.length} classifications in database`);

    // Filter out items that already have embeddings
    const reportIdsToProcess = allReportIds.filter(id => 
        !existingReportEmbeddings.has(id.toString())
    );
    
    const incidentIdsToProcess = allIncidentIds.filter(id => 
        !existingIncidentEmbeddings.has(id.toString())
    );
    
    const classificationIdsToProcess = allClassificationIds.filter(id => 
        !existingClassificationEmbeddings.has(id)
    );

    console.log(`Need to process ${reportIdsToProcess.length} reports, ${incidentIdsToProcess.length} incidents, and ${classificationIdsToProcess.length} classifications`);

    // Create processing tasks only for items that need processing
    const allProcessingTasks = [
        ...reportIdsToProcess.map(reportId => 
            limit(() => processReport(reportId, provider))
        ),
        ...incidentIdsToProcess.map(incidentId => 
            limit(() => processIncident(incidentId, provider))
        ),
        ...classificationIdsToProcess.map(classificationId => 
            limit(() => processClassification(classificationId, provider))
        )
    ];

    if (allProcessingTasks.length === 0) {
        console.log('No items to process. All embeddings are up to date.');
        return;
    }

    await Promise.all(allProcessingTasks);

    console.log('All processing completed');
}

async function main() {
    const options = await parseAndValidateArgs();

    if (options) {
        await processItems(options);
    }
}

if (require.main === module) {
    main();
}