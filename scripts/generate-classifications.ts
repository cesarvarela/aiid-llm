import 'dotenv/config';
import { generateClassification } from '../lib/classification';
import * as fs from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import * as schema from '../db/schema';
import { DataAccess } from '../lib/DataAccess';
import { createEmbeddingProvider } from '../lib/utils';

// Define argument options
const parser = yargs(hideBin(process.argv))
    .option('incidents', {
        alias: 'i',
        type: 'string',
        description: 'Comma-separated incident IDs or range (e.g., "1,2,3" or "1..10")',
        demandOption: true
    })
    .option('taxonomy', {
        alias: 't',
        type: 'string',
        description: 'Taxonomy namespace (e.g., "MIT")',
        demandOption: true
    })
    .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output CSV file path',
        default: 'classification-comparison.csv'
    })
    .help();

// Parse incident IDs from input
function parseIncidentIds(incidentsArg: string): number[] {
    const ids: number[] = [];

    if (incidentsArg.includes('..')) {
        // Handle range notation (e.g., "1..10")
        const [start, end] = incidentsArg.split('..').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i++) {
                ids.push(i);
            }
        } else {
            throw new Error('Invalid range format. Expected format: start..end');
        }
    } else {
        // Handle comma-separated list (e.g., "1,2,3")
        incidentsArg.split(',').forEach(id => {
            const numId = Number(id.trim());
            if (!isNaN(numId)) {
                ids.push(numId);
            } else {
                throw new Error(`Invalid incident ID: ${id}`);
            }
        });
    }

    return ids;
}

async function getIncidentReportText(incidentId: number): Promise<string> {
    const dataAccess = new DataAccess(createEmbeddingProvider('openai'));
    const incident = await dataAccess.findIncidentById(incidentId, false, 1);
    const firstReport = incident?.reports[0];

    if (!firstReport) {
        throw new Error(`No report found for incident ${incidentId}`);
    }

    if (!firstReport.text) {
        throw new Error(`Report text is empty for incident ${incidentId}`);
    }

    return firstReport.text;
}

async function getCurrentClassification(incidentId: number, taxonomy: string): Promise<string> {
    const dataAccess = new DataAccess(createEmbeddingProvider('openai'));
    const classification = await dataAccess.getClassificationForIncident(incidentId, taxonomy);

    if (!classification) {
        throw new Error(`No ${taxonomy} classification found for incident ${incidentId}`);
    }

    // Return the classification as a JSON string
    return JSON.stringify(classification);
}

// Function to properly escape and format CSV values
function escapeCsvValue(value: string): string {
    // If the value contains newlines, double quotes, or commas, it needs to be enclosed in quotes
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        // Double quotes need to be escaped by doubling them
        // Replace all newlines with space to ensure single-line CSV values
        return `"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    }
    return value;
}

// Function to check if an incident is already in the CSV file
function isIncidentInCsv(incidentId: number, csvFilePath: string): boolean {
    if (!fs.existsSync(csvFilePath)) {
        return false;
    }

    try {
        const fileContent = fs.readFileSync(csvFilePath, 'utf8');
        const lines = fileContent.split('\n');

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const firstCommaIndex = line.indexOf(',');
            if (firstCommaIndex === -1) continue;

            const id = parseInt(line.substring(0, firstCommaIndex));
            if (id === incidentId) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Error checking if incident ${incidentId} is in CSV:`, error);
        return false;
    }
}

// Main function to process incidents
async function main() {
    try {
        // Get arguments
        const argv = await parser.argv;
        const { incidents: incidentsArg, taxonomy, output } = argv;
        const incidentIds = parseIncidentIds(incidentsArg as string);

        console.log(`Processing ${incidentIds.length} incidents with taxonomy ${taxonomy}`);
        console.log(`Output will be saved to ${output}`);

        // Create CSV file with header if it doesn't exist
        if (!fs.existsSync(output as string)) {
            fs.writeFileSync(output as string, 'incidentID,taxonomy,generatedClassification,originalClassification\n');
        }

        // Process each incident
        for (const incidentId of incidentIds) {
            console.log(`Checking incident ${incidentId}...`);

            // Skip if already in CSV
            if (isIncidentInCsv(incidentId, output as string)) {
                console.log(`Incident ${incidentId} already processed, skipping...`);
                continue;
            }

            console.log(`Processing incident ${incidentId}...`);

            try {
                // Get report text
                const reportText = await getIncidentReportText(incidentId);
                console.log(`Got report text (${reportText.length} chars) for incident ${incidentId}`);

                // Get generated classification
                console.log(`Generating classification for incident ${incidentId}...`);
                let generatedClassificationRaw = await generateClassification(reportText, taxonomy, schema.embeddingsSubset);
                console.log(`Generated classification for incident ${incidentId}`);

                // Ensure generated classification is properly formatted
                try {
                    // Parse if it's a string (should be a JSON string from AI)
                    if (typeof generatedClassificationRaw === 'string') {
                        const parsed = JSON.parse(generatedClassificationRaw);
                        // Extract just the classification part if it exists
                        if (parsed.classification) {
                            generatedClassificationRaw = JSON.stringify(parsed.classification);
                        }
                    }
                } catch (parseError) {
                    console.warn(`Warning: Could not parse generated classification as JSON: ${parseError}`);
                    // Keep the original string if it can't be parsed
                }

                // Get original classification
                console.log(`Fetching original classification for incident ${incidentId}...`);
                const originalClassification = await getCurrentClassification(incidentId, taxonomy as string);
                console.log(`Fetched original classification for incident ${incidentId}`);

                // Escape CSV values
                const csvLine = [
                    incidentId.toString(),
                    escapeCsvValue(taxonomy as string),
                    escapeCsvValue(generatedClassificationRaw),
                    escapeCsvValue(originalClassification)
                ].join(',');

                // Write directly to CSV file after processing each incident
                // Check if the file ends with a newline
                let endsWithNewline = false;
                const content = fs.readFileSync(output as string, 'utf8');
                endsWithNewline = content.endsWith('\n');
                
                // If file doesn't end with newline, add one before appending
                const dataToAppend = (endsWithNewline ? '' : '\n') + csvLine + '\n';
                fs.appendFileSync(output as string, dataToAppend);
                console.log(`Result for incident ${incidentId} written to ${output}`);

            } catch (error) {
                console.error(`Error processing incident ${incidentId}:`, error);
                
                // Write error line to CSV
                const errorLine = `${incidentId},${taxonomy},"ERROR","ERROR"`;
                let endsWithNewline = false;
                const content = fs.readFileSync(output as string, 'utf8');
                endsWithNewline = content.endsWith('\n');
                
                const dataToAppend = (endsWithNewline ? '' : '\n') + errorLine + '\n';
                fs.appendFileSync(output as string, dataToAppend);
                console.log(`Error for incident ${incidentId} written to ${output}`);
            }
        }

        console.log('Processing complete');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run the main function
if (require.main === module) {
    main();
} 