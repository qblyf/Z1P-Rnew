/**
 * Property-Based Test: Watch Product Recognition
 * 属性测试：手表产品识别
 * 
 * Feature: smart-match-optimization
 * Property 4: 手表产品识别
 * 
 * **Validates: Requirements 2.1**
 * 
 * Property: For any product name containing watch keywords (Watch, 手表, etc.),
 * the watch recognizer should correctly identify it as a watch type.
 */

import * as fc from 'fast-check';
import { watchRecognizer } from './watchRecognizer';

describe('Property 4: 手表产品识别', () => {
  /**
   * Property Test: Products with watch keywords are recognized as watches
   * 
   * For any product name containing watch keywords, isWatchProduct should return true
   */
  it('should recognize products with "watch" keyword as watch type', () => {
    fc.assert(
      fc.property(
        // Generate product names with "watch" keyword
        fc.record({
          prefix: fc.option(fc.constantFrom('Apple', 'Samsung', 'VIVO', 'Huawei', 'Xiaomi', 'OPPO', ''), { nil: '' }),
          watchKeyword: fc.constantFrom('Watch', 'watch', 'WATCH', 'WaTcH'),
          suffix: fc.option(fc.constantFrom('GT', 'Series 8', 'Pro', 'FIT4', 'Ultra', 'SE', ''), { nil: '' }),
        }),
        ({ prefix, watchKeyword, suffix }) => {
          // Construct product name with watch keyword
          const parts = [prefix, watchKeyword, suffix].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Products with Chinese "手表" keyword are recognized as watches
   * 
   * For any product name containing "手表", isWatchProduct should return true
   */
  it('should recognize products with "手表" keyword as watch type', () => {
    fc.assert(
      fc.property(
        // Generate product names with "手表" keyword
        fc.record({
          prefix: fc.option(fc.constantFrom('华为', '小米', 'VIVO', 'OPPO', '苹果', '三星', ''), { nil: '' }),
          watchKeyword: fc.constant('手表'),
          suffix: fc.option(fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra', '旗舰版', '标准版', ''), { nil: '' }),
        }),
        ({ prefix, watchKeyword, suffix }) => {
          // Construct product name with watch keyword
          const parts = [prefix, watchKeyword, suffix].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Products with "smartwatch" keyword are recognized as watches
   * 
   * For any product name containing "smartwatch", isWatchProduct should return true
   */
  it('should recognize products with "smartwatch" keyword as watch type', () => {
    fc.assert(
      fc.property(
        // Generate product names with "smartwatch" keyword
        fc.record({
          prefix: fc.option(fc.constantFrom('Apple', 'Samsung', 'Garmin', 'Fitbit', 'Amazfit', ''), { nil: '' }),
          watchKeyword: fc.constantFrom('SmartWatch', 'smartwatch', 'SMARTWATCH', 'Smartwatch'),
          suffix: fc.option(fc.constantFrom('Pro', 'Plus', 'Ultra', 'Lite', ''), { nil: '' }),
        }),
        ({ prefix, watchKeyword, suffix }) => {
          // Construct product name with watch keyword
          const parts = [prefix, watchKeyword, suffix].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Products with "智能手表" keyword are recognized as watches
   * 
   * For any product name containing "智能手表", isWatchProduct should return true
   */
  it('should recognize products with "智能手表" keyword as watch type', () => {
    fc.assert(
      fc.property(
        // Generate product names with "智能手表" keyword
        fc.record({
          prefix: fc.option(fc.constantFrom('华为', '小米', 'VIVO', 'OPPO', '荣耀', ''), { nil: '' }),
          watchKeyword: fc.constant('智能手表'),
          suffix: fc.option(fc.constantFrom('GT', 'FIT', 'Pro', 'Max', '旗舰版', ''), { nil: '' }),
        }),
        ({ prefix, watchKeyword, suffix }) => {
          // Construct product name with watch keyword
          const parts = [prefix, watchKeyword, suffix].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Watch products with model codes are recognized
   * 
   * For any watch product with model code, isWatchProduct should return true
   */
  it('should recognize watch products with model codes', () => {
    fc.assert(
      fc.property(
        // Generate watch products with model codes
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung'),
          watchKeyword: fc.constantFrom('Watch', '手表'),
          model: fc.constantFrom('GT', 'FIT4', 'Series 8', 'Pro', 'Ultra'),
          modelCode: fc.tuple(
            fc.constantFrom('WA', 'GT', 'FT', 'AP', 'SM'),
            fc.integer({ min: 1000, max: 9999 }),
            fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: '' })
          ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
          attributes: fc.option(
            fc.constantFrom('蓝牙版', 'eSIM版', '4G版', '黑色', '白色', '软胶', '皮革', '42mm', '46mm'),
            { nil: '' }
          ),
        }),
        ({ brand, watchKeyword, model, modelCode, attributes }) => {
          // Construct product name with model code
          const parts = [
            brand,
            watchKeyword,
            model,
            `(${modelCode})`,
            attributes
          ].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Watch products with various attributes are recognized
   * 
   * For any watch product with attributes, isWatchProduct should return true
   */
  it('should recognize watch products with various attributes', () => {
    fc.assert(
      fc.property(
        // Generate watch products with various attributes
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung', '华为', '小米'),
          watchKeyword: fc.constantFrom('Watch', 'watch', '手表', 'SmartWatch', '智能手表'),
          model: fc.option(fc.constantFrom('GT', 'FIT4', 'Series 8', 'Pro', 'Ultra', 'SE'), { nil: '' }),
          connectionType: fc.option(fc.constantFrom('蓝牙版', 'eSIM版', '4G版', '5G版', 'LTE版', 'GPS版'), { nil: '' }),
          color: fc.option(fc.constantFrom('黑色', '白色', '银色', '金色', '夏夜黑', '星云灰', '月光银'), { nil: '' }),
          strapMaterial: fc.option(fc.constantFrom('软胶', '皮革', '金属', '硅胶', '不锈钢'), { nil: '' }),
          size: fc.option(fc.constantFrom('38mm', '40mm', '42mm', '44mm', '46mm', '49mm'), { nil: '' }),
        }),
        ({ brand, watchKeyword, model, connectionType, color, strapMaterial, size }) => {
          // Construct product name with various attributes
          const parts = [
            brand,
            watchKeyword,
            model,
            connectionType,
            color,
            strapMaterial,
            size
          ].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Non-watch products are not recognized as watches
   * 
   * For any product name without watch keywords, isWatchProduct should return false
   */
  it('should not recognize non-watch products as watch type', () => {
    fc.assert(
      fc.property(
        // Generate non-watch product names
        fc.record({
          brand: fc.constantFrom('Apple', 'Samsung', 'VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          productType: fc.constantFrom('iPhone', 'iPad', 'MacBook', 'Galaxy', 'Mate', 'Nova', 'Redmi', 'Mi'),
          model: fc.option(fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE', 'Air', 'Mini'), { nil: '' }),
          number: fc.option(fc.integer({ min: 1, max: 99 }), { nil: null }),
        }),
        ({ brand, productType, model, number }) => {
          // Construct non-watch product name
          const parts = [
            brand,
            productType,
            number !== null ? number.toString() : '',
            model
          ].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should NOT be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Watch keyword case insensitivity
   * 
   * For any watch keyword in any case combination, isWatchProduct should return true
   */
  it('should recognize watch products regardless of keyword case', () => {
    fc.assert(
      fc.property(
        // Generate watch keywords with random case
        fc.constantFrom('watch', 'Watch', 'WATCH', 'WaTcH', 'wAtCh', 'WAtch'),
        fc.option(fc.constantFrom('Apple', 'Samsung', 'VIVO', 'Huawei'), { nil: '' }),
        fc.option(fc.constantFrom('GT', 'Pro', 'Ultra', 'SE'), { nil: '' }),
        (watchKeyword, brand, model) => {
          // Construct product name with watch keyword in various cases
          const parts = [brand, watchKeyword, model].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Should be recognized as a watch product regardless of case
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Watch products with extra whitespace are recognized
   * 
   * For any watch product with extra whitespace, isWatchProduct should return true
   */
  it('should recognize watch products with extra whitespace', () => {
    fc.assert(
      fc.property(
        // Generate watch products with extra whitespace
        fc.constantFrom('VIVO', 'Huawei', 'Apple', 'Samsung'),
        fc.constantFrom('Watch', '手表', 'SmartWatch'),
        fc.constantFrom('GT', 'Pro', 'Ultra', 'FIT4'),
        fc.integer({ min: 1, max: 5 }), // Number of spaces
        (brand, watchKeyword, model, numSpaces) => {
          // Construct product name with extra whitespace
          const spaces = ' '.repeat(numSpaces);
          const productName = `${spaces}${brand}${spaces}${watchKeyword}${spaces}${model}${spaces}`;
          
          // Should be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Empty or whitespace-only strings are not watches
   * 
   * For any empty or whitespace-only string, isWatchProduct should return false
   */
  it('should not recognize empty or whitespace-only strings as watches', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (numSpaces) => {
          const whitespaceString = ' '.repeat(numSpaces);
          
          // Should NOT be recognized as a watch product
          const isWatch = watchRecognizer.isWatchProduct(whitespaceString);
          
          expect(isWatch).toBe(false);
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
  it('should recognize real-world watch product examples', () => {
    const realWorldExamples = [
      'VIVO Watch GT',
      'VIVO Watch GT (WA2456C)',
      'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm',
      'Huawei Watch FIT4',
      '华为手表 FIT4',
      'Apple Watch Series 8',
      'Samsung SmartWatch',
      '小米智能手表',
      'OPPO Watch 2',
      'Xiaomi Watch S1',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...realWorldExamples),
        (productName) => {
          // All real-world examples should be recognized as watch products
          const isWatch = watchRecognizer.isWatchProduct(productName);
          
          expect(isWatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
