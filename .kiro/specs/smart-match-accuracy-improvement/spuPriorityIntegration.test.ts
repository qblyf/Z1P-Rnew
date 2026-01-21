/**
 * Integration tests for SPU Priority Sorting in the matching flow
 * 
 * Tests that the priority sorting correctly influences SPU selection
 * when multiple SPUs have the same similarity score.
 * 
 * Requirements: 2.2.3, 3.1.3
 */

import { describe, test, expect } from '@jest/globals';

// Mock the complete matching flow with priority sorting
const GIFT_BOX_KEYWORDS = ['礼盒', '套装', '系列', '礼品', '礼包'];
const VERSION_KEYWORDS = ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];

interface SPUData {
  id: number;
  name: string;
  brand?: string;
}

class SimpleMatcher {
  shouldFilterSPU(inputName: string, spuName: string): boolean {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    const hasGiftBoxKeywordInInput = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    
    const hasGiftBoxKeywordInSPU = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeywordInInput && hasGiftBoxKeywordInSPU) {
      return true;
    }
    
    const hasBluetooth = lowerInput.includes('蓝牙版');
    const hasESIM = lowerInput.includes('esim版') || lowerInput.includes('esim版');
    
    if (hasBluetooth && (lowerSPU.includes('esim版') || lowerSPU.includes('esim版'))) {
      return true;
    }
    
    if (hasESIM && lowerSPU.includes('蓝牙版')) {
      return true;
    }
    
    return false;
  }

  getSPUPriority(inputName: string, spuName: string): number {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    const hasGiftBoxKeyword = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    const hasSpecialVersion = VERSION_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeyword && !hasSpecialVersion) {
      return 3;
    }
    
    if (hasSpecialVersion) {
      for (const keyword of VERSION_KEYWORDS) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerInput.includes(lowerKeyword) && lowerSPU.includes(lowerKeyword)) {
          return 2;
        }
      }
    }
    
    return 1;
  }

  extractBrand(str: string): string | null {
    const lowerStr = str.toLowerCase();
    if (lowerStr.includes('vivo')) return 'vivo';
    if (lowerStr.includes('apple') || lowerStr.includes('iphone')) return 'apple';
    if (lowerStr.includes('huawei')) return 'huawei';
    return null;
  }

  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // Simple model extraction for testing
    if (lowerStr.includes('s30 pro mini') || lowerStr.includes('s30promini')) return 's30 pro mini';
    if (lowerStr.includes('watch gt') || lowerStr.includes('watchgt')) return 'watch gt';
    if (lowerStr.includes('watch 5') || lowerStr.includes('watch5')) return 'watch 5';
    if (lowerStr.includes('y300i')) return 'y300i';
    
    return null;
  }

  // Simplified findBestSPUMatch for testing
  findBestSPUMatch(input: string, spuList: SPUData[]): SPUData | null {
    const inputBrand = this.extractBrand(input);
    const inputModel = this.extractModel(input);
    
    let bestMatch: SPUData | null = null;
    let bestScore = 0;
    let bestPriority = 0;
    
    for (const spu of spuList) {
      // Apply version filtering
      if (this.shouldFilterSPU(input, spu.name)) {
        continue;
      }
      
      const spuBrand = this.extractBrand(spu.name);
      const spuModel = this.extractModel(spu.name);
      
      let score = 0;
      
      // Brand matching
      if (inputBrand && spuBrand && inputBrand === spuBrand) {
        score += 0.4;
      } else if (inputBrand) {
        continue; // Brand mismatch
      }
      
      // Model matching
      if (inputModel && spuModel && inputModel === spuModel) {
        score += 0.6;
      } else if (inputModel) {
        continue; // Model mismatch
      }
      
      // Calculate priority
      const priority = this.getSPUPriority(input, spu.name);
      
      // Update best match: higher score wins, or same score with higher priority wins
      if (score > bestScore || (score === bestScore && priority > bestPriority)) {
        bestScore = score;
        bestMatch = spu;
        bestPriority = priority;
      }
    }
    
    return bestMatch;
  }
}

describe('SPU Priority Sorting Integration', () => {
  let matcher: SimpleMatcher;

  beforeEach(() => {
    matcher = new SimpleMatcher();
  });

  describe('Priority as Tiebreaker', () => {
    test('should prefer standard version over gift box when scores are equal', () => {
      const input = 'vivo S30 Pro mini 12+512';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo S30 Pro mini 三丽鸥家族系列礼盒', brand: 'vivo' },
        { id: 2, name: 'vivo S30 Pro mini 全网通5G', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should match the standard version (id: 2), not the gift box (id: 1)
      expect(result).not.toBeNull();
      expect(result?.id).toBe(2);
      expect(result?.name).toBe('vivo S30 Pro mini 全网通5G');
    });

    test('should prefer version-matching SPU over non-matching version when scores are equal', () => {
      const input = 'vivo Watch GT 蓝牙版 夏夜黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo WATCH GT eSIM版', brand: 'vivo' },
        { id: 2, name: 'vivo WATCH GT 蓝牙版', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should match the Bluetooth version (id: 2), not eSIM (id: 1)
      expect(result).not.toBeNull();
      expect(result?.id).toBe(2);
      expect(result?.name).toBe('vivo WATCH GT 蓝牙版');
    });

    test('should prefer standard version over version-matching special edition when scores are equal', () => {
      const input = 'vivo Watch 5 蓝牙版';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo WATCH 5 蓝牙版', brand: 'vivo' },
        { id: 2, name: 'vivo WATCH 5', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should match the standard version (id: 2), even though input mentions Bluetooth
      expect(result).not.toBeNull();
      expect(result?.id).toBe(2);
      expect(result?.name).toBe('vivo WATCH 5');
    });
  });

  describe('Priority with Filtering', () => {
    test('should filter gift box and select standard version', () => {
      const input = 'vivo S30 Pro mini 12+512 可可黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo S30 Pro mini 三丽鸥家族系列礼盒', brand: 'vivo' },
        { id: 2, name: 'vivo S30 Pro mini 全网通5G', brand: 'vivo' },
        { id: 3, name: 'vivo S30 Pro mini 豪华套装', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Gift box and套装 should be filtered, only standard version remains
      expect(result).not.toBeNull();
      expect(result?.id).toBe(2);
      expect(result?.name).toBe('vivo S30 Pro mini 全网通5G');
    });

    test('should filter eSIM and select Bluetooth version', () => {
      const input = 'vivo Watch GT 蓝牙版 夏夜黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo WATCH GT eSIM版', brand: 'vivo' },
        { id: 2, name: 'vivo WATCH GT 蓝牙版', brand: 'vivo' },
        { id: 3, name: 'vivo WATCH GT', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // eSIM should be filtered, standard version has highest priority
      expect(result).not.toBeNull();
      expect(result?.id).toBe(3);
      expect(result?.name).toBe('vivo WATCH GT');
    });
  });

  describe('Multiple SPUs with Different Priorities', () => {
    test('should select highest priority SPU among multiple matches', () => {
      const input = 'vivo Y300i 12+512';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo Y300i 礼盒版', brand: 'vivo' },
        { id: 2, name: 'vivo Y300i 5G版', brand: 'vivo' },
        { id: 3, name: 'vivo Y300i', brand: 'vivo' },
        { id: 4, name: 'vivo Y300i 套装', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should select standard version (id: 3) with highest priority
      expect(result).not.toBeNull();
      expect(result?.id).toBe(3);
      expect(result?.name).toBe('vivo Y300i');
    });

    test('should handle mix of filtered and prioritized SPUs', () => {
      const input = 'vivo Watch 5 蓝牙版 辰夜黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo WATCH 5 礼盒版', brand: 'vivo' }, // Filtered (gift box)
        { id: 2, name: 'vivo WATCH 5 eSIM版', brand: 'vivo' }, // Filtered (version mismatch)
        { id: 3, name: 'vivo WATCH 5 蓝牙版', brand: 'vivo' }, // Priority 2
        { id: 4, name: 'vivo WATCH 5', brand: 'vivo' }, // Priority 3 (highest)
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should select standard version (id: 4) after filtering
      expect(result).not.toBeNull();
      expect(result?.id).toBe(4);
      expect(result?.name).toBe('vivo WATCH 5');
    });
  });

  describe('Real-world Scenarios', () => {
    test('Scenario 1: Standard phone vs gift box', () => {
      const input = 'Vivo S30Promini 5G(12+512)可可黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo S30 Pro mini 三丽鸥家族系列礼盒', brand: 'vivo' },
        { id: 2, name: 'vivo S30 Pro mini 全网通5G', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      expect(result).not.toBeNull();
      expect(result?.name).toContain('全网通5G');
      expect(result?.name).not.toContain('礼盒');
    });

    test('Scenario 2: Bluetooth watch vs eSIM watch', () => {
      const input = 'VIVO WatchGT 软胶蓝牙版夏夜黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo WATCH GT eSIM版', brand: 'vivo' },
        { id: 2, name: 'vivo WATCH GT 蓝牙版', brand: 'vivo' },
        { id: 3, name: 'vivo WATCH GT', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should prefer standard version (highest priority)
      expect(result).not.toBeNull();
      expect(result?.id).toBe(3);
      expect(result?.name).toBe('vivo WATCH GT');
    });

    test('Scenario 3: Watch with version keyword', () => {
      const input = 'VIVO Watch5 蓝牙版辰夜黑';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo WATCH 5 eSIM版', brand: 'vivo' },
        { id: 2, name: 'vivo WATCH 5 蓝牙版', brand: 'vivo' },
        { id: 3, name: 'vivo WATCH 5', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should prefer standard version
      expect(result).not.toBeNull();
      expect(result?.id).toBe(3);
      expect(result?.name).toBe('vivo WATCH 5');
    });
  });

  describe('Edge Cases', () => {
    test('should handle single SPU', () => {
      const input = 'vivo S30 Pro mini';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo S30 Pro mini', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    test('should return null when all SPUs are filtered', () => {
      const input = 'vivo S30 Pro mini 12+512';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo S30 Pro mini 礼盒版', brand: 'vivo' },
        { id: 2, name: 'vivo S30 Pro mini 套装', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // All SPUs should be filtered
      expect(result).toBeNull();
    });

    test('should handle empty SPU list', () => {
      const input = 'vivo S30 Pro mini';
      const spuList: SPUData[] = [];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      expect(result).toBeNull();
    });

    test('should handle SPUs with same priority', () => {
      const input = 'vivo Y300i';
      const spuList: SPUData[] = [
        { id: 1, name: 'vivo Y300i', brand: 'vivo' },
        { id: 2, name: 'vivo Y300i 全网通', brand: 'vivo' },
      ];
      
      const result = matcher.findBestSPUMatch(input, spuList);
      
      // Should return one of them (first match with highest score and priority)
      expect(result).not.toBeNull();
      expect([1, 2]).toContain(result?.id);
    });
  });
});
