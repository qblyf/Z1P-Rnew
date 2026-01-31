/**
 * Unit tests for VersionMatcher
 * 
 * Tests verify:
 * - Exact version matching
 * - Compatible version matching
 * - Priority version matching
 * - Version mismatch handling
 * - Edge cases (null versions, etc.)
 */

import { VersionMatcher, VersionMatchResult } from './VersionMatcher';
import type { VersionInfo } from '../types';

describe('VersionMatcher', () => {
  let matcher: VersionMatcher;

  beforeEach(() => {
    matcher = new VersionMatcher();
  });

  describe('Exact Version Matching', () => {
    test('should return exact match when version names are identical', () => {
      const inputVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.matchType).toBe('exact');
      expect(result.explanation).toContain('版本完全匹配');
    });

    test('should return exact match for Bluetooth version', () => {
      const inputVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.matchType).toBe('exact');
    });

    test('should return exact match for standard edition', () => {
      const inputVersion: VersionInfo = {
        name: '活力版',
        keywords: ['活力版'],
        priority: 5
      };
      const spuVersion: VersionInfo = {
        name: '活力版',
        keywords: ['活力版'],
        priority: 5
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.matchType).toBe('exact');
    });
  });

  describe('Compatible Version Matching', () => {
    test('should match "全网通5G" with "5G" as compatible', () => {
      const inputVersion: VersionInfo = {
        name: '全网通5G',
        keywords: ['全网通5g'],
        priority: 10
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.95);
      expect(result.matchType).toBe('compatible');
      expect(result.explanation).toContain('版本兼容匹配');
    });

    test('should match "全网通5G" with "5G版" as compatible', () => {
      const inputVersion: VersionInfo = {
        name: '全网通5G',
        keywords: ['全网通5g'],
        priority: 10
      };
      const spuVersion: VersionInfo = {
        name: '5G版',
        keywords: ['5g版'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.95);
      expect(result.matchType).toBe('compatible');
    });

    test('should match "全网通5G" with "全网通版" as compatible', () => {
      const inputVersion: VersionInfo = {
        name: '全网通5G',
        keywords: ['全网通5g'],
        priority: 10
      };
      const spuVersion: VersionInfo = {
        name: '全网通版',
        keywords: ['全网通版'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.95);
      expect(result.matchType).toBe('compatible');
    });

    test('should match "5G版" with "5G" as compatible (reverse)', () => {
      const inputVersion: VersionInfo = {
        name: '5G版',
        keywords: ['5g版'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.95);
      expect(result.matchType).toBe('compatible');
    });
  });

  describe('Priority Version Matching', () => {
    test('should match versions with same priority and type', () => {
      const inputVersion: VersionInfo = {
        name: '活力版',
        keywords: ['活力版'],
        priority: 5
      };
      const spuVersion: VersionInfo = {
        name: '青春版',
        keywords: ['青春版'],
        priority: 5
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.83);
      expect(result.matchType).toBe('priority');
      expect(result.explanation).toContain('版本优先级匹配');
    });

    test('should match standard editions with same priority', () => {
      const inputVersion: VersionInfo = {
        name: '标准版',
        keywords: ['标准版'],
        priority: 4
      };
      const spuVersion: VersionInfo = {
        name: '基础版',
        keywords: ['基础版'],
        priority: 4
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.83);
      expect(result.matchType).toBe('priority');
    });
  });

  describe('Version Mismatch', () => {
    test('should return mismatch when Bluetooth vs eSIM', () => {
      const inputVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: 'eSIM版',
        keywords: ['esim版'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.6);
      expect(result.matchType).toBe('exact');
      expect(result.explanation).toMatch(/版本(不匹配|互斥)/);
    });

    test('should return mismatch when 5G vs 4G', () => {
      const inputVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '4G',
        keywords: ['4g'],
        priority: 8
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.6);
      expect(result.matchType).toBe('exact');
    });

    test('should return mismatch when different edition types', () => {
      const inputVersion: VersionInfo = {
        name: '活力版',
        keywords: ['活力版'],
        priority: 5
      };
      const spuVersion: VersionInfo = {
        name: 'Pro版',
        keywords: ['pro版'],
        priority: 6
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.6);
      expect(result.matchType).toBe('exact');
    });
  });

  describe('Null Version Handling', () => {
    test('should return no-version match when both are null', () => {
      const result = matcher.match(null, null);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.matchType).toBe('none');
      expect(result.explanation).toContain('都没有版本信息');
    });

    test('should return input-only when only input has version', () => {
      const inputVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(inputVersion, null);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.7);
      expect(result.matchType).toBe('input-only');
      expect(result.explanation).toContain('用户指定版本');
      expect(result.explanation).toContain('但SPU无版本');
    });

    test('should return spu-only when only SPU has version', () => {
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(null, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.95);
      expect(result.matchType).toBe('spu-only');
      expect(result.explanation).toContain('用户未指定版本');
    });
  });

  describe('Simplified Interface Methods', () => {
    test('getScore should return correct score', () => {
      const inputVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const score = matcher.getScore(inputVersion, spuVersion);

      expect(score).toBe(1.0);
    });

    test('isMatch should return true for exact match', () => {
      const inputVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const isMatch = matcher.isMatch(inputVersion, spuVersion);

      expect(isMatch).toBe(true);
    });

    test('isMatch should return false for mismatch', () => {
      const inputVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: 'eSIM版',
        keywords: ['esim版'],
        priority: 9
      };

      const isMatch = matcher.isMatch(inputVersion, spuVersion);

      expect(isMatch).toBe(false);
    });
  });

  describe('Custom Configuration', () => {
    test('should use custom scores when provided', () => {
      const customMatcher = new VersionMatcher({
        exactMatchScore: 0.99,
        compatibleMatchScore: 0.90,
        mismatchScore: 0.5
      });

      const inputVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = customMatcher.match(inputVersion, spuVersion);

      expect(result.score).toBe(0.99);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle vivo Watch GT Bluetooth version matching', () => {
      const inputVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    test('should reject eSIM when input specifies Bluetooth', () => {
      const inputVersion: VersionInfo = {
        name: '蓝牙版',
        keywords: ['蓝牙版'],
        priority: 9
      };
      const spuVersion: VersionInfo = {
        name: 'eSIM版',
        keywords: ['esim版'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.6);
    });

    test('should handle phone with 全网通5G matching 5G SPU', () => {
      const inputVersion: VersionInfo = {
        name: '全网通5G',
        keywords: ['全网通5g'],
        priority: 10
      };
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(inputVersion, spuVersion);

      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.95);
      expect(result.matchType).toBe('compatible');
    });

    test('should handle user omitting version (SPU has version)', () => {
      const spuVersion: VersionInfo = {
        name: '5G',
        keywords: ['5g'],
        priority: 9
      };

      const result = matcher.match(null, spuVersion);

      expect(result.matched).toBe(false);
      expect(result.score).toBe(0.95); // High score because users often omit version
      expect(result.matchType).toBe('spu-only');
    });
  });
});
