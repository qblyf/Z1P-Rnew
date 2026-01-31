/**
 * Tests for text-mappings.json schema validation
 */

import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

describe('text-mappings.json schema validation', () => {
  let ajv: Ajv;
  let schema: any;
  let config: any;

  beforeAll(() => {
    // Load schema and config
    const schemaPath = path.join(__dirname, 'text-mappings.schema.json');
    const configPath = path.join(__dirname, 'text-mappings.json');

    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Create validator
    ajv = new Ajv({ allErrors: true, verbose: true });
  });

  test('schema file exists and is valid JSON', () => {
    expect(schema).toBeDefined();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.title).toBe('Text Mappings Configuration');
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

  test('config has all required properties', () => {
    expect(config).toHaveProperty('typoCorrections');
    expect(config).toHaveProperty('abbreviations');
    expect(config).toHaveProperty('brandAliases');
    expect(config).toHaveProperty('capacityNormalizations');
  });

  test('typoCorrections is an object with string values', () => {
    expect(typeof config.typoCorrections).toBe('object');
    Object.values(config.typoCorrections).forEach((value) => {
      expect(typeof value).toBe('string');
    });
  });

  test('abbreviations is an object with string values', () => {
    expect(typeof config.abbreviations).toBe('object');
    Object.values(config.abbreviations).forEach((value) => {
      expect(typeof value).toBe('string');
    });
  });

  test('brandAliases is an object with array values', () => {
    expect(typeof config.brandAliases).toBe('object');
    Object.values(config.brandAliases).forEach((value) => {
      expect(Array.isArray(value)).toBe(true);
      expect((value as any[]).length).toBeGreaterThan(0);
      (value as any[]).forEach((alias) => {
        expect(typeof alias).toBe('string');
      });
    });
  });

  test('capacityNormalizations values match expected pattern', () => {
    expect(typeof config.capacityNormalizations).toBe('object');
    const pattern = /^[0-9]+(\+[0-9]+)?[GT]?$/;
    Object.values(config.capacityNormalizations).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(pattern.test(value as string)).toBe(true);
    });
  });

  test('brandAliases arrays have unique values', () => {
    Object.entries(config.brandAliases).forEach(([brand, aliases]) => {
      const uniqueAliases = new Set(aliases as string[]);
      expect(uniqueAliases.size).toBe((aliases as string[]).length);
    });
  });

  test('config summary', () => {
    const summary = {
      typoCorrections: Object.keys(config.typoCorrections).length,
      abbreviations: Object.keys(config.abbreviations).length,
      brandAliases: Object.keys(config.brandAliases).length,
      capacityNormalizations: Object.keys(config.capacityNormalizations).length,
    };

    console.log('\nConfiguration summary:');
    console.log(`  - Typo corrections: ${summary.typoCorrections}`);
    console.log(`  - Abbreviations: ${summary.abbreviations}`);
    console.log(`  - Brand aliases: ${summary.brandAliases}`);
    console.log(`  - Capacity normalizations: ${summary.capacityNormalizations}`);

    expect(summary.typoCorrections).toBeGreaterThan(0);
    expect(summary.abbreviations).toBeGreaterThan(0);
    expect(summary.brandAliases).toBeGreaterThan(0);
    expect(summary.capacityNormalizations).toBeGreaterThan(0);
  });
});
