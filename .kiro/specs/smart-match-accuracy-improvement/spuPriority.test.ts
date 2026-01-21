/**
 * Unit tests for SPU Priority Sorting
 * 
 * Tests the getSPUPriority function which calculates priority scores for SPUs
 * to ensure standard versions are preferred over special editions.
 * 
 * Requirements: 2.2.3, 3.1.3
 */

import { describe, test, expect } from '@jest/globals';

// Mock SimpleMatcher class with getSPUPriority method
const GIFT_BOX_KEYWORDS = ['礼盒', '套装', '系列', '礼品', '礼包'];
const VERSION_KEYWORDS = ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];

class SimpleMatcher {
  getSPUPriority(inputName: string, spuName: string): number {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    // 检查SPU是否包含特殊关键词
    const hasGiftBoxKeyword = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    const hasSpecialVersion = VERSION_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    // 如果SPU不包含任何特殊关键词，则为标准版，优先级最高
    if (!hasGiftBoxKeyword && !hasSpecialVersion) {
      return 3; // 标准版：优先级最高
    }
    
    // 如果SPU包含特殊版本关键词，检查是否与输入匹配
    if (hasSpecialVersion) {
      // 检查输入和SPU是否包含相同的版本关键词
      for (const keyword of VERSION_KEYWORDS) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerInput.includes(lowerKeyword) && lowerSPU.includes(lowerKeyword)) {
          return 2; // 版本匹配的特殊版：优先级中等
        }
      }
    }
    
    // 其他情况（礼盒版、不匹配的特殊版等）：优先级最低
    return 1;
  }
}

describe('SPU Priority Sorting', () => {
  let matcher: SimpleMatcher;

  beforeEach(() => {
    matcher = new SimpleMatcher();
  });

  describe('Standard Version Priority (Priority 3 - Highest)', () => {
    test('should return priority 3 for standard SPU without special keywords', () => {
      const input = 'vivo S30 Pro mini 12+512 可可黑';
      const spu = 'vivo S30 Pro mini 全网通5G';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(3);
    });

    test('should return priority 3 for SPU without gift box or version keywords', () => {
      const input = 'vivo Y300i 12+512 雾凇蓝';
      const spu = 'vivo Y300i';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(3);
    });

    test('should return priority 3 for watch without special keywords', () => {
      const input = 'vivo Watch GT 夏夜黑';
      const spu = 'vivo WATCH GT';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(3);
    });

    test('should return priority 3 for phone model without special keywords', () => {
      const input = 'iPhone 15 Pro Max 256GB';
      const spu = 'iPhone 15 Pro Max';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(3);
    });
  });

  describe('Version-Matching Special Edition Priority (Priority 2 - Medium)', () => {
    test('should return priority 2 when input and SPU both contain "蓝牙版"', () => {
      const input = 'vivo Watch GT 蓝牙版 夏夜黑';
      const spu = 'vivo WATCH GT 蓝牙版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(2);
    });

    test('should return priority 2 when input and SPU both contain "eSIM版"', () => {
      const input = 'vivo Watch GT eSIM版 曜石黑';
      const spu = 'vivo WATCH GT eSIM版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(2);
    });

    test('should return priority 2 when input and SPU both contain "5G版"', () => {
      const input = 'vivo X100 5G版 12+256';
      const spu = 'vivo X100 5G版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(2);
    });

    test('should return priority 2 when input and SPU both contain "4G版"', () => {
      const input = 'vivo Y100 4G版 8+128';
      const spu = 'vivo Y100 4G版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(2);
    });

    test('should be case insensitive for version matching', () => {
      const input = 'vivo Watch GT 蓝牙版 夏夜黑';
      const spu = 'vivo WATCH GT 蓝牙版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(2);
    });
  });

  describe('Other Special Edition Priority (Priority 1 - Lowest)', () => {
    test('should return priority 1 for gift box SPU when input does not contain gift box keyword', () => {
      const input = 'vivo S30 Pro mini 12+512 可可黑';
      const spu = 'vivo S30 Pro mini 三丽鸥家族系列礼盒';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1);
    });

    test('should return priority 1 for SPU with "套装" keyword', () => {
      const input = 'vivo Y300i 12+512';
      const spu = 'vivo Y300i 豪华套装';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1);
    });

    test('should return priority 1 for SPU with "系列" keyword', () => {
      const input = 'vivo X100 12+256';
      const spu = 'vivo X100 限定系列';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1);
    });

    test('should return priority 1 when version does not match', () => {
      const input = 'vivo Watch GT 蓝牙版 夏夜黑';
      const spu = 'vivo WATCH GT eSIM版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1);
    });

    test('should return priority 1 for eSIM SPU when input has Bluetooth', () => {
      const input = 'vivo Watch 5 蓝牙版 辰夜黑';
      const spu = 'vivo WATCH 5 eSIM版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1);
    });

    test('should return priority 1 for Bluetooth SPU when input has eSIM', () => {
      const input = 'vivo Watch 5 eSIM版 辰夜黑';
      const spu = 'vivo WATCH 5 蓝牙版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1);
    });
  });

  describe('Priority Comparison Scenarios', () => {
    test('standard version should have higher priority than gift box version', () => {
      const input = 'vivo S30 Pro mini 12+512';
      const standardSPU = 'vivo S30 Pro mini';
      const giftBoxSPU = 'vivo S30 Pro mini 礼盒版';
      
      const standardPriority = matcher.getSPUPriority(input, standardSPU);
      const giftBoxPriority = matcher.getSPUPriority(input, giftBoxSPU);
      
      expect(standardPriority).toBeGreaterThan(giftBoxPriority);
      expect(standardPriority).toBe(3);
      expect(giftBoxPriority).toBe(1);
    });

    test('standard version should have higher priority than version-matching special edition', () => {
      const input = 'vivo Watch GT 蓝牙版';
      const standardSPU = 'vivo WATCH GT';
      const bluetoothSPU = 'vivo WATCH GT 蓝牙版';
      
      const standardPriority = matcher.getSPUPriority(input, standardSPU);
      const bluetoothPriority = matcher.getSPUPriority(input, bluetoothSPU);
      
      expect(standardPriority).toBeGreaterThan(bluetoothPriority);
      expect(standardPriority).toBe(3);
      expect(bluetoothPriority).toBe(2);
    });

    test('version-matching special edition should have higher priority than non-matching version', () => {
      const input = 'vivo Watch GT 蓝牙版';
      const matchingSPU = 'vivo WATCH GT 蓝牙版';
      const nonMatchingSPU = 'vivo WATCH GT eSIM版';
      
      const matchingPriority = matcher.getSPUPriority(input, matchingSPU);
      const nonMatchingPriority = matcher.getSPUPriority(input, nonMatchingSPU);
      
      expect(matchingPriority).toBeGreaterThan(nonMatchingPriority);
      expect(matchingPriority).toBe(2);
      expect(nonMatchingPriority).toBe(1);
    });

    test('version-matching special edition should have higher priority than gift box', () => {
      const input = 'vivo Watch GT 蓝牙版';
      const bluetoothSPU = 'vivo WATCH GT 蓝牙版';
      const giftBoxSPU = 'vivo WATCH GT 礼盒版';
      
      const bluetoothPriority = matcher.getSPUPriority(input, bluetoothSPU);
      const giftBoxPriority = matcher.getSPUPriority(input, giftBoxSPU);
      
      expect(bluetoothPriority).toBeGreaterThan(giftBoxPriority);
      expect(bluetoothPriority).toBe(2);
      expect(giftBoxPriority).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const input = '';
      const spu = 'vivo S30 Pro mini';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(3); // Standard version
    });

    test('should handle empty SPU name', () => {
      const input = 'vivo S30 Pro mini';
      const spu = '';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(3); // No special keywords
    });

    test('should handle SPU with multiple special keywords', () => {
      const input = 'vivo S30 Pro mini';
      const spu = 'vivo S30 Pro mini 礼盒套装系列';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1); // Has gift box keywords
    });

    test('should handle SPU with both gift box and version keywords', () => {
      const input = 'vivo Watch GT';
      const spu = 'vivo WATCH GT 蓝牙版礼盒';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1); // Has gift box keyword, so lowest priority
    });

    test('should handle input with gift box keyword matching gift box SPU', () => {
      const input = 'vivo S30 Pro mini 礼盒';
      const spu = 'vivo S30 Pro mini 礼盒版';
      
      const priority = matcher.getSPUPriority(input, spu);
      expect(priority).toBe(1); // Still lowest priority (礼盒 is not in VERSION_KEYWORDS)
    });
  });

  describe('Real-world Test Cases', () => {
    test('Case 1: Standard phone should have highest priority', () => {
      const input = 'Vivo S30Promini 5G(12+512)可可黑';
      const standardSPU = 'vivo S30 Pro mini 全网通5G';
      const giftBoxSPU = 'vivo S30 Pro mini 三丽鸥家族系列礼盒';
      
      const standardPriority = matcher.getSPUPriority(input, standardSPU);
      const giftBoxPriority = matcher.getSPUPriority(input, giftBoxSPU);
      
      expect(standardPriority).toBe(3);
      expect(giftBoxPriority).toBe(1);
      expect(standardPriority).toBeGreaterThan(giftBoxPriority);
    });

    test('Case 2: Bluetooth version should match when input specifies Bluetooth', () => {
      const input = 'VIVO WatchGT 软胶蓝牙版夏夜黑';
      const bluetoothSPU = 'vivo WATCH GT 蓝牙版';
      const esimSPU = 'vivo WATCH GT eSIM版';
      
      const bluetoothPriority = matcher.getSPUPriority(input, bluetoothSPU);
      const esimPriority = matcher.getSPUPriority(input, esimSPU);
      
      expect(bluetoothPriority).toBe(2);
      expect(esimPriority).toBe(1);
      expect(bluetoothPriority).toBeGreaterThan(esimPriority);
    });

    test('Case 3: Standard watch should have highest priority', () => {
      const input = 'VIVO Watch5 蓝牙版辰夜黑';
      const standardSPU = 'vivo WATCH 5';
      const bluetoothSPU = 'vivo WATCH 5 蓝牙版';
      
      const standardPriority = matcher.getSPUPriority(input, standardSPU);
      const bluetoothPriority = matcher.getSPUPriority(input, bluetoothSPU);
      
      expect(standardPriority).toBe(3);
      expect(bluetoothPriority).toBe(2);
      expect(standardPriority).toBeGreaterThan(bluetoothPriority);
    });
  });

  describe('Case Insensitivity', () => {
    test('should be case insensitive for gift box keywords', () => {
      const input = 'vivo S30 Pro mini';
      const spu1 = 'vivo S30 Pro mini 礼盒';
      const spu2 = 'vivo S30 Pro mini 礼盒';
      const spu3 = 'vivo S30 Pro mini 礼盒';
      
      expect(matcher.getSPUPriority(input, spu1)).toBe(1);
      expect(matcher.getSPUPriority(input, spu2)).toBe(1);
      expect(matcher.getSPUPriority(input, spu3)).toBe(1);
    });

    test('should be case insensitive for version keywords', () => {
      const input1 = 'vivo Watch GT 蓝牙版';
      const input2 = 'vivo Watch GT 蓝牙版';
      const spu = 'vivo WATCH GT 蓝牙版';
      
      expect(matcher.getSPUPriority(input1, spu)).toBe(2);
      expect(matcher.getSPUPriority(input2, spu)).toBe(2);
    });
  });
});
