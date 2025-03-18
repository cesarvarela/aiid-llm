import { describe, it, expect, beforeEach } from 'vitest';
import { DataAccess } from '../lib/DataAccess';
import * as schema from '../db/schema';
import { createEmbeddingProvider } from '../lib/utils';

describe('DataAccess', () => {
    let dataAccess: DataAccess;

    beforeEach(() => {
        // Use the actual OpenAI embedding provider
        const embeddingProvider = createEmbeddingProvider('openai');
        dataAccess = new DataAccess(embeddingProvider);
    });

    describe('constructor', () => {
        it('should be instantiated correctly', () => {
            expect(dataAccess).toBeInstanceOf(DataAccess);
        });

        it('should accept custom embedding table', () => {
            const customDataAccess = new DataAccess(
                createEmbeddingProvider('openai'),
                schema.embeddingsSubset
            );
            expect(customDataAccess).toBeInstanceOf(DataAccess);
        });
    });

    describe('vectorSearch', () => {
        it('should search for related content', async () => {
            const minScore = 0.5;
            const limit = 10;
            const results = await dataAccess.vectorSearch('AI system failure', minScore, limit);

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeLessThanOrEqual(limit);
            expect(Number(results[0].score)).toBeGreaterThanOrEqual(minScore);
        }, 30000);
    });

    describe('fetchTaxonomyDetails', () => {
        it('should fetch taxonomy details for a given namespace', async () => {
            const namespace = 'MIT';
            const taxonomy = await dataAccess.fetchTaxonomyDetails(namespace);

            expect(taxonomy).toHaveProperty('namespace', namespace);
            expect(taxonomy).toHaveProperty('field_list');
            expect(Array.isArray(taxonomy.field_list)).toBe(true);
        }, 30000);
    });

    describe('findReportByNumber', () => {
        it('should find a report by its number', async () => {
            const reportNumber = 1; // First report in the database
            const report = await dataAccess.findReportByNumber(reportNumber);

            expect(report).not.toBeNull();
            expect(report).toHaveProperty('report_number', reportNumber);
        }, 30000);

        it('should return null for non-existent report', async () => {
            // Using a very high number that likely doesn't exist
            const nonExistentReport = 9999999;
            const result = await dataAccess.findReportByNumber(nonExistentReport);
            expect(result).toBeNull();
        }, 30000);
    });

    describe('findReportsByNumbers', () => {
        it('should find multiple reports by their numbers', async () => {
            const reportNumbers = [1, 2]; // First two reports
            const reports = await dataAccess.findReportsByNumbers(reportNumbers);

            expect(Array.isArray(reports)).toBe(true);
            expect(reports.length).toBeGreaterThan(0);
            expect(reports[0]).toHaveProperty('report_number');
        }, 30000);

        it('should return empty array for empty input', async () => {
            const reports = await dataAccess.findReportsByNumbers([]);
            expect(reports).toEqual([]);
        });
    });

    describe('findIncidentById', () => {
        it('should return null for invalid incident ID', async () => {
            const result = await dataAccess.findIncidentById(0);
            expect(result).toBeNull();
        });

        it('should find an incident by ID', async () => {
            const incidentId = 1; // First incident
            const incident = await dataAccess.findIncidentById(incidentId);

            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('incident_id', incidentId);
        }, 30000);

        it('should optionally include classifications', async () => {
            const incidentId = 1; // First incident
            const incident = await dataAccess.findIncidentById(incidentId, true);

            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('classifications');
            expect(Array.isArray(incident.classifications)).toBe(true);
        }, 30000);

        it('should optionally include report text when requested', async () => {
            const incidentId = 1; // First incident
            const incident = await dataAccess.findIncidentById(incidentId, false, 1);

            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('reports');
            expect(Array.isArray(incident.reports)).toBe(true);
            expect(incident.reports.length).toBeGreaterThan(0);
            expect(incident.reports[0]).toHaveProperty('text');
            expect(typeof incident.reports[0].text).toBe('string');
        }, 30000);

        it('should include multiple reports when requested', async () => {
            const incidentId = 1; // First incident with multiple reports
            const reportsToInclude = 2;
            const incident = await dataAccess.findIncidentById(incidentId, false, reportsToInclude);

            // If the incident has multiple reports, they should be included
            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('reports');
            expect(Array.isArray(incident.reports)).toBe(true);

            // The number of reports might be less if the incident doesn't have that many
            const expectedReportsCount = Math.min(reportsToInclude, incident.reports.length);
            expect(incident.reports.length).toBe(expectedReportsCount);

            // Check each report has text
            incident.reports.forEach(report => {
                expect(report).toHaveProperty('report_number');
                expect(report).toHaveProperty('title');
                expect(report).toHaveProperty('text');
            });
        }, 30000);

        it('should include both classifications and report text when requested', async () => {
            const incidentId = 1; // First incident
            const incident = await dataAccess.findIncidentById(incidentId, true, 1);

            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('classifications');
            expect(Array.isArray(incident.classifications)).toBe(true);

            expect(incident).toHaveProperty('reports');
            expect(Array.isArray(incident.reports)).toBe(true);
            expect(incident.reports.length).toBeGreaterThan(0);
            expect(incident.reports[0]).toHaveProperty('text');
        }, 30000);

        it('should include specific report text content when requested', async () => {
            // Use incident ID 1 which we know has reports with text
            const incidentId = 1;
            const incident = await dataAccess.findIncidentById(incidentId, false, 1);

            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('reports');
            expect(Array.isArray(incident.reports)).toBe(true);
            expect(incident.reports.length).toBe(1);

            // Check that the report has the specific content we saw in the API
            const report = incident.reports[0];
            expect(report).toHaveProperty('report_number');
            expect(report).toHaveProperty('title');
            expect(report).toHaveProperty('text');

            // This is incident #1 (Google's YouTube Kids), so the text should contain relevant keywords
            expect(report.text).toContain('YouTube');
            expect(report.text).toContain('Kids');
            expect(report.text.length).toBeGreaterThan(100); // Should be substantial text
        }, 30000);

        it('should respect the number of reports requested', async () => {
            // Request 2 reports for incident 1
            const incidentId = 1;
            const reportsRequested = 2;
            const incident = await dataAccess.findIncidentById(incidentId, false, reportsRequested);

            expect(incident).not.toBeNull();
            expect(incident).toHaveProperty('reports');
            expect(Array.isArray(incident.reports)).toBe(true);

            expect(incident.reports.length).toBe(reportsRequested);

            incident.reports.forEach(report => {
                expect(report).toHaveProperty('text');
                expect(report.text.length).toBeGreaterThan(0);
            });
        }, 30000);
    });

    describe('findIncidentsByIds', () => {
        it('should return empty array for empty input', async () => {
            const result = await dataAccess.findIncidentsByIds([]);
            expect(result).toEqual([]);
        });

        it('should find multiple incidents by IDs', async () => {
            const incidentIds = [1, 2]; // First two incidents
            const incidents = await dataAccess.findIncidentsByIds(incidentIds);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);
            expect(incidents[0]).toHaveProperty('incident_id');
        }, 30000);

        it('should optionally include classifications', async () => {
            const incidentIds = [1, 2]; // First two incidents
            const incidents = await dataAccess.findIncidentsByIds(incidentIds, true);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);
            expect(incidents[0]).toHaveProperty('incident_id');
            expect(incidents[0]).toHaveProperty('classifications');
            expect(Array.isArray(incidents[0].classifications)).toBe(true);
        }, 30000);

        it('should optionally include report text for multiple incidents', async () => {
            const incidentIds = [1, 2]; // First two incidents
            const incidents = await dataAccess.findIncidentsByIds(incidentIds, false, 1);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);

            // Check each incident has reports with text
            incidents.forEach(incident => {
                expect(incident).toHaveProperty('reports');
                expect(Array.isArray(incident.reports)).toBe(true);
                expect(incident.reports.length).toBeGreaterThan(0);
                expect(incident.reports[0]).toHaveProperty('text');
            });
        }, 30000);

        it('should include both classifications and report text when requested', async () => {
            const incidentIds = [1, 2]; // First two incidents
            const incidents = await dataAccess.findIncidentsByIds(incidentIds, true, 1);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);

            // Check each incident
            incidents.forEach(incident => {
                expect(incident).toHaveProperty('classifications');
                expect(Array.isArray(incident.classifications)).toBe(true);

                expect(incident).toHaveProperty('reports');
                expect(Array.isArray(incident.reports)).toBe(true);
                expect(incident.reports.length).toBeGreaterThan(0);
                expect(incident.reports[0]).toHaveProperty('text');
            });
        }, 30000);
    });

    describe('findSimilarIncidentsByIncidentId', () => {
        it('should find similar incidents by ID', async () => {
            const incidentId = 1; // First incident
            const incidents = await dataAccess.findSimilarIncidentsByIncidentId(incidentId);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);
            expect(incidents[0]).toHaveProperty('incident_id');
        }, 30000);

        it('should optionally include classifications', async () => {
            const incidentId = 1; // First incident
            const incidents = await dataAccess.findSimilarIncidentsByIncidentId(incidentId, true);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);
            expect(incidents[0]).toHaveProperty('incident_id');
            expect(incidents[0]).toHaveProperty('classifications');
            expect(Array.isArray(incidents[0].classifications)).toBe(true);
        }, 30000);

        it('should optionally include report text for similar incidents', async () => {
            const incidentId = 1; // First incident
            const incidents = await dataAccess.findSimilarIncidentsByIncidentId(incidentId, false, 1);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);

            // Check each incident has reports with text
            incidents.forEach(incident => {
                expect(incident).toHaveProperty('reports');
                expect(Array.isArray(incident.reports)).toBe(true);
                expect(incident.reports.length).toBeGreaterThan(0);
                expect(incident.reports[0]).toHaveProperty('text');
            });
        }, 30000);
    });

    describe('getIncidentIdsFromReports', () => {
        it('should return empty array for empty input', async () => {
            const result = await dataAccess.getIncidentIdsFromReports([]);
            expect(result).toEqual([]);
        });

        it('should get incident IDs from report IDs', async () => {
            const reportIds = [1, 2]; // First two reports
            const incidentIds = await dataAccess.getIncidentIdsFromReports(reportIds);

            expect(Array.isArray(incidentIds)).toBe(true);
            expect(incidentIds.length).toBeGreaterThan(0);
            expect(incidentIds.every(id => typeof id === 'number')).toBe(true);
        }, 30000);
    });

    describe('findSimilarIncidentsByText', () => {
        it('should find similar incidents by text input', async () => {
            const query = 'autonomous vehicle accident';
            const incidents = await dataAccess.findSimilarIncidentsByText(query);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents[0]).toHaveProperty('incident_id');
            expect(incidents[0]).toHaveProperty('title');
        }, 60000);

        it('should perform text search with limit', async () => {
            const query = 'AI failure';
            const limit = 5;
            const incidents = await dataAccess.findSimilarIncidentsByText(query, false, limit);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeLessThanOrEqual(limit);
        }, 60000);

        it('should optionally include classifications', async () => {
            const query = 'autonomous vehicle accident';
            const incidents = await dataAccess.findSimilarIncidentsByText(query, true);

            expect(Array.isArray(incidents)).toBe(true);

            const incident = incidents[0];
            expect(incident).toHaveProperty('incident_id');
            expect(incident).toHaveProperty('title');
            expect(incident).toHaveProperty('classifications');
            expect(Array.isArray(incident.classifications)).toBe(true);
        }, 60000);

        it('should optionally include report text with search results', async () => {
            const query = 'autonomous vehicle accident';
            const incidents = await dataAccess.findSimilarIncidentsByText(query, false, 5, 1);

            expect(Array.isArray(incidents)).toBe(true);

            expect(incidents[0]).toHaveProperty('incident_id');
            expect(incidents[0]).toHaveProperty('title');

            // Check for report text
            expect(incidents[0]).toHaveProperty('reports');
            expect(Array.isArray(incidents[0].reports)).toBe(true);
            expect(incidents[0].reports.length).toBeGreaterThan(0);
            expect(incidents[0].reports[0]).toHaveProperty('text');

        }, 60000);

        it('should include both classifications and report text when requested', async () => {
            const query = 'autonomous vehicle accident';
            const incidents = await dataAccess.findSimilarIncidentsByText(query, true, 5, 1);

            expect(Array.isArray(incidents)).toBe(true);

            // Check incident structure
            const incident = incidents[0];
            expect(incident).toHaveProperty('incident_id');
            expect(incident).toHaveProperty('title');

            // Check for classifications
            expect(incident).toHaveProperty('classifications');
            expect(Array.isArray(incident.classifications)).toBe(true);

            // Check for report text
            expect(incident).toHaveProperty('reports');
            expect(Array.isArray(incident.reports)).toBe(true);
            expect(incident.reports.length).toBeGreaterThan(0);
            expect(incident.reports[0]).toHaveProperty('text');
        }, 60000);
    });

    describe('findIncidentsByReportIds', () => {
        it('should return empty array for empty input', async () => {
            const result = await dataAccess.findIncidentsByReportIds([]);
            expect(result).toEqual([]);
        });

        it('should find incidents by report IDs', async () => {
            const reportIds = [1, 2]; // First two reports
            const incidents = await dataAccess.findIncidentsByReportIds(reportIds);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);
            expect(incidents[0]).toHaveProperty('incident_id');
        }, 30000);

        it('should optionally include classifications', async () => {
            const reportIds = [1, 2]; // First two reports
            const incidents = await dataAccess.findIncidentsByReportIds(reportIds, true);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);
            expect(incidents[0]).toHaveProperty('incident_id');
            expect(incidents[0]).toHaveProperty('classifications');
            expect(Array.isArray(incidents[0].classifications)).toBe(true);
        }, 30000);

        it('should optionally include report text', async () => {
            const reportIds = [1, 2]; // First two reports
            const incidents = await dataAccess.findIncidentsByReportIds(reportIds, false, 1);

            expect(Array.isArray(incidents)).toBe(true);
            expect(incidents.length).toBeGreaterThan(0);

            // Check each incident has reports with text
            incidents.forEach(incident => {
                expect(incident).toHaveProperty('reports');
                expect(Array.isArray(incident.reports)).toBe(true);
                expect(incident.reports.length).toBeGreaterThan(0);
                expect(incident.reports[0]).toHaveProperty('text');
            });
        }, 30000);
    });

    describe('getSimilarIncidentsClassifications', () => {
        it('should get similar incidents with classifications for a taxonomy', async () => {
            const text = 'autonomous vehicle accident';
            const taxonomy = 'cset';
            const result = await dataAccess.getSimilarIncidentsClassifications(text, taxonomy);

            // Check top-level structure
            expect(result).toHaveProperty('incidents');
            expect(result).toHaveProperty('taxonomyData');
            expect(result.taxonomyData).toHaveProperty('namespace', taxonomy);

            // Check incidents array
            expect(Array.isArray(result.incidents)).toBe(true);
            expect(result.incidents.length).toBeGreaterThan(0);

            // Check incident details
            expect(result.incidents[0]).toHaveProperty('incident_id');
            expect(result.incidents[0]).toHaveProperty('title');

            // Check classifications
            expect(result.incidents[0]).toHaveProperty('classifications');

            // Check reports
            expect(result.incidents[0]).toHaveProperty('reports');
            expect(Array.isArray(result.incidents[0].reports)).toBe(true);
            expect(result.incidents[0].reports.length).toBeGreaterThan(0);

            // Check report structure
            const report = result.incidents[0].reports[0];
            expect(report).toHaveProperty('report_number');
            expect(report).toHaveProperty('title');
            expect(report).toHaveProperty('text');
        }, 60000);

        it('should respect the incidents limit', async () => {
            const text = 'AI failure';
            const taxonomy = 'cset';
            const limit = 5;
            const result = await dataAccess.getSimilarIncidentsClassifications(text, taxonomy, limit);
            expect(result.incidents.length).toBeLessThanOrEqual(limit);
        }, 60000);

        it('should handle case with no similar incidents', async () => {
            const text = 'xyzabc123veryunlikelytext987654321';
            const taxonomy = 'cset';

            const result = await dataAccess.getSimilarIncidentsClassifications(text, taxonomy);

            expect(result).toHaveProperty('incidents');
            expect(result).toHaveProperty('taxonomyData');
            expect(result.taxonomyData).toHaveProperty('namespace', taxonomy);


            expect(result.taxonomyData).toHaveProperty('message');
            expect(result.taxonomyData.message).toContain("Found similar incidents, but none have classifications for the 'cset' taxonomy. Try a different taxonomy namespace.");

        }, 60000);
    });

    describe('getClassificationForIncident', () => {
        it('should get classification for an incident', async () => {
            const incidentId = 1; // First incident ID with classification
            const namespace = 'MIT'; // Example taxonomy

            const classification = await dataAccess.getClassificationForIncident(incidentId, namespace);

            // Check that we got a valid classification
            expect(classification).not.toBeNull();
            expect(classification).toHaveProperty('attributes');
            expect(classification).toHaveProperty('namespace', namespace);
        }, 30000);

        it('should return null when classification does not exist', async () => {
            const incidentId = 1;
            const namespace = 'nonexistent-taxonomy';

            const classification = await dataAccess.getClassificationForIncident(incidentId, namespace);
            expect(classification).toBeNull();
        }, 30000);
    });
});