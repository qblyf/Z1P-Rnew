/**
 * Tests for runtime validator
 */

import {
  RuntimeValidator,
  ConfigValidationError,
  getValidator,
  validateProductTypes,
  validateTextMappings,
  ProductTypesConfig,
  TextMappingsConfig,
} from './runtime-validator';
import * as fs from 'fs';
import * as path from 'path';

describe('RuntimeValidator', () => {
  let validator: RuntimeValidator;
  let productTypesConfig: ProductTypesConfig;
  let textMappingsConfig: TextMappingsConfig;

  beforeAll(() => {
    validator = new RuntimeValidator();
    
    // Load actual config files for testing
    const productTypesPath = path.join(__dirname, 'product-types.json');
    const textMappingsPath = path.join(__dirname, 'text-mappings.json');
    
    productTypesConfig = JSON.parse(fs.readFileSync(productTypesPath, 'utf-8'));
    textMappingsConfig = JSON.parse(fs.readFileSync(textMappingsPath, 'utf-8'));
  });

  describe('validateProductTypes', () => {
    test('should validate valid product types config', () => {
      expect(() => {
        validator.validateProductTypes(productTypesConfig);
      }).not.toThrow();
    });

    test('should throw error for invalid config', () => {
      const invalidConfig = {
        types: [
          {
            id: 'InvalidID', // Should be lowercase
            name: 'Test',
            keywords: ['test'],
            specWeights: { test: 0.5 },
          },
        ],
      };

      expect(() => {
        validator.validateProductTypes(invalidConfig);
      }).toThrow(ConfigValidationError);
    });

    test('should throw error for invalid weight sum', () => {
      const invalidConfig = {
        types: [
          {
            id: 'test',
            name: 'Test',
            keywords: ['test'],
            specWeights: { test: 0.5 }, // Sum is 0.5, not 1.0
          },
        ],
      };

      expect(() => {
        validator.validateProductTypes(invalidConfig);
      }).toThrow(ConfigValidationError);
    });

    test('should throw error for missing required fields', () => {
      const invalidConfig = {
        types: [
          {
            id: 'test',
            name: 'Test',
            // Missing keywords and specWeights
          },
        ],
      };

      expect(() => {
        validator.validateProductTypes(invalidConfig);
      }).toThrow(ConfigValidationError);
    });
  });

  describe('validateTextMappings', () => {
    test('should validate valid text mappings config', () => {
      expect(() => {
        validator.validateTextMappings(textMappingsConfig);
      }).not.toThrow();
    });

    test('should throw error for invalid config', () => {
      const invalidConfig = {
        typoCorrections: {},
        abbreviations: {},
        brandAliases: {},
        // Missing capacityNormalizations
      };

      expect(() => {
        validator.validateTextMappings(invalidConfig);
      }).toThrow(ConfigValidationError);
    });

    test('should throw error for invalid capacity normalization pattern', () => {
      const invalidConfig = {
        typoCorrections: {},
        abbreviations: {},
        brandAliases: {},
        capacityNormalizations: {
          '8GB+256GB': '8GB+256GB', // Should be normalized to "8+256"
        },
      };

      expect(() => {
        validator.validateTextMappings(invalidConfig);
      }).toThrow(ConfigValidationError);
    });
  });

  describe('getProductType', () => {
    test('should get product type by ID', () => {
      const type = validator.getProductType(productTypesConfig, productTypesConfig.types[0].id);
      
      expect(type).toBeDefined();
      expect(type?.id).toBe(productTypesConfig.types[0].id);
    });

    test('should return null for non-existent ID', () => {
      const type = validator.getProductType(productTypesConfig, 'non-existent');
      expect(type).toBeNull();
    });
  });

  describe('getProductTypeIds', () => {
    test('should return all product type IDs', () => {
      const ids = validator.getProductTypeIds(productTypesConfig);
      
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(productTypesConfig.types.length);
      expect(ids).toContain(productTypesConfig.types[0].id);
    });
  });

  describe('hasProductType', () => {
    test('should return true for existing product type', () => {
      const exists = validator.hasProductType(productTypesConfig, productTypesConfig.types[0].id);
      expect(exists).toBe(true);
    });

    test('should return false for non-existent product type', () => {
      const exists = validator.hasProductType(productTypesConfig, 'non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('getTypoCorrection', () => {
    test('should get typo correction if exists', () => {
      const typos = Object.keys(textMappingsConfig.typoCorrections);
      if (typos.length > 0) {
        const correction = validator.getTypoCorrection(textMappingsConfig, typos[0]);
        expect(correction).toBe(textMappingsConfig.typoCorrections[typos[0]]);
      }
    });

    test('should return null for non-existent typo', () => {
      const correction = validator.getTypoCorrection(textMappingsConfig, 'non-existent-typo');
      expect(correction).toBeNull();
    });
  });

  describe('getAbbreviation', () => {
    test('should get abbreviation expansion if exists', () => {
      const abbrs = Object.keys(textMappingsConfig.abbreviations);
      if (abbrs.length > 0) {
        const expansion = validator.getAbbreviation(textMappingsConfig, abbrs[0]);
        expect(expansion).toBe(textMappingsConfig.abbreviations[abbrs[0]]);
      }
    });

    test('should return null for non-existent abbreviation', () => {
      const expansion = validator.getAbbreviation(textMappingsConfig, 'non-existent-abbr');
      expect(expansion).toBeNull();
    });
  });

  describe('getBrandAliases', () => {
    test('should get brand aliases if exists', () => {
      const brands = Object.keys(textMappingsConfig.brandAliases);
      if (brands.length > 0) {
        const aliases = validator.getBrandAliases(textMappingsConfig, brands[0]);
        expect(aliases).toEqual(textMappingsConfig.brandAliases[brands[0]]);
      }
    });

    test('should return null for non-existent brand', () => {
      const aliases = validator.getBrandAliases(textMappingsConfig, 'non-existent-brand');
      expect(aliases).toBeNull();
    });
  });

  describe('getCapacityNormalization', () => {
    test('should get capacity normalization if exists', () => {
      const capacities = Object.keys(textMappingsConfig.capacityNormalizations);
      if (capacities.length > 0) {
        const normalized = validator.getCapacityNormalization(textMappingsConfig, capacities[0]);
        expect(normalized).toBe(textMappingsConfig.capacityNormalizations[capacities[0]]);
      }
    });

    test('should return null for non-existent capacity', () => {
      const normalized = validator.getCapacityNormalization(textMappingsConfig, 'non-existent');
      expect(normalized).toBeNull();
    });
  });

  describe('findBrandByAlias', () => {
    test('should find brand by alias', () => {
      const brands = Object.keys(textMappingsConfig.brandAliases);
      if (brands.length > 0) {
        const brand = brands[0];
        const alias = textMappingsConfig.brandAliases[brand][0];
        const foundBrand = validator.findBrandByAlias(textMappingsConfig, alias);
        expect(foundBrand).toBe(brand);
      }
    });

    test('should return null for non-existent alias', () => {
      const foundBrand = validator.findBrandByAlias(textMappingsConfig, 'non-existent-alias');
      expect(foundBrand).toBeNull();
    });
  });

  describe('getValidator', () => {
    test('should return singleton instance', () => {
      const validator1 = getValidator();
      const validator2 = getValidator();
      expect(validator1).toBe(validator2);
    });
  });

  describe('convenience functions', () => {
    test('validateProductTypes should work', () => {
      expect(() => {
        validateProductTypes(productTypesConfig);
      }).not.toThrow();
    });

    test('validateTextMappings should work', () => {
      expect(() => {
        validateTextMappings(textMappingsConfig);
      }).not.toThrow();
    });
  });

  describe('ConfigValidationError', () => {
    test('should create error with message and errors', () => {
      const errors = [{ test: 'error' }];
      const error = new ConfigValidationError('Test error', errors);
      
      expect(error.message).toBe('Test error');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('ConfigValidationError');
    });
  });
});
