/**
 * Tests for product-types.json schema validation
 */

import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

describe('product-types.json schema validation', () => {
  let ajv: Ajv;
  let schema: any;
  let config: any;

  beforeAll(() => {
    // Load schema and config
    const schemaPath = path.join(__dirname, 'product-types.schema.json');
    const configPath = path.join(__dirname, 'product-types.json');

    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Create validator
    ajv = new Ajv({ allErrors: true, verbose: true });
  });

  test('schema file exists and is valid JSON', () => {
    expect(schema).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toBe('Product Types Configuration');
  });

  test('config file exists and is valid JSON', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  test('config validates against schema', () => {
    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
    }

    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  test('config has required types property', () => {
    expect(config).toHaveProperty('types');
    expect(Array.isArray(config.types)).toBe(true);
    expect(config.types.length).toBeGreaterThan(0);
  });

  test('each product type has required properties', () => {
    config.types.forEach((type: any) => {
      expect(type).toHaveProperty('id');
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('keywords');
      expect(type).toHaveProperty('specWeights');

      expect(typeof type.id).toBe('string');
      expect(typeof type.name).toBe('string');
      expect(Array.isArray(type.keywords)).toBe(true);
      expect(typeof type.specWeights).toBe('object');
    });
  });

  test('product type IDs follow naming convention', () => {
    const idPattern = /^[a-z][a-z0-9_-]*$/;
    config.types.forEach((type: any) => {
      expect(idPattern.test(type.id)).toBe(true);
    });
  });

  test('product type IDs are unique', () => {
    const ids = config.types.map((type: any) => type.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('keywords arrays are not empty and have unique values', () => {
    config.types.forEach((type: any) => {
      expect(type.keywords.length).toBeGreaterThan(0);
      const uniqueKeywords = new Set(type.keywords);
      expect(uniqueKeywords.size).toBe(type.keywords.length);
    });
  });

  test('specWeights values are between 0 and 1', () => {
    config.types.forEach((type: any) => {
      Object.values(type.specWeights).forEach((weight) => {
        expect(typeof weight).toBe('number');
        expect(weight as number).toBeGreaterThanOrEqual(0);
        expect(weight as number).toBeLessThanOrEqual(1);
      });
    });
  });

  test('specWeights sum to approximately 1.0', () => {
    config.types.forEach((type: any) => {
      const sum = Object.values(type.specWeights).reduce(
        (acc: number, weight) => acc + (weight as number),
        0
      );
      // Allow small floating point errors
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    });
  });

  test('specWeights has at least one property', () => {
    config.types.forEach((type: any) => {
      const weightKeys = Object.keys(type.specWeights);
      expect(weightKeys.length).toBeGreaterThan(0);
    });
  });

  test('config summary', () => {
    console.log('\nConfiguration summary:');
    console.log(`  - Product types: ${config.types.length}`);

    config.types.forEach((type: any) => {
      const weightSum = Object.values(type.specWeights).reduce(
        (sum: number, w: any) => sum + w,
        0
      );
      const weightSumFormatted = weightSum.toFixed(2);
      const weightStatus = Math.abs(weightSum - 1.0) < 0.01 ? '✓' : '⚠️';

      console.log(`\n  ${type.name} (${type.id}):`);
      console.log(`    - Keywords: ${type.keywords.join(', ')}`);
      console.log(`    - Spec weights: ${JSON.stringify(type.specWeights)}`);
      console.log(`    - Weight sum: ${weightSumFormatted} ${weightStatus}`);
    });

    expect(config.types.length).toBeGreaterThanOrEqual(3);
  });
});
