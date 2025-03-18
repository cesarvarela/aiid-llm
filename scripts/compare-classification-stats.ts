#!/usr/bin/env npx tsx
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

// Define argument options
const parser = yargs(hideBin(process.argv))
    .option('input', {
        alias: 'i',
        type: 'string',
        description: 'Input CSV file path',
        default: 'classification-comparison.csv'
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Display detailed comparison results',
        default: false
    })
    .help();

// Function to normalize JSON objects for comparison
function normalizeJSON(jsonStr: string): any {
    try {
        // Parse string to object
        const obj = JSON.parse(jsonStr);
        return obj;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return null;
    }
}

// Function to deeply compare two objects regardless of property order
function deepCompare(obj1: any, obj2: any): boolean {
    // Handle null or undefined
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null || obj1 === undefined || obj2 === undefined) return false;
    
    // Handle different types
    if (typeof obj1 !== typeof obj2) return false;
    
    // Handle primitive types
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    // Handle arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        
        // For arrays of objects (like attributes), we need to sort them first
        // This is a special case for the classification data structure
        if (obj1.length > 0 && typeof obj1[0] === 'object') {
            // Try to sort by a common property if it exists (like 'short_name')
            if (obj1[0].hasOwnProperty('short_name')) {
                const sortedObj1 = [...obj1].sort((a, b) => a.short_name.localeCompare(b.short_name));
                const sortedObj2 = [...obj2].sort((a, b) => a.short_name.localeCompare(b.short_name));
                
                for (let i = 0; i < sortedObj1.length; i++) {
                    if (!deepCompare(sortedObj1[i], sortedObj2[i])) return false;
                }
                return true;
            }
        }
        
        // For simple arrays or arrays without a common sorting property
        for (let i = 0; i < obj1.length; i++) {
            if (!deepCompare(obj1[i], obj2[i])) return false;
        }
        return true;
    }
    
    // Handle objects
    if (!Array.isArray(obj1) && !Array.isArray(obj2)) {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (const key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!deepCompare(obj1[key], obj2[key])) return false;
        }
        return true;
    }
    
    // Different types of objects
    return false;
}

// Compare specific fields in the classifications
function compareClassificationFields(generated: any, original: any): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    // Skip comparison if either object is null
    if (!generated || !original) {
        return { "overall": false };
    }
    
    // Compare namespace
    results["namespace"] = generated.namespace === original.namespace;
    
    // Compare publish status
    results["publish"] = generated.publish === original.publish;
    
    // Compare attributes (this is the most complex part)
    if (generated.attributes && original.attributes) {
        results["attributes"] = deepCompare(generated.attributes, original.attributes);
    } else {
        results["attributes"] = false;
    }
    
    // Overall match (all fields must match)
    results["overall"] = Object.values(results).every(value => value);
    
    return results;
}

// Function to find differences between two objects
function findDifferences(generated: any, original: any, path = ""): string[] {
    const differences: string[] = [];
    
    if (generated === null || original === null) {
        return ["One of the objects is null"];
    }
    
    // Compare attributes - the most important part
    if (generated.attributes && original.attributes) {
        // Create maps for easier comparison
        const genAttrs = new Map();
        const origAttrs = new Map();
        
        generated.attributes.forEach((attr: any) => {
            genAttrs.set(attr.short_name, JSON.parse(attr.value_json));
        });
        
        original.attributes.forEach((attr: any) => {
            origAttrs.set(attr.short_name, JSON.parse(attr.value_json));
        });
        
        // Check for missing attributes
        const allKeys = new Set([...genAttrs.keys(), ...origAttrs.keys()]);
        
        allKeys.forEach(key => {
            const genValue = genAttrs.get(key);
            const origValue = origAttrs.get(key);
            
            if (!genAttrs.has(key)) {
                differences.push(`Generated is missing attribute: ${key} (original has ${JSON.stringify(origValue)})`);
            } else if (!origAttrs.has(key)) {
                differences.push(`Original is missing attribute: ${key} (generated has ${JSON.stringify(genValue)})`);
            } else if (JSON.stringify(genValue) !== JSON.stringify(origValue)) {
                differences.push(`Different values for ${key}:\n  Generated: ${JSON.stringify(genValue)}\n  Original: ${JSON.stringify(origValue)}`);
            }
        });
    } else if (generated.attributes || original.attributes) {
        differences.push("One classification is missing attributes entirely");
    }
    
    // Check other fields
    if (generated.namespace !== original.namespace) {
        differences.push(`Namespace difference: ${generated.namespace} vs ${original.namespace}`);
    }
    
    if (generated.publish !== original.publish) {
        differences.push(`Publish setting difference: ${generated.publish} vs ${original.publish}`);
    }
    
    return differences;
}

// Function to process the CSV file and generate statistics
async function processClassifications() {
    const argv = await parser.argv;
    const { input, verbose } = argv;
    
    console.log(`Analyzing classifications from: ${input}`);
    
    if (!fs.existsSync(input as string)) {
        console.error(`Error: File ${input} does not exist`);
        process.exit(1);
    }
    
    // Read and parse CSV
    const fileContent = fs.readFileSync(input as string, 'utf8');
    const lines = fileContent.split('\n');
    
    // Skip header
    if (lines.length <= 1) {
        console.error("Error: CSV file is empty or has only header");
        process.exit(1);
    }
    
    // Statistics
    let totalComparisons = 0;
    let exactMatches = 0;
    let namespaceMatches = 0;
    let publishMatches = 0;
    let attributeMatches = 0;
    
    type DetailedResult = {
        incidentId: string;
        taxonomy: string;
        exact: boolean;
        differences?: string[];
    };
    
    const detailedResults: DetailedResult[] = [];
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line - need to handle quotes correctly
        const parsedLine = parseCSVLine(line);
        if (parsedLine.length < 4) continue;
        
        const [incidentId, taxonomy, generatedClassificationStr, originalClassificationStr] = parsedLine;
        
        // Skip if any of the values are "ERROR"
        if (generatedClassificationStr === "ERROR" || originalClassificationStr === "ERROR") {
            console.log(`Skipping incident ${incidentId} due to errors in data`);
            continue;
        }
        
        // Parse JSON
        const generatedClassification = normalizeJSON(generatedClassificationStr);
        const originalClassification = normalizeJSON(originalClassificationStr);
        
        if (!generatedClassification || !originalClassification) {
            console.log(`Skipping incident ${incidentId} due to invalid JSON`);
            continue;
        }
        
        // Compare classifications
        totalComparisons++;
        const comparisonResults = compareClassificationFields(generatedClassification, originalClassification);
        
        // Update statistics
        if (comparisonResults.overall) exactMatches++;
        if (comparisonResults.namespace) namespaceMatches++;
        if (comparisonResults.publish) publishMatches++;
        if (comparisonResults.attributes) attributeMatches++;
        
        // Store detailed results if verbose
        if (verbose) {
            const result: DetailedResult = {
                incidentId,
                taxonomy,
                exact: comparisonResults.overall
            };
            
            if (!comparisonResults.overall) {
                result.differences = findDifferences(generatedClassification, originalClassification);
            }
            
            detailedResults.push(result);
        }
    }
    
    // Print detailed results if verbose
    if (verbose && detailedResults.length > 0) {
        console.log("\n=== Detailed Results ===");
        detailedResults.forEach(result => {
            console.log(`\nIncident ${result.incidentId} (${result.taxonomy}):`);
            console.log(`  Exact match: ${result.exact ? 'YES' : 'NO'}`);
            
            if (!result.exact && result.differences) {
                console.log("  Differences found:");
                result.differences.forEach(diff => {
                    console.log(`    - ${diff}`);
                });
            }
        });
    }
    
    // Print statistics at the end
    printStatistics(totalComparisons, exactMatches, namespaceMatches, publishMatches, attributeMatches);
}

// Function to parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            // Handle escaped quotes (two double quotes in a row)
            if (inQuotes && i+1 < line.length && line[i+1] === '"') {
                current += '"';
                i++; // Skip the next quote
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current);
    return result;
}

// Function to print summary statistics
function printStatistics(totalComparisons: number, exactMatches: number, namespaceMatches: number, publishMatches: number, attributeMatches: number) {
    console.log("\n=== Classification Comparison Statistics ===");
    console.log(`Total incidents analyzed: ${totalComparisons}`);
    console.log(`Exact matches: ${exactMatches} (${(exactMatches/totalComparisons*100).toFixed(2)}%)`);
    console.log(`Namespace matches: ${namespaceMatches} (${(namespaceMatches/totalComparisons*100).toFixed(2)}%)`);
    console.log(`Publish setting matches: ${publishMatches} (${(publishMatches/totalComparisons*100).toFixed(2)}%)`);
    console.log(`Attributes matches: ${attributeMatches} (${(attributeMatches/totalComparisons*100).toFixed(2)}%)`);
}

// Run the main function only if this script is executed directly
if (require.main === module) {
    processClassifications();
} 