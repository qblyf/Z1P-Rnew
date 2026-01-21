/**
 * Space Handler Tests
 * 空格处理器测试
 */

import { spaceHandler } from './spaceHandler';

describe('SpaceHandler', () => {
  describe('normalizeSpaces', () => {
    // 测试品牌后添加空格
    it('should add space after IQOO brand', () => {
      expect(spaceHandler.normalizeSpaces('IQOOZ10')).toBe('IQOO Z10');
      expect(spaceHandler.normalizeSpaces('iqooz10')).toBe('iqoo z10');
    });

    it('should add space after OPPO brand', () => {
      expect(spaceHandler.normalizeSpaces('OPPOA5')).toBe('OPPO A5');
      expect(spaceHandler.normalizeSpaces('oppoa5')).toBe('oppo a5');
    });

    it('should add space after VIVO brand', () => {
      expect(spaceHandler.normalizeSpaces('VIVOS30')).toBe('VIVO S30');
      expect(spaceHandler.normalizeSpaces('vivos30')).toBe('vivo s30');
    });

    it('should add space after Hi brand', () => {
      expect(spaceHandler.normalizeSpaces('HiNova14')).toBe('Hi Nova14');
      expect(spaceHandler.normalizeSpaces('hinova14')).toBe('hi nova14');
    });

    // 测试型号后缀前添加空格
    it('should add space before Pro suffix', () => {
      expect(spaceHandler.normalizeSpaces('X200Pro')).toBe('X200 Pro');
      expect(spaceHandler.normalizeSpaces('A5pro')).toBe('A5 Pro');
    });

    it('should add space before Max suffix', () => {
      expect(spaceHandler.normalizeSpaces('iPhone16Max')).toBe('iPhone16 Max');
      expect(spaceHandler.normalizeSpaces('S30max')).toBe('S30 Max');
    });

    it('should add space before Mini suffix', () => {
      expect(spaceHandler.normalizeSpaces('X200ProMini')).toBe('X200 Pro Mini');
      expect(spaceHandler.normalizeSpaces('ipadmini')).toBe('ipad Mini');
    });

    it('should add space before Plus suffix', () => {
      expect(spaceHandler.normalizeSpaces('iPhone16Plus')).toBe('iPhone16 Plus');
      expect(spaceHandler.normalizeSpaces('A5plus')).toBe('A5 Plus');
    });

    it('should add space before Ultra suffix', () => {
      expect(spaceHandler.normalizeSpaces('S24Ultra')).toBe('S24 Ultra');
      expect(spaceHandler.normalizeSpaces('galaxyultra')).toBe('galaxy Ultra');
    });

    it('should add space before SE suffix', () => {
      expect(spaceHandler.normalizeSpaces('iPhoneSE')).toBe('iPhone SE');
      expect(spaceHandler.normalizeSpaces('A5se')).toBe('A5 SE');
    });

    it('should add space before Air suffix', () => {
      expect(spaceHandler.normalizeSpaces('MacBookAir')).toBe('MacBook Air');
      expect(spaceHandler.normalizeSpaces('iPadair')).toBe('iPad Air');
    });

    it('should add space before Turbo suffix', () => {
      expect(spaceHandler.normalizeSpaces('Z10Turbo')).toBe('Z10 Turbo');
      // Ace5turbo is processed by Ace series handler first, so it becomes 'Ace 5 Turbo'
      expect(spaceHandler.normalizeSpaces('Ace5turbo')).toBe('Ace 5 Turbo');
    });

    it('should handle Turbo+ correctly', () => {
      expect(spaceHandler.normalizeSpaces('Z10Turbo+')).toBe('Z10 Turbo+');
    });

    // 测试中文版本后缀
    it('should add space before Chinese version suffixes', () => {
      expect(spaceHandler.normalizeSpaces('A5活力版')).toBe('A5 活力版');
      expect(spaceHandler.normalizeSpaces('Nova14竞速版')).toBe('Nova14 竞速版');
      expect(spaceHandler.normalizeSpaces('Mate70至尊版')).toBe('Mate70 至尊版');
    });

    // 测试特殊情况：Ace系列
    it('should handle Ace series correctly', () => {
      expect(spaceHandler.normalizeSpaces('ACE5')).toBe('Ace 5');
      expect(spaceHandler.normalizeSpaces('ace5')).toBe('Ace 5');
      expect(spaceHandler.normalizeSpaces('Ace5Pro')).toBe('Ace 5 Pro');
    });

    // 测试特殊情况：MateBook系列
    it('should handle MateBook series correctly', () => {
      // The implementation preserves the original case of the letter
      expect(spaceHandler.normalizeSpaces('MateBookD16')).toBe('MateBook D 16');
      expect(spaceHandler.normalizeSpaces('matebookd16')).toBe('matebook d 16');
      expect(spaceHandler.normalizeSpaces('MateBook16S')).toBe('MateBook 16 S');
      expect(spaceHandler.normalizeSpaces('MateBookE')).toBe('MateBook E');
    });

    // 测试大小写标准化
    it('should normalize case for suffixes', () => {
      expect(spaceHandler.normalizeSpaces('A5x')).toBe('A5X');
      expect(spaceHandler.normalizeSpaces('S30pro')).toBe('S30 Pro');
      expect(spaceHandler.normalizeSpaces('iPhone16max')).toBe('iPhone16 Max');
    });

    // 测试数字和中文之间添加空格
    it('should add space between numbers and Chinese characters', () => {
      expect(spaceHandler.normalizeSpaces('16英寸')).toBe('16 英寸');
      // GB is letters, not numbers, so no space is added before 版
      // This is handled by the version suffix logic instead
      expect(spaceHandler.normalizeSpaces('256GB版')).toBe('256GB 版');
    });

    // 测试全角/半角字符标准化
    it('should normalize full-width characters', () => {
      expect(spaceHandler.normalizeSpaces('iPhone１６＋')).toBe('iPhone１６+');
      expect(spaceHandler.normalizeSpaces('（256GB）')).toBe('(256GB)');
    });

    // 测试清理多余空格
    it('should clean up extra spaces', () => {
      expect(spaceHandler.normalizeSpaces('iPhone  16   Pro')).toBe('iPhone 16 Pro');
      expect(spaceHandler.normalizeSpaces('  OPPO  A5  ')).toBe('OPPO A5');
    });

    // 测试空输入
    it('should handle empty input', () => {
      expect(spaceHandler.normalizeSpaces('')).toBe('');
      expect(spaceHandler.normalizeSpaces('   ')).toBe('');
    });

    // 测试幂等性（多次调用应该产生相同结果）
    it('should be idempotent', () => {
      const input = 'IQOOZ10Turbo+';
      const normalized1 = spaceHandler.normalizeSpaces(input);
      const normalized2 = spaceHandler.normalizeSpaces(normalized1);
      const normalized3 = spaceHandler.normalizeSpaces(normalized2);
      
      expect(normalized1).toBe('IQOO Z10 Turbo+');
      expect(normalized2).toBe(normalized1);
      expect(normalized3).toBe(normalized1);
    });

    // 测试复杂案例
    it('should handle complex cases', () => {
      expect(spaceHandler.normalizeSpaces('Vivo S30Promini')).toBe('Vivo S30 Pro Mini');
      expect(spaceHandler.normalizeSpaces('OPPOA5X活力版')).toBe('OPPO A5X 活力版');
      expect(spaceHandler.normalizeSpaces('iqooz10turbo+')).toBe('iqoo z10 Turbo+');
    });
  });
});
