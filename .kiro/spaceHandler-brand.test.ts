/**
 * Property-Based Test: Brand-Model Separation
 * 属性测试：品牌型号分隔
 * 
 * Feature: smart-match-optimization
 * Property 3: 品牌型号分隔
 * 
 * Validates: Requirements 1.5
 * 
 * Property: For any brand + model code combination, the space handler should
 * add a space between the brand and the model code.
 */

import * as fc from 'fast-check';
import { spaceHandler } from './spaceHandler';

describe('Property 3: 品牌型号分隔', () => {
  // Brands that should have space after them
  const brands = ['IQOO', 'OPPO', 'VIVO', 'Hi'];
  
  // Model prefixes (letters that start model codes)
  const modelPrefixes = ['Z', 'A', 'S', 'X', 'Y', 'K', 'T', 'N', 'P', 'V'];

  /**
   * Property Test: Space should be added between brand and model code
   * 
   * For any brand + model code combination without space,
   * normalization should add a space between them
   */
  it('should add space between brand and model code', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelPrefix, modelNumber) => {
          // Create brand + model without space
          const modelName = `${brand}${modelPrefix}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
          
          // Should contain the model code after the space
          expect(normalized).toContain(`${modelPrefix}${modelNumber}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand-model separation is case-insensitive
   * 
   * Brands should be recognized regardless of case (IQOO, iqoo, Iqoo)
   */
  it('should recognize brands regardless of case', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom('lower', 'upper', 'mixed'),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, caseType, modelPrefix, modelNumber) => {
          // Transform brand case
          let transformedBrand = brand;
          if (caseType === 'lower') {
            transformedBrand = brand.toLowerCase();
          } else if (caseType === 'upper') {
            transformedBrand = brand.toUpperCase();
          } else {
            // Mixed case: capitalize first letter, lowercase rest
            transformedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
          }
          
          // Create model name without space
          const modelName = `${transformedBrand}${modelPrefix}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand (case-insensitive check)
          expect(normalized).toMatch(new RegExp(`${transformedBrand}\\s`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand with numeric model code
   * 
   * Brands followed by numbers should also have space added
   */
  it('should add space between brand and numeric model code', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelNumber) => {
          // Create brand + number without space
          const modelName = `${brand}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Existing space between brand and model is preserved
   * 
   * If there's already a space between brand and model, it should be preserved
   */
  it('should preserve existing space between brand and model', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelPrefix, modelNumber) => {
          // Create brand + model WITH space
          const modelName = `${brand} ${modelPrefix}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand
          expect(normalized).toContain(`${brand} `);
          
          // Should be idempotent
          const normalizedAgain = spaceHandler.normalizeSpaces(normalized);
          expect(normalizedAgain).toBe(normalized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand-model separation doesn't create double spaces
   * 
   * After adding space between brand and model, there should be no double spaces
   */
  it('should not create double spaces when separating brand and model', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        fc.integer({ min: 0, max: 3 }), // Number of existing spaces
        (brand, modelPrefix, modelNumber, numSpaces) => {
          // Create model name with variable spacing
          const modelName = `${brand}${' '.repeat(numSpaces)}${modelPrefix}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should not contain double spaces
          expect(normalized).not.toContain('  ');
          
          // Should have exactly one space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s(?!\\s)`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: All defined brands are recognized
   * 
   * Every brand in the SpaceHandler's brand list should be properly recognized
   */
  it('should recognize all defined brands', () => {
    brands.forEach(brand => {
      // Test with uppercase
      const upperModelName = `${brand.toUpperCase()}Z10`;
      const upperNormalized = spaceHandler.normalizeSpaces(upperModelName);
      expect(upperNormalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
      
      // Test with lowercase
      const lowerModelName = `${brand.toLowerCase()}z10`;
      const lowerNormalized = spaceHandler.normalizeSpaces(lowerModelName);
      expect(lowerNormalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
    });
  });

  /**
   * Property Test: Brand separation with complex model names
   * 
   * Brands should be separated even in complex model names with suffixes
   */
  it('should separate brand in complex model names', () => {
    const suffixes = ['Pro', 'Max', 'Mini', 'Plus', 'Ultra'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        (brand, modelPrefix, modelNumber, suffix) => {
          // Create complex model name: brand + model + suffix (no spaces)
          const modelName = `${brand}${modelPrefix}${modelNumber}${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
          
          // Should also have space before suffix
          expect(normalized).toMatch(new RegExp(`\\s${suffix}`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand at start of string
   * 
   * Brands at the start of the string should be properly recognized
   */
  it('should recognize brands at start of string', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelPrefix, modelNumber) => {
          // Create model name starting with brand
          const modelName = `${brand}${modelPrefix}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should start with the brand followed by space
          expect(normalized).toMatch(new RegExp(`^${brand}\\s`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand separation is idempotent
   * 
   * Applying brand-model separation multiple times should produce the same result
   */
  it('should be idempotent for brand-model separation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelPrefix, modelNumber) => {
          // Create model name without space
          const modelName = `${brand}${modelPrefix}${modelNumber}`;
          
          // First normalization
          const normalized1 = spaceHandler.normalizeSpaces(modelName);
          
          // Second normalization
          const normalized2 = spaceHandler.normalizeSpaces(normalized1);
          
          // Third normalization
          const normalized3 = spaceHandler.normalizeSpaces(normalized2);
          
          // Should be idempotent
          expect(normalized2).toBe(normalized1);
          expect(normalized3).toBe(normalized1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand separation with lowercase model prefix
   * 
   * Brands should be separated even when model prefix is lowercase
   */
  it('should separate brand with lowercase model prefix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelPrefix, modelNumber) => {
          // Create model name with lowercase model prefix
          const lowerModelPrefix = modelPrefix.toLowerCase();
          const modelName = `${brand.toLowerCase()}${lowerModelPrefix}${modelNumber}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Brand separation with additional attributes
   * 
   * Brands should be separated even when followed by color, capacity, etc.
   */
  it('should separate brand with additional attributes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom('8GB+128GB', '12GB+256GB', '黑色', '白色'),
        (brand, modelPrefix, modelNumber, attribute) => {
          // Create complex model name
          const modelName = `${brand}${modelPrefix}${modelNumber}${attribute}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Special case - MateBook series
   * 
   * MateBook should also have proper spacing with model codes
   */
  it('should handle MateBook series brand-model separation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('MateBook', 'matebook', 'MATEBOOK'),
        fc.constantFrom('D', 'X', 'E'),
        fc.integer({ min: 13, max: 16 }),
        (matebook, letter, number) => {
          // Create MateBook model without spaces: MateBookD16
          const modelName = `${matebook}${letter}${number}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have spaces: "MateBook D 16" or similar
          expect(normalized).toMatch(/matebook\s/i);
          expect(normalized).toContain(` ${letter} `);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test: Brand separation preserves model code integrity
   * 
   * After brand separation, the model code should remain intact
   */
  it('should preserve model code integrity after brand separation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        (brand, modelPrefix, modelNumber) => {
          const modelCode = `${modelPrefix}${modelNumber}`;
          const modelName = `${brand}${modelCode}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // The model code should still be present (possibly with spaces added for suffixes)
          // But the core model code should be intact
          expect(normalized).toContain(modelCode);
        }
      ),
      { numRuns: 100 }
    );
  });
});
