/**
 * Property-Based Test: Model Match Score Monotonicity
 * 属性测试：型号匹配分数单调性
 * 
 * Feature: smart-match-optimization
 * Property 8: 型号匹配分数单调性
 * 
 * **Validates: Requirements 3.3, 3.5**
 * 
 * Property: For any two models, the similarity score should follow monotonicity:
 * - Exact match score > Partial match score > No match score
 * - Exact match: 1.0
 * - Partial match: 0.5 (when one is prefix of another without suffix)
 * - Different models with same base: 0.3
 * - No match: 0.0
 */

import * as fc from 'fast-check';
import { modelDisambiguator } from './modelDisambiguator';

describe('Property 8: 型号匹配分数单调性', () => {
  /**
   * Property Test: Exact match score is always 1.0
   * 
   * For any model name, calculateModelMatchScore should return 1.0
   * when both input and candidate are exactly the same
   */
  it('should return 1.0 for exact matches', () => {
    fc.assert(
      fc.property(
        // Generate complete model name
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO', 'Honor'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15', 'K70', 'Nova12'),
          suffix: fc.option(fc.constantFrom('Pro', 'Max', 'mini', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo', 'Lite'), { nil: '' }),
        }),
        ({ brand, modelCode, suffix }) => {
          // Construct model name
          const parts = [brand, modelCode, suffix].filter(p => p !== '');
          const modelName = parts.join(' ');
          
          // Exact match should return 1.0
          const score = modelDisambiguator.calculateModelMatchScore(modelName, modelName);
          
          expect(score).toBe(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: No match score is always 0.0 for models with additional suffixes
   * 
   * For any complete model name, calculateModelMatchScore should return 0.0
   * when the candidate has an additional suffix (different model)
   */
  it('should return 0.0 for models with additional suffixes', () => {
    fc.assert(
      fc.property(
        // Generate base model and additional suffix
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO', 'Honor'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15', 'K70'),
          firstSuffix: fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo'),
          additionalSuffix: fc.constantFrom('mini', 'Plus', 'Max', 'Ultra', 'SE', 'Lite'),
        }),
        ({ brand, modelCode, firstSuffix, additionalSuffix }) => {
          // Construct input model (without additional suffix)
          const inputParts = [brand, modelCode, firstSuffix].filter(p => p !== '');
          const inputModel = inputParts.join(' ');
          
          // Construct candidate model (with additional suffix)
          const candidateParts = [brand, modelCode, firstSuffix, additionalSuffix].filter(p => p !== '');
          const candidateModel = candidateParts.join(' ');
          
          // Should return 0.0 (no match - different models)
          const score = modelDisambiguator.calculateModelMatchScore(inputModel, candidateModel);
          
          expect(score).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Monotonicity - Exact match > Same base different suffix > No match
   * 
   * For any model, verify that:
   * - Exact match score (1.0) > Same base with different suffix (0.3) > No match score (0.0)
   * 
   * Note: When comparing base model (X200) with model+suffix (X200 Pro), the score is 0.0
   * because Pro is a known suffix, making them different models. This is by design for
   * Property 7 (exact match exclusivity).
   */
  it('should maintain monotonicity: exact > same base > no match', () => {
    fc.assert(
      fc.property(
        // Generate model components
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
          suffix1: fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE'),
          suffix2: fc.constantFrom('Air', 'Turbo', 'Lite', 'mini', 'Note'),
          additionalSuffix: fc.constantFrom('mini', 'Plus', 'Max', 'Ultra', 'Lite'),
        }),
        ({ brand, modelCode, suffix1, suffix2, additionalSuffix }) => {
          // Ensure suffix1 and suffix2 are different
          fc.pre(suffix1 !== suffix2);
          
          // Construct model with first suffix
          const modelWithSuffix1 = [brand, modelCode, suffix1].filter(p => p !== '').join(' ');
          
          // Construct model with second suffix (same base, different suffix)
          const modelWithSuffix2 = [brand, modelCode, suffix2].filter(p => p !== '').join(' ');
          
          // Construct model with additional suffix (completely different model)
          const modelWithAdditionalSuffix = [brand, modelCode, suffix1, additionalSuffix].filter(p => p !== '').join(' ');
          
          // Calculate scores
          const exactMatchScore = modelDisambiguator.calculateModelMatchScore(modelWithSuffix1, modelWithSuffix1);
          const sameBaseScore = modelDisambiguator.calculateModelMatchScore(modelWithSuffix1, modelWithSuffix2);
          const noMatchScore = modelDisambiguator.calculateModelMatchScore(modelWithSuffix1, modelWithAdditionalSuffix);
          
          // Verify monotonicity: exact (1.0) > same base (0.3) > no match (0.0)
          expect(exactMatchScore).toBe(1.0);
          expect(sameBaseScore).toBe(0.3);
          expect(noMatchScore).toBe(0.0);
          
          // Verify ordering
          expect(exactMatchScore).toBeGreaterThan(sameBaseScore);
          expect(sameBaseScore).toBeGreaterThan(noMatchScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Partial match score is 0.5 for prefix matches without suffix
   * 
   * For any model with suffix, when compared to the base model (without suffix),
   * the score should be 0.5 (partial match)
   */
  it('should return 0.5 for partial matches (prefix without suffix)', () => {
    fc.assert(
      fc.property(
        // Generate model with non-suffix extension
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
          // Use non-suffix extension (like version names)
          extension: fc.constantFrom('活力版', '标准版', '青春版', '至尊版'),
        }),
        ({ brand, modelCode, extension }) => {
          // Construct base model
          const baseParts = [brand, modelCode].filter(p => p !== '');
          const baseModel = baseParts.join(' ');
          
          // Construct model with extension
          const modelWithExtension = [brand, modelCode, extension].filter(p => p !== '').join(' ');
          
          // Should return 0.5 (partial match - one is prefix of another without known suffix)
          const score = modelDisambiguator.calculateModelMatchScore(baseModel, modelWithExtension);
          
          expect(score).toBe(0.5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Same base model with different suffixes returns 0.3
   * 
   * For any two models with the same base but different suffixes,
   * the score should be 0.3
   */
  it('should return 0.3 for same base model with different suffixes', () => {
    fc.assert(
      fc.property(
        // Generate two models with same base but different suffixes
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
          suffix1: fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE'),
          suffix2: fc.constantFrom('Air', 'Turbo', 'Lite', 'mini', 'Note'),
        }),
        ({ brand, modelCode, suffix1, suffix2 }) => {
          // Ensure suffixes are different
          fc.pre(suffix1 !== suffix2);
          
          // Construct two models with different suffixes
          const model1Parts = [brand, modelCode, suffix1].filter(p => p !== '');
          const model1 = model1Parts.join(' ');
          
          const model2Parts = [brand, modelCode, suffix2].filter(p => p !== '');
          const model2 = model2Parts.join(' ');
          
          // Should return 0.3 (same base, different suffixes)
          const score = modelDisambiguator.calculateModelMatchScore(model1, model2);
          
          expect(score).toBe(0.3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Completely different models return 0.0
   * 
   * For any two models with different base model codes,
   * the score should be 0.0
   */
  it('should return 0.0 for completely different models', () => {
    fc.assert(
      fc.property(
        // Generate two different model codes
        fc.tuple(
          fc.record({
            brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei'), { nil: '' }),
            modelCode: fc.constantFrom('X200', 'A5', 'Z10'),
            suffix: fc.option(fc.constantFrom('Pro', 'Max', 'Plus'), { nil: '' }),
          }),
          fc.record({
            brand: fc.option(fc.constantFrom('Xiaomi', 'IQOO', 'Honor'), { nil: '' }),
            modelCode: fc.constantFrom('Mate60', 'Reno12', 'Magic6'),
            suffix: fc.option(fc.constantFrom('Ultra', 'SE', 'Air'), { nil: '' }),
          })
        ),
        ([model1Data, model2Data]) => {
          // Construct two completely different models
          const model1Parts = [model1Data.brand, model1Data.modelCode, model1Data.suffix].filter(p => p !== '');
          const model1 = model1Parts.join(' ');
          
          const model2Parts = [model2Data.brand, model2Data.modelCode, model2Data.suffix].filter(p => p !== '');
          const model2 = model2Parts.join(' ');
          
          // Should return 0.0 (completely different)
          const score = modelDisambiguator.calculateModelMatchScore(model1, model2);
          
          expect(score).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Score symmetry
   * 
   * For any two models, calculateModelMatchScore(A, B) should equal
   * calculateModelMatchScore(B, A)
   */
  it('should maintain score symmetry', () => {
    fc.assert(
      fc.property(
        // Generate two models
        fc.tuple(
          fc.record({
            brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
            modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
            suffix: fc.option(fc.constantFrom('Pro', 'Max', 'mini', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo'), { nil: '' }),
          }),
          fc.record({
            brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
            modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
            suffix: fc.option(fc.constantFrom('Pro', 'Max', 'mini', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo'), { nil: '' }),
          })
        ),
        ([model1Data, model2Data]) => {
          // Construct two models
          const model1Parts = [model1Data.brand, model1Data.modelCode, model1Data.suffix].filter(p => p !== '');
          const model1 = model1Parts.join(' ');
          
          const model2Parts = [model2Data.brand, model2Data.modelCode, model2Data.suffix].filter(p => p !== '');
          const model2 = model2Parts.join(' ');
          
          // Calculate scores in both directions
          const scoreAB = modelDisambiguator.calculateModelMatchScore(model1, model2);
          const scoreBA = modelDisambiguator.calculateModelMatchScore(model2, model1);
          
          // Scores should be symmetric
          expect(scoreAB).toBe(scoreBA);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Real-world examples from requirements
   * 
   * Test specific examples to verify monotonicity with concrete cases
   */
  it('should handle real-world examples with correct monotonicity', () => {
    // Example 1: X200 Pro - exact match, same base different suffix, and no match
    const exactScore1 = modelDisambiguator.calculateModelMatchScore('X200 Pro', 'X200 Pro');
    const sameBaseScore1 = modelDisambiguator.calculateModelMatchScore('X200 Pro', 'X200 Max');
    const noMatchScore1 = modelDisambiguator.calculateModelMatchScore('X200 Pro', 'X200 Pro mini');
    
    expect(exactScore1).toBe(1.0);
    expect(sameBaseScore1).toBe(0.3);
    expect(noMatchScore1).toBe(0.0);
    expect(exactScore1).toBeGreaterThan(sameBaseScore1);
    expect(sameBaseScore1).toBeGreaterThan(noMatchScore1);
    
    // Example 2: Mate60 Pro - exact match, same base different suffix, and no match
    const exactScore2 = modelDisambiguator.calculateModelMatchScore('Mate60 Pro', 'Mate60 Pro');
    const sameBaseScore2 = modelDisambiguator.calculateModelMatchScore('Mate60 Pro', 'Mate60 Max');
    const noMatchScore2 = modelDisambiguator.calculateModelMatchScore('Mate60 Pro', 'Mate60 Pro Plus');
    
    expect(exactScore2).toBe(1.0);
    expect(sameBaseScore2).toBe(0.3);
    expect(noMatchScore2).toBe(0.0);
    expect(exactScore2).toBeGreaterThan(sameBaseScore2);
    expect(sameBaseScore2).toBeGreaterThan(noMatchScore2);
    
    // Example 3: Partial match with non-suffix extension (version names)
    const partialScore = modelDisambiguator.calculateModelMatchScore('X200', 'X200 活力版');
    expect(partialScore).toBe(0.5);
    expect(partialScore).toBeGreaterThan(0.3);
    expect(partialScore).toBeLessThan(1.0);
    
    // Example 4: Completely different models
    const differentScore = modelDisambiguator.calculateModelMatchScore('X200 Pro', 'Mate60 Pro');
    expect(differentScore).toBe(0.0);
    
    // Example 5: Base model vs model with known suffix (treated as different models)
    const baseVsSuffixScore = modelDisambiguator.calculateModelMatchScore('X200', 'X200 Pro');
    expect(baseVsSuffixScore).toBe(0.0); // Known suffix makes them different models
  });

  /**
   * Property Test: Null or empty inputs
   * 
   * For null or empty inputs, verify consistent behavior
   */
  it('should handle null or empty inputs consistently', () => {
    // Both null or empty should return 1.0 (both "match" as empty)
    expect(modelDisambiguator.calculateModelMatchScore(null, null)).toBe(1.0);
    expect(modelDisambiguator.calculateModelMatchScore('', '')).toBe(1.0);
    
    // One null/empty should return 0.0 (no match)
    expect(modelDisambiguator.calculateModelMatchScore(null, 'X200 Pro')).toBe(0.0);
    expect(modelDisambiguator.calculateModelMatchScore('X200 Pro', null)).toBe(0.0);
    expect(modelDisambiguator.calculateModelMatchScore('', 'X200 Pro')).toBe(0.0);
    expect(modelDisambiguator.calculateModelMatchScore('X200 Pro', '')).toBe(0.0);
  });

  /**
   * Property Test: Case and whitespace insensitivity
   * 
   * For any model with different case or whitespace variations,
   * the score should be the same (1.0 for exact match)
   */
  it('should be case and whitespace insensitive', () => {
    fc.assert(
      fc.property(
        // Generate model with variations
        fc.record({
          modelCode: fc.constantFrom('x200', 'X200', 'x200', 'X200'),
          suffix: fc.constantFrom('pro', 'Pro', 'PRO'),
          spaces: fc.constantFrom(' ', '  ', '   '),
        }),
        ({ modelCode, suffix, spaces }) => {
          // Construct models with different cases and spaces
          const model1 = `${modelCode}${spaces}${suffix}`;
          const model2 = `${modelCode.toUpperCase()}${' '}${suffix.toLowerCase()}`;
          
          // Should return 1.0 (exact match despite case/space differences)
          const score = modelDisambiguator.calculateModelMatchScore(model1, model2);
          
          expect(score).toBe(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Transitivity of score ordering
   * 
   * For three models with the same base but different suffixes,
   * verify consistent score ordering
   */
  it('should maintain transitivity in score ordering', () => {
    fc.assert(
      fc.property(
        // Generate three models: base + suffix1, base + suffix2, base + suffix1 + suffix2
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12'),
          suffix1: fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE'),
          suffix2: fc.constantFrom('Air', 'Turbo', 'Lite', 'mini', 'Note'),
          suffix3: fc.constantFrom('mini', 'Plus', 'Max', 'Ultra', 'Lite'),
        }),
        ({ brand, modelCode, suffix1, suffix2, suffix3 }) => {
          // Ensure suffixes are different
          fc.pre(suffix1 !== suffix2);
          
          // Model A: base + suffix1
          const modelA = [brand, modelCode, suffix1].filter(p => p !== '').join(' ');
          
          // Model B: base + suffix2 (same base, different suffix)
          const modelB = [brand, modelCode, suffix2].filter(p => p !== '').join(' ');
          
          // Model C: base + suffix1 + suffix3 (different model with additional suffix)
          const modelC = [brand, modelCode, suffix1, suffix3].filter(p => p !== '').join(' ');
          
          // Calculate scores
          const scoreAA = modelDisambiguator.calculateModelMatchScore(modelA, modelA);
          const scoreAB = modelDisambiguator.calculateModelMatchScore(modelA, modelB);
          const scoreAC = modelDisambiguator.calculateModelMatchScore(modelA, modelC);
          
          // Verify ordering: exact match (1.0) > same base (0.3) > different model (0.0)
          expect(scoreAA).toBe(1.0);
          expect(scoreAB).toBe(0.3);
          expect(scoreAC).toBe(0.0);
          
          expect(scoreAA).toBeGreaterThan(scoreAB);
          expect(scoreAB).toBeGreaterThan(scoreAC);
        }
      ),
      { numRuns: 100 }
    );
  });
});
