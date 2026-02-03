/**
 * SPUMatcher.calculateLengthMatchScore 单元测试
 * 
 * 测试长度匹配分数计算逻辑
 * 需求: 3.1, 3.4
 */

import { SPUMatcher } from '../SPUMatcher';
import type { EnhancedSPUData } from '../../types';
import type { ExtractedInfo } from '../types';

describe('SPUMatcher - calculateLengthMatchScore (通过selectBestMatch间接测试)', () => {
  let matcher: SPUMatcher;
  
  // Mock 辅助函数
  const mockExtractBrand = (name: string): string | null => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('iphone') || lowerName.includes('苹果')) return 'Apple';
    if (lowerName.includes('华为') || lowerName.includes('huawei')) return '华为';
    return null;
  };
  
  const mockExtractModel = (name: string, brand?: string | null): string | null => {
    let normalized = name.toLowerCase();
    if (brand) {
      normalized = normalized.replace(brand.toLowerCase(), '').trim();
    }
    
    // 提取型号（包括后缀）
    const match = normalized.match(/([a-z0-9\s]+(?:pro|max|plus|ultra|mini|se|air|lite)?)/i);
    return match ? match[1].trim().replace(/\s+/g, ' ') : null;
  };
  
  const mockExtractSPUPart = (name: string): string => {
    return name;
  };
  
  const mockTokenize = (str: string): string[] => {
    return str.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  };
  
  beforeEach(() => {
    matcher = new SPUMatcher();
  });
  
  describe('长度匹配度计算 (需求 3.1, 3.4)', () => {
    it('应该对过短的SPU型号降低分数', () => {
      // 输入: "17promax" (9个字符)
      // SPU1: "17" (2个字符) - 过短，应该得到低分
      // SPU2: "17 pro max" (10个字符) - 长度接近，应该得到高分
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'iPhone 17',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17',
          normalizedModel: '17',
          simplicity: 1
        },
        {
          id: 2,
          name: 'iPhone 17 Pro Max',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17 pro max',
          normalizedModel: '17promax',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '苹果17promax',
        preprocessedInput: '苹果17promax',
        brand: { value: 'Apple', confidence: 1.0, source: 'exact' },
        model: { value: '17promax', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const result = matcher.findBestMatch(extractedInfo, candidates, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: () => null,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: (b1, b2) => b1 === b2,
        shouldFilterSPU: () => false,
        getSPUPriority: () => 3,
        tokenize: mockTokenize,
      });
      
      // 应该匹配到"iPhone 17 Pro Max"，因为它的长度与输入更匹配
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('iPhone 17 Pro Max');
    });
    
    it('应该对过长的SPU型号降低分数', () => {
      // 输入: "14" (2个字符)
      // SPU1: "14" (2个字符) - 长度匹配
      // SPU2: "14 pro max ultra" (16个字符) - 过长，应该得到低分
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone 14',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '14',
          normalizedModel: '14',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone 14 Pro Max Ultra',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '14 pro max ultra',
          normalizedModel: '14promaxultra',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone 14',
        preprocessedInput: 'phone 14',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: '14', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const result = matcher.findBestMatch(extractedInfo, candidates, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: () => null,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: (b1, b2) => b1 === b2,
        shouldFilterSPU: () => false,
        getSPUPriority: () => 3,
        tokenize: mockTokenize,
      });
      
      // 应该匹配到"Phone 14"，因为它的长度与输入匹配
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone 14');
    });
    
    it('应该对长度接近的SPU给予高分', () => {
      // 输入: "15 pro" (5个字符)
      // SPU1: "15 pro" (6个字符) - 长度接近
      // SPU2: "15" (2个字符) - 过短
      // SPU3: "15 pro max ultra" (16个字符) - 过长
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone 15 Pro',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '15 pro',
          normalizedModel: '15pro',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone 15',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '15',
          normalizedModel: '15',
          simplicity: 1
        },
        {
          id: 3,
          name: 'Phone 15 Pro Max Ultra',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '15 pro max ultra',
          normalizedModel: '15promaxultra',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone 15pro',
        preprocessedInput: 'phone 15pro',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: '15 pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const result = matcher.findBestMatch(extractedInfo, candidates, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: () => null,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: (b1, b2) => b1 === b2,
        shouldFilterSPU: () => false,
        getSPUPriority: () => 3,
        tokenize: mockTokenize,
      });
      
      // 应该匹配到"Phone 15 Pro"，因为它的长度与输入最接近
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone 15 Pro');
    });
  });
  
  describe('边界情况', () => {
    it('应该正确处理相同长度的型号', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone ABC',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'abc',
          normalizedModel: 'abc',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone XYZ',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'xyz',
          normalizedModel: 'xyz',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone abc',
        preprocessedInput: 'phone abc',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: 'abc', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const result = matcher.findBestMatch(extractedInfo, candidates, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: () => null,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: (b1, b2) => b1 === b2,
        shouldFilterSPU: () => false,
        getSPUPriority: () => 3,
        tokenize: mockTokenize,
      });
      
      // 应该匹配到"Phone ABC"，因为它与输入完全匹配
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone ABC');
    });
    
    it('应该正确处理空型号', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '',
          normalizedModel: '',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone',
        preprocessedInput: 'phone',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: '', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const result = matcher.findBestMatch(extractedInfo, candidates, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: () => null,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: (b1, b2) => b1 === b2,
        shouldFilterSPU: () => false,
        getSPUPriority: () => 3,
        tokenize: mockTokenize,
      });
      
      // 空型号不应该匹配（这是预期行为）
      // 长度匹配分数对空型号返回1.0（因为两者长度都是0，比例为1）
      // 但由于精确匹配和模糊匹配都无法匹配空型号，所以结果为null
      expect(result).toBeNull();
    });
  });
  
  describe('实际场景测试', () => {
    it('应该优先匹配详细型号而非简化型号 (需求 3.2)', () => {
      // 这是问题场景的核心：输入包含详细型号信息时，应该匹配详细型号
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'iPhone 17',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17',
          normalizedModel: '17',
          simplicity: 1
        },
        {
          id: 2,
          name: 'iPhone 17 Pro Max',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17 pro max',
          normalizedModel: '17promax',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '苹果17promax（A3527)512G深蓝色',
        preprocessedInput: '苹果17promax（A3527)512G深蓝色',
        brand: { value: 'Apple', confidence: 1.0, source: 'exact' },
        model: { value: '17promax', confidence: 1.0, source: 'exact' },
        color: { value: '深蓝色', confidence: 1.0, source: 'exact' },
        capacity: { value: '512G', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const result = matcher.findBestMatch(extractedInfo, candidates, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: () => null,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: (b1, b2) => b1 === b2,
        shouldFilterSPU: () => false,
        getSPUPriority: () => 3,
        tokenize: mockTokenize,
      });
      
      // 应该匹配到"iPhone 17 Pro Max"而不是"iPhone 17"
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('iPhone 17 Pro Max');
    });
  });
});
