/**
 * ExactMatcher - 精确匹配器
 * 
 * 负责基于品牌和型号的精确匹配逻辑
 * 匹配策略：品牌必须完全匹配，型号必须完全匹配（标准化后）
 */

import type { SPUData, VersionInfo } from '../types';
import type { SPUMatchResult, MatchExplanation, ExtractedInfo } from './types';
import { VersionMatcher } from './VersionMatcher';
import type { MatchLogger } from '../monitoring/MatchLogger';
import type { PerformanceMetrics } from '../monitoring/PerformanceMetrics';

// SPU 匹配分数常量
const SPU_MATCH_SCORES = {
  BASE: 0.8,                    // 品牌+型号匹配的基础分
  KEYWORD_BONUS_PER_MATCH: 0.05,// 每个关键词匹配的加分
  KEYWORD_BONUS_MAX: 0.1,       // 关键词加分的最大值
  MODEL_DETAIL_BONUS_MAX: 0.15, // 型号详细度加分的最大值
} as const;

// SPU 优先级常量
const SPU_PRIORITIES = {
  STANDARD: 3,      // 标准版（无礼盒、无特殊版本）
  VERSION_MATCH: 2, // 版本匹配的特殊版
  OTHER: 1,         // 其他情况（礼盒版等）
} as const;

export class ExactMatcher {
  private versionMatcher: VersionMatcher;
  private logger?: MatchLogger;
  private metrics?: PerformanceMetrics;
  
  constructor(logger?: MatchLogger) {
    this.versionMatcher = new VersionMatcher();
    this.logger = logger;
  }
  
  /**
   * 设置日志记录器
   */
  setLogger(logger: MatchLogger) {
    this.logger = logger;
  }
  
  /**
   * 设置性能指标收集器
   */
  setMetrics(metrics: PerformanceMetrics) {
    this.metrics = metrics;
  }
  
  /**
   * 查找精确匹配的 SPU
   * 
   * @param extractedInfo 提取的信息（品牌、型号、版本等）
   * @param candidates 候选 SPU 列表
   * @param options 匹配选项
   * @returns 匹配结果列表
   */
  findMatches(
    extractedInfo: ExtractedInfo,
    candidates: SPUData[],
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
  ): SPUMatchResult[] {
    const startTime = Date.now();
    const matches: SPUMatchResult[] = [];
    
    const inputBrand = extractedInfo.brand.value;
    const inputModel = extractedInfo.model.value;
    const inputVersion = extractedInfo.version.value;
    const originalInput = extractedInfo.originalInput;
    
    // 调试信息
    const inputModelNormalized = inputModel?.toLowerCase().replace(/\s+/g, '');
    console.log(`[精确匹配] 输入型号标准化: "${inputModel}" -> "${inputModelNormalized}"`);
    
    // 日志：开始精确匹配
    if (this.logger) {
      console.log(`[精确匹配] 开始匹配 - 输入: "${originalInput}", 品牌: "${inputBrand}", 型号: "${inputModel}", 候选SPU: ${candidates.length}个`);
    }
    
    let checkedCount = 0;
    let filteredCount = 0;
    let brandMismatchCount = 0;
    let modelMismatchCount = 0;
    
    for (const spu of candidates) {
      checkedCount++;
      
      // 过滤不符合条件的 SPU
      if (options?.shouldFilterSPU && options.shouldFilterSPU(originalInput, spu.name)) {
        filteredCount++;
        continue;
      }
      
      // 提取 SPU 信息
      const spuSPUPart = options?.extractSPUPart ? options.extractSPUPart(spu.name) : spu.name;
      const spuBrand = spu.brand || (options?.extractBrand ? options.extractBrand(spuSPUPart) : null);
      const spuModel = options?.extractModel ? options.extractModel(spuSPUPart, spuBrand) : null;
      const spuVersion = options?.extractVersion ? options.extractVersion(spuSPUPart) : null;
      
      // 品牌匹配检查
      const brandMatch = options?.isBrandMatch 
        ? options.isBrandMatch(inputBrand, spuBrand)
        : inputBrand === spuBrand;
      
      if (!brandMatch) {
        brandMismatchCount++;
        continue;
      }
      
      // 型号匹配检查（标准化后比较）
      const modelMatch = inputModel && spuModel && 
        this.normalizeForComparison(inputModel) === this.normalizeForComparison(spuModel);
      
      if (!modelMatch) {
        if (spuModel) {
          modelMismatchCount++;
        }
        continue;
      }
      
      // 计算匹配分数
      const versionMatchResult = this.versionMatcher.match(inputVersion, spuVersion);
      const baseScore = versionMatchResult.score;
      const priority = options?.getSPUPriority 
        ? options.getSPUPriority(originalInput, spu.name)
        : SPU_PRIORITIES.STANDARD;
      
      // 计算加分项
      const keywordBonus = options?.tokenize 
        ? this.calculateKeywordBonus(originalInput, spu.name, options.tokenize)
        : 0;
      const modelDetailBonus = this.calculateModelDetailBonus(inputModel, spuModel);
      
      const finalScore = Math.min(baseScore + keywordBonus + modelDetailBonus, 1.0);
      
      // 创建匹配解释
      const explanation: MatchExplanation = {
        matchType: 'exact',
        brandMatch: { matched: true, score: 1.0 },
        modelMatch: { matched: true, score: 1.0 },
        versionMatch: { 
          matched: versionMatchResult.matched, 
          score: versionMatchResult.score 
        },
        details: this.generateExplanation(
          inputBrand, 
          inputModel, 
          inputVersion, 
          spuBrand, 
          spuModel, 
          spuVersion, 
          versionMatchResult,
          baseScore, 
          keywordBonus, 
          modelDetailBonus
        )
      };
      
      console.log(`[精确匹配] ✓ 找到匹配: "${spu.name}", 版本匹配: ${versionMatchResult.matchType}, 基础分: ${baseScore.toFixed(2)}, 关键词加分: ${keywordBonus.toFixed(2)}, 型号详细度加分: ${modelDetailBonus.toFixed(2)}, 最终分数: ${finalScore.toFixed(2)}`);
      console.log(`[精确匹配]   版本说明: ${versionMatchResult.explanation}`);
      
      matches.push({
        spu,
        score: finalScore,
        explanation,
        priority
      });
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[精确匹配] 统计: 检查${checkedCount}个, 过滤${filteredCount}个, 品牌不匹配${brandMismatchCount}个, 型号不匹配${modelMismatchCount}个`);
    
    // 日志：精确匹配结果
    if (this.logger) {
      console.log(`[精确匹配] 完成 - 找到${matches.length}个匹配, 耗时${duration}ms`);
      console.log(`[精确匹配] 详细统计: 检查${checkedCount}个, 过滤${filteredCount}个, 品牌不匹配${brandMismatchCount}个, 型号不匹配${modelMismatchCount}个`);
    }
    
    return matches.sort((a, b) => b.score - a.score);
  }
  
  /**
   * 标准化字符串用于比较（移除所有空格和特殊字符）
   */
  private normalizeForComparison(str: string): string {
    return str.toLowerCase().replace(/[\s\-_]/g, '');
  }
  
  /**
   * 计算关键词匹配加分
   */
  private calculateKeywordBonus(
    input: string,
    spuName: string,
    tokenize: (str: string) => string[]
  ): number {
    let keywordMatchCount = 0;
    const inputTokens = tokenize(input);
    const lowerSPUName = spuName.toLowerCase();
    
    for (const token of inputTokens) {
      if (token.length > 2 && lowerSPUName.includes(token)) {
        keywordMatchCount++;
      }
    }
    
    return Math.min(
      keywordMatchCount * SPU_MATCH_SCORES.KEYWORD_BONUS_PER_MATCH,
      SPU_MATCH_SCORES.KEYWORD_BONUS_MAX
    );
  }
  
  /**
   * 计算型号详细度加分
   * 如果输入包含更详细的型号信息（如型号代码、特殊标识），给予加分
   */
  private calculateModelDetailBonus(
    inputModel: string | null,
    spuModel: string | null
  ): number {
    if (!inputModel || !spuModel) return 0;
    
    const lowerInput = inputModel.toLowerCase();
    const lowerSPU = spuModel.toLowerCase();
    
    let bonus = 0;
    
    // 如果输入包含型号代码（如 RTS-AL00），且SPU也包含，给予加分
    const modelCodePattern = /[a-z]{3}-[a-z]{2}\d{2}/i;
    const inputHasCode = modelCodePattern.test(lowerInput);
    const spuHasCode = modelCodePattern.test(lowerSPU);
    
    if (inputHasCode && spuHasCode) {
      const inputCode = lowerInput.match(modelCodePattern)?.[0];
      const spuCode = lowerSPU.match(modelCodePattern)?.[0];
      if (inputCode === spuCode) {
        bonus += 0.1; // 型号代码完全匹配，加10分
      }
    }
    
    // 如果输入包含特殊标识（如"十周年款"），且SPU也包含，给予加分
    const specialKeywords = ['十周年', '周年', '纪念版', '限量版', '特别版'];
    for (const keyword of specialKeywords) {
      if (lowerInput.includes(keyword) && lowerSPU.includes(keyword)) {
        bonus += 0.05; // 特殊标识匹配，加5分
      }
    }
    
    return Math.min(bonus, SPU_MATCH_SCORES.MODEL_DETAIL_BONUS_MAX);
  }
  
  /**
   * 生成匹配解释
   */
  private generateExplanation(
    inputBrand: string | null,
    inputModel: string | null,
    inputVersion: VersionInfo | null,
    spuBrand: string | null,
    spuModel: string | null,
    spuVersion: VersionInfo | null,
    versionMatchResult: { matched: boolean; score: number; matchType: string; explanation: string },
    baseScore: number,
    keywordBonus: number,
    modelDetailBonus: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`精确匹配：品牌="${spuBrand}", 型号="${spuModel}"`);
    
    // 使用版本匹配器的解释
    parts.push(versionMatchResult.explanation);
    
    if (keywordBonus > 0) {
      parts.push(`关键词匹配加分：+${keywordBonus.toFixed(2)}`);
    }
    
    if (modelDetailBonus > 0) {
      parts.push(`型号详细度加分：+${modelDetailBonus.toFixed(2)}`);
    }
    
    parts.push(`基础分：${baseScore.toFixed(2)}`);
    
    return parts.join('; ');
  }
}
