/**
 * Property-Based Test: Model Suffix Recognition Completeness
 * 属性测试：型号后缀识别完整性
 * 
 * Feature: smart-match-optimization
 * Property 2: 型号后缀识别完整性
 * 
 * Validates: Requirements 1.4
 * 
 * Property: For any model name containing common suffixes (Pro, Max, Mini, Plus, 
 * Ultra, SE, Air, Turbo), the space handler should add a space before the suffix.
 */

import * as fc from 'fast-check';
import { spaceHandler } from './spaceHandler';

describe('Property 2: 型号后缀识别完整性', () => {
  // Common model suffixes that should be recognized
  const suffixes = [
    'Pro',
    'Max',
    'Mini',
    'Plus',
    'Ultra',
    'SE',
    'Air',
    'Turbo',
  ];

  // Chinese version suffixes
  const chineseSuffixes = [
    '竞速版',
    '至尊版',
    '活力版',
    '标准版',
    '青春版',
    '极速版',
  ];

  /**
   * Property Test: Suffixes should have space before them
   * 
   * For any model name with a suffix directly attached (no space),
   * normalization should add a space before the suffix
   */
  it('should add space before English suffixes', () => {
    fc.assert(
      fc.property(
        // Generate model base (brand + model number)
        fc.constantFrom('IQOO', 'OPPO', 'VIVO', 'Xiaomi', 'Huawei', 'Honor'),
        fc.constantFrom('Z', 'A', 'S', 'X', 'Nova', 'Mate', 'P'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        (brand, modelPrefix, modelNumber, suffix) => {
          // Create model name without space before suffix
          const modelName = `${brand}${modelPrefix}${modelNumber}${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // The normalized string should contain the suffix with a space before it
          // We check that the suffix appears as a separate word (surrounded by spaces or at end)
          const suffixPattern = new RegExp(`\\s${suffix}(?:\\s|$|\\+)`, 'i');
          expect(normalized).toMatch(suffixPattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Chinese suffixes should have space before them
   * 
   * For any model name with a Chinese suffix directly attached,
   * normalization should add a space before the suffix
   */
  it('should add space before Chinese suffixes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Z', 'A', 'S', 'X', 'Nova', 'Mate', 'P'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...chineseSuffixes),
        (modelPrefix, modelNumber, suffix) => {
          // Create model name without space before suffix
          const modelName = `${modelPrefix}${modelNumber}${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // The normalized string should contain the suffix with a space before it
          expect(normalized).toContain(` ${suffix}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Multiple suffixes should all have spaces
   * 
   * For model names with multiple suffix-like patterns,
   * all should be properly spaced
   */
  it('should add spaces before all suffix occurrences', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Z', 'A', 'S', 'X'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        fc.option(fc.constantFrom('+'), { nil: null }),
        (modelPrefix, modelNumber, suffix, plusSign) => {
          // Create model name: e.g., "Z10Pro+" or "A5Max"
          const modelName = `${modelPrefix}${modelNumber}${suffix}${plusSign || ''}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // The suffix should be separated by space
          // Pattern: space before suffix, suffix, optional +, then space or end
          const suffixPattern = new RegExp(`\\s${suffix}`, 'i');
          expect(normalized).toMatch(suffixPattern);
          
          // If there's a plus sign, it should stay attached to the suffix
          if (plusSign) {
            expect(normalized).toContain(`${suffix}+`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Suffix recognition is case-insensitive
   * 
   * Suffixes should be recognized regardless of case (pro, Pro, PRO)
   */
  it('should recognize suffixes regardless of case', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Z', 'A', 'S', 'X'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        fc.constantFrom('lower', 'upper', 'mixed'),
        (modelPrefix, modelNumber, suffix, caseType) => {
          // Transform suffix case
          let transformedSuffix = suffix;
          if (caseType === 'lower') {
            transformedSuffix = suffix.toLowerCase();
          } else if (caseType === 'upper') {
            transformedSuffix = suffix.toUpperCase();
          }
          
          // Create model name without space
          const modelName = `${modelPrefix}${modelNumber}${transformedSuffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space before the suffix (in its standardized form)
          // The normalized form should use the standard capitalization
          const suffixPattern = new RegExp(`\\s${suffix}(?:\\s|$|\\+)`, 'i');
          expect(normalized).toMatch(suffixPattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Suffix with existing space should remain spaced
   * 
   * If a suffix already has a space before it, normalization should preserve it
   */
  it('should preserve existing spaces before suffixes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Z', 'A', 'S', 'X'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        (modelPrefix, modelNumber, suffix) => {
          // Create model name WITH space before suffix
          const modelName = `${modelPrefix}${modelNumber} ${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should still have space before suffix
          expect(normalized).toContain(` ${suffix}`);
          
          // Should be idempotent
          const normalizedAgain = spaceHandler.normalizeSpaces(normalized);
          expect(normalizedAgain).toBe(normalized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Suffix recognition with brand prefix
   * 
   * Suffixes should be recognized even when brand is present
   */
  it('should recognize suffixes with brand prefix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('IQOO', 'OPPO', 'VIVO'),
        fc.constantFrom('Z', 'A', 'S', 'X'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        (brand, modelPrefix, modelNumber, suffix) => {
          // Create model name: brand + model + suffix (no spaces)
          const modelName = `${brand}${modelPrefix}${modelNumber}${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space before suffix
          const suffixPattern = new RegExp(`\\s${suffix}(?:\\s|$|\\+)`, 'i');
          expect(normalized).toMatch(suffixPattern);
          
          // Should also have space after brand
          expect(normalized).toMatch(new RegExp(`${brand}\\s`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: All defined suffixes are recognized
   * 
   * Every suffix in the SpaceHandler's suffix list should be properly recognized
   */
  it('should recognize all defined suffixes', () => {
    const allSuffixes = [...suffixes, ...chineseSuffixes];
    
    allSuffixes.forEach(suffix => {
      // Create a simple model name with the suffix attached
      const modelName = `X10${suffix}`;
      
      // Normalize
      const normalized = spaceHandler.normalizeSpaces(modelName);
      
      // Should have space before the suffix
      expect(normalized).toContain(` ${suffix}`);
    });
  });

  /**
   * Property Test: Suffix recognition doesn't create double spaces
   * 
   * After adding spaces before suffixes, there should be no double spaces
   */
  it('should not create double spaces when adding suffix spaces', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Z', 'A', 'S', 'X'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        fc.integer({ min: 0, max: 3 }), // Number of existing spaces
        (modelPrefix, modelNumber, suffix, numSpaces) => {
          // Create model name with variable spacing before suffix
          const modelName = `${modelPrefix}${modelNumber}${' '.repeat(numSpaces)}${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should not contain double spaces
          expect(normalized).not.toContain('  ');
          
          // Should have exactly one space before suffix
          expect(normalized).toContain(` ${suffix}`);
          expect(normalized).not.toContain(`  ${suffix}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Suffix at end of string
   * 
   * Suffixes at the end of the string should be properly recognized
   */
  it('should recognize suffixes at end of string', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Z', 'A', 'S', 'X'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        (modelPrefix, modelNumber, suffix) => {
          // Create model name ending with suffix
          const modelName = `${modelPrefix}${modelNumber}${suffix}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should end with the suffix (with space before it)
          expect(normalized).toMatch(new RegExp(`\\s${suffix}$`, 'i'));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Complex model names with multiple components
   * 
   * Suffixes should be recognized in complex model names with multiple parts
   */
  it('should recognize suffixes in complex model names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('IQOO', 'OPPO', 'VIVO'),
        fc.constantFrom('Z', 'A', 'S'),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(...suffixes),
        fc.constantFrom('8GB+128GB', '12GB+256GB', '16GB+512GB'),
        fc.constantFrom('黑色', '白色', '蓝色'),
        (brand, modelPrefix, modelNumber, suffix, capacity, color) => {
          // Create complex model name
          const modelName = `${brand}${modelPrefix}${modelNumber}${suffix}${capacity}${color}`;
          
          // Normalize
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Should have space before suffix
          const suffixPattern = new RegExp(`\\s${suffix}`, 'i');
          expect(normalized).toMatch(suffixPattern);
        }
      ),
      { numRuns: 100 }
    );
  });
});
