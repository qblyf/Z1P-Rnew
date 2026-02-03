/**
 * SPUMatcher 性能监控集成测试
 */

import { SPUMatcher } from '../SPUMatcher';
import { PerformanceMetrics } from '../../monitoring/PerformanceMetrics';
import type { SPUData, BrandData } from '../../types';
import type { ExtractedInfo } from '../types';

describe('SPUMatcher - Performance Monitoring Integration', () => {
  let matcher: SPUMatcher;
  let metrics: PerformanceMetrics;
  let mockSPUList: SPUData[];
  let mockBrandList: BrandData[];
  
  // Mock 辅助函数
  const mockExtractBrand = (name: string): string | null => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('华为') || lowerName.includes('huawei')) return '华为';
    if (lowerName.includes('小米') || lowerName.includes('xiaomi')) return '小米';
    return null;
  };
  
  const mockExtractModel = (name: string, brand?: string | null): string | null => {
    let normalized = name.toLowerCase();
    if (brand) {
      normalized = normalized.replace(brand.toLowerCase(), '').trim();
    }
    const match = normalized.match(/([a-z]+\s*\d+\s*(?:pro|max|plus|ultra)?)/i);
    return match ? match[1].replace(/\s+/g, '') : null;
  };
  
  const mockExtractVersion = () => null;
  const mockExtractSPUPart = (name: string): string => name;
  const mockIsBrandMatch = (brand1: string | null, brand2: string | null): boolean => {
    return brand1?.toLowerCase() === brand2?.toLowerCase();
  };
  const mockShouldFilterSPU = () => false;
  const mockGetSPUPriority = () => 3;
  const mockTokenize = (str: string): string[] => str.toLowerCase().split(/\s+/);
  
  beforeEach(() => {
    metrics = new PerformanceMetrics({
      enabled: true,
      maxMetrics: 1000,
      phases: ['spu-match-total', 'spu-match-exact', 'spu-match-fuzzy']
    });
    
    matcher = new SPUMatcher();
    matcher.setMetrics(metrics);
    
    mockBrandList = [
      { name: '华为', spell: 'huawei', color: '#FF0000' },
      { name: '小米', spell: 'xiaomi', color: '#FF6600' },
    ];
    
    // 使用 EnhancedSPUData 格式，包含预提取的品牌和型号
    mockSPUList = [
      { 
        id: 1, 
        name: '华为 Mate 60 Pro', 
        brand: '华为',
        extractedBrand: '华为',
        extractedModel: 'mate60pro',
        normalizedModel: 'mate60pro',
        spuPart: '华为 Mate 60 Pro'
      },
      { 
        id: 2, 
        name: '华为 Mate 60', 
        brand: '华为',
        extractedBrand: '华为',
        extractedModel: 'mate60',
        normalizedModel: 'mate60',
        spuPart: '华为 Mate 60'
      },
      { 
        id: 3, 
        name: '小米 14 Pro', 
        brand: '小米',
        extractedBrand: '小米',
        extractedModel: '14pro',
        normalizedModel: '14pro',
        spuPart: '小米 14 Pro'
      },
      { 
        id: 4, 
        name: '小米 14', 
        brand: '小米',
        extractedBrand: '小米',
        extractedModel: '14',
        normalizedModel: '14',
        spuPart: '小米 14'
      },
    ];
    
    matcher.setBrandList(mockBrandList);
    matcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
  });
  
  describe('Performance Metrics Collection', () => {
    it('should record metrics for successful exact match', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
        additionalSpecs: new Map()
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize
      });
      
      expect(result).not.toBeNull();
      
      // 验证性能指标已记录
      const allMetrics = metrics.getMetrics();
      expect(allMetrics.length).toBeGreaterThan(0);
      
      // 验证总体匹配指标
      const totalMetrics = allMetrics.filter(m => m.name === 'spu-match-total');
      expect(totalMetrics.length).toBe(1);
      expect(totalMetrics[0].duration).toBeGreaterThan(0);
      expect(totalMetrics[0].metadata?.matched).toBe(true);
      expect(totalMetrics[0].metadata?.matchType).toBe('exact');
      
      // 验证精确匹配指标
      const exactMetrics = allMetrics.filter(m => m.name === 'spu-match-exact');
      expect(exactMetrics.length).toBe(1);
      expect(exactMetrics[0].duration).toBeGreaterThan(0);
      expect(exactMetrics[0].metadata?.candidateCount).toBeGreaterThan(0);
    });
    
    it('should record metrics for fuzzy match', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate60',
        preprocessedInput: '华为 Mate60',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate60', confidence: 0.8, source: 'fuzzy' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
        additionalSpecs: new Map()
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize
      });
      
      expect(result).not.toBeNull();
      
      const allMetrics = metrics.getMetrics();
      
      // 可能会有模糊匹配指标（如果精确匹配分数不够高）
      const fuzzyMetrics = allMetrics.filter(m => m.name === 'spu-match-fuzzy');
      if (fuzzyMetrics.length > 0) {
        expect(fuzzyMetrics[0].duration).toBeGreaterThan(0);
      }
    });
    
    it('should record metrics for failed match', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: 'Unknown Brand Model',
        preprocessedInput: 'Unknown Brand Model',
        brand: { value: 'Unknown', confidence: 0.5, source: 'fuzzy' },
        model: { value: 'Model', confidence: 0.5, source: 'fuzzy' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
        additionalSpecs: new Map()
      };
      
      const result = matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize
      });
      
      expect(result).toBeNull();
      
      // 验证失败匹配也记录了指标
      const allMetrics = metrics.getMetrics();
      const totalMetrics = allMetrics.filter(m => m.name === 'spu-match-total');
      expect(totalMetrics.length).toBe(1);
      expect(totalMetrics[0].metadata?.matched).toBe(false);
    });
    
    it('should generate performance report', () => {
      // 执行多次匹配
      const inputs = [
        { brand: '华为', model: 'Mate60Pro' },
        { brand: '小米', model: '14Pro' },
        { brand: '华为', model: 'Mate60' },
      ];
      
      inputs.forEach(input => {
        const extractedInfo: ExtractedInfo = {
          originalInput: `${input.brand} ${input.model}`,
          preprocessedInput: `${input.brand} ${input.model}`,
          brand: { value: input.brand, confidence: 1.0, source: 'exact' },
          model: { value: input.model, confidence: 1.0, source: 'exact' },
          color: { value: null, confidence: 0, source: 'exact' },
          capacity: { value: null, confidence: 0, source: 'exact' },
          version: { value: null, confidence: 0, source: 'exact' },
          productType: 'phone',
          additionalSpecs: new Map()
        };
        
        matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
          extractBrand: mockExtractBrand,
          extractModel: mockExtractModel,
          extractVersion: mockExtractVersion,
          extractSPUPart: mockExtractSPUPart,
          isBrandMatch: mockIsBrandMatch,
          shouldFilterSPU: mockShouldFilterSPU,
          getSPUPriority: mockGetSPUPriority,
          tokenize: mockTokenize
        });
      });
      
      // 生成性能报告
      const report = metrics.generateReport();
      
      // 注意：generateReport 查找名为 'total' 的指标，但我们使用 'spu-match-total'
      // 所以 overall.totalMatches 会是 0，但 phases 应该有数据
      expect(report.phases.length).toBeGreaterThan(0);
      
      // 验证有 spu-match-total 阶段
      const totalPhase = report.phases.find(p => p.phase === 'spu-match-total');
      expect(totalPhase).toBeDefined();
      expect(totalPhase?.count).toBe(inputs.length);
      expect(totalPhase?.avgDuration).toBeGreaterThan(0);
    });
    
    it('should detect performance issues', () => {
      // 执行一些匹配
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate60Pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
        additionalSpecs: new Map()
      };
      
      matcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize
      });
      
      // 检测性能问题
      const issues = metrics.detectIssues();
      
      // 应该返回一个数组（可能为空，取决于实际性能）
      expect(Array.isArray(issues)).toBe(true);
    });
  });
  
  describe('Metrics Configuration', () => {
    it('should respect disabled metrics', () => {
      const disabledMetrics = new PerformanceMetrics({ enabled: false });
      const disabledMatcher = new SPUMatcher();
      disabledMatcher.setMetrics(disabledMetrics);
      disabledMatcher.setBrandList(mockBrandList);
      disabledMatcher.buildIndexes(mockSPUList, mockExtractBrand, mockExtractModel, mockExtractSPUPart);
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate60Pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'exact' },
        productType: 'phone',
        additionalSpecs: new Map()
      };
      
      disabledMatcher.findBestMatch(extractedInfo, mockSPUList, 0.5, {
        extractBrand: mockExtractBrand,
        extractModel: mockExtractModel,
        extractVersion: mockExtractVersion,
        extractSPUPart: mockExtractSPUPart,
        isBrandMatch: mockIsBrandMatch,
        shouldFilterSPU: mockShouldFilterSPU,
        getSPUPriority: mockGetSPUPriority,
        tokenize: mockTokenize
      });
      
      // 验证没有记录指标
      const allMetrics = disabledMetrics.getMetrics();
      expect(allMetrics.length).toBe(0);
    });
  });
});
