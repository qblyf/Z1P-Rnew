/**
 * 需求验证测试：需求 1.5
 * 
 * 验证修复后的Token相似度计算逻辑能够正确处理问题场景：
 * 输入："苹果17promax（A3527)512G深蓝色"
 * 期望匹配：iPhone 17 Pro Max
 * 不应匹配：iPhone 17
 * 
 * 核心问题：确保"17promax"与"17 pro max"的相似度高于"17promax"与"17"
 */

import { FuzzyMatcher } from '../FuzzyMatcher';

// 使用反射访问私有方法进行测试
function getCalculateTokenSimilarity(matcher: FuzzyMatcher): (tokens1: string[], tokens2: string[]) => number {
  return (matcher as any).calculateTokenSimilarity.bind(matcher);
}

describe('需求 1.5 验证：修复Token相似度计算逻辑', () => {
  let matcher: FuzzyMatcher;
  let calculateTokenSimilarity: (tokens1: string[], tokens2: string[]) => number;

  beforeEach(() => {
    matcher = new FuzzyMatcher();
    calculateTokenSimilarity = getCalculateTokenSimilarity(matcher);
  });

  describe('问题场景：17promax 应该匹配 iPhone 17 Pro Max 而不是 iPhone 17', () => {
    it('应该确保"17promax"与"17 pro max"的相似度高于与"17"的相似度', () => {
      // 模拟实际场景的分词结果
      const inputTokens = ['17promax']; // 输入型号可能被分词为单个token
      const spu1Tokens = ['17', 'pro', 'max']; // iPhone 17 Pro Max 的型号部分
      const spu2Tokens = ['17']; // iPhone 17 的型号部分
      
      const similarity1 = calculateTokenSimilarity(inputTokens, spu1Tokens);
      const similarity2 = calculateTokenSimilarity(inputTokens, spu2Tokens);
      
      console.log('\n========== 需求 1.5 验证 ==========');
      console.log(`输入: ["17promax"]`);
      console.log(`SPU1 (iPhone 17 Pro Max): ["17", "pro", "max"]`);
      console.log(`SPU2 (iPhone 17): ["17"]`);
      console.log(`相似度 (17promax vs 17 pro max): ${similarity1.toFixed(3)}`);
      console.log(`相似度 (17promax vs 17): ${similarity2.toFixed(3)}`);
      console.log(`差值: ${(similarity1 - similarity2).toFixed(3)}`);
      console.log('=====================================\n');
      
      // 核心断言：完整型号的相似度必须高于部分型号
      expect(similarity1).toBeGreaterThan(similarity2);
      
      // 确保差距足够明显（至少0.05的差距）
      expect(similarity1 - similarity2).toBeGreaterThan(0.05);
    });

    it('应该为"17promax"与"17 pro max"提供合理的匹配分数', () => {
      const inputTokens = ['17promax'];
      const spuTokens = ['17', 'pro', 'max'];
      
      const similarity = calculateTokenSimilarity(inputTokens, spuTokens);
      
      // 应该有一定的匹配度（至少0.2），因为包含了多个部分匹配
      expect(similarity).toBeGreaterThan(0.2);
      
      // 但不应该太高（不超过0.5），因为不是完全匹配
      expect(similarity).toBeLessThan(0.5);
    });

    it('应该为"17promax"与"17"提供较低的匹配分数', () => {
      const inputTokens = ['17promax'];
      const spuTokens = ['17'];
      
      const similarity = calculateTokenSimilarity(inputTokens, spuTokens);
      
      // 应该有一些匹配度（因为包含"17"）
      expect(similarity).toBeGreaterThan(0);
      
      // 但应该较低（不超过0.3），因为只是部分包含
      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('对比：修复前后的行为差异', () => {
    it('修复前：短token在长输入中会得到不合理的高分', () => {
      // 修复前的逻辑：if (token1.includes(token2)) { matchCount++; }
      // 这会导致"17promax".includes("17") = true，给出1.0的匹配分数
      // 最终相似度：1/1 = 1.0（错误！）
      
      // 修复后的逻辑：根据长度比例计算部分匹配分数
      const inputTokens = ['17promax'];
      const spuTokens = ['17'];
      
      const similarity = calculateTokenSimilarity(inputTokens, spuTokens);
      
      // 修复后应该得到较低的分数（约0.175）
      // 计算：
      // - "17promax" vs "17": 2/9 * 0.7 = 0.155
      // - "17" vs "17promax": 2/9 * 0.7 = 0.155
      // - 平均：(0.155 + 0.155) / 2 = 0.155
      // - 但由于双向计算，实际约为 0.175
      expect(similarity).toBeLessThan(0.3);
      expect(similarity).toBeGreaterThan(0.1);
    });

    it('修复后：完整型号能够获得更高的匹配分数', () => {
      const inputTokens = ['17promax'];
      const completeModelTokens = ['17', 'pro', 'max'];
      const partialModelTokens = ['17'];
      
      const completeSimilarity = calculateTokenSimilarity(inputTokens, completeModelTokens);
      const partialSimilarity = calculateTokenSimilarity(inputTokens, partialModelTokens);
      
      // 完整型号应该明显优于部分型号
      const improvement = completeSimilarity - partialSimilarity;
      
      console.log('\n========== 修复效果对比 ==========');
      console.log(`完整型号相似度: ${completeSimilarity.toFixed(3)}`);
      console.log(`部分型号相似度: ${partialSimilarity.toFixed(3)}`);
      console.log(`改进幅度: ${improvement.toFixed(3)} (${((improvement / partialSimilarity) * 100).toFixed(1)}%)`);
      console.log('===================================\n');
      
      expect(improvement).toBeGreaterThan(0);
      expect(completeSimilarity / partialSimilarity).toBeGreaterThan(1.2); // 至少提升20%
    });
  });

  describe('边界情况和其他场景', () => {
    it('应该正确处理完全匹配的情况', () => {
      const tokens1 = ['17', 'pro', 'max'];
      const tokens2 = ['17', 'pro', 'max'];
      
      const similarity = calculateTokenSimilarity(tokens1, tokens2);
      
      expect(similarity).toBe(1.0);
    });

    it('应该正确处理完全不匹配的情况', () => {
      const tokens1 = ['iphone'];
      const tokens2 = ['samsung'];
      
      const similarity = calculateTokenSimilarity(tokens1, tokens2);
      
      expect(similarity).toBe(0);
    });

    it('应该正确处理多个部分匹配的情况', () => {
      const inputTokens = ['iphone15promax'];
      const spuTokens = ['iphone', '15', 'pro', 'max'];
      
      const similarity = calculateTokenSimilarity(inputTokens, spuTokens);
      
      // 应该有较高的匹配度，因为包含多个部分
      expect(similarity).toBeGreaterThan(0.2);
    });
  });
});
