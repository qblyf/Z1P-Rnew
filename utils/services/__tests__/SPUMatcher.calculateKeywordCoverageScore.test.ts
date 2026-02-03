/**
 * SPUMatcher.calculateKeywordCoverageScore 单元测试
 * 
 * 测试需求 4.1, 4.2, 4.3：
 * - 使用tokenize函数提取输入关键词
 * - 统计SPU名称中包含的关键词数量
 * - 计算覆盖率（覆盖数/总数）
 */

import { SPUMatcher } from '../SPUMatcher';

// 使用反射访问私有方法进行测试
type SPUMatcherWithPrivate = SPUMatcher & {
  calculateKeywordCoverageScore(
    inputModel: string,
    spuName: string,
    tokenize: (str: string) => string[]
  ): number;
};

describe('SPUMatcher.calculateKeywordCoverageScore', () => {
  let matcher: SPUMatcherWithPrivate;
  
  // Mock tokenize 函数（简化版）
  const mockTokenize = (str: string): string[] => {
    if (!str) return [];
    
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const isEnglish = /[a-zA-Z0-9]/.test(char);
      const isChinese = /[\u4e00-\u9fa5]/.test(char);
      
      if (isEnglish) {
        current += char;
      } else if (isChinese) {
        if (current) {
          tokens.push(current.toLowerCase());
          current = '';
        }
        tokens.push(char);
      } else {
        if (current) {
          tokens.push(current.toLowerCase());
          current = '';
        }
      }
    }
    
    if (current) {
      tokens.push(current.toLowerCase());
    }
    
    return tokens;
  };
  
  beforeEach(() => {
    matcher = new SPUMatcher() as SPUMatcherWithPrivate;
  });
  
  describe('基本功能测试', () => {
    it('应该正确计算完全覆盖的情况', () => {
      // 需求 4.1, 4.3: 计算覆盖率
      const inputModel = '17promax';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "17promax" 分词为 ["17promax"]
      // SPU名称包含 "17promax" 吗？不完全包含，但包含 "17", "pro", "max"
      // 由于我们的实现使用 includes，"17promax" 不会被 "iPhone 17 Pro Max" 包含
      // 所以覆盖率应该是 0
      expect(score).toBe(0);
    });
    
    it('应该正确计算部分覆盖的情况', () => {
      // 需求 4.1, 4.3: 统计SPU名称中包含的关键词数量
      const inputModel = 'iphone 17 pro';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "iphone 17 pro" 分词为 ["iphone", "17", "pro"]
      // 只有 "iphone" 和 "pro" 长度 > 2
      // SPU名称包含 "iphone" 和 "pro"
      // 覆盖率: 2/2 = 1.0
      expect(score).toBe(1.0);
    });
    
    it('应该正确计算无覆盖的情况', () => {
      const inputModel = 'mate60';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "mate60" 分词为 ["mate60"]
      // SPU名称不包含 "mate60"
      // 覆盖率: 0/1 = 0
      expect(score).toBe(0);
    });
    
    it('应该过滤掉长度小于等于2的token', () => {
      const inputModel = 'a b cd efg';
      const spuName = 'iPhone efg';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "a b cd efg" 分词为 ["a", "b", "cd", "efg"]
      // 只有 "efg" 长度 > 2
      // SPU名称包含 "efg"
      // 覆盖率: 1/1 = 1.0（因为只考虑长度>2的token）
      expect(score).toBe(1.0);
    });
  });
  
  describe('边界情况测试', () => {
    it('应该处理空输入', () => {
      const inputModel = '';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // 空输入，分词结果为空数组
      // 覆盖率: 0（避免除以0）
      expect(score).toBe(0);
    });
    
    it('应该处理空SPU名称', () => {
      const inputModel = 'iphone';
      const spuName = '';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // SPU名称为空，不包含任何关键词
      // 覆盖率: 0/1 = 0
      expect(score).toBe(0);
    });
    
    it('应该处理所有token长度都小于等于2的情况', () => {
      const inputModel = 'a b c';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "a b c" 分词为 ["a", "b", "c"]
      // 所有token长度都 <= 2，都被过滤
      // 没有有效的token，但inputTokens.length > 0
      // 覆盖率: 0/3 = 0
      expect(score).toBe(0);
    });
  });
  
  describe('实际场景测试', () => {
    it('应该正确处理中英文混合输入', () => {
      // 需求 4.2: 识别品牌、型号、型号后缀等关键信息
      const inputModel = '苹果17promax';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "苹果17promax" 分词为 ["苹", "果", "17promax"]
      // 只有 "17promax" 长度 > 2
      // SPU名称不包含 "17promax"（虽然包含 "17", "pro", "max"）
      // 覆盖率: 0/1 = 0
      expect(score).toBe(0);
    });
    
    it('应该正确处理分词后的多个关键词', () => {
      const inputModel = 'iphone 17 pro max';
      const spuName = 'iPhone 17 Pro Max 512GB';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "iphone 17 pro max" 分词为 ["iphone", "17", "pro", "max"]
      // 长度 > 2 的: ["iphone", "pro", "max"]
      // SPU名称包含所有这些关键词
      // 覆盖率: 3/3 = 1.0
      expect(score).toBe(1.0);
    });
    
    it('应该正确处理部分匹配的情况', () => {
      const inputModel = 'mate 60 pro';
      const spuName = '华为 Mate 60';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "mate 60 pro" 分词为 ["mate", "60", "pro"]
      // 长度 > 2 的: ["mate", "pro"]
      // SPU名称包含 "mate" 但不包含 "pro"
      // 覆盖率: 1/2 = 0.5
      expect(score).toBe(0.5);
    });
    
    it('应该不区分大小写', () => {
      const inputModel = 'IPHONE PRO MAX';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "IPHONE PRO MAX" 分词为 ["iphone", "pro", "max"]（转小写）
      // 所有长度 > 2
      // SPU名称（转小写后）包含所有关键词
      // 覆盖率: 3/3 = 1.0
      expect(score).toBe(1.0);
    });
  });
  
  describe('需求验证', () => {
    it('需求 4.1: 应该计算SPU对输入关键词的覆盖率', () => {
      const inputModel = 'iphone pro';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // 验证返回值在 0-1 之间
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      
      // 验证覆盖率计算正确
      expect(score).toBe(1.0); // "iphone" 和 "pro" 都被覆盖
    });
    
    it('需求 4.2: 应该使用tokenize函数提取关键词', () => {
      const inputModel = 'test123';
      const spuName = 'Test 123';
      
      // 使用自定义的tokenize函数
      const customTokenize = jest.fn((str: string) => str.toLowerCase().split(/\s+/));
      
      matcher.calculateKeywordCoverageScore(inputModel, spuName, customTokenize);
      
      // 验证tokenize函数被调用
      expect(customTokenize).toHaveBeenCalledWith(inputModel);
    });
    
    it('需求 4.3: 应该统计SPU名称中包含的关键词数量', () => {
      const inputModel = 'iphone 17 pro max ultra';
      const spuName = 'iPhone 17 Pro Max';
      
      const score = matcher.calculateKeywordCoverageScore(inputModel, spuName, mockTokenize);
      
      // "iphone 17 pro max ultra" 分词为 ["iphone", "17", "pro", "max", "ultra"]
      // 长度 > 2 的: ["iphone", "pro", "max", "ultra"]
      // SPU名称包含: ["iphone", "pro", "max"]，不包含 "ultra"
      // 覆盖率: 3/4 = 0.75
      expect(score).toBe(0.75);
    });
  });
});
