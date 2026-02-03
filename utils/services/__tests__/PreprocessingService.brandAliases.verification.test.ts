/**
 * Brand Alias Verification Tests for Task 7.7
 * 
 * This test file specifically verifies the brand alias functionality
 * as required by task 7.7 of the smart-match-optimization spec.
 * 
 * Requirements: 2.2.4 - System should unify brand names (e.g., "HUAWEI" → "华为")
 */

import { PreprocessingService } from '../PreprocessingService';

describe('Task 7.7: Brand Alias Verification', () => {
  let preprocessor: PreprocessingService;

  beforeAll(async () => {
    preprocessor = new PreprocessingService();
    await preprocessor.initialize();
  });

  describe('Configuration File Brand Aliases', () => {
    test('should have loaded brand aliases from config', () => {
      const textMappings = preprocessor.getTextMappings();
      expect(textMappings).not.toBeNull();
      expect(textMappings?.brandAliases).toBeDefined();
      expect(Object.keys(textMappings?.brandAliases || {})).toContain('华为');
    });

    test('should have HUAWEI as alias for 华为', () => {
      const textMappings = preprocessor.getTextMappings();
      const huaweiAliases = textMappings?.brandAliases['华为'];
      expect(huaweiAliases).toContain('HUAWEI');
      expect(huaweiAliases).toContain('huawei');
      expect(huaweiAliases).toContain('Huawei');
    });
  });

  describe('Common Brand Alias Mappings (Default Config)', () => {
    // Note: These tests use the default configuration which only includes
    // 华为 (HUAWEI) and 小米 (XIAOMI/MI) brand aliases
    
    test('HUAWEI → 华为', () => {
      expect(preprocessor.applyBrandAliases('HUAWEI Mate 60 Pro')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.applyBrandAliases('huawei Mate 60 Pro')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.applyBrandAliases('Huawei Mate 60 Pro')).toBe('华为 Mate 60 Pro');
    });

    test('XIAOMI → 小米', () => {
      expect(preprocessor.applyBrandAliases('XIAOMI 14 Pro')).toBe('小米 14 Pro');
      expect(preprocessor.applyBrandAliases('xiaomi 14 Pro')).toBe('小米 14 Pro');
      expect(preprocessor.applyBrandAliases('Xiaomi 14 Pro')).toBe('小米 14 Pro');
    });

    test('MI → 小米', () => {
      expect(preprocessor.applyBrandAliases('MI Band 8')).toBe('小米 Band 8');
      expect(preprocessor.applyBrandAliases('mi Band 8')).toBe('小米 Band 8');
    });
  });

  describe('Brand Alias in Complete Preprocessing Pipeline', () => {
    test('should apply brand alias in full preprocess pipeline', () => {
      const input = 'HUAWEI Mate 60 Pro 12GB+256GB 雾松蓝 (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should normalize brand alias
      expect(result).toContain('华为');
      // Should also apply other preprocessing steps
      expect(result).toContain('雾凇蓝'); // typo correction
      expect(result).toContain('12+256'); // capacity normalization
      expect(result).not.toContain('演示机'); // cleaning
      expect(result).not.toContain('HUAWEI'); // brand alias applied
    });

    test('should handle watch products with brand aliases', () => {
      const input = 'HUAWEI GT5 46mm NFC版';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('华为');
      expect(result).toContain('Watch GT 5'); // abbreviation expansion
      expect(result).not.toContain('HUAWEI');
    });

    test('should handle multiple brands in comparison text', () => {
      const input = 'HUAWEI vs XIAOMI comparison';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('华为');
      expect(result).toContain('小米');
    });
  });

  describe('Edge Cases', () => {
    test('should not partially match brand aliases', () => {
      // "MI" should not match within "XIAOMI"
      const result = preprocessor.applyBrandAliases('XIAOMI 14 Pro');
      expect(result).toBe('小米 14 Pro');
      expect(result).not.toMatch(/小米.*小米/); // Should not have duplicate
    });

    test('should preserve canonical brand names', () => {
      expect(preprocessor.applyBrandAliases('华为 Mate 60 Pro')).toBe('华为 Mate 60 Pro');
      expect(preprocessor.applyBrandAliases('小米 14 Pro')).toBe('小米 14 Pro');
    });

    test('should handle empty input', () => {
      expect(preprocessor.applyBrandAliases('')).toBe('');
    });

    test('should handle input without brand aliases', () => {
      const input = 'Unknown Brand Phone 12GB+512GB';
      expect(preprocessor.applyBrandAliases(input)).toBe(input);
    });

    test('should handle mixed case brand aliases', () => {
      expect(preprocessor.applyBrandAliases('HuaWei Mate 60')).toBe('华为 Mate 60');
      expect(preprocessor.applyBrandAliases('XiaoMi 14 Pro')).toBe('小米 14 Pro');
    });
  });

  describe('Real-world Examples', () => {
    test('should handle typical user input with brand aliases (default config)', () => {
      // Only test brands available in default config: 华为 and 小米
      const examples = [
        { input: 'HUAWEI Mate 60 Pro 12+512 雅川青', expected: '华为' },
        { input: 'Xiaomi 14 Pro 8+256 曜金', expected: '小米' },
        { input: 'MI Band 8', expected: '小米' },
      ];

      for (const { input, expected } of examples) {
        const result = preprocessor.applyBrandAliases(input);
        expect(result).toContain(expected);
      }
    });
  });
});
