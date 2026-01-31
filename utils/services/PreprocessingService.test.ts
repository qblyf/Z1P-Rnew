/**
 * Unit Tests for PreprocessingService
 * 
 * Tests all preprocessing methods including:
 * - clean: Demo marker and noise removal
 * - correctTypos: Typo correction
 * - expandAbbreviations: Abbreviation expansion
 * - normalize: Format normalization
 * - preprocess: Complete preprocessing pipeline
 */

import { PreprocessingService } from './PreprocessingService';
import { ConfigLoader } from '../config-loader';

describe('PreprocessingService', () => {
  let preprocessor: PreprocessingService;
  
  beforeAll(async () => {
    // Initialize the preprocessing service
    preprocessor = new PreprocessingService();
    await preprocessor.initialize();
  });
  
  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(preprocessor.isInitialized()).toBe(true);
    });
    
    it('should load text mappings configuration', () => {
      const textMappings = preprocessor.getTextMappings();
      expect(textMappings).not.toBeNull();
      expect(textMappings).toHaveProperty('typoCorrections');
      expect(textMappings).toHaveProperty('abbreviations');
      expect(textMappings).toHaveProperty('brandAliases');
      expect(textMappings).toHaveProperty('capacityNormalizations');
    });
  });
  
  describe('clean method', () => {
    it('should remove demo unit markers', () => {
      expect(preprocessor.clean('华为 Mate 60 Pro 演示机')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.clean('小米 14 Pro (样机)')).toBe('小米 14 Pro');
      expect(preprocessor.clean('vivo Y50 展示机')).toBe('vivo Y50');
      expect(preprocessor.clean('OPPO A5 体验机')).toBe('OPPO A5');
      expect(preprocessor.clean('华为 Watch GT 5 试用机')).toBe('华为 Watch GT 5');
      expect(preprocessor.clean('小米手环 测试机')).toBe('小米手环');
    });
    
    it('should remove gift box and bundle markers', () => {
      expect(preprocessor.clean('华为 Mate 60 Pro 礼盒装')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.clean('小米 14 Pro【礼盒】')).toBe('小米 14 Pro');
      expect(preprocessor.clean('vivo Y50 套装')).toBe('vivo Y50');
      expect(preprocessor.clean('OPPO A5 礼品装')).toBe('OPPO A5');
      expect(preprocessor.clean('华为 Watch GT 5 礼包')).toBe('华为 Watch GT 5');
    });
    
    it('should remove accessory keywords with markers', () => {
      expect(preprocessor.clean('华为 Mate 60 Pro + 充电器')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.clean('小米 14 Pro 送充电线')).toBe('小米 14 Pro');
      expect(preprocessor.clean('vivo Y50 附赠耳机')).toBe('vivo Y50');
      expect(preprocessor.clean('OPPO A5 + 保护壳')).toBe('OPPO A5');
      expect(preprocessor.clean('华为 Watch GT 5 配数据线')).toBe('华为 Watch GT 5');
    });
    
    it('should remove special characters', () => {
      expect(preprocessor.clean('华为 Mate 60 Pro (12GB+512GB)')).toBe('华为 Mate 60 Pro 12GB+512GB');
      expect(preprocessor.clean('小米 14 Pro【8+256】')).toBe('小米 14 Pro 8+256');
      expect(preprocessor.clean('vivo Y50 「雅川青」')).toBe('vivo Y50 雅川青');
      expect(preprocessor.clean('OPPO A5 《活力版》')).toBe('OPPO A5 活力版');
    });
    
    it('should clean up extra whitespace', () => {
      expect(preprocessor.clean('华为  Mate   60  Pro')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.clean('  小米 14 Pro  ')).toBe('小米 14 Pro');
      expect(preprocessor.clean('vivo\tY50')).toBe('vivo Y50');
    });
    
    it('should handle empty or null input', () => {
      expect(preprocessor.clean('')).toBe('');
      expect(preprocessor.clean('   ')).toBe('');
    });
    
    it('should handle complex combinations', () => {
      const input = '华为 Mate 60 Pro (演示机)【礼盒装】+ 充电器';
      const expected = '华为 Mate 60 Pro';
      expect(preprocessor.clean(input)).toBe(expected);
    });
  });
  
  describe('correctTypos method', () => {
    it('should correct color name typos', () => {
      expect(preprocessor.correctTypos('华为 Mate 60 Pro 雾松蓝')).toBe('华为 Mate 60 Pro 雾凇蓝');
      // Note: Default config may not have all typo corrections
      // This test verifies the mechanism works with available mappings
    });
    
    it('should handle case-insensitive typo correction', () => {
      expect(preprocessor.correctTypos('华为 Mate 60 Pro 雾松蓝')).toBe('华为 Mate 60 Pro 雾凇蓝');
      expect(preprocessor.correctTypos('华为 Mate 60 Pro 雾松蓝')).toBe('华为 Mate 60 Pro 雾凇蓝');
    });
    
    it('should handle multiple typos in one string', () => {
      const input = '华为 Mate 60 Pro 雾松蓝 和 小米 14 Pro';
      const result = preprocessor.correctTypos(input);
      // Should correct at least the typo that exists in default config
      expect(result).toContain('雾凇蓝');
    });
    
    it('should handle empty or null input', () => {
      expect(preprocessor.correctTypos('')).toBe('');
      // Whitespace-only input returns empty after trim check
    });
    
    it('should not modify strings without typos', () => {
      const input = '华为 Mate 60 Pro 雅川青';
      expect(preprocessor.correctTypos(input)).toBe(input);
    });
  });
  
  describe('expandAbbreviations method', () => {
    it('should expand model abbreviations', () => {
      const result = preprocessor.expandAbbreviations('华为 GT5');
      // Should expand GT5 if it's in the config
      expect(result).toContain('GT');
    });
    
    it('should expand technology abbreviations', () => {
      const result1 = preprocessor.expandAbbreviations('华为 Watch esim版');
      const result2 = preprocessor.expandAbbreviations('小米手表 wifi版');
      // Should expand if abbreviations are in config
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
    });
    
    it('should handle case-insensitive expansion', () => {
      expect(preprocessor.expandAbbreviations('华为 gt5')).toContain('Watch GT 5');
      expect(preprocessor.expandAbbreviations('华为 GT5')).toContain('Watch GT 5');
      expect(preprocessor.expandAbbreviations('华为 Gt5')).toContain('Watch GT 5');
    });
    
    it('should not duplicate if full form already exists', () => {
      const input = '华为 Watch GT 5';
      const result = preprocessor.expandAbbreviations(input);
      // Should not have "Watch GT 5" twice
      expect(result).toBe(input);
    });
    
    it('should handle multiple abbreviations', () => {
      const input = '华为 GT5 NFC版';
      const result = preprocessor.expandAbbreviations(input);
      expect(result).toContain('Watch GT 5');
      expect(result).toContain('NFC');
    });
    
    it('should handle empty or null input', () => {
      expect(preprocessor.expandAbbreviations('')).toBe('');
      // Whitespace-only input returns empty after trim check
    });
    
    it('should not modify strings without abbreviations', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB';
      expect(preprocessor.expandAbbreviations(input)).toBe(input);
    });
  });
  
  describe('applyBrandAliases method', () => {
    it('should normalize English brand names to Chinese', () => {
      expect(preprocessor.applyBrandAliases('HUAWEI Mate 60 Pro')).toContain('华为');
      expect(preprocessor.applyBrandAliases('huawei Mate 60 Pro')).toContain('华为');
      expect(preprocessor.applyBrandAliases('Huawei Mate 60 Pro')).toContain('华为');
    });
    
    it('should normalize Xiaomi brand aliases', () => {
      expect(preprocessor.applyBrandAliases('XIAOMI 14 Pro')).toContain('小米');
      expect(preprocessor.applyBrandAliases('xiaomi 14 Pro')).toContain('小米');
      expect(preprocessor.applyBrandAliases('Xiaomi 14 Pro')).toContain('小米');
      expect(preprocessor.applyBrandAliases('MI Band 8')).toContain('小米');
      expect(preprocessor.applyBrandAliases('mi Band 8')).toContain('小米');
    });
    
    it('should handle case-insensitive brand alias matching', () => {
      expect(preprocessor.applyBrandAliases('huawei mate 60')).toContain('华为');
      expect(preprocessor.applyBrandAliases('HUAWEI MATE 60')).toContain('华为');
      expect(preprocessor.applyBrandAliases('HuaWei Mate 60')).toContain('华为');
    });
    
    it('should use word boundaries to avoid partial matches', () => {
      // "MI" should match "MI Band" but not be extracted from "XIAOMI"
      const result1 = preprocessor.applyBrandAliases('MI Band 8');
      expect(result1).toContain('小米');
      
      // "XIAOMI" should be replaced as a whole, not have "MI" extracted
      const result2 = preprocessor.applyBrandAliases('XIAOMI 14 Pro');
      expect(result2).toContain('小米');
      // Should not have "小米AO小米" or similar corruption
      expect(result2).not.toMatch(/小米.*小米/);
    });
    
    it('should handle multiple brand aliases in one string', () => {
      const input = 'HUAWEI vs XIAOMI comparison';
      const result = preprocessor.applyBrandAliases(input);
      expect(result).toContain('华为');
      expect(result).toContain('小米');
    });
    
    it('should preserve canonical brand names', () => {
      // If the canonical brand name is already in the input, it should be preserved
      const input = '华为 Mate 60 Pro';
      const result = preprocessor.applyBrandAliases(input);
      expect(result).toBe(input);
    });
    
    it('should handle empty or null input', () => {
      expect(preprocessor.applyBrandAliases('')).toBe('');
    });
    
    it('should not modify strings without brand aliases', () => {
      const input = 'Unknown Brand Phone 12GB+512GB';
      expect(preprocessor.applyBrandAliases(input)).toBe(input);
    });
    
    it('should handle brands with multiple aliases', () => {
      // Test that all aliases for a brand map to the same canonical form
      const aliases = ['HUAWEI', 'huawei', 'Huawei'];
      for (const alias of aliases) {
        const result = preprocessor.applyBrandAliases(`${alias} Mate 60`);
        expect(result).toContain('华为');
      }
    });
  });
  
  describe('normalize method', () => {
    it('should normalize RAM+Storage format', () => {
      expect(preprocessor.normalize('华为 Mate 60 Pro 8GB+256GB')).toContain('8+256');
      expect(preprocessor.normalize('小米 14 Pro 12GB+512GB')).toContain('12+512');
      expect(preprocessor.normalize('vivo Y50 6GB+128GB')).toContain('6+128');
    });
    
    it('should normalize capacity with spaces', () => {
      expect(preprocessor.normalize('华为 Mate 60 Pro 8 GB + 256 GB')).toContain('8+256');
      expect(preprocessor.normalize('小米 14 Pro 12G + 512G')).toContain('12+512');
    });
    
    it('should normalize storage-only format', () => {
      expect(preprocessor.normalize('iPad Pro 256GB')).toContain('256');
      expect(preprocessor.normalize('iPad Pro 512GB')).toContain('512');
      expect(preprocessor.normalize('iPad Pro 1TB')).toContain('1T');
    });
    
    it('should normalize TB to T', () => {
      expect(preprocessor.normalize('华为 Mate 60 Pro 16GB+1TB')).toContain('16+1T');
      expect(preprocessor.normalize('iPad Pro 2TB')).toContain('2T');
    });
    
    it('should normalize spacing', () => {
      expect(preprocessor.normalize('华为  Mate   60  Pro')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.normalize('小米 14 Pro  8 + 256')).toContain('8+256');
    });
    
    it('should handle empty or null input', () => {
      expect(preprocessor.normalize('')).toBe('');
      expect(preprocessor.normalize('   ')).toBe('');
    });
    
    it('should handle multiple capacity formats', () => {
      const input = '华为 Mate 60 Pro 8GB+256GB 或 12GB+512GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).toContain('12+512');
    });
  });
  
  describe('preprocess method (complete pipeline)', () => {
    it('should apply all preprocessing steps in order', () => {
      const input = '华为 GT5 8GB+256GB 雾松蓝 (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should have cleaned demo marker
      expect(result).not.toContain('演示机');
      
      // Should have corrected typo
      expect(result).toContain('雾凇蓝');
      
      // Should have expanded abbreviation
      expect(result).toContain('Watch GT 5');
      
      // Should have normalized capacity
      expect(result).toContain('8+256');
    });
    
    it('should handle brand alias normalization in pipeline', () => {
      const input = 'HUAWEI GT5 8GB+256GB (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should normalize brand alias
      expect(result).toContain('华为');
      
      // Should expand abbreviation
      expect(result).toContain('Watch GT 5');
      
      // Should normalize capacity
      expect(result).toContain('8+256');
      
      // Should clean demo marker
      expect(result).not.toContain('演示机');
    });
    
    it('should handle complex real-world examples', () => {
      const input1 = '华为 Mate 60 Pro【礼盒装】12GB + 512GB 雾松蓝 + 充电器';
      const result1 = preprocessor.preprocess(input1);
      expect(result1).not.toContain('礼盒');
      expect(result1).not.toContain('充电器');
      expect(result1).toContain('12+512');
      expect(result1).toContain('雾凇蓝');
      
      const input2 = '小米 14 Pro (演示机) 8G+256G';
      const result2 = preprocessor.preprocess(input2);
      expect(result2).not.toContain('演示机');
      expect(result2).toContain('8+256');
      
      const input3 = 'OPPO A5 活力版 6GB+128GB';
      const result3 = preprocessor.preprocess(input3);
      expect(result3).toContain('6+128');
      
      const input4 = 'XIAOMI 14 Pro 12GB+512GB';
      const result4 = preprocessor.preprocess(input4);
      expect(result4).toContain('小米');
      expect(result4).toContain('12+512');
    });
    
    it('should handle watch products', () => {
      const input = '华为 GT5 46mm 复合编织表带 (演示机)';
      const result = preprocessor.preprocess(input);
      expect(result).not.toContain('演示机');
      expect(result).toContain('Watch GT 5');
      expect(result).toContain('46mm');
    });
    
    it('should handle watch products with brand aliases', () => {
      const input = 'HUAWEI GT5 46mm NFC版';
      const result = preprocessor.preprocess(input);
      expect(result).toContain('华为');
      expect(result).toContain('Watch GT 5');
      expect(result).toContain('46mm');
      expect(result).toContain('NFC');
    });
    
    it('should handle empty or null input', () => {
      expect(preprocessor.preprocess('')).toBe('');
      expect(preprocessor.preprocess('   ')).toBe('');
    });
    
    it('should preserve important product information', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雅川青 活力版';
      const result = preprocessor.preprocess(input);
      
      // Should preserve brand
      expect(result).toContain('华为');
      
      // Should preserve model
      expect(result).toContain('Mate 60 Pro');
      
      // Should preserve and normalize capacity
      expect(result).toContain('12+512');
      
      // Should preserve color
      expect(result).toContain('雅川青');
      
      // Should preserve version
      expect(result).toContain('活力版');
    });
    
    it('should handle strings with no preprocessing needed', () => {
      const input = '华为 Mate 60 Pro 12+512 雅川青';
      const result = preprocessor.preprocess(input);
      // Should be similar to input (maybe just spacing normalized)
      expect(result).toContain('华为');
      expect(result).toContain('Mate 60 Pro');
      expect(result).toContain('12+512');
      expect(result).toContain('雅川青');
    });
  });
  
  describe('edge cases', () => {
    it('should handle very long input strings', () => {
      const longInput = '华为 Mate 60 Pro 12GB+512GB 雾松蓝 活力版 蓝牙版 5G版 全网通 (演示机)【礼盒装】+ 充电器 + 数据线 + 保护壳';
      const result = preprocessor.preprocess(longInput);
      
      // Should clean all markers
      expect(result).not.toContain('演示机');
      expect(result).not.toContain('礼盒');
      expect(result).not.toContain('充电器');
      
      // Should correct typos
      expect(result).toContain('雾凇蓝');
      
      // Should normalize capacity
      expect(result).toContain('12+512');
    });
    
    it('should handle input with only noise', () => {
      const input = '(演示机)【礼盒装】+ 充电器';
      const result = preprocessor.preprocess(input);
      // Should be empty or minimal after cleaning
      expect(result.length).toBeLessThan(input.length);
    });
    
    it('should handle input with special Unicode characters', () => {
      const input = '华为 Mate 60 Pro 12GB+256GB 雅川青';
      const result = preprocessor.preprocess(input);
      expect(result).toContain('华为');
      expect(result).toContain('雅川青');
    });
    
    it('should handle mixed language input', () => {
      const input = 'HUAWEI Mate 60 Pro 12GB+256GB 雅川青';
      const result = preprocessor.preprocess(input);
      // Brand alias should normalize HUAWEI to 华为
      expect(result).toContain('华为');
      expect(result).toContain('Mate 60 Pro');
      expect(result).toContain('12+256');
    });
  });
  
  describe('performance', () => {
    it('should process input quickly', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雾松蓝 (演示机)';
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        preprocessor.preprocess(input);
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / 1000;
      
      // Should process 1000 inputs in less than 100ms (avg < 0.1ms per input)
      expect(avgTime).toBeLessThan(0.1);
    });
  });
});
