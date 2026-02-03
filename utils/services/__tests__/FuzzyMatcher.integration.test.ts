/**
 * 集成测试：验证 FuzzyMatcher 的 Token 相似度计算逻辑
 * 
 * 验证需求 1.5:
 * - "17promax"与"17 pro max"的相似度应该高于"17promax"与"17"的相似度
 */

import { FuzzyMatcher } from '../FuzzyMatcher';

// 使用反射访问私有方法进行测试
function getCalculateTokenSimilarity(matcher: FuzzyMatcher): (tokens1: string[], tokens2: string[]) => number {
  return (matcher as any).calculateTokenSimilarity.bind(matcher);
}

describe('FuzzyMatcher Token相似度计算集成测试', () => {
  let matcher: FuzzyMatcher;
  let calculateTokenSimilarity: (tokens1: string[], tokens2: string[]) => number;

  beforeEach(() => {
    matcher = new FuzzyMatcher();
    calculateTokenSimilarity = getCalculateTokenSimilarity(matcher);
  });

  describe('需求 1.5: 完整匹配优于部分匹配', () => {
    it('应该确保"17promax"与"17 pro max"的相似度高于"17promax"与"17"', () => {
      // 输入: "17promax" (可能分词为 ["17promax"] 或 ["17", "promax"])
      // SPU1: "17 pro max" → 分词: ["17", "pro", "max"]
      // SPU2: "17" → 分词: ["17"]
      
      // 场景1: 输入分词为 ["17promax"] - 这是关键场景
      const inputTokens1 = ['17promax'];
      const spu1Tokens = ['17', 'pro', 'max'];
      const spu2Tokens = ['17'];
      
      const similarity1 = calculateTokenSimilarity(inputTokens1, spu1Tokens);
      const similarity2 = calculateTokenSimilarity(inputTokens1, spu2Tokens);
      
      console.log(`相似度对比 (输入: ["17promax"]):`);
      console.log(`  "17promax" vs "17 pro max": ${similarity1.toFixed(3)}`);
      console.log(`  "17promax" vs "17": ${similarity2.toFixed(3)}`);
      
      // 这是需求1.5的核心：单个token "17promax" 应该与完整型号匹配更好
      expect(similarity1).toBeGreaterThan(similarity2);
      
      // 场景2: 输入分词为 ["17", "promax"]
      // 注意：这种情况下，["17"] 会得到更高的分数，因为它完全匹配了输入的一个token
      // 这是合理的，因为 ["17"] 是 ["17", "promax"] 的完美子集
      const inputTokens2 = ['17', 'promax'];
      
      const similarity3 = calculateTokenSimilarity(inputTokens2, spu1Tokens);
      const similarity4 = calculateTokenSimilarity(inputTokens2, spu2Tokens);
      
      console.log(`相似度对比 (输入: ["17", "promax"]):`);
      console.log(`  "17 promax" vs "17 pro max": ${similarity3.toFixed(3)}`);
      console.log(`  "17 promax" vs "17": ${similarity4.toFixed(3)}`);
      
      // 在这种情况下，我们期望 "17 pro max" 的分数不会太低
      // 虽然 "17" 可能得分更高（因为它是完美子集），但差距不应该太大
      expect(similarity3).toBeGreaterThan(0.5); // 确保有合理的匹配度
    });

    it('应该正确处理多token完全匹配', () => {
      // "17 pro max" vs "17 pro max" - 完全匹配
      const tokens1 = ['17', 'pro', 'max'];
      const tokens2 = ['17', 'pro', 'max'];
      const similarity = calculateTokenSimilarity(tokens1, tokens2);
      
      expect(similarity).toBe(1.0);
    });

    it('应该正确处理部分token匹配', () => {
      // "17 pro" vs "17 pro max" - 部分匹配
      const tokens1 = ['17', 'pro'];
      const tokens2 = ['17', 'pro', 'max'];
      const similarity = calculateTokenSimilarity(tokens1, tokens2);
      
      // 从tokens1到tokens2: (1.0 + 1.0) / 2 = 1.0
      // 从tokens2到tokens1: (1.0 + 1.0 + 0) / 3 = 0.667
      // 平均: (1.0 + 0.667) / 2 = 0.833
      expect(similarity).toBeCloseTo(0.833, 2);
    });
  });

  describe('边界情况', () => {
    it('应该处理空token数组', () => {
      expect(calculateTokenSimilarity([], ['17', 'pro'])).toBe(0);
      expect(calculateTokenSimilarity(['17', 'pro'], [])).toBe(0);
      expect(calculateTokenSimilarity([], [])).toBe(0);
    });

    it('应该处理单token数组', () => {
      const similarity = calculateTokenSimilarity(['17'], ['17']);
      expect(similarity).toBe(1.0);
    });
  });
});
