/**
 * 单元测试: SPUMatcher.calculateSelectionMetrics
 * 
 * 测试calculateSelectionMetrics方法的功能：
 * - 调用各个指标计算方法
 * - 提取SPU的品牌和型号信息
 * - 组装SelectionMetrics对象
 * 
 * Requirements: 5.1, 5.5
 */

import { SPUMatcher } from '../SPUMatcher';
import type { SPUMatchResult, SelectionMetrics } from '../types';
import type { EnhancedSPUData } from '../../types';

describe('SPUMatcher.calculateSelectionMetrics', () => {
  // 创建测试用的SPUMatcher实例
  const matcher = new SPUMatcher();
  
  // 辅助函数：通过反射访问私有方法
  const calculateSelectionMetrics = (
    match: SPUMatchResult,
    inputModel?: string,
    options?: {
      extractBrand: (name: string) => string | null;
      extractModel: (name: string, brand?: string | null) => string | null;
      extractSPUPart: (name: string) => string;
      tokenize: (str: string) => string[];
    }
  ): SelectionMetrics => {
    // @ts-ignore - 访问私有方法用于测试
    return matcher['calculateSelectionMetrics'](match, inputModel, options);
  };
  
  // 测试用的提取函数
  const extractBrand = (name: string): string | null => {
    const match = name.match(/^(iPhone|iPad|Apple Watch|MacBook|iMac|华为|小米|OPPO|vivo)/i);
    return match ? match[1] : null;
  };
  
  const extractModel = (name: string, brand?: string | null): string | null => {
    if (!brand) return null;
    const brandRegex = new RegExp(`^${brand}\\s*`, 'i');
    return name.replace(brandRegex, '').trim();
  };
  
  const extractSPUPart = (name: string): string => {
    // 简化版：移除容量、颜色等信息
    return name.split(/\s*\d+GB/i)[0].trim();
  };
  
  const tokenize = (str: string): string[] => {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  };
  
  const options = {
    extractBrand,
    extractModel,
    extractSPUPart,
    tokenize
  };
  
  describe('基本功能', () => {
    it('应该正确组装SelectionMetrics对象', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const metrics = calculateSelectionMetrics(match, '17promax', options);
      
      // 验证基本结构
      expect(metrics).toHaveProperty('spu');
      expect(metrics).toHaveProperty('baseScore');
      expect(metrics).toHaveProperty('suffixMatchScore');
      expect(metrics).toHaveProperty('keywordCoverageScore');
      expect(metrics).toHaveProperty('lengthMatchScore');
      expect(metrics).toHaveProperty('finalScore');
      
      // 验证SPU引用
      expect(metrics.spu).toBe(spu);
      
      // 验证基础分数
      expect(metrics.baseScore).toBe(0.95);
    });
    
    it('应该调用calculateSuffixMatchScore计算后缀匹配分数', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      // 使用已处理的型号（带空格）
      const metrics = calculateSelectionMetrics(match, '17 pro max', options);
      
      // 验证后缀匹配分数被计算（应该大于0，因为输入包含pro和max）
      expect(metrics.suffixMatchScore).toBeGreaterThan(0);
    });
    
    it('应该调用calculateKeywordCoverageScore计算关键词覆盖率', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const metrics = calculateSelectionMetrics(match, '17promax', options);
      
      // 验证关键词覆盖率被计算
      expect(metrics.keywordCoverageScore).toBeGreaterThanOrEqual(0);
      expect(metrics.keywordCoverageScore).toBeLessThanOrEqual(1);
    });
    
    it('应该调用calculateLengthMatchScore计算长度匹配分数', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const metrics = calculateSelectionMetrics(match, '17promax', options);
      
      // 验证长度匹配分数被计算
      expect(metrics.lengthMatchScore).toBeGreaterThan(0);
      expect(metrics.lengthMatchScore).toBeLessThanOrEqual(1);
    });
    
    it('应该计算综合分数', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const metrics = calculateSelectionMetrics(match, '17promax', options);
      
      // 验证综合分数大于等于基础分数
      expect(metrics.finalScore).toBeGreaterThanOrEqual(metrics.baseScore);
      
      // 验证综合分数是基础分数加上各维度分数的加权和
      const expectedFinalScore = metrics.baseScore + 
        (metrics.suffixMatchScore * 0.3) + 
        (metrics.keywordCoverageScore * 0.2) + 
        (metrics.lengthMatchScore * 0.1);
      
      expect(metrics.finalScore).toBeCloseTo(expectedFinalScore, 5);
    });
  });
  
  describe('边界情况', () => {
    it('当没有输入型号时应该返回默认指标', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const metrics = calculateSelectionMetrics(match, undefined, options);
      
      // 验证返回默认指标
      expect(metrics.baseScore).toBe(0.95);
      expect(metrics.suffixMatchScore).toBe(0);
      expect(metrics.keywordCoverageScore).toBe(0);
      expect(metrics.lengthMatchScore).toBe(0);
      expect(metrics.finalScore).toBe(0.95);
    });
    
    it('当SPU型号提取失败时应该返回默认指标', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'Unknown Product',
        brand: null,
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const metrics = calculateSelectionMetrics(match, '17promax', options);
      
      // 验证返回默认指标
      expect(metrics.baseScore).toBe(0.95);
      expect(metrics.suffixMatchScore).toBe(0);
      expect(metrics.keywordCoverageScore).toBe(0);
      expect(metrics.lengthMatchScore).toBe(0);
      expect(metrics.finalScore).toBe(0.95);
    });
    
    it('当没有提供tokenize函数时关键词覆盖率应该为0', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 0.95,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 0.9 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const optionsWithoutTokenize = {
        extractBrand,
        extractModel,
        extractSPUPart
      };
      
      // 使用已处理的型号（带空格）
      const metrics = calculateSelectionMetrics(match, '17 pro max', optionsWithoutTokenize);
      
      // 验证关键词覆盖率为0
      expect(metrics.keywordCoverageScore).toBe(0);
      
      // 验证其他指标仍然被计算
      expect(metrics.suffixMatchScore).toBeGreaterThan(0);
      expect(metrics.lengthMatchScore).toBeGreaterThan(0);
    });
  });
  
  describe('实际场景测试', () => {
    it('应该为"17 pro max"和"iPhone 17 Pro Max"计算正确的指标', () => {
      const spu: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match: SPUMatchResult = {
        spu,
        score: 1.0,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 1.0 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      // 注意：输入型号应该是已经被InfoExtractor处理过的，即"17 pro max"而不是"17promax"
      const metrics = calculateSelectionMetrics(match, '17 pro max', options);
      
      // 验证后缀匹配分数较高（输入包含pro和max）
      expect(metrics.suffixMatchScore).toBeGreaterThan(0.5);
      
      // 验证关键词覆盖率较高
      expect(metrics.keywordCoverageScore).toBeGreaterThan(0);
      
      // 验证长度匹配分数合理
      expect(metrics.lengthMatchScore).toBeGreaterThan(0);
    });
    
    it('应该为"17 pro max"和"iPhone 17"计算不同的指标', () => {
      const spu17ProMax: EnhancedSPUData = {
        id: 1,
        name: 'iPhone 17 Pro Max',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const spu17: EnhancedSPUData = {
        id: 2,
        name: 'iPhone 17',
        brand: 'iPhone',
        productType: 'phone',
        specs: {}
      };
      
      const match17ProMax: SPUMatchResult = {
        spu: spu17ProMax,
        score: 1.0,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 1.0 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      const match17: SPUMatchResult = {
        spu: spu17,
        score: 1.0,
        explanation: {
          matchType: 'fuzzy',
          brandMatch: { matched: true, score: 1.0 },
          modelMatch: { matched: true, score: 1.0 },
          versionMatch: { matched: false, score: 0 },
          details: 'Test match'
        }
      };
      
      // 注意：输入型号应该是已经被InfoExtractor处理过的
      const metrics17ProMax = calculateSelectionMetrics(match17ProMax, '17 pro max', options);
      const metrics17 = calculateSelectionMetrics(match17, '17 pro max', options);
      
      // 验证iPhone 17 Pro Max的后缀匹配分数高于iPhone 17
      expect(metrics17ProMax.suffixMatchScore).toBeGreaterThan(metrics17.suffixMatchScore);
      
      // 验证iPhone 17 Pro Max的综合分数高于iPhone 17
      expect(metrics17ProMax.finalScore).toBeGreaterThan(metrics17.finalScore);
    });
  });
});
