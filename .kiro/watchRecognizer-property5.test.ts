/**
 * Property-Based Test: Watch Model Code Extraction
 * 属性测试：手表型号代码提取
 * 
 * Feature: smart-match-optimization
 * Property 5: 手表型号代码提取
 * 
 * **Validates: Requirements 2.2**
 * 
 * Property: For any watch product name containing a model code in parentheses,
 * the watch recognizer should correctly extract the model code.
 */

import * as fc from 'fast-check';
import { watchRecognizer } from './watchRecognizer';

describe('Property 5: 手表型号代码提取', () => {
  /**
   * Property Test: Model codes in parentheses are correctly extracted
   * 
   * For any watch product with model code in parentheses (format: XX####X),
   * extractWatchModelCode should return the correct model code
   */
  it('should extract model codes in parentheses (format: XX####X)', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with model codes in parentheses
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung', '华为', '小米'),
          watchKeyword: fc.constantFrom('Watch', '手表', 'SmartWatch'),
          model: fc.option(fc.constantFrom('GT', 'FIT4', 'Series 8', 'Pro', 'Ultra', 'SE'), { nil: '' }),
          // Model code: 2 letters + 4 digits + optional letter
          modelCodePrefix: fc.constantFrom('WA', 'GT', 'FT', 'AP', 'SM', 'HW', 'MI', 'OP'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
          modelCodeSuffix: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'), { nil: '' }),
          // Parentheses type
          parenthesesType: fc.constantFrom('()', '（）'), // English or Chinese parentheses
          attributes: fc.option(
            fc.constantFrom('蓝牙版', 'eSIM版', '4G版', '黑色', '白色', '软胶', '皮革', '42mm', '46mm'),
            { nil: '' }
          ),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber, modelCodeSuffix, parenthesesType, attributes }) => {
          // Construct model code
          const modelCode = `${modelCodePrefix}${modelCodeNumber}${modelCodeSuffix}`;
          
          // Construct product name with model code in parentheses
          const openParen = parenthesesType[0];
          const closeParen = parenthesesType[1];
          const parts = [
            brand,
            watchKeyword,
            model,
            `${openParen}${modelCode}${closeParen}`,
            attributes
          ].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract the correct model code (uppercase)
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model codes in parentheses with lowercase letters are extracted and uppercased
   * 
   * For any watch product with lowercase model code in parentheses,
   * extractWatchModelCode should return the uppercased model code
   */
  it('should extract and uppercase model codes with lowercase letters', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with lowercase model codes
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          watchKeyword: fc.constantFrom('Watch', '手表'),
          model: fc.option(fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra'), { nil: '' }),
          // Model code with mixed case
          modelCodePrefix: fc.constantFrom('wa', 'gt', 'ft', 'Wa', 'Gt', 'Ft', 'WA', 'GT', 'FT'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
          modelCodeSuffix: fc.option(fc.constantFrom('a', 'b', 'c', 'A', 'B', 'C'), { nil: '' }),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber, modelCodeSuffix }) => {
          // Construct model code with mixed case
          const modelCode = `${modelCodePrefix}${modelCodeNumber}${modelCodeSuffix}`;
          
          // Construct product name
          const productName = `${brand} ${watchKeyword} ${model} (${modelCode})`.trim();
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract and uppercase the model code
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model codes without optional suffix letter are extracted
   * 
   * For any watch product with model code without suffix letter (format: XX####),
   * extractWatchModelCode should return the correct model code
   */
  it('should extract model codes without optional suffix letter', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with model codes without suffix
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung'),
          watchKeyword: fc.constantFrom('Watch', '手表', 'SmartWatch'),
          model: fc.option(fc.constantFrom('GT', 'FIT4', 'Series 8', 'Pro', 'Ultra'), { nil: '' }),
          modelCodePrefix: fc.constantFrom('WA', 'GT', 'FT', 'AP', 'SM', 'HW', 'MI', 'OP'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber }) => {
          // Construct model code without suffix
          const modelCode = `${modelCodePrefix}${modelCodeNumber}`;
          
          // Construct product name
          const productName = `${brand} ${watchKeyword} ${model} (${modelCode})`.trim();
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract the correct model code
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model codes with Chinese parentheses are extracted
   * 
   * For any watch product with model code in Chinese parentheses （），
   * extractWatchModelCode should return the correct model code
   */
  it('should extract model codes in Chinese parentheses', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with Chinese parentheses
        fc.record({
          brand: fc.constantFrom('华为', '小米', 'VIVO', 'OPPO', '荣耀'),
          watchKeyword: fc.constantFrom('手表', '智能手表'),
          model: fc.option(fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra', '旗舰版'), { nil: '' }),
          modelCodePrefix: fc.constantFrom('WA', 'GT', 'FT', 'HW', 'MI', 'OP'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
          modelCodeSuffix: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: '' }),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber, modelCodeSuffix }) => {
          // Construct model code
          const modelCode = `${modelCodePrefix}${modelCodeNumber}${modelCodeSuffix}`;
          
          // Construct product name with Chinese parentheses
          const productName = `${brand} ${watchKeyword} ${model} （${modelCode}）`.trim();
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract the correct model code
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model codes with surrounding attributes are extracted
   * 
   * For any watch product with model code and surrounding attributes,
   * extractWatchModelCode should return the correct model code
   */
  it('should extract model codes with surrounding attributes', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with model codes and attributes
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung'),
          watchKeyword: fc.constantFrom('Watch', '手表', 'SmartWatch'),
          model: fc.constantFrom('GT', 'FIT4', 'Series 8', 'Pro', 'Ultra', 'SE'),
          modelCodePrefix: fc.constantFrom('WA', 'GT', 'FT', 'AP', 'SM', 'HW', 'MI', 'OP'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
          modelCodeSuffix: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: '' }),
          connectionType: fc.constantFrom('蓝牙版', 'eSIM版', '4G版', '5G版', 'LTE版'),
          color: fc.constantFrom('黑色', '白色', '银色', '金色', '夏夜黑', '星云灰', '月光银'),
          strapMaterial: fc.constantFrom('软胶', '皮革', '金属', '硅胶', '不锈钢'),
          size: fc.constantFrom('38mm', '40mm', '42mm', '44mm', '46mm', '49mm'),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber, modelCodeSuffix, connectionType, color, strapMaterial, size }) => {
          // Construct model code
          const modelCode = `${modelCodePrefix}${modelCodeNumber}${modelCodeSuffix}`;
          
          // Construct product name with model code and attributes
          const productName = `${brand} ${watchKeyword} ${model} (${modelCode}) ${connectionType} ${color} ${strapMaterial} ${size}`;
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract the correct model code
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model codes with extra whitespace around parentheses are extracted
   * 
   * For any watch product with extra whitespace around model code parentheses,
   * extractWatchModelCode should return the correct model code
   */
  it('should extract model codes with extra whitespace around parentheses', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with extra whitespace
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          watchKeyword: fc.constantFrom('Watch', '手表'),
          model: fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra'),
          modelCodePrefix: fc.constantFrom('WA', 'GT', 'FT', 'HW', 'MI', 'OP'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
          modelCodeSuffix: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: '' }),
          spacesBefore: fc.integer({ min: 1, max: 5 }),
          spacesAfter: fc.integer({ min: 1, max: 5 }),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber, modelCodeSuffix, spacesBefore, spacesAfter }) => {
          // Construct model code
          const modelCode = `${modelCodePrefix}${modelCodeNumber}${modelCodeSuffix}`;
          
          // Construct product name with extra whitespace
          const beforeSpaces = ' '.repeat(spacesBefore);
          const afterSpaces = ' '.repeat(spacesAfter);
          const productName = `${brand} ${watchKeyword} ${model}${beforeSpaces}(${modelCode})${afterSpaces}`;
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract the correct model code
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Products without model codes return null
   * 
   * For any watch product without model code in parentheses,
   * extractWatchModelCode should return null
   */
  it('should return null for products without model codes', () => {
    fc.assert(
      fc.property(
        // Generate watch product names without model codes
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung'),
          watchKeyword: fc.constantFrom('Watch', '手表', 'SmartWatch'),
          model: fc.constantFrom('GT', 'FIT4', 'Series 8', 'Pro', 'Ultra', 'SE'),
          attributes: fc.option(
            fc.constantFrom('蓝牙版', 'eSIM版', '4G版', '黑色', '白色', '软胶', '皮革', '42mm', '46mm'),
            { nil: '' }
          ),
        }),
        ({ brand, watchKeyword, model, attributes }) => {
          // Construct product name without model code
          const parts = [brand, watchKeyword, model, attributes].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should return null (no model code found)
          expect(extractedCode).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Empty or null input returns null
   * 
   * For any empty or null input, extractWatchModelCode should return null
   */
  it('should return null for empty or null input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
        (input) => {
          // Extract model code from empty/whitespace input
          const extractedCode = watchRecognizer.extractWatchModelCode(input);
          
          // Should return null
          expect(extractedCode).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Real-world watch product examples
   * 
   * Test with real-world watch product names from requirements
   */
  it('should extract model codes from real-world watch product examples', () => {
    const realWorldExamples = [
      { name: 'VIVO Watch GT (WA2456C)', expectedCode: 'WA2456C' },
      { name: 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm', expectedCode: 'WA2456C' },
      { name: 'Huawei Watch FIT4 (FT1234A)', expectedCode: 'FT1234A' },
      { name: '华为手表 FIT4 （GT5678B）', expectedCode: 'GT5678B' },
      { name: 'Apple Watch Series 8 (AP9999)', expectedCode: 'AP9999' },
      { name: 'Samsung SmartWatch (SM1111C)', expectedCode: 'SM1111C' },
      { name: 'OPPO Watch 2 (OP2222D) eSIM版', expectedCode: 'OP2222D' },
      { name: 'Xiaomi Watch S1 (MI3333E) 金属', expectedCode: 'MI3333E' },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...realWorldExamples),
        ({ name, expectedCode }) => {
          // Extract model code from real-world example
          const extractedCode = watchRecognizer.extractWatchModelCode(name);
          
          // Should extract the expected model code
          expect(extractedCode).toBe(expectedCode);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Model codes without parentheses but matching pattern are extracted
   * 
   * For any watch product with model code pattern (XX####X) without parentheses,
   * extractWatchModelCode should still extract the model code
   */
  it('should extract model codes without parentheses if they match the pattern', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with model codes without parentheses
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          watchKeyword: fc.constantFrom('Watch', '手表'),
          model: fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra'),
          modelCodePrefix: fc.constantFrom('WA', 'GT', 'FT', 'HW', 'MI', 'OP'),
          modelCodeNumber: fc.integer({ min: 1000, max: 9999 }),
          modelCodeSuffix: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: '' }),
        }),
        ({ brand, watchKeyword, model, modelCodePrefix, modelCodeNumber, modelCodeSuffix }) => {
          // Construct model code
          const modelCode = `${modelCodePrefix}${modelCodeNumber}${modelCodeSuffix}`;
          
          // Construct product name without parentheses
          const productName = `${brand} ${watchKeyword} ${model} ${modelCode}`;
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should extract the correct model code
          expect(extractedCode).toBe(modelCode.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Invalid model code patterns are not extracted
   * 
   * For any product with invalid model code patterns (wrong format),
   * extractWatchModelCode should return null
   */
  it('should return null for invalid model code patterns', () => {
    fc.assert(
      fc.property(
        // Generate watch product names with invalid model codes
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          watchKeyword: fc.constantFrom('Watch', '手表'),
          model: fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra'),
          // Invalid patterns: wrong number of letters/digits
          invalidCode: fc.constantFrom(
            'A1234',      // Only 1 letter
            'ABC1234',    // 3 letters
            'AB123',      // Only 3 digits
            'AB12345',    // 5 digits
            '1234AB',     // Digits first
            'ABCD',       // No digits
            '1234',       // Only digits
          ),
        }),
        ({ brand, watchKeyword, model, invalidCode }) => {
          // Construct product name with invalid model code
          const productName = `${brand} ${watchKeyword} ${model} (${invalidCode})`;
          
          // Extract model code
          const extractedCode = watchRecognizer.extractWatchModelCode(productName);
          
          // Should return null (invalid pattern)
          expect(extractedCode).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
