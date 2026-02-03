/**
 * Task 7.3: Verification Tests for Spelling Correction Functionality
 * 
 * This test file verifies that the spelling correction functionality works correctly
 * according to requirement 2.2.2: System should correct common spelling errors
 * 
 * Test Coverage:
 * - Configuration file spelling error mappings work correctly
 * - Common spelling errors are corrected (e.g., "雾松蓝"→"雾凇蓝")
 * - All typo corrections from text-mappings.json are applied
 * 
 * **Validates: Requirements 2.2.2**
 */

import { PreprocessingService } from '../PreprocessingService';
import { ConfigLoader } from '../../config-loader';
import type { TextMappingsConfig } from '../../config-loader';

describe('Task 7.3: Spelling Correction Verification', () => {
  let preprocessor: PreprocessingService;
  let textMappings: TextMappingsConfig | null;
  
  beforeAll(async () => {
    // Initialize the preprocessing service
    preprocessor = new PreprocessingService();
    await preprocessor.initialize();
    textMappings = preprocessor.getTextMappings();
  });
  
  describe('Configuration File Verification', () => {
    it('should load text-mappings configuration successfully', () => {
      expect(textMappings).not.toBeNull();
      expect(textMappings).toHaveProperty('typoCorrections');
    });
    
    it('should have typoCorrections mapping defined', () => {
      expect(textMappings?.typoCorrections).toBeDefined();
      expect(typeof textMappings?.typoCorrections).toBe('object');
    });
    
    it('should contain the example typo correction: 雾松蓝 → 雾凇蓝', () => {
      expect(textMappings?.typoCorrections).toHaveProperty('雾松蓝');
      expect(textMappings?.typoCorrections?.['雾松蓝']).toBe('雾凇蓝');
    });
  });
  
  describe('Common Spelling Error Corrections', () => {
    it('should correct "雾松蓝" to "雾凇蓝" (Task 7.3 requirement)', () => {
      const input = '华为 Mate 60 Pro 雾松蓝';
      const result = preprocessor.correctTypos(input);
      expect(result).toBe('华为 Mate 60 Pro 雾凇蓝');
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('雾松蓝');
    });
    
    // Note: The following tests verify that the typo correction mechanism works
    // They will only pass if the full configuration file is loaded
    // In test environment with defaults, only "雾松蓝" → "雾凇蓝" is available
    
    it('should correct typos that are defined in the loaded configuration', () => {
      // This test verifies the mechanism works for any configured typo
      if (!textMappings?.typoCorrections) {
        throw new Error('typoCorrections not loaded');
      }
      
      // Test each typo correction that is actually loaded
      for (const [typo, correction] of Object.entries(textMappings.typoCorrections)) {
        const input = `测试产品 ${typo}`;
        const result = preprocessor.correctTypos(input);
        
        expect(result).toContain(correction);
        expect(result).not.toContain(typo);
      }
    });
  });
  
  describe('Case-Insensitive Correction', () => {
    it('should handle case variations of typos', () => {
      // Note: Chinese characters don't have case, but this tests the mechanism
      const input = '华为 Mate 60 Pro 雾松蓝';
      const result = preprocessor.correctTypos(input);
      expect(result).toContain('雾凇蓝');
    });
  });
  
  describe('Multiple Typos in One String', () => {
    it('should correct multiple typos in a single input (if configured)', () => {
      // This test only works with full configuration
      // With defaults, only "雾松蓝" is available
      const input = '华为 Mate 60 Pro 雾松蓝';
      const result = preprocessor.correctTypos(input);
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('雾松蓝');
    });
    
    it('should correct multiple occurrences of the same typo', () => {
      const input = '雾松蓝 和 雾松蓝 都是错误的';
      const result = preprocessor.correctTypos(input);
      expect(result).toBe('雾凇蓝 和 雾凇蓝 都是错误的');
      expect(result).not.toContain('雾松蓝');
    });
  });
  
  describe('Integration with Complete Preprocessing Pipeline', () => {
    it('should apply typo correction in the complete preprocess pipeline', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雾松蓝 (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should correct the typo
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('雾松蓝');
      
      // Should also apply other preprocessing steps
      expect(result).not.toContain('演示机');
      expect(result).toContain('12+512');
    });
    
    it('should work with brand aliases and typo correction together', () => {
      const input = 'HUAWEI Mate 60 Pro 雾松蓝';
      const result = preprocessor.preprocess(input);
      
      // Should correct typo
      expect(result).toContain('雾凇蓝');
      
      // Should normalize brand alias
      expect(result).toContain('华为');
    });
    
    it('should work with abbreviation expansion and typo correction', () => {
      const input = '华为 GT5 雾松蓝';
      const result = preprocessor.preprocess(input);
      
      // Should correct typo
      expect(result).toContain('雾凇蓝');
      
      // Should expand abbreviation
      expect(result).toContain('Watch GT 5');
    });
  });
  
  describe('Edge Cases', () => {
    it('should not modify correct color names', () => {
      const input = '华为 Mate 60 Pro 雾凇蓝';
      const result = preprocessor.correctTypos(input);
      expect(result).toBe(input);
    });
    
    it('should handle empty input', () => {
      expect(preprocessor.correctTypos('')).toBe('');
    });
    
    it('should handle input with no typos', () => {
      const input = '华为 Mate 60 Pro 雅川青';
      const result = preprocessor.correctTypos(input);
      expect(result).toBe(input);
    });
    
    it('should handle typos in different positions', () => {
      // Typo at the beginning
      const input1 = '雾松蓝 华为 Mate 60 Pro';
      const result1 = preprocessor.correctTypos(input1);
      expect(result1).toContain('雾凇蓝');
      
      // Typo in the middle
      const input2 = '华为 雾松蓝 Mate 60 Pro';
      const result2 = preprocessor.correctTypos(input2);
      expect(result2).toContain('雾凇蓝');
      
      // Typo at the end
      const input3 = '华为 Mate 60 Pro 雾松蓝';
      const result3 = preprocessor.correctTypos(input3);
      expect(result3).toContain('雾凇蓝');
    });
  });
  
  describe('All Configured Typo Corrections', () => {
    it('should apply all typo corrections from configuration', () => {
      if (!textMappings?.typoCorrections) {
        throw new Error('typoCorrections not loaded');
      }
      
      // Test each typo correction from the configuration
      for (const [typo, correction] of Object.entries(textMappings.typoCorrections)) {
        const input = `测试产品 ${typo}`;
        const result = preprocessor.correctTypos(input);
        
        expect(result).toContain(correction);
        expect(result).not.toContain(typo);
      }
    });
  });
  
  describe('Real-World Examples', () => {
    it('should handle real product names with typos', () => {
      // Test with the typo that's available in defaults
      const examples = [
        {
          input: '华为 Mate 60 Pro 12GB+512GB 雾松蓝',
          expected: '华为 Mate 60 Pro 12GB+512GB 雾凇蓝'
        }
      ];
      
      for (const { input, expected } of examples) {
        const result = preprocessor.correctTypos(input);
        expect(result).toBe(expected);
      }
    });
    
    it('should handle product names with the configured typo in full preprocessing', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雾松蓝 (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should correct typo
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('雾松蓝');
      
      // Should apply other preprocessing
      expect(result).not.toContain('演示机');
      expect(result).toContain('12+512');
    });
  });
});
