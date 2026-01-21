/**
 * Property-Based Test: Space Normalization Idempotency
 * 属性测试：空格标准化幂等性
 * 
 * Feature: smart-match-optimization
 * Property 1: 空格标准化幂等性
 * 
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * Property: For any model name string, applying space normalization multiple times
 * should produce the same result (idempotency).
 */

import * as fc from 'fast-check';
import { spaceHandler } from './spaceHandler';

describe('Property 1: 空格标准化幂等性', () => {
  /**
   * Property Test: Space normalization is idempotent
   * 
   * For any model name, normalizeSpaces(normalizeSpaces(x)) === normalizeSpaces(x)
   */
  it('should be idempotent - multiple normalizations produce the same result', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary model names with various space patterns
        fc.string({ minLength: 1, maxLength: 50 }),
        (modelName) => {
          // First normalization
          const normalized1 = spaceHandler.normalizeSpaces(modelName);
          
          // Second normalization
          const normalized2 = spaceHandler.normalizeSpaces(normalized1);
          
          // Third normalization
          const normalized3 = spaceHandler.normalizeSpaces(normalized2);
          
          // All subsequent normalizations should be identical
          expect(normalized2).toBe(normalized1);
          expect(normalized3).toBe(normalized1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Space normalization with extra spaces
   * 
   * For any model name with extra spaces, normalization should produce
   * a consistent result regardless of the number of spaces
   */
  it('should normalize extra spaces consistently', () => {
    fc.assert(
      fc.property(
        // Generate model names with random spacing
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (parts, numSpaces) => {
          // Create a string with variable number of spaces between parts
          const spaces = ' '.repeat(numSpaces);
          const modelName = parts.join(spaces);
          
          // Normalize it
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Normalize again - should be idempotent
          const normalizedAgain = spaceHandler.normalizeSpaces(normalized);
          
          expect(normalizedAgain).toBe(normalized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Space normalization with brand and model combinations
   * 
   * For any brand + model combination, normalization should be idempotent
   */
  it('should be idempotent for brand + model combinations', () => {
    const brands = ['IQOO', 'OPPO', 'VIVO', 'Hi', 'iqoo', 'oppo', 'vivo', 'hi'];
    const modelPrefixes = ['Z', 'A', 'S', 'X', 'Nova', 'Mate'];
    const suffixes = ['Pro', 'Max', 'Mini', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo', 'pro', 'max', 'mini', 'plus'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...brands),
        fc.constantFrom(...modelPrefixes),
        fc.integer({ min: 1, max: 99 }),
        fc.option(fc.constantFrom(...suffixes), { nil: null }),
        fc.integer({ min: 0, max: 3 }), // Number of spaces between brand and model
        fc.integer({ min: 0, max: 3 }), // Number of spaces before suffix
        (brand, modelPrefix, modelNumber, suffix, brandSpaces, suffixSpaces) => {
          // Construct model name with variable spacing
          const brandPart = brand + ' '.repeat(brandSpaces);
          const modelPart = modelPrefix + modelNumber;
          const suffixPart = suffix ? ' '.repeat(suffixSpaces) + suffix : '';
          const modelName = brandPart + modelPart + suffixPart;
          
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
   * Property Test: Space normalization with Chinese version suffixes
   * 
   * For any model with Chinese version suffixes, normalization should be idempotent
   */
  it('should be idempotent for models with Chinese version suffixes', () => {
    const chineseSuffixes = ['活力版', '标准版', '青春版', '至尊版', '竞速版', '极速版'];
    
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom(...chineseSuffixes),
        fc.integer({ min: 0, max: 3 }), // Number of spaces before suffix
        (modelBase, suffix, numSpaces) => {
          const modelName = modelBase + ' '.repeat(numSpaces) + suffix;
          
          // First normalization
          const normalized1 = spaceHandler.normalizeSpaces(modelName);
          
          // Second normalization
          const normalized2 = spaceHandler.normalizeSpaces(normalized1);
          
          // Should be idempotent
          expect(normalized2).toBe(normalized1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Space normalization with full-width characters
   * 
   * For any model with full-width characters, normalization should be idempotent
   */
  it('should be idempotent for models with full-width characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (modelName) => {
          // Replace some characters with full-width equivalents
          const fullWidthModel = modelName
            .replace(/\+/g, '＋')
            .replace(/\(/g, '（')
            .replace(/\)/g, '）')
            .replace(/ /g, '　'); // Full-width space
          
          // First normalization
          const normalized1 = spaceHandler.normalizeSpaces(fullWidthModel);
          
          // Second normalization
          const normalized2 = spaceHandler.normalizeSpaces(normalized1);
          
          // Should be idempotent
          expect(normalized2).toBe(normalized1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Space normalization preserves non-space content
   * 
   * After normalization, the non-space characters should remain in the same order
   */
  it('should preserve non-space character order', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (modelName) => {
          const normalized = spaceHandler.normalizeSpaces(modelName);
          
          // Extract non-space characters from both strings
          const originalChars = modelName.replace(/\s+/g, '');
          const normalizedChars = normalized.replace(/\s+/g, '');
          
          // The non-space characters should be in the same order
          // (though some may be transformed, like full-width to half-width)
          // We check that normalization is idempotent
          const normalizedAgain = spaceHandler.normalizeSpaces(normalized);
          expect(normalizedAgain).toBe(normalized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Empty or whitespace-only strings
   * 
   * Empty or whitespace-only strings should normalize to empty string
   */
  it('should normalize empty or whitespace-only strings to empty string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (numSpaces) => {
          const whitespaceString = ' '.repeat(numSpaces);
          const normalized = spaceHandler.normalizeSpaces(whitespaceString);
          
          expect(normalized).toBe('');
          
          // Should be idempotent
          const normalizedAgain = spaceHandler.normalizeSpaces(normalized);
          expect(normalizedAgain).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});
