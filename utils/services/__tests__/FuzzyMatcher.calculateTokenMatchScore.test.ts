/**
 * 测试 FuzzyMatcher.calculateTokenMatchScore 方法
 * 
 * 验证需求 1.1-1.4:
 * - 1.2: 完全匹配返回1.0
 * - 1.3: 部分匹配返回部分分数
 * - 1.4: 长输入包含短SPU时得分较低
 */

import { FuzzyMatcher } from '../FuzzyMatcher';

// 使用反射访问私有方法进行测试
function getCalculateTokenMatchScore(matcher: FuzzyMatcher): (token1: string, token2: string) => number {
  return (matcher as any).calculateTokenMatchScore.bind(matcher);
}

describe('FuzzyMatcher.calculateTokenMatchScore', () => {
  let matcher: FuzzyMatcher;
  let calculateTokenMatchScore: (token1: string, token2: string) => number;

  beforeEach(() => {
    matcher = new FuzzyMatcher();
    calculateTokenMatchScore = getCalculateTokenMatchScore(matcher);
  });

  describe('需求 1.2: 完全匹配', () => {
    it('应该为完全相同的token返回1.0', () => {
      expect(calculateTokenMatchScore('17', '17')).toBe(1.0);
      expect(calculateTokenMatchScore('pro', 'pro')).toBe(1.0);
      expect(calculateTokenMatchScore('max', 'max')).toBe(1.0);
      expect(calculateTokenMatchScore('iphone', 'iphone')).toBe(1.0);
    });
  });

  describe('需求 1.3: 部分匹配返回部分分数', () => {
    it('应该为部分匹配返回大于0且小于1.0的分数', () => {
      const score1 = calculateTokenMatchScore('17promax', '17');
      expect(score1).toBeGreaterThan(0);
      expect(score1).toBeLessThan(1.0);

      const score2 = calculateTokenMatchScore('promax', 'pro');
      expect(score2).toBeGreaterThan(0);
      expect(score2).toBeLessThan(1.0);

      const score3 = calculateTokenMatchScore('17', '17promax');
      expect(score3).toBeGreaterThan(0);
      expect(score3).toBeLessThan(1.0);
    });

    it('应该根据长度比例计算分数，最高0.7', () => {
      // "promax"包含"pro" → 3/6 = 0.5 * 0.7 = 0.35
      const score1 = calculateTokenMatchScore('promax', 'pro');
      expect(score1).toBeCloseTo(0.35, 2);

      // "pro"包含在"promax"中 → 3/6 = 0.5 * 0.7 = 0.35
      const score2 = calculateTokenMatchScore('pro', 'promax');
      expect(score2).toBeCloseTo(0.35, 2);

      // 部分匹配的最高分应该是0.7（当长度比例接近1时）
      const score3 = calculateTokenMatchScore('iphone15', 'iphone1');
      expect(score3).toBeLessThanOrEqual(0.7);
    });
  });

  describe('需求 1.4: 长输入包含短SPU时得分较低', () => {
    it('应该为长输入包含短token的情况返回较低分数', () => {
      // "17promax"包含"17" → 2/9 ≈ 0.22 * 0.7 ≈ 0.15
      const score = calculateTokenMatchScore('17promax', '17');
      expect(score).toBeLessThan(0.5);
      expect(score).toBeCloseTo(0.15, 1);
    });

    it('应该确保短token在长输入中的分数低于长度接近的部分匹配', () => {
      const shortInLong = calculateTokenMatchScore('17promax', '17');
      const similarLength = calculateTokenMatchScore('promax', 'pro');
      
      // "promax"/"pro" (3/6=0.5) 应该比 "17promax"/"17" (2/9≈0.22) 得分更高
      expect(similarLength).toBeGreaterThan(shortInLong);
    });
  });

  describe('不匹配情况', () => {
    it('应该为完全不匹配的token返回0', () => {
      expect(calculateTokenMatchScore('17', 'pro')).toBe(0);
      expect(calculateTokenMatchScore('iphone', 'samsung')).toBe(0);
      expect(calculateTokenMatchScore('max', 'mini')).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      expect(calculateTokenMatchScore('', '')).toBe(1.0); // 空字符串完全匹配
      expect(calculateTokenMatchScore('test', '')).toBe(0); // 空字符串不包含在非空字符串中
      expect(calculateTokenMatchScore('', 'test')).toBe(0);
    });

    it('应该处理单字符token', () => {
      expect(calculateTokenMatchScore('a', 'a')).toBe(1.0);
      expect(calculateTokenMatchScore('abc', 'a')).toBeGreaterThan(0);
      expect(calculateTokenMatchScore('a', 'abc')).toBeGreaterThan(0);
    });
  });
});
