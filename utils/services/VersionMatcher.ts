/**
 * VersionMatcher - 版本匹配器
 * 
 * 负责版本信息的匹配逻辑，提供更精确和可配置的版本匹配能力
 * 
 * 优化点：
 * 1. 统一版本匹配逻辑，消除重复代码
 * 2. 支持版本兼容性匹配（如"全网通5G"兼容"5G"）
 * 3. 提供清晰的版本匹配分数计算
 * 4. 支持版本优先级和类型的细粒度控制
 */

import type { VersionInfo } from '../types';

/**
 * 版本匹配结果
 */
export interface VersionMatchResult {
  /** 是否匹配 */
  matched: boolean;
  /** 匹配分数 (0-1) */
  score: number;
  /** 匹配类型 */
  matchType: 'exact' | 'compatible' | 'priority' | 'none' | 'input-only' | 'spu-only';
  /** 匹配说明 */
  explanation: string;
}

/**
 * 版本类型枚举
 */
export enum VersionType {
  /** 网络版本（5G、4G、蓝牙版、eSIM版等） */
  NETWORK = 'network',
  /** 标准版本（标准版、活力版、青春版等） */
  STANDARD = 'standard',
  /** 高级版本（Pro版、旗舰版、至尊版等） */
  PREMIUM = 'premium',
  /** 特殊版本（礼盒版、套装版等） */
  SPECIAL = 'special',
}

/**
 * 版本匹配配置
 */
export interface VersionMatchConfig {
  /** 完全匹配分数 */
  exactMatchScore: number;
  /** 兼容匹配分数 */
  compatibleMatchScore: number;
  /** 优先级匹配分数 */
  priorityMatchScore: number;
  /** 版本不匹配分数 */
  mismatchScore: number;
  /** 无版本匹配分数 */
  noVersionScore: number;
  /** 仅输入有版本分数 */
  inputOnlyScore: number;
  /** 仅SPU有版本分数 */
  spuOnlyScore: number;
}

/**
 * 默认版本匹配配置
 */
const DEFAULT_CONFIG: VersionMatchConfig = {
  exactMatchScore: 1.0,      // 版本完全匹配
  compatibleMatchScore: 0.95, // 版本兼容匹配（如"全网通5G"兼容"5G"）
  priorityMatchScore: 0.83,   // 版本优先级匹配
  mismatchScore: 0.6,         // 版本不匹配
  noVersionScore: 1.0,        // 都没有版本
  inputOnlyScore: 0.7,        // 只有输入有版本
  spuOnlyScore: 0.95,         // 只有SPU有版本（用户通常省略版本）
};

/**
 * 版本兼容性规则
 * 定义哪些版本之间是兼容的
 */
const VERSION_COMPATIBILITY: Record<string, string[]> = {
  // 网络版本兼容性
  '全网通5G': ['5G', '5G版', '全网通版'],
  '5G版': ['5G'],
  '全网通版': ['5G', '4G', '3G'],
  '蓝牙版': [],
  'eSIM版': [],
  'WiFi版': [],
  
  // 标准版本兼容性（通常不兼容）
  '活力版': [],
  '优享版': [],
  '尊享版': [],
  '青春版': [],
  '轻享版': [],
  '标准版': [],
  '基础版': [],
  '普通版': [],
  
  // 高级版本兼容性
  'Pro版': [],
  '旗舰版': [],
  '至尊版': [],
  '典藏版': [],
  '限定版': [],
  '纪念版': [],
  '特别版': [],
  '定制版': [],
  
  // 特殊版本兼容性
  '礼盒版': [],
  '套装版': [],
};

/**
 * 互斥版本规则
 * 定义哪些版本之间是互斥的（不能匹配）
 */
const MUTUALLY_EXCLUSIVE_VERSIONS: string[][] = [
  // 网络版本互斥组
  ['蓝牙版', 'eSIM版'],
  ['WiFi版', 'eSIM版'],
  ['WiFi版', '蓝牙版'],
  // 可以添加更多互斥组
];

/**
 * 版本类型映射
 */
const VERSION_TYPE_MAP: Record<string, VersionType> = {
  // 网络版本
  '全网通5G': VersionType.NETWORK,
  '全网通版': VersionType.NETWORK,
  '卫星通信版': VersionType.NETWORK,
  '蓝牙版': VersionType.NETWORK,
  'eSIM版': VersionType.NETWORK,
  'WiFi版': VersionType.NETWORK,
  '5G版': VersionType.NETWORK,
  '4G版': VersionType.NETWORK,
  '3G版': VersionType.NETWORK,
  '5G': VersionType.NETWORK,
  '4G': VersionType.NETWORK,
  '3G': VersionType.NETWORK,
  
  // 标准版本
  '活力版': VersionType.STANDARD,
  '优享版': VersionType.STANDARD,
  '尊享版': VersionType.STANDARD,
  '青春版': VersionType.STANDARD,
  '轻享版': VersionType.STANDARD,
  '标准版': VersionType.STANDARD,
  '基础版': VersionType.STANDARD,
  '普通版': VersionType.STANDARD,
  
  // 高级版本
  'Pro版': VersionType.PREMIUM,
  '旗舰版': VersionType.PREMIUM,
  '至尊版': VersionType.PREMIUM,
  '典藏版': VersionType.PREMIUM,
  '限定版': VersionType.PREMIUM,
  '纪念版': VersionType.PREMIUM,
  '特别版': VersionType.PREMIUM,
  '定制版': VersionType.PREMIUM,
  
  // 特殊版本
  '礼盒版': VersionType.SPECIAL,
  '套装版': VersionType.SPECIAL,
};

export class VersionMatcher {
  private config: VersionMatchConfig;
  
  constructor(config?: Partial<VersionMatchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 匹配两个版本信息
   * 
   * @param inputVersion 输入的版本信息
   * @param spuVersion SPU的版本信息
   * @returns 版本匹配结果
   */
  match(
    inputVersion: VersionInfo | null,
    spuVersion: VersionInfo | null
  ): VersionMatchResult {
    // 情况1：两者都没有版本 - 完全匹配
    if (!inputVersion && !spuVersion) {
      return {
        matched: true,
        score: this.config.noVersionScore,
        matchType: 'none',
        explanation: '双方都没有版本信息'
      };
    }
    
    // 情况2：只有输入有版本 - 部分匹配
    if (inputVersion && !spuVersion) {
      return {
        matched: false,
        score: this.config.inputOnlyScore,
        matchType: 'input-only',
        explanation: `用户指定版本"${inputVersion.name}"，但SPU无版本信息`
      };
    }
    
    // 情况3：只有SPU有版本 - 较高分数（用户通常省略版本）
    if (!inputVersion && spuVersion) {
      return {
        matched: false,
        score: this.config.spuOnlyScore,
        matchType: 'spu-only',
        explanation: `用户未指定版本，SPU版本为"${spuVersion.name}"`
      };
    }
    
    // 情况4：两者都有版本 - 需要详细匹配
    return this.matchVersions(inputVersion!, spuVersion!);
  }
  
  /**
   * 匹配两个具体的版本信息
   */
  private matchVersions(
    inputVersion: VersionInfo,
    spuVersion: VersionInfo
  ): VersionMatchResult {
    // 子情况1：版本名称完全匹配
    if (inputVersion.name === spuVersion.name) {
      return {
        matched: true,
        score: this.config.exactMatchScore,
        matchType: 'exact',
        explanation: `版本完全匹配："${spuVersion.name}"`
      };
    }
    
    // 子情况2：检查互斥版本（必须在兼容性检查之前）
    if (this.areMutuallyExclusive(inputVersion.name, spuVersion.name)) {
      return {
        matched: false,
        score: this.config.mismatchScore,
        matchType: 'exact',
        explanation: `版本互斥：输入="${inputVersion.name}"与SPU="${spuVersion.name}"不兼容`
      };
    }
    
    // 子情况3：版本兼容性匹配
    const compatibilityResult = this.checkCompatibility(inputVersion.name, spuVersion.name);
    if (compatibilityResult.compatible) {
      return {
        matched: true,
        score: this.config.compatibleMatchScore,
        matchType: 'compatible',
        explanation: `版本兼容匹配：输入="${inputVersion.name}"，SPU="${spuVersion.name}"（${compatibilityResult.reason}）`
      };
    }
    
    // 子情况4：版本优先级匹配（同类型、同优先级）
    // 注意：只有在同类型的情况下才考虑优先级匹配
    const inputType = this.getVersionType(inputVersion.name);
    const spuType = this.getVersionType(spuVersion.name);
    
    if (inputVersion.priority === spuVersion.priority && inputType === spuType) {
      return {
        matched: false,
        score: this.config.priorityMatchScore,
        matchType: 'priority',
        explanation: `版本优先级匹配：输入="${inputVersion.name}"（优先级${inputVersion.priority}），SPU="${spuVersion.name}"（优先级${spuVersion.priority}）`
      };
    }
    
    // 子情况5：版本不匹配
    return {
      matched: false,
      score: this.config.mismatchScore,
      matchType: 'exact',
      explanation: `版本不匹配：输入="${inputVersion.name}"（优先级${inputVersion.priority}），SPU="${spuVersion.name}"（优先级${spuVersion.priority}）`
    };
  }
  
  /**
   * 检查两个版本是否互斥
   */
  private areMutuallyExclusive(version1: string, version2: string): boolean {
    for (const group of MUTUALLY_EXCLUSIVE_VERSIONS) {
      if (group.includes(version1) && group.includes(version2)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 检查版本兼容性
   */
  private checkCompatibility(
    inputVersionName: string,
    spuVersionName: string
  ): { compatible: boolean; reason: string } {
    // 检查输入版本是否兼容SPU版本
    const compatibleVersions = VERSION_COMPATIBILITY[inputVersionName] || [];
    
    if (compatibleVersions.includes(spuVersionName)) {
      return {
        compatible: true,
        reason: `"${inputVersionName}"兼容"${spuVersionName}"`
      };
    }
    
    // 检查反向兼容性
    const reverseCompatibleVersions = VERSION_COMPATIBILITY[spuVersionName] || [];
    if (reverseCompatibleVersions.includes(inputVersionName)) {
      return {
        compatible: true,
        reason: `"${spuVersionName}"兼容"${inputVersionName}"`
      };
    }
    
    return { compatible: false, reason: '' };
  }
  
  /**
   * 获取版本类型
   */
  private getVersionType(versionName: string): VersionType {
    return VERSION_TYPE_MAP[versionName] || VersionType.STANDARD;
  }
  
  /**
   * 获取版本匹配分数（简化接口，用于向后兼容）
   */
  getScore(
    inputVersion: VersionInfo | null,
    spuVersion: VersionInfo | null
  ): number {
    return this.match(inputVersion, spuVersion).score;
  }
  
  /**
   * 检查版本是否匹配（简化接口，用于向后兼容）
   */
  isMatch(
    inputVersion: VersionInfo | null,
    spuVersion: VersionInfo | null
  ): boolean {
    return this.match(inputVersion, spuVersion).matched;
  }
}
