/**
 * 共享类型定义
 * 用于 SPU/SKU 匹配服务
 */

import type { SPUData, SKUData, VersionInfo, ProductType } from '../types';

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
 */
export interface SPUMatchResult {
  spu: SPUData;
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
export type { SPUData, SKUData, VersionInfo, ProductType };
