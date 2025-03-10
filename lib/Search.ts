import { EmbeddingProvider } from "../types";
import { db } from "../db";
import * as schema from "../db/schema";
import { cosineDistance, desc, eq, gt, inArray, and, sql } from "drizzle-orm";


export class Search {

    constructor(private provider: EmbeddingProvider) {
    }

    async vectorSearch(query: string, minScore = 0.2, limit = 1000) {
        const { embedding } = await this.provider.getEmbedding(query);

        const results = await db.select({
            id: schema.embeddings.id,
            sourceType: schema.embeddings.sourceType,
            sourceId: schema.embeddings.sourceId,
            chunkText: schema.embeddings.chunkText,
            score: cosineDistance(schema.embeddings.embedding, embedding),
        })
            .from(schema.embeddings)
            .where(gt(cosineDistance(schema.embeddings.embedding, embedding), minScore))
            .orderBy(desc(cosineDistance(schema.embeddings.embedding, embedding)))
            .limit(limit);

        return results;
    }

    async findReportByNumber(reportNumber: number) {
        const report = await db.query.reports.findFirst({
            where: eq(schema.reports.reportNumber, reportNumber),
        });

        return report;
    }

    /**
     * Finds incidents by their IDs with optional classifications
     * @param incidentIds Array of incident IDs to find
     * @param includeClassifications Whether to include classifications (default: false)
     * @returns Array of incidents, optionally with their classifications
     */
    async getIncidents(incidentIds: number[], includeClassifications = false) {
        if (!incidentIds.length) {
            return [];
        }

        // Get the incidents
        const incidents = await db.query.incidents.findMany({
            where: inArray(schema.incidents.incidentId, incidentIds),
        });

        if (!includeClassifications) {
            return incidents;
        }

        // Get classifications related to these incidents
        const classifications = await db.query.classifications.findMany({
            where: sql`${schema.classifications.incidents} && ARRAY[${sql.join(incidentIds.map(id => sql`${id}`), sql`, `)}]::integer[]`,
        });

        // Combine incidents with their classifications
        const incidentsWithClassifications = incidents.map(incident => {
            const relatedClassifications = classifications.filter(
                classification => classification.incidents &&
                    classification.incidents.includes(incident.incidentId)
            );

            return {
                ...incident,
                classifications: relatedClassifications
            };
        });

        return incidentsWithClassifications;
    }

    async findSimilarIncidentsByIncidentId(incidentId: number, includeClassifications = false) {
        const incident = await await db.query.incidents.findFirst({
            where: eq(schema.incidents.incidentId, incidentId),
        });

        if (!incident) {
            return [];
        }

        const results = await this.vectorSearch(incident.title, 0.3);
        
        const similarIncidentIds = results
            .filter(result => result.sourceType === 'incident')
            .map(result => parseInt(result.sourceId));
            
        return this.getIncidents(similarIncidentIds, includeClassifications);
    }

    async findSimilarIncidentsByText(text: string, includeClassifications = false) {
        const results = await this.vectorSearch(text, 0.3);

        const incidentResults = results.filter(result => result.sourceType === 'incident');        
        const searchIncidentIds: number[] = incidentResults.map((result) => parseInt(result.sourceId));
        
        const reportResults = results.filter(result => result.sourceType === 'report');
        const searchReportIds: number[] = reportResults.map((result) => parseInt(result.sourceId));
        
        const incidentReports = await db.query.incidentReports.findMany({
            where: inArray(schema.incidentReports.reportNumber, searchReportIds),
        });
        
        const relatedIncidentIds = incidentReports.map(ir => ir.incidentId).filter(Boolean) as number[];
        const allIncidentIds = [...new Set([...searchIncidentIds, ...relatedIncidentIds])];

        return this.getIncidents(allIncidentIds, includeClassifications);
    }

    async findIncidentsByReportIds(reportIds: number[], includeClassifications = false) {
        if (!reportIds.length) {
            return [];
        }

        const incidentReports = await db.query.incidentReports.findMany({
            where: inArray(schema.incidentReports.reportNumber, reportIds),
        });

        if (!incidentReports.length) {
            return [];
        }

        const incidentIds = incidentReports.map(ir => ir.incidentId).filter(Boolean) as number[];

        return this.getIncidents(incidentIds, includeClassifications);
    }
}