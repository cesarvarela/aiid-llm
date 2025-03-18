import { EmbeddingProvider } from "../types";
import { db } from "../db";
import * as schema from "../db/schema";
import { cosineDistance, desc, gt } from "drizzle-orm";
import { getApolloClient } from "./apolloClient";
import { gql } from "@apollo/client";
import { Taxa } from "@/graphql/generated/graphql";

const client = getApolloClient();

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

const FETCH_REPORT = gql`
  query FetchReport($report_number: Int!) {
    report(filter: { report_number: { EQ: $report_number } }) {
      report_number
      title
      text
    }
  }
`;

const FETCH_TAXONOMY_DETAILS = gql`
  query FetchTaxonomyDetails($namespace: String!) {
    taxa(filter: { namespace: { EQ: $namespace } }) {
      namespace
      weight
      description
      field_list {
        short_name
        short_description
        permitted_values
        mongo_type
      }
    }
  }
`;

const FETCH_INCIDENT = gql`
  query FetchIncident($incident_id: Int!) {
    incident(filter: { incident_id: { EQ: $incident_id } }) {
        incident_id
        title
        description
        date
        editor_notes
        editor_similar_incidents
        editor_dissimilar_incidents
        AllegedDeployerOfAISystem {
            entity_id
            name
        }
        AllegedDeveloperOfAISystem {
            entity_id
            name
        }
        AllegedHarmedOrNearlyHarmedParties {
            entity_id
            name
        }
        editors {
            first_name
            last_name
        }
        reports {
            report_number
        }
    }
  }
`;

const FETCH_INCIDENT_WITH_CLASSIFICATIONS = gql`
  query FetchIncidentWithClassifications($incident_id: Int!) {
    incident(filter: { incident_id: { EQ: $incident_id } }) {
      incident_id
      title
      description
      date
      AllegedDeployerOfAISystem {
        entity_id
        name
      }
      AllegedDeveloperOfAISystem {
        entity_id
        name
      }
      AllegedHarmedOrNearlyHarmedParties {
        entity_id
        name
      }
      editor_notes
      editors {
        first_name
        last_name
      }
      reports {
        report_number
      }
      classifications {
        _id
        namespace
        notes
        publish
        attributes {
          short_name
          value_json
        }
      }
    }
  }
`;

const FETCH_CLASSIFICATION = gql`
  query FetchClassification($incident_id: Int!, $namespace: String!) {
    classification(
      filter: { 
        incidents: { IN: [$incident_id] },
        namespace: { EQ: $namespace }
      }
    ) {
      _id
      namespace
      notes
      publish
      attributes {
        short_name
        value_json
      }
      incidents {
        incident_id
      }
    }
  }
`;

export type EmbeddingsTable = typeof schema.embeddings | typeof schema.embeddingsSubset;

export class DataAccess {
    constructor(
        private provider: EmbeddingProvider,
        private embeddingsTable: EmbeddingsTable = schema.embeddings
    ) { }

    async vectorSearch(query: string, minScore = 0.2, limit = 1000) {
        const { embedding } = await this.provider.getEmbedding(query);

        const results = await db.select({
            id: this.embeddingsTable.id,
            sourceType: this.embeddingsTable.sourceType,
            sourceId: this.embeddingsTable.sourceId,
            chunkText: this.embeddingsTable.chunkText,
            score: cosineDistance(this.embeddingsTable.embedding, embedding),
            metadata: this.embeddingsTable.metadata,
        })
            .from(this.embeddingsTable)
            .where(gt(cosineDistance(this.embeddingsTable.embedding, embedding), minScore))
            .orderBy(desc(cosineDistance(this.embeddingsTable.embedding, embedding)))
            .limit(limit);

        return results;
    }

    async fetchTaxonomyDetails(namespace: string): Promise<Taxa> {
        const response = await client.query({
            query: FETCH_TAXONOMY_DETAILS,
            variables: { namespace },
        });

        if (!response.data.taxa) {
            throw new Error(`Taxonomy '${namespace}' not found`);
        }

        return response.data.taxa;
    }

    async findReportByNumber(reportNumber: number) {
        const { data } = await client.query({
            query: FETCH_REPORT,
            variables: { report_number: reportNumber }
        });

        return data.report || null;
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

    async findIncidentById(incidentId: number, includeClassifications = false, includeReportsText = 0) {
        if (!incidentId) {
            return null;
        }

        let incident;

        if (!includeClassifications) {
            const { data } = await client.query({
                query: FETCH_INCIDENT,
                variables: {
                    incident_id: incidentId
                }
            });

            incident = data.incident;
        } else {
            const response = await client.query({
                query: FETCH_INCIDENT_WITH_CLASSIFICATIONS,
                variables: {
                    incident_id: incidentId
                }
            });

            incident = response.data.incident;
        }

        if (!incident) {
            return null;
        }

        // If requested, fetch the text for the specified number of reports
        if (includeReportsText > 0 && incident.reports && incident.reports.length > 0) {
            const reportsToFetch = Math.min(includeReportsText, incident.reports.length);
            const reportsWithText = [];

            for (let i = 0; i < reportsToFetch; i++) {
                const reportNumber = incident.reports[i].report_number;
                const { data: reportData } = await client.query({
                    query: FETCH_REPORT,
                    variables: { report_number: reportNumber }
                });

                if (reportData.report) {
                    reportsWithText.push({
                        report_number: reportData.report.report_number,
                        title: reportData.report.title || `Report ${reportData.report.report_number}`,
                        text: reportData.report.text || ""
                    });
                }
            }

            // Replace the reports array with the ones that include text
            incident = {
                ...incident,
                reports: reportsWithText
            };
        }

        return incident;
    }

    async findIncidentsByIds(incidentIds: number[], includeClassifications = false, includeReportsText = 0) {
        if (!incidentIds.length) {
            return [];
        }

        const incidents = [];

        for (const incidentId of incidentIds) {
            const incident = await this.findIncidentById(incidentId, includeClassifications, includeReportsText);
            if (incident) {
                incidents.push(incident);
            }
        }

        return incidents;
    }

    async findSimilarIncidentsByIncidentId(incidentId: number, includeClassifications = false, includeReportsText = 0) {
        const { data } = await client.query({
            query: FETCH_INCIDENT,
            variables: {
                incident_id: incidentId
            }
        });

        const incident = data.incident;
        if (!incident) {
            return [];
        }

        const results = await this.vectorSearch(incident.title, 0.3, 1000);

        const similarIncidentIds = results
            .filter(result => result.sourceType === 'incident')
            .map(result => parseInt(result.sourceId));

        return this.findIncidentsByIds(similarIncidentIds, includeClassifications, includeReportsText);
    }

    async getIncidentIdsFromReports(reportIds: number[]): Promise<number[]> {
        if (!reportIds.length) {
            return [];
        }

        const incidentIds: number[] = [];

        const { data } = await client.query({
            query: REPORTS_LIMITED_QUERY,
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
        for (const report of reports) {
            if (report.incidents) {
                for (const incident of report.incidents) {
                    incidentIds.push(incident.incident_id);
                }
            }
        }

        // Return unique incident IDs
        return [...new Set(incidentIds)];
    }

    async findSimilarIncidentsByText(text: string, includeClassifications = false, limit = 10, includeReportsText = 0) {
        const results = await this.vectorSearch(text, 0.3, 1000);

        const incidentResults = results.filter(result => result.sourceType === 'incident');
        const searchIncidentIds: number[] = incidentResults.map((result) => parseInt(result.sourceId));

        const reportResults = results.filter(result => result.sourceType === 'report');
        const searchReportIds: number[] = reportResults.map((result) => parseInt(result.sourceId));

        const relatedIncidentIds = await this.getIncidentIdsFromReports(searchReportIds);

        const incidentIds = [...new Set([...searchIncidentIds, ...relatedIncidentIds])].slice(0, limit);

        return this.findIncidentsByIds(incidentIds, includeClassifications, includeReportsText);
    }

    async findIncidentsByReportIds(reportIds: number[], includeClassifications = false, includeReportsText = 0) {
        if (!reportIds.length) {
            return [];
        }

        const incidentIds = await this.getIncidentIdsFromReports(reportIds);

        if (!incidentIds.length) {
            return [];
        }

        return this.findIncidentsByIds(incidentIds, includeClassifications, includeReportsText);
    }

    async getSimilarIncidentsClassifications(text: string, taxonomy: string, incidentsLimit: number = 10) {

        // Get vector results using the specified table
        const results = await this.vectorSearch(text, 0.5, 1000);

        if (results.length === 0) {
            return {
                incidents: [],
                taxonomyData: {
                    namespace: taxonomy,
                    classificationCount: 0,
                    message: 'No similar incidents found.'
                }
            };
        }

        // Extract incident IDs directly from results
        const incidentResults = results.filter(result => result.sourceType === 'incident');
        const incidentIds = incidentResults
            .map(result => parseInt(result.sourceId, 10));

        // Extract report IDs and get their associated incident IDs
        const reportResults = results.filter(result => result.sourceType === 'report');
        const reportIds = reportResults.map(result => parseInt(result.sourceId, 10));
        
        // Get incident IDs from reports using the existing method
        const reportIncidentIds = await this.getIncidentIdsFromReports(reportIds);
        
        // Combine and deduplicate incident IDs, then limit
        const allIncidentIds = [...new Set([...incidentIds, ...reportIncidentIds])].slice(0, incidentsLimit);

        // Use the existing method to get incidents with classifications and report text
        const incidents = await this.findIncidentsByIds(allIncidentIds, true, 1);

        const incidentsWithClassifications = incidents
            .filter(incident => incident.classifications && incident.classifications.length > 0)
            .filter(incident => incident.classifications.some(classification => classification.namespace === taxonomy));

        if (incidentsWithClassifications.length === 0) {
            return {
                incidents: incidents,
                taxonomyData: {
                    namespace: taxonomy,
                    classificationCount: 0,
                    message: `Found similar incidents, but none have classifications for the '${taxonomy}' taxonomy. Try a different taxonomy namespace.`
                }
            };
        }

        // Filter to just include the requested taxonomy classifications
        const filteredIncidents = incidentsWithClassifications
            .map(incident => ({
                ...incident,
                classifications: incident.classifications
                    .filter(c => c.namespace === taxonomy)
            }));

        return {
            incidents: filteredIncidents.slice(0, incidentsLimit),
            taxonomyData: {
                namespace: taxonomy,
                classificationCount: incidentsWithClassifications.length
            }
        };
    }

    async getClassificationForIncident(incidentId: number, namespace: string) {

        const { data } = await client.query({
            query: FETCH_CLASSIFICATION,
            variables: {
                incident_id: incidentId,
                namespace
            }
        });

        return data.classification || null;
    }
}