import 'dotenv/config';
import { generateClassification } from '../lib/classification';
import * as fs from 'fs';
import * as path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import * as schema from '../db/schema';
import { DataAccess } from '@/lib/DataAccess';
import { createEmbeddingProvider } from '@/lib/utils';
import { parseIncidentIds, getIncidentReportText, getCurrentClassification, formatCsvCell, isIncidentInCsv } from './shared';

const parser = yargs(hideBin(process.argv))
  .option('incidents', { alias: 'i', type: 'string', description: 'Comma-separated incident IDs or range (e.g., "1,2,3" or "1..10")', demandOption: true })
  .option('taxonomy', { alias: 't', type: 'string', description: 'Taxonomy namespace (e.g., "MIT")', demandOption: true })
  .option('output', { alias: 'o', type: 'string', description: 'Output CSV file path', default: 'classification-all.csv' })
  .option('model', { alias: 'm', type: 'string', description: 'LLM model to use (e.g., "gpt-4o", "o4-mini")', demandOption: true })
  .strict()
  .help();

async function main() {

  const argv = await parser.argv;
  const incidentIds = parseIncidentIds(argv.incidents as string);
  const taxonomy = argv.taxonomy as string;
  const output = argv.output as string;
  const model = argv.model as string;
  const da = new DataAccess(createEmbeddingProvider('openai'));
  const taxonomyData = await da.fetchTaxonomyDetails(taxonomy);
  const attributeShortNames: string[] = (taxonomyData.field_list || [])
    .map(f => f?.short_name)
    .filter(Boolean) as string[];

  if (!fs.existsSync(output)) {
    const headerCols = ['incidentID', 'taxonomy', ...attributeShortNames.map(a => `gen_${a}`), ...attributeShortNames.map(a => `orig_${a}`), 'explanation'];
    const escapedHeaderCols = headerCols.map(formatCsvCell);
    fs.writeFileSync(output, escapedHeaderCols.join(',') + '\n');
  }

  for (const id of incidentIds) {
    
    if (isIncidentInCsv(id, output)) { console.log(`Incident ${id} already processed, skipping...`); continue; }
    
    try {
      console.log(`Processing incident ${id}...`);
      const text = await getIncidentReportText(id);
      console.log(`Got report text (${text.length} chars)`);
      const genRes = await generateClassification(text, taxonomy, schema.embeddingsSubset, model);
      const origClass = await getCurrentClassification(id, taxonomy);

      const genValues = attributeShortNames.map(attr => {
        const a = genRes.classification.attributes.find(x => x.short_name === attr);
        return formatCsvCell(a ? a.value_json : '');
      });
      const origValues = attributeShortNames.map(attr => {
        const a = origClass.attributes.find(x => x.short_name === attr);
        return formatCsvCell(a ? a.value_json : '');
      });

      const explanationCell = formatCsvCell(genRes.explanation || '');
      const line = [id.toString(), formatCsvCell(taxonomy), ...genValues, ...origValues, explanationCell].join(',');

      const content = fs.readFileSync(output, 'utf8');
      const endsNew = content.endsWith('\n');
      fs.appendFileSync(output, (endsNew ? '' : '\n') + line + '\n');


      const outputBase = path.basename(output, path.extname(output));
      const promptsDir = path.join(path.dirname(output), `${outputBase}-prompts`);

      if (!fs.existsSync(promptsDir)) fs.mkdirSync(promptsDir, { recursive: true });

      const promptPath = path.join(promptsDir, `${id}.txt`);
      fs.writeFileSync(promptPath, genRes.prompt || '');
    }
    catch (err) {
      console.error(`Error for ${id}:`, err);
      const errValues = attributeShortNames.map(() => 'ERROR');
      const errLine = [id.toString(), formatCsvCell(taxonomy), ...errValues, ...errValues, ''].join(',');
      const content = fs.readFileSync(output, 'utf8');
      const endsNew = content.endsWith('\n');
      fs.appendFileSync(output, (endsNew ? '' : '\n') + errLine + '\n');
    }
  }
}

if (require.main === module) main();