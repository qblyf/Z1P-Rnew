/**
 * Runtime Configuration Validator
 * 
 * This module provides runtime validation for configuration files.
 * It's designed to be used within the application to validate
 * configurations before they are used.
 */

import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import productTypesSchema from './product-types.schema.json' assert { type: 'json' };
import textMappingsSchema from './text-mappings.schema.json' assert { type: 'json' };

/**
 * Product type configuration interface
 */
export interface ProductTypeConfig {
  id: string;
  name: string;
  keywords: string[];
  specWeights: {
    [key: string]: number;
  };
}

/**
 * Product types configuration interface
 */
export interface ProductTypesConfig {
  note?: string;
  types: ProductTypeConfig[];
}

/**
 * Text mappings configuration interface
 */
export interface TextMappingsConfig {
  note?: string;
  typoCorrections: {
    [key: string]: string;
  };
  abbreviations: {
    [key: string]: string;
  };
  brandAliases: {
    [key: string]: string[];
  };
  capacityNormalizations: {
    [key: string]: string;
  };
}

/**
 * Validation error class
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public errors: any[]
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Runtime validator class
 */
export class RuntimeValidator {
  private ajv: Ajv;
  private productTypesValidator: ValidateFunction;
  private textMappingsValidator: ValidateFunction;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    
    // Compile validators
    this.productTypesValidator = this.ajv.compile(productTypesSchema);
    this.textMappingsValidator = this.ajv.compile(textMappingsSchema);
  }

  /**
   * Validate product types configuration
   */
  validateProductTypes(config: unknown): config is ProductTypesConfig {
    const valid = this.productTypesValidator(config);
    
    if (!valid) {
      throw new ConfigValidationError(
        'Product types configuration validation failed',
        this.productTypesValidator.errors || []
      );
    }

    // Additional validation: check weight sums
    const typedConfig = config as ProductTypesConfig;
    for (const type of typedConfig.types) {
      const weightSum = Object.values(type.specWeights).reduce((sum, w) => sum + w, 0);
      if (Math.abs(weightSum - 1.0) >= 0.01) {
        throw new ConfigValidationError(
          `Product type "${type.id}" has invalid weight sum: ${weightSum.toFixed(2)} (expected ~1.0)`,
          []
        );
      }
    }

    return true;
  }

  /**
   * Validate text mappings configuration
   */
  validateTextMappings(config: unknown): config is TextMappingsConfig {
    const valid = this.textMappingsValidator(config);
    
    if (!valid) {
      throw new ConfigValidationError(
        'Text mappings configuration validation failed',
        this.textMappingsValidator.errors || []
      );
    }

    return true;
  }

  /**
   * Get a validated product type by ID
   */
  getProductType(config: ProductTypesConfig, id: string): ProductTypeConfig | null {
    return config.types.find(type => type.id === id) || null;
  }

  /**
   * Get all product type IDs
   */
  getProductTypeIds(config: ProductTypesConfig): string[] {
    return config.types.map(type => type.id);
  }

  /**
   * Check if a product type exists
   */
  hasProductType(config: ProductTypesConfig, id: string): boolean {
    return config.types.some(type => type.id === id);
  }

  /**
   * Get typo correction
   */
  getTypoCorrection(config: TextMappingsConfig, typo: string): string | null {
    return config.typoCorrections[typo] || null;
  }

  /**
   * Get abbreviation expansion
   */
  getAbbreviation(config: TextMappingsConfig, abbr: string): string | null {
    return config.abbreviations[abbr] || null;
  }

  /**
   * Get brand aliases
   */
  getBrandAliases(config: TextMappingsConfig, brand: string): string[] | null {
    return config.brandAliases[brand] || null;
  }

  /**
   * Get capacity normalization
   */
  getCapacityNormalization(config: TextMappingsConfig, capacity: string): string | null {
    return config.capacityNormalizations[capacity] || null;
  }

  /**
   * Find brand by alias
   */
  findBrandByAlias(config: TextMappingsConfig, alias: string): string | null {
    for (const [brand, aliases] of Object.entries(config.brandAliases)) {
      if (aliases.includes(alias)) {
        return brand;
      }
    }
    return null;
  }
}

/**
 * Singleton instance
 */
let validatorInstance: RuntimeValidator | null = null;

/**
 * Get the singleton validator instance
 */
export function getValidator(): RuntimeValidator {
  if (!validatorInstance) {
    validatorInstance = new RuntimeValidator();
  }
  return validatorInstance;
}

/**
 * Convenience function to validate product types
 */
export function validateProductTypes(config: unknown): asserts config is ProductTypesConfig {
  getValidator().validateProductTypes(config);
}

/**
 * Convenience function to validate text mappings
 */
export function validateTextMappings(config: unknown): asserts config is TextMappingsConfig {
  getValidator().validateTextMappings(config);
}
