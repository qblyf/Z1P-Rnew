/**
 * Unit tests for InfoExtractor service
 * 
 * These tests verify that the InfoExtractor correctly extracts information
 * from product names after the migration from SimpleMatcher.
 * 
 * Test Coverage:
 * - Brand extraction
 * - Model extraction
 * - Color extraction
 * - Capacity extraction
 * - Version extraction
 * - Confidence scoring
 * - Edge cases and error handling
 */

import { InfoExtractor } from './InfoExtractor';
import type { BrandData } from '../types';

describe('InfoExtractor', () => {
  let extractor: InfoExtractor;
  
  const mockBrands: BrandData[] = [
    { name: '华为', spell: 'HUAWEI', color: '#000000' },
    { name: '小米', spell: 'Xiaomi', color: '#000000' },
    { name: 'OPPO', spell: 'OPPO', color: '#000000' },
    { name: 'vivo', spell: 'vivo', color: '#000000' },
    { name: 'Apple', spell: 'Apple', color: '#000000' },
  ];
  
  const mockColors = [
    '雾凇蓝', '星岩黑', '雅川青', '玉石绿', '龙晶紫',
    '曜石黑', '冰霜银', '流光紫', '星河蓝', '白色', '黑色'
  ];
  
  beforeEach(() => {
    extractor = new InfoExtractor();
    extractor.setBrandList(mockBrands);
    extractor.setColorList(mockColors);
  });
  
  describe('extractBrand', () => {
    it('should extract brand from Chinese brand name', () => {
      const result = extractor.extractBrand('华为 Mate 60 Pro');
      expect(result.value).toBe('华为');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.source).toBe('exact');
    });
    
    it('should extract brand from English brand name', () => {
      const result = extractor.extractBrand('OPPO A5 活力版');
      expect(result.value).toBe('OPPO');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    it('should return null for input without brand', () => {
      const result = extractor.extractBrand('Unknown Product 123');
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
    
    it('should handle empty input', () => {
      const result = extractor.extractBrand('');
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('extractModel', () => {
    it('should extract model from phone name', () => {
      const result = extractor.extractModel('华为 Mate 60 Pro', '华为');
      expect(result.value).toBe('mate60pro');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should extract model from watch name', () => {
      const result = extractor.extractModel('华为 Watch GT 5', '华为');
      expect(result.value).toBe('watchgt5');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should extract model with numbers', () => {
      const result = extractor.extractModel('小米 14 Pro', '小米');
      expect(result.value).toBe('14pro');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should handle model without brand context', () => {
      const result = extractor.extractModel('Mate 60 Pro');
      expect(result.value).not.toBeNull();
    });
  });
  
  describe('extractColor', () => {
    it('should extract exact color match', () => {
      const result = extractor.extractColor('华为 Mate 60 Pro 雅川青');
      expect(result.value).toBe('雅川青');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.source).toBe('exact');
    });
    
    it('should extract color from middle of string', () => {
      const result = extractor.extractColor('OPPO A5 星岩黑 8+256');
      expect(result.value).toBe('星岩黑');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
    
    it('should return null when no color found', () => {
      const result = extractor.extractColor('华为 Mate 60 Pro');
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
    
    it('should handle multiple colors (return first)', () => {
      const result = extractor.extractColor('黑色 白色 手机');
      expect(result.value).not.toBeNull();
      expect(['黑色', '白色']).toContain(result.value);
    });
  });
  
  describe('extractCapacity', () => {
    it('should extract capacity with + separator', () => {
      const result = extractor.extractCapacity('华为 Mate 60 Pro 12+512');
      expect(result.value).toBe('12+512');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    it('should extract capacity with GB suffix', () => {
      const result = extractor.extractCapacity('OPPO A5 8GB+256GB');
      expect(result.value).toBe('8+256');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    it('should extract capacity with G suffix', () => {
      const result = extractor.extractCapacity('小米 14 12G+512G');
      expect(result.value).toBe('12+512');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    it('should extract storage only capacity', () => {
      const result = extractor.extractCapacity('iPhone 15 256GB');
      expect(result.value).toBe('256');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should return null when no capacity found', () => {
      const result = extractor.extractCapacity('华为 Watch GT 5');
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('extractVersion', () => {
    it('should extract version from product name', () => {
      const result = extractor.extractVersion('OPPO A5 活力版');
      expect(result.value).not.toBeNull();
      expect(result.value?.name).toBe('活力版');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should extract 5G version', () => {
      const result = extractor.extractVersion('华为 Mate 60 Pro 5G版');
      expect(result.value).not.toBeNull();
      expect(result.value?.name).toContain('5G');
    });
    
    it('should extract Bluetooth version', () => {
      const result = extractor.extractVersion('华为 Watch GT 5 蓝牙版');
      expect(result.value).not.toBeNull();
      expect(result.value?.name).toBe('蓝牙版');
    });
    
    it('should return null when no version found', () => {
      const result = extractor.extractVersion('华为 Mate 60 Pro');
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });
  
  describe('extractAll', () => {
    it('should extract all information from complete product name', () => {
      const result = extractor.extractAll('华为 Mate 60 Pro 12+512 雅川青');
      
      expect(result.originalInput).toBe('华为 Mate 60 Pro 12+512 雅川青');
      expect(result.brand.value).toBe('华为');
      expect(result.model.value).toBe('mate60pro');
      expect(result.capacity.value).toBe('12+512');
      expect(result.color.value).toBe('雅川青');
    });
    
    it('should extract partial information when some specs missing', () => {
      const result = extractor.extractAll('小米 14 Pro 星岩黑');
      
      expect(result.brand.value).toBe('小米');
      expect(result.model.value).toBe('14pro');
      expect(result.capacity.value).toBeNull();
      expect(result.color.value).toBe('星岩黑');
    });
    
    it('should handle watch products', () => {
      const result = extractor.extractAll('华为 Watch GT 5 46mm 蓝牙版');
      
      expect(result.brand.value).toBe('华为');
      expect(result.model.value).toBe('watchgt5');
      expect(result.version.value).not.toBeNull();
      expect(result.productType).toBe('watch');
    });
  });
  
  describe('Confidence Scoring', () => {
    it('should provide high confidence for exact matches', () => {
      const result = extractor.extractBrand('华为 Mate 60 Pro');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
    
    it('should provide zero confidence for no match', () => {
      const result = extractor.extractBrand('Unknown Brand');
      expect(result.confidence).toBe(0);
    });
    
    it('should provide confidence scores for all extractions', () => {
      const result = extractor.extractAll('华为 Mate 60 Pro 12+512 雅川青');
      
      expect(result.brand.confidence).toBeGreaterThan(0);
      expect(result.model.confidence).toBeGreaterThan(0);
      expect(result.capacity.confidence).toBeGreaterThan(0);
      expect(result.color.confidence).toBeGreaterThan(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty string input', () => {
      const result = extractor.extractAll('');
      expect(result.brand.value).toBeNull();
      expect(result.model.value).toBeNull();
    });
    
    it('should handle whitespace-only input', () => {
      const result = extractor.extractAll('   ');
      expect(result.brand.value).toBeNull();
    });
    
    it('should handle special characters', () => {
      const result = extractor.extractBrand('华为 Mate 60 Pro (演示机)');
      expect(result.value).toBe('华为');
    });
    
    it('should handle mixed case input', () => {
      const result = extractor.extractBrand('HUAWEI mate 60 pro');
      expect(result.value).not.toBeNull();
    });
  });
  
  describe('Configuration', () => {
    it('should work without brand list set', () => {
      const newExtractor = new InfoExtractor();
      const result = newExtractor.extractBrand('华为 Mate 60 Pro');
      // Should still work, possibly with lower confidence
      expect(result).toBeDefined();
    });
    
    it('should work without color list set', () => {
      const newExtractor = new InfoExtractor();
      const result = newExtractor.extractColor('华为 Mate 60 Pro 黑色');
      // Should still work with basic colors
      expect(result).toBeDefined();
    });
    
    it('should update when brand list changes', () => {
      const newBrands: BrandData[] = [{ name: 'TestBrand', spell: 'TestBrand', color: '#000000' }];
      extractor.setBrandList(newBrands);
      
      const result = extractor.extractBrand('TestBrand Product');
      expect(result.value).toBe('TestBrand');
    });
  });
  
  /**
   * Tests for Task 10.2: Model Normalization Optimization
   * 
   * These tests verify that the optimized model extraction logic correctly
   * handles cases where normalization (adding spaces between letters/numbers)
   * would break simple model patterns like "y50" → "y 50".
   * 
   * The optimization extracts simple models BEFORE applying normalization,
   * preventing patterns from being broken.
   */
  describe('Model Normalization Optimization (Task 10.2)', () => {
    describe('Simple Model Extraction Before Normalization', () => {
      it('should extract "y50" without breaking it into "y 50"', () => {
        const result = extractor.extractModel('vivo Y50 5G', 'vivo');
        expect(result.value).toBe('y50');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.source).toBe('exact');
      });
      
      it('should extract "y50" from full product name', () => {
        const result = extractor.extractModel('vivo Y50 全网通5G 8GB+256GB 白金', 'vivo');
        expect(result.value).toBe('y50');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
      
      it('should extract "p50" without breaking pattern', () => {
        const result = extractor.extractModel('华为 P50 Pro', '华为');
        // Should extract "p50pro" as complex model or "p50" as simple model
        expect(result.value).toMatch(/p50/);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
      
      it('should extract "a5" from OPPO product', () => {
        const result = extractor.extractModel('OPPO A5 活力版 8+256', 'OPPO');
        expect(result.value).toBe('a5');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
      
      it('should extract "15r" from Redmi product', () => {
        const result = extractor.extractModel('红米 15R 5G 4+128', '红米');
        expect(result.value).toBe('15r');
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });
    
    describe('Complex Model Extraction After Normalization', () => {
      it('should extract complex model "mate60pro" with normalization', () => {
        const result = extractor.extractModel('华为 Mate 60 Pro', '华为');
        expect(result.value).toBe('mate60pro');
        expect(result.confidence).toBe(1.0); // Complex models have highest confidence
      });
      
      it('should extract "14promax" from iPhone', () => {
        const result = extractor.extractModel('iPhone 14 Pro Max', 'Apple');
        expect(result.value).toMatch(/14.*pro.*max/);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
      
      it('should extract "s50promini" with normalization', () => {
        const result = extractor.extractModel('vivo S50 Pro mini', 'vivo');
        expect(result.value).toMatch(/s50.*pro.*mini/);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });
    
    describe('Priority Order Verification', () => {
      it('should prioritize simple model over normalized extraction', () => {
        // "y50" should be extracted as simple model before normalization
        const result = extractor.extractModel('vivo Y50', 'vivo');
        expect(result.value).toBe('y50');
        // Simple model extracted before normalization has confidence 0.9
        expect(result.confidence).toBe(0.9);
      });
      
      it('should use complex model when suffixes present', () => {
        // "mate60pro" should be extracted as complex model after normalization
        const result = extractor.extractModel('华为 Mate60Pro', '华为');
        expect(result.value).toBe('mate60pro');
        // Complex models have confidence 1.0
        expect(result.confidence).toBe(1.0);
      });
      
      it('should fallback to normalized extraction when simple fails', () => {
        // Test case where simple extraction might not work but normalized does
        const result = extractor.extractModel('Product XYZ123', 'Brand');
        expect(result.value).not.toBeNull();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
    
    describe('Regression Tests', () => {
      it('should not break existing model extractions', () => {
        const testCases = [
          { input: '华为 Mate 60 Pro', brand: '华为', expected: 'mate60pro' },
          { input: '小米 14 Pro', brand: '小米', expected: '14pro' },
          { input: 'OPPO Find X5 Pro', brand: 'OPPO', expected: 'findx5pro' },
          { input: '华为 Watch GT 5', brand: '华为', expected: 'watchgt5' },
        ];
        
        testCases.forEach(({ input, brand, expected }) => {
          const result = extractor.extractModel(input, brand);
          expect(result.value).toBe(expected);
        });
      });
      
      it('should handle edge cases consistently', () => {
        const edgeCases = [
          { input: '', brand: 'vivo', expectedNull: true },
          { input: '   ', brand: 'vivo', expectedNull: true },
          { input: 'vivo', brand: 'vivo', expectedNull: true },
          { input: 'vivo 5G', brand: 'vivo', expectedNull: true }, // No model, just network
        ];
        
        edgeCases.forEach(({ input, brand, expectedNull }) => {
          const result = extractor.extractModel(input, brand);
          if (expectedNull) {
            expect(result.value).toBeNull();
          }
        });
      });
    });
    
    describe('Confidence Score Accuracy', () => {
      it('should assign correct confidence for simple models', () => {
        const result = extractor.extractModel('vivo Y50', 'vivo');
        expect(result.confidence).toBe(0.9); // Simple model before normalization
      });
      
      it('should assign correct confidence for complex models', () => {
        const result = extractor.extractModel('华为 Mate 60 Pro', '华为');
        expect(result.confidence).toBe(1.0); // Complex model
      });
      
      it('should assign correct confidence for word models', () => {
        const result = extractor.extractModel('华为 Watch GT', '华为');
        expect(result.confidence).toBe(0.85); // Word model
      });
      
      it('should assign lower confidence for fallback extraction', () => {
        // When simple model is extracted after normalization (fallback)
        const result = extractor.extractModel('Brand Model123', 'Brand');
        if (result.value) {
          expect(result.confidence).toBeLessThanOrEqual(0.9);
        }
      });
    });
  });
});
