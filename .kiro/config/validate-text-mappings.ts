/**
 * Validation script for text-mappings.json
 * 
 * This script validates the text-mappings.json configuration file
 * against its JSON Schema to ensure data integrity.
 */

import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

// Load schema and config
const schemaPath = path.join(__dirname, 'text-mappings.schema.json');
const configPath = path.join(__dirname, 'text-mappings.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Create validator
const ajv = new Ajv({ allErrors: true, verbose: true });
const validate = ajv.compile(schema);

// Validate
const valid = validate(config);

if (valid) {
  console.log('✅ text-mappings.json is valid!');
  console.log('\nConfiguration summary:');
  console.log(`  - Typo corrections: ${Object.keys(config.typoCorrections).length}`);
  console.log(`  - Abbreviations: ${Object.keys(config.abbreviations).length}`);
  console.log(`  - Brand aliases: ${Object.keys(config.brandAliases).length}`);
  console.log(`  - Capacity normalizations: ${Object.keys(config.capacityNormalizations).length}`);
  process.exit(0);
} else {
  console.error('❌ text-mappings.json validation failed!');
  console.error('\nErrors:');
  validate.errors?.forEach((error, index) => {
    console.error(`  ${index + 1}. ${error.instancePath || '/'}: ${error.message}`);
    if (error.params) {
      console.error(`     Params: ${JSON.stringify(error.params)}`);
    }
  });
  process.exit(1);
}
