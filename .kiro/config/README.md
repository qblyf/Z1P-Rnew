# Configuration Files and JSON Schemas

This directory contains configuration files for the SKU matching system and their corresponding JSON Schema validation files.

## Configuration Files

### 1. text-mappings.json

Configuration for text preprocessing including:
- **typoCorrections**: Common typos and their corrections (e.g., "雾松蓝" → "雾凇蓝")
- **abbreviations**: Abbreviations and their full forms (e.g., "GT5" → "Watch GT 5")
- **brandAliases**: Brand names and their various aliases
- **capacityNormalizations**: Various capacity formats normalized to standard forms

**Schema**: `text-mappings.schema.json`

### 2. product-types.json

Configuration for product types and their specification matching weights:
- **types**: Array of product type definitions
  - **id**: Unique identifier (lowercase, kebab-case)
  - **name**: Display name
  - **keywords**: Keywords for identifying the product type
  - **specWeights**: Weights for different specifications (must sum to ~1.0)

**Schema**: `product-types.schema.json`

## JSON Schemas

### text-mappings.schema.json

Validates the structure of `text-mappings.json`:
- Ensures all required properties exist
- Validates that typoCorrections and abbreviations have string values
- Validates that brandAliases have array values with unique items
- Validates that capacityNormalizations match the pattern `^[0-9]+(\+[0-9]+)?[GT]?$`

### product-types.schema.json

Validates the structure of `product-types.json`:
- Ensures types array exists and is not empty
- Validates product type IDs follow naming convention
- Validates that keywords arrays are not empty and have unique values
- Validates that specWeights values are between 0 and 1
- Validates that each product type has all required properties

## Validation

### Running Tests

The configuration files are validated using Jest tests:

```bash
# Test text-mappings.json
npm test -- .kiro/config/text-mappings.schema.test.ts

# Test product-types.json
npm test -- .kiro/config/product-types.schema.test.ts

# Test validation tools
npm test -- .kiro/config/config-validator.test.ts
npm test -- .kiro/config/runtime-validator.test.ts

# Run all config tests
npm test -- .kiro/config/
```

### Validation Scripts

Standalone validation scripts are available:

```bash
# Validate text-mappings.json
npx ts-node .kiro/config/validate-text-mappings.ts

# Validate product-types.json
npx ts-node .kiro/config/validate-product-types.ts
```

### Unified Validation Tool (Recommended)

A comprehensive validation tool is available that can validate all configuration files:

```bash
# Validate all configuration files
npx ts-node .kiro/config/config-validator.ts all

# Validate only product-types.json
npx ts-node .kiro/config/config-validator.ts product-types

# Validate only text-mappings.json
npx ts-node .kiro/config/config-validator.ts text-mappings
```

### Programmatic Validation

For runtime validation in your application code:

```typescript
import { ConfigValidator } from './.kiro/config/config-validator';

// Create validator instance
const validator = new ConfigValidator();

// Validate product types
const result = validator.validateProductTypes();
if (!result.valid) {
  console.error('Validation failed:', result.errors);
}

// Validate text mappings
const textResult = validator.validateTextMappings();

// Validate all configs
const allResults = validator.validateAll();
```

### Runtime Validation with Type Safety

For type-safe runtime validation:

```typescript
import {
  RuntimeValidator,
  validateProductTypes,
  validateTextMappings,
  ProductTypesConfig,
  TextMappingsConfig,
} from './.kiro/config/runtime-validator';

// Load and validate configuration
const config = loadConfig(); // Your config loading logic

// Validate with type assertion
validateProductTypes(config); // Throws if invalid
// Now TypeScript knows config is ProductTypesConfig

// Or use the validator class
const validator = new RuntimeValidator();
if (validator.validateProductTypes(config)) {
  // Config is valid, use it safely
  const type = validator.getProductType(config, 'phone');
}
```

## Adding New Configuration

### Adding to text-mappings.json

1. Add entries to the appropriate section:
   - Typo corrections: `"incorrect": "correct"`
   - Abbreviations: `"abbr": "full form"`
   - Brand aliases: `"brand": ["alias1", "alias2"]`
   - Capacity normalizations: `"8GB+256GB": "8+256"`

2. Run validation to ensure correctness:
   ```bash
   npm test -- .kiro/config/text-mappings.schema.test.ts
   ```

### Adding a New Product Type

1. Add a new entry to the `types` array in `product-types.json`:
   ```json
   {
     "id": "new-product",
     "name": "New Product",
     "keywords": ["keyword1", "keyword2"],
     "specWeights": {
       "capacity": 0.4,
       "color": 0.3,
       "version": 0.3
     }
   }
   ```

2. Ensure:
   - ID is unique and follows kebab-case convention
   - Keywords array is not empty
   - Spec weights sum to approximately 1.0

3. Run validation:
   ```bash
   npm test -- .kiro/config/product-types.schema.test.ts
   ```

## Schema Validation Rules

### text-mappings.json Rules

1. **Required Properties**: typoCorrections, abbreviations, brandAliases, capacityNormalizations
2. **typoCorrections**: Object with string keys and string values
3. **abbreviations**: Object with string keys and string values
4. **brandAliases**: Object with string keys and array values (min 1 item, unique)
5. **capacityNormalizations**: Object with string keys and values matching pattern

### product-types.json Rules

1. **Required Properties**: types (array, min 1 item)
2. **Product Type ID**: Must match pattern `^[a-z][a-z0-9_-]*$`
3. **Product Type Name**: Non-empty string
4. **Keywords**: Array with min 1 item, all unique
5. **Spec Weights**: 
   - All values between 0 and 1
   - Sum should be approximately 1.0 (within 0.01 tolerance)
   - At least one weight property required

## Benefits of JSON Schema Validation

1. **Data Integrity**: Ensures configuration files have correct structure
2. **Early Error Detection**: Catches configuration errors before runtime
3. **Documentation**: Schema serves as documentation for configuration format
4. **IDE Support**: Many IDEs provide autocomplete and validation for JSON Schema
5. **Automated Testing**: Configuration validation is part of the test suite
6. **Type Safety**: Runtime validator provides TypeScript type guards
7. **Programmatic Access**: Validation can be used both as CLI tool and in code

## Validation Tools

### 1. config-validator.ts

A comprehensive validation tool that can be used both as a CLI tool and programmatically.

**Features:**
- Validates all configuration files against their schemas
- Provides detailed error messages with paths and parameters
- Generates summaries of configuration contents
- Can validate individual files or all files at once
- Formats errors in a human-readable way

**CLI Usage:**
```bash
npx ts-node .kiro/config/config-validator.ts [command]
```

**Commands:**
- `all` - Validate all configuration files (default)
- `product-types` - Validate only product-types.json
- `text-mappings` - Validate only text-mappings.json

**Programmatic Usage:**
```typescript
import { ConfigValidator } from './.kiro/config/config-validator';

const validator = new ConfigValidator();
const result = validator.validateProductTypes();

if (result.valid) {
  console.log('Valid!', result.summary);
} else {
  console.error('Invalid!', result.errors);
}
```

### 2. runtime-validator.ts

A runtime validation module designed for use within the application.

**Features:**
- Type-safe validation with TypeScript type guards
- Throws descriptive errors for invalid configurations
- Provides helper methods to access configuration data
- Validates weight sums for product types
- Singleton pattern for efficient reuse
- Includes TypeScript interfaces for all config types

**Usage:**
```typescript
import {
  RuntimeValidator,
  validateProductTypes,
  ProductTypesConfig,
} from './.kiro/config/runtime-validator';

// Method 1: Using convenience function
const config = loadConfig();
validateProductTypes(config); // Throws if invalid
// TypeScript now knows config is ProductTypesConfig

// Method 2: Using validator class
const validator = new RuntimeValidator();
try {
  validator.validateProductTypes(config);
  // Use validated config
  const phoneType = validator.getProductType(config, 'phone');
} catch (error) {
  console.error('Validation failed:', error);
}
```

### 3. Legacy Validation Scripts

The original standalone validation scripts are still available:

- `validate-product-types.ts` - Validates product-types.json
- `validate-text-mappings.ts` - Validates text-mappings.json

These scripts are simpler and focused on single-file validation. They're useful for quick checks but the unified `config-validator.ts` is recommended for most use cases.

## Troubleshooting

### Validation Errors

If validation fails, check:
1. JSON syntax is correct (no trailing commas, proper quotes)
2. All required properties are present
3. Values match expected types and patterns
4. For product types, spec weights sum to ~1.0

### Common Issues

1. **Capacity normalization pattern mismatch**: Ensure values match `^[0-9]+(\+[0-9]+)?[GT]?$`
   - Valid: "8+256", "512", "16+1T"
   - Invalid: "8GB+256GB" (should be normalized to "8+256")

2. **Spec weights don't sum to 1.0**: Adjust weights so they sum to approximately 1.0
   - Example: `{"capacity": 0.4, "color": 0.3, "version": 0.3}` = 1.0 ✓

3. **Duplicate values in arrays**: Ensure all array values are unique
   - Brand aliases should not have duplicates
   - Keywords should not have duplicates

## Dependencies

- **ajv**: JSON Schema validator (installed as dev dependency)
- **jest**: Test framework
- **ts-jest**: TypeScript support for Jest
