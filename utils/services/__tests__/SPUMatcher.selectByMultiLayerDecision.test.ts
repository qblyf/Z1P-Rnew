/**
 * 测试 SPUMatcher.selectByMultiLayerDecision 方法
 * 
 * 验证多层次决策逻辑的正确性
 */

import { SPUMatcher } from '../SPUMatcher';
import type { EnhancedSPUData } from '../../types';
import type { SPUMatchResult } from '../types';

describe('SPUMatcher.selectByMultiLayerDecision', () => {
  let matcher: SPUMatcher;
  
  beforeEach(() => {
    matcher = new SPUMatcher();
  });
  
  // 辅助函数：创建测试用的SPU数据
  const createSPU = (id: number, name: string, brand: string): EnhancedSPUData => ({
    id,
    name,
    brand,
    productType: 'phone',
    isGiftBox: false,
    isAccessory: false,
    hasNetworkVersion: false,
    version: null
  });
  
  // 辅助函数：创建测试用的匹配结果
  const createMatch = (spu: EnhancedSPUData, score: number): SPUMatchResult => ({
    spu,
    score,
    explanation: {
      matchType: 'fuzzy',
      brandMatch: { matched: true, score: 1.0 },
      modelMatch: { matched: true, score: score },
      versionMatch: { matched: false, score: 0 },
      details: 'Test match'
    }
  });
  
  // 辅助函数：提取品牌
  const extractBrand = (name: string): string | null => {
    const brands = ['iPhone', 'Apple', '华为', 'Huawei', '小米', 'Xiaomi'];
    for (const brand of brands) {
      if (name.includes(brand)) {
        return brand;
      }
    }
    return null;
  };
  
  // 辅助函数：提取型号
  const extractModel = (name: string, brand?: string | null): string | null => {
    if (!brand) return null;
    
    // 对于 iPhone，提取 iPhone 后面的部分
    if (brand === 'iPhone' || brand === 'Apple') {
      const match = name.match(/iPhone\s+(.+)/i);
      if (match) {
        return match[1].trim();
      }
    }
    
    // 对于其他品牌，提取品牌后面的部分
    const parts = name.split(brand);
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return null;
  };
  
  // 辅助函数：提取SPU部分
  const extractSPUPart = (name: string): string => name;
  
  // 辅助函数：分词
  const tokenize = (str: string): string[] => {
    return str.toLowerCase().split(/[\s\-_]+/).filter(t => t.length > 0);
  };
  
  const options = {
    extractBrand,
    extractModel,
    extractSPUPart,
    tokenize
  };
  
  describe('第1层决策：型号后缀匹配', () => {
    it('应该优先选择后缀匹配的SPU', () => {
      // 创建测试数据
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      const spu3 = createSPU(3, 'iPhone 7p', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0),
        createMatch(spu3, 1.0)
      ];
      
      // 输入包含 "promax"
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 应该选择 iPhone 17 Pro Max（包含 Pro 和 Max 后缀）
      expect(result.spu.name).toBe('iPhone 17 Pro Max');
    });
    
    it('应该在没有后缀时跳过第1层决策', () => {
      const spu1 = createSPU(1, 'iPhone 15', 'Apple');
      const spu2 = createSPU(2, 'iPhone 14', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 输入不包含后缀
      const result = matcher['selectBestMatch'](matches, '15', options);
      
      // 应该返回一个结果（使用其他层决策）
      expect(result).toBeDefined();
      expect(result.spu.id).toBeGreaterThan(0);
    });
  });
  
  describe('第2层决策：关键词覆盖率', () => {
    it('应该优先选择关键词覆盖率更高的SPU', () => {
      const spu1 = createSPU(1, '华为 Mate 60 Pro', '华为');
      const spu2 = createSPU(2, '华为 Mate 60', '华为');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 输入包含 "mate60pro"
      const result = matcher['selectBestMatch'](matches, 'mate60pro', options);
      
      // 应该选择 Mate 60 Pro（覆盖更多关键词）
      expect(result.spu.name).toBe('华为 Mate 60 Pro');
    });
  });
  
  describe('第3层决策：长度匹配', () => {
    it('应该优先选择长度更匹配的SPU', () => {
      const spu1 = createSPU(1, '小米 14 Pro Max Ultra', '小米');
      const spu2 = createSPU(2, '小米 14 Pro', '小米');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 输入是 "14pro"，长度较短
      const result = matcher['selectBestMatch'](matches, '14pro', options);
      
      // 应该选择长度更接近的 "小米 14 Pro"
      expect(result.spu.name).toBe('小米 14 Pro');
    });
  });
  
  describe('第4层决策：名称最短', () => {
    it('应该在所有指标相同时选择名称最短的SPU', () => {
      const spu1 = createSPU(1, 'iPhone 15 Standard Edition', 'Apple');
      const spu2 = createSPU(2, 'iPhone 15', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '15', options);
      
      // 应该选择名称更短的 "iPhone 15"
      expect(result.spu.name).toBe('iPhone 15');
    });
  });
  
  describe('向后兼容性', () => {
    it('应该在分数不同时选择分数最高的SPU', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 0.8),
        createMatch(spu2, 0.9)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17', options);
      
      // 应该选择分数更高的 iPhone 17（0.9）
      expect(result.spu.name).toBe('iPhone 17');
      expect(result.score).toBe(0.9);
    });
    
    it('应该在只有一个候选时直接返回', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      
      const matches = [createMatch(spu1, 1.0)];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      expect(result.spu.name).toBe('iPhone 17 Pro Max');
    });
  });
  
  describe('综合场景', () => {
    it('应该正确处理问题场景：苹果17promax', () => {
      // 这是需求文档中的核心问题场景
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      const spu3 = createSPU(3, 'iPhone 7p', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0),
        createMatch(spu3, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 应该选择 iPhone 17 Pro Max
      expect(result.spu.name).toBe('iPhone 17 Pro Max');
    });
    
    it('应该在缺少输入型号时使用简化逻辑', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 不提供输入型号
      const result = matcher['selectBestMatch'](matches, undefined, options);
      
      // 应该返回名称更短的
      expect(result.spu.name).toBe('iPhone 17');
    });
    
    it('应该在缺少选项时使用简化逻辑', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 不提供选项
      const result = matcher['selectBestMatch'](matches, '17promax');
      
      // 应该返回名称更短的
      expect(result.spu.name).toBe('iPhone 17');
    });
  });
});
