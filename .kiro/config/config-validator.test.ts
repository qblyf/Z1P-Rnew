/**
 * Tests for configuration validator
 */

import { ConfigValidator, ValidationResult } from './config-validator';
import * as fs from 'fs';
import * as path from 'path';

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeAll(() => {
    validator = new ConfigValidator(__dirname);
  });

  describe('validateProductTypes', () => {
    test('should validate product-types.json successfully', () => {
      const result = validator.validateProductTypes();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
      expect(result.summary).toBeDefined();
      expect(result.summary?.totalTypes).toBeGreaterThan(0);
    });

    test('should include summary with type information', () => {
      const result = validator.validateProductTypes();
      
      expect(result.summary).toBeDefined();
      expect(result.summary?.types).toBeDefined();
      expect(Array.isArray(result.summary?.types)).toBe(true);
      
      if (result.summary?.types.length > 0) {
        const firstType = result.summary.types[0];
        expect(firstType).toHaveProperty('id');
        expect(firstType).toHaveProperty('name');
        expect(firstType).toHaveProperty('keywords');
        expect(firstType).toHaveProperty('specWeights');
        expect(firstType).toHaveProperty('weightSum');
        expect(firstType).toHaveProperty('weightValid');
      }
    });

    test('should validate weight sums', () => {
      const result = validator.validateProductTypes();
      
      if (result.summary?.types) {
        result.summary.types.forEach((type: any) => {
          expect(type.weightValid).toBe(true);
          expect(Math.abs(type.weightSum - 1.0)).toBeLessThan(0.01);
        });
      }
    });
  });

  describe('validateTextMappings', () => {
    test('should validate text-mappings.json successfully', () => {
      const result = validator.validateTextMappings();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
      expect(result.summary).toBeDefined();
    });

    test('should include summary with mapping counts', () => {
      const result = validator.validateTextMappings();
      
      expect(result.summary).toBeDefined();
      expect(result.summary?.typoCorrections).toBeGreaterThanOrEqual(0);
      expect(result.summary?.abbreviations).toBeGreaterThanOrEqual(0);
      expect(result.summary?.brandAliases).toBeGreaterThanOrEqual(0);
      expect(result.summary?.capacityNormalizations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateAll', () => {
    test('should validate all configuration files', () => {
      const results = validator.validateAll();
      
      expect(results).toHaveProperty('productTypes');
      expect(results).toHaveProperty('textMappings');
      expect(results.productTypes.valid).toBe(true);
      expect(results.textMappings.valid).toBe(true);
    });
  });

  describe('formatErrors', () => {
    test('should format errors correctly', () => {
      const errors = [
        {
          instancePath: '/types/0/id',
          message: 'must match pattern',
          params: { pattern: '^[a-z][a-z0-9_-]*$' },
          keyword: 'pattern',
          schemaPath: '#/properties/types/items/properties/id/pattern',
        },
      ];
      
      const formatted = validator.formatErrors(errors as any);
      
      expect(formatted).toContain('/types/0/id');
      expect(formatted).toContain('must match pattern');
    });

    test('should handle empty errors array', () => {
      const formatted = validator.formatErrors([]);
      expect(formatted).toBe('');
    });
  });

  describe('validate', () => {
    test('should validate a config file against its schema', () => {
      const result = validator.validate('product-types.json', 'product-types.schema.json');
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result.valid).toBe(true);
    });

    test('should throw error for non-existent file', () => {
      expect(() => {
        validator.validate('non-existent.json', 'product-types.schema.json');
      }).toThrow();
    });
  });

  describe('printResult', () => {
    test('should print valid result without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result: ValidationResult = {
        valid: true,
        errors: null,
        summary: { test: 'data' },
      };
      
      validator.printResult('test.json', result);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should print invalid result with errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            instancePath: '/test',
            message: 'test error',
            params: {},
            keyword: 'test',
            schemaPath: '#/test',
          },
        ] as any,
      };
      
      validator.printResult('test.json', result);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
