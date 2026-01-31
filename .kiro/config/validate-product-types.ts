/**
 * Validation script for product-types.json
 * 
 * This script validates the product-types.json configuration file
 * against its JSON Schema to ensure data integrity.
 */

import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

// Load schema and config
const schemaPath = path.join(__dirname, 'product-types.schema.json');
const configPath = path.join(__dirname, 'product-types.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Create validator
const ajv = new Ajv({ allErrors: true, verbose: true });
const validate = ajv.compile(schema);

// Validate
const valid = validate(config);

if (valid) {
  console.log('✅ product-types.json is valid!');
  console.log('\nConfiguration summary:');
  console.log(`  - Product types: ${config.types.length}`);
  
  config.types.forEach((type: any) => {
    const weightSum = Object.values(type.specWeights).reduce((sum: number, w: any) => sum + w, 0);
    const weightSumFormatted = weightSum.toFixed(2);
    const weightStatus = Math.abs(weightSum - 1.0) < 0.01 ? '✓' : '⚠️';
    
    console.log(`\n  ${type.name} (${type.id}):`);
    console.log(`    - Keywords: ${type.keywords.join(', ')}`);
    console.log(`    - Spec weights: ${JSON.stringify(type.specWeights)}`);
    console.log(`    - Weight sum: ${weightSumFormatted} ${weightStatus}`);
  });
  
  process.exit(0);
} else {
  console.error('❌ product-types.json validation failed!');
  console.error('\nErrors:');
  validate.errors?.forEach((error, index) => {
    console.error(`  ${index + 1}. ${error.instancePath || '/'}: ${error.message}`);
    if (error.params) {
      console.error(`     Params: ${JSON.stringify(error.params)}`);
    }
  });
  process.exit(1);
}
