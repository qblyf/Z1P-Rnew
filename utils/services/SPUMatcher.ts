/**
 * SPUMatcher - SPU 匹配器
 * 
 * 协调精确匹配和模糊匹配，提供统一的 SPU 匹配接口
 * 使用品牌索引和型号索引优化查找性能
 */

import { ExactMatcher } from './ExactMatcher';
import { FuzzyMatcher } from './FuzzyMatcher';
import type { SPUData, VersionInfo, BrandData, EnhancedSPUData } from '../types';
import type { SPUMatchResult, ExtractedInfo, SelectionMetrics } from './types';
import type { MatchLogger } from '../monitoring/MatchLogger';
import type { PerformanceMetrics } from '../monitoring/PerformanceMetrics';

// 匹配阈值常量
const MATCH_THRESHOLDS = {
  SPU: 0.5,
} as const;

// SPU 优先级常量
const SPU_PRIORITIES = {
  STANDARD: 3,      // 标准版（无礼盒、无特殊版本）
  VERSION_MATCH: 2, // 版本匹配的特殊版
  OTHER: 1,         // 其他情况（礼盒版等）
} as const;

export class SPUMatcher {
  private exactMatcher: ExactMatcher;
  private fuzzyMatcher: FuzzyMatcher;
  private logger?: MatchLogger;
  private metrics?: PerformanceMetrics;
  
  // 品牌索引：品牌名 -> SPU 列表
  private spuIndexByBrand: Map<string, EnhancedSPUData[]> = new Map();
  
  // 型号索引：型号 -> SPU 列表
  private spuIndexByModel: Map<string, EnhancedSPUData[]> = new Map();
  
  // 品牌列表（用于品牌匹配）
  private brandList: BrandData[] = [];
  
  // 版本关键词（用于版本匹配）
  private versionKeywords: Array<{ name: string; keywords: string[]; priority: number }> = [];
  
  // 网络版本关键词（用于过滤）
  private networkVersions: string[] = [];
  
  // 过滤关键词配置
  private filterKeywords: {
    giftBox?: string[];
    accessoryKeywords?: string[];
  } | null = null;
  
  constructor(logger?: MatchLogger) {
    this.logger = logger;
    this.exactMatcher = new ExactMatcher(logger);
    this.fuzzyMatcher = new FuzzyMatcher(logger);
  }
  
  /**
   * 设置日志记录器
   */
  setLogger(logger: MatchLogger) {
    this.logger = logger;
    this.exactMatcher.setLogger(logger);
    this.fuzzyMatcher.setLogger(logger);
  }
  
  /**
   * 设置性能指标收集器
   */
  setMetrics(metrics: PerformanceMetrics) {
    this.metrics = metrics;
    this.exactMatcher.setMetrics(metrics);
    this.fuzzyMatcher.setMetrics(metrics);
  }
  
  /**
   * 设置品牌列表
   */
  setBrandList(brands: BrandData[]) {
    this.brandList = brands;
  }
  
  /**
   * 设置版本关键词
   */
  setVersionKeywords(versions: Array<{ name: string; keywords: string[]; priority: number }>) {
    this.versionKeywords = versions;
  }
  
  /**
   * 设置网络版本关键词
   */
  setNetworkVersions(versions: string[]) {
    this.networkVersions = versions;
  }
  
  /**
   * 设置过滤关键词
   */
  setFilterKeywords(keywords: { giftBox?: string[]; accessoryKeywords?: string[] }) {
    this.filterKeywords = keywords;
  }
  
  /**
   * 构建品牌索引和型号索引
   * 
   * Requirements: 2.4.3 - 使用品牌索引快速过滤候选SPU
   * 
   * @param spuList SPU 列表（增强的SPU数据）
   * @param extractBrand 品牌提取函数
   * @param extractModel 型号提取函数
   * @param extractSPUPart SPU 部分提取函数
   */
  buildIndexes(
    spuList: EnhancedSPUData[],
    extractBrand: (name: string) => string | null,
    extractModel: (name: string, brand?: string | null) => string | null,
    extractSPUPart: (name: string) => string
  ) {
    this.spuIndexByBrand.clear();
    this.spuIndexByModel.clear();
    
    let brandIndexedCount = 0;
    let modelIndexedCount = 0;
    let noBrandCount = 0;
    let noModelCount = 0;
    
    for (const spu of spuList) {
      const brand = spu.brand || extractBrand(spu.name);
      
      if (!brand) {
        noBrandCount++;
        console.warn(`⚠️  SPU "${spu.name}" (ID: ${spu.id}) 品牌提取失败`);
        continue;
      }
      
      // 构建品牌索引（使用多个键：中文、拼音、小写）
      const brandKeys = this.getBrandKeys(brand);
      for (const key of brandKeys) {
        if (!this.spuIndexByBrand.has(key)) {
          this.spuIndexByBrand.set(key, []);
        }
        this.spuIndexByBrand.get(key)!.push(spu);
      }
      brandIndexedCount++;
      
      // 构建型号索引
      const spuPart = extractSPUPart(spu.name);
      const model = extractModel(spuPart, brand);
      
      if (model) {
        const modelKey = this.normalizeModelKey(model);
        if (!this.spuIndexByModel.has(modelKey)) {
          this.spuIndexByModel.set(modelKey, []);
        }
        this.spuIndexByModel.get(modelKey)!.push(spu);
        modelIndexedCount++;
      } else {
        noModelCount++;
      }
    }
    
    console.log(`✓ SPU 品牌索引构建完成: ${this.spuIndexByBrand.size} 个品牌键, ${brandIndexedCount} 个SPU, ${noBrandCount} 个SPU无品牌`);
    console.log(`✓ SPU 型号索引构建完成: ${this.spuIndexByModel.size} 个型号键, ${modelIndexedCount} 个SPU, ${noModelCount} 个SPU无型号`);
    
    // 输出品牌索引示例
    const brandKeys = Array.from(this.spuIndexByBrand.keys()).slice(0, 10);
    console.log(`  品牌索引示例: ${brandKeys.join(', ')}${this.spuIndexByBrand.size > 10 ? '...' : ''}`);
    
    // 输出型号索引示例
    const modelKeys = Array.from(this.spuIndexByModel.keys()).slice(0, 10);
    console.log(`  型号索引示例: ${modelKeys.join(', ')}${this.spuIndexByModel.size > 10 ? '...' : ''}`);
  }
  
  /**
   * 获取品牌的所有索引键（中文、拼音、小写）
   */
  private getBrandKeys(brand: string): string[] {
    const keys = [brand.toLowerCase()];
    
    // 查找品牌信息
    const brandInfo = this.brandList.find(b => 
      b.name.toLowerCase() === brand.toLowerCase()
    );
    
    if (brandInfo) {
      // 添加拼音
      if (brandInfo.spell) {
        const spellKey = brandInfo.spell.toLowerCase();
        if (!keys.includes(spellKey)) {
          keys.push(spellKey);
        }
      }
      
      // 添加标准化的中文品牌名
      const chineseKey = brandInfo.name.toLowerCase();
      if (!keys.includes(chineseKey)) {
        keys.push(chineseKey);
      }
    }
    
    // 反向查找：如果输入是拼音，添加对应的中文品牌名
    const brandInfoBySpell = this.brandList.find(b => 
      b.spell?.toLowerCase() === brand.toLowerCase()
    );
    
    if (brandInfoBySpell) {
      const chineseKey = brandInfoBySpell.name.toLowerCase();
      if (!keys.includes(chineseKey)) {
        keys.push(chineseKey);
      }
      
      if (brandInfoBySpell.spell) {
        const spellKey = brandInfoBySpell.spell.toLowerCase();
        if (!keys.includes(spellKey)) {
          keys.push(spellKey);
        }
      }
    }
    
    return keys;
  }
  
  /**
   * 标准化型号键（用于索引）
   */
  private normalizeModelKey(model: string): string {
    return model.toLowerCase().replace(/[\s\-_]/g, '');
  }
  
  /**
   * 查找最佳匹配的 SPU
   * 
   * Requirements: 2.4.1, 2.4.2 - 使用增强的SPU数据进行匹配
   * 
   * @param extractedInfo 提取的信息
   * @param spuList 完整的 SPU 列表（增强的SPU数据，用于回退）
   * @param threshold 匹配阈值
   * @param options 匹配选项
   * @returns 最佳匹配结果
   */
  findBestMatch(
    extractedInfo: ExtractedInfo,
    spuList: EnhancedSPUData[],
    threshold: number = MATCH_THRESHOLDS.SPU,
    options?: {
      extractBrand: (name: string) => string | null;
      extractModel: (name: string, brand?: string | null) => string | null;
      extractVersion: (name: string) => VersionInfo | null;
      extractSPUPart: (name: string) => string;
      isBrandMatch: (brand1: string | null, brand2: string | null) => boolean;
      shouldFilterSPU: (inputName: string, spuName: string) => boolean;
      getSPUPriority: (inputName: string, spuName: string) => number;
      tokenize: (str: string) => string[];
    }
  ): SPUMatchResult | null {
    // 开始性能监控
    if (this.metrics) {
      this.metrics.startTimer('spu-match-total');
    }
    
    const overallStartTime = Date.now();
    const inputBrand = extractedInfo.brand.value;
    const inputModel = extractedInfo.model.value;
    
    console.log(`[SPU匹配] 输入: "${extractedInfo.originalInput}"`);
    console.log(`[SPU匹配] 提取品牌: "${inputBrand}"`);
    console.log(`[SPU匹配] 提取型号: "${inputModel}"`);
    
    // 日志：开始SPU匹配
    if (this.logger) {
      console.log(`[SPU匹配] ========== 开始SPU匹配 ==========`);
      console.log(`[SPU匹配] 输入: "${extractedInfo.originalInput}"`);
      console.log(`[SPU匹配] 提取信息: 品牌="${inputBrand}", 型号="${inputModel}", 版本="${extractedInfo.version.value?.name || 'N/A'}"`);
      console.log(`[SPU匹配] 匹配阈值: ${threshold}`);
    }
    
    // 使用品牌索引缩小候选范围
    let candidates: EnhancedSPUData[];
    let usedBrandIndex = false;
    
    if (inputBrand && this.spuIndexByBrand.size > 0) {
      const brandKeys = this.getBrandKeys(inputBrand);
      const candidateSet = new Set<EnhancedSPUData>();
      
      for (const key of brandKeys) {
        const spus = this.spuIndexByBrand.get(key);
        if (spus) {
          spus.forEach(spu => candidateSet.add(spu));
        }
      }
      
      candidates = Array.from(candidateSet);
      
      if (candidates.length > 0) {
        console.log(`✓ 使用品牌索引: ${inputBrand}, 候选SPU: ${candidates.length}/${spuList.length}`);
        usedBrandIndex = true;
        
        // 日志：品牌索引使用情况
        if (this.logger) {
          console.log(`[SPU匹配] 品牌索引: 使用品牌"${inputBrand}"过滤, 候选SPU从${spuList.length}个减少到${candidates.length}个`);
        }
      } else {
        console.warn(`⚠️  品牌 "${inputBrand}" 在索引中未找到，将严格过滤品牌`);
        candidates = spuList.filter(spu => {
          const spuBrand = spu.brand || (options?.extractBrand ? options.extractBrand(spu.name) : null);
          return spuBrand && options?.isBrandMatch && options.isBrandMatch(inputBrand, spuBrand);
        });
        console.log(`[SPU匹配] 严格品牌过滤后: ${candidates.length} 个SPU`);
        usedBrandIndex = true;
        
        // 日志：品牌索引未命中
        if (this.logger) {
          console.log(`[SPU匹配] 品牌索引: 品牌"${inputBrand}"未在索引中找到, 使用严格过滤, 候选SPU: ${candidates.length}个`);
        }
      }
    } else {
      if (!inputBrand) {
        console.warn(`⚠️  品牌提取失败，将在所有 ${spuList.length} 个SPU中搜索`);
        
        // 日志：品牌提取失败
        if (this.logger) {
          console.log(`[SPU匹配] 品牌索引: 品牌提取失败, 将在所有${spuList.length}个SPU中搜索`);
        }
      }
      candidates = spuList;
    }
    
    // 如果没有候选SPU，返回null
    if (candidates.length === 0) {
      console.log(`[SPU匹配] 没有候选SPU，匹配失败`);
      
      // 结束性能监控
      if (this.metrics) {
        this.metrics.endTimer('spu-match-total', {
          matched: false,
          reason: 'no-candidates',
          candidateCount: 0
        });
      }
      
      // 日志：无候选SPU
      if (this.logger) {
        const duration = Date.now() - overallStartTime;
        console.log(`[SPU匹配] ========== 匹配失败 ==========`);
        console.log(`[SPU匹配] 原因: 没有候选SPU`);
        console.log(`[SPU匹配] 总耗时: ${duration}ms`);
      }
      
      return null;
    }
    
    // 第一阶段：精确匹配
    console.log(`[SPU匹配] 开始精确匹配，候选SPU: ${candidates.length} 个`);
    
    // 开始精确匹配性能监控
    if (this.metrics) {
      this.metrics.startTimer('spu-match-exact');
    }
    const exactStartTime = Date.now();
    
    const exactMatches = this.exactMatcher.findMatches(extractedInfo, candidates, options);
    
    const exactDuration = Date.now() - exactStartTime;
    // 结束精确匹配性能监控
    if (this.metrics) {
      this.metrics.endTimer('spu-match-exact', {
        candidateCount: candidates.length,
        matchCount: exactMatches.length
      });
    }
    
    console.log(`[SPU匹配] 精确匹配结果: ${exactMatches.length} 个`);
    
    // 日志：精确匹配阶段
    if (this.logger) {
      console.log(`[SPU匹配] --- 精确匹配阶段 ---`);
      console.log(`[SPU匹配] 候选SPU: ${candidates.length}个`);
      console.log(`[SPU匹配] 匹配结果: ${exactMatches.length}个`);
      console.log(`[SPU匹配] 耗时: ${exactDuration}ms`);
      if (exactMatches.length > 0) {
        const topMatch = exactMatches[0];
        console.log(`[SPU匹配] 最佳匹配: "${topMatch.spu.name}", 分数: ${topMatch.score.toFixed(3)}`);
      }
    }
    
    let bestMatch: SPUMatchResult | null = null;
    
    if (exactMatches.length > 0) {
      bestMatch = this.selectBestMatch(exactMatches, inputModel || undefined, options);
      console.log(`[SPU匹配] 精确匹配最佳: "${bestMatch.spu.name}", 分数: ${bestMatch.score.toFixed(2)}`);
    }
    
    // 第二阶段：模糊匹配（如果精确匹配分数不够高）
    if (!bestMatch || bestMatch.score < 0.99) {
      console.log(`[SPU匹配] 开始模糊匹配${bestMatch ? `（精确匹配分数 ${bestMatch.score.toFixed(2)} < 0.99）` : ''}`);
      
      // 开始模糊匹配性能监控
      if (this.metrics) {
        this.metrics.startTimer('spu-match-fuzzy');
      }
      const fuzzyStartTime = Date.now();
      
      const fuzzyMatches = this.fuzzyMatcher.findMatches(extractedInfo, candidates, threshold, options);
      
      const fuzzyDuration = Date.now() - fuzzyStartTime;
      // 结束模糊匹配性能监控
      if (this.metrics) {
        this.metrics.endTimer('spu-match-fuzzy', {
          candidateCount: candidates.length,
          matchCount: fuzzyMatches.length
        });
      }
      
      console.log(`[SPU匹配] 模糊匹配结果: ${fuzzyMatches.length} 个`);
      
      // 日志：模糊匹配阶段
      if (this.logger) {
        console.log(`[SPU匹配] --- 模糊匹配阶段 ---`);
        console.log(`[SPU匹配] 原因: ${bestMatch ? `精确匹配分数${bestMatch.score.toFixed(3)} < 0.99` : '精确匹配无结果'}`);
        console.log(`[SPU匹配] 候选SPU: ${candidates.length}个`);
        console.log(`[SPU匹配] 匹配结果: ${fuzzyMatches.length}个`);
        console.log(`[SPU匹配] 耗时: ${fuzzyDuration}ms`);
        if (fuzzyMatches.length > 0) {
          const topMatch = fuzzyMatches[0];
          console.log(`[SPU匹配] 最佳匹配: "${topMatch.spu.name}", 分数: ${topMatch.score.toFixed(3)}`);
        }
      }
      
      if (fuzzyMatches.length > 0) {
        const fuzzyBest = this.selectBestMatch(fuzzyMatches, inputModel || undefined, options);
        console.log(`[SPU匹配] 模糊匹配最佳: "${fuzzyBest.spu.name}", 分数: ${fuzzyBest.score.toFixed(2)}`);
        
        if (!bestMatch || fuzzyBest.score > bestMatch.score) {
          bestMatch = fuzzyBest;
        }
      }
    }
    
    // 检查是否达到阈值
    if (bestMatch && bestMatch.score < threshold) {
      console.log(`[SPU匹配] ❌ 分数 ${bestMatch.score.toFixed(2)} 低于阈值 ${threshold}，匹配失败`);
      
      // 结束性能监控
      if (this.metrics) {
        this.metrics.endTimer('spu-match-total', {
          matched: false,
          reason: 'below-threshold',
          score: bestMatch.score,
          threshold: threshold,
          candidateCount: candidates.length
        });
      }
      
      // 日志：分数低于阈值
      if (this.logger) {
        const duration = Date.now() - overallStartTime;
        console.log(`[SPU匹配] ========== 匹配失败 ==========`);
        console.log(`[SPU匹配] 原因: 最佳匹配分数${bestMatch.score.toFixed(3)}低于阈值${threshold}`);
        console.log(`[SPU匹配] 最佳候选: "${bestMatch.spu.name}"`);
        console.log(`[SPU匹配] 总耗时: ${duration}ms`);
      }
      
      return null;
    }
    
    const overallDuration = Date.now() - overallStartTime;
    
    // 结束总体性能监控
    if (this.metrics) {
      this.metrics.endTimer('spu-match-total', {
        matched: bestMatch !== null,
        matchType: bestMatch?.explanation.matchType,
        score: bestMatch?.score,
        candidateCount: candidates.length
      });
    }
    
    if (bestMatch) {
      console.log(`[SPU匹配] ✓ 最终匹配: "${bestMatch.spu.name}", 分数: ${bestMatch.score.toFixed(2)}, 类型: ${bestMatch.explanation.matchType}`);
      
      // 日志：匹配成功
      if (this.logger) {
        console.log(`[SPU匹配] ========== 匹配成功 ==========`);
        console.log(`[SPU匹配] 匹配SPU: "${bestMatch.spu.name}" (ID: ${bestMatch.spu.id})`);
        console.log(`[SPU匹配] 匹配类型: ${bestMatch.explanation.matchType === 'exact' ? '精确匹配' : '模糊匹配'}`);
        console.log(`[SPU匹配] 匹配分数: ${bestMatch.score.toFixed(3)}`);
        console.log(`[SPU匹配] 品牌匹配: ${bestMatch.explanation.brandMatch.matched ? '✓' : '✗'} (${bestMatch.explanation.brandMatch.score.toFixed(3)})`);
        console.log(`[SPU匹配] 型号匹配: ${bestMatch.explanation.modelMatch.matched ? '✓' : '✗'} (${bestMatch.explanation.modelMatch.score.toFixed(3)})`);
        console.log(`[SPU匹配] 版本匹配: ${bestMatch.explanation.versionMatch.matched ? '✓' : '✗'} (${bestMatch.explanation.versionMatch.score.toFixed(3)})`);
        console.log(`[SPU匹配] 总耗时: ${overallDuration}ms`);
        console.log(`[SPU匹配] 匹配说明: ${bestMatch.explanation.details}`);
      }
    } else {
      console.log(`[SPU匹配] ❌ 未找到匹配`);
      
      // 日志：未找到匹配
      if (this.logger) {
        console.log(`[SPU匹配] ========== 匹配失败 ==========`);
        console.log(`[SPU匹配] 原因: 未找到符合条件的SPU`);
        console.log(`[SPU匹配] 总耗时: ${overallDuration}ms`);
      }
    }
    
    return bestMatch;
  }
  
  /**
   * 计算型号后缀匹配分数
   * 
   * 根据需求2.1, 2.2, 2.3, 2.5实现：
   * - 识别常见后缀词汇（Pro、Max、Plus、Ultra、Mini、SE、Air、Lite等）
   * - 统计输入和SPU中的后缀数量
   * - 计算匹配的后缀数量
   * - 根据匹配度和额外后缀惩罚计算分数
   * - 处理连写后缀（如"promax"识别为"pro"和"max"）
   * 
   * @param inputModel 输入型号
   * @param spuModel SPU型号
   * @returns 后缀匹配分数 (0-1)
   */
  private calculateSuffixMatchScore(
    inputModel: string,
    spuModel: string
  ): number {
    // 定义常见后缀列表 (需求 2.2)
    const suffixes = ['pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite', 'note', 'turbo'];
    
    const inputLower = inputModel.toLowerCase();
    const spuLower = spuModel.toLowerCase();
    
    // 统计输入和SPU中的后缀数量 (需求 2.3)
    let inputSuffixCount = 0;
    let spuSuffixCount = 0;
    let matchedSuffixCount = 0;
    
    for (const suffix of suffixes) {
      // 使用单词边界确保准确匹配完整后缀
      const suffixRegex = new RegExp(`\\b${suffix}\\b`, 'i');
      
      // 检查是否有单词边界的匹配
      let inInput = suffixRegex.test(inputLower);
      let inSPU = suffixRegex.test(spuLower);
      
      // 如果没有单词边界匹配，检查是否作为子串存在（处理连写情况，如"promax"）
      // 需求 2.4: 输入包含"promax"时，应识别为"Pro"和"Max"两个后缀
      if (!inInput && inputLower.includes(suffix)) {
        inInput = true;
      }
      if (!inSPU && spuLower.includes(suffix)) {
        inSPU = true;
      }
      
      if (inInput) inputSuffixCount++;
      if (inSPU) spuSuffixCount++;
      if (inInput && inSPU) matchedSuffixCount++;
    }
    
    // 如果输入没有后缀，返回0（不参与决策）
    if (inputSuffixCount === 0) {
      return 0;
    }
    
    // 计算匹配度：匹配的后缀数 / 输入的后缀数 (需求 2.1, 2.3)
    const matchRatio = matchedSuffixCount / inputSuffixCount;
    
    // 惩罚SPU有额外后缀的情况 (需求 2.5)
    const extraSuffixPenalty = Math.max(0, spuSuffixCount - inputSuffixCount) * 0.1;
    
    return Math.max(0, matchRatio - extraSuffixPenalty);
  }

  /**
   * 计算关键词覆盖率分数
   * 
   * 根据需求4.1, 4.2, 4.3实现：
   * - 使用tokenize函数提取输入关键词
   * - 统计SPU名称中包含的关键词数量
   * - 计算覆盖率（覆盖数/总数）
   * 
   * @param inputModel 输入型号
   * @param spuName SPU名称
   * @param tokenize 分词函数
   * @returns 关键词覆盖率分数 (0-1)
   */
  private calculateKeywordCoverageScore(
    inputModel: string,
    spuName: string,
    tokenize: (str: string) => string[]
  ): number {
    // 使用tokenize函数提取输入关键词 (需求 4.2)
    const inputTokens = tokenize(inputModel);
    const spuLower = spuName.toLowerCase();
    
    // 过滤出长度大于2的有效token
    const validTokens = inputTokens.filter(token => token.length > 2);
    
    // 如果没有有效token，返回0
    if (validTokens.length === 0) {
      return 0;
    }
    
    let coveredCount = 0;
    
    // 统计SPU名称中包含的关键词数量 (需求 4.1, 4.3)
    for (const token of validTokens) {
      if (spuLower.includes(token)) {
        coveredCount++;
      }
    }
    
    // 计算覆盖率：覆盖的关键词数 / 有效关键词数 (需求 4.3)
    return coveredCount / validTokens.length;
  }

  /**
   * 计算长度匹配分数
   * 
   * 根据需求3.1, 3.4实现：
   * - 比较输入和SPU型号的长度
   * - 对过短或过长的SPU降低分数
   * - 对长度接近的SPU给予高分
   * 
   * @param inputModel 输入型号
   * @param spuModel SPU型号
   * @returns 长度匹配分数 (0-1)
   */
  private calculateLengthMatchScore(
    inputModel: string,
    spuModel: string
  ): number {
    const inputLength = inputModel.length;
    const spuLength = spuModel.length;
    
    // 如果SPU型号比输入短很多，降低分数 (需求 3.4)
    if (spuLength < inputLength * 0.5) {
      return 0.3;
    }
    
    // 如果SPU型号比输入长很多，也降低分数
    if (spuLength > inputLength * 2) {
      return 0.5;
    }
    
    // 长度接近，给高分 (需求 3.1)
    const lengthRatio = Math.min(inputLength, spuLength) / Math.max(inputLength, spuLength);
    return lengthRatio;
  }

  /**
   * 计算选择指标
   * 
   * 根据需求5.1, 5.5实现：
   * - 调用各个指标计算方法
   * - 提取SPU的品牌和型号信息
   * - 组装SelectionMetrics对象
   * 
   * @param match SPU匹配结果
   * @param inputModel 输入型号
   * @param options 匹配选项（包含提取函数和分词函数）
   * @returns 选择指标对象
   */
  private calculateSelectionMetrics(
    match: SPUMatchResult,
    inputModel?: string,
    options?: {
      extractBrand: (name: string) => string | null;
      extractModel: (name: string, brand?: string | null) => string | null;
      extractSPUPart: (name: string) => string;
      tokenize: (str: string) => string[];
    }
  ): SelectionMetrics {
    // 提取SPU的品牌和型号信息 (需求 5.1)
    const spuPart = options?.extractSPUPart(match.spu.name) || match.spu.name;
    const spuBrand = match.spu.brand || (options?.extractBrand ? options.extractBrand(spuPart) : null);
    const spuModel = options?.extractModel ? options.extractModel(spuPart, spuBrand) : null;
    
    // 如果没有输入型号或SPU型号，返回默认指标
    if (!inputModel || !spuModel) {
      return {
        spu: match.spu,
        baseScore: match.score,
        suffixMatchScore: 0,
        keywordCoverageScore: 0,
        lengthMatchScore: 0,
        finalScore: match.score
      };
    }
    
    // 调用各个指标计算方法 (需求 5.1, 5.5)
    const suffixMatchScore = this.calculateSuffixMatchScore(inputModel, spuModel);
    
    const keywordCoverageScore = options?.tokenize 
      ? this.calculateKeywordCoverageScore(inputModel, match.spu.name, options.tokenize)
      : 0;
    
    const lengthMatchScore = this.calculateLengthMatchScore(inputModel, spuModel);
    
    // 计算综合分数（用于日志和调试）
    // 综合分数 = 基础分数 + 各维度分数的加权和
    const finalScore = match.score + 
      (suffixMatchScore * 0.3) + 
      (keywordCoverageScore * 0.2) + 
      (lengthMatchScore * 0.1);
    
    // 组装SelectionMetrics对象 (需求 5.1)
    return {
      spu: match.spu,
      baseScore: match.score,
      suffixMatchScore,
      keywordCoverageScore,
      lengthMatchScore,
      finalScore
    };
  }

  /**
   * 多层次决策逻辑
   * 
   * 根据需求5.1, 5.2, 5.3, 5.4, 6.1, 6.3实现：
   * - 第1层：型号后缀匹配
   * - 第2层：关键词覆盖率
   * - 第3层：长度匹配
   * - 第4层：名称最短（回退）
   * - 每层添加日志输出
   * - 记录使用的决策层并更新匹配解释
   * 
   * @param metrics 选择指标数组
   * @param matches 原始匹配结果数组
   * @returns 最佳匹配结果（包含增强的解释信息）
   */
  private selectByMultiLayerDecision(
    metrics: SelectionMetrics[],
    matches: SPUMatchResult[]
  ): SPUMatchResult {
    let candidates = metrics;
    let decisionLayer = '';
    let decisionDetails = '';
    
    console.log(`[SPU选择] ========== 多层次决策过程 ==========`);
    
    // 第1层：型号后缀匹配 (需求 5.1, 5.2)
    console.log(`[SPU选择] 【第1层】型号后缀匹配`);
    const maxSuffixScore = Math.max(...candidates.map(m => m.suffixMatchScore));
    console.log(`[SPU选择]   最高后缀分数: ${maxSuffixScore.toFixed(3)}`);
    
    if (maxSuffixScore > 0) {
      const suffixFiltered = candidates.filter(m => 
        Math.abs(m.suffixMatchScore - maxSuffixScore) < 0.001
      );
      
      console.log(`[SPU选择]   后缀分数达到最高的候选: ${suffixFiltered.length}个`);
      for (const candidate of suffixFiltered) {
        console.log(`[SPU选择]     - "${candidate.spu.name}": 后缀分数=${candidate.suffixMatchScore.toFixed(3)}`);
      }
      
      if (suffixFiltered.length === 1) {
        const selected = suffixFiltered[0];
        decisionLayer = '型号后缀匹配';
        decisionDetails = `通过型号后缀匹配选择（后缀分数: ${maxSuffixScore.toFixed(3)}）`;
        
        console.log(`[SPU选择]   ✓ 决策完成: 选择 "${selected.spu.name}"`);
        console.log(`[SPU选择]   决策原因: ${decisionDetails}`);
        console.log(`[SPU选择]   各维度评分: 后缀=${selected.suffixMatchScore.toFixed(3)}, 覆盖率=${selected.keywordCoverageScore.toFixed(3)}, 长度=${selected.lengthMatchScore.toFixed(3)}`);
        console.log(`[SPU选择] ========================================`);
        
        const result = matches.find(m => m.spu.id === selected.spu.id)!;
        result.explanation.details = this.enhanceExplanationDetails(result.explanation.details, decisionLayer, decisionDetails, selected);
        return result;
      }
      
      if (suffixFiltered.length < candidates.length) {
        console.log(`[SPU选择]   → 候选从${candidates.length}个缩减到${suffixFiltered.length}个`);
        candidates = suffixFiltered;
      } else {
        console.log(`[SPU选择]   → 无法区分，进入下一层决策`);
      }
    } else {
      console.log(`[SPU选择]   → 所有候选后缀分数为0，跳过此层`);
    }
    
    // 第2层：关键词覆盖率 (需求 5.2, 5.3)
    console.log(`[SPU选择] 【第2层】关键词覆盖率`);
    const maxCoverageScore = Math.max(...candidates.map(m => m.keywordCoverageScore));
    console.log(`[SPU选择]   最高覆盖率: ${maxCoverageScore.toFixed(3)}`);
    
    const coverageFiltered = candidates.filter(m => 
      Math.abs(m.keywordCoverageScore - maxCoverageScore) < 0.001
    );
    
    console.log(`[SPU选择]   覆盖率达到最高的候选: ${coverageFiltered.length}个`);
    for (const candidate of coverageFiltered) {
      console.log(`[SPU选择]     - "${candidate.spu.name}": 覆盖率=${candidate.keywordCoverageScore.toFixed(3)}`);
    }
    
    if (coverageFiltered.length === 1) {
      const selected = coverageFiltered[0];
      decisionLayer = '关键词覆盖率';
      decisionDetails = `通过关键词覆盖率选择（覆盖率: ${maxCoverageScore.toFixed(3)}）`;
      
      console.log(`[SPU选择]   ✓ 决策完成: 选择 "${selected.spu.name}"`);
      console.log(`[SPU选择]   决策原因: ${decisionDetails}`);
      console.log(`[SPU选择]   各维度评分: 后缀=${selected.suffixMatchScore.toFixed(3)}, 覆盖率=${selected.keywordCoverageScore.toFixed(3)}, 长度=${selected.lengthMatchScore.toFixed(3)}`);
      console.log(`[SPU选择] ========================================`);
      
      const result = matches.find(m => m.spu.id === selected.spu.id)!;
      result.explanation.details = this.enhanceExplanationDetails(result.explanation.details, decisionLayer, decisionDetails, selected);
      return result;
    }
    
    if (coverageFiltered.length < candidates.length) {
      console.log(`[SPU选择]   → 候选从${candidates.length}个缩减到${coverageFiltered.length}个`);
      candidates = coverageFiltered;
    } else {
      console.log(`[SPU选择]   → 无法区分，进入下一层决策`);
    }
    
    // 第3层：长度匹配 (需求 5.2, 5.3)
    console.log(`[SPU选择] 【第3层】长度匹配`);
    const maxLengthScore = Math.max(...candidates.map(m => m.lengthMatchScore));
    console.log(`[SPU选择]   最高长度分数: ${maxLengthScore.toFixed(3)}`);
    
    const lengthFiltered = candidates.filter(m => 
      Math.abs(m.lengthMatchScore - maxLengthScore) < 0.001
    );
    
    console.log(`[SPU选择]   长度分数达到最高的候选: ${lengthFiltered.length}个`);
    for (const candidate of lengthFiltered) {
      console.log(`[SPU选择]     - "${candidate.spu.name}": 长度分数=${candidate.lengthMatchScore.toFixed(3)}, 名称长度=${candidate.spu.name.length}`);
    }
    
    if (lengthFiltered.length === 1) {
      const selected = lengthFiltered[0];
      decisionLayer = '长度匹配';
      decisionDetails = `通过长度匹配选择（长度分数: ${maxLengthScore.toFixed(3)}）`;
      
      console.log(`[SPU选择]   ✓ 决策完成: 选择 "${selected.spu.name}"`);
      console.log(`[SPU选择]   决策原因: ${decisionDetails}`);
      console.log(`[SPU选择]   各维度评分: 后缀=${selected.suffixMatchScore.toFixed(3)}, 覆盖率=${selected.keywordCoverageScore.toFixed(3)}, 长度=${selected.lengthMatchScore.toFixed(3)}`);
      console.log(`[SPU选择] ========================================`);
      
      const result = matches.find(m => m.spu.id === selected.spu.id)!;
      result.explanation.details = this.enhanceExplanationDetails(result.explanation.details, decisionLayer, decisionDetails, selected);
      return result;
    }
    
    if (lengthFiltered.length < candidates.length) {
      console.log(`[SPU选择]   → 候选从${candidates.length}个缩减到${lengthFiltered.length}个`);
      candidates = lengthFiltered;
    } else {
      console.log(`[SPU选择]   → 无法区分，进入最终回退决策`);
    }
    
    // 第4层：选择名称最短的（最精确）(需求 5.4)
    console.log(`[SPU选择] 【第4层】名称最短（回退决策）`);
    const shortest = candidates.reduce((min, curr) => 
      curr.spu.name.length < min.spu.name.length ? curr : min
    );
    
    decisionLayer = '名称最短';
    decisionDetails = `通过名称最短选择（名称长度: ${shortest.spu.name.length}）`;
    
    console.log(`[SPU选择]   候选名称长度:`);
    for (const candidate of candidates) {
      const marker = candidate.spu.id === shortest.spu.id ? '✓' : ' ';
      console.log(`[SPU选择]     ${marker} "${candidate.spu.name}": 长度=${candidate.spu.name.length}`);
    }
    console.log(`[SPU选择]   ✓ 决策完成: 选择 "${shortest.spu.name}"`);
    console.log(`[SPU选择]   决策原因: ${decisionDetails}`);
    console.log(`[SPU选择]   各维度评分: 后缀=${shortest.suffixMatchScore.toFixed(3)}, 覆盖率=${shortest.keywordCoverageScore.toFixed(3)}, 长度=${shortest.lengthMatchScore.toFixed(3)}`);
    console.log(`[SPU选择] ========================================`);
    
    const result = matches.find(m => m.spu.id === shortest.spu.id)!;
    result.explanation.details = this.enhanceExplanationDetails(result.explanation.details, decisionLayer, decisionDetails, shortest);
    return result;
  }

  /**
   * 增强匹配解释详情
   * 
   * 根据需求6.1, 6.3实现：
   * - 在原有解释基础上添加决策层信息
   * - 包含各维度的评分
   * - 生成详细的选择原因说明
   * 
   * @param originalDetails 原始解释详情
   * @param decisionLayer 使用的决策层
   * @param decisionDetails 决策详情
   * @param metrics 选择指标
   * @returns 增强后的解释详情
   */
  private enhanceExplanationDetails(
    originalDetails: string,
    decisionLayer: string,
    decisionDetails: string,
    metrics: SelectionMetrics
  ): string {
    // 构建维度评分说明
    const dimensionScores = [
      `型号后缀匹配: ${metrics.suffixMatchScore.toFixed(3)}`,
      `关键词覆盖率: ${metrics.keywordCoverageScore.toFixed(3)}`,
      `长度匹配: ${metrics.lengthMatchScore.toFixed(3)}`
    ].join(', ');
    
    // 组合原始解释和增强信息
    const enhancedDetails = [
      originalDetails,
      `多层次决策: ${decisionDetails}`,
      `维度评分 [${dimensionScores}]`
    ].filter(Boolean).join('; ');
    
    return enhancedDetails;
  }

  /**
   * 从匹配列表中选择最佳匹配
   * 
   * 增强的选择逻辑 (需求 2.1, 3.5, 4.4, 5.1, 7.1, 7.2)：
   * 1. 分数不同时，选择分数最高的（向后兼容）
   * 2. 分数相同时，应用多层次决策逻辑
   * 
   * @param matches 匹配结果数组
   * @param inputModel 输入型号
   * @param options 匹配选项
   * @returns 最佳匹配结果
   */
  private selectBestMatch(
    matches: SPUMatchResult[], 
    inputModel?: string,
    options?: {
      extractBrand: (name: string) => string | null;
      extractModel: (name: string, brand?: string | null) => string | null;
      extractSPUPart: (name: string) => string;
      tokenize: (str: string) => string[];
    }
  ): SPUMatchResult {
    // 如果只有一个候选，直接返回 (需求 7.1)
    if (matches.length === 1) {
      return matches[0];
    }
    
    // 找出最高分数 (需求 7.1, 7.2)
    const maxScore = Math.max(...matches.map(m => m.score));
    
    // 过滤出所有最高分的候选
    const topMatches = matches.filter(m => Math.abs(m.score - maxScore) < 0.001);
    
    // 如果只有一个最高分候选，直接返回 (需求 7.1)
    if (topMatches.length === 1) {
      return topMatches[0];
    }
    
    // 如果有多个相同分数的候选，应用增强选择逻辑 (需求 5.1)
    console.log(`[SPU选择] 发现${topMatches.length}个相同分数(${maxScore.toFixed(3)})的候选，应用增强选择逻辑`);
    
    // 如果没有输入型号或选项，使用简化逻辑
    if (!inputModel || !options) {
      console.log(`[SPU选择] 缺少输入型号或选项，使用简化选择逻辑`);
      return topMatches.reduce((best, current) => {
        // 优先级更高
        if (current.priority && best.priority && current.priority > best.priority) {
          return current;
        }
        // 名称更短
        if (current.spu.name.length < best.spu.name.length) {
          return current;
        }
        return best;
      });
    }
    
    // 计算每个候选的选择指标 (需求 5.1)
    const metrics = topMatches.map(match => 
      this.calculateSelectionMetrics(match, inputModel, options)
    );
    
    // 输出所有候选的指标（用于调试）(需求 6.2, 6.4)
    console.log(`[SPU选择] ========== 候选SPU详细评分 ==========`);
    console.log(`[SPU选择] 输入型号: "${inputModel}"`);
    console.log(`[SPU选择] 候选数量: ${metrics.length}`);
    console.log(`[SPU选择] 基础分数: ${maxScore.toFixed(3)}`);
    console.log(`[SPU选择] ---`);
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];
      console.log(`[SPU选择] 候选 ${i + 1}: "${metric.spu.name}" (ID: ${metric.spu.id})`);
      console.log(`[SPU选择]   - 基础分数: ${metric.baseScore.toFixed(3)}`);
      console.log(`[SPU选择]   - 型号后缀匹配: ${metric.suffixMatchScore.toFixed(3)}`);
      console.log(`[SPU选择]   - 关键词覆盖率: ${metric.keywordCoverageScore.toFixed(3)}`);
      console.log(`[SPU选择]   - 长度匹配: ${metric.lengthMatchScore.toFixed(3)}`);
      console.log(`[SPU选择]   - 综合分数: ${metric.finalScore.toFixed(3)}`);
    }
    console.log(`[SPU选择] ========================================`);
    
    // 应用多层次决策 (需求 5.1, 5.2, 5.3, 5.4)
    console.log(`[SPU选择] 开始多层次决策...`);
    return this.selectByMultiLayerDecision(metrics, topMatches);
  }
  
  /**
   * 检查SPU名称是否包含特殊后缀（Pro、Max、Plus、Ultra等）
   */
  private hasSPUSuffix(spuName: string): boolean {
    const suffixes = ['Pro', 'Max', 'Plus', 'Ultra', 'Mini', 'SE', 'Air', 'Lite', 'Note', 'Turbo'];
    const lowerName = spuName.toLowerCase();
    
    for (const suffix of suffixes) {
      const regex = new RegExp(`\\b${suffix.toLowerCase()}\\b`, 'i');
      if (regex.test(lowerName)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取品牌索引统计信息
   */
  getBrandIndexStats(): { totalBrands: number; totalSPUs: number } {
    let totalSPUs = 0;
    const spuSet = new Set<number>();
    
    for (const spus of this.spuIndexByBrand.values()) {
      spus.forEach(spu => spuSet.add(spu.id));
    }
    
    return {
      totalBrands: this.spuIndexByBrand.size,
      totalSPUs: spuSet.size
    };
  }
  
  /**
   * 获取型号索引统计信息
   */
  getModelIndexStats(): { totalModels: number; totalSPUs: number } {
    let totalSPUs = 0;
    const spuSet = new Set<number>();
    
    for (const spus of this.spuIndexByModel.values()) {
      spus.forEach(spu => spuSet.add(spu.id));
    }
    
    return {
      totalModels: this.spuIndexByModel.size,
      totalSPUs: spuSet.size
    };
  }
}
