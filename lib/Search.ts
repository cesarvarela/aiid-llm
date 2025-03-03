import { EmbeddingProvider } from "../types";
import { db } from "../db";
import * as schema from "../db/schema";
import { cosineDistance, desc, eq, gt, inArray, and, sql } from "drizzle-orm";


export class Search {

    constructor(private provider: EmbeddingProvider) {
    }

    async vectorSearch(query: string, minScore = 0.2, limit = 100) {

        const { embedding: queryEmbeddings } = await this.provider.getEmbedding(query);

        const similarityExpression = sql`1 - (${cosineDistance(schema.embeddings.embedding, queryEmbeddings)})`;

        const initialResults = await db
            .select({
                similarity: similarityExpression.as('similarity'),
                sourceType: schema.embeddings.sourceType,
                sourceId: schema.embeddings.sourceId,
                chunkIndex: schema.embeddings.chunkIndex,
                chunkText: schema.embeddings.chunkText,
                metadata: schema.embeddings.metadata,
            })
            .from(schema.embeddings)
            .where(gt(similarityExpression, minScore))
            .orderBy(desc(similarityExpression))
            .limit(limit);

        return initialResults;
    }

    async findReportByNumber(reportNumber: number) {
        const report = await db.query.reports.findFirst({
            where: eq(schema.reports.reportNumber, reportNumber),
        });

        return report;
    }

    async findIncidentById(incidentId: number) {
        const incident = await db.query.incidents.findFirst({
            where: eq(schema.incidents.incidentId, incidentId),
        });

        return incident;
    }

    async findSimilarIncidentsByIncidentId(incidentId: number) {

        const incident = await db.query.incidents.findFirst({
            where: eq(schema.incidents.incidentId, incidentId),
        });

        if (!incident) {
            return [];
        }

        const results = await this.vectorSearch(incident.title, 0.3);

        return results.filter(result => result.sourceType === 'incident');
    }

    async findSimilarIncidentsByText(text: string) {

        const results = await this.vectorSearch(text, 0.3);

        const filteredResults = results.filter(result => result.sourceType === 'incident');

        const incidentIds: number[] = filteredResults.map((result) => parseInt(result.sourceId));

        const incidents = await db.query.incidents.findMany({
            where: inArray(schema.incidents.incidentId, incidentIds),
        });

        return incidents;
    }
}