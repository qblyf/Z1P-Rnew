/**
 * Property-Based Tests for Model Normalization
 * Feature: smart-match-accuracy-improvement
 * Task: 1.3 编写型号标准化的属性测试
 * 
 * This file contains property-based tests using fast-check to verify
 * that model normalization behaves consistently across various inputs.
 * 
 * **Validates: Requirements 2.3.1, 2.3.2**
 */

import fc from 'fast-check';

// Mock SimpleMatcher class for testing
// Since SimpleMatcher is defined in a React component, we'll create a standalone version for testing
const MODEL_NORMALIZATIONS: Record<string, string> = {
  'promini': 'pro mini',
  'promax': 'pro max',
  'proplus': 'pro plus',
  'watchgt': 'watch gt',
  'watchse': 'watch se',
  'watch3': 'watch 3',
  'watch4': 'watch 4',
  'watch5': 'watch 5',
  'watch6': 'watch 6',
  'watch7': 'watch 7',
  'band3': 'band 3',
  'band4': 'band 4',
  'band5': 'band 5',
  'band6': 'band 6',
  'band7': 'band 7',
  'buds3': 'buds 3',
  'buds4': 'buds 4',
  'buds5': 'buds 5',
  'xnote': 'x note',
  'xfold': 'x fold',
  'xflip': 'x flip',
};

class TestSimpleMatcher {
  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 步骤1: 移除括号内的型号代码（如（WA2456C）），避免干扰
    // 注意：需要在括号前后添加空格，避免括号内容与其他词连接
    let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
    
    // 步骤1.5: 提取并移除品牌，避免品牌与型号混淆
    // 例如：vivo promini -> promini (移除vivo后再处理)
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus', 'realme'];
    for (const brand of brands) {
      // 使用单词边界确保完整匹配品牌词
      const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(brandRegex, ' ');
    }
    
    // 清理多余空格
    normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
    
    // 步骤2: 应用 MODEL_NORMALIZATIONS 映射进行标准化
    Object.entries(MODEL_NORMALIZATIONS).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(regex, to);
    });
    
    // 步骤3: 多层次型号匹配（按优先级依次尝试）
    
    // 优先级1: 字母+字母格式（包括数字）
    // 包括三种模式：
    // 1. 单字母 + 产品词 (x note, x fold, x flip) - 最高优先级
    // 2. 特定产品词 + 修饰词 (watch gt, band se, etc.)
    // 3. 特定产品词 + 数字 (watch 5, band 3, etc.)
    const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
    const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|\d+|[a-z]+\d*)\b/gi;
    
    // 优先匹配 pattern2（单字母+产品词），因为它更具体
    const wordMatches2 = normalizedStr.match(wordModelPattern2);
    const wordMatches1 = normalizedStr.match(wordModelPattern1);
    const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
    
    if (wordMatches && wordMatches.length > 0) {
      return wordMatches[0].toLowerCase().replace(/\s+/g, '');
    }
    
    // 优先级2: 复杂型号格式
    const complexModelPattern = /\b([a-z]+)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note)(\s+(mini|max|plus|ultra))?\b/gi;
    const complexMatches = normalizedStr.match(complexModelPattern);
    
    if (complexMatches && complexMatches.length > 0) {
      const filtered = complexMatches.filter(m => {
        const lower = m.toLowerCase();
        if (lower.includes('gb')) {
          return false;
        }
        if (/\d+g$/i.test(lower)) {
          return false;
        }
        return true;
      });
      
      if (filtered.length > 0) {
        return filtered.sort((a, b) => b.length - a.length)[0]
          .toLowerCase()
          .replace(/\s+/g, '');
      }
    }
    
    // 优先级3: 简单型号格式
    // 注意：使用 normalizedStr 而不是 lowerStr，避免提取已删除的括号内容
    const simpleModelPattern = /\b([a-z]+)(\d+)([a-z]*)\b/gi;
    const simpleMatches = normalizedStr.match(simpleModelPattern);
    
    if (simpleMatches && simpleMatches.length > 0) {
      const filtered = simpleMatches.filter(m => {
        const lower = m.toLowerCase();
        
        if (/^[345]g$/i.test(lower)) {
          return false;
        }
        
        if (lower.includes('gb')) {
          return false;
        }
        
        if (/^\d+g$/i.test(lower)) {
          return false;
        }
        
        return true;
      });
      
      if (filtered.length > 0) {
        const sorted = filtered.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          
          const aHasSuffix = /[a-z]\d+[a-z]+/i.test(aLower);
          const bHasSuffix = /[a-z]\d+[a-z]+/i.test(bLower);
          
          if (aHasSuffix && !bHasSuffix) return -1;
          if (!aHasSuffix && bHasSuffix) return 1;
          
          return b.length - a.length;
        });
        
        return sorted[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    // 后备方案: 匹配通用 "字母 字母" 格式
    const generalWordPattern = /\b([a-z]+)\s+([a-z]+)\b/gi;
    const generalWordMatches = normalizedStr.match(generalWordPattern);
    
    if (generalWordMatches && generalWordMatches.length > 0) {
      const filtered = generalWordMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('全网通') && 
               !lower.includes('版本') &&
               !lower.includes('网通');
      });
      
      if (filtered.length > 0) {
        return filtered[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    return null;
  }
}

// ==================== Property-Based Tests ====================

describe('Property-Based Tests: Model Normalization', () => {
  let matcher: TestSimpleMatcher;

  beforeEach(() => {
    matcher = new TestSimpleMatcher();
  });

  // Feature: smart-match-accuracy-improvement, Property 1: 复合型号标准化一致性
  describe('Property 1: Compound Model Normalization Consistency', () => {
    /**
     * **Validates: Requirements 2.3.1, 2.3.2**
     * 
     * Property: For any product name containing a compound model (like "S30Promini", "WatchGT"),
     * the normalized model should be the same as the normalized result of its space-separated 
     * version (like "S30 Pro mini", "Watch GT").
     * 
     * This ensures that:
     * 1. Compound models are correctly identified regardless of spacing
     * 2. The normalization process is consistent and idempotent
     * 3. Users can input models with or without spaces and get the same match
     */
    test('Property 1: Compound models normalize consistently with their spaced versions', () => {
      // Generator for compound model pairs (concatenated vs spaced)
      // We test the known MODEL_NORMALIZATIONS mappings
      const compoundModelPairs = fc.constantFrom(
        // Format: [concatenated, spaced, expected_normalized]
        ['promini', 'pro mini', 'promini'],
        ['promax', 'pro max', 'promax'],
        ['proplus', 'pro plus', 'proplus'],
        ['watchgt', 'watch gt', 'watchgt'],
        ['watchse', 'watch se', 'watchse'],
        ['watch3', 'watch 3', 'watch3'],
        ['watch4', 'watch 4', 'watch4'],
        ['watch5', 'watch 5', 'watch5'],
        ['watch6', 'watch 6', 'watch6'],
        ['watch7', 'watch 7', 'watch7'],
        ['band3', 'band 3', 'band3'],
        ['band4', 'band 4', 'band4'],
        ['band5', 'band 5', 'band5'],
        ['band6', 'band 6', 'band6'],
        ['band7', 'band 7', 'band7'],
        ['buds3', 'buds 3', 'buds3'],
        ['buds4', 'buds 4', 'buds4'],
        ['buds5', 'buds 5', 'buds5'],
        ['xnote', 'x note', 'xnote'],
        ['xfold', 'x fold', 'xfold'],
        ['xflip', 'x flip', 'xflip'],
      );

      // Generator for brand prefix
      const brandGen = fc.constantFrom('vivo', 'VIVO', 'Vivo', 'apple', 'huawei', '');

      // Generator for suffix (network, capacity, color, etc.)
      const suffixGen = fc.constantFrom(
        '',
        ' 5G',
        ' 全网通5G',
        ' 蓝牙版',
        ' 12+512',
        ' (12+512)',
        ' 黑色',
        ' 5G 12+512 黑色',
        ' 蓝牙版 夏夜黑',
        '（WA2456C） 蓝牙版',
      );

      fc.assert(
        fc.property(
          compoundModelPairs,
          brandGen,
          suffixGen,
          ([concatenated, spaced, expected], brand, suffix) => {
            // Build test strings with concatenated and spaced versions
            const brandPrefix = brand ? `${brand} ` : '';
            const inputConcatenated = `${brandPrefix}${concatenated}${suffix}`;
            const inputSpaced = `${brandPrefix}${spaced}${suffix}`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(inputConcatenated);
            const modelSpaced = matcher.extractModel(inputSpaced);

            // Both should extract the same normalized model
            expect(modelConcatenated).toBe(expected);
            expect(modelSpaced).toBe(expected);
            expect(modelConcatenated).toBe(modelSpaced);
          }
        ),
        { numRuns: 100 } // Run at least 100 iterations as per design requirements
      );
    });

    test('Property 1: Complex compound models (S30 Pro mini) normalize consistently', () => {
      // Generator for complex model patterns with letter+number+modifier+optional_modifier
      // Examples: S30 Pro mini, iPhone 15 Pro Max, Mate60 Pro
      const letterPrefixGen = fc.constantFrom('S', 's', 'iPhone', 'iphone', 'Mate', 'mate', 'Y', 'y');
      const numberGen = fc.integer({ min: 1, max: 99 });
      const modifier1Gen = fc.constantFrom('Pro', 'pro', 'Max', 'max', 'Plus', 'plus', 'Ultra', 'ultra');
      const modifier2Gen = fc.constantFrom('', ' mini', ' Mini', ' max', ' Max', ' plus', ' Plus', ' ultra', ' Ultra');

      // Generator for spacing variations
      const spacingGen = fc.constantFrom('', ' ');

      // Generator for suffix
      const suffixGen = fc.constantFrom('', ' 5G', ' 12+512', ' 黑色', ' 5G 12+512 黑色');

      fc.assert(
        fc.property(
          letterPrefixGen,
          numberGen,
          modifier1Gen,
          modifier2Gen,
          spacingGen,
          suffixGen,
          (letter, number, mod1, mod2, spacing, suffix) => {
            // Build concatenated version: S30Promini
            const concatenated = `${letter}${number}${mod1}${mod2.trim()}${suffix}`;
            
            // Build spaced version: S30 Pro mini
            const spaced = `${letter}${spacing}${number}${spacing}${mod1}${mod2}${suffix}`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(concatenated);
            const modelSpaced = matcher.extractModel(spaced);

            // Both should extract the same model (or both null)
            // The normalized form should be consistent
            expect(modelConcatenated).toBe(modelSpaced);

            // If a model was extracted, it should be in lowercase without spaces
            if (modelConcatenated !== null) {
              expect(modelConcatenated).toBe(modelConcatenated.toLowerCase());
              expect(modelConcatenated).not.toContain(' ');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1: Case variations do not affect normalization consistency', () => {
      // Generator for compound models
      const compoundModelGen = fc.constantFrom(
        'watchgt',
        'watch5',
        'promini',
        'xnote',
        'band3',
      );

      // Generator for case variations
      const caseVariationGen = fc.constantFrom(
        (s: string) => s.toLowerCase(),
        (s: string) => s.toUpperCase(),
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
        (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''),
      );

      // Generator for brand and suffix
      const brandGen = fc.constantFrom('vivo', 'VIVO', 'Vivo', '');
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 12+512 黑色');

      fc.assert(
        fc.property(
          compoundModelGen,
          caseVariationGen,
          brandGen,
          suffixGen,
          (model, caseVariation, brand, suffix) => {
            // Apply case variation to the model
            const variedModel = caseVariation(model);
            const brandPrefix = brand ? `${brand} ` : '';
            const input = `${brandPrefix}${variedModel}${suffix}`;

            // Extract model
            const extractedModel = matcher.extractModel(input);

            // The extracted model should always be in lowercase
            if (extractedModel !== null) {
              expect(extractedModel).toBe(extractedModel.toLowerCase());
            }

            // Create a reference input with lowercase model
            const referenceInput = `${brandPrefix}${model.toLowerCase()}${suffix}`;
            const referenceModel = matcher.extractModel(referenceInput);

            // Both should extract the same model
            expect(extractedModel).toBe(referenceModel);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1: Parenthetical codes do not affect normalization consistency', () => {
      // Generator for compound models
      const compoundModelGen = fc.constantFrom(
        'watchgt',
        'watch5',
        'band3',
        'xnote',
      );

      // Generator for parenthetical codes
      const parentheticalGen = fc.constantFrom(
        '',
        '（WA2456C）',
        '(WA2456C)',
        '（TEST123）',
        '(MODEL-X)',
        '（WA2456C）(TEST)',
      );

      // Generator for brand and suffix
      const brandGen = fc.constantFrom('vivo', 'VIVO', '');
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 黑色');

      fc.assert(
        fc.property(
          compoundModelGen,
          parentheticalGen,
          brandGen,
          suffixGen,
          (model, parenthetical, brand, suffix) => {
            const brandPrefix = brand ? `${brand} ` : '';
            
            // Input with parenthetical code
            const inputWithCode = `${brandPrefix}${model}${parenthetical}${suffix}`;
            
            // Input without parenthetical code
            const inputWithoutCode = `${brandPrefix}${model}${suffix}`;

            // Extract models from both versions
            const modelWithCode = matcher.extractModel(inputWithCode);
            const modelWithoutCode = matcher.extractModel(inputWithoutCode);

            // Both should extract the same model
            expect(modelWithCode).toBe(modelWithoutCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1: Surrounding text does not affect compound model normalization', () => {
      // Generator for compound models with their expected normalized form
      const compoundModelPairs = fc.constantFrom(
        ['watchgt', 'watchgt'],
        ['watch5', 'watch5'],
        ['promini', 'promini'],
        ['xnote', 'xnote'],
      );

      // Generator for prefix text
      const prefixGen = fc.constantFrom(
        '',
        'vivo ',
        'VIVO ',
        '品牌 ',
        '全新 ',
      );

      // Generator for suffix text
      const suffixGen = fc.constantFrom(
        '',
        ' 5G',
        ' 全网通',
        ' 蓝牙版',
        ' 12+512',
        ' 黑色',
        ' 5G 12+512 黑色',
      );

      fc.assert(
        fc.property(
          compoundModelPairs,
          prefixGen,
          suffixGen,
          ([model, expected], prefix, suffix) => {
            // Build input with surrounding text
            const input = `${prefix}${model}${suffix}`;

            // Extract model
            const extractedModel = matcher.extractModel(input);

            // Should extract the expected normalized model
            expect(extractedModel).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: smart-match-accuracy-improvement, Property 2: 数字空格标准化一致性
  describe('Property 2: Number-Space Normalization Consistency', () => {
    /**
     * **Validates: Requirements 2.3.3**
     * 
     * Property: For any product name containing a "letter+number" format model (like "Watch5"),
     * the normalized model should be the same as the normalized result of its space-separated 
     * version (like "Watch 5").
     * 
     * This ensures that:
     * 1. Models with numbers are correctly identified regardless of spacing
     * 2. "Watch5" and "Watch 5" are treated as equivalent
     * 3. Users can input models with or without spaces between letters and numbers
     */
    test('Property 2: Letter+number models normalize consistently with spaced versions', () => {
      // Generator for letter+number model pairs
      // These are models that follow the pattern: word + digit(s)
      const letterNumberPairs = fc.constantFrom(
        // Format: [concatenated, spaced, expected_normalized]
        ['watch3', 'watch 3', 'watch3'],
        ['watch4', 'watch 4', 'watch4'],
        ['watch5', 'watch 5', 'watch5'],
        ['watch6', 'watch 6', 'watch6'],
        ['watch7', 'watch 7', 'watch7'],
        ['band3', 'band 3', 'band3'],
        ['band4', 'band 4', 'band4'],
        ['band5', 'band 5', 'band5'],
        ['band6', 'band 6', 'band6'],
        ['band7', 'band 7', 'band7'],
        ['buds3', 'buds 3', 'buds3'],
        ['buds4', 'buds 4', 'buds4'],
        ['buds5', 'buds 5', 'buds5'],
      );

      // Generator for brand prefix
      const brandGen = fc.constantFrom('vivo', 'VIVO', 'Vivo', 'apple', 'Apple', '');

      // Generator for suffix (network, version, capacity, color, etc.)
      const suffixGen = fc.constantFrom(
        '',
        ' 5G',
        ' 全网通5G',
        ' 蓝牙版',
        ' eSIM版',
        ' 12+512',
        ' (12+512)',
        ' 黑色',
        ' 辰夜黑',
        ' 夏夜黑',
        ' 5G 12+512 黑色',
        ' 蓝牙版 辰夜黑',
        ' 软胶 蓝牙版 夏夜黑',
      );

      fc.assert(
        fc.property(
          letterNumberPairs,
          brandGen,
          suffixGen,
          ([concatenated, spaced, expected], brand, suffix) => {
            // Build test strings with concatenated and spaced versions
            const brandPrefix = brand ? `${brand} ` : '';
            const inputConcatenated = `${brandPrefix}${concatenated}${suffix}`;
            const inputSpaced = `${brandPrefix}${spaced}${suffix}`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(inputConcatenated);
            const modelSpaced = matcher.extractModel(inputSpaced);

            // Both should extract the same normalized model
            expect(modelConcatenated).toBe(expected);
            expect(modelSpaced).toBe(expected);
            expect(modelConcatenated).toBe(modelSpaced);
          }
        ),
        { numRuns: 100 } // Run at least 100 iterations as per design requirements
      );
    });

    test('Property 2: Case variations do not affect number-space normalization', () => {
      // Generator for letter+number models
      const letterNumberGen = fc.constantFrom(
        'watch5',
        'watch3',
        'band5',
        'buds3',
      );

      // Generator for case variations
      const caseVariationGen = fc.constantFrom(
        (s: string) => s.toLowerCase(),
        (s: string) => s.toUpperCase(),
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
      );

      // Generator for spacing variations (with or without space before number)
      const spacingGen = fc.constantFrom('', ' ');

      // Generator for brand and suffix
      const brandGen = fc.constantFrom('vivo', 'VIVO', 'Vivo', '');
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 12+512 黑色');

      fc.assert(
        fc.property(
          letterNumberGen,
          caseVariationGen,
          spacingGen,
          brandGen,
          suffixGen,
          (model, caseVariation, spacing, brand, suffix) => {
            // Split model into letter and number parts
            const match = model.match(/^([a-z]+)(\d+)$/i);
            if (!match) return; // Skip if pattern doesn't match

            const [, letterPart, numberPart] = match;

            // Apply case variation to the letter part
            const variedLetterPart = caseVariation(letterPart);
            
            // Build concatenated and spaced versions
            const concatenated = `${variedLetterPart}${numberPart}`;
            const spaced = `${variedLetterPart}${spacing}${numberPart}`;

            const brandPrefix = brand ? `${brand} ` : '';
            const inputConcatenated = `${brandPrefix}${concatenated}${suffix}`;
            const inputSpaced = `${brandPrefix}${spaced}${suffix}`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(inputConcatenated);
            const modelSpaced = matcher.extractModel(inputSpaced);

            // Both should extract the same model
            expect(modelConcatenated).toBe(modelSpaced);

            // The extracted model should always be in lowercase
            if (modelConcatenated !== null) {
              expect(modelConcatenated).toBe(modelConcatenated.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 2: Parenthetical codes do not affect number-space normalization', () => {
      // Generator for letter+number models
      const letterNumberGen = fc.constantFrom(
        'watch5',
        'watch3',
        'band5',
        'buds3',
      );

      // Generator for parenthetical codes
      const parentheticalGen = fc.constantFrom(
        '',
        '（WA2456C）',
        '(WA2456C)',
        '（TEST123）',
        '(MODEL-X)',
      );

      // Generator for spacing variations
      const spacingGen = fc.constantFrom('', ' ');

      // Generator for brand and suffix
      const brandGen = fc.constantFrom('vivo', 'VIVO', '');
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 黑色');

      fc.assert(
        fc.property(
          letterNumberGen,
          parentheticalGen,
          spacingGen,
          brandGen,
          suffixGen,
          (model, parenthetical, spacing, brand, suffix) => {
            // Split model into letter and number parts
            const match = model.match(/^([a-z]+)(\d+)$/i);
            if (!match) return;

            const [, letterPart, numberPart] = match;

            const brandPrefix = brand ? `${brand} ` : '';
            
            // Build concatenated version with parenthetical code
            const concatenated = `${letterPart}${numberPart}`;
            const inputConcatenated = `${brandPrefix}${concatenated}${parenthetical}${suffix}`;
            
            // Build spaced version with parenthetical code
            const spaced = `${letterPart}${spacing}${numberPart}`;
            const inputSpaced = `${brandPrefix}${spaced}${parenthetical}${suffix}`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(inputConcatenated);
            const modelSpaced = matcher.extractModel(inputSpaced);

            // Both should extract the same model
            expect(modelConcatenated).toBe(modelSpaced);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 2: Surrounding text does not affect number-space normalization', () => {
      // Generator for letter+number models with expected normalized form
      const letterNumberPairs = fc.constantFrom(
        ['watch5', 'watch5'],
        ['watch3', 'watch3'],
        ['band5', 'band5'],
        ['buds3', 'buds3'],
      );

      // Generator for prefix text
      const prefixGen = fc.constantFrom(
        '',
        'vivo ',
        'VIVO ',
        '品牌 ',
        '全新 ',
      );

      // Generator for suffix text
      const suffixGen = fc.constantFrom(
        '',
        ' 5G',
        ' 全网通',
        ' 蓝牙版',
        ' eSIM版',
        ' 12+512',
        ' 黑色',
        ' 辰夜黑',
        ' 5G 12+512 黑色',
        ' 蓝牙版 软胶 辰夜黑',
      );

      // Generator for spacing variations
      const spacingGen = fc.constantFrom('', ' ');

      fc.assert(
        fc.property(
          letterNumberPairs,
          prefixGen,
          suffixGen,
          spacingGen,
          ([model, expected], prefix, suffix, spacing) => {
            // Split model into letter and number parts
            const match = model.match(/^([a-z]+)(\d+)$/i);
            if (!match) return;

            const [, letterPart, numberPart] = match;

            // Build concatenated and spaced versions with surrounding text
            const concatenated = `${prefix}${letterPart}${numberPart}${suffix}`;
            const spaced = `${prefix}${letterPart}${spacing}${numberPart}${suffix}`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(concatenated);
            const modelSpaced = matcher.extractModel(spaced);

            // Both should extract the expected normalized model
            expect(modelConcatenated).toBe(expected);
            expect(modelSpaced).toBe(expected);
            expect(modelConcatenated).toBe(modelSpaced);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 2: Multiple letter+number models in input extract consistently', () => {
      // Generator for letter+number models
      const letterNumberGen = fc.constantFrom(
        'watch5',
        'band3',
        'buds4',
      );

      // Generator for spacing variations
      const spacingGen = fc.constantFrom('', ' ');

      // Generator for additional text
      const additionalTextGen = fc.constantFrom(
        '',
        ' 和 ',
        ' 或 ',
        ' 以及 ',
      );

      fc.assert(
        fc.property(
          letterNumberGen,
          spacingGen,
          additionalTextGen,
          (model, spacing, additionalText) => {
            // Split model into letter and number parts
            const match = model.match(/^([a-z]+)(\d+)$/i);
            if (!match) return;

            const [, letterPart, numberPart] = match;

            // Build concatenated and spaced versions
            const concatenated = `${letterPart}${numberPart}`;
            const spaced = `${letterPart}${spacing}${numberPart}`;

            // Create inputs with additional text
            const inputConcatenated = `vivo ${concatenated}${additionalText}蓝牙版`;
            const inputSpaced = `vivo ${spaced}${additionalText}蓝牙版`;

            // Extract models from both versions
            const modelConcatenated = matcher.extractModel(inputConcatenated);
            const modelSpaced = matcher.extractModel(inputSpaced);

            // Both should extract the same model
            expect(modelConcatenated).toBe(modelSpaced);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: smart-match-accuracy-improvement, Property 3: 大小写标准化一致性
  describe('Property 3: Case Normalization Consistency', () => {
    /**
     * **Validates: Requirements 2.3.2**
     * 
     * Property: For any product name, different case forms (like "WATCH GT", "Watch GT", "watch gt")
     * should have the same normalized result.
     * 
     * This ensures that:
     * 1. Case variations do not affect model extraction
     * 2. Users can input models in any case (uppercase, lowercase, mixed case)
     * 3. The normalization process always produces lowercase output
     * 4. Case-insensitive matching works correctly
     */
    test('Property 3: Different case forms produce the same normalized result', () => {
      // Generator for product models (various types)
      const modelGen = fc.constantFrom(
        'watch gt',
        'watch 5',
        'band 3',
        'buds 5',
        'x note',
        'x fold',
        'pro mini',
        'pro max',
        's30 pro mini',
        'y300i',
        'mate60 pro',
      );

      // Generator for case transformation functions
      const caseTransformGen = fc.constantFrom(
        (s: string) => s.toLowerCase(),
        (s: string) => s.toUpperCase(),
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(), // Title case
        (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '), // Each word capitalized
        (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''), // Alternating case
        (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join(''), // Alternating case (reversed)
      );

      // Generator for brand prefix
      const brandGen = fc.constantFrom('vivo', 'VIVO', 'Vivo', 'apple', 'APPLE', 'Apple', '');

      // Generator for suffix
      const suffixGen = fc.constantFrom(
        '',
        ' 5G',
        ' 全网通5G',
        ' 蓝牙版',
        ' eSIM版',
        ' 12+512',
        ' (12+512)',
        ' 黑色',
        ' 辰夜黑',
        ' 夏夜黑',
        ' 5G 12+512 黑色',
      );

      fc.assert(
        fc.property(
          modelGen,
          caseTransformGen,
          brandGen,
          suffixGen,
          (model, caseTransform, brand, suffix) => {
            // Apply case transformation to the model
            const transformedModel = caseTransform(model);
            
            // Build input strings
            const brandPrefix = brand ? `${brand} ` : '';
            const input = `${brandPrefix}${transformedModel}${suffix}`;

            // Extract model from transformed input
            const extractedModel = matcher.extractModel(input);

            // Build reference input with lowercase model
            const referenceInput = `${brandPrefix}${model.toLowerCase()}${suffix}`;
            const referenceModel = matcher.extractModel(referenceInput);

            // Both should extract the same model
            expect(extractedModel).toBe(referenceModel);

            // The extracted model should always be in lowercase (if not null)
            if (extractedModel !== null) {
              expect(extractedModel).toBe(extractedModel.toLowerCase());
              expect(extractedModel).not.toMatch(/[A-Z]/); // No uppercase letters
            }
          }
        ),
        { numRuns: 100 } // Run at least 100 iterations as per design requirements
      );
    });

    test('Property 3: Case variations with compound models normalize consistently', () => {
      // Generator for compound model pairs (concatenated form)
      const compoundModelGen = fc.constantFrom(
        'watchgt',
        'watchse',
        'watch5',
        'promini',
        'promax',
        'xnote',
        'xfold',
        'band3',
        'buds5',
      );

      // Generator for case transformation functions
      const caseTransformGen = fc.constantFrom(
        (s: string) => s.toLowerCase(),
        (s: string) => s.toUpperCase(),
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
        (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''),
      );

      // Generator for brand and suffix
      const brandGen = fc.constantFrom('vivo', 'VIVO', 'Vivo', '');
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 12+512 黑色');

      fc.assert(
        fc.property(
          compoundModelGen,
          caseTransformGen,
          brandGen,
          suffixGen,
          (model, caseTransform, brand, suffix) => {
            // Apply case transformation
            const transformedModel = caseTransform(model);
            
            const brandPrefix = brand ? `${brand} ` : '';
            const input = `${brandPrefix}${transformedModel}${suffix}`;

            // Extract model
            const extractedModel = matcher.extractModel(input);

            // Build reference with lowercase
            const referenceInput = `${brandPrefix}${model.toLowerCase()}${suffix}`;
            const referenceModel = matcher.extractModel(referenceInput);

            // Should extract the same model
            expect(extractedModel).toBe(referenceModel);

            // Should always be lowercase
            if (extractedModel !== null) {
              expect(extractedModel).toBe(extractedModel.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Case variations with complex models normalize consistently', () => {
      // Generator for complex model patterns (letter+number+modifier)
      const letterPrefixGen = fc.constantFrom('s', 'y', 'mate', 'iphone');
      const numberGen = fc.integer({ min: 1, max: 99 });
      const modifierGen = fc.constantFrom('', 'pro', 'max', 'plus', 'ultra', 'mini', 'i', 'e', 'a');

      // Generator for case transformation
      const caseTransformGen = fc.constantFrom(
        (s: string) => s.toLowerCase(),
        (s: string) => s.toUpperCase(),
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
      );

      // Generator for suffix
      const suffixGen = fc.constantFrom('', ' 5G', ' 12+512', ' 黑色');

      fc.assert(
        fc.property(
          letterPrefixGen,
          numberGen,
          modifierGen,
          caseTransformGen,
          suffixGen,
          (letter, number, modifier, caseTransform, suffix) => {
            // Build model in lowercase
            const baseModel = `${letter}${number}${modifier}`;
            
            // Apply case transformation
            const transformedModel = caseTransform(baseModel);
            
            const input = `vivo ${transformedModel}${suffix}`;

            // Extract model
            const extractedModel = matcher.extractModel(input);

            // Build reference with lowercase
            const referenceInput = `vivo ${baseModel.toLowerCase()}${suffix}`;
            const referenceModel = matcher.extractModel(referenceInput);

            // Should extract the same model
            expect(extractedModel).toBe(referenceModel);

            // Should always be lowercase
            if (extractedModel !== null) {
              expect(extractedModel).toBe(extractedModel.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Brand case variations do not affect model extraction', () => {
      // Generator for models
      const modelGen = fc.constantFrom(
        'watch gt',
        'watch 5',
        'pro mini',
        'y300i',
        's30 pro mini',
      );

      // Generator for brands with different cases
      const brandCaseGen = fc.constantFrom(
        ['vivo', 'VIVO', 'Vivo', 'vIvO', 'ViVo'],
        ['apple', 'APPLE', 'Apple', 'aPpLe', 'ApPlE'],
        ['huawei', 'HUAWEI', 'Huawei', 'HuaWei', 'HUAWEI'],
      );

      // Generator for suffix
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 12+512 黑色');

      fc.assert(
        fc.property(
          modelGen,
          brandCaseGen,
          suffixGen,
          (model, brandCases, suffix) => {
            // Extract models from inputs with different brand cases
            const extractedModels = brandCases.map(brand => {
              const input = `${brand} ${model}${suffix}`;
              return matcher.extractModel(input);
            });

            // All extracted models should be the same
            const firstModel = extractedModels[0];
            extractedModels.forEach(extractedModel => {
              expect(extractedModel).toBe(firstModel);
            });

            // Should always be lowercase
            if (firstModel !== null) {
              expect(firstModel).toBe(firstModel.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Mixed case in surrounding text does not affect normalization', () => {
      // Generator for models
      const modelGen = fc.constantFrom(
        'watch gt',
        'watch 5',
        'pro mini',
        'band 3',
      );

      // Generator for prefix with various cases
      const prefixGen = fc.constantFrom(
        'vivo ',
        'VIVO ',
        'Vivo ',
        '全新 ',
        '全新 VIVO ',
        '全新 vivo ',
      );

      // Generator for suffix with various cases
      const suffixGen = fc.constantFrom(
        ' 5G',
        ' 5g',
        ' 蓝牙版',
        ' 蓝牙VERSION',
        ' 12+512',
        ' 12+512 黑色',
        ' 12+512 BLACK',
      );

      // Generator for case transformation on model
      const caseTransformGen = fc.constantFrom(
        (s: string) => s.toLowerCase(),
        (s: string) => s.toUpperCase(),
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
      );

      fc.assert(
        fc.property(
          modelGen,
          prefixGen,
          suffixGen,
          caseTransformGen,
          (model, prefix, suffix, caseTransform) => {
            // Apply case transformation to model
            const transformedModel = caseTransform(model);
            
            const input = `${prefix}${transformedModel}${suffix}`;

            // Extract model
            const extractedModel = matcher.extractModel(input);

            // Build reference with lowercase model
            const referenceInput = `${prefix}${model.toLowerCase()}${suffix}`;
            const referenceModel = matcher.extractModel(referenceInput);

            // Should extract the same model
            expect(extractedModel).toBe(referenceModel);

            // Should always be lowercase
            if (extractedModel !== null) {
              expect(extractedModel).toBe(extractedModel.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Extreme case variations normalize consistently', () => {
      // Generator for models
      const modelGen = fc.constantFrom(
        'watchgt',
        'watch5',
        'promini',
        'xnote',
      );

      // Generator for extreme case transformations
      const extremeCaseGen = fc.constantFrom(
        (s: string) => s.toUpperCase(), // ALL CAPS
        (s: string) => s.toLowerCase(), // all lowercase
        (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''), // aLtErNaTiNg
        (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join(''), // AlTeRnAtInG
        (s: string) => s.split('').map((c, i) => i % 3 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''), // Every 3rd
        (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(), // Title case
      );

      // Generator for suffix
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版', ' 12+512');

      fc.assert(
        fc.property(
          modelGen,
          extremeCaseGen,
          suffixGen,
          (model, extremeCase, suffix) => {
            // Apply extreme case transformation
            const transformedModel = extremeCase(model);
            
            const input = `vivo ${transformedModel}${suffix}`;

            // Extract model
            const extractedModel = matcher.extractModel(input);

            // Build reference with lowercase
            const referenceInput = `vivo ${model.toLowerCase()}${suffix}`;
            const referenceModel = matcher.extractModel(referenceInput);

            // Should extract the same model
            expect(extractedModel).toBe(referenceModel);

            // Should always be lowercase
            if (extractedModel !== null) {
              expect(extractedModel).toBe(extractedModel.toLowerCase());
              expect(extractedModel).not.toMatch(/[A-Z]/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Case normalization is idempotent', () => {
      // Generator for models with various cases
      const modelGen = fc.constantFrom(
        'WATCH GT',
        'Watch GT',
        'watch gt',
        'WaTcH gT',
        'WATCH 5',
        'Watch 5',
        'watch 5',
        'PRO MINI',
        'Pro Mini',
        'pro mini',
      );

      // Generator for brand and suffix
      const brandGen = fc.constantFrom('vivo', 'VIVO', '');
      const suffixGen = fc.constantFrom('', ' 5G', ' 蓝牙版');

      fc.assert(
        fc.property(
          modelGen,
          brandGen,
          suffixGen,
          (model, brand, suffix) => {
            const brandPrefix = brand ? `${brand} ` : '';
            const input = `${brandPrefix}${model}${suffix}`;

            // Extract model once
            const extractedModel1 = matcher.extractModel(input);

            // If we got a model, use it to build a new input and extract again
            if (extractedModel1 !== null) {
              const input2 = `${brandPrefix}${extractedModel1}${suffix}`;
              const extractedModel2 = matcher.extractModel(input2);

              // Should extract the same model (idempotent)
              expect(extractedModel2).toBe(extractedModel1);

              // Should be lowercase
              expect(extractedModel1).toBe(extractedModel1.toLowerCase());
              expect(extractedModel2).toBe(extractedModel2.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
