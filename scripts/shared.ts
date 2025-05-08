import * as fs from 'fs';
import { DataAccess } from '../lib/DataAccess';
import { createEmbeddingProvider } from '../lib/utils';
import { Classification } from '@/graphql/generated/graphql';

/** Parse a comma-separated list or range (e.g., "1,2,3" or "1..10") into an array of numeric IDs */
export function parseIncidentIds(arg: string): number[] {
  const ids: number[] = [];
  if (arg.includes('..')) {
    const [start, end] = arg.split('..').map(Number);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      for (let i = start; i <= end; i++) ids.push(i);
    } else {
      throw new Error('Invalid range format. Expected format: start..end');
    }
  } else {
    arg.split(',').forEach(id => {
      const numId = Number(id.trim());
      if (!isNaN(numId)) ids.push(numId);
      else throw new Error(`Invalid incident ID: ${id}`);
    });
  }
  return ids;
}

/** Fetch the first report text for an incident */
export async function getIncidentReportText(id: number): Promise<string> {
  const da = new DataAccess(createEmbeddingProvider('openai'));
  const incident = await da.findIncidentById(id, false, 1);
  const rpt = incident?.reports[0];
  if (!rpt) throw new Error(`No report found for incident ${id}`);
  if (!rpt.text) throw new Error(`Report text is empty for incident ${id}`);
  return rpt.text;
}

/** Fetch the existing classification object for an incident */
export async function getCurrentClassification(id: number, taxonomy: string): Promise<Classification> {
  const da = new DataAccess(createEmbeddingProvider('openai'));
  const classification = await da.getClassificationForIncident(id, taxonomy);
  if (!classification) throw new Error(`No ${taxonomy} classification found for incident ${id}`);
  return classification;
}

/**
 * Prepare a value for inclusion in a CSV cell: unwrap JSON strings, stringify objects, and escape quotes, commas, and newlines.
 */
export function formatCsvCell(raw: string): string {
  let val = raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      val = parsed;
    } else {
      val = JSON.stringify(parsed);
    }
  } catch {
    // leave val as-is if not valid JSON
  }
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""').replace(/\n/g, ' ')}` + '"';
  }
  return val;
}

/** Check if an incident ID already exists in the CSV */
export function isIncidentInCsv(id: number, path: string): boolean {
  if (!fs.existsSync(path)) return false;
  try {
    const lines = fs.readFileSync(path, 'utf8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const comma = line.indexOf(',');
      if (comma === -1) continue;
      if (parseInt(line.substring(0, comma), 10) === id) return true;
    }
  } catch {
    /* ignore errors */
  }
  return false;
}