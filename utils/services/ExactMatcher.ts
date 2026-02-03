/**
 * ExactMatcher - 精确匹配器
 * 
 * 负责基于品牌和型号的精确匹配逻辑
 * 匹配策略：品牌必须完全匹配，型号必须完全匹配（标准化后）
 */

import type { SPUData, VersionInfo, EnhancedSPUData } from '../types';
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
   * 修改说明：
   * - 使用预处理的 EnhancedSPUData，不再需要动态提取品牌和型号
   * - 直接使用 spu.extractedBrand 和 spu.normalizedModel 进行匹配
   * - 保留必要的匹配选项（过滤、优先级、分词等）
   * 
   * Requirements: 2.4.1, 2.4.2 - 确保ExactMatcher接收增强的SPU数据
   * 
   * @param extractedInfo 提取的信息（品牌、型号、版本等）
   * @param candidates 候选 SPU 列表（已预处理的增强数据）
   * @param options 匹配选项（不包含动态提取函数）
   * @returns 匹配结果列表
   */
  findMatches(
    extractedInfo: ExtractedInfo,
    candidates: EnhancedSPUData[],
    options?: {
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
    console.log(`[精确匹配] 输入型号（已标准化）: "${inputModel}"`);
    
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
      
      // 使用预提取的 SPU 信息（不再动态提取）
      const spuSPUPart = options?.extractSPUPart ? options.extractSPUPart(spu.name) : spu.name;
      const spuBrand = spu.extractedBrand; // 直接使用预提取的品牌
      const spuModelNorm = spu.normalizedModel; // 直接使用预提取的标准化型号
      const spuVersion = options?.extractVersion ? options.extractVersion(spuSPUPart) : null;
      
      // 调试日志：输出前5个SPU的提取结果
      if (checkedCount <= 5) {
        console.log(`[精确匹配-调试] SPU #${checkedCount}: "${spu.name}"`);
        console.log(`[精确匹配-调试]   SPU部分: "${spuSPUPart}"`);
        console.log(`[精确匹配-调试]   预提取品牌: "${spuBrand}"`);
        console.log(`[精确匹配-调试]   预提取型号: "${spu.extractedModel}"`);
        console.log(`[精确匹配-调试]   标准化型号: "${spuModelNorm}"`);
      }
      
      // 品牌匹配检查
      const brandMatch = options?.isBrandMatch 
        ? options.isBrandMatch(inputBrand, spuBrand)
        : inputBrand === spuBrand;
      
      if (!brandMatch) {
        brandMismatchCount++;
        if (checkedCount <= 5) {
          console.log(`[精确匹配-调试]   ✗ 品牌不匹配: "${inputBrand}" !== "${spuBrand}"`);
        }
        continue;
      }
      
      // 型号匹配检查（直接使用预提取的标准化型号，无需再次标准化）
      // inputModel 已经在 InfoExtractor.extractModel() 中标准化过
      // spuModelNorm 已经在 DataPreparationService.preprocessSPUs() 中标准化过
      const modelMatch = inputModel && spuModelNorm && inputModel === spuModelNorm;
      
      if (checkedCount <= 5) {
        console.log(`[精确匹配-调试]   型号比较: "${inputModel}" ${modelMatch ? '===' : '!=='} "${spuModelNorm}"`);
      }
      
      if (!modelMatch) {
        if (spuModelNorm) {
          modelMismatchCount++;
        }
        if (checkedCount <= 5) {
          console.log(`[精确匹配-调试]   ✗ 型号不匹配`);
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
      const modelDetailBonus = this.calculateModelDetailBonus(inputModel, spu.extractedModel);
      
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
          spu.extractedModel, 
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
    
    // 多级排序：分数 > 版本类型优先级 > 精简度
    // 需求: 2.5.1, 2.5.2, 2.5.3
    return matches.sort((a, b) => {
      // 1. 分数更高优先 (需求 2.5.1)
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      
      // 2. 版本类型优先级更高优先 (需求 2.5.2)
      // 标准版 > 版本匹配 > 其他（礼盒版、套装版等）
      const aPriority = a.priority ?? 0;
      const bPriority = b.priority ?? 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // 3. 精简度更小优先（名称更短、更精简） (需求 2.5.3)
      // simplicity 值越小表示越精简
      if (a.spu.simplicity !== b.spu.simplicity) {
        return a.spu.simplicity - b.spu.simplicity;
      }
      
      return 0;
    });
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
