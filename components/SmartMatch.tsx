'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, XCircle, Download, Settings } from 'lucide-react';
import { Card, Input, Button, Table, Tag, Space, message, Spin, Checkbox, Dropdown } from 'antd';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';

interface MatchResult {
  inputName: string;
  matchedSKU: string | null;
  matchedSPU: string | null;
  matchedBrand: string | null;
  matchedVersion: string | null; // 版本
  matchedMemory: string | null; // 内存
  matchedColor: string | null; // 颜色
  matchedGtins: string[]; // 69码数组
  similarity: number;
  status: 'matched' | 'unmatched' | 'spu-matched'; // 添加 SPU 已匹配但 SKU 未匹配的状态
}

interface SPUData {
  id: number;
  name: string;
  brand?: string;
}

interface SKUData {
  id: number;
  name: string;
  spuID?: number;
  spuName?: string;
  brand?: string;
  version?: string;
  memory?: string;
  color?: string;
  gtins?: string[];
}

interface BrandData {
  name: string;
  color: string;
  spell?: string;
  order?: number;
}

// ==================== 配置常量 ====================

// ==================== PHASE2-1: 特殊产品类型识别 ====================

// 产品类型定义
type ProductType = 'phone' | 'watch' | 'tablet' | 'laptop' | 'earbuds' | 'band' | 'unknown';

// 产品类型特征
interface ProductTypeFeature {
  keywords: string[];           // 产品类型关键词
  modelPattern: RegExp;         // 型号提取正则
  specialParams: string[];      // 特殊参数（尺寸、屏幕等）
  paramPattern: RegExp;         // 特殊参数提取正则
}

// 产品类型配置
const PRODUCT_TYPE_FEATURES: Record<ProductType, ProductTypeFeature> = {
  watch: {
    keywords: ['watch', 'band', '手表', '手环'],
    modelPattern: /watch\s*(?:gt|se|d|fit|s|x2|ultra)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['mm', '寸', '屏幕', '柔光版', '标准版'],
    paramPattern: /(\d+mm|\d+寸|柔光版|标准版)/g,
  },
  tablet: {
    keywords: ['pad', 'tablet', '平板', 'matepad'],
    modelPattern: /(?:mate\s*)?pad\s*(?:pro|air|se|mini)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['寸', '屏幕', '柔光版', '标准版'],
    paramPattern: /(\d+寸|柔光版|标准版)/g,
  },
  laptop: {
    keywords: ['book', 'laptop', '笔记本', 'matebook'],
    modelPattern: /(?:mate\s*)?book\s*(?:x|d|pro|gt)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['寸', '屏幕', '处理器'],
    paramPattern: /(\d+寸|i\d|ryzen\s*\d)/gi,
  },
  earbuds: {
    keywords: ['buds', '耳机', '耳塞'],
    modelPattern: /buds\s*(?:\d|z|x|pro)?/i,
    specialParams: ['无线', '降噪', '版本'],
    paramPattern: /(无线|降噪|pro|标准版)/g,
  },
  band: {
    keywords: ['band', '手环'],
    modelPattern: /band\s*\d+/i,
    specialParams: ['mm', '屏幕'],
    paramPattern: /(\d+mm|amoled|lcd)/gi,
  },
  phone: {
    keywords: ['phone', '手机', 'pro', 'max', 'ultra'],
    modelPattern: /[a-z0-9\s]+/i,
    specialParams: [],
    paramPattern: /$/,
  },
  unknown: {
    keywords: [],
    modelPattern: /[a-z0-9\s]+/i,
    specialParams: [],
    paramPattern: /$/,
  },
};

// ==================== PHASE2-2: 版本/变体处理改进 ====================

// 版本信息
interface VersionInfo {
  name: string;           // 版本名称
  keywords: string[];     // 版本关键词
  priority: number;       // 优先级（高优先级优先匹配）
}

const VERSION_KEYWORDS_MAP: Record<string, VersionInfo> = {
  'standard': {
    name: '标准版',
    keywords: ['标准版', '基础版'],
    priority: 1,
  },
  'lite': {
    name: '活力版',
    keywords: ['活力版', '轻享版'],
    priority: 2,
  },
  'enjoy': {
    name: '优享版',
    keywords: ['优享版', '享受版'],
    priority: 3,
  },
  'premium': {
    name: '尊享版',
    keywords: ['尊享版', '高端版'],
    priority: 4,
  },
  'pro': {
    name: 'Pro 版',
    keywords: ['pro', 'pro版'],
    priority: 5,
  },
};

// 型号标准化映射：将连写的型号标准化为带空格的形式
// 例如：promini → pro mini, watchgt → watch gt
const MODEL_NORMALIZATIONS: Record<string, string> = {
  'promini': 'pro mini',
  'promax': 'pro max',
  'proplus': 'pro plus',
  'watchgt': 'watch gt',
  'watchgt2': 'watch gt 2',
  'watchgt3': 'watch gt 3',
  'watchgt4': 'watch gt 4',
  'watchgt5': 'watch gt 5',
  'watchgt6': 'watch gt 6',
  'watchse': 'watch se',
  'watch3': 'watch 3',
  'watch4': 'watch 4',
  'watch5': 'watch 5',
  'watch6': 'watch 6',
  'watch7': 'watch 7',
  'band3': 'band 3',
  'band4': 'band 4',
  'band5': 'band 5',
  'band6': 'band 6',
  'band7': 'band 7',
  'buds3': 'buds 3',
  'buds4': 'buds 4',
  'buds5': 'buds 5',
  'xnote': 'x note',
  'xfold': 'x fold',
  'xflip': 'x flip',
  // 新增手表型号
  'watchd': 'watch d',
  'watchd2': 'watch d2',
  'watchfit': 'watch fit',
  'watchx2mini': 'watch x2 mini',
  'watchs': 'watch s',
  // 新增手机型号
  'reno15': 'reno 15',
  'reno15pro': 'reno 15 pro',
  'reno15c': 'reno 15c',
  'findx9': 'find x9',
  'findx9pro': 'find x9 pro',
  'findn5': 'find n5',
  'a5pro': 'a5 pro',
  'a6pro': 'a6 pro',
  // 新增 vivo 型号
  'y300i': 'y300i',
  'y300pro': 'y300 pro',
  'y300proplus': 'y300 pro plus',
  'y50i': 'y50i',
  's30promini': 's30 pro mini',
  's50promini': 's50 pro mini',
  'xfold5': 'x fold5',
  'x200pro': 'x200 pro',
  'x200s': 'x200s',
  'x200ultra': 'x200 ultra',
  'x300pro': 'x300 pro',
};

// 礼盒版过滤关键词：当输入不包含这些词时，应该过滤掉包含这些词的SPU
const GIFT_BOX_KEYWORDS = ['礼盒', '套装', '系列', '礼品', '礼包'];

// 版本关键词：用于版本互斥过滤（如蓝牙版 vs eSIM版）
const VERSION_KEYWORDS = ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];

// 材质关键词：用于识别材质信息
const MATERIAL_KEYWORDS = ['软胶', '硅胶', '皮革', '陶瓷', '玻璃', '金属', '塑料', '尼龙'];

// 颜色变体映射：定义已知的颜色变体对，这些颜色应该被视为等价
// 例如："雾凇蓝" 和 "雾松蓝" 是同一种颜色的不同写法
// Requirements: 2.4.3, 3.2.4
const COLOR_VARIANTS: Record<string, string[]> = {
  '雾凇蓝': ['雾松蓝'],
  '雾松蓝': ['雾凇蓝'],
  // 新增颜色变体
  '玉石绿': ['玉龙雪', '锆石黑'],
  '玛瑙粉': ['晶钻粉', '粉梦生花'],
  '琥珀黑': ['锆石黑', '曜石黑'],
  '玄武黑': ['曜石黑', '深空黑'],
  '龙晶紫': ['极光紫', '流光紫'],
  '冰川蓝': ['天青蓝', '星河蓝'],
  '柔粉': ['粉梦生花', '玛瑙粉'],
  '浅绿': ['玉石绿', '原野绿'],
  '祥云金': ['流沙金', '晨曦金'],
  '可可黑': ['曜石黑', '玄武黑'],
  '薄荷青': ['天青蓝', '冰川蓝'],
  '桃桃粉': ['玛瑙粉', '粉梦生花'],
  '柠檬黄': ['流沙金', '祥云金'],
  '酷莓粉': ['玛瑙粉', '粉梦生花'],
  '告白': ['深空黑', '灵感紫'],
  '深空黑': ['曜石黑', '玄武黑'],
  '灵感紫': ['流光紫', '龙晶紫'],
  '悠悠蓝': ['冰川蓝', '天青蓝'],
  '自在蓝': ['冰川蓝', '星河蓝'],
  '纯粹黑': ['曜石黑', '深空黑'],
  '惬意紫': ['流光紫', '龙晶紫'],
  '旷野棕': ['琥珀棕', '马鞍棕'],
  '白月光': ['零度白', '雪域白'],
  '辰夜黑': ['曜石黑', '深空黑'],
  '简黑': ['曜石黑', '深空黑'],
  '黑ka': ['曜石黑', '深空黑'],
};

/**
 * 检查两个颜色是否为已知的变体对
 * 
 * 颜色变体是指同一种颜色的不同写法或表达方式，应该被视为等价。
 * 例如："雾凇蓝" 和 "雾松蓝" 是同一种颜色。
 * 
 * @param color1 - 第一个颜色
 * @param color2 - 第二个颜色
 * @returns true 表示两个颜色是已知的变体对，false 表示不是
 * 
 * Requirements: 2.4.3, 3.2.4
 */
function isColorVariant(color1: string, color2: string): boolean {
  if (!color1 || !color2) return false;
  
  // 检查 color1 的变体列表中是否包含 color2
  const variants1 = COLOR_VARIANTS[color1];
  if (variants1 && variants1.includes(color2)) {
    return true;
  }
  
  // 检查 color2 的变体列表中是否包含 color1
  const variants2 = COLOR_VARIANTS[color2];
  if (variants2 && variants2.includes(color1)) {
    return true;
  }
  
  return false;
}

// ==================== 匹配算法类 ====================

// 简化的匹配算法
class SimpleMatcher {
  private dynamicColors: string[] = [];
  
  // 设置动态颜色列表
  setColorList(colors: string[]) {
    this.dynamicColors = colors;
  }

  /**
   * 检测产品类型
   * 
   * @param input - 输入字符串
   * @returns 产品类型
   */
  detectProductType(input: string): ProductType {
    const lowerInput = input.toLowerCase();
    
    for (const [type, features] of Object.entries(PRODUCT_TYPE_FEATURES)) {
      for (const keyword of features.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          console.log(`检测到产品类型: ${type}`);
          return type as ProductType;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * 提取特殊参数
   * 
   * @param input - 输入字符串
   * @param productType - 产品类型
   * @returns 特殊参数对象
   */
  extractSpecialParams(input: string, productType: ProductType): Record<string, string> {
    const features = PRODUCT_TYPE_FEATURES[productType];
    if (!features) return {};
    
    const params: Record<string, string> = {};
    const matches = input.match(features.paramPattern);
    
    if (matches) {
      matches.forEach(match => {
        if (match.includes('mm')) params.size = match;
        if (match.includes('寸')) params.screen = match;
        if (match.includes('版')) params.version = match;
      });
    }
    
    return params;
  }

  /**
   * 按产品类型提取型号
   * 
   * @param input - 输入字符串
   * @param productType - 产品类型
   * @returns 提取的型号
   */
  extractModelByType(input: string, productType: ProductType): string | null {
    const features = PRODUCT_TYPE_FEATURES[productType];
    if (!features) return this.extractModel(input);
    
    // 移除特殊参数
    let cleaned = input;
    const specialParams = this.extractSpecialParams(input, productType);
    
    for (const param of Object.values(specialParams)) {
      cleaned = cleaned.replace(param, '');
    }
    
    // 使用产品类型特定的正则提取型号
    const match = cleaned.match(features.modelPattern);
    if (match) {
      return match[0].toLowerCase().replace(/\s+/g, ' ').trim();
    }
    
    return null;
  }

  /**
   * 提取版本信息
   * 
   * @param input - 输入字符串
   * @returns 版本信息
   */
  extractVersion(input: string): VersionInfo | null {
    const lowerInput = input.toLowerCase();
    
    for (const [key, versionInfo] of Object.entries(VERSION_KEYWORDS_MAP)) {
      for (const keyword of versionInfo.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          console.log(`提取版本: ${versionInfo.name}`);
          return versionInfo;
        }
      }
    }
    
    return null;
  }

  /**
   * 改进的输入预处理
   * 
   * @param input - 输入字符串
   * @returns 预处理后的字符串
   */
  preprocessInputAdvanced(input: string): string {
    let processed = input;
    
    // 1. 处理空格变体
    // "Reno15" → "Reno 15"
    processed = processed.replace(/(\D)(\d)/g, '$1 $2');
    processed = processed.replace(/(\d)([A-Za-z])/g, '$1 $2');
    
    // 2. 处理大小写
    // 保持首字母大写，其余小写
    processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
    
    // 3. 清理多余空格
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // 4. 处理特殊字符
    // "（" → "(", "）" → ")"
    processed = processed.replace(/[（）]/g, (match) => {
      return match === '（' ? '(' : ')';
    });
    
    // 5. 移除型号代码（括号内的内容）
    // "WatchGT6 (WA2456C)" → "WatchGT6"
    processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
    
    // 6. 清理最终空格
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * 改进的品牌识别，带优先级
   * 
   * @param input - 输入字符串
   * @returns 品牌和置信度
   */
  extractBrandWithPriority(input: string): { brand: string; confidence: number } | null {
    const lowerInput = input.toLowerCase();
    
    // 优先级 1: 产品品牌（高优先级）
    const productBrands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus'];
    for (const brand of productBrands) {
      if (lowerInput.includes(brand)) {
        return { brand, confidence: 0.9 };
      }
    }
    
    // 优先级 2: 子品牌（中优先级）
    const subBrands = ['redmi', 'nova', 'mate', 'reno', 'find'];
    for (const brand of subBrands) {
      if (lowerInput.includes(brand)) {
        return { brand, confidence: 0.7 };
      }
    }
    
    // 优先级 3: 配件品牌（低优先级）
    const accessoryBrands = ['优诺严选', '品牌', '赠品'];
    for (const brand of accessoryBrands) {
      if (lowerInput.includes(brand)) {
        return { brand, confidence: 0.3 };
      }
    }
    
    return null;
  }

  /**
   * 反向确认：使用型号验证品牌
   * 
   * @param brand - 品牌
   * @param model - 型号
   * @returns 是否验证通过
   */
  verifyBrandByModel(brand: string, model: string): boolean {
    // 构建品牌-型号映射
    const brandModelMap: Record<string, string[]> = {
      'xiaomi': ['redmi', 'mi', 'poco'],
      'huawei': ['mate', 'nova', 'p', 'watch'],
      'oppo': ['reno', 'find', 'a', 'k'],
      'vivo': ['x', 'y', 'iqoo', 's'],
    };
    
    const expectedModels = brandModelMap[brand] || [];
    const lowerModel = model.toLowerCase();
    
    for (const expectedModel of expectedModels) {
      if (lowerModel.includes(expectedModel)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 改进的 SKU 匹配，考虑版本信息
   * 
   * @param input - 输入字符串
   * @param skuList - SKU 列表
   * @param inputVersion - 输入版本信息
   * @returns 最佳匹配的 SKU 和相似度
   */
  findBestSKUWithVersion(
    input: string,
    skuList: SKUData[],
    inputVersion: VersionInfo | null
  ): { sku: SKUData | null; similarity: number } {
    const inputCapacity = this.extractCapacity(input);
    const inputColor = this.extractColorAdvanced(input);
    
    console.log('=== SKU版本匹配 ===');
    console.log('输入版本:', inputVersion?.name || '无');
    console.log('输入容量:', inputCapacity);
    console.log('输入颜色:', inputColor);
    
    let bestMatch: SKUData | null = null;
    let bestScore = 0;
    
    for (const sku of skuList) {
      const skuCapacity = this.extractCapacity(sku.name);
      const skuColor = this.extractColorAdvanced(sku.name);
      const skuVersion = this.extractVersion(sku.name);
      
      let score = 0;
      let totalWeight = 0;
      
      // 版本匹配（基础权重 30%）
      // 动态调整：如果有版本信息则使用，否则权重转移到其他字段
      if (inputVersion || skuVersion) {
        totalWeight += 0.3;
        if (inputVersion && skuVersion) {
          if (inputVersion.name === skuVersion.name) {
            score += 0.3;  // 版本完全匹配
          } else if (inputVersion.priority === skuVersion.priority) {
            score += 0.25; // 版本优先级匹配
          }
        } else if (!inputVersion && !skuVersion) {
          score += 0.3;  // 都没有版本信息
        }
      }
      
      // 容量匹配（基础权重 40%）
      // 动态调整：如果有容量信息则使用，否则权重转移到其他字段
      if (inputCapacity || skuCapacity) {
        totalWeight += 0.4;
        if (inputCapacity && skuCapacity && inputCapacity === skuCapacity) {
          score += 0.4;
        }
      }
      
      // 颜色匹配（基础权重 30%）
      // 动态调整：如果有颜色信息则使用，否则权重转移到其他字段
      if (inputColor || skuColor) {
        totalWeight += 0.3;
        if (inputColor && skuColor && this.isColorMatch(inputColor, skuColor)) {
          score += 0.3;
        }
      }
      
      // 如果没有任何字段信息，给予基础分数
      if (totalWeight === 0) {
        totalWeight = 1;
        score = 0.1; // 基础分数
      }
      
      // 计算最终分数（归一化）
      const finalScore = score / totalWeight;
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMatch = sku;
      }
    }
    
    console.log('最佳SKU版本匹配:', {
      sku: bestMatch?.name,
      score: bestScore.toFixed(3)
    });
    
    return { sku: bestMatch, similarity: bestScore };
  }

  /**
   * 改进的颜色提取
   * 
   * @param input - 输入字符串
   * @returns 提取的颜色
   */
  extractColorAdvanced(input: string): string | null {
    // 方法 1: 使用扩展颜色库
    for (const [colorName, colorInfo] of Object.entries(COLOR_VARIANTS)) {
      if (input.includes(colorName)) {
        return colorName;
      }
      // 检查别名
      for (const variant of colorInfo) {
        if (input.includes(variant)) {
          return colorName;
        }
      }
    }
    
    // 方法 2: 使用动态颜色列表
    if (this.dynamicColors.length > 0) {
      for (const color of this.dynamicColors) {
        if (input.includes(color)) {
          return color;
        }
      }
    }
    
    // 方法 3: 从字符串末尾提取（改进版）
    const lastWords = input.match(/[\u4e00-\u9fa5]{2,5}$/);
    if (lastWords) {
      const word = lastWords[0];
      // 排除常见的非颜色词（扩展列表）
      const excludeWords = [
        '全网通', '网通', '版本', '标准', '套餐', '蓝牙版',
        '活力版', '优享版', '尊享版', '标准版', '基础版',
        '轻享版', '享受版', '高端版', 'pro版',
        '套装', '礼盒', '系列', '礼品', '礼包',
        '软胶', '硅胶', '皮革', '陶瓷', '玻璃', '金属', '塑料', '尼龙',
        '演示机', '样机', '展示机', '体验机', '试用机', '测试机'
      ];
      if (!excludeWords.includes(word)) {
        return word;
      }
    }
    
    return null;
  }

  /**
   * 改进的颜色匹配
   * 
   * @param color1 - 第一个颜色
   * @param color2 - 第二个颜色
   * @returns 是否匹配
   */
  isColorMatch(color1: string, color2: string): boolean {
    if (!color1 || !color2) return false;
    
    // 完全匹配
    if (color1 === color2) return true;
    
    // 变体匹配
    if (isColorVariant(color1, color2)) return true;
    
    // 基础颜色匹配（改进版）
    // 只有当两个颜色都是同一个基础颜色时才匹配
    // 例如："深空黑" 和 "曜石黑" 都包含 "黑"，但不应该匹配
    // 除非它们在 COLOR_VARIANTS 中明确定义为变体
    
    // 定义基础颜色的严格映射
    const basicColorMap: Record<string, string[]> = {
      '黑': ['黑', '深', '曜', '玄', '纯', '简', '辰'],
      '白': ['白', '零', '雪'],
      '蓝': ['蓝', '天', '星', '冰', '悠', '自', '薄'],
      '红': ['红', '深'],
      '绿': ['绿', '原', '玉'],
      '紫': ['紫', '灵', '龙', '流', '极', '惬'],
      '粉': ['粉', '玛', '晶', '梦', '桃', '酷', '告'],
      '金': ['金', '流', '祥', '柠'],
      '银': ['银'],
      '灰': ['灰'],
      '棕': ['棕', '琥', '马', '旷'],
      '青': ['青', '薄'],
    };
    
    // 检查是否属于同一基础颜色族
    for (const [basicColor, variants] of Object.entries(basicColorMap)) {
      const color1HasBasic = variants.some(v => color1.includes(v));
      const color2HasBasic = variants.some(v => color2.includes(v));
      
      if (color1HasBasic && color2HasBasic) {
        // 两个颜色都属于同一基础颜色族
        // 但要排除明确不同的颜色（通过 COLOR_VARIANTS 检查）
        if (!isColorVariant(color1, color2)) {
          // 如果不在变体列表中，则不匹配
          return false;
        }
        return true;
      }
    }
    
    return false;
  }

  /**
   * 清理演示机/样机标记和配件品牌前缀
   * 
   * @param input - 输入字符串
   * @returns 清理后的字符串
   */
  cleanDemoMarkers(input: string): string {
    const demoKeywords = [
      '演示机',
      '样机',
      '展示机',
      '体验机',
      '试用机',
      '测试机',
    ];
    
    let cleaned = input;
    
    // 移除演示机标记
    for (const keyword of demoKeywords) {
      cleaned = cleaned.replace(new RegExp(keyword, 'g'), '');
    }
    
    // 移除配件品牌前缀
    const accessoryBrands = [
      '优诺严选',
      '品牌',
      '赠品',
      '严选',
      '檀木',
    ];
    
    for (const brand of accessoryBrands) {
      cleaned = cleaned.replace(new RegExp(`^${brand}\\s*`, 'g'), '');
    }
    
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  /**
   * 检查是否应该过滤某个SPU
   * 
   * 实现版本过滤规则：
   * 1. 礼盒版过滤：当输入不包含"礼盒"、"套装"、"系列"等关键词时，过滤掉包含这些词的SPU
   * 2. 版本互斥过滤：当输入包含"蓝牙版"时，过滤掉"eSIM版"SPU；反之亦然
   * 
   * @param inputName - 用户输入的商品名称
   * @param spuName - SPU名称
   * @returns true 表示应该过滤掉该SPU，false 表示不过滤
   * 
   * Requirements: 2.2.1, 2.2.2, 3.1.1, 3.1.2
   */
  shouldFilterSPU(inputName: string, spuName: string): boolean {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    // 规则1：礼盒版过滤
    // 当输入不包含礼盒相关关键词时，过滤掉包含这些词的SPU
    const hasGiftBoxKeywordInInput = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    
    const hasGiftBoxKeywordInSPU = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeywordInInput && hasGiftBoxKeywordInSPU) {
      console.log(`过滤SPU（礼盒版）: ${spuName}`);
      return true; // 输入不含礼盒关键词，但SPU含有，应该过滤
    }
    
    // 规则2：版本互斥过滤（蓝牙版 vs eSIM版）
    const hasBluetooth = lowerInput.includes('蓝牙版');
    const hasESIM = lowerInput.includes('esim版') || lowerInput.includes('esim版');
    
    // 输入包含"蓝牙版"时，过滤掉"eSIM版"SPU
    if (hasBluetooth && (lowerSPU.includes('esim版') || lowerSPU.includes('esim版'))) {
      console.log(`过滤SPU（版本互斥-蓝牙vs eSIM）: ${spuName}`);
      return true;
    }
    
    // 输入包含"eSIM版"时，过滤掉"蓝牙版"SPU
    if (hasESIM && lowerSPU.includes('蓝牙版')) {
      console.log(`过滤SPU（版本互斥-eSIM vs 蓝牙）: ${spuName}`);
      return true;
    }
    
    return false; // 不过滤
  }

  /**
   * 计算SPU的优先级分数
   * 
   * 优先级规则：
   * 1. 标准版（不含特殊关键词）：优先级最高（分数 3）
   * 2. 版本匹配的特殊版（如输入含"蓝牙版"，SPU也含"蓝牙版"）：优先级中等（分数 2）
   * 3. 其他特殊版（含礼盒、系列等关键词）：优先级最低（分数 1）
   * 
   * @param inputName - 用户输入的商品名称
   * @param spuName - SPU名称
   * @returns 优先级分数（3=最高，2=中等，1=最低）
   * 
   * Requirements: 2.2.3, 3.1.3
   */
  getSPUPriority(inputName: string, spuName: string): number {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    // 检查SPU是否包含特殊关键词
    const hasGiftBoxKeyword = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    const hasSpecialVersion = VERSION_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    // 如果SPU不包含任何特殊关键词，则为标准版，优先级最高
    if (!hasGiftBoxKeyword && !hasSpecialVersion) {
      return 3; // 标准版：优先级最高
    }
    
    // 如果SPU包含特殊版本关键词，检查是否与输入匹配
    if (hasSpecialVersion) {
      // 检查输入和SPU是否包含相同的版本关键词
      for (const keyword of VERSION_KEYWORDS) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerInput.includes(lowerKeyword) && lowerSPU.includes(lowerKeyword)) {
          return 2; // 版本匹配的特殊版：优先级中等
        }
      }
    }
    
    // 其他情况（礼盒版、不匹配的特殊版等）：优先级最低
    return 1;
  }
  
  // 标准化字符串
  normalize(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/苹果/g, 'apple')
      .replace(/华为/g, 'huawei')
      .replace(/荣耀/g, 'honor')
      .replace(/小米/g, 'xiaomi')
      .replace(/vivo/g, 'vivo')
      .replace(/oppo/g, 'oppo');
  }

  // 提取品牌
  extractBrand(str: string): string | null {
    const lowerStr = str.toLowerCase();
    // 英文品牌 - 扩展了子品牌识别
    const brands = [
      'apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 
      'samsung', 'oneplus', 'realme', 'iqoo', 'redmi', 'nova', 
      'mate', 'pura', 'pocket', 'matex', 'matepad', 'matebook',
      'reno', 'find', 'pad'
    ];
    
    for (const brand of brands) {
      if (lowerStr.includes(brand)) {
        return brand;
      }
    }
    
    // 中文品牌
    if (lowerStr.includes('苹果')) return 'apple';
    if (lowerStr.includes('华为')) return 'huawei';
    if (lowerStr.includes('荣耀')) return 'honor';
    if (lowerStr.includes('小米')) return 'xiaomi';
    if (lowerStr.includes('红米')) return 'xiaomi';  // 新增
    if (lowerStr.includes('欧珀')) return 'oppo';    // 新增
    if (lowerStr.includes('一加')) return 'oneplus'; // 新增
    
    return null;
  }

  // 提取型号（包括字母和数字）
  // 实现多层次型号匹配，应用 MODEL_NORMALIZATIONS 映射
  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 步骤1: 移除括号内的型号代码（如（WA2456C）），避免干扰
    // vivo WATCH GT（WA2456C） -> vivo WATCH GT
    // 注意：需要在括号前后添加空格，避免括号内容与其他词连接
    let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
    
    // 步骤1.5: 提取并移除品牌，避免品牌与型号混淆
    // 例如：vivo promini -> promini (移除vivo后再处理)
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus', 'realme'];
    for (const brand of brands) {
      // 使用单词边界确保完整匹配品牌词
      const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(brandRegex, ' ');
    }
    
    // 清理多余空格
    normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
    
    // 步骤2: 应用 MODEL_NORMALIZATIONS 映射进行标准化
    // 将连写的型号标准化为带空格的形式
    // 例如：promini -> pro mini, watchgt -> watch gt
    Object.entries(MODEL_NORMALIZATIONS).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(regex, to);
    });
    
    // 步骤3: 多层次型号匹配（按优先级依次尝试）
    
    // 优先级1: 字母+字母格式（如 WATCH GT, X Note, X Fold, BAND SE等）
    // 这种格式很特殊，需要优先匹配
    // 包括三种模式：
    // 1. 单字母 + 产品词 (x note, x fold, x flip) - 最高优先级
    // 2. 特定产品词 + 修饰词 + 可选数字 (watch gt 2, band se, watch x2 mini, etc.)
    // 3. 特定产品词 + 数字 (watch 5, band 3, etc.)
    const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
    // 改进：支持 watch x2 mini 这样的格式（产品词 + 修饰词 + 可选数字 + 可选修饰词）
    const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
    
    // 优先匹配 pattern2（单字母+产品词），因为它更具体
    const wordMatches2 = normalizedStr.match(wordModelPattern2);
    const wordMatches1 = normalizedStr.match(wordModelPattern1);
    const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
    
    if (wordMatches && wordMatches.length > 0) {
      // 返回第一个匹配（通常是最准确的）
      let model = wordMatches[0].toLowerCase().replace(/\s+/g, '');
      
      // 移除尾部的 mm 和 4g/5g 等参数（如果有的话）
      model = model.replace(/\d+mm.*$/, '').replace(/\d+g.*$/, '');
      
      console.log('提取型号（优先级1-字母+字母）:', model);
      return model;
    }
    
    // 优先级2: 复杂型号格式（字母+数字+Pro/Max/Plus/Ultra等+可选的mini/max/plus/ultra）
    // 支持有空格和无空格：Y500Pro, Y500 Pro, Mate60Pro, Mate60 Pro, S30 Pro mini, iPhone 15 Pro Max
    const complexModelPattern = /\b([a-z]+)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note)(\s+(mini|max|plus|ultra))?\b/gi;
    const complexMatches = normalizedStr.match(complexModelPattern);
    
    if (complexMatches && complexMatches.length > 0) {
      // 过滤掉包含容量标识的匹配
      const filtered = complexMatches.filter(m => {
        const lower = m.toLowerCase();
        // 排除包含gb的（容量）
        if (lower.includes('gb')) {
          return false;
        }
        // 排除以g结尾的（如 5g 网络制式）
        if (/\d+g$/i.test(lower)) {
          return false;
        }
        return true;
      });
      
      if (filtered.length > 0) {
        // 返回最长的匹配（通常是最完整的型号）
        // 统一去除空格，使 Y500Pro 和 Y500 Pro 都变成 y500pro
        // S30 Pro mini -> s30promini
        // iPhone 15 Pro Max -> iphone15promax
        const model = filtered.sort((a, b) => b.length - a.length)[0]
          .toLowerCase()
          .replace(/\s+/g, '');
        console.log('提取型号（优先级2-复杂型号）:', model);
        return model;
      }
    }
    
    // 优先级3: 简单型号格式（字母+数字+可选字母，如 Y300i, Y50, Y3, Mate60）
    // 注意：使用 normalizedStr 而不是 lowerStr，避免提取已删除的括号内容
    const simpleModelPattern = /\b([a-z]+)(\d+)([a-z]*)\b/gi;
    const simpleMatches = normalizedStr.match(simpleModelPattern);
    
    if (simpleMatches && simpleMatches.length > 0) {
      // 步骤4: 应用过滤逻辑
      const filtered = simpleMatches.filter(m => {
        const lower = m.toLowerCase();
        
        // 排除：5g, 4g, 3g（网络制式）
        if (/^[345]g$/i.test(lower)) {
          return false;
        }
        
        // 排除：包含gb的（容量）
        if (lower.includes('gb')) {
          return false;
        }
        
        // 排除：纯数字+g（如 8g, 12g - 内存容量）
        if (/^\d+g$/i.test(lower)) {
          return false;
        }
        
        return true;
      });
      
      if (filtered.length > 0) {
        // 优先选择：
        // 1. 包含字母后缀的（如 Y300i）
        // 2. 较长的型号
        const sorted = filtered.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          
          // 检查是否有字母后缀（数字后面还有字母）
          const aHasSuffix = /[a-z]\d+[a-z]+/i.test(aLower);
          const bHasSuffix = /[a-z]\d+[a-z]+/i.test(bLower);
          
          if (aHasSuffix && !bHasSuffix) return -1;
          if (!aHasSuffix && bHasSuffix) return 1;
          
          // 按长度排序
          return b.length - a.length;
        });
        
        const model = sorted[0].toLowerCase().replace(/\s+/g, '');
        console.log('提取型号（优先级3-简单型号）:', model);
        return model;
      }
    }
    
    // 后备方案: 匹配通用 "字母 字母" 格式（如 X Note, X Fold）
    const generalWordPattern = /\b([a-z]+)\s+([a-z]+)\b/gi;
    const generalWordMatches = normalizedStr.match(generalWordPattern);
    
    if (generalWordMatches && generalWordMatches.length > 0) {
      // 过滤掉常见的非型号词组
      const filtered = generalWordMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('全网通') && 
               !lower.includes('版本') &&
               !lower.includes('网通');
      });
      
      if (filtered.length > 0) {
        const model = filtered[0].toLowerCase().replace(/\s+/g, '');
        console.log('提取型号（后备方案-通用字母+字母）:', model);
        return model;
      }
    }
    
    console.log('未能提取型号');
    return null;
  }

  // 提取容量
  extractCapacity(str: string): string | null {
    // 匹配多种格式：
    // (12+512), 12+512, 12GB+512GB, (12GB+512GB)
    
    // 1. 匹配括号内的容量
    const bracketPattern = /\((\d+)\s*(?:gb)?\s*\+\s*(\d+)\s*(?:gb)?\)/gi;
    let match = str.match(bracketPattern);
    
    if (match && match.length > 0) {
      const nums = match[0].match(/\d+/g);
      if (nums && nums.length === 2) {
        return `${nums[0]}+${nums[1]}`;
      }
    }
    
    // 2. 匹配不在括号内的容量：12+512, 12GB+512GB
    const capacityPattern = /(\d+)\s*(?:gb)?\s*\+\s*(\d+)\s*(?:gb)?/gi;
    match = str.match(capacityPattern);
    
    if (match && match.length > 0) {
      const nums = match[0].match(/\d+/g);
      if (nums && nums.length === 2) {
        return `${nums[0]}+${nums[1]}`;
      }
    }
    
    // 3. 匹配单个容量 128GB, 256GB等
    const singlePattern = /(\d+)\s*gb/gi;
    const singleMatch = str.match(singlePattern);
    if (singleMatch && singleMatch.length > 0) {
      const num = singleMatch[0].match(/\d+/);
      if (num) {
        return num[0];
      }
    }
    
    return null;
  }

  /**
   * 提取颜色（改进版：使用多种方法）
   * 
   * 采用多层次提取策略，按优先级依次尝试：
   * 1. 动态颜色列表匹配（从实际SKU数据提取，支持复合颜色和带修饰词的颜色）
   * 2. 从"版"字后提取（处理"蓝牙版夏夜黑"这类格式）
   * 3. 从字符串末尾提取（通常颜色在最后）
   * 4. 从容量后提取
   * 5. 基础颜色后备
   * 
   * 支持的颜色类型：
   * - 复合颜色名称：可可黑、薄荷青、柠檬黄、酷莓粉
   * - 带修饰词的颜色：夏夜黑、辰夜黑、龙晶紫
   * - 基础颜色：黑、白、蓝、红等
   * 
   * @param str - 输入字符串
   * @returns 提取的颜色，如果未找到则返回 null
   * 
   * Requirements: 2.4.1, 2.4.2, 3.2.2, 3.2.3
   */
  extractColor(str: string): string | null {
    // 方法1：优先使用动态颜色列表（从实际数据中提取的）
    // 动态列表已按长度降序排序，确保优先匹配更长的颜色词
    // 例如："夏夜黑"会优先于"黑"被匹配
    // Requirements: 2.4.1, 2.4.2, 3.2.2, 3.2.3
    if (this.dynamicColors.length > 0) {
      for (const color of this.dynamicColors) {
        if (str.includes(color)) {
          console.log(`提取颜色（方法1-动态列表）: ${color}`);
          return color;
        }
      }
    }
    
    // 方法2：从"版"字后提取颜色（处理"蓝牙版夏夜黑"、"eSIM版曜石黑"这类格式）
    // 这种格式很常见，需要特殊处理
    // Requirements: 2.4.1, 2.4.2, 3.2.2, 3.2.3
    const afterVersion = str.match(/版([\u4e00-\u9fa5]{2,5})$/);
    if (afterVersion && afterVersion[1]) {
      const word = afterVersion[1];
      console.log(`提取颜色（方法2-版字后提取）: ${word}`);
      return word;
    }
    
    // 方法3：从字符串末尾提取颜色（通常颜色在最后）
    // 支持2-5个汉字的颜色名称
    // 例如：vivo Y500 全网通5G 12GB+512GB 龙晶紫 → 龙晶紫
    // 注意：优先匹配较短的颜色词（2-3个汉字），避免贪心匹配
    // Requirements: 2.4.1, 2.4.2, 3.2.2, 3.2.3
    
    // 先尝试匹配2-3个汉字（最常见的颜色词长度）
    let lastWords = str.match(/[\u4e00-\u9fa5]{2,3}$/);
    if (lastWords) {
      const word = lastWords[0];
      // 排除常见的非颜色词
      const excludeWords = ['全网通', '网通', '版本', '标准', '套餐', '蓝牙版', '活力版', '优享版', '尊享版', '标准版', '基础版'];
      if (!excludeWords.includes(word)) {
        console.log(`提取颜色（方法3-末尾提取2-3字）: ${word}`);
        return word;
      }
    }
    
    // 如果2-3字没有匹配，再尝试4-5个汉字
    lastWords = str.match(/[\u4e00-\u9fa5]{4,5}$/);
    if (lastWords) {
      const word = lastWords[0];
      // 排除常见的非颜色词
      const excludeWords = ['全网通', '网通', '版本', '标准', '套餐', '蓝牙版', '活力版', '优享版', '尊享版', '标准版', '基础版'];
      if (!excludeWords.includes(word)) {
        console.log(`提取颜色（方法3-末尾提取4-5字）: ${word}`);
        return word;
      }
    }
    
    // 方法4：从容量后提取颜色
    // 例如：12GB+512GB 龙晶紫 → 龙晶紫
    // 例如：(12+512)可可黑 → 可可黑
    // Requirements: 2.4.1, 2.4.2, 3.2.2, 3.2.3
    const afterCapacity = str.match(/\d+GB[+]\d+GB\s*([\u4e00-\u9fa5]{2,5})/);
    if (afterCapacity && afterCapacity[1]) {
      console.log(`提取颜色（方法4-容量后提取）: ${afterCapacity[1]}`);
      return afterCapacity[1];
    }
    
    // 也尝试括号格式的容量后提取
    const afterBracketCapacity = str.match(/\)\s*([\u4e00-\u9fa5]{2,5})/);
    if (afterBracketCapacity && afterBracketCapacity[1]) {
      const word = afterBracketCapacity[1];
      const excludeWords = ['全网通', '网通', '版本', '标准', '套餐'];
      if (!excludeWords.includes(word)) {
        console.log(`提取颜色（方法4-括号容量后提取）: ${word}`);
        return word;
      }
    }
    
    // 方法5：使用基础颜色作为后备
    // 只在前面的方法都失败时使用
    // Requirements: 2.4.1, 3.2.2
    const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰'];
    for (const color of basicColors) {
      if (str.includes(color)) {
        console.log(`提取颜色（方法5-基础颜色）: ${color}`);
        return color;
      }
    }
    
    console.log('未能提取颜色');
    return null;
  }

  // 提取 SPU 部分（改进版）
  // 新规则：
  // 1. 如果找到 "5g全网通" 或 "5g" 字样 → 前面的内容为SPU
  // 2. 否则，如果找到内存（如 12+512） → 前面的内容为SPU
  // 3. 否则，按照品牌+型号方法确定SPU
  // 
  // 例如：
  // - OPPO A5活力版(12+512)琥珀黑 → OPPO A5活力版
  // - Vivo S30Promini 5G(12+512)可可黑 → Vivo S30Promini 5G
  // - iPhone 15 Pro Max 256GB 黑色 → iPhone 15 Pro Max
  extractSPUPart(str: string): string {
    console.log('=== 提取SPU部分 ===');
    console.log('原始输入:', str);
    
    // 规则1：如果找到 "5g全网通" 或 "5g" 字样，前面的内容为SPU
    const networkPattern = /(.+?)\s*5g全网通/i;
    const networkMatch = str.match(networkPattern);
    if (networkMatch) {
      const spuPart = networkMatch[1].trim();
      console.log('规则1匹配（5g全网通）:', spuPart);
      return spuPart;
    }
    
    // 也检查单独的 "5g"
    const fiveGPattern = /(.+?)\s*5g\b/i;
    const fiveGMatch = str.match(fiveGPattern);
    if (fiveGMatch) {
      const spuPart = fiveGMatch[1].trim();
      console.log('规则1匹配（5g）:', spuPart);
      return spuPart;
    }
    
    // 规则2：如果找到内存（如 12+512 或 12GB+512GB），前面的内容为SPU
    // 匹配 (12+512), 12+512, 12GB+512GB, (12GB+512GB) 等格式
    // 注意：只匹配 GB 单位的内存，避免与 mm（尺寸）混淆
    const memoryPattern = /(.+?)\s*\(?\d+\s*gb\s*\+\s*\d+\s*(?:gb)?\)?/i;
    const memoryMatch = str.match(memoryPattern);
    if (memoryMatch) {
      const spuPart = memoryMatch[1].trim();
      console.log('规则2匹配（内存）:', spuPart);
      return spuPart;
    }
    
    // 规则3：如果找不到内存，按照品牌+型号方法确定SPU
    // 这种情况下，需要移除颜色和其他SKU特征词
    let spuPart = str;
    
    // 移除颜色部分（通常在末尾）
    const color = this.extractColor(str);
    if (color) {
      // 从末尾移除颜色
      const colorIndex = spuPart.lastIndexOf(color);
      if (colorIndex !== -1) {
        spuPart = spuPart.substring(0, colorIndex);
      }
    }
    
    // 移除其他常见的 SKU 特征词
    spuPart = spuPart.replace(/软胶|硅胶|皮革|陶瓷|玻璃/gi, '');
    
    // 清理多余的空格和标点
    spuPart = spuPart.trim().replace(/\s+/g, ' ');
    
    console.log('规则3匹配（品牌+型号）:', spuPart);
    
    return spuPart;
  }

  // 计算相似度（改进版）
  calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = this.normalize(str1);
    const normalized2 = this.normalize(str2);

    if (normalized1 === normalized2) return 1.0;
    
    // 提取关键信息
    const brand1 = this.extractBrand(str1);
    const brand2 = this.extractBrand(str2);
    const model1 = this.extractModel(str1);
    const model2 = this.extractModel(str2);
    const capacity1 = this.extractCapacity(str1);
    const capacity2 = this.extractCapacity(str2);
    const color1 = this.extractColor(str1);
    const color2 = this.extractColor(str2);
    
    // 品牌必须匹配
    if (brand1 && brand2 && brand1 !== brand2) {
      return 0.1; // 品牌不匹配，直接拒绝
    }
    
    // 型号必须匹配（最关键）
    if (model1 && model2) {
      if (model1 !== model2) {
        // 型号不匹配，直接拒绝
        // Y300i vs xnote 应该被拒绝
        return 0.2;
      }
    }
    
    // 如果没有提取到型号，使用更严格的匹配
    if (!model1 || !model2) {
      // 至少要有包含关系
      if (!normalized2.includes(normalized1) && !normalized1.includes(normalized2)) {
        return 0.3;
      }
    }
    
    let score = 0;
    let totalWeight = 0;
    
    // 品牌匹配（权重30%）
    if (brand1 && brand2) {
      totalWeight += 0.3;
      if (brand1 === brand2) {
        score += 0.3;
      }
    }
    
    // 型号匹配（权重50%）- 最关键
    if (model1 && model2) {
      totalWeight += 0.5;
      if (model1 === model2) {
        score += 0.5;
      }
    }
    
    // 容量匹配（权重15%）
    if (capacity1 && capacity2) {
      totalWeight += 0.15;
      if (capacity1 === capacity2) {
        score += 0.15;
      }
    }
    
    // 颜色匹配（权重5%）
    if (color1 && color2) {
      totalWeight += 0.05;
      if (color1 === color2 || isColorVariant(color1, color2)) {
        score += 0.05;
      }
    }
    
    // 如果没有足够的信息进行匹配，使用基础字符串相似度
    if (totalWeight < 0.5) {
      if (normalized2.includes(normalized1) || normalized1.includes(normalized2)) {
        return 0.5;
      }
      
      // 简单的关键词匹配
      const words1 = normalized1.match(/[\u4e00-\u9fa5]+|[a-z0-9]+/gi) || [];
      const words2 = normalized2.match(/[\u4e00-\u9fa5]+|[a-z0-9]+/gi) || [];
      
      let matchCount = 0;
      for (const word of words1) {
        if (words2.some(w => w.includes(word) || word.includes(w))) {
          matchCount++;
        }
      }
      
      return words1.length > 0 ? matchCount / words1.length * 0.6 : 0;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  // 查找最佳匹配的SPU
  findBestSPUMatch(input: string, spuList: SPUData[], threshold: number = 0.6): {
    spu: SPUData | null;
    similarity: number;
  } {
    // 提取输入的 SPU 部分（去掉容量和颜色）
    const inputSPUPart = this.extractSPUPart(input);
    
    // 提取输入的关键信息
    const inputBrand = this.extractBrand(inputSPUPart);
    const inputModel = this.extractModel(inputSPUPart);
    
    console.log('=== SPU匹配开始 ===');
    console.log('原始输入:', input);
    console.log('SPU部分:', inputSPUPart);
    console.log('提取品牌:', inputBrand);
    console.log('提取型号:', inputModel);
    console.log('匹配阈值:', threshold);
    
    let bestMatch: SPUData | null = null;
    let bestScore = 0;
    let bestPriority = 0;
    let filteredCount = 0;
    let candidateCount = 0;
    
    // ==================== 第一阶段：有字母顺序全字匹配 ====================
    console.log('\n--- 第一阶段：有字母顺序全字匹配 ---');
    
    for (const spu of spuList) {
      // 应用版本过滤
      if (this.shouldFilterSPU(input, spu.name)) {
        filteredCount++;
        continue;
      }
      
      // 提取 SPU 的信息
      const spuSPUPart = this.extractSPUPart(spu.name);
      const spuBrand = this.extractBrand(spuSPUPart);
      const spuModel = this.extractModel(spuSPUPart);
      
      let score = 0;
      
      // 品牌和型号都必须匹配
      if (inputBrand && spuBrand && inputBrand === spuBrand &&
          inputModel && spuModel && inputModel === spuModel) {
        // 完全匹配：品牌和型号都相同
        score = 1.0;
        
        console.log('✅ 全字匹配:', {
          input: `${inputBrand} ${inputModel}`,
          spu: spu.name,
          score: score.toFixed(3)
        });
        
        // 计算优先级
        const priority = this.getSPUPriority(input, spu.name);
        
        // 更新最佳匹配
        if (score > bestScore || (score === bestScore && priority > bestPriority)) {
          bestScore = score;
          bestMatch = spu;
          bestPriority = priority;
        }
      }
    }
    
    // 如果第一阶段找到了匹配，直接返回
    if (bestMatch && bestScore >= threshold) {
      console.log('\n✅ 第一阶段匹配成功！');
      console.log('最佳匹配SPU:', bestMatch.name);
      console.log('最佳匹配分数:', bestScore.toFixed(3));
      console.log('最佳匹配优先级:', bestPriority);
      return { spu: bestMatch, similarity: bestScore };
    }
    
    // ==================== 第二阶段：无顺序的分词匹配 ====================
    console.log('\n--- 第二阶段：无顺序的分词匹配 ---');
    
    // 重置最佳匹配
    bestMatch = null;
    bestScore = 0;
    bestPriority = 0;
    filteredCount = 0;
    candidateCount = 0;
    
    // 分词：将输入和SPU分解为词汇
    const inputWords = this.tokenize(inputSPUPart);
    console.log('输入词汇:', inputWords);
    
    for (const spu of spuList) {
      // 应用版本过滤
      if (this.shouldFilterSPU(input, spu.name)) {
        filteredCount++;
        continue;
      }
      
      // 提取 SPU 的信息
      const spuSPUPart = this.extractSPUPart(spu.name);
      const spuBrand = this.extractBrand(spuSPUPart);
      const spuModel = this.extractModel(spuSPUPart);
      const spuWords = this.tokenize(spuSPUPart);
      
      let score = 0;
      
      // 品牌必须匹配
      if (inputBrand && spuBrand && inputBrand !== spuBrand) {
        continue;
      }
      
      // 计算词汇匹配度
      if (inputModel && spuModel) {
        // 型号词汇匹配
        const modelScore = this.calculateTokenSimilarity(
          this.tokenize(inputModel),
          this.tokenize(spuModel)
        );
        
        if (modelScore > 0.5) {
          score = 0.4 + modelScore * 0.6; // 品牌40% + 型号60%
          
          console.log('✅ 分词匹配:', {
            input: `${inputBrand} ${inputModel}`,
            spu: spu.name,
            modelScore: modelScore.toFixed(3),
            score: score.toFixed(3)
          });
          
          // 只有分数达到阈值的才算候选
          if (score >= threshold) {
            candidateCount++;
          }
          
          // 计算优先级
          const priority = this.getSPUPriority(input, spu.name);
          
          // 更新最佳匹配
          if (score > bestScore || (score === bestScore && priority > bestPriority)) {
            bestScore = score;
            bestMatch = spu;
            bestPriority = priority;
          }
        }
      } else if (!inputModel && !spuModel) {
        // 都没有型号，使用字符串相似度
        const similarity = this.calculateSimilarity(inputSPUPart, spuSPUPart);
        score = similarity;
        
        if (score >= threshold) {
          candidateCount++;
          const priority = this.getSPUPriority(input, spu.name);
          
          if (score > bestScore || (score === bestScore && priority > bestPriority)) {
            bestScore = score;
            bestMatch = spu;
            bestPriority = priority;
          }
        }
      }
    }
    
    console.log('\n=== SPU匹配结果 ===');
    console.log('总SPU数量:', spuList.length);
    console.log('过滤SPU数量:', filteredCount);
    console.log('候选SPU数量:', candidateCount);
    console.log('最佳匹配SPU:', bestMatch?.name || '无');
    console.log('最佳匹配分数:', bestScore.toFixed(3));
    console.log('最佳匹配优先级:', bestPriority);
    console.log('是否达到阈值:', bestScore >= threshold ? '是' : '否');
    
    if (bestScore < threshold) {
      console.log('匹配失败：分数未达到阈值');
      return { spu: null, similarity: 0 };
    }
    
    console.log('匹配成功！');
    return { spu: bestMatch, similarity: bestScore };
  }

  /**
   * 分词：将字符串分解为词汇
   * 支持英文单词和中文词汇
   */
  private tokenize(str: string): string[] {
    if (!str) return [];
    
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const isEnglish = /[a-zA-Z0-9]/.test(char);
      const isChinese = /[\u4e00-\u9fa5]/.test(char);
      
      if (isEnglish) {
        current += char;
      } else if (isChinese) {
        if (current) {
          tokens.push(current.toLowerCase());
          current = '';
        }
        tokens.push(char);
      } else {
        if (current) {
          tokens.push(current.toLowerCase());
          current = '';
        }
      }
    }
    
    if (current) {
      tokens.push(current.toLowerCase());
    }
    
    return tokens.filter(t => t.length > 0);
  }

  /**
   * 计算两个词汇列表的相似度
   * 使用无顺序的分词匹配
   */
  private calculateTokenSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }
    
    // 计算匹配的词汇数
    let matchCount = 0;
    
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (token1 === token2 || token1.includes(token2) || token2.includes(token1)) {
          matchCount++;
          break; // 每个 token1 只计算一次
        }
      }
    }
    
    // 相似度 = 匹配词汇数 / 总词汇数（取较大值）
    const totalTokens = Math.max(tokens1.length, tokens2.length);
    return matchCount / totalTokens;
  }

  // 在SKU列表中查找最佳匹配（基于参数）
  findBestSKUInList(input: string, skuList: SKUData[]): {
    sku: SKUData | null;
    similarity: number;
  } {
    const inputCapacity = this.extractCapacity(input);
    const inputColor = this.extractColor(input);
    
    console.log('=== SKU参数匹配 ===');
    console.log('提取容量:', inputCapacity);
    console.log('提取颜色:', inputColor);
    
    let bestMatch: SKUData | null = null;
    let bestScore = 0;
    
    for (const sku of skuList) {
      const skuCapacity = this.extractCapacity(sku.name);
      const skuColor = this.extractColor(sku.name);
      
      let paramScore = 0;
      let paramWeight = 0;
      
      // 容量匹配（权重70%）
      if (inputCapacity && skuCapacity) {
        paramWeight += 0.7;
        if (inputCapacity === skuCapacity) {
          paramScore += 0.7;
        }
      }
      
      // 颜色匹配（权重30%）
      if (inputColor && skuColor) {
        paramWeight += 0.3;
        // 完全匹配
        if (inputColor === skuColor) {
          paramScore += 0.3;
        }
        // 颜色变体匹配（使用 isColorVariant 辅助函数）
        // Requirements: 2.4.3, 3.2.4
        else if (isColorVariant(inputColor, skuColor)) {
          paramScore += 0.3; // 变体匹配视为完全匹配
        }
        // 基础颜色包含关系
        else if (
          inputColor.length > 1 && skuColor.length > 1 && 
          (inputColor.includes(skuColor) || skuColor.includes(inputColor))
        ) {
          paramScore += 0.2; // 部分匹配给2/3分数
        }
        // 基础颜色相同（如"龙晶紫"和"极光紫"都包含"紫"）
        else {
          const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰'];
          for (const basic of basicColors) {
            if (inputColor.includes(basic) && skuColor.includes(basic)) {
              paramScore += 0.1; // 基础颜色相同给1/3分数
              break;
            }
          }
        }
      }
      
      // 如果没有参数信息，返回第一个SKU
      if (paramWeight === 0) {
        if (!bestMatch) {
          bestMatch = sku;
          bestScore = 0.8; // 给一个默认分数
        }
        continue;
      }
      
      const finalScore = paramScore / paramWeight;
      
      console.log('SKU评分:', {
        skuName: sku.name,
        skuCapacity,
        skuColor,
        paramScore,
        paramWeight,
        finalScore
      });
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMatch = sku;
      }
    }
    
    console.log('最佳SKU匹配:', {
      sku: bestMatch?.name,
      score: bestScore
    });
    
    return { sku: bestMatch, similarity: bestScore };
  }

}

export function SmartMatchComponent() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSPU, setLoadingSPU] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [spuList, setSPUList] = useState<SPUData[]>([]);
  const [brandList, setBrandList] = useState<BrandData[]>([]); // 品牌列表
  const [colorList, setColorList] = useState<string[]>([]); // 动态颜色列表
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'inputName',
    'matchedSPU',
    'specs',
    'matchedSKU',
    'matchedBrand',
    'matchedGtins',
    'statusAndSimilarity',
  ]);
  const [columnDropdownVisible, setColumnDropdownVisible] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>(visibleColumns);
  const matcher = new SimpleMatcher();

  // 加载品牌数据
  useEffect(() => {
    const loadBrandData = async () => {
      try {
        const brands = await getBrandBaseList();
        setBrandList(brands);
        console.log('已加载品牌数据:', brands.length, '个品牌');
      } catch (error) {
        console.error('加载品牌数据失败:', error);
      }
    };
    loadBrandData();
  }, []);

  // 加载所有SPU数据并从SKU规格中提取颜色、规格、组合
  useEffect(() => {
    const loadSPUData = async () => {
      try {
        setLoadingSPU(true);
        
        console.log('=== 开始加载SPU和SKU规格数据 ===');
        const startTime = Date.now();
        
        // 分批加载所有SPU数据（包含skuIDs）
        const allSpuList = [];
        const batchSize = 10000;
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          const spuList = await getSPUListNew(
            {
              states: [SPUState.在用],
              limit: batchSize,
              offset,
              orderBy: [{ key: 'p."id"', sort: 'DESC' }],
            },
            ['id', 'name', 'brand', 'skuIDs']
          );
          
          allSpuList.push(...spuList);
          console.log(`已加载 ${spuList.length} 个SPU，总计: ${allSpuList.length}`);
          
          if (spuList.length < batchSize) {
            hasMore = false;
          } else {
            offset += batchSize;
          }
        }
        
        setSPUList(allSpuList);
        
        // 统计颜色、规格和组合数据
        // Requirements: 2.4.1, 3.2.1, 3.2.2
        const colorMap = new Map<string, Set<number>>();
        const specMap = new Map<string, Set<number>>();
        const comboMap = new Map<string, Set<number>>();
        
        let processedSKUs = 0;
        
        for (const spu of allSpuList) {
          const { id, skuIDs } = spu;
          
          if (!skuIDs || skuIDs.length === 0) {
            continue;
          }
          
          // 从 skuIDs 中提取颜色、规格和组合信息
          for (const skuInfo of skuIDs) {
            // 提取颜色
            if ('color' in skuInfo && skuInfo.color) {
              const color = skuInfo.color;
              if (!colorMap.has(color)) {
                colorMap.set(color, new Set());
              }
              colorMap.get(color)!.add(id);
            }
            
            // 提取规格
            if ('spec' in skuInfo && skuInfo.spec) {
              const spec = skuInfo.spec;
              if (!specMap.has(spec)) {
                specMap.set(spec, new Set());
              }
              specMap.get(spec)!.add(id);
            }
            
            // 提取组合
            if ('combo' in skuInfo && skuInfo.combo) {
              const combo = skuInfo.combo;
              if (!comboMap.has(combo)) {
                comboMap.set(combo, new Set());
              }
              comboMap.get(combo)!.add(id);
            }
            
            processedSKUs++;
          }
        }
        
        // 转换为数组并按长度降序排序（优先匹配更长的颜色词）
        const colors = Array.from(colorMap.keys()).sort((a, b) => b.length - a.length);
        setColorList(colors);
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log('=== 规格数据加载完成 ===');
        console.log(`总SPU数量: ${allSpuList.length}`);
        console.log(`处理SKU: ${processedSKUs} 个`);
        console.log(`提取颜色: ${colors.length} 个`);
        console.log(`提取规格: ${specMap.size} 个`);
        console.log(`提取组合: ${comboMap.size} 个`);
        console.log(`总耗时: ${totalTime}秒`);
        console.log('颜色列表（按长度降序）:', colors.slice(0, 20), colors.length > 20 ? `... 还有 ${colors.length - 20} 个` : '');
        
        message.success(`已加载 ${allSpuList.length} 个SPU，提取 ${colors.length} 个颜色词（耗时${totalTime}秒）`);
      } catch (error) {
        message.error('加载SPU数据失败');
        console.error(error);
      } finally {
        setLoadingSPU(false);
      }
    };
    loadSPUData();
  }, []);

  const handleMatch = async () => {
    if (!inputText.trim()) {
      message.warning('请输入商品名称');
      return;
    }

    if (spuList.length === 0) {
      message.warning('SPU数据未加载完成，请稍候');
      return;
    }

    setLoading(true);
    setResults([]); // 清空之前的结果
    setCurrentPage(1); // 重置到第一页
    
    // 设置动态颜色列表到 matcher
    matcher.setColorList(colorList);
    console.log('使用颜色列表:', colorList.length, '个颜色');
    
    try {
      // 将输入按行分割
      const lines = inputText.split('\n').filter(line => line.trim());
      
      // 对每一行进行匹配
      for (let i = 0; i < lines.length; i++) {
        let trimmedLine = lines[i].trim();
        
        // 添加：清理演示机标记
        trimmedLine = matcher.cleanDemoMarkers(trimmedLine);
        
        // PHASE2-4: 改进的输入预处理
        trimmedLine = matcher.preprocessInputAdvanced(trimmedLine);
        
        // PHASE2-1: 检测产品类型
        const productType = matcher.detectProductType(trimmedLine);
        console.log('产品类型:', productType);
        
        // PHASE2-2: 提取版本信息
        const inputVersion = matcher.extractVersion(trimmedLine);
        console.log('版本信息:', inputVersion?.name || '无');
        
        // 第一阶段：匹配SPU
        const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
          trimmedLine,
          spuList,
          0.5 // SPU匹配阈值降低到50%
        );
        
        if (!matchedSPU) {
          // SPU未匹配，立即显示结果
          setResults(prev => [...prev, {
            inputName: trimmedLine,
            matchedSKU: null,
            matchedSPU: null,
            matchedBrand: null,
            matchedVersion: null,
            matchedMemory: null,
            matchedColor: null,
            matchedGtins: [],
            similarity: 0,
            status: 'unmatched' as const,
          }]);
          continue;
        }
        
        // SPU匹配成功，先显示SPU结果
        const tempResult: MatchResult = {
          inputName: trimmedLine,
          matchedSKU: null,
          matchedSPU: matchedSPU.name,
          matchedBrand: matchedSPU.brand || null,
          matchedVersion: null,
          matchedMemory: null,
          matchedColor: null,
          matchedGtins: [],
          similarity: spuSimilarity,
          status: 'spu-matched' as const,
        };
        
        setResults(prev => [...prev, tempResult]);
        
        console.log('匹配到SPU:', matchedSPU.name, 'ID:', matchedSPU.id);
        
        // 第二阶段：加载该SPU的所有SKU
        try {
          const spuInfo = await getSPUInfo(matchedSPU.id);
          const skuIDs = spuInfo.skuIDs || [];
          
          if (skuIDs.length === 0) {
            // 该SPU没有SKU，更新为未匹配
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? { 
                ...r, 
                status: 'unmatched' as const,
                matchedGtins: [],
              } : r
            ));
            continue;
          }
          
          // 获取SKU详细信息
          const skuDetails = await getSKUsInfo(skuIDs.map(s => s.skuID));
          
          // 转换为 SKUData 格式
          const skuData: SKUData[] = skuDetails
            .filter(sku => !('errInfo' in sku) && sku.state === SKUState.在用)
            .map(sku => {
              // 从 SKU 名称中提取规格信息
              const capacity = matcher.extractCapacity(sku.name);
              const color = matcher.extractColorAdvanced(sku.name);
              
              return {
                id: sku.id,
                name: sku.name,
                spuID: matchedSPU.id,
                spuName: matchedSPU.name,
                brand: matchedSPU.brand,
                version: undefined, // SKU 中没有版本字段，可以从名称提取
                memory: capacity || undefined, // 使用容量作为内存
                color: color || undefined,
                gtins: sku.gtins || [],
              };
            });
          
          console.log(`SPU ${matchedSPU.name} 的在用SKU数量:`, skuData.length);
          
          if (skuData.length === 0) {
            // 该SPU没有在用的SKU，更新为未匹配
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? { 
                ...r, 
                status: 'unmatched' as const,
                matchedGtins: [],
              } : r
            ));
            continue;
          }
          
          // 第三阶段：在SKU中匹配参数（容量、颜色、版本）
          // PHASE2-2: 使用改进的 SKU 匹配，考虑版本信息
          const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKUWithVersion(
            trimmedLine,
            skuData,
            inputVersion
          );
          
          if (matchedSKU) {
            // 计算综合相似度
            // SPU 匹配（品牌+型号）占 50%
            // SKU 参数匹配（容量+颜色+版本）占 50%
            const finalSimilarity = spuSimilarity * 0.5 + skuSimilarity * 0.5;
            
            console.log('最终相似度计算:', {
              spuSimilarity,
              skuSimilarity,
              finalSimilarity,
              skuName: matchedSKU.name
            });
            
            // 更新为完全匹配
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? {
                ...r,
                matchedSKU: matchedSKU.name || null,
                matchedVersion: matchedSKU.version || null,
                matchedMemory: matchedSKU.memory || null,
                matchedColor: matchedSKU.color || null,
                matchedGtins: matchedSKU.gtins || [],
                similarity: finalSimilarity,
                status: 'matched' as const,
              } : r
            ));
          } else {
            // SKU参数未匹配，保持 SPU 已匹配状态
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? { 
                ...r, 
                status: 'unmatched' as const,
                matchedGtins: [],
              } : r
            ));
          }
        } catch (error) {
          console.error('加载SKU失败:', error);
          // 更新为未匹配
          setResults(prev => prev.map((r, idx) => 
            idx === prev.length - 1 ? { 
              ...r, 
              status: 'unmatched' as const,
              matchedGtins: [],
            } : r
          ));
        }
      }

      const finalResults = await new Promise<MatchResult[]>(resolve => {
        setTimeout(() => {
          setResults(current => {
            const matchedCount = current.filter(r => r.status === 'matched').length;
            message.success(`匹配完成，共处理 ${lines.length} 条记录，成功匹配 ${matchedCount} 条`);
            resolve(current);
            return current;
          });
        }, 100);
      });
      
    } catch (error) {
      message.error('匹配失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (results.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    const csvContent = [
      ['输入商品名称', '匹配状态', '匹配的SPU', '版本', '内存', '颜色', '匹配的SKU', '品牌', '69码', '相似度'],
      ...results.map(r => [
        r.inputName,
        r.status === 'matched' ? '已匹配' : '未匹配',
        r.matchedSPU || '-',
        r.matchedVersion || '-',
        r.matchedMemory || '-',
        r.matchedColor || '-',
        r.matchedSKU || '-',
        r.matchedBrand || '-',
        r.matchedGtins.join('; ') || '-',
        r.status === 'matched' ? `${(r.similarity * 100).toFixed(0)}%` : '-',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `智能匹配结果_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    message.success('导出成功');
  };

  // 定义所有可用的列
  const allColumns = [
    {
      title: '输入商品名称',
      dataIndex: 'inputName',
      key: 'inputName',
      width: 250,
      fixed: 'left' as const,
    },
    {
      title: '匹配的SPU',
      dataIndex: 'matchedSPU',
      key: 'matchedSPU',
      width: 200,
      render: (text: string | null) => text || '-',
    },
    {
      title: '规格标签',
      key: 'specs',
      width: 250,
      render: (_: unknown, record: MatchResult) => {
        if (record.status === 'spu-matched') {
          return <span className="text-gray-400">正在匹配...</span>;
        }
        const specs = [];
        if (record.matchedVersion) specs.push(<Tag key="version" color="blue">{record.matchedVersion}</Tag>);
        if (record.matchedMemory) specs.push(<Tag key="memory" color="green">{record.matchedMemory}</Tag>);
        if (record.matchedColor) specs.push(<Tag key="color" color="purple">{record.matchedColor}</Tag>);
        return specs.length > 0 ? <Space size={4}>{specs}</Space> : '-';
      },
    },
    {
      title: '匹配的SKU',
      dataIndex: 'matchedSKU',
      key: 'matchedSKU',
      width: 250,
      render: (text: string | null, record: MatchResult) => {
        if (record.status === 'spu-matched') {
          return <span className="text-gray-400">正在匹配SKU...</span>;
        }
        return text || '-';
      },
    },
    {
      title: '品牌',
      dataIndex: 'matchedBrand',
      key: 'matchedBrand',
      width: 120,
      render: (text: string | null) => {
        if (!text) return '-';
        const brand = brandList.find(b => b.name === text);
        return brand ? <Tag color={brand.color}>{brand.name}</Tag> : <Tag color="orange">{text}</Tag>;
      },
    },
    {
      title: '69码',
      dataIndex: 'matchedGtins',
      key: 'matchedGtins',
      width: 200,
      render: (gtins: string[]) => {
        if (!gtins || gtins.length === 0) return '-';
        return (
          <div className="flex flex-col gap-1">
            {gtins.map((gtin, idx) => (
              <span key={idx} className="text-xs font-mono">{gtin}</span>
            ))}
          </div>
        );
      },
    },
    {
      title: '状态/相似度',
      key: 'statusAndSimilarity',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: MatchResult) => {
        if (record.status === 'matched') {
          return (
            <Space direction="vertical" size={4}>
              <Tag icon={<CheckCircle size={14} />} color="success">
                已匹配
              </Tag>
              <Tag color={record.similarity >= 0.8 ? 'green' : record.similarity >= 0.6 ? 'orange' : 'red'}>
                {(record.similarity * 100).toFixed(0)}%
              </Tag>
            </Space>
          );
        } else if (record.status === 'spu-matched') {
          return (
            <Tag icon={<Loader2 size={14} className="animate-spin" />} color="processing">
              匹配中...
            </Tag>
          );
        } else {
          return (
            <Tag icon={<XCircle size={14} />} color="error">
              未匹配
            </Tag>
          );
        }
      },
    },
  ];

  // 根据 visibleColumns 过滤列
  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

  if (loadingSPU) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="正在加载SPU数据..." />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* 左侧：输入区域 */}
      <div className="w-1/3 flex flex-col">
        <Card className="flex-1 flex flex-col" bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex flex-col h-full">
            <div className="mb-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  输入商品名称（每行一个）
                </label>
                <div className="text-sm text-slate-500">
                  已加载 {spuList.length} 个SPU
                </div>
              </div>
              <Input.TextArea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入商品名称，每行一个&#10;例如：&#10;华为 Mate 60 Pro 12+256 雅川青&#10;苹果 iPhone 15 Pro Max 256GB 钛金色&#10;小米14 Ultra 16GB+512GB 黑色"
                className="flex-1"
                style={{ height: '100%', minHeight: '400px', resize: 'none' }}
                disabled={loading}
              />
            </div>

            <div className="mt-auto space-y-3">
              <div className="text-sm text-slate-500">
                支持批量输入，系统将先匹配SPU，再匹配对应的SKU参数（容量、颜色）
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setInputText('');
                    setResults([]);
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                  block
                >
                  清空
                </Button>
                <Button
                  type="primary"
                  icon={loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  onClick={handleMatch}
                  disabled={loading || !inputText.trim()}
                  block
                >
                  {loading ? '匹配中...' : '开始匹配'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 右侧：结果区域 */}
      <div className="w-2/3 flex flex-col">
        {results.length > 0 ? (
          <Card 
            className="flex-1 flex flex-col"
            bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
            title={
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <span>匹配结果</span>
                  <div className="flex gap-2">
                    <Tag color="blue">
                      总计：{results.length} 条
                    </Tag>
                    <Tag color="success">
                      已匹配：{results.filter(r => r.status === 'matched').length} 条
                    </Tag>
                    <Tag color="error">
                      未匹配：{results.filter(r => r.status === 'unmatched').length} 条
                    </Tag>
                  </div>
                </div>
                <Space>
                  <Dropdown
                    open={columnDropdownVisible}
                    onOpenChange={(visible) => {
                      if (visible) {
                        setTempVisibleColumns(visibleColumns);
                      }
                      setColumnDropdownVisible(visible);
                    }}
                    dropdownRender={() => (
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3" style={{ minWidth: '200px' }}>
                        <div className="mb-2 pb-2 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">选择显示列</span>
                        </div>
                        <div className="space-y-2 mb-3">
                          <Checkbox
                            checked={tempVisibleColumns.includes('inputName')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'inputName']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'inputName'));
                              }
                            }}
                          >
                            输入商品名称
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedSPU')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedSPU']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedSPU'));
                              }
                            }}
                          >
                            匹配的SPU
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('specs')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'specs']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'specs'));
                              }
                            }}
                          >
                            规格标签
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedSKU')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedSKU']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedSKU'));
                              }
                            }}
                          >
                            匹配的SKU
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedBrand')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedBrand']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedBrand'));
                              }
                            }}
                          >
                            品牌
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedGtins')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedGtins']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedGtins'));
                              }
                            }}
                          >
                            69码
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('statusAndSimilarity')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'statusAndSimilarity']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'statusAndSimilarity'));
                              }
                            }}
                          >
                            状态/相似度
                          </Checkbox>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <Button
                            size="small"
                            onClick={() => {
                              setTempVisibleColumns(visibleColumns);
                              setColumnDropdownVisible(false);
                            }}
                            block
                          >
                            取消
                          </Button>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                              setVisibleColumns(tempVisibleColumns);
                              setColumnDropdownVisible(false);
                              message.success('已更新显示列');
                            }}
                            block
                          >
                            确定
                          </Button>
                        </div>
                      </div>
                    )}
                    trigger={['click']}
                  >
                    <Button icon={<Settings size={16} />} size="small">
                      显示列
                    </Button>
                  </Dropdown>
                  <Button
                    icon={<Download size={16} />}
                    onClick={exportResults}
                    size="small"
                  >
                    导出CSV
                  </Button>
                </Space>
              </div>
            }
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">
                <Table
                  columns={columns}
                  dataSource={results}
                  rowKey={(record, index) => `${record.inputName}-${index}`}
                  scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: results.length,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                    },
                    onShowSizeChange: (current, size) => {
                      setCurrentPage(1);
                      setPageSize(size);
                    },
                  }}
                />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center" bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="text-center text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">请在左侧输入商品名称并点击"开始匹配"</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// 导出 SimpleMatcher 类供其他组件使用
export { SimpleMatcher };
