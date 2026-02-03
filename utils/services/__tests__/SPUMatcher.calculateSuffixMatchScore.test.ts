/**
 * SPUMatcher.calculateSuffixMatchScore 单元测试
 * 
 * 测试型号后缀匹配分数计算逻辑
 * 需求: 2.1, 2.2, 2.3, 2.5
 */

import { SPUMatcher } from '../SPUMatcher';
import type { EnhancedSPUData } from '../../types';
import type { ExtractedInfo } from '../types';

describe('SPUMatcher - calculateSuffixMatchScore (通过selectBestMatch间接测试)', () => {
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
  
  describe('后缀识别和匹配 (需求 2.2, 2.3)', () => {
    it('应该识别"promax"为"Pro"和"Max"两个后缀', () => {
      // 创建候选SPU：一个有Pro和Max，一个只有Pro，一个没有后缀
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'iPhone 17 Pro Max',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17 pro max',
          normalizedModel: '17promax',
          simplicity: 1
        },
        {
          id: 2,
          name: 'iPhone 17',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17',
          normalizedModel: '17',
          simplicity: 1
        },
        {
          id: 3,
          name: 'iPhone 17',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17',
          normalizedModel: '17',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '苹果17promax',
        preprocessedInput: '苹果17promax',
        brand: { value: 'Apple', confidence: 1.0, source: 'exact' },
        model: { value: '17 pro max', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      // 构建索引
      matcher.buildIndexes(candidates, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      // 查找匹配
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
      
      // 应该匹配到"iPhone 17 Pro Max"，因为它的后缀与输入完全匹配
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('iPhone 17 Pro Max');
    });
    
    it('应该识别各种常见后缀', () => {
      const suffixTests = [
        { input: 'pro', expected: 'Pro' },
        { input: 'max', expected: 'Max' },
        { input: 'plus', expected: 'Plus' },
        { input: 'ultra', expected: 'Ultra' },
        { input: 'mini', expected: 'Mini' },
        { input: 'se', expected: 'SE' },
        { input: 'air', expected: 'Air' },
        { input: 'lite', expected: 'Lite' },
        { input: 'note', expected: 'Note' },
        { input: 'turbo', expected: 'Turbo' },
      ];
      
      for (const test of suffixTests) {
        const candidates: EnhancedSPUData[] = [
          {
            id: 1,
            name: `Phone ${test.expected}`,
            brand: 'TestBrand',
            extractedBrand: 'TestBrand',
            extractedModel: test.input,
            normalizedModel: test.input,
            simplicity: 1
          },
          {
            id: 2,
            name: 'Phone',
            brand: 'TestBrand',
            extractedBrand: 'TestBrand',
            extractedModel: '',
            normalizedModel: '',
            simplicity: 1
          }
        ];
        
        const extractedInfo: ExtractedInfo = {
          originalInput: `phone ${test.input}`,
          preprocessedInput: `phone ${test.input}`,
          brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
          model: { value: test.input, confidence: 1.0, source: 'exact' },
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
        
        // 应该匹配到带后缀的版本
        expect(result).not.toBeNull();
        expect(result?.spu.name).toBe(`Phone ${test.expected}`);
      }
    });
  });
  
  describe('后缀匹配优先级 (需求 2.1, 2.5)', () => {
    it('当输入包含后缀时，应该优先匹配包含相同后缀的SPU', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone 17 Pro',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '17 pro',
          normalizedModel: '17pro',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone 17',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '17',
          normalizedModel: '17',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone 17 pro',
        preprocessedInput: 'phone 17 pro',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: '17 pro', confidence: 1.0, source: 'exact' },
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
      
      // 应该匹配到"Phone 17 Pro"而不是"Phone 17"
      // 因为输入包含"pro"后缀
      expect(result).not.toBeNull();
      expect(result?.spu.name).toContain('Pro');
    });
    
    it('应该优先选择后缀数量与输入更接近的SPU (需求 2.5)', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone Pro Max Plus', // 3个后缀
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'pro max plus',
          normalizedModel: 'promaxplus',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone Pro Max', // 2个后缀 - 应该匹配这个
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'pro max',
          normalizedModel: 'promax',
          simplicity: 1
        },
        {
          id: 3,
          name: 'Phone Pro', // 1个后缀
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'pro',
          normalizedModel: 'pro',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone pro max',
        preprocessedInput: 'phone pro max',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: 'pro max', confidence: 1.0, source: 'exact' },
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
      
      // 应该匹配到"Phone Pro Max"，因为它的后缀数量(2)与输入(2)完全匹配
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone Pro Max');
    });
  });
  
  describe('额外后缀惩罚 (需求 2.5)', () => {
    it('应该对SPU有额外后缀的情况进行惩罚', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone Pro Max Ultra', // 3个后缀，输入只有1个
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'pro max ultra',
          normalizedModel: 'promaxultra',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone Pro', // 1个后缀，与输入匹配
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'pro',
          normalizedModel: 'pro',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone pro',
        preprocessedInput: 'phone pro',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: 'pro', confidence: 1.0, source: 'exact' },
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
      
      // 应该匹配到"Phone Pro"，因为它没有额外的后缀
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone Pro');
    });
  });
  
  describe('无后缀情况', () => {
    it('当输入没有后缀时，后缀匹配分数应该为0（不参与决策）', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone 14 Pro',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '14 pro',
          normalizedModel: '14pro',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone 14',
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: '14',
          normalizedModel: '14',
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
      
      // 应该匹配到"Phone 14"，因为输入没有后缀，后缀匹配不参与决策
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone 14');
    });
  });
  
  describe('边界情况', () => {
    it('应该正确处理连写的后缀（如"promax"）', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'iPhone 17 Pro Max',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17 pro max',
          normalizedModel: '17promax',
          simplicity: 1
        },
        {
          id: 2,
          name: 'iPhone 17',
          brand: 'Apple',
          extractedBrand: 'Apple',
          extractedModel: '17',
          normalizedModel: '17',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '苹果17promax',
        preprocessedInput: '苹果17promax',
        brand: { value: 'Apple', confidence: 1.0, source: 'exact' },
        model: { value: '17 pro max', confidence: 1.0, source: 'exact' },
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
      
      // 应该匹配到"iPhone 17 Pro Max"
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('iPhone 17 Pro Max');
    });
    
    it('应该使用单词边界确保准确匹配（避免"prose"被识别为"pro"）', () => {
      const candidates: EnhancedSPUData[] = [
        {
          id: 1,
          name: 'Phone Prose', // 不应该被识别为有"pro"后缀
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'prose',
          normalizedModel: 'prose',
          simplicity: 1
        },
        {
          id: 2,
          name: 'Phone Pro', // 应该被识别为有"pro"后缀
          brand: 'TestBrand',
          extractedBrand: 'TestBrand',
          extractedModel: 'pro',
          normalizedModel: 'pro',
          simplicity: 1
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: 'phone pro',
        preprocessedInput: 'phone pro',
        brand: { value: 'TestBrand', confidence: 1.0, source: 'exact' },
        model: { value: 'pro', confidence: 1.0, source: 'exact' },
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
      
      // 应该匹配到"Phone Pro"而不是"Phone Prose"
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('Phone Pro');
    });
  });
});
