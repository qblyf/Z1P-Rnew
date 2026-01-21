/**
 * Unit Tests for VersionExtractor
 * 版本提取器单元测试
 */

import { VersionExtractor } from './versionExtractor';

describe('VersionExtractor', () => {
  let extractor: VersionExtractor;

  beforeEach(() => {
    extractor = new VersionExtractor();
  });

  describe('extractVersion', () => {
    it('should extract common version identifiers', () => {
      expect(extractor.extractVersion('OPPO A5 活力版')).toBe('活力版');
      expect(extractor.extractVersion('VIVO X200 Pro 标准版')).toBe('标准版');
      expect(extractor.extractVersion('小米14 青春版')).toBe('青春版');
      expect(extractor.extractVersion('华为Mate60 至尊版')).toBe('至尊版');
      expect(extractor.extractVersion('IQOO Z10 竞速版')).toBe('竞速版');
      expect(extractor.extractVersion('Redmi K70 极速版')).toBe('极速版');
    });

    it('should extract network version identifiers', () => {
      expect(extractor.extractVersion('华为P60 全网通5G版')).toBe('全网通5G版');
      expect(extractor.extractVersion('小米13 5G版')).toBe('5G版');
      expect(extractor.extractVersion('OPPO Reno 4G版')).toBe('4G版');
    });

    it('should extract carrier version identifiers', () => {
      expect(extractor.extractVersion('iPhone 15 移动版')).toBe('移动版');
      expect(extractor.extractVersion('华为Nova 联通版')).toBe('联通版');
      expect(extractor.extractVersion('小米12 电信版')).toBe('电信版');
    });

    it('should extract regional version identifiers', () => {
      expect(extractor.extractVersion('iPhone 15 Pro 国行版')).toBe('国行版');
      expect(extractor.extractVersion('三星S24 港版')).toBe('港版');
      expect(extractor.extractVersion('iPhone 14 美版')).toBe('美版');
    });

    it('should extract generation version patterns', () => {
      expect(extractor.extractVersion('Apple Watch V2')).toBe('V2');
      expect(extractor.extractVersion('iPad Gen 3')).toBe('Gen 3');
      expect(extractor.extractVersion('AirPods 第二代')).toBe('第二代');
      expect(extractor.extractVersion('小米手环 3代')).toBe('3代');
    });

    it('should prioritize longer version names', () => {
      // "全网通5G版" 应该优先于 "5G版"
      expect(extractor.extractVersion('华为P60 全网通5G版')).toBe('全网通5G版');
    });

    it('should handle case insensitivity', () => {
      expect(extractor.extractVersion('OPPO A5 活力版')).toBe('活力版');
      expect(extractor.extractVersion('oppo a5 活力版')).toBe('活力版');
      expect(extractor.extractVersion('Oppo A5 活力版')).toBe('活力版');
    });

    it('should return null when no version is found', () => {
      expect(extractor.extractVersion('OPPO A5')).toBeNull();
      expect(extractor.extractVersion('VIVO X200 Pro')).toBeNull();
      expect(extractor.extractVersion('小米14')).toBeNull();
    });

    it('should handle empty or invalid input', () => {
      expect(extractor.extractVersion('')).toBeNull();
      expect(extractor.extractVersion('   ')).toBeNull();
    });

    it('should extract version from complex product names', () => {
      expect(extractor.extractVersion('VIVO X200 Pro 活力版 12GB+256GB 玉石绿')).toBe('活力版');
      expect(extractor.extractVersion('华为Mate60 Pro 至尊版 16GB+512GB 雅川青')).toBe('至尊版');
    });
  });

  describe('versionsMatch', () => {
    it('should match identical versions', () => {
      expect(extractor.versionsMatch('活力版', '活力版')).toBe(true);
      expect(extractor.versionsMatch('标准版', '标准版')).toBe(true);
      expect(extractor.versionsMatch('5G版', '5G版')).toBe(true);
    });

    it('should match when both versions are null', () => {
      expect(extractor.versionsMatch(null, null)).toBe(true);
    });

    it('should not match when only one version is null', () => {
      expect(extractor.versionsMatch('活力版', null)).toBe(false);
      expect(extractor.versionsMatch(null, '活力版')).toBe(false);
    });

    it('should match case-insensitive versions', () => {
      expect(extractor.versionsMatch('活力版', '活力版')).toBe(true);
      expect(extractor.versionsMatch('5G版', '5g版')).toBe(true);
    });

    it('should match versions with different spacing', () => {
      expect(extractor.versionsMatch('5G版', '5G 版')).toBe(true);
      expect(extractor.versionsMatch('全网通5G版', '全网通 5G 版')).toBe(true);
    });

    it('should match synonym versions', () => {
      expect(extractor.versionsMatch('5G版', '全网通5G版')).toBe(true);
      expect(extractor.versionsMatch('标准版', '基础版')).toBe(true);
      expect(extractor.versionsMatch('旗舰版', '至尊版')).toBe(true);
    });

    it('should not match different versions', () => {
      expect(extractor.versionsMatch('活力版', '标准版')).toBe(false);
      expect(extractor.versionsMatch('5G版', '4G版')).toBe(false);
      expect(extractor.versionsMatch('国行版', '港版')).toBe(false);
    });

    it('should handle generation versions', () => {
      expect(extractor.versionsMatch('V2', 'V2')).toBe(true);
      expect(extractor.versionsMatch('V2', 'V3')).toBe(false);
      expect(extractor.versionsMatch('Gen 2', 'Gen 2')).toBe(true);
    });
  });

  describe('removeVersion', () => {
    it('should remove version from product name', () => {
      expect(extractor.removeVersion('OPPO A5 活力版')).toBe('OPPO A5');
      expect(extractor.removeVersion('VIVO X200 Pro 标准版')).toBe('VIVO X200 Pro');
      expect(extractor.removeVersion('小米14 青春版')).toBe('小米14');
    });

    it('should handle product names without version', () => {
      expect(extractor.removeVersion('OPPO A5')).toBe('OPPO A5');
      expect(extractor.removeVersion('VIVO X200 Pro')).toBe('VIVO X200 Pro');
    });

    it('should handle empty input', () => {
      expect(extractor.removeVersion('')).toBe('');
    });

    it('should clean up extra spaces after removal', () => {
      expect(extractor.removeVersion('OPPO A5  活力版')).toBe('OPPO A5');
      expect(extractor.removeVersion('VIVO X200 Pro   标准版')).toBe('VIVO X200 Pro');
    });

    it('should remove version from complex product names', () => {
      const result = extractor.removeVersion('VIVO X200 Pro 活力版 12GB+256GB 玉石绿');
      expect(result).toBe('VIVO X200 Pro 12GB+256GB 玉石绿');
    });
  });

  describe('getSupportedVersions', () => {
    it('should return a list of supported versions', () => {
      const versions = extractor.getSupportedVersions();
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions).toContain('活力版');
      expect(versions).toContain('标准版');
      expect(versions).toContain('青春版');
      expect(versions).toContain('至尊版');
      expect(versions).toContain('竞速版');
      expect(versions).toContain('极速版');
      expect(versions).toContain('全网通5G版');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple versions in one name (extract first)', () => {
      // 如果产品名称包含多个版本标识，应该提取第一个（最长的）
      const result = extractor.extractVersion('华为P60 全网通5G版 标准版');
      // 由于 "全网通5G版" 在列表中排在前面，应该被优先匹配
      expect(result).toBe('全网通5G版');
    });

    it('should handle version at different positions', () => {
      expect(extractor.extractVersion('活力版 OPPO A5')).toBe('活力版');
      expect(extractor.extractVersion('OPPO 活力版 A5')).toBe('活力版');
      expect(extractor.extractVersion('OPPO A5 活力版')).toBe('活力版');
    });

    it('should not match partial words', () => {
      // "版" 不应该被识别为版本
      // 但由于我们的实现使用 includes，这个测试可能会失败
      // 这是一个已知的限制，可以在未来改进
      expect(extractor.extractVersion('OPPO A5 版本号123')).toBeNull();
    });
  });
});
