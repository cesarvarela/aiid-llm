import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import readline from 'readline';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { EmbeddingProvider } from '../types';
import { createEmbeddingProvider } from '@/lib/utils';
import pLimit from 'p-limit';

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

    const report = await db.query.reports.findFirst({
        where: eq(schema.reports.reportNumber, reportNumber),
    });

    if (!report) {
        console.error(`Report ${reportNumber} not found`);
        return;
    }

    const metadataChunk = [
        `Title: ${report.title}`,
        `URL: ${report.url}`,
        `Language: ${report.language}`,
        `Source: ${report.sourceDomain}`,
        `Authors: ${report.authors?.join(', ') || ''}`,
        `Tags: ${report.tags?.join(', ') || ''}`,
        `Date Published: ${report.datePublished?.toISOString() || ''}`
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

        const chunks = report.plainText ? chunkText(report.plainText) : [];

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

    const incident = await db.query.incidents.findFirst({
        where: eq(schema.incidents.incidentId, incidentId),
    });

    if (!incident) {
        console.error(`Incident ${incidentId} not found`);
        return;
    }

    const metadataChunk = [
        `Title: ${incident.title}`,
        `Editor Notes: ${incident.editorNotes || ''}`,
        `Date: ${incident.date?.toISOString() || ''}`
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
                date: incident.date?.toISOString()
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
                        date: incident.date?.toISOString()
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

    const classification = await db.query.classifications.findFirst({
        where: eq(schema.classifications.classificationId, classificationId),
    });

    if (!classification) {
        console.error(`Classification ${classificationId} not found`);
        return;
    }

    // Create metadata chunk from classification data
    const attributesText = classification.attributes 
        ? (classification.attributes as Array<{short_name: string, value_json: string}>).map(attr => `${attr.short_name}: ${attr.value_json}`).join('\n')
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

    // Fetch all data first
    const [allReports, allIncidents, allClassifications] = await Promise.all([
        db.select().from(schema.reports),
        db.select().from(schema.incidents),
        db.select().from(schema.classifications)
    ]);

    console.log(`Found ${allReports.length} reports, ${allIncidents.length} incidents, and ${allClassifications.length} classifications in database`);

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

    // Filter out items that already have embeddings
    const reportsToProcess = allReports.filter(report => 
        !existingReportEmbeddings.has(report.reportNumber.toString())
    );
    
    const incidentsToProcess = allIncidents.filter(incident => 
        !existingIncidentEmbeddings.has(incident.incidentId.toString())
    );
    
    const classificationsToProcess = allClassifications.filter(classification => 
        !existingClassificationEmbeddings.has(classification.classificationId)
    );

    console.log(`Need to process ${reportsToProcess.length} reports, ${incidentsToProcess.length} incidents, and ${classificationsToProcess.length} classifications`);

    // Create processing tasks only for items that need processing
    const allProcessingTasks = [
        ...reportsToProcess.map(report => 
            limit(() => processReport(report.reportNumber, provider))
        ),
        ...incidentsToProcess.map(incident => 
            limit(() => processIncident(incident.incidentId, provider))
        ),
        ...classificationsToProcess.map(classification => 
            limit(() => processClassification(classification.classificationId, provider))
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