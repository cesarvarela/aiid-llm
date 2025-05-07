import { describe, it, expect } from 'vitest';
import { printSimilarIncidentsClassifications } from '../lib/classification';
import type { Incident, Classification, Attribute, Report } from '../graphql/generated/graphql';


type TestIncident = Partial<Incident> | { reports: Partial<Report>[] };

describe('printSimilarIncidentsClassifications', () => {

    it('returns message when no incidents are found', () => {

        const result = { incidents: [], taxonomyData: { namespace: 'ns', classificationCount: 0 } };
        const output = printSimilarIncidentsClassifications(result as any);
        expect(output).toBe('No similar incidents found.');
    });

    it('handles single incident with no classifications', () => {

        const incident: TestIncident = {
            incident_id: 1,
            title: 'Test Incident',
            description: 'A test description',
            reports: [{ text: 'Report text' }],
            classifications: []
        };
        
        const result = { incidents: [incident], taxonomyData: { namespace: 'ns', classificationCount: 0 } };
        const output = printSimilarIncidentsClassifications(result as any);

        expect(output).toContain('Id: 1');
        expect(output).toContain('title: Test Incident');
        expect(output).toContain('classifications:');
        expect(output).toContain('No classifications available');
    });

    it('prints attributes when classifications are present and filters by attributeShortNames', () => {
        const attr1: Attribute = { short_name: 'a1', value_json: '"v1"' };
        const attr2: Attribute = { short_name: 'a2', value_json: '"v2"' };

        const classification: Classification = {
            namespace: 'ns',
            attributes: [attr1, attr2]
        };

        const incident: Omit<Partial<Incident>, 'reports'> & { reports: Partial<Report>[] } = {
            incident_id: 2,
            title: 'Test2',
            description: '',
            reports: [{ text: 'R2' }],
            classifications: [classification]
        };

        const result = { incidents: [incident], taxonomyData: { namespace: 'ns', classificationCount: 1 } };
        
        const output = printSimilarIncidentsClassifications(result as any, ['a2']);

        expect(output).toContain('"short_name": "a2"');
        expect(output).not.toContain('"short_name": "a1"');
    });
});