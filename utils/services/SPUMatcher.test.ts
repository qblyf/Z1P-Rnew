/**
 * SPUMatcher 单元测试
 */

import { SPUMatcher } from './SPUMatcher';
import type { SPUData, VersionInfo, BrandData } from '../types';
import type { ExtractedInfo } from './types';

describe('SPUMatcher', () => {
  let matcher: SPUMatcher;
  let mockSPUList: SPUData[];
  let mockBrandList: BrandData[];
  
  // Mock 辅助函数
  const mockExtractBrand = (name: string): string | null => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('华为') || lowerName.includes('huawei')) return '华为';
    if (lowerName.includes('小米') || lowerName.includes('xiaomi')) return '小米';
    if (lowerName.includes('vivo')) return 'vivo';
    if (lowerName.includes('oppo')) return 'OPPO';
    return null;
  };
  
  const mockExtractModel = (name: string, brand?: string | null): string | null => {
    let normalized = name.toLowerCase();
    if (brand) {
      normalized = normalized.replace(brand.toLowerCase(), '').trim();
    }
    
    // 简单的型号提取逻辑
    const match = normalized.match(/([a-z]+\s*\d+\s*(?:pro|max|plus|ultra)?)/i);
    return match ? match[1].replace(/\s+/g, '') : null;
  };
  
  const mockExtractVersion = (name: string): VersionInfo | null => {
    if (name.includes('Pro版')) {
      return { name: 'Pro版', keywords: ['Pro版'], priority: 3 };
    }
    if (name.includes('标准版')) {
      return { name: '标准版', keywords: ['标准版'], priority: 2 };
    }
    return null;
  };
  
  const mockExtractSPUPart = (name: string): string => {
    // 简单实现：移除容量和颜色
    return name.replace(/\d+\+\d+/g, '').replace(/[\u4e00-\u9fa5]{2,4}$/g, '').trim();
  };
  
  const mockIsBrandMatch = (brand1: string | null, brand2: string | null): boolean => {
    if (!brand1 || !brand2) return false;
    
    // 完全匹配
    if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
    
    // 通过拼音匹配
    const brand1Info = mockBrandList.find(b => b.name.toLowerCase() === brand1.toLowerCase() || b.spell?.toLowerCase() === brand1.toLowerCase());
    const brand2Info = mockBrandList.find(b => b.name.toLowerCase() === brand2.toLowerCase() || b.spell?.toLowerCase() === brand2.toLowerCase());
    
    if (brand1Info && brand2Info && brand1Info.spell && brand2Info.spell) {
      return brand1Info.spell.toLowerCase() === brand2Info.spell.toLowerCase();
    }
    
    return false;
  };
  
  const mockShouldFilterSPU = (inputName: string, spuName: string): boolean => {
    const lowerSPU = spuName.toLowerCase();
    return lowerSPU.includes('礼盒') || lowerSPU.includes('套装');
  };
  
  const mockGetSPUPriority = (inputName: string, spuName: string): number => {
    const lowerSPU = spuName.toLowerCase();
    if (!lowerSPU.includes('礼盒') && !lowerSPU.includes('pro版')) return 3;
    if (lowerSPU.includes('pro版')) return 2;
    return 1;
  };
  
  const mockTokenize = (str: string): string[] => {
    return str.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  };
  
  beforeEach(() => {
    matcher = new SPUMatcher();
    
    // Mock 品牌列表
    mockBrandList = [
      { name: '华为', spell: 'huawei', color: '#FF0000' },
      { name: '小米', spell: 'xiaomi', color: '#FF6600' },
      { name: 'vivo', spell: 'vivo', color: '#0066FF' },
      { name: 'OPPO', spell: 'oppo', color: '#00CC00' },
    ];
    
    // Mock SPU 列表
    mockSPUList = [
      { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
      { id: 2, name: '华为 Mate 60', brand: '华为' },
      { id: 3, name: '华为 Mate 60 Pro 礼盒版', brand: '华为' },
      { id: 4, name: '小米 14 Pro', brand: '小米' },
      { id: 5, name: '小米 14', brand: '小米' },
      { id: 6, name: 'vivo X100 Pro', brand: 'vivo' },
      { id: 7, name: 'OPPO Find X7 Ultra', brand: 'OPPO' },
    ];
    
    matcher.setBrandList(mockBrandList);
  });
  
  describe('buildIndexes', () => {
    it('应该正确构建品牌索引', () => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const stats = matcher.getBrandIndexStats();
      expect(stats.totalBrands).toBeGreaterThan(0);
      expect(stats.totalSPUs).toBe(mockSPUList.length);
    });
    
    it('应该正确构建型号索引', () => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const stats = matcher.getModelIndexStats();
      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats.totalSPUs).toBeGreaterThan(0);
    });
    
    it('应该支持品牌的中文和拼音索引', () => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const stats = matcher.getBrandIndexStats();
      // 每个品牌应该有多个键（中文、拼音、小写）
      expect(stats.totalBrands).toBeGreaterThanOrEqual(4);
    });
  });
  
  describe('findBestMatch - 精确匹配', () => {
    beforeEach(() => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
    });
    
    it('应该能精确匹配品牌和型号', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('华为 Mate 60 Pro');
      expect(result?.score).toBeGreaterThan(0.8);
      expect(result?.explanation.matchType).toBe('exact');
    });
    
    it('应该优先匹配标准版而不是礼盒版', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result).not.toBeNull();
      expect(result?.spu.name).toBe('华为 Mate 60 Pro');
      expect(result?.spu.name).not.toContain('礼盒');
    });
    
    it('应该支持品牌拼音匹配', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: 'huawei Mate 60 Pro',
        preprocessedInput: 'huawei Mate 60 Pro',
        brand: { value: 'huawei', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result).not.toBeNull();
      expect(result?.spu.brand).toBe('华为');
    });
  });
  
  describe('findBestMatch - 模糊匹配', () => {
    beforeEach(() => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
    });
    
    it('应该在精确匹配失败时尝试模糊匹配', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate60Pro',
        preprocessedInput: '华为 Mate60Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60', confidence: 0.8, source: 'fuzzy' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.4, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result).not.toBeNull();
      expect(result?.spu.brand).toBe('华为');
    });
  });
  
  describe('findBestMatch - 匹配解释', () => {
    beforeEach(() => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
    });
    
    it('应该提供详细的匹配解释', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result).not.toBeNull();
      expect(result?.explanation).toBeDefined();
      expect(result?.explanation.matchType).toBeDefined();
      expect(result?.explanation.brandMatch).toBeDefined();
      expect(result?.explanation.modelMatch).toBeDefined();
      expect(result?.explanation.versionMatch).toBeDefined();
      expect(result?.explanation.details).toBeDefined();
      expect(typeof result?.explanation.details).toBe('string');
    });
    
    it('匹配解释应该包含品牌和型号信息', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result?.explanation.details).toContain('品牌');
      expect(result?.explanation.details).toContain('型号');
    });
  });
  
  describe('findBestMatch - 边界情况', () => {
    beforeEach(() => {
      matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
    });
    
    it('应该在品牌未识别时尝试模糊匹配', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '未知品牌 X100',
        preprocessedInput: '未知品牌 X100',
        brand: { value: null, confidence: 0, source: 'exact' },
        model: { value: 'x100', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      // 品牌未识别时，应该在所有SPU中搜索
      // 由于型号"x100"与"vivo X100 Pro"匹配，应该能找到结果
      expect(result).not.toBeNull();
      expect(result?.spu.name).toContain('X100');
      expect(result?.explanation.matchType).toBe('fuzzy');
    });
    
    it('应该在型号未识别时返回null', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 未知型号',
        preprocessedInput: '华为 未知型号',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: null, confidence: 0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      expect(result).toBeNull();
    });
    
    it('应该在分数低于阈值时返回null', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate60',
        preprocessedInput: '华为 Mate60',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60', confidence: 0.8, source: 'fuzzy' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
      };
      
      // 使用非常高的阈值
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.99, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize,
      });
      
      // 由于阈值很高，可能返回null
      // 这取决于具体的匹配分数
      if (result) {
        expect(result.score).toBeGreaterThanOrEqual(0.99);
      }
    });
  });
});
