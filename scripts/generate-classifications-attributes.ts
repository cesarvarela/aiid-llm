import 'dotenv/config';
import { generateClassificationForAttributes } from '../lib/classification';
import * as fs from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import * as schema from '../db/schema';
import { parseIncidentIds, getIncidentReportText, getCurrentClassification, formatCsvCell, isIncidentInCsv } from './shared';
import * as path from 'path';

const parser = yargs(hideBin(process.argv))
    .option('incidents', { alias: 'i', type: 'string', description: 'Comma-separated incident IDs or range (e.g., "1,2,3" or "1..10")', demandOption: true })
    .option('taxonomy', { alias: 't', type: 'string', description: 'Taxonomy namespace (e.g., "MIT")', demandOption: true })
    .option('attributes', { alias: 'a', type: 'string', description: 'Comma-separated attribute short names to classify (e.g., "Harm Distribution Basis,Severity")', demandOption: true })
    .option('model', { alias: 'm', type: 'string', description: 'OpenAI model to use for classification', demandOption: true })
    .option('output', { alias: 'o', type: 'string', description: 'Output CSV file path', default: 'classification-attributes.csv' })
    .strict()
    .help();

async function main() {
    const argv = await parser.argv;
    const incidentIds = parseIncidentIds(argv.incidents as string);
    const taxonomy = argv.taxonomy as string;
    const attributesArg = argv.attributes as string;
    const attributeShortNames = attributesArg.split(',').map(a => a.trim()).filter(Boolean);
    const model = argv.model as string;
    const output = argv.output as string;

    if (!fs.existsSync(output)) {
        const headerCols = ['incidentID', 'taxonomy', ...attributeShortNames.map(a => `gen_${a}`), ...attributeShortNames.map(a => `orig_${a}`), 'explanation'];
        fs.writeFileSync(output, headerCols.join(',') + '\n');
    }

    for (const id of incidentIds) {
        
        if (isIncidentInCsv(id, output)) {
            console.log(`Incident ${id} already processed, skipping...`);
            continue;
        }

        try {
            console.log(`Processing incident ${id}...`);
            const text = await getIncidentReportText(id);
            const genRes = await generateClassificationForAttributes(text, taxonomy, attributeShortNames, schema.embeddingsSubset, model);
            const origJson = await getCurrentClassification(id, taxonomy);

            // Build a map from attribute short_name to its LLM output
            const genMap = new Map(genRes.map(r => [r.classification.attributes?.[0]?.short_name, r]));
            const genValues = attributeShortNames.map(attr => {
                const out = genMap.get(attr);
                if (!out) return '';
                return formatCsvCell(out.classification.attributes[0].value_json);
            });
            const origValues = attributeShortNames.map(attr => {
                const a = origJson.attributes.find(a => a.short_name === attr);
                if (!a) return '';
                return formatCsvCell(a.value_json);
            });
            // Combine explanations for each attribute
            const explanationAll = genRes.map(r => {
                const name = r.classification.attributes?.[0]?.short_name;
                return `[${name}]: ${r.explanation || ''}`;
            }).join('\n---\n');
            const explanationCell = formatCsvCell(explanationAll);
            const line = [id.toString(), formatCsvCell(taxonomy), ...genValues, ...origValues, explanationCell].join(',');

            const content = fs.readFileSync(output, 'utf8');
            const endsNew = content.endsWith('\n');

            fs.appendFileSync(output, (endsNew ? '' : '\n') + line + '\n');

            const outputBase = path.basename(output, path.extname(output));
            const promptsDir = path.join(path.dirname(output), `${outputBase}-prompts`);

            if (!fs.existsSync(promptsDir)) {
                fs.mkdirSync(promptsDir, { recursive: true });
            }

            attributeShortNames.forEach(attr => {
                const out = genMap.get(attr);
                if (out) {
                    const promptPath = path.join(promptsDir, `${id}-${attr}.txt`);
                    fs.writeFileSync(promptPath, out.prompt || '');
                }
            });

            console.log(`Wrote result for ${id}`);
        }
        catch (err) {
            console.error(`Error processing ${id}:`, err);
            const errValues = attributeShortNames.map(() => 'ERROR');
            // On error, leave explanation column empty
            const errLine = [id.toString(), formatCsvCell(taxonomy), ...errValues, ...errValues, ''].join(',');
            const content = fs.readFileSync(output, 'utf8');
            const endsNew = content.endsWith('\n');
            fs.appendFileSync(output, (endsNew ? '' : '\n') + errLine + '\n');
        }
    }
}

if (require.main === module) main();