import { EmbeddingProvider } from "../types";
import { db } from "../db";
import * as schema from "../db/schema";
import { cosineDistance, desc, gt } from "drizzle-orm";
import { getApolloClient } from "./apolloClient";
import QUERIES from "../graphql/queries";


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

        return data.reports?.[0] || null;
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

        const client = getApolloClient();
        const { data } = await client.query({
            query: QUERIES.incidents,
            variables: {
                limit: incidentIds.length,
                skip: 0,
                filter: {
                    incident_id: { IN: incidentIds }
                }
            }
        });

        const incidents = data.incidents || [];

        if (!includeClassifications) {
            return incidents;
        }

        // Get classifications related to these incidents
        const { data: classificationData } = await client.query({
            query: QUERIES.classifications,
            variables: {
                limit: 100,
                skip: 0,
                filter: {
                    incidents: { IN: incidentIds }
                }
            }
        });

        const classifications = classificationData.classifications || [];

        // Combine incidents with their classifications
        const incidentsWithClassifications = incidents.map(incident => {
            const relatedClassifications = classifications.filter(
                classification => classification.incidents &&
                    classification.incidents.some(inc => inc.incident_id === incident.incident_id)
            );

            return {
                ...incident,
                classifications: relatedClassifications
            };
        });

        return incidentsWithClassifications;
    }

    async findSimilarIncidentsByIncidentId(incidentId: number, includeClassifications = false) {
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

        // Get incidents related to these reports using GraphQL
        const client = getApolloClient();
        const { data } = await client.query({
            query: QUERIES.reports,
            variables: {
                limit: searchReportIds.length,
                skip: 0,
                filter: {
                    report_number: { IN: searchReportIds }
                }
            }
        });

        const reports = data.reports || [];

        // Get all incident IDs from the reports
        const relatedIncidentIds: number[] = [];
        for (const report of reports) {
            if (report.incidents) {
                for (const incident of report.incidents) {
                    relatedIncidentIds.push(incident.incident_id);
                }
            }
        }

        const allIncidentIds = [...new Set([...searchIncidentIds, ...relatedIncidentIds])];

        return this.getIncidents(allIncidentIds, includeClassifications);
    }

    async findIncidentsByReportIds(reportIds: number[], includeClassifications = false) {
        if (!reportIds.length) {
            return [];
        }

        const client = getApolloClient();
        const { data } = await client.query({
            query: QUERIES.reports,
            variables: {
                limit: reportIds.length,
                skip: 0,
                filter: {
                    report_number: { IN: reportIds }
                }
            }
        });

        const reports = data.reports || [];

        // Get all incident IDs from the reports
        const incidentIds: number[] = [];
        for (const report of reports) {
            if (report.incidents) {
                for (const incident of report.incidents) {
                    incidentIds.push(incident.incident_id);
                }
            }
        }

        if (!incidentIds.length) {
            return [];
        }

        return this.getIncidents(incidentIds, includeClassifications);
    }
}