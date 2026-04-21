/**
 * 匹配协调器
 *
 * 职责：
 * - SKU直接匹配流程
 * - 协调数据加载和匹配
 *
 * @module MatchingOrchestrator
 */

import type { SPUData, BrandData, SKUWithBrand, SKUIndex } from '../types';
import { InfoExtractor } from './InfoExtractor';
import { getSKUList, getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

/**
 * 匹配结果
 */
export interface MatchResult {
  // 输入信息
  inputName: string;
  
  // SPU匹配结果
  spuMatch: {
    spu: SPUData | null;
    score: number;
    explanation: {
      matchType: 'exact' | 'fuzzy';
      brandMatch: { matched: boolean; score: number };
      modelMatch: { matched: boolean; score: number };
      versionMatch: { matched: boolean; score: number };
      details: string;
    };
  };
  
  // SKU匹配结果
  skuMatch: {
    sku: any | null;
    score: number;
    specMatches: Record<string, { matched: boolean; score: number }>;
  };
  
  // 最终状态
  status: 'matched' | 'unmatched' | 'spu-matched';
  
  // 综合相似度
  similarity: number;
  
  // 提取的信息（用于显示）
  extractedInfo: {
    brand: string | null;
    version: string | null;
    memory: string | null;
    color: string | null;
  };
  
  // 匹配的信息（用于显示）
  matchedInfo: {
    spu: string | null;
    sku: string | null;
    gtins: string[];
  };
}

/**
 * 批量匹配结果
 */
export interface BatchMatchResult {
  results: (MatchResult | null)[];
  summary: {
    total: number;
    matched: number;
    spuMatched: number;
    unmatched: number;
    matchRate: number;
    duration: number; // 毫秒
  };
}

/**
 * 匹配协调器类
 */
export class MatchingOrchestrator {
  private infoExtractor: InfoExtractor;

  private isInitialized = false;

  // SKU数据
  private skuList: SKUWithBrand[] = [];
  private skuIndex: SKUIndex = { byBrand: new Map(), all: [] };
  private spuMap = new Map<number, { name: string; brand: string }>();

  constructor() {
    this.infoExtractor = new InfoExtractor();
  }

  /**
   * 初始化协调器
   *
   * 加载所有必要的数据和配置
   *
   * @param brandList 品牌列表
   * @param spuList SPU列表
   */
  async initialize(brandList: BrandData[], spuList: SPUData[]): Promise<void> {
    try {
      // 初始化信息提取器
      this.infoExtractor.setBrandList(brandList);

      // 加载SKU数据并构建索引
      await this.loadSkuData();
      this.buildSkuIndex();

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ MatchingOrchestrator 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载SKU数据
   * 批量加载所有"在用"状态的SKU，并通过SPU关联获取品牌信息
   */
  private async loadSkuData(): Promise<void> {
    const allSkuList: SKUWithBrand[] = [];
    const batchSize = 5000;
    let offset = 0;
    let hasMore = true;
    let totalLoaded = 0;

    // 加载SPU数据用于获取品牌
    // 先加载所有SPU建立ID到品牌的映射
    let spuOffset = 0;
    let spuHasMore = true;
    while (spuHasMore) {
      const spuList = await getSPUListNew(
        {
          states: [SPUState.在用],
          limit: 10000,
          offset: spuOffset,
          orderBy: [{ key: 'p."id"', sort: 'ASC' }],
        },
        ['id', 'name', 'brand']
      );

      for (const spu of spuList) {
        if (spu.brand && spu.brand.trim()) {
          this.spuMap.set(spu.id, { name: spu.name, brand: spu.brand });
        }
      }

      if (spuList.length < 10000) {
        spuHasMore = false;
      } else {
        spuOffset += 10000;
      }
    }

    // 批量加载SKU
    while (hasMore) {
      const skuList = await getSKUList(
        {
          states: [SKUState.在用],
          limit: batchSize,
          offset,
          orderBy: [{ key: 'id', sort: 'ASC' }] as any,
        },
        ['id', 'name', 'spuID']
      );

      totalLoaded += skuList.length;

      for (const item of skuList) {
        if (!item.name) continue;

        const spu = this.spuMap.get(item.spuID);
        if (spu) {
          allSkuList.push({
            id: item.id,
            name: item.name,
            spuId: item.spuID,
            spuName: spu.name,
            brand: spu.brand,
          });
        }
      }

      if (skuList.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }

    }

    // 过滤有品牌的SKU
    this.skuList = allSkuList.filter(s => s.brand);
  }

  /**
   * 构建SKU索引
   * 按品牌分组并建立全量列表
   */
  private buildSkuIndex(): void {
    const byBrand = new Map<string, SKUWithBrand[]>();

    for (const sku of this.skuList) {
      if (!byBrand.has(sku.brand)) {
        byBrand.set(sku.brand, []);
      }
      byBrand.get(sku.brand)!.push(sku);
    }

    this.skuIndex = { byBrand, all: this.skuList };
  }

  // ==================== SKU直接匹配相关方法和属性 ====================

  // 第三方品牌前缀（只用于检测，不用于移除）
  private readonly THIRD_PARTY_PREFIXES_FOR_DETECTION = [
    '荣耀亲选', '亲选', '乔威', '乐坞', '联创',
    'IOTAPK', '万魔', '极选', '思派力', 'O项目',
  ];

  // 第三方品牌前缀（用于 removeThirdPartyPrefix）
  private readonly PLATFORM_PREFIXES_TO_REMOVE = [
    '荣耀亲选', '亲选', '乔威', '乐坞', '联创',
    'IOTAPK', '万魔', '极选', '思派力', 'O项目',
    'T-', 'T牌',
  ];

  private readonly BRAND_PATTERNS = [
    { pattern: /^荣耀/, brand: '荣耀' },
    { pattern: /^华为/, brand: '华为' },
    { pattern: /^小米/, brand: '小米' },
    { pattern: /^vivo/, brand: 'vivo' },
    { pattern: /^OPPO/, brand: 'OPPO' },
    { pattern: /^苹果/, brand: '苹果' },
    { pattern: /^iPhone/, brand: '苹果' },
    { pattern: /^三星/, brand: '三星' },
    { pattern: /^真我/, brand: '真我' },
    { pattern: /^一加/, brand: '一加' },
    { pattern: /^红米/, brand: '红米' },
    { pattern: /^iqoo/, brand: 'iQOO' },
    { pattern: /^麦芒/, brand: '麦芒' },
  ];

  /**
   * 提取品牌
   */
  private extractBrand(skuName: string): string | null {
    for (const prefix of this.THIRD_PARTY_PREFIXES_FOR_DETECTION) {
      if (skuName.startsWith(prefix) || skuName.startsWith('亲选' + prefix.slice(2))) {
        return null;
      }
    }

    if (skuName.startsWith('荣耀')) {
      const afterHonor = skuName.slice(2);
      for (const prefix of this.THIRD_PARTY_PREFIXES_FOR_DETECTION) {
        if (afterHonor.startsWith(prefix)) {
          return null;
        }
      }
      for (const prefix of ['极选', '思派力', '乔威', '乐坞', '联创', '万魔']) {
        if (afterHonor.startsWith(prefix)) {
          return null;
        }
      }
    }

    for (const { pattern, brand } of this.BRAND_PATTERNS) {
      if (pattern.test(skuName)) {
        return brand;
      }
    }
    return null;
  }

  /**
   * 移除第三方品牌前缀
   */
  private removeThirdPartyPrefix(skuName: string): string {
    let result = skuName;
    let previous = '';
    let iterations = 0;
    const maxIterations = 10;

    while (previous !== result && iterations < maxIterations) {
      previous = result;
      for (const prefix of this.PLATFORM_PREFIXES_TO_REMOVE) {
        const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (prefix === '荣耀亲选') {
          const pattern1 = new RegExp(`荣耀亲选荣耀`, 'g');
          result = result.replace(pattern1, '荣耀亲选 ').trim();
          const pattern2 = /^[^\s]+荣耀亲选/;
          if (pattern2.test(result)) {
            result = result.replace(pattern2, '荣耀亲选').trim();
          }
          continue;
        }

        if (prefix === '亲选') {
          const pattern2 = new RegExp(`^亲选`, 'g');
          if (pattern2.test(result)) {
            result = result.replace(pattern2, '荣耀亲选').trim();
            result = result.replace(/荣耀亲选\s*荣耀/gi, '荣耀亲选').trim();
          }
          continue;
        }

        const pattern = new RegExp(`^${escapedPrefix}|\\s${escapedPrefix}|荣耀${escapedPrefix}`, 'g');
        result = result.replace(pattern, '').trim();
      }
      iterations++;
    }

    return result;
  }

  /**
   * 标准化SKU名称
   */
  private normalizeSkuName(skuName: string): string {
    if (!skuName) return '';

    let normalized = skuName;

    // 去除括号内的型号代码（半角和全角括号都要处理）
    normalized = normalized.replace(/\([^)]*\)/g, ' ');
    normalized = normalized.replace(/\（[^）]*\）/g, ' ');
    normalized = normalized.replace(/\[[^\]]*\]/g, ' ');
    normalized = normalized.replace(/《[^》]*》/g, ' ');

    // 去除多余的描述性文字
    normalized = normalized.replace(/\b(LTE|WCDM|WCDMA|CDMA|TDD|FDD)[^ ]*/gi, ' ');
    normalized = normalized.replace(/演示样机/gi, ' ');
    normalized = normalized.replace(/专供/gi, ' ');

    // 提取品牌
    const brand = this.extractBrand(normalized);
    let remaining = normalized;

    // 去除第三方品牌前缀
    remaining = this.removeThirdPartyPrefix(remaining);

    if (brand) {
      remaining = remaining.replace(new RegExp(`^${brand}`), '').trim();
    }

    // 容量标准化
    remaining = remaining.replace(/(\d+)\s*GB\s*SSD\s*(\d+)\s*TB/gi, '$1GB+$2TB');
    remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*TB/gi, '$1GB+$2TB');
    remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*GB/gi, '$1GB+$2GB');
    remaining = remaining.replace(/(\d+)\s*G\s*\+\s*(\d+)\s*G/gi, '$1G+$2G');

    // 先把 5G 替换为特殊占位符
    remaining = remaining.replace(/5G/gi, '___5G___');
    remaining = remaining.replace(/(\d+)\s*GB/gi, '$1');
    remaining = remaining.replace(/(\d+)\s*G(?!\d)/gi, '$1');
    remaining = remaining.replace(/___5G___/gi, '5G');

    // 去除"全网通"等词汇
    remaining = remaining.replace(/全网通[45]?/gi, '');
    remaining = remaining.replace(/双卡/gi, '');

    // 去除颜色前缀
    remaining = remaining.replace(/^(雪域白|天青色|竹韵青|幻夜黑|朱砂红|旭日金|羽白|影黑|绒黑色|钛空灰|晨曦紫|月影白|星辰灰|云染丹霞|月光石|板岩灰|日出印象)/gi, '');

    // 归一化空格
    remaining = remaining.replace(/\s+/g, ' ').trim();

    return remaining;
  }

  /**
   * 计算两个字符串的相似度
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // 计算公共字符数量
    let common = 0;
    const s2Arr = s2.split('');

    for (const char of s1) {
      const idx = s2Arr.indexOf(char);
      if (idx !== -1) {
        common++;
        s2Arr.splice(idx, 1);
      }
    }

    return (2 * common) / (s1.length + s2.length);
  }

  /**
   * SKU直接匹配
   * 在整个SKU库中直接查找最佳匹配
   */
  private matchSkuDirect(inputName: string): { match: SKUWithBrand | null; score: number; reason: string } {
    let bestMatch: SKUWithBrand | null = null;
    let bestScore = 0;
    let bestReason = '';

    const normalizedInput = this.normalizeSkuName(inputName);
    const brand = this.extractBrand(inputName);

    // 第一轮：按品牌筛选
    if (brand) {
      const brandSkus = this.skuIndex.byBrand.get(brand);
      if (brandSkus) {
        for (const sku of brandSkus) {
          const skuName = sku.name || '';
          const normalizedSku = this.normalizeSkuName(skuName);
          const similarity = this.stringSimilarity(normalizedInput, normalizedSku);

          if (similarity > bestScore) {
            bestScore = similarity;
            bestMatch = sku;
            bestReason = `相似度: ${(similarity * 100).toFixed(1)}%`;
          }
        }
      }
    }

    // 如果按品牌筛选没找到合适的，回退到不限制品牌
    if (!bestMatch || bestScore < 0.4) {
      bestMatch = null;
      bestScore = 0;
      bestReason = '';

      for (const sku of this.skuIndex.all) {
        const skuName = sku.name || '';
        const normalizedSku = this.normalizeSkuName(skuName);
        const similarity = this.stringSimilarity(normalizedInput, normalizedSku);

        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = sku;
          bestReason = `相似度(无品牌): ${(similarity * 100).toFixed(1)}%`;
        }
      }
    }

    // 设置阈值
    const threshold = 0.4;

    if (bestScore >= threshold) {
      return { match: bestMatch, score: bestScore, reason: bestReason };
    }

    return { match: null, score: 0, reason: '未达到匹配阈值' };
  }

  /**
   * 执行完整匹配流程
   *
   * 步骤（SKU直接匹配模式）：
   * 1. 提取品牌信息
   * 2. SKU直接匹配
   * 3. 聚合结果
   *
   * @param input 输入字符串
   * @returns 匹配结果
   */
  async match(input: string): Promise<MatchResult> {
    if (!this.isInitialized) {
      throw new Error('MatchingOrchestrator 未初始化，请先调用 initialize()');
    }

    const startTime = Date.now();

    try {
      // 1. 使用SKU直接匹配
      const skuMatchResult = this.matchSkuDirect(input);

      let status: 'matched' | 'unmatched' | 'spu-matched' = 'unmatched';
      let similarity = 0;
      let matchedSku = null;
      let matchedSpu = null;
      let extractedBrand = null;

      if (skuMatchResult.match) {
        status = 'matched';
        similarity = skuMatchResult.score;
        matchedSku = skuMatchResult.match.name;
        matchedSpu = skuMatchResult.match.spuName;
        extractedBrand = skuMatchResult.match.brand;
      }

      // 2. 提取信息（用于显示）
      const extractedInfo = this.infoExtractor.extractAll(input);
      const extractedInfoDisplay = {
        brand: extractedBrand || extractedInfo.brand.value,
        version: extractedInfo.version.value?.name || null,
        memory: extractedInfo.capacity.value,
        color: extractedInfo.color.value,
      };

      // 3. 聚合结果
      const result: MatchResult = {
        inputName: input,
        spuMatch: {
          spu: matchedSpu ? { id: 0, name: matchedSpu, brand: extractedBrand || undefined } : null,
          score: similarity,
          explanation: {
            matchType: 'fuzzy' as const,
            brandMatch: { matched: !!extractedBrand, score: extractedBrand ? 1 : 0 },
            modelMatch: { matched: false, score: 0 },
            versionMatch: { matched: false, score: 0 },
            details: skuMatchResult.reason,
          },
        },
        skuMatch: {
          sku: matchedSku ? { id: 0, name: matchedSku } : null,
          score: similarity,
          specMatches: {},
        },
        status,
        similarity,
        extractedInfo: extractedInfoDisplay,
        matchedInfo: {
          spu: matchedSpu,
          sku: matchedSku || null,
          gtins: [],
        },
      };

      const duration = Date.now() - startTime;

      return result;
    } catch (error) {
      console.error(`[匹配错误] ${error}`);
      throw error;
    }
  }
  
  /**
   * 批量匹配（并发优化版本）
   *
   * @param inputs 输入字符串数组
   * @param onProgress 进度回调函数 (currentIndex, totalCount, currentInput, result) => void
   * @param concurrency 每批并发数，默认5
   * @returns 批量匹配结果
   */
  async batchMatch(
    inputs: string[],
    onProgress?: (currentIndex: number, totalCount: number, currentInput: string, result: MatchResult | null) => void,
    concurrency = 5
  ): Promise<BatchMatchResult> {
    if (!this.isInitialized) {
      throw new Error('MatchingOrchestrator 未初始化，请先调用 initialize()');
    }

    const startTime = Date.now();

    const results: (MatchResult | null)[] = new Array(inputs.length);
    let matched = 0;
    let spuMatched = 0;
    let unmatched = 0;
    let processedCount = 0;

    // 分批并发处理
    for (let batchStart = 0; batchStart < inputs.length; batchStart += concurrency) {
      const batchEnd = Math.min(batchStart + concurrency, inputs.length);
      const batchInputs = inputs.slice(batchStart, batchEnd);
      const batchIndices = Array.from({ length: batchInputs.length }, (_, i) => batchStart + i);

      // 并发处理当前批次
      const batchPromises = batchInputs.map(async (input, localIndex) => {
        const globalIndex = batchStart + localIndex;
        try {
          const result = await this.match(input);
          return { index: globalIndex, result, error: null };
        } catch (error) {
          return { index: globalIndex, result: null, error };
        }
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);

      // 处理批次结果
      for (const { index, result } of batchResults) {
        results[index] = result;

        if (result) {
          if (result.status === 'matched') {
            matched++;
          } else if (result.status === 'spu-matched') {
            spuMatched++;
          } else {
            unmatched++;
          }
        } else {
          unmatched++;
        }

        processedCount++;

        // 调用进度回调
        if (onProgress) {
          onProgress(processedCount, inputs.length, inputs[index], result);
        }
      }
    }

    const duration = Date.now() - startTime;
    const matchRate = inputs.length > 0 ? (matched / inputs.length) * 100 : 0;

    return {
      results,
      summary: {
        total: inputs.length,
        matched,
        spuMatched,
        unmatched,
        matchRate,
        duration,
      },
    };
  }

  /**
   * 获取信息提取器
   */
  getInfoExtractor(): InfoExtractor {
    return this.infoExtractor;
  }
}
