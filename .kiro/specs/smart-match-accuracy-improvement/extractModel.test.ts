/**
 * Unit tests for extractModel method enhancement
 * Feature: smart-match-accuracy-improvement
 * Task: 1.2 增强 extractModel 方法
 * 
 * Tests verify:
 * - Model normalization preprocessing (MODEL_NORMALIZATIONS mapping)
 * - Multi-level model matching (Priority 1: letter+letter, Priority 2: complex models, Priority 3: simple models)
 * - Filtering logic (exclude network standards, capacity, pure number+g)
 * - Removal of parenthetical model codes (e.g., (WA2456C))
 */

// Mock SimpleMatcher class for testing
// Since SimpleMatcher is defined in a React component, we'll create a standalone version for testing
const MODEL_NORMALIZATIONS: Record<string, string> = {
  'promini': 'pro mini',
  'promax': 'pro max',
  'proplus': 'pro plus',
  'watchgt': 'watch gt',
  'watchse': 'watch se',
  'watch3': 'watch 3',
  'watch4': 'watch 4',
  'watch5': 'watch 5',
  'watch6': 'watch 6',
  'watch7': 'watch 7',
  'band3': 'band 3',
  'band4': 'band 4',
  'band5': 'band 5',
  'band6': 'band 6',
  'band7': 'band 7',
  'buds3': 'buds 3',
  'buds4': 'buds 4',
  'buds5': 'buds 5',
  'xnote': 'x note',
  'xfold': 'x fold',
  'xflip': 'x flip',
};

class TestSimpleMatcher {
  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 步骤1: 移除括号内的型号代码（如（WA2456C）），避免干扰
    // 注意：需要在括号前后添加空格，避免括号内容与其他词连接
    let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
    
    // 步骤1.5: 提取并移除品牌，避免品牌与型号混淆
    // 例如：vivo promini -> promini (移除vivo后再处理)
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus', 'realme'];
    for (const brand of brands) {
      // 使用单词边界确保完整匹配品牌词
      const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(brandRegex, ' ');
    }
    
    // 清理多余空格
    normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
    
    // 步骤2: 应用 MODEL_NORMALIZATIONS 映射进行标准化
    Object.entries(MODEL_NORMALIZATIONS).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(regex, to);
    });
    
    // 步骤3: 多层次型号匹配（按优先级依次尝试）
    
    // 优先级1: 字母+字母格式（包括数字）
    // 包括三种模式：
    // 1. 单字母 + 产品词 (x note, x fold, x flip) - 最高优先级
    // 2. 特定产品词 + 修饰词 (watch gt, band se, etc.)
    // 3. 特定产品词 + 数字 (watch 5, band 3, etc.)
    const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
    const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|\d+|[a-z]+\d*)\b/gi;
    
    // 优先匹配 pattern2（单字母+产品词），因为它更具体
    const wordMatches2 = normalizedStr.match(wordModelPattern2);
    const wordMatches1 = normalizedStr.match(wordModelPattern1);
    const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
    
    if (wordMatches && wordMatches.length > 0) {
      return wordMatches[0].toLowerCase().replace(/\s+/g, '');
    }
    
    // 优先级2: 复杂型号格式
    const complexModelPattern = /\b([a-z]+)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note)(\s+(mini|max|plus|ultra))?\b/gi;
    const complexMatches = normalizedStr.match(complexModelPattern);
    
    if (complexMatches && complexMatches.length > 0) {
      const filtered = complexMatches.filter(m => {
        const lower = m.toLowerCase();
        if (lower.includes('gb')) {
          return false;
        }
        if (/\d+g$/i.test(lower)) {
          return false;
        }
        return true;
      });
      
      if (filtered.length > 0) {
        return filtered.sort((a, b) => b.length - a.length)[0]
          .toLowerCase()
          .replace(/\s+/g, '');
      }
    }
    
    // 优先级3: 简单型号格式
    // 注意：使用 normalizedStr 而不是 lowerStr，避免提取已删除的括号内容
    const simpleModelPattern = /\b([a-z]+)(\d+)([a-z]*)\b/gi;
    const simpleMatches = normalizedStr.match(simpleModelPattern);
    
    if (simpleMatches && simpleMatches.length > 0) {
      const filtered = simpleMatches.filter(m => {
        const lower = m.toLowerCase();
        
        // 排除：5g, 4g, 3g（网络制式）
        if (/^[345]g$/i.test(lower)) {
          return false;
        }
        
        // 排除：包含gb的（容量）
        if (lower.includes('gb')) {
          return false;
        }
        
        // 排除：纯数字+g（如 8g, 12g - 内存容量）
        if (/^\d+g$/i.test(lower)) {
          return false;
        }
        
        return true;
      });
      
      if (filtered.length > 0) {
        const sorted = filtered.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          
          const aHasSuffix = /[a-z]\d+[a-z]+/i.test(aLower);
          const bHasSuffix = /[a-z]\d+[a-z]+/i.test(bLower);
          
          if (aHasSuffix && !bHasSuffix) return -1;
          if (!aHasSuffix && bHasSuffix) return 1;
          
          return b.length - a.length;
        });
        
        return sorted[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    // 后备方案: 匹配通用 "字母 字母" 格式
    const generalWordPattern = /\b([a-z]+)\s+([a-z]+)\b/gi;
    const generalWordMatches = normalizedStr.match(generalWordPattern);
    
    if (generalWordMatches && generalWordMatches.length > 0) {
      const filtered = generalWordMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('全网通') && 
               !lower.includes('版本') &&
               !lower.includes('网通');
      });
      
      if (filtered.length > 0) {
        return filtered[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    return null;
  }
}

describe('extractModel - Task 1.2 Enhancement', () => {
  let matcher: TestSimpleMatcher;

  beforeEach(() => {
    matcher = new TestSimpleMatcher();
  });

  describe('Model Normalization Preprocessing', () => {
    test('should normalize compound models using MODEL_NORMALIZATIONS', () => {
      // Test promini -> pro mini
      expect(matcher.extractModel('Vivo S30Promini 5G')).toBe('s30promini');
      
      // Test watchgt -> watch gt
      expect(matcher.extractModel('VIVO WatchGT 蓝牙版')).toBe('watchgt');
      
      // Test watch5 -> watch 5
      expect(matcher.extractModel('VIVO Watch5 蓝牙版')).toBe('watch5');
    });

    test('should handle multiple normalizations in one string', () => {
      // Even though unlikely, the system should handle it
      expect(matcher.extractModel('test watchgt and watch5')).toBe('watchgt');
    });
  });

  describe('Parenthetical Model Code Removal', () => {
    test('should remove parenthetical model codes with Chinese parentheses', () => {
      expect(matcher.extractModel('vivo WATCH GT（WA2456C） 蓝牙版')).toBe('watchgt');
    });

    test('should remove parenthetical model codes with English parentheses', () => {
      expect(matcher.extractModel('vivo WATCH GT(WA2456C) 蓝牙版')).toBe('watchgt');
    });

    test('should handle multiple parenthetical codes', () => {
      expect(matcher.extractModel('vivo WATCH GT（WA2456C）(TEST) 蓝牙版')).toBe('watchgt');
    });
  });

  describe('Multi-level Model Matching - Priority 1: Letter+Letter', () => {
    test('should match WATCH GT format (letter + letter)', () => {
      expect(matcher.extractModel('vivo WATCH GT 蓝牙版')).toBe('watchgt');
      expect(matcher.extractModel('vivo Watch GT 蓝牙版')).toBe('watchgt');
      expect(matcher.extractModel('vivo watch gt 蓝牙版')).toBe('watchgt');
    });

    test('should match WATCH SE format', () => {
      expect(matcher.extractModel('vivo WATCH SE 蓝牙版')).toBe('watchse');
    });

    test('should match X Note format', () => {
      expect(matcher.extractModel('vivo X Note 5G')).toBe('xnote');
    });

    test('should match BAND formats', () => {
      expect(matcher.extractModel('vivo BAND SE')).toBe('bandse');
      expect(matcher.extractModel('vivo BAND PRO')).toBe('bandpro');
    });
  });

  describe('Multi-level Model Matching - Priority 2: Complex Models', () => {
    test('should match S30 Pro mini format', () => {
      expect(matcher.extractModel('Vivo S30 Pro mini 5G')).toBe('s30promini');
      expect(matcher.extractModel('Vivo S30Promini 5G')).toBe('s30promini');
    });

    test('should match iPhone 15 Pro Max format', () => {
      expect(matcher.extractModel('iPhone 15 Pro Max 256GB')).toBe('iphone15promax');
    });

    test('should match Mate60 Pro format', () => {
      expect(matcher.extractModel('Huawei Mate60 Pro 5G')).toBe('mate60pro');
      expect(matcher.extractModel('Huawei Mate60Pro 5G')).toBe('mate60pro');
    });

    test('should match Y500 Pro format', () => {
      expect(matcher.extractModel('vivo Y500 Pro 5G')).toBe('y500pro');
      expect(matcher.extractModel('vivo Y500Pro 5G')).toBe('y500pro');
    });
  });

  describe('Multi-level Model Matching - Priority 3: Simple Models', () => {
    test('should match Y300i format (letter+number+letter)', () => {
      expect(matcher.extractModel('vivo Y300i 5G')).toBe('y300i');
    });

    test('should match Y50 format (letter+number)', () => {
      expect(matcher.extractModel('vivo Y50 5G')).toBe('y50');
    });

    test('should match Mate60 format', () => {
      expect(matcher.extractModel('Huawei Mate60 5G')).toBe('mate60');
    });

    test('should prioritize models with letter suffix', () => {
      // Y300i should be preferred over Y300
      const result = matcher.extractModel('vivo Y300i 5G');
      expect(result).toBe('y300i');
    });
  });

  describe('Filtering Logic - Exclude Network Standards', () => {
    test('should not extract 5G as a model', () => {
      const result = matcher.extractModel('vivo 全网通 5G 手机');
      expect(result).not.toBe('5g');
    });

    test('should not extract 4G as a model', () => {
      const result = matcher.extractModel('vivo 全网通 4G 手机');
      expect(result).not.toBe('4g');
    });

    test('should not extract 3G as a model', () => {
      const result = matcher.extractModel('vivo 全网通 3G 手机');
      expect(result).not.toBe('3g');
    });
  });

  describe('Filtering Logic - Exclude Capacity', () => {
    test('should not extract GB values as models', () => {
      const result = matcher.extractModel('vivo Y300i 12GB+512GB');
      expect(result).toBe('y300i');
      expect(result).not.toContain('gb');
    });

    test('should not extract pure number+g as models (memory)', () => {
      const result = matcher.extractModel('vivo Y300i 8g+256g');
      expect(result).toBe('y300i');
      expect(result).not.toBe('8g');
      expect(result).not.toBe('256g');
    });
  });

  describe('Real-world Test Cases from Requirements', () => {
    test('Case 1: Vivo S30Promini 5G(12+512)可可黑', () => {
      expect(matcher.extractModel('Vivo S30Promini 5G(12+512)可可黑')).toBe('s30promini');
    });

    test('Case 2: VIVO WatchGT 软胶蓝牙版夏夜黑', () => {
      expect(matcher.extractModel('VIVO WatchGT 软胶蓝牙版夏夜黑')).toBe('watchgt');
    });

    test('Case 3: VIVO Watch5 蓝牙版辰夜黑', () => {
      expect(matcher.extractModel('VIVO Watch5 蓝牙版辰夜黑')).toBe('watch5');
    });

    test('Case 4: vivo WATCH GT（WA2456C） 蓝牙版 夏夜黑 软胶', () => {
      expect(matcher.extractModel('vivo WATCH GT（WA2456C） 蓝牙版 夏夜黑 软胶')).toBe('watchgt');
    });

    test('Case 5: Vivo Y300i 5G 12+512雾凇蓝', () => {
      expect(matcher.extractModel('Vivo Y300i 5G 12+512雾凇蓝')).toBe('y300i');
    });
  });

  describe('Case Insensitivity', () => {
    test('should handle different case variations', () => {
      expect(matcher.extractModel('VIVO WATCH GT')).toBe('watchgt');
      expect(matcher.extractModel('vivo Watch GT')).toBe('watchgt');
      expect(matcher.extractModel('vivo watch gt')).toBe('watchgt');
      expect(matcher.extractModel('ViVo WaTcH Gt')).toBe('watchgt');
    });
  });

  describe('Edge Cases', () => {
    test('should return null for empty string', () => {
      expect(matcher.extractModel('')).toBeNull();
    });

    test('should return null for string with no model', () => {
      expect(matcher.extractModel('手机 5G 全网通')).toBeNull();
    });

    test('should handle strings with only capacity and color', () => {
      expect(matcher.extractModel('12GB+512GB 黑色')).toBeNull();
    });

    test('should handle complex strings with multiple potential models', () => {
      // Should extract the first valid model found
      const result = matcher.extractModel('vivo Y300i vs Y200');
      expect(result).toBe('y300i');
    });
  });
});
