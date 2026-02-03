/**
 * 共享类型定义
 * 用于 SPU/SKU 匹配服务
 */

import type { SPUData, SKUData, VersionInfo, ProductType, EnhancedSPUData } from '../types';

/**
 * 匹配解释
 */
export interface MatchExplanation {
  matchType: 'exact' | 'fuzzy' | 'semantic';
  brandMatch: { matched: boolean; score: number };
  modelMatch: { matched: boolean; score: number };
  versionMatch: { matched: boolean; score: number };
  details: string; // 详细说明
}

/**
 * SPU 匹配结果
 * 
 * Requirements: 2.4.1, 2.4.2 - 使用增强的SPU数据进行匹配
 */
export interface SPUMatchResult {
  spu: EnhancedSPUData;
  score: number;
  explanation: MatchExplanation;
  priority?: number; // SPU 优先级（标准版 > 版本匹配 > 其他）
}

/**
 * SKU 匹配结果
 */
export interface SKUMatchResult {
  sku: SKUData | null;
  score: number;
  specMatches: {
    color?: { matched: boolean; score: number };
    capacity?: { matched: boolean; score: number };
    version?: { matched: boolean; score: number };
    watchSize?: { matched: boolean; score: number };
    watchBand?: { matched: boolean; score: number };
    [key: string]: { matched: boolean; score: number } | undefined;
  };
}

/**
 * SPU 选择指标
 * 
 * 用于多层次决策逻辑，当多个候选SPU具有相同基础匹配分数时，
 * 通过多个维度的评分来选择最佳匹配。
 * 
 * Requirements: 5.1 - 综合评分机制
 * 
 * @interface SelectionMetrics
 * @property {EnhancedSPUData} spu - SPU数据
 * @property {number} baseScore - 基础匹配分数 (0-1)
 * @property {number} suffixMatchScore - 型号后缀匹配分数 (0-1)
 *   - 识别常见后缀（Pro、Max、Plus、Ultra、Mini、SE、Air、Lite等）
 *   - 计算输入和SPU中匹配的后缀数量
 *   - 根据匹配度和额外后缀惩罚计算分数
 * @property {number} keywordCoverageScore - 关键词覆盖率分数 (0-1)
 *   - 统计SPU名称中包含的输入关键词数量
 *   - 计算覆盖率（覆盖数/总数）
 * @property {number} lengthMatchScore - 长度匹配分数 (0-1)
 *   - 比较输入和SPU型号的长度
 *   - 对过短或过长的SPU降低分数
 *   - 对长度接近的SPU给予高分
 * @property {number} finalScore - 综合分数（用于日志和调试）
 *   - 综合考虑所有维度的最终评分
 */
export interface SelectionMetrics {
  spu: EnhancedSPUData;
  baseScore: number;
  suffixMatchScore: number;
  keywordCoverageScore: number;
  lengthMatchScore: number;
  finalScore: number;
}

/**
 * 提取结果（带置信度）
 */
export interface ExtractionResult<T> {
  value: T | null;
  confidence: number; // 0-1
  source: 'exact' | 'fuzzy' | 'inferred'; // 提取方式
}

/**
 * 提取的信息
 */
export interface ExtractedInfo {
  // 原始输入
  originalInput: string;
  
  // 预处理后的输入
  preprocessedInput: string;
  
  // 提取的信息
  brand: ExtractionResult<string>;
  model: ExtractionResult<string>;
  color: ExtractionResult<string>;
  capacity: ExtractionResult<string>;
  version: ExtractionResult<VersionInfo>;
  
  // 产品类型
  productType: string;
  
  // 其他规格（可扩展）
  additionalSpecs?: Map<string, ExtractionResult<string>>;
}

// Re-export types for convenience
export type { SPUData, SKUData, VersionInfo, ProductType, EnhancedSPUData };
