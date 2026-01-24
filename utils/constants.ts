/**
 * 智能匹配相关的常量定义
 */

// 匹配权重常量
export const MATCH_WEIGHTS = {
  VERSION: 0.3,
  CAPACITY: 0.4,
  COLOR: 0.3,
} as const;

// 匹配阈值常量
export const MATCH_THRESHOLDS = {
  SPU: 0.5,
  SKU: 0.6,
  MODEL_SIMILARITY: 0.5,
} as const;

// SPU 匹配阈值（用于组件）
export const SPU_MATCH_THRESHOLD = 0.5;

// SPU 匹配分数常量
export const SPU_MATCH_SCORES = {
  BASE: 0.8,                    // 品牌+型号匹配的基础分
  VERSION_EXACT: 1.0,           // 版本完全匹配
  VERSION_MISMATCH: 0.6,        // 版本不匹配
  VERSION_PRIORITY_MATCH: 0.83, // 版本优先级匹配（0.25 / 0.3）
  NO_VERSION: 1.0,              // 都没有版本
  INPUT_VERSION_ONLY: 0.7,      // 只有输入有版本
  SPU_VERSION_ONLY: 0.9,        // 只有 SPU 有版本
  FUZZY_BASE: 0.4,              // 模糊匹配的基础分
  FUZZY_MODEL_WEIGHT: 0.6,      // 模糊匹配中型号相似度的权重
  KEYWORD_BONUS_PER_MATCH: 0.05,// 每个关键词匹配的加分
  KEYWORD_BONUS_MAX: 0.1,       // 关键词加分的最大值
} as const;

// SPU 优先级常量
export const SPU_PRIORITIES = {
  STANDARD: 3,      // 标准版（无礼盒、无特殊版本）
  VERSION_MATCH: 2, // 版本匹配的特殊版
  OTHER: 1,         // 其他情况（礼盒版等）
} as const;
