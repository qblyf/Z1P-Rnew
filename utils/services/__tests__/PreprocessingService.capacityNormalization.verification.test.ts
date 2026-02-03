/**
 * Task 7.9: Verification Tests for Capacity Normalization Functionality
 * 
 * This test file verifies that the capacity normalization functionality works correctly
 * according to requirement 2.2.5: System should normalize capacity formats
 * 
 * Test Coverage:
 * - Various capacity formats are normalized to unified format
 * - Test "8GB+256GB", "8G+256G", "8+256" and other formats
 * - All capacity normalizations from text-mappings.json are applied
 * 
 * **Validates: Requirements 2.2.5**
 */

import { PreprocessingService } from '../PreprocessingService';
import type { TextMappingsConfig } from '../../config-loader';

describe('Task 7.9: Capacity Normalization Verification', () => {
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
      expect(textMappings).toHaveProperty('capacityNormalizations');
    });
    
    it('should have capacityNormalizations mapping defined', () => {
      expect(textMappings?.capacityNormalizations).toBeDefined();
      expect(typeof textMappings?.capacityNormalizations).toBe('object');
    });
    
    it('should contain capacity normalization mappings', () => {
      expect(textMappings?.capacityNormalizations).toHaveProperty('8GB+256GB');
      expect(textMappings?.capacityNormalizations?.['8GB+256GB']).toBe('8+256');
    });
  });
  
  describe('Common Capacity Format Normalizations (Task 7.9 requirements)', () => {
    it('should normalize "8GB+256GB" to "8+256"', () => {
      const input = '华为 Mate 60 Pro 8GB+256GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('8GB+256GB');
    });
    
    it('should normalize "8G+256G" to "8+256"', () => {
      const input = '华为 Mate 60 Pro 8G+256G';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('8G+256G');
    });
    
    it('should normalize "8+256" format (already normalized)', () => {
      const input = '华为 Mate 60 Pro 8+256';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
    });
    
    it('should normalize "8+256GB" to "8+256"', () => {
      const input = '华为 Mate 60 Pro 8+256GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('8+256GB');
    });
    
    it('should normalize "8GB+256G" to "8+256"', () => {
      const input = '华为 Mate 60 Pro 8GB+256G';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('8GB+256G');
    });
  });
  
  describe('Various RAM+Storage Combinations', () => {
    it('should normalize 6GB+128GB format', () => {
      const input = 'vivo Y50 6GB+128GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('6+128');
      expect(result).not.toContain('6GB+128GB');
    });
    
    it('should normalize 12GB+512GB format', () => {
      const input = '小米 14 Pro 12GB+512GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('12+512');
      expect(result).not.toContain('12GB+512GB');
    });
    
    it('should normalize 16GB+512GB format', () => {
      const input = 'OPPO Find X7 16GB+512GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('16+512');
      expect(result).not.toContain('16GB+512GB');
    });
    
    it('should normalize 16GB+1TB format', () => {
      const input = '小米 14 Ultra 16GB+1TB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('16+1T');
      expect(result).not.toContain('16GB+1TB');
    });
    
    it('should normalize 24GB+1TB format', () => {
      const input = 'vivo X100 Pro 24GB+1TB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('24+1T');
      expect(result).not.toContain('24GB+1TB');
    });
  });
  
  describe('Standalone Storage Capacity', () => {
    it('should normalize "256GB" to "256"', () => {
      const input = 'iPad Pro 256GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('256');
      expect(result).not.toContain('256GB');
    });
    
    it('should normalize "512GB" to "512"', () => {
      const input = 'iPad Pro 512GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('512');
      expect(result).not.toContain('512GB');
    });
    
    it('should normalize "1TB" to "1T"', () => {
      const input = 'iPad Pro 1TB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('1T');
      expect(result).not.toContain('1TB');
    });
    
    it('should normalize "128GB" to "128"', () => {
      const input = 'iPhone 15 128GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('128');
      expect(result).not.toContain('128GB');
    });
  });
  
  describe('Capacity with Spaces', () => {
    it('should normalize capacity with spaces around "+"', () => {
      const input = '华为 Mate 60 Pro 8 GB + 256 GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('8 GB + 256 GB');
    });
    
    it('should normalize capacity with mixed spacing', () => {
      const input = '小米 14 Pro 12G + 512G';
      const result = preprocessor.normalize(input);
      expect(result).toContain('12+512');
      expect(result).not.toContain('12G + 512G');
    });
    
    it('should normalize capacity with spaces before units', () => {
      const input = 'vivo Y50 8 GB+256 GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
    });
  });
  
  describe('Case Insensitive Normalization', () => {
    it('should handle lowercase "gb" units', () => {
      const input = '华为 Mate 60 Pro 8gb+256gb';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('gb');
    });
    
    it('should handle uppercase "GB" units', () => {
      const input = '华为 Mate 60 Pro 8GB+256GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).not.toContain('GB');
    });
    
    it('should handle mixed case units', () => {
      const input = '华为 Mate 60 Pro 8Gb+256gB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
    });
    
    it('should handle lowercase "tb" units', () => {
      const input = '小米 14 Ultra 16gb+1tb';
      const result = preprocessor.normalize(input);
      expect(result).toContain('16+1T');
      expect(result).not.toContain('tb');
    });
  });
  
  describe('Multiple Capacities in One String', () => {
    it('should normalize multiple capacity formats in one string', () => {
      const input = '华为 Mate 60 Pro 8GB+256GB 或 12GB+512GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('8+256');
      expect(result).toContain('12+512');
      expect(result).not.toContain('GB');
    });
    
    it('should normalize different capacity formats together', () => {
      const input = '可选 6GB+128GB、8GB+256GB、12GB+512GB';
      const result = preprocessor.normalize(input);
      expect(result).toContain('6+128');
      expect(result).toContain('8+256');
      expect(result).toContain('12+512');
    });
  });
  
  describe('Integration with Complete Preprocessing Pipeline', () => {
    it('should apply capacity normalization in the complete preprocess pipeline', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雾凇蓝 (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should normalize capacity
      expect(result).toContain('12+512');
      expect(result).not.toContain('12GB+512GB');
      
      // Should also apply other preprocessing steps
      expect(result).not.toContain('演示机');
      expect(result).toContain('雾凇蓝');
    });
    
    it('should work with brand aliases and capacity normalization together', () => {
      const input = 'HUAWEI Mate 60 Pro 8GB+256GB';
      const result = preprocessor.preprocess(input);
      
      // Should normalize capacity
      expect(result).toContain('8+256');
      expect(result).not.toContain('8GB+256GB');
      
      // Should normalize brand alias
      expect(result).toContain('华为');
    });
    
    it('should work with abbreviation expansion and capacity normalization', () => {
      const input = '华为 GT5 8GB+256GB';
      const result = preprocessor.preprocess(input);
      
      // Should normalize capacity
      expect(result).toContain('8+256');
      
      // Should expand abbreviation
      expect(result).toContain('Watch GT 5');
    });
    
    it('should work with typo correction and capacity normalization', () => {
      const input = '华为 Mate 60 Pro 12GB+512GB 雾松蓝';
      const result = preprocessor.preprocess(input);
      
      // Should normalize capacity
      expect(result).toContain('12+512');
      
      // Should correct typo
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('雾松蓝');
    });
  });
  
  describe('All Configured Capacity Normalizations', () => {
    it('should apply all capacity normalizations from configuration', () => {
      if (!textMappings?.capacityNormalizations) {
        throw new Error('capacityNormalizations not loaded');
      }
      
      // Test each capacity normalization from the configuration
      for (const [pattern, normalized] of Object.entries(textMappings.capacityNormalizations)) {
        const input = `测试产品 ${pattern}`;
        const result = preprocessor.normalize(input);
        
        expect(result).toContain(normalized);
        // The original pattern should be replaced (unless it's already normalized)
        if (pattern !== normalized) {
          expect(result).not.toContain(pattern);
        }
      }
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      expect(preprocessor.normalize('')).toBe('');
    });
    
    it('should handle input with no capacity', () => {
      const input = '华为 Mate 60 Pro 雅川青';
      const result = preprocessor.normalize(input);
      expect(result).toBe(input);
    });
    
    it('should preserve already normalized capacity', () => {
      const input = '华为 Mate 60 Pro 8+256';
      const result = preprocessor.normalize(input);
      expect(result).toBe(input);
    });
    
    it('should handle capacity at different positions', () => {
      // Capacity at the beginning
      const input1 = '8GB+256GB 华为 Mate 60 Pro';
      const result1 = preprocessor.normalize(input1);
      expect(result1).toContain('8+256');
      
      // Capacity in the middle
      const input2 = '华为 8GB+256GB Mate 60 Pro';
      const result2 = preprocessor.normalize(input2);
      expect(result2).toContain('8+256');
      
      // Capacity at the end
      const input3 = '华为 Mate 60 Pro 8GB+256GB';
      const result3 = preprocessor.normalize(input3);
      expect(result3).toContain('8+256');
    });
    
    it('should not normalize numbers that are not capacities', () => {
      const input = '华为 Mate 60 Pro';
      const result = preprocessor.normalize(input);
      expect(result).toContain('60');
      expect(result).toContain('Mate 60 Pro');
    });
  });
  
  describe('Real-World Examples', () => {
    it('should handle real product names with various capacity formats', () => {
      const examples = [
        {
          input: '华为 Mate 60 Pro 12GB+512GB 雅川青',
          expected: '12+512'
        },
        {
          input: '小米 14 Pro 8G+256G 曜金',
          expected: '8+256'
        },
        {
          input: 'vivo Y50 全网通5G 8+256 白金',
          expected: '8+256'
        },
        {
          input: 'OPPO Find X7 16GB+1TB 星空黑',
          expected: '16+1T'
        },
        {
          input: 'iPhone 15 Pro Max 256GB 钛金属',
          expected: '256'
        }
      ];
      
      for (const { input, expected } of examples) {
        const result = preprocessor.normalize(input);
        expect(result).toContain(expected);
      }
    });
    
    it('should handle product names with capacity in full preprocessing', () => {
      const input = 'HUAWEI GT5 8GB+256GB 雾松蓝 (演示机)';
      const result = preprocessor.preprocess(input);
      
      // Should normalize capacity
      expect(result).toContain('8+256');
      expect(result).not.toContain('8GB+256GB');
      
      // Should apply all other preprocessing
      expect(result).toContain('华为');
      expect(result).toContain('Watch GT 5');
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('演示机');
    });
    
    it('should handle complex product names with multiple preprocessing needs', () => {
      const input = 'Xiaomi 14 Pro【礼盒装】12G + 512G 雾松蓝 + 充电器';
      const result = preprocessor.preprocess(input);
      
      // Should normalize capacity
      expect(result).toContain('12+512');
      expect(result).not.toContain('12G + 512G');
      
      // Should apply other preprocessing
      expect(result).toContain('小米');
      expect(result).not.toContain('礼盒装');
      expect(result).not.toContain('充电器');
      expect(result).toContain('雾凇蓝');
      expect(result).not.toContain('雾松蓝');
    });
  });
  
  describe('Consistency Verification', () => {
    it('should produce consistent results for equivalent capacity formats', () => {
      const formats = [
        '华为 Mate 60 Pro 8GB+256GB',
        '华为 Mate 60 Pro 8G+256G',
        '华为 Mate 60 Pro 8+256GB',
        '华为 Mate 60 Pro 8GB+256G'
      ];
      
      const results = formats.map(format => preprocessor.normalize(format));
      
      // All results should contain the same normalized capacity
      results.forEach(result => {
        expect(result).toContain('8+256');
      });
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });
    
    it('should produce consistent results regardless of spacing', () => {
      const formats = [
        '华为 Mate 60 Pro 8GB+256GB',
        '华为 Mate 60 Pro 8 GB + 256 GB',
        '华为 Mate 60 Pro 8GB + 256GB',
        '华为 Mate 60 Pro 8 GB+256 GB'
      ];
      
      const results = formats.map(format => preprocessor.normalize(format));
      
      // All results should contain the same normalized capacity
      results.forEach(result => {
        expect(result).toContain('8+256');
      });
    });
    
    it('should produce consistent results regardless of case', () => {
      const formats = [
        '华为 Mate 60 Pro 8GB+256GB',
        '华为 Mate 60 Pro 8gb+256gb',
        '华为 Mate 60 Pro 8Gb+256Gb',
        '华为 Mate 60 Pro 8gB+256gB'
      ];
      
      const results = formats.map(format => preprocessor.normalize(format));
      
      // All results should contain the same normalized capacity
      results.forEach(result => {
        expect(result).toContain('8+256');
      });
    });
  });
});
