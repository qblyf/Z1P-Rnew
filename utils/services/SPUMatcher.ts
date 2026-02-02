/**
 * SPUMatcher - SPU 匹配器
 * 
 * 协调精确匹配和模糊匹配，提供统一的 SPU 匹配接口
 * 使用品牌索引和型号索引优化查找性能
 */

import { ExactMatcher } from './ExactMatcher';
import { FuzzyMatcher } from './FuzzyMatcher';
import type { SPUData, VersionInfo, BrandData } from '../types';
import type { SPUMatchResult, ExtractedInfo } from './types';
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
  private spuIndexByBrand: Map<string, SPUData[]> = new Map();
  
  // 型号索引：型号 -> SPU 列表
  private spuIndexByModel: Map<string, SPUData[]> = new Map();
  
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
   * @param spuList SPU 列表
   * @param extractBrand 品牌提取函数
   * @param extractModel 型号提取函数
   * @param extractSPUPart SPU 部分提取函数
   */
  buildIndexes(
    spuList: SPUData[],
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
   * @param extractedInfo 提取的信息
   * @param spuList 完整的 SPU 列表（用于回退）
   * @param threshold 匹配阈值
   * @param options 匹配选项
   * @returns 最佳匹配结果
   */
  findBestMatch(
    extractedInfo: ExtractedInfo,
    spuList: SPUData[],
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
    let candidates: SPUData[];
    let usedBrandIndex = false;
    
    if (inputBrand && this.spuIndexByBrand.size > 0) {
      const brandKeys = this.getBrandKeys(inputBrand);
      const candidateSet = new Set<SPUData>();
      
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
      bestMatch = this.selectBestMatch(exactMatches, inputModel, options);
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
        const fuzzyBest = this.selectBestMatch(fuzzyMatches, inputModel, options);
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
   * 从匹配列表中选择最佳匹配
   * 
   * 选择优先级：
   * 1. 分数更高
   * 2. 优先级更高（标准版 > 版本匹配 > 其他）
   * 3. 名称更精确匹配（考虑输入和候选SPU的型号后缀）
   */
  private selectBestMatch(
    matches: SPUMatchResult[], 
    inputModel?: string,
    options?: {
      extractBrand: (name: string) => string | null;
      extractModel: (name: string, brand?: string | null) => string | null;
      extractSPUPart: (name: string) => string;
    }
  ): SPUMatchResult {
    return matches.reduce((best, current) => {
      // 优先选择分数更高的
      if (current.score > best.score) {
        return current;
      }
      
      // 分数相同时，选择优先级更高的
      if (current.score === best.score && current.priority && best.priority && current.priority > best.priority) {
        return current;
      }
      
      // 分数和优先级都相同时，考虑输入型号和候选SPU型号的后缀匹配度
      if (current.score === best.score && current.priority === best.priority && inputModel && options) {
        const inputLower = inputModel.toLowerCase();
        
        // 提取候选SPU的型号
        const currentSPUPart = options.extractSPUPart(current.spu.name);
        const currentBrand = current.spu.brand || options.extractBrand(currentSPUPart);
        const currentModel = options.extractModel(currentSPUPart, currentBrand);
        
        const bestSPUPart = options.extractSPUPart(best.spu.name);
        const bestBrand = best.spu.brand || options.extractBrand(bestSPUPart);
        const bestModel = options.extractModel(bestSPUPart, bestBrand);
        
        if (currentModel && bestModel) {
          const currentModelLower = currentModel.toLowerCase();
          const bestModelLower = bestModel.toLowerCase();
          
          // 检查常见后缀（使用单词边界确保准确匹配）
          const suffixes = ['pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite'];
          
          // 计算输入和候选SPU型号中匹配的后缀数量
          let inputSuffixCount = 0;
          let currentSuffixCount = 0;
          let bestSuffixCount = 0;
          
          for (const suffix of suffixes) {
            // 使用正则表达式确保是完整的单词，不是部分匹配
            const suffixRegex = new RegExp(`\\b${suffix}\\b`, 'i');
            
            if (suffixRegex.test(inputLower)) inputSuffixCount++;
            if (suffixRegex.test(currentModelLower)) currentSuffixCount++;
            if (suffixRegex.test(bestModelLower)) bestSuffixCount++;
          }
          
          // 优先选择后缀数量与输入更接近的SPU
          const currentDiff = Math.abs(currentSuffixCount - inputSuffixCount);
          const bestDiff = Math.abs(bestSuffixCount - inputSuffixCount);
          
          if (currentDiff < bestDiff) {
            return current;
          }
          if (currentDiff > bestDiff) {
            return best;
          }
        }
        
        // 如果后缀匹配度相同，选择名称更短的（更精确）
        if (current.spu.name.length < best.spu.name.length) {
          return current;
        }
      }
      
      return best;
    });
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
