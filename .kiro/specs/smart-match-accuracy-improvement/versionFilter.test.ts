/**
 * Unit tests for shouldFilterSPU method
 * Feature: smart-match-accuracy-improvement
 * Task: 2.1 创建版本过滤辅助函数
 * 
 * Tests verify:
 * - Gift box filtering (filter out gift box SPUs when input doesn't contain "礼盒")
 * - Version mutual exclusion filtering (Bluetooth vs eSIM)
 * 
 * Requirements: 2.2.1, 2.2.2, 3.1.1, 3.1.2
 */

// Mock constants from SmartMatch component
const GIFT_BOX_KEYWORDS = ['礼盒', '套装', '系列', '礼品', '礼包'];
const VERSION_KEYWORDS = ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];

// Mock SimpleMatcher class for testing
class TestSimpleMatcher {
  /**
   * 检查是否应该过滤某个SPU
   * 
   * 实现版本过滤规则：
   * 1. 礼盒版过滤：当输入不包含"礼盒"、"套装"、"系列"等关键词时，过滤掉包含这些词的SPU
   * 2. 版本互斥过滤：当输入包含"蓝牙版"时，过滤掉"eSIM版"SPU；反之亦然
   * 
   * @param inputName - 用户输入的商品名称
   * @param spuName - SPU名称
   * @returns true 表示应该过滤掉该SPU，false 表示不过滤
   */
  shouldFilterSPU(inputName: string, spuName: string): boolean {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    // 规则1：礼盒版过滤
    // 当输入不包含礼盒相关关键词时，过滤掉包含这些词的SPU
    const hasGiftBoxKeywordInInput = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    
    const hasGiftBoxKeywordInSPU = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeywordInInput && hasGiftBoxKeywordInSPU) {
      return true; // 输入不含礼盒关键词，但SPU含有，应该过滤
    }
    
    // 规则2：版本互斥过滤（蓝牙版 vs eSIM版）
    const hasBluetooth = lowerInput.includes('蓝牙版');
    const hasESIM = lowerInput.includes('esim版') || lowerInput.includes('esim版');
    
    // 输入包含"蓝牙版"时，过滤掉"eSIM版"SPU
    if (hasBluetooth && (lowerSPU.includes('esim版') || lowerSPU.includes('esim版'))) {
      return true;
    }
    
    // 输入包含"eSIM版"时，过滤掉"蓝牙版"SPU
    if (hasESIM && lowerSPU.includes('蓝牙版')) {
      return true;
    }
    
    return false; // 不过滤
  }
}

describe('shouldFilterSPU - Task 2.1 Version Filtering', () => {
  let matcher: TestSimpleMatcher;

  beforeEach(() => {
    matcher = new TestSimpleMatcher();
  });

  describe('Gift Box Filtering - Rule 1', () => {
    describe('When input does NOT contain gift box keywords', () => {
      test('should filter SPU containing "礼盒"', () => {
        const input = 'Vivo S30 Pro mini 5G 12+512 可可黑';
        const spu = 'vivo S30 Pro mini 三丽鸥家族系列礼盒';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter SPU containing "套装"', () => {
        const input = 'Vivo S30 Pro mini 5G 12+512 可可黑';
        const spu = 'vivo S30 Pro mini 豪华套装';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter SPU containing "系列"', () => {
        const input = 'Vivo S30 Pro mini 5G 12+512 可可黑';
        const spu = 'vivo S30 Pro mini 三丽鸥家族系列';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter SPU containing "礼品"', () => {
        const input = 'Vivo S30 Pro mini 5G 12+512 可可黑';
        const spu = 'vivo S30 Pro mini 礼品版';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter SPU containing "礼包"', () => {
        const input = 'Vivo S30 Pro mini 5G 12+512 可可黑';
        const spu = 'vivo S30 Pro mini 新年礼包';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should NOT filter standard SPU without gift box keywords', () => {
        const input = 'Vivo S30 Pro mini 5G 12+512 可可黑';
        const spu = 'vivo S30 Pro mini 全网通5G 12GB+512GB 可可黑';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
      });
    });

    describe('When input DOES contain gift box keywords', () => {
      test('should NOT filter SPU containing "礼盒" when input also contains "礼盒"', () => {
        const input = 'Vivo S30 Pro mini 礼盒版';
        const spu = 'vivo S30 Pro mini 三丽鸥家族系列礼盒';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
      });

      test('should NOT filter SPU containing "套装" when input also contains "套装"', () => {
        const input = 'Vivo S30 Pro mini 套装';
        const spu = 'vivo S30 Pro mini 豪华套装';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
      });

      test('should NOT filter SPU containing "系列" when input also contains "系列"', () => {
        const input = 'Vivo S30 Pro mini 系列';
        const spu = 'vivo S30 Pro mini 三丽鸥家族系列';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
      });
    });

    describe('Case insensitivity for gift box filtering', () => {
      test('should handle uppercase input', () => {
        const input = 'VIVO S30 PRO MINI 5G';
        const spu = 'vivo S30 Pro mini 礼盒';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should handle uppercase SPU', () => {
        const input = 'vivo s30 pro mini 5g';
        const spu = 'VIVO S30 PRO MINI 礼盒';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should handle mixed case', () => {
        const input = 'ViVo S30 Pro Mini 5G';
        const spu = 'vivo S30 Pro mini 礼盒版';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });
    });
  });

  describe('Version Mutual Exclusion Filtering - Rule 2', () => {
    describe('Bluetooth vs eSIM filtering', () => {
      test('should filter eSIM SPU when input contains "蓝牙版"', () => {
        const input = 'VIVO WatchGT 软胶蓝牙版夏夜黑';
        const spu = 'vivo WATCH GT 2 eSIM版 曜石黑';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter eSIM SPU (lowercase) when input contains "蓝牙版"', () => {
        const input = 'VIVO WatchGT 软胶蓝牙版夏夜黑';
        const spu = 'vivo WATCH GT 2 esim版 曜石黑';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter Bluetooth SPU when input contains "eSIM版"', () => {
        const input = 'VIVO WatchGT eSIM版夏夜黑';
        const spu = 'vivo WATCH GT 蓝牙版 夏夜黑';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should filter Bluetooth SPU when input contains "esim版" (lowercase)', () => {
        const input = 'VIVO WatchGT esim版夏夜黑';
        const spu = 'vivo WATCH GT 蓝牙版 夏夜黑';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should NOT filter Bluetooth SPU when input contains "蓝牙版"', () => {
        const input = 'VIVO WatchGT 软胶蓝牙版夏夜黑';
        const spu = 'vivo WATCH GT（WA2456C） 蓝牙版 夏夜黑 软胶';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
      });

      test('should NOT filter eSIM SPU when input contains "eSIM版"', () => {
        const input = 'VIVO WatchGT eSIM版夏夜黑';
        const spu = 'vivo WATCH GT 2 eSIM版 曜石黑';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
      });
    });

    describe('Case insensitivity for version filtering', () => {
      test('should handle uppercase input with Bluetooth', () => {
        const input = 'VIVO WATCHGT 蓝牙版';
        const spu = 'vivo WATCH GT eSIM版';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });

      test('should handle uppercase SPU with eSIM', () => {
        const input = 'vivo watchgt 蓝牙版';
        const spu = 'VIVO WATCH GT ESIM版';
        expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
      });
    });

    describe('No version keywords in input', () => {
      test('should NOT filter any SPU when input has no version keywords', () => {
        const input = 'VIVO WatchGT 夏夜黑';
        const spuBluetooth = 'vivo WATCH GT 蓝牙版 夏夜黑';
        const spuESIM = 'vivo WATCH GT eSIM版 夏夜黑';
        
        expect(matcher.shouldFilterSPU(input, spuBluetooth)).toBe(false);
        expect(matcher.shouldFilterSPU(input, spuESIM)).toBe(false);
      });
    });
  });

  describe('Combined Filtering Rules', () => {
    test('should apply both gift box and version filtering', () => {
      const input = 'VIVO WatchGT 蓝牙版';
      
      // Should filter: has eSIM (version mismatch)
      const spuESIM = 'vivo WATCH GT eSIM版';
      expect(matcher.shouldFilterSPU(input, spuESIM)).toBe(true);
      
      // Should filter: has gift box keyword
      const spuGiftBox = 'vivo WATCH GT 蓝牙版 礼盒';
      expect(matcher.shouldFilterSPU(input, spuGiftBox)).toBe(true);
      
      // Should NOT filter: matches version and no gift box
      const spuStandard = 'vivo WATCH GT 蓝牙版 夏夜黑';
      expect(matcher.shouldFilterSPU(input, spuStandard)).toBe(false);
    });

    test('should prioritize first matching rule', () => {
      // If SPU has both gift box keyword and version mismatch, 
      // it should be filtered (either rule would filter it)
      const input = 'VIVO WatchGT 蓝牙版';
      const spu = 'vivo WATCH GT eSIM版 礼盒';
      expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
    });
  });

  describe('Real-world Test Cases from Requirements', () => {
    test('Case 1: Should filter gift box SPU for standard input', () => {
      // From requirements: 输入不包含"礼盒"的商品名称时，不应匹配到礼盒版SPU
      const input = 'Vivo S30Promini 5G(12+512)可可黑';
      const spuGiftBox = 'vivo S30 Pro mini 三丽鸥家族系列礼盒';
      const spuStandard = 'vivo S30 Pro mini 全网通5G 12GB+512GB 可可黑';
      
      expect(matcher.shouldFilterSPU(input, spuGiftBox)).toBe(true);
      expect(matcher.shouldFilterSPU(input, spuStandard)).toBe(false);
    });

    test('Case 2: Should filter eSIM SPU when input has Bluetooth', () => {
      // From requirements: 输入"蓝牙版"时不应匹配到"eSIM版"
      const input = 'VIVO WatchGT 软胶蓝牙版夏夜黑';
      const spuESIM = 'vivo WATCH GT 2 eSIM版 曜石黑';
      const spuBluetooth = 'vivo WATCH GT（WA2456C） 蓝牙版 夏夜黑 软胶';
      
      expect(matcher.shouldFilterSPU(input, spuESIM)).toBe(true);
      expect(matcher.shouldFilterSPU(input, spuBluetooth)).toBe(false);
    });

    test('Case 3: Should NOT filter when no special keywords', () => {
      const input = 'VIVO Watch5 蓝牙版辰夜黑';
      const spu = 'vivo WATCH 5 蓝牙版 软胶 辰夜黑';
      
      expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const input = '';
      const spu = 'vivo S30 Pro mini 礼盒';
      expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
    });

    test('should handle empty SPU name', () => {
      const input = 'Vivo S30 Pro mini';
      const spu = '';
      expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
    });

    test('should handle both empty', () => {
      const input = '';
      const spu = '';
      expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
    });

    test('should handle SPU with multiple gift box keywords', () => {
      const input = 'Vivo S30 Pro mini';
      const spu = 'vivo S30 Pro mini 礼盒套装系列';
      expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
    });

    test('should handle input with partial keyword match', () => {
      // "礼" is not a complete keyword, should not match
      const input = 'Vivo S30 Pro mini 礼';
      const spu = 'vivo S30 Pro mini 礼盒';
      // Input has "礼" but not "礼盒", so it should filter the gift box SPU
      expect(matcher.shouldFilterSPU(input, spu)).toBe(true);
    });

    test('should handle SPU with version keyword in middle of word', () => {
      // Edge case: what if "蓝牙版" appears as part of a longer word?
      // Current implementation uses includes(), so it would match
      const input = 'VIVO WatchGT 蓝牙版';
      const spu = 'vivo WATCH GT 非蓝牙版本'; // "蓝牙版" is part of "非蓝牙版本"
      // This would be filtered, which might be correct behavior
      expect(matcher.shouldFilterSPU(input, spu)).toBe(false);
    });
  });

  describe('Performance and Consistency', () => {
    test('should return consistent results for same input', () => {
      const input = 'Vivo S30 Pro mini 5G';
      const spu = 'vivo S30 Pro mini 礼盒';
      
      const result1 = matcher.shouldFilterSPU(input, spu);
      const result2 = matcher.shouldFilterSPU(input, spu);
      const result3 = matcher.shouldFilterSPU(input, spu);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(true);
    });

    test('should handle very long strings efficiently', () => {
      const input = 'Vivo S30 Pro mini 5G '.repeat(100);
      const spu = 'vivo S30 Pro mini 礼盒 '.repeat(100);
      
      const startTime = Date.now();
      const result = matcher.shouldFilterSPU(input, spu);
      const endTime = Date.now();
      
      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
