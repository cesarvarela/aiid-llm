import { EmbeddingProvider } from "../types";
import { db } from "../db";
import * as schema from "../db/schema";
import { cosineDistance, desc, gt } from "drizzle-orm";
import { getApolloClient } from "./apolloClient";
import QUERIES from "../graphql/queries";
import { gql } from "@apollo/client";

// Define the limited reports query once
const REPORTS_LIMITED_QUERY = gql`
    query FetchReportsLimited($limit: Int!, $skip: Int!, $filter: ReportFilterType) {
        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }, filter: $filter) {
            report_number
            incidents {
                incident_id
            }
        }
    }
`;

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

    async findReportsByNumbers(reportNumbers: number[]) {
        const reports = [];

        for (const reportNumber of reportNumbers) {
            const report = await this.findReportByNumber(reportNumber);
            if (report) {
                reports.push(report);
            }
        }

        return reports;
    }

    async findIncidentById(incidentId: number, includeClassifications = false) {
        if (!incidentId) {
            return null;
        }

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

        const incident = data.incidents?.[0] || null;

        if (!incident || !includeClassifications) {
            return incident;
        }

        // Get classifications related to this incident
        const { data: classificationData } = await client.query({
            query: QUERIES.classifications,
            variables: {
                limit: 100,
                skip: 0,
                filter: {
                    incidents: { IN: [incidentId] }
                }
            }
        });

        const classifications = classificationData.classifications || [];

        return {
            ...incident,
            classifications
        };
    }

    async findIncidentsByIds(incidentIds: number[], includeClassifications = false) {
        if (!incidentIds.length) {
            return [];
        }

        const incidents = [];

        for (const incidentId of incidentIds) {
            const incident = await this.findIncidentById(incidentId, includeClassifications);
            if (incident) {
                incidents.push(incident);
            }
        }

        return incidents;
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

        return this.findIncidentsByIds(similarIncidentIds, includeClassifications);
    }

    async getIncidentIdsFromReports(reportIds: number[]): Promise<number[]> {
        if (!reportIds.length) {
            return [];
        }

        const client = getApolloClient();
        const batchSize = 10;
        const incidentIds: number[] = [];

        // Process reports in batches
        for (let i = 0; i < reportIds.length; i += batchSize) {
            const batchReportIds = reportIds.slice(i, i + batchSize);

            const { data } = await client.query({
                query: REPORTS_LIMITED_QUERY,
                variables: {
                    limit: batchReportIds.length,
                    skip: 0,
                    filter: {
                        report_number: { IN: batchReportIds }
                    }
                }
            });

            const reports = data.reports || [];

            // Get all incident IDs from the reports
            for (const report of reports) {
                if (report.incidents) {
                    for (const incident of report.incidents) {
                        incidentIds.push(incident.incident_id);
                    }
                }
            }
        }

        // Return unique incident IDs
        return [...new Set(incidentIds)];
    }

    async findSimilarIncidentsByText(text: string, includeClassifications = false, limit = 10) {
        const results = await this.vectorSearch(text, 0.3);

        const incidentResults = results.filter(result => result.sourceType === 'incident');
        const searchIncidentIds: number[] = incidentResults.map((result) => parseInt(result.sourceId));

        const reportResults = results.filter(result => result.sourceType === 'report');
        const searchReportIds: number[] = reportResults.map((result) => parseInt(result.sourceId));

        const relatedIncidentIds = await this.getIncidentIdsFromReports(searchReportIds);

        const incidentIds = [...new Set([...searchIncidentIds, ...relatedIncidentIds])].slice(0, limit);

        return this.findIncidentsByIds(incidentIds, includeClassifications);
    }

    async findIncidentsByReportIds(reportIds: number[], includeClassifications = false) {
        if (!reportIds.length) {
            return [];
        }

        const incidentIds = await this.getIncidentIdsFromReports(reportIds);

        if (!incidentIds.length) {
            return [];
        }

        return this.findIncidentsByIds(incidentIds, includeClassifications);
    }
}