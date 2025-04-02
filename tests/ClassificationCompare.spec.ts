import { describe, it, expect } from 'vitest';
import { 
    normalizeJSON, 
    safeJsonParse, 
    deepCompare, 
    compareClassifications, 
    findClassificationDifferences,
    ClassificationComparisonResult
} from '../scripts/compare-classification-stats';

describe('Classification Comparison Functions', () => {
    describe('normalizeJSON', () => {
        it('should properly parse valid JSON', () => {
            const validJson = '{"key": "value", "array": [1, 2, 3]}';
            const result = normalizeJSON(validJson);
            
            expect(result).toEqual({
                key: 'value',
                array: [1, 2, 3]
            });
        });
        
        it('should return null for invalid JSON', () => {
            const invalidJson = '{key: value}';
            const result = normalizeJSON(invalidJson);
            
            expect(result).toBeNull();
        });
    });
    
    describe('safeJsonParse', () => {
        it('should parse valid JSON objects', () => {
            const validJson = '{"key": "value"}';
            const result = safeJsonParse(validJson);
            
            expect(result).toEqual({ key: 'value' });
        });
        
        it('should parse valid JSON arrays', () => {
            const validJson = '[1, 2, 3]';
            const result = safeJsonParse(validJson);
            
            expect(result).toEqual([1, 2, 3]);
        });
        
        it('should handle non-JSON strings', () => {
            const nonJson = 'This is just a string';
            const result = safeJsonParse(nonJson);
            
            expect(result).toBe(nonJson);
        });
        
        it('should return non-string values as-is', () => {
            const nonString = 123;
            const result = safeJsonParse(nonString);
            
            expect(result).toBe(nonString);
        });
        
        it('should handle malformed JSON that looks like JSON', () => {
            const malformedJson = '{"key": value}';
            const result = safeJsonParse(malformedJson);
            
            expect(result).toBe(malformedJson);
        });
        
        it('should handle empty JSON objects and arrays', () => {
            expect(safeJsonParse('{}')).toEqual({});
            expect(safeJsonParse('[]')).toEqual([]);
        });
    });
    
    describe('deepCompare', () => {
        it('should compare primitive values correctly', () => {
            expect(deepCompare(1, 1)).toBe(true);
            expect(deepCompare('string', 'string')).toBe(true);
            expect(deepCompare(true, true)).toBe(true);
            expect(deepCompare(null, null)).toBe(true);
            expect(deepCompare(undefined, undefined)).toBe(true);
            
            expect(deepCompare(1, 2)).toBe(false);
            expect(deepCompare('string1', 'string2')).toBe(false);
            expect(deepCompare(true, false)).toBe(false);
            expect(deepCompare(null, undefined)).toBe(false);
        });
        
        it('should compare arrays correctly', () => {
            expect(deepCompare([1, 2, 3], [1, 2, 3])).toBe(true);
            expect(deepCompare([1, 2, 3], [3, 2, 1])).toBe(false);
            expect(deepCompare([1, 2], [1, 2, 3])).toBe(false);
        });
        
        it('should compare objects correctly', () => {
            expect(deepCompare({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
            expect(deepCompare({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
            expect(deepCompare({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
            expect(deepCompare({ a: 1, b: 2 }, { a: 1 })).toBe(false);
        });
        
        it('should compare nested structures correctly', () => {
            const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
            const obj2 = { a: 1, b: { c: 2, d: [3, 4] } };
            const obj3 = { a: 1, b: { c: 2, d: [3, 5] } };
            
            expect(deepCompare(obj1, obj2)).toBe(true);
            expect(deepCompare(obj1, obj3)).toBe(false);
        });
        
        it('should sort arrays of objects by short_name property', () => {
            const arr1 = [
                { short_name: 'b', value: 2 },
                { short_name: 'a', value: 1 }
            ];
            
            const arr2 = [
                { short_name: 'a', value: 1 },
                { short_name: 'b', value: 2 }
            ];
            
            expect(deepCompare(arr1, arr2)).toBe(true);
        });
    });
    
    describe('compareClassifications', () => {
        it('should handle null inputs', () => {
            const result = compareClassifications(null, { namespace: 'test' });
            expect(result.overall).toBe(false);
        });
        
        it('should correctly compare identical classifications', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' },
                    { short_name: 'attr2', value_json: '{"nested": "value2"}' }
                ]
            };
            
            const classification2 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' },
                    { short_name: 'attr2', value_json: '{"nested": "value2"}' }
                ]
            };
            
            const result = compareClassifications(classification1, classification2);
            
            expect(result.namespace).toBe(true);
            expect(result.attributes).toBe(true);
            expect(result.overall).toBe(true);
            expect(result.attributeMatchCount).toBe(2);
            expect(result.attributeTotalCount).toBe(2);
            expect(result.attributeMatchPercentage).toBe(100);
        });
        
        it('should throw an error when comparing classifications with different namespaces', () => {
            const classification1 = {
                namespace: 'test1',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' }
                ]
            };
            
            const classification2 = {
                namespace: 'test2',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' }
                ]
            };
            
            expect(() => compareClassifications(classification1, classification2))
                .toThrow('Cannot compare classifications with different namespaces: test1 vs test2');
        });
        
        it('should correctly compare classifications with different attributes', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' },
                    { short_name: 'attr2', value_json: '"value2"' }
                ]
            };
            
            const classification2 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' },
                    { short_name: 'attr2', value_json: '"different"' }
                ]
            };
            
            const result = compareClassifications(classification1, classification2);
            
            expect(result.namespace).toBe(true);
            expect(result.attributes).toBe(false);
            expect(result.overall).toBe(false);
            expect(result.attributeMatchCount).toBe(1);
            expect(result.attributeTotalCount).toBe(2);
            expect(result.attributeMatchPercentage).toBe(50);
        });
        
        it('should handle invalid JSON in attribute values', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: 'not valid json' }
                ]
            };
            
            const classification2 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: 'not valid json' }
                ]
            };
            
            const result = compareClassifications(classification1, classification2);
            
            expect(result.attributeMatchCount).toBe(1);
            expect(result.attributeTotalCount).toBe(1);
            expect(result.attributeMatchPercentage).toBe(100);
            expect(result.overall).toBe(true);
        });
        
        it('should handle missing attributes', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' },
                    { short_name: 'attr2', value_json: '"value2"' }
                ]
            };
            
            const classification2 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' },
                    { short_name: 'attr3', value_json: '"value3"' }
                ]
            };
            
            const result = compareClassifications(classification1, classification2);
            
            expect(result.attributeMatchCount).toBe(1);
            expect(result.attributeTotalCount).toBe(3);
            expect(result.attributeMatchPercentage).toBeCloseTo(33.33, 1);
            expect(result.overall).toBe(false);
        });
    });
    
    describe('findClassificationDifferences', () => {
        it('should throw an error when comparing classifications with different namespaces', () => {
            const classification1 = {
                namespace: 'test1',
                attributes: []
            };
            
            const classification2 = {
                namespace: 'test2',
                attributes: []
            };
            
            expect(() => findClassificationDifferences(classification1, classification2))
                .toThrow('Cannot compare classifications with different namespaces: test1 vs test2');
        });
        
        it('should find missing attributes', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' }
                ]
            };
            
            const classification2 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr2', value_json: '"value2"' }
                ]
            };
            
            const differences = findClassificationDifferences(classification1, classification2);
            
            expect(differences).toContain('Generated is missing attribute: attr2 (original has "value2")');
            expect(differences).toContain('Original is missing attribute: attr1 (generated has "value1")');
        });
        
        it('should find different attribute values', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' }
                ]
            };
            
            const classification2 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"different"' }
                ]
            };
            
            const differences = findClassificationDifferences(classification1, classification2);
            
            expect(differences[0]).toContain('Different values for attr1');
            expect(differences[0]).toContain('Generated: "value1"');
            expect(differences[0]).toContain('Original: "different"');
        });
        
        it('should handle one classification missing attributes entirely', () => {
            const classification1 = {
                namespace: 'test',
                attributes: [
                    { short_name: 'attr1', value_json: '"value1"' }
                ]
            };
            
            const classification2 = {
                namespace: 'test'
            };
            
            const differences = findClassificationDifferences(classification1, classification2);
            
            expect(differences).toContain('One classification is missing attributes entirely');
        });
        
        it('should handle null classifications', () => {
            const differences = findClassificationDifferences(null, { namespace: 'test' });
            
            expect(differences).toContain('One of the objects is null');
        });
    });
}); 