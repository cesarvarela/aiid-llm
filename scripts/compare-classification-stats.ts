#!/usr/bin/env npx tsx
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import * as diffLib from 'diff';

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
export function normalizeJSON(jsonStr: string): any {
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
export function deepCompare(obj1: any, obj2: any): boolean {
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

// Function to safely parse JSON with fallback to original string
export function safeJsonParse(jsonStr: string | any): any {
    // If it's not a string, return as is
    if (typeof jsonStr !== 'string') {
        return jsonStr;
    }
    
    // Check if the string looks like a JSON string (starts with { or [ and ends with } or ])
    const trimmed = jsonStr.trim();
    const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
                          (trimmed.startsWith('"') && trimmed.endsWith('"'));
    
    if (!looksLikeJson) {
        // Return as is if it doesn't look like JSON
        return jsonStr;
    }
    
    try {
        return JSON.parse(jsonStr);
    } catch (error) {
        // If parsing fails, return the original string
        return jsonStr;
    }
}

// Type for classification comparison results
export interface ClassificationComparisonResult {
    namespace: boolean;
    attributes: boolean;
    overall: boolean;
    attributeMatchCount: number;
    attributeTotalCount: number;
    attributeMatchPercentage: number;
}

// Type for differences between classifications
export type ClassificationDifferences = string[];

// Main function to compare two classifications and return detailed stats
export function compareClassifications(generated: any, original: any): ClassificationComparisonResult {
    const results: Partial<ClassificationComparisonResult> = {};
    
    // Skip comparison if either object is null
    if (!generated || !original) {
        return {
            namespace: false,
            attributes: false,
            overall: false,
            attributeMatchCount: 0,
            attributeTotalCount: 0,
            attributeMatchPercentage: 0
        };
    }
    
    // Compare namespace - throw error if different
    if (generated.namespace !== original.namespace) {
        throw new Error(`Cannot compare classifications with different namespaces: ${generated.namespace} vs ${original.namespace}`);
    }
    
    results.namespace = true; // If we get here, namespaces match
    
    // Compare attributes with detailed stats
    if (generated.attributes && original.attributes) {
        // Create maps for easier comparison
        const genAttrs = new Map();
        const origAttrs = new Map();
        
        generated.attributes.forEach((attr: any) => {
            const parsedValue = safeJsonParse(attr.value_json);
            genAttrs.set(attr.short_name, parsedValue);
        });
        
        original.attributes.forEach((attr: any) => {
            const parsedValue = safeJsonParse(attr.value_json);
            origAttrs.set(attr.short_name, parsedValue);
        });
        
        // Track attribute-level stats
        const allKeys = new Set([...genAttrs.keys(), ...origAttrs.keys()]);
        let matchedAttributes = 0;
        
        allKeys.forEach(key => {
            if (genAttrs.has(key) && origAttrs.has(key)) {
                const genValue = genAttrs.get(key);
                const origValue = origAttrs.get(key);
                
                // Use string comparison in case the values couldn't be parsed as JSON
                const genValueStr = typeof genValue === 'string' ? genValue : JSON.stringify(genValue);
                const origValueStr = typeof origValue === 'string' ? origValue : JSON.stringify(origValue);
                
                if (genValueStr === origValueStr) {
                    matchedAttributes++;
                }
            }
        });
        
        // Calculate attribute match percentage
        results.attributeMatchCount = matchedAttributes;
        results.attributeTotalCount = allKeys.size;
        results.attributeMatchPercentage = allKeys.size > 0 ? 
            (matchedAttributes / allKeys.size) * 100 : 0;
        
        // Consider attributes match if all individual attributes match
        results.attributes = matchedAttributes === allKeys.size;
    } else {
        results.attributes = false;
        results.attributeMatchCount = 0;
        results.attributeTotalCount = 0;
        results.attributeMatchPercentage = 0;
    }
    
    // Overall match (all fields must match)
    results.overall = results.attributes === true; // Namespace is already verified
    
    return results as ClassificationComparisonResult;
}

// Function to find differences between two classifications
export function findClassificationDifferences(generated: any, original: any): ClassificationDifferences {
    const differences: string[] = [];
    
    if (generated === null || original === null) {
        return ["One of the objects is null"];
    }
    
    // Check namespace - throw error if different
    if (generated.namespace !== original.namespace) {
        throw new Error(`Cannot compare classifications with different namespaces: ${generated.namespace} vs ${original.namespace}`);
    }
    
    // Compare attributes - the most important part
    if (generated.attributes && original.attributes) {
        // Create maps for easier comparison
        const genAttrs = new Map();
        const origAttrs = new Map();
        
        // Process generated attributes
        if (Array.isArray(generated.attributes)) {
            generated.attributes.forEach((attr: any) => {
                genAttrs.set(attr.short_name, attr.value_json);
            });
        }
        
        // Process original attributes
        if (Array.isArray(original.attributes)) {
            original.attributes.forEach((attr: any) => {
                origAttrs.set(attr.short_name, attr.value_json);
            });
        }
        
        // Check for missing/different attributes
        
        // Find attributes in original that are not in generated
        origAttrs.forEach((value, key) => {
            if (!genAttrs.has(key)) {
                differences.push(`Generated is missing attribute: ${key} (original has ${value})`);
            }
        });
        
        // Find attributes in generated that are not in original
        genAttrs.forEach((value, key) => {
            if (!origAttrs.has(key)) {
                differences.push(`Original is missing attribute: ${key} (generated has ${value})`);
            } else if (genAttrs.get(key) !== origAttrs.get(key)) {
                // Different values for the same attribute
                differences.push(`Different values for ${key}:\n  Generated: ${genAttrs.get(key)}\n  Original: ${origAttrs.get(key)}`);
            }
        });
    } else if (generated.attributes || original.attributes) {
        differences.push("One classification is missing attributes entirely");
    }
    
    return differences;
}

// Function to create a visual diff of classifications
export function visualizeDiff(generated: any, original: any): string {
    if (!generated || !original) {
        return "Cannot create diff: One or both objects are null";
    }

    if (generated.namespace !== original.namespace) {
        return `Namespace mismatch: ${generated.namespace} vs ${original.namespace}`;
    }

    const output: string[] = [];
    output.push(`diff --taxonomy ${original.namespace}`);
    
    // Create maps for easier comparison
    const genAttrs = new Map();
    const origAttrs = new Map();
    
    if (Array.isArray(generated.attributes)) {
        generated.attributes.forEach((attr: any) => {
            genAttrs.set(attr.short_name, safeJsonParse(attr.value_json));
        });
    }
    
    if (Array.isArray(original.attributes)) {
        original.attributes.forEach((attr: any) => {
            origAttrs.set(attr.short_name, safeJsonParse(attr.value_json));
        });
    }
    
    // Get all attribute keys
    const allKeys = [...new Set([...genAttrs.keys(), ...origAttrs.keys()])].sort();
    
    // Count of actual differences
    let diffCount = 0;
    
    // For each attribute, show the differences using the diff library
    for (const key of allKeys) {
        const genHas = genAttrs.has(key);
        const origHas = origAttrs.has(key);
        
        // Skip if both have the attribute and the values are identical
        if (genHas && origHas) {
            const origValue = JSON.stringify(origAttrs.get(key), null, 2);
            const genValue = JSON.stringify(genAttrs.get(key), null, 2);
            
            if (origValue.trim() === genValue.trim()) {
                // Skip identical values
                continue;
            }
        }
        
        // If we get here, there's a difference to show
        diffCount++;
        
        output.push(`@@ Attribute: ${key} @@`);
        
        if (genHas && origHas) {
            // Both have the attribute with different values, show the diff
            const origValue = JSON.stringify(origAttrs.get(key), null, 2) + "\n";
            const genValue = JSON.stringify(genAttrs.get(key), null, 2) + "\n";
            
            // Use diff to create a unified diff
            const patch = diffLib.createPatch(
                key,                    // File name (using attribute name)
                origValue,              // Old string
                genValue,               // New string
                'original',             // Old header
                'generated',            // New header
                { context: 3 }          // Context lines
            );
            
            // Remove all header lines, keeping only the actual content changes
            const patchLines = patch
                .split('\n')
                .filter(line => {
                    // Keep only lines that start with + or -
                    // Filter out all header and context lines including:
                    // - File headers (--- and +++)
                    // - Chunk headers (@@ -1,1 +1,1 @@)
                    // - No newline messages
                    return (line.startsWith('+') || line.startsWith('-')) && 
                           !line.startsWith('+++') && 
                           !line.startsWith('---');
                });
            
            output.push(patchLines.join('\n'));
        } else if (origHas) {
            // Only in original
            output.push('-' + JSON.stringify(origAttrs.get(key), null, 2)
                .split('\n')
                .join('\n-'));
            output.push('(Only in original)');
        } else if (genHas) {
            // Only in generated
            output.push('+' + JSON.stringify(genAttrs.get(key), null, 2)
                .split('\n')
                .join('\n+'));
            output.push('(Only in generated)');
        }
        
        output.push(''); // Empty line between attributes
    }
    
    // If no differences were found, add a message
    if (diffCount === 0) {
        output.push('(No differences found)');
    }
    
    return output.join('\n');
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
    
    // Attribute-level statistics
    let totalAttributes = 0;
    let matchedAttributes = 0;
    
    // Track attributes by taxonomy
    const taxonomyStats: Record<string, {
        totalComparisons: number,
        exactMatches: number,
        totalAttributes: number,
        matchedAttributes: number
    }> = {};
    
    type DetailedResult = {
        incidentId: string;
        taxonomy: string;
        exact: boolean;
        attributeMatchPercentage?: number;
        differences?: string[];
        diffDisplay?: string;
        error?: string;
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
        
        try {
            const comparisonResults = compareClassifications(generatedClassification, originalClassification);
            
            // Update statistics
            if (comparisonResults.overall === true) exactMatches++;
            if (comparisonResults.namespace === true) namespaceMatches++;
            
            // Update attribute-level statistics
            totalAttributes += comparisonResults.attributeTotalCount;
            matchedAttributes += comparisonResults.attributeMatchCount;
            
            // Update taxonomy-specific statistics
            if (!taxonomyStats[taxonomy]) {
                taxonomyStats[taxonomy] = {
                    totalComparisons: 0,
                    exactMatches: 0,
                    totalAttributes: 0,
                    matchedAttributes: 0
                };
            }
            
            taxonomyStats[taxonomy].totalComparisons++;
            if (comparisonResults.overall === true) taxonomyStats[taxonomy].exactMatches++;
            taxonomyStats[taxonomy].totalAttributes += comparisonResults.attributeTotalCount;
            taxonomyStats[taxonomy].matchedAttributes += comparisonResults.attributeMatchCount;
            
            // Store detailed results if verbose
            if (verbose) {
                const result: DetailedResult = {
                    incidentId,
                    taxonomy,
                    exact: comparisonResults.overall === true,
                    attributeMatchPercentage: comparisonResults.attributeMatchPercentage
                };
                
                if (!result.exact) {
                    try {
                        result.differences = findClassificationDifferences(generatedClassification, originalClassification);
                        
                        // Add visual diff to the result object
                        const diffDisplay = visualizeDiff(generatedClassification, originalClassification);
                        result.diffDisplay = diffDisplay;
                    } catch (error) {
                        if (error instanceof Error) {
                            result.error = error.message;
                        } else {
                            result.error = 'Unknown error finding differences';
                        }
                    }
                }
                
                detailedResults.push(result);
            }
        } catch (error) {
            // Handle namespace mismatch or other errors
            console.log(`Skipping incident ${incidentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Still count namespace mismatches in our statistics
            if (error instanceof Error && error.message.includes('Cannot compare classifications with different namespaces')) {
                namespaceMatches--; // Since they don't match
                
                // Store detailed results if verbose
                if (verbose) {
                    const result: DetailedResult = {
                        incidentId,
                        taxonomy,
                        exact: false,
                        error: error.message
                    };
                    detailedResults.push(result);
                }
            }
        }
    }
    
    // Print detailed results if verbose
    if (verbose && detailedResults.length > 0) {
        console.log("\n=== Detailed Results ===");
        
        const divider = "=".repeat(80);
        const subDivider = "-".repeat(80);
        
        detailedResults.forEach((result, index) => {
            // Add prominent divider between incidents
            console.log(`\n${divider}`);
            console.log(`Incident ${result.incidentId} (${result.taxonomy})`);
            console.log(subDivider);
            
            console.log(`  Exact match: ${result.exact ? 'YES' : 'NO'}`);
            
            if (result.error) {
                console.log(`  Error: ${result.error}`);
            } else {
                if (result.attributeMatchPercentage !== undefined) {
                    console.log(`  Attribute match: ${result.attributeMatchPercentage.toFixed(2)}%`);
                }
                
                if (!result.exact) {
                    // Skip the text differences and only show the visual diff
                    if (result.diffDisplay) {
                        console.log("\n  Differences:");
                        console.log(result.diffDisplay);
                    } else {
                        console.log("  Could not generate visual diff");
                    }
                } else {
                    console.log("  No differences found (exact match)");
                }
            }
            
            // Add ending divider for the last incident
            if (index === detailedResults.length - 1) {
                console.log(divider);
            }
        });
    }
    
    // Print statistics at the end
    printStatistics(
        totalComparisons, 
        exactMatches, 
        namespaceMatches, 
        totalAttributes,
        matchedAttributes,
        taxonomyStats
    );
}

// Function to print summary statistics
function printStatistics(
    totalComparisons: number, 
    exactMatches: number, 
    namespaceMatches: number, 
    totalAttributes: number,
    matchedAttributes: number,
    taxonomyStats: Record<string, {
        totalComparisons: number,
        exactMatches: number,
        totalAttributes: number,
        matchedAttributes: number
    }>
) {
    const attributeMatchPercentage = totalAttributes > 0 ? 
        (matchedAttributes / totalAttributes * 100).toFixed(2) : '0.00';
    
    console.log("\n=== Classification Comparison Statistics ===");
    console.log(`Total incidents analyzed: ${totalComparisons}`);
    console.log(`Exact matches: ${exactMatches} (${(exactMatches/totalComparisons*100).toFixed(2)}%)`);
    console.log(`Namespace matches: ${namespaceMatches} (${(namespaceMatches/totalComparisons*100).toFixed(2)}%)`);
    console.log(`\n=== Attribute-Level Match Statistics ===`);
    console.log(`Total attributes across all classifications: ${totalAttributes}`);
    console.log(`Matched attributes: ${matchedAttributes} (${attributeMatchPercentage}%)`);
    
    // Print taxonomy-specific statistics
    console.log(`\n=== Statistics by Taxonomy ===`);
    Object.entries(taxonomyStats).forEach(([taxonomy, stats]) => {
        const taxExactPercentage = stats.totalComparisons > 0 ? 
            (stats.exactMatches / stats.totalComparisons * 100).toFixed(2) : '0.00';
        const taxAttrPercentage = stats.totalAttributes > 0 ? 
            (stats.matchedAttributes / stats.totalAttributes * 100).toFixed(2) : '0.00';
        
        console.log(`\nTaxonomy: ${taxonomy}`);
        console.log(`  Incidents: ${stats.totalComparisons}`);
        console.log(`  Exact matches: ${stats.exactMatches} (${taxExactPercentage}%)`);
        console.log(`  Attributes: ${stats.totalAttributes}`);
        console.log(`  Matched attributes: ${stats.matchedAttributes} (${taxAttrPercentage}%)`);
    });
}

// Run the main function only if this script is executed directly
if (require.main === module) {
    processClassifications();
} 