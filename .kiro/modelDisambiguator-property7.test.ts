/**
 * Property-Based Test: Model Exact Match Exclusivity
 * 属性测试：型号精确匹配排他性
 * 
 * Feature: smart-match-optimization
 * Property 7: 型号精确匹配排他性
 * 
 * **Validates: Requirements 3.1, 3.2, 3.4**
 * 
 * Property: For any complete model name (e.g., "X200 Pro"),
 * the matching algorithm should NOT match models with additional suffixes
 * (e.g., "X200 Pro mini").
 */

import * as fc from 'fast-check';
import { modelDisambiguator } from './modelDisambiguator';

describe('Property 7: 型号精确匹配排他性', () => {
  /**
   * Property Test: Complete model should not match model with additional suffix
   * 
   * For any complete model name, shouldExcludeCandidate should return true
   * when the candidate has the same base model but with an additional suffix
   */
  it('should exclude candidates with additional suffixes', () => {
    fc.assert(
      fc.property(
        // Generate base model (brand + model code + optional first suffix)
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO', 'Honor', ''), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15', 'K70', 'Nova12'),
          firstSuffix: fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo', 'Lite'),
          additionalSuffix: fc.constantFrom('mini', 'Plus', 'Max', 'Ultra', 'SE', 'Lite', 'Pro'),
        }),
        ({ brand, modelCode, firstSuffix, additionalSuffix }) => {
          // Construct input model (without additional suffix)
          const inputParts = [brand, modelCode, firstSuffix].filter(p => p !== '');
          const inputModel = inputParts.join(' ');
          
          // Construct candidate model (with additional suffix)
          const candidateParts = [brand, modelCode, firstSuffix, additionalSuffix].filter(p => p !== '');
          const candidateModel = candidateParts.join(' ');
          
          // Should exclude candidate with additional suffix
          const shouldExclude = modelDisambiguator.shouldExcludeCandidate(inputModel, candidateModel);
          
          expect(shouldExclude).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Exact match should not be excluded
   * 
   * For any model name, shouldExcludeCandidate should return false
   * when both input and candidate are exactly the same
   */
  it('should not exclude exact matches', () => {
    fc.assert(
      fc.property(
        // Generate complete model name
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
          suffix: fc.option(fc.constantFrom('Pro', 'Max', 'mini', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo'), { nil: '' }),
        }),
        ({ brand, modelCode, suffix }) => {
          // Construct model name
          const parts = [brand, modelCode, suffix].filter(p => p !== '');
          const modelName = parts.join(' ');
          
          // Should not exclude exact match
          const shouldExclude = modelDisambiguator.shouldExcludeCandidate(modelName, modelName);
          
          expect(shouldExclude).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model match score is 0 for models with additional suffixes
   * 
   * For any complete model name, calculateModelMatchScore should return 0
   * when the candidate has an additional suffix
   */
  it('should return 0 match score for models with additional suffixes', () => {
    fc.assert(
      fc.property(
        // Generate base model and additional suffix
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
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
          
          // Should return 0 match score
          const score = modelDisambiguator.calculateModelMatchScore(inputModel, candidateModel);
          
          expect(score).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Exact match returns score of 1.0
   * 
   * For any model name, calculateModelMatchScore should return 1.0
   * when both input and candidate are exactly the same
   */
  it('should return 1.0 match score for exact matches', () => {
    fc.assert(
      fc.property(
        // Generate complete model name
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi', 'IQOO'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12', 'Magic6', '14', '15'),
          suffix: fc.option(fc.constantFrom('Pro', 'Max', 'mini', 'Plus', 'Ultra', 'SE', 'Air', 'Turbo'), { nil: '' }),
        }),
        ({ brand, modelCode, suffix }) => {
          // Construct model name
          const parts = [brand, modelCode, suffix].filter(p => p !== '');
          const modelName = parts.join(' ');
          
          // Should return 1.0 for exact match
          const score = modelDisambiguator.calculateModelMatchScore(modelName, modelName);
          
          expect(score).toBe(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Real-world examples from requirements
   * 
   * Test specific examples mentioned in the requirements:
   * - "X200 Pro" should NOT match "X200 Pro mini"
   */
  it('should handle real-world examples correctly', () => {
    // Example 1: X200 Pro vs X200 Pro mini
    expect(modelDisambiguator.shouldExcludeCandidate('X200 Pro', 'X200 Pro mini')).toBe(true);
    expect(modelDisambiguator.calculateModelMatchScore('X200 Pro', 'X200 Pro mini')).toBe(0.0);
    
    // Example 2: VIVO X200 Pro vs VIVO X200 Pro mini
    expect(modelDisambiguator.shouldExcludeCandidate('VIVO X200 Pro', 'VIVO X200 Pro mini')).toBe(true);
    expect(modelDisambiguator.calculateModelMatchScore('VIVO X200 Pro', 'VIVO X200 Pro mini')).toBe(0.0);
    
    // Example 3: Mate60 Pro vs Mate60 Pro Plus
    expect(modelDisambiguator.shouldExcludeCandidate('Mate60 Pro', 'Mate60 Pro Plus')).toBe(true);
    expect(modelDisambiguator.calculateModelMatchScore('Mate60 Pro', 'Mate60 Pro Plus')).toBe(0.0);
    
    // Example 4: Exact matches should not be excluded
    expect(modelDisambiguator.shouldExcludeCandidate('X200 Pro', 'X200 Pro')).toBe(false);
    expect(modelDisambiguator.calculateModelMatchScore('X200 Pro', 'X200 Pro')).toBe(1.0);
    
    // Example 5: OPPO A5 vs OPPO A5 Pro
    expect(modelDisambiguator.shouldExcludeCandidate('OPPO A5', 'OPPO A5 Pro')).toBe(true);
    expect(modelDisambiguator.calculateModelMatchScore('OPPO A5', 'OPPO A5 Pro')).toBe(0.0);
  });

  /**
   * Property Test: Case insensitivity
   * 
   * For any model name with different case variations,
   * the exclusivity logic should work consistently
   */
  it('should handle case variations correctly', () => {
    fc.assert(
      fc.property(
        // Generate model with case variations
        fc.record({
          modelCode: fc.constantFrom('x200', 'X200', 'x200', 'X200'),
          firstSuffix: fc.constantFrom('pro', 'Pro', 'PRO'),
          additionalSuffix: fc.constantFrom('mini', 'Mini', 'MINI'),
        }),
        ({ modelCode, firstSuffix, additionalSuffix }) => {
          // Construct models with different cases
          const inputModel = `${modelCode} ${firstSuffix}`;
          const candidateModel = `${modelCode} ${firstSuffix} ${additionalSuffix}`;
          
          // Should exclude regardless of case
          const shouldExclude = modelDisambiguator.shouldExcludeCandidate(inputModel, candidateModel);
          expect(shouldExclude).toBe(true);
          
          // Should return 0 match score regardless of case
          const score = modelDisambiguator.calculateModelMatchScore(inputModel, candidateModel);
          expect(score).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Whitespace normalization
   * 
   * For any model name with different whitespace patterns,
   * the exclusivity logic should work consistently
   */
  it('should handle whitespace variations correctly', () => {
    fc.assert(
      fc.property(
        // Generate model with whitespace variations
        fc.record({
          modelCode: fc.constantFrom('X200', 'Mate60', 'Reno12'),
          firstSuffix: fc.constantFrom('Pro', 'Max', 'Plus'),
          additionalSuffix: fc.constantFrom('mini', 'Plus', 'Ultra'),
          spaces1: fc.constantFrom(' ', '  ', '   '),
          spaces2: fc.constantFrom(' ', '  ', '   '),
        }),
        ({ modelCode, firstSuffix, additionalSuffix, spaces1, spaces2 }) => {
          // Construct models with different whitespace
          const inputModel = `${modelCode}${spaces1}${firstSuffix}`;
          const candidateModel = `${modelCode}${spaces1}${firstSuffix}${spaces2}${additionalSuffix}`;
          
          // Should exclude regardless of whitespace
          const shouldExclude = modelDisambiguator.shouldExcludeCandidate(inputModel, candidateModel);
          expect(shouldExclude).toBe(true);
          
          // Should return 0 match score regardless of whitespace
          const score = modelDisambiguator.calculateModelMatchScore(inputModel, candidateModel);
          expect(score).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: More general candidate should not be excluded
   * 
   * For any model with additional suffix, the more general candidate
   * (without the suffix) should NOT be excluded
   */
  it('should not exclude more general candidates', () => {
    fc.assert(
      fc.property(
        // Generate model with suffix
        fc.record({
          brand: fc.option(fc.constantFrom('VIVO', 'OPPO', 'Huawei', 'Xiaomi'), { nil: '' }),
          modelCode: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60', 'Reno12'),
          firstSuffix: fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE'),
          additionalSuffix: fc.constantFrom('mini', 'Plus', 'Max', 'Ultra'),
        }),
        ({ brand, modelCode, firstSuffix, additionalSuffix }) => {
          // Input has additional suffix
          const inputParts = [brand, modelCode, firstSuffix, additionalSuffix].filter(p => p !== '');
          const inputModel = inputParts.join(' ');
          
          // Candidate is more general (no additional suffix)
          const candidateParts = [brand, modelCode, firstSuffix].filter(p => p !== '');
          const candidateModel = candidateParts.join(' ');
          
          // Should NOT exclude more general candidate
          const shouldExclude = modelDisambiguator.shouldExcludeCandidate(inputModel, candidateModel);
          
          expect(shouldExclude).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Models with different base codes should not be excluded
   * 
   * For any two models with different base model codes,
   * shouldExcludeCandidate should return false
   */
  it('should not exclude models with different base codes', () => {
    fc.assert(
      fc.property(
        // Generate two different model codes
        fc.record({
          modelCode1: fc.constantFrom('X200', 'A5', 'Z10', 'Mate60'),
          modelCode2: fc.constantFrom('X100', 'A3', 'Z9', 'Mate50'),
          suffix: fc.option(fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra'), { nil: '' }),
        }),
        ({ modelCode1, modelCode2, suffix }) => {
          // Ensure model codes are different
          fc.pre(modelCode1 !== modelCode2);
          
          // Construct models with different base codes
          const parts1 = [modelCode1, suffix].filter(p => p !== '');
          const model1 = parts1.join(' ');
          
          const parts2 = [modelCode2, suffix].filter(p => p !== '');
          const model2 = parts2.join(' ');
          
          // Should not exclude models with different base codes
          const shouldExclude = modelDisambiguator.shouldExcludeCandidate(model1, model2);
          
          expect(shouldExclude).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Null or empty inputs
   * 
   * For any null or empty input, shouldExcludeCandidate should return false
   */
  it('should handle null or empty inputs gracefully', () => {
    expect(modelDisambiguator.shouldExcludeCandidate(null, 'X200 Pro')).toBe(false);
    expect(modelDisambiguator.shouldExcludeCandidate('X200 Pro', null)).toBe(false);
    expect(modelDisambiguator.shouldExcludeCandidate(null, null)).toBe(false);
    expect(modelDisambiguator.shouldExcludeCandidate('', 'X200 Pro')).toBe(false);
    expect(modelDisambiguator.shouldExcludeCandidate('X200 Pro', '')).toBe(false);
    expect(modelDisambiguator.shouldExcludeCandidate('', '')).toBe(false);
  });

  /**
   * Property Test: Models with + suffix variations
   * 
   * For any model with + suffix (e.g., "Turbo+"),
   * the exclusivity logic should work correctly
   */
  it('should handle models with + suffix correctly', () => {
    // Z10 Turbo vs Z10 Turbo+
    expect(modelDisambiguator.shouldExcludeCandidate('Z10 Turbo', 'Z10 Turbo+')).toBe(false);
    expect(modelDisambiguator.shouldExcludeCandidate('Z10 Turbo+', 'Z10 Turbo')).toBe(false);
    
    // Z10 Turbo+ vs Z10 Turbo+ mini (should exclude)
    expect(modelDisambiguator.shouldExcludeCandidate('Z10 Turbo+', 'Z10 Turbo+ mini')).toBe(true);
    expect(modelDisambiguator.calculateModelMatchScore('Z10 Turbo+', 'Z10 Turbo+ mini')).toBe(0.0);
  });
});
