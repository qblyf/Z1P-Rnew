/**
 * 测试 SPUMatcher 匹配解释增强功能
 * 
 * 验证需求 6.1, 6.3：
 * - 在selectByMultiLayerDecision中记录使用的决策层
 * - 在日志中输出各维度的评分
 * - 生成详细的选择原因说明
 */

import { SPUMatcher } from '../SPUMatcher';
import type { EnhancedSPUData } from '../../types';
import type { SPUMatchResult } from '../types';

describe('SPUMatcher - 匹配解释增强', () => {
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
      details: '模糊匹配成功'
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
  
  describe('需求 6.1: 记录使用的决策层', () => {
    it('应该在解释中包含第1层决策（型号后缀匹配）信息', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证解释中包含决策层信息
      expect(result.explanation.details).toContain('多层次决策');
      expect(result.explanation.details).toContain('型号后缀匹配');
    });
    
    it('应该在解释中包含第2层决策（关键词覆盖率）信息', () => {
      const spu1 = createSPU(1, '华为 Mate 60 Pro Plus', '华为');
      const spu2 = createSPU(2, '华为 Mate 60 Pro', '华为');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 输入 "mate60pro" 应该匹配 "Mate 60 Pro"（关键词覆盖率更高）
      const result = matcher['selectBestMatch'](matches, 'mate60pro', options);
      
      // 验证解释中包含决策层信息
      expect(result.explanation.details).toContain('多层次决策');
      // 可能是第1层（后缀）或第2层（覆盖率）
      expect(result.explanation.details).toMatch(/型号后缀匹配|关键词覆盖率/);
    });
    
    it('应该在解释中包含第3层决策（长度匹配）信息', () => {
      const spu1 = createSPU(1, 'iPhone 15 Standard Edition', 'Apple');
      const spu2 = createSPU(2, 'iPhone 15', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '15', options);
      
      // 验证解释中包含决策层信息
      expect(result.explanation.details).toContain('多层次决策');
      expect(result.explanation.details).toMatch(/长度匹配|名称最短/);
    });
    
    it('应该在解释中包含第4层决策（名称最短）信息', () => {
      const spu1 = createSPU(1, 'iPhone 15 Pro', 'Apple');
      const spu2 = createSPU(2, 'iPhone 15', 'Apple');
      
      // 创建两个完全相同分数和指标的候选
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      // 输入不包含后缀，应该使用名称最短决策
      const result = matcher['selectBestMatch'](matches, '15', options);
      
      // 验证解释中包含决策层信息
      expect(result.explanation.details).toContain('多层次决策');
    });
  });
  
  describe('需求 6.3: 输出各维度的评分', () => {
    it('应该在解释中包含型号后缀匹配分数', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证解释中包含维度评分
      expect(result.explanation.details).toContain('维度评分');
      expect(result.explanation.details).toContain('型号后缀匹配');
    });
    
    it('应该在解释中包含关键词覆盖率分数', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证解释中包含维度评分
      expect(result.explanation.details).toContain('维度评分');
      expect(result.explanation.details).toContain('关键词覆盖率');
    });
    
    it('应该在解释中包含长度匹配分数', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证解释中包含维度评分
      expect(result.explanation.details).toContain('维度评分');
      expect(result.explanation.details).toContain('长度匹配');
    });
  });
  
  describe('需求 6.1, 6.3: 生成详细的选择原因说明', () => {
    it('应该生成包含原始解释和增强信息的完整说明', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证解释包含原始信息
      expect(result.explanation.details).toContain('模糊匹配成功');
      
      // 验证解释包含增强信息
      expect(result.explanation.details).toContain('多层次决策');
      expect(result.explanation.details).toContain('维度评分');
    });
    
    it('应该在解释中包含具体的分数值', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const matches = [
        createMatch(spu1, 1.0),
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证解释中包含数值（格式如 "0.000" 或 "1.000"）
      expect(result.explanation.details).toMatch(/\d+\.\d{3}/);
    });
    
    it('应该保持原始解释不被覆盖', () => {
      const spu1 = createSPU(1, 'iPhone 17 Pro Max', 'Apple');
      const spu2 = createSPU(2, 'iPhone 17', 'Apple');
      
      const originalDetails = '模糊匹配成功';
      const matches = [
        { ...createMatch(spu1, 1.0), explanation: { ...createMatch(spu1, 1.0).explanation, details: originalDetails } },
        createMatch(spu2, 1.0)
      ];
      
      const result = matcher['selectBestMatch'](matches, '17promax', options);
      
      // 验证原始解释仍然存在
      expect(result.explanation.details).toContain(originalDetails);
    });
  });
  
  describe('综合场景：问题场景验证', () => {
    it('应该为"苹果17promax"场景生成详细解释', () => {
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
      
      // 验证选择了正确的SPU
      expect(result.spu.name).toBe('iPhone 17 Pro Max');
      
      // 验证解释完整性
      expect(result.explanation.details).toContain('模糊匹配成功');
      expect(result.explanation.details).toContain('多层次决策');
      expect(result.explanation.details).toContain('型号后缀匹配');
      expect(result.explanation.details).toContain('维度评分');
      
      // 验证包含具体分数
      expect(result.explanation.details).toMatch(/型号后缀匹配: \d+\.\d{3}/);
      expect(result.explanation.details).toMatch(/关键词覆盖率: \d+\.\d{3}/);
      expect(result.explanation.details).toMatch(/长度匹配: \d+\.\d{3}/);
    });
  });
});
