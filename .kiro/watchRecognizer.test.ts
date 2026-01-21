/**
 * Unit tests for WatchRecognizer
 * 测试手表识别器的各项功能
 */

import { WatchRecognizer, WatchAttributes } from './watchRecognizer';

describe('WatchRecognizer', () => {
  const recognizer = new WatchRecognizer();

  describe('isWatchProduct', () => {
    it('should identify watch products with "watch" keyword', () => {
      expect(recognizer.isWatchProduct('Apple Watch Series 8')).toBe(true);
      expect(recognizer.isWatchProduct('VIVO Watch GT')).toBe(true);
      expect(recognizer.isWatchProduct('Huawei Watch FIT4')).toBe(true);
    });

    it('should identify watch products with Chinese "手表" keyword', () => {
      expect(recognizer.isWatchProduct('华为手表')).toBe(true);
      expect(recognizer.isWatchProduct('小米智能手表')).toBe(true);
    });

    it('should identify smartwatch products', () => {
      expect(recognizer.isWatchProduct('Samsung SmartWatch')).toBe(true);
    });

    it('should return false for non-watch products', () => {
      expect(recognizer.isWatchProduct('iPhone 15 Pro')).toBe(false);
      expect(recognizer.isWatchProduct('iPad Air')).toBe(false);
      expect(recognizer.isWatchProduct('MacBook Pro')).toBe(false);
    });

    it('should handle empty or null input', () => {
      expect(recognizer.isWatchProduct('')).toBe(false);
      expect(recognizer.isWatchProduct(null as any)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(recognizer.isWatchProduct('WATCH')).toBe(true);
      expect(recognizer.isWatchProduct('Watch')).toBe(true);
      expect(recognizer.isWatchProduct('watch')).toBe(true);
    });
  });

  describe('extractWatchModelCode', () => {
    it('should extract model code from parentheses', () => {
      expect(recognizer.extractWatchModelCode('VIVO Watch GT (WA2456C)')).toBe('WA2456C');
      expect(recognizer.extractWatchModelCode('华为手表（WA1234D）')).toBe('WA1234D');
      expect(recognizer.extractWatchModelCode('Watch FIT4 (GT2456E)')).toBe('GT2456E');
    });

    it('should extract model code without letter suffix', () => {
      expect(recognizer.extractWatchModelCode('Watch (WA2456)')).toBe('WA2456');
    });

    it('should handle both Chinese and English parentheses', () => {
      expect(recognizer.extractWatchModelCode('手表（WA2456C）')).toBe('WA2456C');
      expect(recognizer.extractWatchModelCode('Watch (WA2456C)')).toBe('WA2456C');
    });

    it('should extract model code without parentheses if pattern matches', () => {
      expect(recognizer.extractWatchModelCode('Watch WA2456C 蓝牙版')).toBe('WA2456C');
    });

    it('should return null if no model code found', () => {
      expect(recognizer.extractWatchModelCode('Apple Watch Series 8')).toBeNull();
      expect(recognizer.extractWatchModelCode('智能手表')).toBeNull();
    });

    it('should handle empty or null input', () => {
      expect(recognizer.extractWatchModelCode('')).toBeNull();
      expect(recognizer.extractWatchModelCode(null as any)).toBeNull();
    });

    it('should return uppercase model code', () => {
      expect(recognizer.extractWatchModelCode('watch (wa2456c)')).toBe('WA2456C');
    });
  });

  describe('extractWatchAttributes', () => {
    it('should extract all attributes from a complete product name', () => {
      const attrs = recognizer.extractWatchAttributes('VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm');
      
      expect(attrs.modelCode).toBe('WA2456C');
      expect(attrs.connectionType).toBe('蓝牙版');
      expect(attrs.color).toBe('夏夜黑');
      expect(attrs.strapMaterial).toBe('软胶');
      expect(attrs.size).toBe('46mm');
    });

    it('should extract model code', () => {
      const attrs = recognizer.extractWatchAttributes('Watch (WA2456C)');
      expect(attrs.modelCode).toBe('WA2456C');
    });

    it('should extract connection type', () => {
      const attrs1 = recognizer.extractWatchAttributes('Watch 蓝牙版');
      expect(attrs1.connectionType).toBe('蓝牙版');

      const attrs2 = recognizer.extractWatchAttributes('Watch eSIM版');
      expect(attrs2.connectionType).toBe('esim版');

      const attrs3 = recognizer.extractWatchAttributes('Watch 4G版');
      expect(attrs3.connectionType).toBe('4g版');
    });

    it('should extract strap material', () => {
      const attrs1 = recognizer.extractWatchAttributes('Watch 软胶');
      expect(attrs1.strapMaterial).toBe('软胶');

      const attrs2 = recognizer.extractWatchAttributes('Watch 皮革');
      expect(attrs2.strapMaterial).toBe('皮革');

      const attrs3 = recognizer.extractWatchAttributes('Watch 金属');
      expect(attrs3.strapMaterial).toBe('金属');
    });

    it('should extract size in valid range', () => {
      const attrs1 = recognizer.extractWatchAttributes('Watch 42mm');
      expect(attrs1.size).toBe('42mm');

      const attrs2 = recognizer.extractWatchAttributes('Watch 46mm');
      expect(attrs2.size).toBe('46mm');

      const attrs3 = recognizer.extractWatchAttributes('Watch 49mm');
      expect(attrs3.size).toBe('49mm');
    });

    it('should ignore size outside valid range', () => {
      const attrs1 = recognizer.extractWatchAttributes('Watch 30mm'); // Too small
      expect(attrs1.size).toBeUndefined();

      const attrs2 = recognizer.extractWatchAttributes('Watch 60mm'); // Too large
      expect(attrs2.size).toBeUndefined();
    });

    it('should extract color', () => {
      const attrs1 = recognizer.extractWatchAttributes('Watch 黑色');
      expect(attrs1.color).toBe('黑色');

      const attrs2 = recognizer.extractWatchAttributes('Watch 夏夜黑');
      expect(attrs2.color).toBe('夏夜黑');

      const attrs3 = recognizer.extractWatchAttributes('Watch 银色');
      expect(attrs3.color).toBe('银色');
    });

    it('should handle partial attributes', () => {
      const attrs = recognizer.extractWatchAttributes('Watch 蓝牙版 黑色');
      
      expect(attrs.modelCode).toBeUndefined();
      expect(attrs.connectionType).toBe('蓝牙版');
      expect(attrs.color).toBe('黑色');
      expect(attrs.strapMaterial).toBeUndefined();
      expect(attrs.size).toBeUndefined();
    });

    it('should return empty object for empty input', () => {
      const attrs = recognizer.extractWatchAttributes('');
      expect(Object.keys(attrs).length).toBe(0);
    });

    it('should handle attributes in different order', () => {
      const attrs1 = recognizer.extractWatchAttributes('Watch 软胶 蓝牙版 黑色 42mm (WA2456C)');
      expect(attrs1.modelCode).toBe('WA2456C');
      expect(attrs1.connectionType).toBe('蓝牙版');
      expect(attrs1.strapMaterial).toBe('软胶');
      expect(attrs1.color).toBe('黑色');
      expect(attrs1.size).toBe('42mm');

      const attrs2 = recognizer.extractWatchAttributes('Watch 42mm 黑色 蓝牙版 软胶 (WA2456C)');
      expect(attrs2.modelCode).toBe('WA2456C');
      expect(attrs2.connectionType).toBe('蓝牙版');
      expect(attrs2.strapMaterial).toBe('软胶');
      expect(attrs2.color).toBe('黑色');
      expect(attrs2.size).toBe('42mm');
    });
  });

  describe('normalizeWatchAttributes', () => {
    it('should normalize attributes in standard order', () => {
      const attrs: WatchAttributes = {
        modelCode: 'WA2456C',
        connectionType: '蓝牙版',
        color: '夏夜黑',
        strapMaterial: '软胶',
        size: '46mm',
      };

      const normalized = recognizer.normalizeWatchAttributes(attrs);
      expect(normalized).toBe('WA2456C 蓝牙版 夏夜黑 软胶 46mm');
    });

    it('should maintain order regardless of input order', () => {
      const attrs1: WatchAttributes = {
        size: '46mm',
        color: '黑色',
        modelCode: 'WA2456C',
        strapMaterial: '软胶',
        connectionType: '蓝牙版',
      };

      const attrs2: WatchAttributes = {
        connectionType: '蓝牙版',
        strapMaterial: '软胶',
        size: '46mm',
        modelCode: 'WA2456C',
        color: '黑色',
      };

      const normalized1 = recognizer.normalizeWatchAttributes(attrs1);
      const normalized2 = recognizer.normalizeWatchAttributes(attrs2);

      expect(normalized1).toBe(normalized2);
      expect(normalized1).toBe('WA2456C 蓝牙版 黑色 软胶 46mm');
    });

    it('should handle partial attributes', () => {
      const attrs1: WatchAttributes = {
        modelCode: 'WA2456C',
        color: '黑色',
      };

      const normalized1 = recognizer.normalizeWatchAttributes(attrs1);
      expect(normalized1).toBe('WA2456C 黑色');

      const attrs2: WatchAttributes = {
        connectionType: '蓝牙版',
        size: '46mm',
      };

      const normalized2 = recognizer.normalizeWatchAttributes(attrs2);
      expect(normalized2).toBe('蓝牙版 46mm');
    });

    it('should return empty string for empty attributes', () => {
      const attrs: WatchAttributes = {};
      const normalized = recognizer.normalizeWatchAttributes(attrs);
      expect(normalized).toBe('');
    });

    it('should handle single attribute', () => {
      const attrs: WatchAttributes = {
        modelCode: 'WA2456C',
      };

      const normalized = recognizer.normalizeWatchAttributes(attrs);
      expect(normalized).toBe('WA2456C');
    });
  });

  describe('compareWatchProducts', () => {
    it('should match products with same model code', () => {
      const product1 = 'VIVO Watch GT (WA2456C) 蓝牙版 黑色';
      const product2 = 'Watch GT (WA2456C) eSIM版 白色';
      
      expect(recognizer.compareWatchProducts(product1, product2)).toBe(true);
    });

    it('should not match products with different model codes', () => {
      const product1 = 'Watch (WA2456C)';
      const product2 = 'Watch (WA1234D)';
      
      expect(recognizer.compareWatchProducts(product1, product2)).toBe(false);
    });

    it('should match products without model code if attributes match', () => {
      const product1 = 'Watch 蓝牙版 黑色 软胶 46mm';
      const product2 = 'Watch 蓝牙版 黑色 软胶 46mm';
      
      expect(recognizer.compareWatchProducts(product1, product2)).toBe(true);
    });

    it('should not match products with insufficient attribute matches', () => {
      const product1 = 'Watch 蓝牙版 黑色 软胶 46mm';
      const product2 = 'Watch eSIM版 白色 金属 42mm';
      
      expect(recognizer.compareWatchProducts(product1, product2)).toBe(false);
    });

    it('should match products with 80% or more attributes matching', () => {
      const product1 = 'Watch 蓝牙版 黑色 软胶 46mm';
      const product2 = 'Watch 蓝牙版 黑色 软胶 42mm'; // 3 out of 4 match (75%)
      
      // This should not match because 75% < 80%
      expect(recognizer.compareWatchProducts(product1, product2)).toBe(false);

      const product3 = 'Watch 蓝牙版 黑色 软胶';
      const product4 = 'Watch 蓝牙版 黑色 金属'; // 2 out of 3 match (66.7%)
      
      // This should not match because 66.7% < 80%
      expect(recognizer.compareWatchProducts(product3, product4)).toBe(false);
    });

    it('should return false when no comparable attributes exist', () => {
      const product1 = 'Watch';
      const product2 = 'SmartWatch';
      
      expect(recognizer.compareWatchProducts(product1, product2)).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should handle real-world watch product names', () => {
      // Test case from requirements: VIVO Watch GT
      const product1 = 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm';
      
      expect(recognizer.isWatchProduct(product1)).toBe(true);
      
      const attrs = recognizer.extractWatchAttributes(product1);
      expect(attrs.modelCode).toBe('WA2456C');
      expect(attrs.connectionType).toBe('蓝牙版');
      expect(attrs.color).toBe('夏夜黑');
      expect(attrs.strapMaterial).toBe('软胶');
      expect(attrs.size).toBe('46mm');
      
      const normalized = recognizer.normalizeWatchAttributes(attrs);
      expect(normalized).toBe('WA2456C 蓝牙版 夏夜黑 软胶 46mm');
    });

    it('should handle watch products with different attribute orders', () => {
      const product1 = 'Watch GT 蓝牙版 夏夜黑 软胶 (WA2456C)';
      const product2 = 'Watch GT (WA2456C) 软胶 夏夜黑 蓝牙版';
      
      const attrs1 = recognizer.extractWatchAttributes(product1);
      const attrs2 = recognizer.extractWatchAttributes(product2);
      
      const normalized1 = recognizer.normalizeWatchAttributes(attrs1);
      const normalized2 = recognizer.normalizeWatchAttributes(attrs2);
      
      // Both should normalize to the same order
      expect(normalized1).toBe(normalized2);
    });

    it('should handle Huawei Watch FIT4', () => {
      const product = '华为手表 FIT4 蓝牙版 黑色 硅胶 42mm';
      
      expect(recognizer.isWatchProduct(product)).toBe(true);
      
      const attrs = recognizer.extractWatchAttributes(product);
      expect(attrs.connectionType).toBe('蓝牙版');
      expect(attrs.color).toBe('黑色');
      expect(attrs.strapMaterial).toBe('硅胶');
      expect(attrs.size).toBe('42mm');
    });
  });
});
