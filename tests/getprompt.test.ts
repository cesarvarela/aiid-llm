import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPrompt } from '../lib/classification';
import { DataAccess } from '../lib/DataAccess';

describe('getPrompt', () => {
  const fakeTaxonomyData = {
    namespace: 'fakeNS',
    classificationCount: 2,
    field_list: [ { short_name: 'f1' }, { short_name: 'f2' } ],
    extra: 'info'
  };
  const fakeSimilar = {
    incidents: [
      {
        incident_id: '123',
        title: 'Title123',
        description: 'Desc123',
        reports: [{ text: 'ReportText' }],
        classifications: []
      }
    ],
    taxonomyData: { namespace: 'fakeNS', classificationCount: 1, message: 'note' }
  };

  beforeEach(() => {
    // Mock DataAccess methods
    vi.spyOn(DataAccess.prototype, 'fetchTaxonomyDetails').mockResolvedValue(fakeTaxonomyData as any);
    vi.spyOn(DataAccess.prototype, 'getSimilarIncidentsClassifications').mockResolvedValue(fakeSimilar as any);
  });

  it('includes incident text and taxonomy namespace', async () => {
    const prompt = await getPrompt('Some incident text', 'myTax');
    expect(prompt).toContain('Here is the incident text to classify:');
    expect(prompt).toContain('Some incident text');
    expect(prompt).toContain('Here is the taxonomy namespace to use for classification:');
    expect(prompt).toContain('myTax');
  });

  it('includes JSON of taxonomy data', async () => {
    const prompt = await getPrompt('txt', 'tx');
    const jsonTax = JSON.stringify(fakeTaxonomyData, null, 2);
    expect(prompt).toContain(jsonTax);
  });

  it('includes similar incidents output', async () => {
    const prompt = await getPrompt('foo', 'bar');
    // printSimilarIncidentsClassifications for fakeSimilar should include incident id
    expect(prompt).toMatch(/Id: 123/);
  });

  it('lists all required fields from taxonomy field_list', async () => {
    const prompt = await getPrompt('t', 'tax');
    expect(prompt).toContain('IMPORTANT: Your classification MUST include ALL of the following taxonomy attributes:');
    // fields f1 and f2 should be listed
    expect(prompt).toContain('f1, f2');
  });
});