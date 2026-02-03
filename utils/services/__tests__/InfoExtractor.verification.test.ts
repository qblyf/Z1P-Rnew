/**
 * Verification Tests for InfoExtractor - Task 9.1
 * 
 * This test file verifies that InfoExtractor correctly extracts:
 * - Brand information (Chinese and Pinyin)
 * - Model information
 * - Color information
 * - Capacity information
 * - Version information
 * 
 * Requirements: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5
 */

import { InfoExtractor } from '../InfoExtractor';
import type { BrandData } from '../../types';

describe('InfoExtractor Verification - Task 9.1', () => {
  let extractor: InfoExtractor;
  let mockBrandList: BrandData[];
  
  beforeEach(() => {
    extractor = new InfoExtractor();
    
    // Set up brand list with common brands
    mockBrandList = [
      { name: '华为', spell: 'HUAWEI', color: '#FF0000', order: 1 },
      { name: '小米', spell: 'XIAOMI', color: '#FF6600', order: 2 },
      { name: 'vivo', spell: 'vivo', color: '#0066FF', order: 3 },
      { name: 'OPPO', spell: 'OPPO', color: '#00CC66', order: 4 },
      { name: '红米', spell: 'Redmi', color: '#FF3333', order: 5 },
      { name: '苹果', spell: 'Apple', color: '#999999', order: 6 },
      { name: '荣耀', spell: 'HONOR', color: '#3366FF', order: 7 },
    ];
    
    extractor.setBrandList(mockBrandList);
    
    // Set up color configurations
    const colorVariants = [
      { group: 'blue_mist', colors: ['雾凇蓝', '雾松蓝'], primary: '雾凇蓝' },
      { group: 'deep_black', colors: ['深空黑', '曜石黑'], primary: '深空黑' },
    ];
    
    const dynamicColors = [
      '星岩黑', '雅川青', '可可黑', '薄荷青', '柠檬黄', '酷莓粉',
      '夏夜黑', '辰夜黑', '星际蓝', '玉石绿', '托帕蓝'
    ];
    
    extractor.setColorVariants(colorVariants);
    extractor.setColorList(dynamicColors);
  });
  
  describe('Requirement 2.3.1: Brand Extraction (Chinese and Pinyin)', () => {
    it('should extract Chinese brand name', () => {
      const result = extractor.extractBrand('华为 Mate 60 Pro 12GB+512GB 雅川青');
      
      expect(result.value).toBe('华为');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.source).toBe('exact');
    });
    
    it('should extract Pinyin brand name', () => {
      const result = extractor.extractBrand('HUAWEI Mate 60 Pro 12GB+512GB');
      
      expect(result.value).toBe('华为');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.source).toBe('exact');
    });
    
    it('should extract brand from various positions', () => {
      // Beginning
      const result1 = extractor.extractBrand('小米 14 Pro');
      expect(result1.value).toBe('小米');
      
      // Middle
      const result2 = extractor.extractBrand('全新 vivo Y50 手机');
      expect(result2.value).toBe('vivo');
      
      // With English spelling
      const result3 = extractor.extractBrand('XIAOMI 14 Pro Max');
      expect(result3.value).toBe('小米');
    });
    
    it('should handle case-insensitive matching', () => {
      const result1 = extractor.extractBrand('huawei mate 60 pro');
      expect(result1.value).toBe('华为');
      
      const result2 = extractor.extractBrand('Xiaomi 14 Pro');
      expect(result2.value).toBe('小米');
      
      const result3 = extractor.extractBrand('VIVO Y50');
      expect(result3.value).toBe('vivo');
    });
    
    it('should return null for unknown brands', () => {
      const result = extractor.extractBrand('Unknown Brand Phone');
      
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('Requirement 2.3.2: Model Extraction', () => {
    it('should extract complex models with suffixes', () => {
      const result1 = extractor.extractModel('华为 Mate 60 Pro', '华为');
      expect(result1.value).toBe('mate60pro');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractModel('小米 14 Plus', '小米');
      expect(result2.value).toBe('14plus');
      
      const result3 = extractor.extractModel('iPhone 15 Pro Max', 'Apple');
      expect(result3.value).toBe('iphone15promax');
    });
    
    it('should extract simple models', () => {
      const result1 = extractor.extractModel('vivo Y50', 'vivo');
      expect(result1.value).toBe('y50');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractModel('OPPO A5', 'OPPO');
      expect(result2.value).toBe('a5');
      
      const result3 = extractor.extractModel('华为 P50', '华为');
      expect(result3.value).toBe('p50');
    });
    
    it('should extract word models', () => {
      const result1 = extractor.extractModel('华为 Watch GT 5', '华为');
      expect(result1.value).toBe('watchgt5');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractModel('小米 Band 8', '小米');
      expect(result2.value).toBe('band8');
    });
    
    it('should handle models with capacity and color', () => {
      const result = extractor.extractModel('华为 Mate 60 Pro 12GB+512GB 雅川青', '华为');
      
      expect(result.value).toBe('mate60pro');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should normalize model format consistently', () => {
      // All variations should produce the same normalized model
      const result1 = extractor.extractModel('Mate 60 Pro', '华为');
      const result2 = extractor.extractModel('MATE 60 PRO', '华为');
      const result3 = extractor.extractModel('mate60pro', '华为');
      
      expect(result1.value).toBe('mate60pro');
      expect(result2.value).toBe('mate60pro');
      expect(result3.value).toBe('mate60pro');
    });
    
    it('should return null when no model found', () => {
      const result = extractor.extractModel('手机');
      
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('Requirement 2.3.3: Color Extraction', () => {
    it('should extract color from product names', () => {
      const result1 = extractor.extractColor('华为 Mate 60 Pro 雅川青');
      expect(result1.value).toBe('雅川青');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractColor('小米 14 Pro 星岩黑');
      expect(result2.value).toBe('星岩黑');
      
      const result3 = extractor.extractColor('vivo Y50 可可黑');
      expect(result3.value).toBe('可可黑');
    });
    
    it('should extract color variants', () => {
      const result1 = extractor.extractColor('华为 Mate 60 Pro 雾凇蓝');
      expect(result1.value).toBe('雾凇蓝');
      expect(result1.confidence).toBe(1.0);
      
      // Variant should return primary color
      const result2 = extractor.extractColor('华为 Mate 60 Pro 雾松蓝');
      expect(result2.value).toBe('雾凇蓝');
      expect(result2.confidence).toBe(1.0);
    });
    
    it('should extract complex color names', () => {
      const result1 = extractor.extractColor('OPPO A5 玉石绿');
      expect(result1.value).toBe('玉石绿');
      
      const result2 = extractor.extractColor('vivo X100 柠檬黄');
      expect(result2.value).toBe('柠檬黄');
      
      const result3 = extractor.extractColor('红米 Note 12 薄荷青');
      expect(result3.value).toBe('薄荷青');
    });
    
    it('should extract basic colors', () => {
      const result1 = extractor.extractColor('手机 黑');
      expect(result1.value).toBe('黑');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractColor('平板 白');
      expect(result2.value).toBe('白');
      
      const result3 = extractor.extractColor('手表 蓝');
      expect(result3.value).toBe('蓝');
    });
    
    it('should return null when no color found', () => {
      const result = extractor.extractColor('华为 Mate 60 Pro 12GB+512GB');
      
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('Requirement 2.3.4: Capacity Extraction', () => {
    it('should extract RAM+Storage format', () => {
      const result1 = extractor.extractCapacity('华为 Mate 60 Pro 12+512');
      expect(result1.value).toBe('12+512');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractCapacity('小米 14 Pro 8GB+256GB');
      expect(result2.value).toBe('8+256');
      
      const result3 = extractor.extractCapacity('vivo Y50 8G+256G');
      expect(result3.value).toBe('8+256');
    });
    
    it('should extract storage-only format', () => {
      const result1 = extractor.extractCapacity('iPad Pro 256GB');
      expect(result1.value).toBe('256');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractCapacity('iPhone 15 512GB');
      expect(result2.value).toBe('512');
    });
    
    it('should handle various capacity formats', () => {
      const result1 = extractor.extractCapacity('手机 8 + 256');
      expect(result1.value).toBe('8+256');
      
      const result2 = extractor.extractCapacity('平板 16GB+1TB');
      expect(result2.value).toBe('16+1T');
    });
    
    it('should extract capacity from full product names', () => {
      const result = extractor.extractCapacity('华为 Mate 60 Pro 12GB+512GB 雅川青');
      
      expect(result.value).toBe('12+512');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should return null when no capacity found', () => {
      const result = extractor.extractCapacity('华为 Watch GT 5');
      
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('Requirement 2.3.5: Version Extraction', () => {
    it('should extract network versions', () => {
      const result1 = extractor.extractVersion('华为 Mate 60 Pro 5G');
      expect(result1.value).not.toBeNull();
      expect(result1.value?.name).toContain('5G');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractVersion('vivo Y50 全网通5G');
      expect(result2.value).not.toBeNull();
      expect(result2.value?.name).toBe('全网通5G');
      
      const result3 = extractor.extractVersion('华为 Watch GT 5 蓝牙版');
      expect(result3.value).not.toBeNull();
      expect(result3.value?.name).toBe('蓝牙版');
    });
    
    it('should extract special edition versions', () => {
      const result1 = extractor.extractVersion('OPPO A5 活力版');
      expect(result1.value).not.toBeNull();
      expect(result1.value?.name).toBe('活力版');
      expect(result1.confidence).toBeGreaterThan(0);
      
      const result2 = extractor.extractVersion('小米 14 Pro 典藏版');
      expect(result2.value).not.toBeNull();
      expect(result2.value?.name).toBe('典藏版');
      
      const result3 = extractor.extractVersion('红米 Note 12 青春版');
      expect(result3.value).not.toBeNull();
      expect(result3.value?.name).toBe('青春版');
    });
    
    it('should extract premium versions', () => {
      const result1 = extractor.extractVersion('华为 Mate 60 旗舰版');
      expect(result1.value).not.toBeNull();
      expect(result1.value?.name).toBe('旗舰版');
      
      const result2 = extractor.extractVersion('小米 14 至尊版');
      expect(result2.value).not.toBeNull();
      expect(result2.value?.name).toBe('至尊版');
    });
    
    it('should not extract Pro when it is part of model name', () => {
      const result = extractor.extractVersion('iPhone 15 Pro Max');
      
      // "Pro" is part of model name, not a version
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
    
    it('should return null when no version found', () => {
      const result = extractor.extractVersion('华为 Mate 60 Pro 12GB+512GB');
      
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('Integration: extractAll method', () => {
    it('should extract all information from a complete product name', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雅川青 5G';
      const result = extractor.extractAll(input);
      
      expect(result.originalInput).toBe(input);
      expect(result.brand.value).toBe('华为');
      expect(result.model.value).toBe('mate60pro');
      expect(result.capacity.value).toBe('12+512');
      expect(result.color.value).toBe('雅川青');
      expect(result.version.value?.name).toContain('5G');
      expect(result.productType).toBe('phone');
    });
    
    it('should extract information from watch product', () => {
      const input = '华为 Watch GT 5 46mm 星岩黑 蓝牙版';
      const result = extractor.extractAll(input);
      
      expect(result.brand.value).toBe('华为');
      expect(result.model.value).toBe('watchgt5');
      expect(result.color.value).toBe('星岩黑');
      expect(result.version.value?.name).toBe('蓝牙版');
      expect(result.productType).toBe('watch');
    });
    
    it('should extract information from simple product name', () => {
      const input = 'vivo Y50 8+256 可可黑';
      const result = extractor.extractAll(input);
      
      expect(result.brand.value).toBe('vivo');
      expect(result.model.value).toBe('y50');
      expect(result.capacity.value).toBe('8+256');
      expect(result.color.value).toBe('可可黑');
    });
    
    it('should extract information from OPPO product with version', () => {
      const input = 'OPPO A5 活力版 8+256 玉石绿';
      const result = extractor.extractAll(input);
      
      expect(result.brand.value).toBe('OPPO');
      expect(result.model.value).toBe('a5');
      expect(result.capacity.value).toBe('8+256');
      expect(result.color.value).toBe('玉石绿');
      expect(result.version.value?.name).toBe('活力版');
    });
    
    it('should handle partial information gracefully', () => {
      const input = '小米 14 Pro';
      const result = extractor.extractAll(input);
      
      expect(result.brand.value).toBe('小米');
      expect(result.model.value).toBe('14pro');
      expect(result.capacity.value).toBeNull();
      expect(result.color.value).toBeNull();
      expect(result.version.value).toBeNull();
    });
  });
  
  describe('Confidence Scoring Verification', () => {
    it('should provide confidence scores for all extractions', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雅川青 5G';
      const result = extractor.extractAll(input);
      
      // All confidence scores should be between 0 and 1
      expect(result.brand.confidence).toBeGreaterThanOrEqual(0);
      expect(result.brand.confidence).toBeLessThanOrEqual(1);
      
      expect(result.model.confidence).toBeGreaterThanOrEqual(0);
      expect(result.model.confidence).toBeLessThanOrEqual(1);
      
      expect(result.color.confidence).toBeGreaterThanOrEqual(0);
      expect(result.color.confidence).toBeLessThanOrEqual(1);
      
      expect(result.capacity.confidence).toBeGreaterThanOrEqual(0);
      expect(result.capacity.confidence).toBeLessThanOrEqual(1);
      
      expect(result.version.confidence).toBeGreaterThanOrEqual(0);
      expect(result.version.confidence).toBeLessThanOrEqual(1);
    });
    
    it('should provide appropriate source information', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雅川青';
      const result = extractor.extractAll(input);
      
      // Source should be one of: 'exact', 'fuzzy', 'inferred'
      expect(['exact', 'fuzzy', 'inferred']).toContain(result.brand.source);
      expect(['exact', 'fuzzy', 'inferred']).toContain(result.model.source);
      expect(['exact', 'fuzzy', 'inferred']).toContain(result.color.source);
      expect(['exact', 'fuzzy', 'inferred']).toContain(result.capacity.source);
      expect(['exact', 'fuzzy', 'inferred']).toContain(result.version.source);
    });
  });
  
  describe('Real-world Test Cases', () => {
    it('should handle Huawei Mate series', () => {
      const testCases = [
        { input: '华为 Mate 60 Pro 12GB+512GB 雅川青', expectedModel: 'mate60pro' },
        { input: 'HUAWEI Mate 60 Pro 12+512 星岩黑', expectedModel: 'mate60pro' },
        { input: '华为 Mate 60 8+256 可可黑 5G', expectedModel: '60' }, // Simple model without suffix
      ];
      
      testCases.forEach(({ input, expectedModel }) => {
        const result = extractor.extractAll(input);
        expect(result.brand.value).toBe('华为');
        expect(result.model.value).toBe(expectedModel);
        expect(result.capacity.value).toBeTruthy();
        expect(result.color.value).toBeTruthy();
      });
    });
    
    it('should handle Xiaomi series', () => {
      const inputs = [
        '小米 14 Pro 12GB+512GB 星岩黑',
        'XIAOMI 14 Plus 8+256 柠檬黄',
        '小米 14 典藏版 16+1T',
      ];
      
      inputs.forEach(input => {
        const result = extractor.extractAll(input);
        expect(result.brand.value).toBe('小米');
        expect(result.model.value).toContain('14');
      });
    });
    
    it('should handle vivo series', () => {
      const inputs = [
        'vivo Y50 8+256 可可黑',
        'vivo S30 Pro mini 12+512 薄荷青',
        'vivo X100 Pro 16+512 星际蓝',
      ];
      
      inputs.forEach(input => {
        const result = extractor.extractAll(input);
        expect(result.brand.value).toBe('vivo');
        expect(result.model.value).toBeTruthy();
      });
    });
    
    it('should handle OPPO series', () => {
      const inputs = [
        'OPPO A5 活力版 8+256 玉石绿',
        'OPPO Find X5 Pro 12+512 深空黑',
        'OPPO Reno 11 Pro 8+256 酷莓粉',
      ];
      
      inputs.forEach(input => {
        const result = extractor.extractAll(input);
        expect(result.brand.value).toBe('OPPO');
        expect(result.model.value).toBeTruthy();
      });
    });
    
    it('should handle watch products', () => {
      const inputs = [
        '华为 Watch GT 5 46mm 星岩黑 蓝牙版',
        '小米 Band 8 黑色',
        '华为 Watch GT 5 复合编织表带 托帕蓝',
      ];
      
      inputs.forEach(input => {
        const result = extractor.extractAll(input);
        expect(result.brand.value).toBeTruthy();
        expect(result.model.value).toBeTruthy();
        expect(['watch', 'band']).toContain(result.productType);
      });
    });
  });
});
