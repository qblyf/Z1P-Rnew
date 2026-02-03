/**
 * FuzzyMatcher - 模糊匹配器
 * 
 * 负责基于分词和相似度的模糊匹配逻辑
 * 匹配策略：当精确匹配失败时，使用分词和相似度算法进行模糊匹配
 */

import type { EnhancedSPUData, VersionInfo } from '../types';
import type { SPUMatchResult, MatchExplanation, ExtractedInfo } from './types';
import type { MatchLogger } from '../monitoring/MatchLogger';
import type { PerformanceMetrics } from '../monitoring/PerformanceMetrics';

// 匹配阈值常量
const MATCH_THRESHOLDS = {
  MODEL_SIMILARITY: 0.5,
} as const;

// SPU 匹配分数常量
const SPU_MATCH_SCORES = {
  FUZZY_BASE: 0.4,              // 模糊匹配的基础分
  FUZZY_MODEL_WEIGHT: 0.6,      // 模糊匹配中型号相似度的权重
  KEYWORD_BONUS_PER_MATCH: 0.05,// 每个关键词匹配的加分
  KEYWORD_BONUS_MAX: 0.1,       // 关键词加分的最大值
} as const;

// SPU 优先级常量
const SPU_PRIORITIES = {
  STANDARD: 3,      // 标准版（无礼盒、无特殊版本）
  VERSION_MATCH: 2, // 版本匹配的特殊版
  OTHER: 1,         // 其他情况（礼盒版等）
} as const;

export class FuzzyMatcher {
  private logger?: MatchLogger;
  private metrics?: PerformanceMetrics;
  
  constructor(logger?: MatchLogger) {
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
   * 查找模糊匹配的 SPU
   * 
   * @param extractedInfo 提取的信息（品牌、型号、版本等）
   * @param candidates 候选 SPU 列表
   * @param threshold 匹配阈值
   * @param options 匹配选项
   * @returns 匹配结果列表
   */
  findMatches(
    extractedInfo: ExtractedInfo,
    candidates: EnhancedSPUData[],
    threshold: number,
    options?: {
      extractBrand: (name: string) => string | null;
      extractModel: (name: string, brand?: string | null) => string | null;
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
    const originalInput = extractedInfo.originalInput;
    
    console.log(`[模糊匹配] 开始模糊匹配，候选SPU: ${candidates.length} 个`);
    
    // 日志：开始模糊匹配
    if (this.logger) {
      console.log(`[模糊匹配] 开始匹配 - 输入: "${originalInput}", 品牌: "${inputBrand}", 型号: "${inputModel}", 阈值: ${threshold}`);
    }
    
    let checkedCount = 0;
    let filteredCount = 0;
    let brandMismatchCount = 0;
    let lowSimilarityCount = 0;
    
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
      
      // 严格的品牌过滤
      const brandMatch = options?.isBrandMatch 
        ? options.isBrandMatch(inputBrand, spuBrand)
        : inputBrand === spuBrand;
      
      // 如果输入品牌识别成功，必须严格匹配
      if (inputBrand && spuBrand && !brandMatch) {
        brandMismatchCount++;
        continue;
      }
      
      // 如果输入品牌识别成功，但 SPU 品牌未识别，也应该跳过
      if (inputBrand && !spuBrand) {
        console.log(`[模糊匹配] 跳过 SPU "${spu.name}" - 输入品牌"${inputBrand}"已识别，但SPU品牌未识别`);
        brandMismatchCount++;
        continue;
      }
      
      let score = 0;
      
      // 只有在输入品牌未识别时才降低分数
      if (!inputBrand && spuBrand) {
        score = 0.3; // 输入品牌未识别，降低基础分数
      }
      
      // 计算型号相似度
      if (inputModel && spuModel && options?.tokenize) {
        const modelScore = this.calculateTokenSimilarity(
          options.tokenize(inputModel),
          options.tokenize(spuModel)
        );
        
        if (modelScore > MATCH_THRESHOLDS.MODEL_SIMILARITY) {
          score = Math.max(score, SPU_MATCH_SCORES.FUZZY_BASE + modelScore * SPU_MATCH_SCORES.FUZZY_MODEL_WEIGHT);
          
          if (score >= threshold) {
            const priority = options?.getSPUPriority 
              ? options.getSPUPriority(originalInput, spu.name)
              : SPU_PRIORITIES.STANDARD;
            
            // 计算关键词加分
            const keywordBonus = options?.tokenize 
              ? this.calculateKeywordBonus(originalInput, spu.name, options.tokenize)
              : 0;
            
            const finalScore = Math.min(score + keywordBonus, 1.0);
            
            // 创建匹配解释
            const explanation: MatchExplanation = {
              matchType: 'fuzzy',
              brandMatch: { 
                matched: brandMatch, 
                score: brandMatch ? 1.0 : (inputBrand ? 0 : 0.3) 
              },
              modelMatch: { 
                matched: modelScore > MATCH_THRESHOLDS.MODEL_SIMILARITY, 
                score: modelScore 
              },
              versionMatch: { matched: false, score: 0 },
              details: this.generateExplanation(inputBrand, inputModel, spuBrand, spuModel, modelScore, score, keywordBonus)
            };
            
            console.log(`[模糊匹配] ✓ 找到匹配: "${spu.name}", 型号相似度: ${modelScore.toFixed(2)}, 基础分: ${score.toFixed(2)}, 关键词加分: ${keywordBonus.toFixed(2)}, 最终分数: ${finalScore.toFixed(2)}`);
            
            matches.push({
              spu,
              score: finalScore,
              explanation,
              priority
            });
          } else {
            lowSimilarityCount++;
          }
        } else {
          lowSimilarityCount++;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[模糊匹配] 找到 ${matches.length} 个模糊匹配`);
    
    // 日志：模糊匹配结果
    if (this.logger) {
      console.log(`[模糊匹配] 完成 - 找到${matches.length}个匹配, 耗时${duration}ms`);
      console.log(`[模糊匹配] 详细统计: 检查${checkedCount}个, 过滤${filteredCount}个, 品牌不匹配${brandMismatchCount}个, 相似度过低${lowSimilarityCount}个`);
    }
    
    return matches.sort((a, b) => b.score - a.score);
  }
  
  /**
   * 计算两个词汇列表的相似度
   * 
   * 根据需求1.1和1.5实现：
   * - 为每个token对计算最佳匹配分数
   * - 使用新的calculateTokenMatchScore方法
   * - 返回平均分数
   * 
   * 策略：计算双向匹配的平均值
   * - 从tokens1到tokens2的匹配度
   * - 从tokens2到tokens1的匹配度
   * - 取两者的平均值，确保对称性和公平性
   * 
   * @param tokens1 第一个词汇列表
   * @param tokens2 第二个词汇列表
   * @returns 相似度分数 (0-1)
   */
  private calculateTokenSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }
    
    // 计算从tokens1到tokens2的匹配度
    let score1to2 = 0;
    for (const token1 of tokens1) {
      let bestMatchScore = 0;
      for (const token2 of tokens2) {
        const matchScore = this.calculateTokenMatchScore(token1, token2);
        bestMatchScore = Math.max(bestMatchScore, matchScore);
      }
      score1to2 += bestMatchScore;
    }
    score1to2 = score1to2 / tokens1.length;
    
    // 计算从tokens2到tokens1的匹配度
    let score2to1 = 0;
    for (const token2 of tokens2) {
      let bestMatchScore = 0;
      for (const token1 of tokens1) {
        const matchScore = this.calculateTokenMatchScore(token2, token1);
        bestMatchScore = Math.max(bestMatchScore, matchScore);
      }
      score2to1 += bestMatchScore;
    }
    score2to1 = score2to1 / tokens2.length;
    
    // 返回双向匹配的平均值
    return (score1to2 + score2to1) / 2;
  }
  
  /**
   * 计算两个token之间的匹配分数
   * 
   * 根据需求1.1-1.4实现：
   * - 完全匹配返回1.0
   * - 部分匹配根据长度比例计算分数（最高0.7）
   * - 长输入包含短SPU时得分较低
   * 
   * @param token1 第一个token
   * @param token2 第二个token
   * @returns 匹配分数 (0-1)
   */
  private calculateTokenMatchScore(token1: string, token2: string): number {
    // 完全匹配 (需求 1.2)
    if (token1 === token2) {
      return 1.0;
    }
    
    // 部分匹配 (需求 1.3, 1.4)
    const longer = token1.length > token2.length ? token1 : token2;
    const shorter = token1.length > token2.length ? token2 : token1;
    
    if (longer.includes(shorter)) {
      // 根据长度差异给予部分分数
      // 例如："17promax"包含"17" → 2/9 ≈ 0.22 * 0.7 = 0.15
      // 例如："promax"包含"pro" → 3/6 = 0.5 * 0.7 = 0.35
      const lengthRatio = shorter.length / longer.length;
      return lengthRatio * 0.7; // 最高0.7分 (需求 1.3)
    }
    
    // 不匹配
    return 0;
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
   * 生成匹配解释
   */
  private generateExplanation(
    inputBrand: string | null,
    inputModel: string | null,
    spuBrand: string | null,
    spuModel: string | null,
    modelScore: number,
    baseScore: number,
    keywordBonus: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`模糊匹配：SPU品牌="${spuBrand}", SPU型号="${spuModel}"`);
    
    if (inputBrand && spuBrand) {
      parts.push(`品牌匹配：输入="${inputBrand}", SPU="${spuBrand}"`);
    } else if (!inputBrand) {
      parts.push(`输入品牌未识别`);
    }
    
    if (inputModel && spuModel) {
      parts.push(`型号相似度：${(modelScore * 100).toFixed(0)}%`);
    }
    
    if (keywordBonus > 0) {
      parts.push(`关键词匹配加分：+${keywordBonus.toFixed(2)}`);
    }
    
    parts.push(`基础分：${baseScore.toFixed(2)}`);
    
    return parts.join('; ');
  }
}
