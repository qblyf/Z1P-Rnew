/**
 * Configuration Validator Module
 * 
 * This module provides validation utilities for configuration files.
 * It can be used both programmatically and as a CLI tool.
 * 
 * Features:
 * - Validates configuration files against JSON schemas
 * - Provides detailed error messages
 * - Can be imported and used in code
 * - Can be run as a standalone CLI tool
 */

import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
  summary?: {
    [key: string]: any;
  };
}

/**
 * Configuration validator class
 */
export class ConfigValidator {
  private configDir: string;

  constructor(configDir?: string) {
    // Default to current working directory if not specified
    this.configDir = configDir || process.cwd() + '/.kiro/config';
  }

  /**
   * Load a JSON file
   */
  private loadJSON(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load JSON file ${filePath}: ${error}`);
    }
  }

  /**
   * Validate a configuration file against its schema
   */
  validate(configFileName: string, schemaFileName: string): ValidationResult {
    const configPath = path.join(this.configDir, configFileName);
    const schemaPath = path.join(this.configDir, schemaFileName);

    // Load schema and config
    const schema = this.loadJSON(schemaPath);
    const config = this.loadJSON(configPath);

    // Create a new AJV instance for each validation to avoid schema ID conflicts
    const ajv = new Ajv({ allErrors: true, verbose: true });
    const validate = ajv.compile(schema);
    const valid = validate(config);

    return {
      valid,
      errors: validate.errors || null,
    };
  }

  /**
   * Validate product-types.json
   */
  validateProductTypes(): ValidationResult {
    const result = this.validate('product-types.json', 'product-types.schema.json');

    if (result.valid) {
      const config = this.loadJSON(path.join(this.configDir, 'product-types.json'));
      
      // Generate summary
      const summary: any = {
        totalTypes: config.types.length,
        types: [],
      };

      config.types.forEach((type: any) => {
        const weightSum = Object.values(type.specWeights).reduce(
          (sum: number, w: any) => sum + w,
          0
        );
        
        summary.types.push({
          id: type.id,
          name: type.name,
          keywords: type.keywords,
          specWeights: type.specWeights,
          weightSum: parseFloat(weightSum.toFixed(2)),
          weightValid: Math.abs(weightSum - 1.0) < 0.01,
        });
      });

      result.summary = summary;
    }

    return result;
  }

  /**
   * Validate text-mappings.json
   */
  validateTextMappings(): ValidationResult {
    const result = this.validate('text-mappings.json', 'text-mappings.schema.json');

    if (result.valid) {
      const config = this.loadJSON(path.join(this.configDir, 'text-mappings.json'));
      
      // Generate summary
      result.summary = {
        typoCorrections: Object.keys(config.typoCorrections).length,
        abbreviations: Object.keys(config.abbreviations).length,
        brandAliases: Object.keys(config.brandAliases).length,
        capacityNormalizations: Object.keys(config.capacityNormalizations).length,
      };
    }

    return result;
  }

  /**
   * Validate all configuration files
   */
  validateAll(): { [key: string]: ValidationResult } {
    return {
      productTypes: this.validateProductTypes(),
      textMappings: this.validateTextMappings(),
    };
  }

  /**
   * Format validation errors for display
   */
  formatErrors(errors: ErrorObject[]): string {
    return errors
      .map((error, index) => {
        const path = error.instancePath || '/';
        const message = error.message || 'Unknown error';
        const params = error.params ? JSON.stringify(error.params) : '';
        
        return `  ${index + 1}. ${path}: ${message}${params ? `\n     Params: ${params}` : ''}`;
      })
      .join('\n');
  }

  /**
   * Print validation result to console
   */
  printResult(name: string, result: ValidationResult): void {
    if (result.valid) {
      console.log(`✅ ${name} is valid!`);
      
      if (result.summary) {
        console.log('\nSummary:');
        console.log(JSON.stringify(result.summary, null, 2));
      }
    } else {
      console.error(`❌ ${name} validation failed!`);
      
      if (result.errors) {
        console.error('\nErrors:');
        console.error(this.formatErrors(result.errors));
      }
    }
  }
}

/**
 * CLI entry point
 */
export function runCLI(): void {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  // For CLI usage, use the directory where the script is located
  const scriptDir = path.dirname(process.argv[1]);
  const validator = new ConfigValidator(scriptDir);

  switch (command) {
    case 'product-types':
      {
        const result = validator.validateProductTypes();
        validator.printResult('product-types.json', result);
        process.exit(result.valid ? 0 : 1);
      }
      break;

    case 'text-mappings':
      {
        const result = validator.validateTextMappings();
        validator.printResult('text-mappings.json', result);
        process.exit(result.valid ? 0 : 1);
      }
      break;

    case 'all':
      {
        console.log('Validating all configuration files...\n');
        const results = validator.validateAll();
        
        let allValid = true;
        
        validator.printResult('product-types.json', results.productTypes);
        console.log();
        validator.printResult('text-mappings.json', results.textMappings);
        
        allValid = results.productTypes.valid && results.textMappings.valid;
        
        console.log('\n' + '='.repeat(50));
        if (allValid) {
          console.log('✅ All configuration files are valid!');
        } else {
          console.log('❌ Some configuration files have errors!');
        }
        
        process.exit(allValid ? 0 : 1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: ts-node config-validator.ts [product-types|text-mappings|all]');
      process.exit(1);
  }
}

// Run CLI if executed directly
// Check if this module is the main module (ES module compatible)
// This check works for both CommonJS and ES modules
if (process.argv[1] && process.argv[1].endsWith('config-validator.ts')) {
  runCLI();
}
