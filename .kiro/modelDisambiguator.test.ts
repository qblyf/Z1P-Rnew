/**
 * Unit Tests for ModelDisambiguator
 * 测试型号消歧器的功能
 */

import { ModelDisambiguator } from './modelDisambiguator';

describe('ModelDisambiguator', () => {
  let disambiguator: ModelDisambiguator;

  beforeEach(() => {
    disambiguator = new ModelDisambiguator();
  });

  describe('extractFullModel', () => {
    it('should extract basic model code', () => {
      expect(disambiguator.extractFullModel('VIVO X200')).toBe('X200');
      expect(disambiguator.extractFullModel('OPPO A5')).toBe('A5');
      expect(disambiguator.extractFullModel('IQOO Z10')).toBe('Z10');
    });

    it('should extract model with single suffix', () => {
      expect(disambiguator.extractFullModel('VIVO X200 Pro')).toBe('X200 Pro');
      expect(disambiguator.extractFullModel('OPPO A5 Max')).toBe('A5 Max');
      expect(disambiguator.extractFullModel('IQOO Z10 Turbo')).toBe('Z10 Turbo');
    });

    it('should extract model with multiple suffixes', () => {
      expect(disambiguator.extractFullModel('VIVO X200 Pro mini')).toBe('X200 Pro Mini');
      expect(disambiguator.extractFullModel('OPPO A5 Max Plus')).toBe('A5 Max Plus');
    });

    it('should handle case insensitivity', () => {
      expect(disambiguator.extractFullModel('vivo x200 pro')).toBe('X200 Pro');
      expect(disambiguator.extractFullModel('VIVO X200 PRO')).toBe('X200 Pro');
      expect(disambiguator.extractFullModel('Vivo X200 Pro')).toBe('X200 Pro');
    });

    it('should handle models without spaces', () => {
      expect(disambiguator.extractFullModel('VIVOX200Pro')).toBe('X200 Pro');
      expect(disambiguator.extractFullModel('OPPOA5Max')).toBe('A5 Max');
    });

    it('should return null for invalid input', () => {
      expect(disambiguator.extractFullModel('')).toBeNull();
      expect(disambiguator.extractFullModel('   ')).toBeNull();
      expect(disambiguator.extractFullModel('无效型号')).toBeNull();
    });

    it('should handle models with version suffixes', () => {
      expect(disambiguator.extractFullModel('VIVO X200 Pro 活力版')).toBe('X200 Pro');
      expect(disambiguator.extractFullModel('OPPO A5 Max 标准版')).toBe('A5 Max');
    });
  });

  describe('modelsExactMatch', () => {
    it('should match identical models', () => {
      expect(disambiguator.modelsExactMatch('X200 Pro', 'X200 Pro')).toBe(true);
      expect(disambiguator.modelsExactMatch('A5 Max', 'A5 Max')).toBe(true);
      expect(disambiguator.modelsExactMatch('Z10 Turbo', 'Z10 Turbo')).toBe(true);
    });

    it('should match models with different spacing', () => {
      expect(disambiguator.modelsExactMatch('X200 Pro', 'X200Pro')).toBe(true);
      expect(disambiguator.modelsExactMatch('A5 Max', 'A5Max')).toBe(true);
    });

    it('should match models with different casing', () => {
      expect(disambiguator.modelsExactMatch('X200 Pro', 'x200 pro')).toBe(true);
      expect(disambiguator.modelsExactMatch('A5 MAX', 'a5 max')).toBe(true);
    });

    it('should not match different models', () => {
      expect(disambiguator.modelsExactMatch('X200 Pro', 'X200 Pro mini')).toBe(false);
      expect(disambiguator.modelsExactMatch('X200 Pro', 'X200 Max')).toBe(false);
      expect(disambiguator.modelsExactMatch('X200', 'X200 Pro')).toBe(false);
    });

    it('should handle null values', () => {
      expect(disambiguator.modelsExactMatch(null, null)).toBe(true);
      expect(disambiguator.modelsExactMatch('X200 Pro', null)).toBe(false);
      expect(disambiguator.modelsExactMatch(null, 'X200 Pro')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(disambiguator.modelsExactMatch('', '')).toBe(true);
      expect(disambiguator.modelsExactMatch('X200 Pro', '')).toBe(false);
      expect(disambiguator.modelsExactMatch('', 'X200 Pro')).toBe(false);
    });
  });

  describe('calculateModelMatchScore', () => {
    it('should return 1.0 for exact matches', () => {
      expect(disambiguator.calculateModelMatchScore('X200 Pro', 'X200 Pro')).toBe(1.0);
      expect(disambiguator.calculateModelMatchScore('A5 Max', 'A5 Max')).toBe(1.0);
      expect(disambiguator.calculateModelMatchScore('Z10 Turbo', 'Z10 Turbo')).toBe(1.0);
    });

    it('should return 1.0 for matches with different spacing/casing', () => {
      expect(disambiguator.calculateModelMatchScore('X200 Pro', 'X200Pro')).toBe(1.0);
      expect(disambiguator.calculateModelMatchScore('X200 Pro', 'x200 pro')).toBe(1.0);
    });

    it('should return 0.0 for models with different suffixes', () => {
      // X200 Pro vs X200 Pro mini - 不同的型号
      expect(disambiguator.calculateModelMatchScore('X200 Pro', 'X200 Pro mini')).toBe(0.0);
      // X200 vs X200 Pro - 不同的型号
      expect(disambiguator.calculateModelMatchScore('X200', 'X200 Pro')).toBe(0.0);
    });

    it('should return 0.3 for same base model with different suffixes', () => {
      // X200 Pro vs X200 Max - 基础型号相同但后缀不同
      expect(disambiguator.calculateModelMatchScore('X200 Pro', 'X200 Max')).toBe(0.3);
      expect(disambiguator.calculateModelMatchScore('A5 Pro', 'A5 Max')).toBe(0.3);
    });

    it('should return 0.0 for completely different models', () => {
      expect(disambiguator.calculateModelMatchScore('X200 Pro', 'X100 Pro')).toBe(0.0);
      expect(disambiguator.calculateModelMatchScore('A5 Max', 'B5 Max')).toBe(0.0);
    });

    it('should handle null values', () => {
      expect(disambiguator.calculateModelMatchScore(null, null)).toBe(1.0);
      expect(disambiguator.calculateModelMatchScore('X200 Pro', null)).toBe(0.0);
      expect(disambiguator.calculateModelMatchScore(null, 'X200 Pro')).toBe(0.0);
    });

    it('should return 0.5 for partial matches without known suffixes', () => {
      // X200 vs X200活力版 - 部分匹配（活力版不是型号后缀）
      expect(disambiguator.calculateModelMatchScore('X200', 'X200活力版')).toBe(0.5);
    });
  });

  describe('shouldExcludeCandidate', () => {
    it('should exclude candidates with extra suffixes', () => {
      // 输入"X200 Pro"，候选"X200 Pro mini" -> 应该排除
      expect(disambiguator.shouldExcludeCandidate('X200 Pro', 'X200 Pro mini')).toBe(true);
      expect(disambiguator.shouldExcludeCandidate('A5', 'A5 Pro')).toBe(true);
    });

    it('should not exclude exact matches', () => {
      expect(disambiguator.shouldExcludeCandidate('X200 Pro', 'X200 Pro')).toBe(false);
      expect(disambiguator.shouldExcludeCandidate('A5 Max', 'A5 Max')).toBe(false);
    });

    it('should not exclude more general candidates', () => {
      // 输入"X200 Pro mini"，候选"X200 Pro" -> 不排除（候选更通用）
      expect(disambiguator.shouldExcludeCandidate('X200 Pro mini', 'X200 Pro')).toBe(false);
      expect(disambiguator.shouldExcludeCandidate('A5 Pro', 'A5')).toBe(false);
    });

    it('should not exclude completely different models', () => {
      expect(disambiguator.shouldExcludeCandidate('X200 Pro', 'X100 Pro')).toBe(false);
      expect(disambiguator.shouldExcludeCandidate('A5 Max', 'B5 Max')).toBe(false);
    });

    it('should handle null values', () => {
      expect(disambiguator.shouldExcludeCandidate(null, null)).toBe(false);
      expect(disambiguator.shouldExcludeCandidate('X200 Pro', null)).toBe(false);
      expect(disambiguator.shouldExcludeCandidate(null, 'X200 Pro')).toBe(false);
    });
  });

  describe('getSupportedSuffixes', () => {
    it('should return list of supported suffixes', () => {
      const suffixes = disambiguator.getSupportedSuffixes();
      expect(suffixes).toContain('Pro');
      expect(suffixes).toContain('Max');
      expect(suffixes).toContain('Mini');
      expect(suffixes).toContain('Plus');
      expect(suffixes).toContain('Ultra');
      expect(suffixes).toContain('SE');
      expect(suffixes).toContain('Air');
      expect(suffixes).toContain('Turbo');
    });

    it('should return a copy of the array', () => {
      const suffixes1 = disambiguator.getSupportedSuffixes();
      const suffixes2 = disambiguator.getSupportedSuffixes();
      expect(suffixes1).not.toBe(suffixes2);
      expect(suffixes1).toEqual(suffixes2);
    });
  });

  describe('Real-world test cases', () => {
    it('should correctly distinguish X200 Pro from X200 Pro mini', () => {
      const model1 = disambiguator.extractFullModel('VIVO X200 Pro');
      const model2 = disambiguator.extractFullModel('VIVO X200 Pro mini');
      
      expect(model1).toBe('X200 Pro');
      expect(model2).toBe('X200 Pro Mini');
      expect(disambiguator.modelsExactMatch(model1, model2)).toBe(false);
      expect(disambiguator.calculateModelMatchScore(model1, model2)).toBe(0.0);
      expect(disambiguator.shouldExcludeCandidate(model1, model2)).toBe(true);
    });

    it('should correctly distinguish S30 Pro from S30 Pro mini', () => {
      const model1 = disambiguator.extractFullModel('Vivo S30 Pro');
      const model2 = disambiguator.extractFullModel('Vivo S30 Pro mini');
      
      expect(model1).toBe('S30 Pro');
      expect(model2).toBe('S30 Pro Mini');
      expect(disambiguator.modelsExactMatch(model1, model2)).toBe(false);
      expect(disambiguator.calculateModelMatchScore(model1, model2)).toBe(0.0);
    });

    it('should handle models with version suffixes correctly', () => {
      const model1 = disambiguator.extractFullModel('VIVO X200 Pro 活力版');
      const model2 = disambiguator.extractFullModel('VIVO X200 Pro 标准版');
      
      // 版本后缀不是型号的一部分，所以应该提取相同的型号
      expect(model1).toBe('X200 Pro');
      expect(model2).toBe('X200 Pro');
      expect(disambiguator.modelsExactMatch(model1, model2)).toBe(true);
    });

    it('should handle models without spaces correctly', () => {
      const model1 = disambiguator.extractFullModel('VivoS30Promini');
      const model2 = disambiguator.extractFullModel('Vivo S30 Pro mini');
      
      expect(model1).toBe('S30 Pro Mini');
      expect(model2).toBe('S30 Pro Mini');
      expect(disambiguator.modelsExactMatch(model1, model2)).toBe(true);
    });
  });
});
