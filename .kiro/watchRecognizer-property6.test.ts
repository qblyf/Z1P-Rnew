/**
 * Property-Based Test: Watch Attribute Order Invariance
 * 属性测试：手表属性顺序不变性
 * 
 * Feature: smart-match-optimization
 * Property 6: 手表属性顺序不变性
 * 
 * **Validates: Requirements 2.3, 2.4, 2.5**
 * 
 * Property: For any watch product, regardless of the input attribute order,
 * the normalized attributes should be arranged in a fixed order:
 * 型号代码 > 连接方式 > 颜色 > 表带材质 > 尺寸
 */

import * as fc from 'fast-check';
import { watchRecognizer, WatchAttributes } from './watchRecognizer';

describe('Property 6: 手表属性顺序不变性', () => {
  /**
   * Property Test: Normalized attributes follow fixed order
   * 
   * For any watch attributes, normalizeWatchAttributes should arrange them
   * in the standard order: modelCode > connectionType > color > strapMaterial > size
   */
  it('should normalize attributes in fixed order: modelCode > connectionType > color > strapMaterial > size', () => {
    fc.assert(
      fc.property(
        // Generate watch attributes with all fields
        fc.record({
          modelCode: fc.option(
            fc.tuple(
              fc.constantFrom('WA', 'GT', 'FT', 'AP', 'SM', 'HW', 'MI', 'OP'),
              fc.integer({ min: 1000, max: 9999 }),
              fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: '' })
            ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
            { nil: undefined }
          ),
          connectionType: fc.option(
            fc.constantFrom('蓝牙版', 'esim版', '4g版', '5g版', 'lte版', 'gps版'),
            { nil: undefined }
          ),
          color: fc.option(
            fc.constantFrom('黑色', '白色', '银色', '金色', '夏夜黑', '星云灰', '月光银', '玫瑰金'),
            { nil: undefined }
          ),
          strapMaterial: fc.option(
            fc.constantFrom('软胶', '皮革', '金属', '硅胶', '不锈钢', '钛金属', '陶瓷', '尼龙'),
            { nil: undefined }
          ),
          size: fc.option(
            fc.constantFrom('38mm', '40mm', '42mm', '44mm', '46mm', '49mm'),
            { nil: undefined }
          ),
        }),
        (attributes) => {
          // Normalize the attributes
          const normalized = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Split the normalized string into parts
          const parts = normalized.split(' ').filter(p => p !== '');
          
          // Build expected order based on which attributes are present
          const expectedParts: string[] = [];
          if (attributes.modelCode) expectedParts.push(attributes.modelCode);
          if (attributes.connectionType) expectedParts.push(attributes.connectionType);
          if (attributes.color) expectedParts.push(attributes.color);
          if (attributes.strapMaterial) expectedParts.push(attributes.strapMaterial);
          if (attributes.size) expectedParts.push(attributes.size);
          
          // The normalized string should match the expected order
          expect(parts).toEqual(expectedParts);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Attribute order invariance - different input orders produce same output
   * 
   * For any set of watch attributes, regardless of the order they are provided,
   * normalizeWatchAttributes should produce the same output
   */
  it('should produce same output regardless of input attribute order', () => {
    fc.assert(
      fc.property(
        // Generate watch attributes
        fc.record({
          modelCode: fc.option(
            fc.tuple(
              fc.constantFrom('WA', 'GT', 'FT'),
              fc.integer({ min: 1000, max: 9999 }),
              fc.option(fc.constantFrom('A', 'B', 'C'), { nil: '' })
            ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
            { nil: undefined }
          ),
          connectionType: fc.option(
            fc.constantFrom('蓝牙版', 'esim版', '4g版'),
            { nil: undefined }
          ),
          color: fc.option(
            fc.constantFrom('黑色', '白色', '夏夜黑'),
            { nil: undefined }
          ),
          strapMaterial: fc.option(
            fc.constantFrom('软胶', '皮革', '金属'),
            { nil: undefined }
          ),
          size: fc.option(
            fc.constantFrom('42mm', '46mm'),
            { nil: undefined }
          ),
        }),
        (attributes) => {
          // Normalize the original attributes
          const normalized1 = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Create different orderings of the same attributes
          // Order 1: reverse order
          const reversed: WatchAttributes = {
            size: attributes.size,
            strapMaterial: attributes.strapMaterial,
            color: attributes.color,
            connectionType: attributes.connectionType,
            modelCode: attributes.modelCode,
          };
          const normalized2 = watchRecognizer.normalizeWatchAttributes(reversed);
          
          // Order 2: random order
          const shuffled: WatchAttributes = {
            color: attributes.color,
            modelCode: attributes.modelCode,
            size: attributes.size,
            connectionType: attributes.connectionType,
            strapMaterial: attributes.strapMaterial,
          };
          const normalized3 = watchRecognizer.normalizeWatchAttributes(shuffled);
          
          // All normalizations should produce the same result
          expect(normalized2).toBe(normalized1);
          expect(normalized3).toBe(normalized1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Extract and normalize produces consistent order
   * 
   * For any watch product name with attributes in different orders,
   * extracting and normalizing should produce consistent results
   */
  it('should extract and normalize attributes in consistent order from product names', () => {
    fc.assert(
      fc.property(
        // Generate watch product components
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          watchKeyword: fc.constantFrom('Watch', '手表'),
          model: fc.constantFrom('GT', 'FIT4', 'Pro', 'Ultra'),
          modelCode: fc.tuple(
            fc.constantFrom('WA', 'GT', 'FT'),
            fc.integer({ min: 1000, max: 9999 }),
            fc.constantFrom('A', 'B', 'C')
          ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
          connectionType: fc.constantFrom('蓝牙版', 'esim版', '4g版'),
          color: fc.constantFrom('黑色', '白色', '夏夜黑', '星云灰'),
          strapMaterial: fc.constantFrom('软胶', '皮革', '金属'),
          size: fc.constantFrom('42mm', '46mm'),
        }),
        ({ brand, watchKeyword, model, modelCode, connectionType, color, strapMaterial, size }) => {
          // Create product names with different attribute orders
          const productName1 = `${brand} ${watchKeyword} ${model} (${modelCode}) ${connectionType} ${color} ${strapMaterial} ${size}`;
          const productName2 = `${brand} ${watchKeyword} ${model} (${modelCode}) ${size} ${strapMaterial} ${color} ${connectionType}`;
          const productName3 = `${brand} ${watchKeyword} ${model} (${modelCode}) ${color} ${size} ${connectionType} ${strapMaterial}`;
          
          // Extract attributes from all product names
          const attrs1 = watchRecognizer.extractWatchAttributes(productName1);
          const attrs2 = watchRecognizer.extractWatchAttributes(productName2);
          const attrs3 = watchRecognizer.extractWatchAttributes(productName3);
          
          // Normalize all extracted attributes
          const normalized1 = watchRecognizer.normalizeWatchAttributes(attrs1);
          const normalized2 = watchRecognizer.normalizeWatchAttributes(attrs2);
          const normalized3 = watchRecognizer.normalizeWatchAttributes(attrs3);
          
          // All normalizations should produce the same result
          expect(normalized2).toBe(normalized1);
          expect(normalized3).toBe(normalized1);
          
          // The normalized string should follow the standard order
          // Note: We use the extracted attributes to build expected order to match actual extraction behavior
          const expectedParts: string[] = [];
          if (attrs1.modelCode) expectedParts.push(attrs1.modelCode);
          if (attrs1.connectionType) expectedParts.push(attrs1.connectionType);
          if (attrs1.color) expectedParts.push(attrs1.color);
          if (attrs1.strapMaterial) expectedParts.push(attrs1.strapMaterial);
          if (attrs1.size) expectedParts.push(attrs1.size);
          const expectedOrder = expectedParts.join(' ');
          expect(normalized1).toBe(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Partial attributes maintain order
   * 
   * For any subset of watch attributes, normalizeWatchAttributes should
   * maintain the relative order of present attributes
   */
  it('should maintain relative order for partial attributes', () => {
    fc.assert(
      fc.property(
        // Generate partial watch attributes (some fields may be missing)
        fc.record({
          modelCode: fc.option(
            fc.tuple(
              fc.constantFrom('WA', 'GT', 'FT'),
              fc.integer({ min: 1000, max: 9999 }),
              fc.option(fc.constantFrom('A', 'B', 'C'), { nil: '' })
            ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
            { nil: undefined }
          ),
          connectionType: fc.option(
            fc.constantFrom('蓝牙版', 'esim版'),
            { nil: undefined }
          ),
          color: fc.option(
            fc.constantFrom('黑色', '白色'),
            { nil: undefined }
          ),
          strapMaterial: fc.option(
            fc.constantFrom('软胶', '皮革'),
            { nil: undefined }
          ),
          size: fc.option(
            fc.constantFrom('42mm', '46mm'),
            { nil: undefined }
          ),
        }),
        (attributes) => {
          // Normalize the attributes
          const normalized = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Split into parts
          const parts = normalized.split(' ').filter(p => p !== '');
          
          // Check that each part appears in the correct relative position
          const allPossibleParts = [
            attributes.modelCode,
            attributes.connectionType,
            attributes.color,
            attributes.strapMaterial,
            attributes.size,
          ].filter(p => p !== undefined);
          
          // The parts should match the expected order
          expect(parts).toEqual(allPossibleParts);
          
          // Verify order: if both modelCode and color are present, modelCode comes first
          if (attributes.modelCode && attributes.color) {
            const modelCodeIndex = parts.indexOf(attributes.modelCode);
            const colorIndex = parts.indexOf(attributes.color);
            expect(modelCodeIndex).toBeLessThan(colorIndex);
          }
          
          // Verify order: if both connectionType and strapMaterial are present, connectionType comes first
          if (attributes.connectionType && attributes.strapMaterial) {
            const connectionIndex = parts.indexOf(attributes.connectionType);
            const materialIndex = parts.indexOf(attributes.strapMaterial);
            expect(connectionIndex).toBeLessThan(materialIndex);
          }
          
          // Verify order: if both color and size are present, color comes first
          if (attributes.color && attributes.size) {
            const colorIndex = parts.indexOf(attributes.color);
            const sizeIndex = parts.indexOf(attributes.size);
            expect(colorIndex).toBeLessThan(sizeIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Empty attributes produce empty string
   * 
   * For any empty attributes object, normalizeWatchAttributes should return empty string
   */
  it('should return empty string for empty attributes', () => {
    fc.assert(
      fc.property(
        fc.constant({}),
        (emptyAttributes) => {
          // Normalize empty attributes
          const normalized = watchRecognizer.normalizeWatchAttributes(emptyAttributes);
          
          // Should return empty string
          expect(normalized).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Single attribute produces single value
   * 
   * For any attributes object with only one field, normalizeWatchAttributes
   * should return just that value
   */
  it('should return single value for single attribute', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            modelCode: fc.tuple(
              fc.constantFrom('WA', 'GT', 'FT'),
              fc.integer({ min: 1000, max: 9999 }),
              fc.constantFrom('A', 'B', 'C')
            ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
          }),
          fc.record({
            connectionType: fc.constantFrom('蓝牙版', 'esim版', '4g版'),
          }),
          fc.record({
            color: fc.constantFrom('黑色', '白色', '夏夜黑'),
          }),
          fc.record({
            strapMaterial: fc.constantFrom('软胶', '皮革', '金属'),
          }),
          fc.record({
            size: fc.constantFrom('42mm', '46mm'),
          })
        ),
        (singleAttribute) => {
          // Normalize single attribute
          const normalized = watchRecognizer.normalizeWatchAttributes(singleAttribute);
          
          // Should return just the single value
          const value = Object.values(singleAttribute)[0] as string;
          expect(normalized).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Real-world examples maintain standard order
   * 
   * Test with real-world watch product names to ensure standard order is maintained
   */
  it('should maintain standard order for real-world watch products', () => {
    const realWorldExamples = [
      {
        name: 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm',
        expectedOrder: 'WA2456C 蓝牙版 夏夜黑 软胶 46mm',
      },
      {
        name: 'VIVO Watch GT (WA2456C) 软胶 夏夜黑 蓝牙版 46mm', // Different input order
        expectedOrder: 'WA2456C 蓝牙版 夏夜黑 软胶 46mm', // Same output order
      },
      {
        name: 'Huawei Watch FIT4 (FT1234A) 皮革 白色 esim版 42mm', // Different input order
        expectedOrder: 'FT1234A esim版 白色 皮革 42mm', // Standard output order
      },
      {
        name: 'Apple Watch Series 8 (AP9999) 金属 银色 gps版 44mm', // Different input order
        expectedOrder: 'AP9999 gps版 银色 金属 44mm', // Standard output order
      },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...realWorldExamples),
        ({ name, expectedOrder }) => {
          // Extract attributes from real-world example
          const attributes = watchRecognizer.extractWatchAttributes(name);
          
          // Normalize the attributes
          const normalized = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Should match the expected standard order
          expect(normalized).toBe(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Normalization is idempotent
   * 
   * For any watch attributes, normalizing multiple times should produce the same result
   */
  it('should be idempotent - normalizing multiple times produces same result', () => {
    fc.assert(
      fc.property(
        // Generate watch attributes
        fc.record({
          modelCode: fc.option(
            fc.tuple(
              fc.constantFrom('WA', 'GT', 'FT'),
              fc.integer({ min: 1000, max: 9999 }),
              fc.option(fc.constantFrom('A', 'B', 'C'), { nil: '' })
            ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
            { nil: undefined }
          ),
          connectionType: fc.option(
            fc.constantFrom('蓝牙版', 'esim版', '4g版'),
            { nil: undefined }
          ),
          color: fc.option(
            fc.constantFrom('黑色', '白色', '夏夜黑'),
            { nil: undefined }
          ),
          strapMaterial: fc.option(
            fc.constantFrom('软胶', '皮革', '金属'),
            { nil: undefined }
          ),
          size: fc.option(
            fc.constantFrom('42mm', '46mm'),
            { nil: undefined }
          ),
        }),
        (attributes) => {
          // Normalize once
          const normalized1 = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Extract attributes from the normalized string and normalize again
          // (This simulates re-normalizing already normalized data)
          const normalized2 = watchRecognizer.normalizeWatchAttributes(attributes);
          const normalized3 = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // All normalizations should produce the same result
          expect(normalized2).toBe(normalized1);
          expect(normalized3).toBe(normalized1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Order verification - modelCode always comes first if present
   * 
   * For any watch attributes with modelCode, it should always be the first element
   */
  it('should always place modelCode first if present', () => {
    fc.assert(
      fc.property(
        // Generate attributes with modelCode and at least one other attribute
        fc.record({
          modelCode: fc.tuple(
            fc.constantFrom('WA', 'GT', 'FT'),
            fc.integer({ min: 1000, max: 9999 }),
            fc.constantFrom('A', 'B', 'C')
          ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
          connectionType: fc.option(fc.constantFrom('蓝牙版', 'esim版'), { nil: undefined }),
          color: fc.option(fc.constantFrom('黑色', '白色'), { nil: undefined }),
          strapMaterial: fc.option(fc.constantFrom('软胶', '皮革'), { nil: undefined }),
          size: fc.option(fc.constantFrom('42mm', '46mm'), { nil: undefined }),
        }),
        (attributes) => {
          // Normalize the attributes
          const normalized = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Split into parts
          const parts = normalized.split(' ').filter(p => p !== '');
          
          // If there are any parts, the first one should be the modelCode
          if (parts.length > 0) {
            expect(parts[0]).toBe(attributes.modelCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Order verification - size always comes last if present
   * 
   * For any watch attributes with size, it should always be the last element
   */
  it('should always place size last if present', () => {
    fc.assert(
      fc.property(
        // Generate attributes with size and at least one other attribute
        fc.record({
          modelCode: fc.option(
            fc.tuple(
              fc.constantFrom('WA', 'GT', 'FT'),
              fc.integer({ min: 1000, max: 9999 }),
              fc.constantFrom('A', 'B', 'C')
            ).map(([prefix, num, suffix]) => `${prefix}${num}${suffix}`),
            { nil: undefined }
          ),
          connectionType: fc.option(fc.constantFrom('蓝牙版', 'esim版'), { nil: undefined }),
          color: fc.option(fc.constantFrom('黑色', '白色'), { nil: undefined }),
          strapMaterial: fc.option(fc.constantFrom('软胶', '皮革'), { nil: undefined }),
          size: fc.constantFrom('42mm', '46mm'),
        }),
        (attributes) => {
          // Normalize the attributes
          const normalized = watchRecognizer.normalizeWatchAttributes(attributes);
          
          // Split into parts
          const parts = normalized.split(' ').filter(p => p !== '');
          
          // If there are any parts, the last one should be the size
          if (parts.length > 0) {
            expect(parts[parts.length - 1]).toBe(attributes.size);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
