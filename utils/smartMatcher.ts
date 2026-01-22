/**
 * 智能匹配工具类
 * 提供统一的商品匹配逻辑，供在线匹配和表格匹配使用
 */

import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

// ==================== 类型定义 ====================

export interface SPUData {
  id: number;
  name: string;
  brand?: string;
  skuIDs?: any[];
}

export interface SKUData {
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

export interface MatchResult {
  inputName: string;
  matchedSKU: string | null;
  matchedSPU: string | null;
  matchedBrand: string | null;
  matchedVersion: string | null;
  matchedMemory: string | null;
  matchedColor: string | null;
  matchedGtins: string[];
  similarity: number;
  status: 'matched' | 'unmatched' | 'spu-matched';
}

// 产品类型定义
export type ProductType = 'phone' | 'watch' | 'tablet' | 'laptop' | 'earbuds' | 'band' | 'unknown';

// 版本信息
export interface VersionInfo {
  name: string;
  keywords: string[];
  priority: number;
}

// ==================== 配置常量 ====================

// 产品类型特征
interface ProductTypeFeature {
  keywords: string[];
  modelPattern: RegExp;
  specialParams: string[];
  paramPattern: RegExp;
}

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

// 版本关键词映射
const VERSION_KEYWORDS_MAP: Record<string, VersionInfo> = {
  'standard': { name: '标准版', keywords: ['标准版', '基础版'], priority: 1 },
  'lite': { name: '活力版', keywords: ['活力版', '轻享版'], priority: 2 },
  'enjoy': { name: '优享版', keywords: ['优享版', '享受版'], priority: 3 },
  'premium': { name: '尊享版', keywords: ['尊享版', '高端版'], priority: 4 },
  'pro': { name: 'Pro 版', keywords: ['pro', 'pro版'], priority: 5 },
};

// 型号标准化映射
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
  'watchd': 'watch d',
  'watchd2': 'watch d2',
  'watchfit': 'watch fit',
  'watchx2mini': 'watch x2 mini',
  'watchs': 'watch s',
  'reno15': 'reno 15',
  'reno15pro': 'reno 15 pro',
  'reno15c': 'reno 15c',
  'findx9': 'find x9',
  'findx9pro': 'find x9 pro',
  'findn5': 'find n5',
  'k13turbopro': 'k13 turbo pro',
  'y300i': 'y300i',
  'y300pro': 'y300 pro',
  'y300pro+': 'y300 pro+',
  'y300proplus': 'y300 pro plus',
  's30promini': 's30 pro mini',
  's50promini': 's50 pro mini',
  'xfold5': 'x fold5',
  'x200pro': 'x200 pro',
  'x200s': 'x200s',
  'x200ultra': 'x200 ultra',
};

// 礼盒版过滤关键词
const GIFT_BOX_KEYWORDS = ['礼盒', '套装', '系列', '礼品', '礼包'];

// 版本关键词
const VERSION_KEYWORDS = ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];

// 颜色变体映射
const COLOR_VARIANTS: Record<string, string[]> = {
  '雾凇蓝': ['雾松蓝'],
  '雾松蓝': ['雾凇蓝'],
  '空白格': ['空格白'],
  '空格白': ['空白格'],
  '玉石绿': ['玉龙雪', '锆石黑'],
  '玛瑙粉': ['晶钻粉', '粉梦生花'],
  '琥珀黑': ['锆石黑', '曜石黑'],
  '玄武黑': ['曜石黑', '深空黑'],
  '龙晶紫': ['极光紫', '流光紫'],
  '冰川蓝': ['天青蓝', '星河蓝'],
  '深空黑': ['曜石黑', '玄武黑'],
  '灵感紫': ['流光紫', '龙晶紫'],
};

/**
 * 检查两个颜色是否为已知的变体对
 */
function isColorVariant(color1: string, color2: string): boolean {
  if (!color1 || !color2) return false;
  
  const variants1 = COLOR_VARIANTS[color1];
  if (variants1 && variants1.includes(color2)) return true;
  
  const variants2 = COLOR_VARIANTS[color2];
  if (variants2 && variants2.includes(color1)) return true;
  
  return false;
}

// ==================== SimpleMatcher 类 ====================

export class SimpleMatcher {
  private dynamicColors: string[] = [];
  
  /**
   * 设置动态颜色列表
   */
  setColorList(colors: string[]) {
    this.dynamicColors = colors;
  }

  /**
   * 检测产品类型
   */
  detectProductType(input: string): ProductType {
    const lowerInput = input.toLowerCase();
    
    for (const [type, features] of Object.entries(PRODUCT_TYPE_FEATURES)) {
      for (const keyword of features.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          return type as ProductType;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * 提取版本信息
   */
  extractVersion(input: string): VersionInfo | null {
    const lowerInput = input.toLowerCase();
    
    for (const versionInfo of Object.values(VERSION_KEYWORDS_MAP)) {
      for (const keyword of versionInfo.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          return versionInfo;
        }
      }
    }
    
    return null;
  }

  /**
   * 改进的输入预处理
   */
  preprocessInputAdvanced(input: string): string {
    let processed = input;
    
    // 1. 提取容量信息
    const capacityPattern = /\((\d+(?:GB)?\s*\+\s*\d+(?:GB|T)?)\)/gi;
    const capacities: string[] = [];
    let match;
    while ((match = capacityPattern.exec(processed)) !== null) {
      capacities.push(match[1]);
    }
    
    // 2. 移除所有括号内容
    processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
    
    // 3. 重新添加容量信息
    if (capacities.length > 0) {
      processed = processed.replace(/(\d+G)\s*/, `$1 ${capacities[0]} `);
    }
    
    // 4. 处理特殊字符
    processed = processed.replace(/[（）]/g, (match) => match === '（' ? '(' : ')');
    
    // 5. 处理空格变体
    processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
    processed = processed.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
    processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // 6. 清理多余空格
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * 清理演示机/样机标记和配件品牌前缀
   */
  cleanDemoMarkers(input: string): string {
    const demoKeywords = ['演示机', '样机', '展示机', '体验机', '试用机', '测试机'];
    const accessoryBrands = ['优诺严选', '品牌', '赠品', '严选', '檀木'];
    
    let cleaned = input;
    
    for (const keyword of demoKeywords) {
      cleaned = cleaned.replace(new RegExp(keyword, 'g'), '');
    }
    
    for (const brand of accessoryBrands) {
      cleaned = cleaned.replace(new RegExp(`^${brand}\\s*`, 'g'), '');
    }
    
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  /**
   * 提取品牌
   */
  extractBrand(str: string): string | null {
    const lowerStr = str.toLowerCase();
    const brands = [
      'apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 
      'samsung', 'oneplus', 'realme', 'iqoo', 'redmi', 'nova', 
      'mate', 'pura', 'pocket', 'reno', 'find'
    ];
    
    for (const brand of brands) {
      if (lowerStr.includes(brand)) {
        return brand;
      }
    }
    
    if (lowerStr.includes('苹果')) return 'apple';
    if (lowerStr.includes('华为')) return 'huawei';
    if (lowerStr.includes('荣耀')) return 'honor';
    if (lowerStr.includes('小米')) return 'xiaomi';
    if (lowerStr.includes('红米')) return 'xiaomi';
    
    return null;
  }

  /**
   * 提取型号（多层次匹配）
   */
  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 移除括号内容
    let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
    
    // 移除品牌
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus'];
    for (const brand of brands) {
      const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(brandRegex, ' ');
    }
    
    normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
    
    // 应用型号标准化
    Object.entries(MODEL_NORMALIZATIONS).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      normalizedStr = normalizedStr.replace(regex, to);
    });
    
    // 优先级1: 字母+字母格式
    const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
    const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
    
    const wordMatches2 = normalizedStr.match(wordModelPattern2);
    const wordMatches1 = normalizedStr.match(wordModelPattern1);
    const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
    
    if (wordMatches && wordMatches.length > 0) {
      return wordMatches[0].toLowerCase().replace(/\s+/g, '');
    }
    
    // 优先级2: 复杂型号格式（支持 Pro+, Max+ 等带加号的型号）
    const complexModelPattern = /\b([a-z]+)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note|turbo)(\+)?(\s+(mini|max|plus|ultra|pro))?\b/gi;
    const complexMatches = normalizedStr.match(complexModelPattern);
    
    if (complexMatches && complexMatches.length > 0) {
      const filtered = complexMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('gb') && !/\d+g$/i.test(lower);
      });
      
      if (filtered.length > 0) {
        return filtered.sort((a, b) => b.length - a.length)[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    // 优先级3: 简单型号格式
    const simpleModelPattern = /\b([a-z]+)(\d+)([a-z]*)\b/gi;
    const simpleMatches = normalizedStr.match(simpleModelPattern);
    
    if (simpleMatches && simpleMatches.length > 0) {
      const filtered = simpleMatches.filter(m => {
        const lower = m.toLowerCase();
        return !/^[345]g$/i.test(lower) && !lower.includes('gb') && !/^\d+g$/i.test(lower);
      });
      
      if (filtered.length > 0) {
        const sorted = filtered.sort((a, b) => {
          const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
          const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
          if (aHasSuffix && !bHasSuffix) return -1;
          if (!aHasSuffix && bHasSuffix) return 1;
          return b.length - a.length;
        });
        
        return sorted[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    return null;
  }

  /**
   * 提取容量
   */
  extractCapacity(str: string): string | null {
    // 匹配括号内的容量
    const bracketPattern = /\((\d+)\s*(?:gb)?\s*\+\s*(\d+)\s*(?:gb)?\)?/gi;
    let match = str.match(bracketPattern);
    
    if (match && match.length > 0) {
      const nums = match[0].match(/\d+/g);
      if (nums && nums.length === 2) {
        return `${nums[0]}+${nums[1]}`;
      }
    }
    
    // 匹配不在括号内的容量
    const capacityPattern = /(\d+)\s*(?:gb)?\s*\+\s*(\d+)\s*(?:gb)?/gi;
    match = str.match(capacityPattern);
    
    if (match && match.length > 0) {
      const nums = match[0].match(/\d+/g);
      if (nums && nums.length === 2) {
        return `${nums[0]}+${nums[1]}`;
      }
    }
    
    // 匹配单个容量
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
   * 改进的颜色提取
   */
  extractColorAdvanced(input: string): string | null {
    // 方法1: 使用扩展颜色库
    for (const [colorName, colorInfo] of Object.entries(COLOR_VARIANTS)) {
      if (input.includes(colorName)) {
        return colorName;
      }
      for (const variant of colorInfo) {
        if (input.includes(variant)) {
          return colorName;
        }
      }
    }
    
    // 方法2: 使用动态颜色列表
    if (this.dynamicColors.length > 0) {
      for (const color of this.dynamicColors) {
        if (input.includes(color)) {
          return color;
        }
      }
    }
    
    // 方法3: 从字符串末尾提取
    const lastWords = input.match(/[\u4e00-\u9fa5]{2,5}$/);
    if (lastWords) {
      const word = lastWords[0];
      const excludeWords = [
        '全网通', '网通', '版本', '标准', '套餐', '蓝牙版',
        '活力版', '优享版', '尊享版', '标准版', '基础版'
      ];
      if (!excludeWords.includes(word)) {
        return word;
      }
    }
    
    return null;
  }

  /**
   * 改进的颜色匹配
   */
  isColorMatch(color1: string, color2: string): boolean {
    if (!color1 || !color2) return false;
    if (color1 === color2) return true;
    if (isColorVariant(color1, color2)) return true;
    
    // 基础颜色匹配
    const basicColorMap: Record<string, string[]> = {
      '黑': ['黑', '深', '曜', '玄', '纯', '简', '辰'],
      '白': ['白', '零', '雪', '空', '格'],
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
    
    for (const [basicColor, variants] of Object.entries(basicColorMap)) {
      const color1HasBasic = variants.some(v => color1.includes(v));
      const color2HasBasic = variants.some(v => color2.includes(v));
      
      if (color1HasBasic && color2HasBasic) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查是否应该过滤某个SPU
   */
  shouldFilterSPU(inputName: string, spuName: string): boolean {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    // 规则1: 礼盒版过滤
    const hasGiftBoxKeywordInInput = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    const hasGiftBoxKeywordInSPU = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeywordInInput && hasGiftBoxKeywordInSPU) {
      return true;
    }
    
    // 规则2: 版本互斥过滤
    const hasBluetooth = lowerInput.includes('蓝牙版');
    const hasESIM = lowerInput.includes('esim版') || lowerInput.includes('esim版');
    
    if (hasBluetooth && (lowerSPU.includes('esim版') || lowerSPU.includes('esim版'))) {
      return true;
    }
    
    if (hasESIM && lowerSPU.includes('蓝牙版')) {
      return true;
    }
    
    return false;
  }

  /**
   * 计算SPU的优先级分数
   */
  getSPUPriority(inputName: string, spuName: string): number {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    const hasGiftBoxKeyword = GIFT_BOX_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    const hasSpecialVersion = VERSION_KEYWORDS.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeyword && !hasSpecialVersion) {
      return 3; // 标准版：优先级最高
    }
    
    if (hasSpecialVersion) {
      for (const keyword of VERSION_KEYWORDS) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerInput.includes(lowerKeyword) && lowerSPU.includes(lowerKeyword)) {
          return 2; // 版本匹配的特殊版：优先级中等
        }
      }
    }
    
    return 1; // 其他情况：优先级最低
  }

  /**
   * 提取 SPU 部分
   */
  extractSPUPart(str: string): string {
    // 规则1: 优先检查 "全网通5G"
    const fullNetworkFiveGPattern = /(.+?)\s*全网通\s*5g(?:版)?\b/i;
    const fullNetworkFiveGMatch = str.match(fullNetworkFiveGPattern);
    if (fullNetworkFiveGMatch) {
      return fullNetworkFiveGMatch[1].trim();
    }
    
    // 规则2: 检查单独的 "5G"
    const fiveGPattern = /(.+?)\s*5g(?:版)?\b/i;
    const fiveGMatch = str.match(fiveGPattern);
    if (fiveGMatch) {
      return fiveGMatch[1].trim();
    }
    
    // 规则3: 如果找到内存
    const memoryPattern = /(.+?)\s*\(?\d+\s*gb\s*\+\s*\d+\s*(?:gb)?\)?/i;
    const memoryMatch = str.match(memoryPattern);
    if (memoryMatch) {
      return memoryMatch[1].trim();
    }
    
    // 规则4: 按照品牌+型号方法确定SPU
    let spuPart = str;
    
    let versionKeyword: string | null = null;
    let versionIndex = -1;
    
    for (const versionInfo of Object.values(VERSION_KEYWORDS_MAP)) {
      for (const keyword of versionInfo.keywords) {
        const index = spuPart.indexOf(keyword);
        if (index !== -1) {
          versionKeyword = keyword;
          versionIndex = index;
          break;
        }
      }
      if (versionKeyword) break;
    }
    
    if (versionKeyword && versionIndex !== -1) {
      const versionEndIndex = versionIndex + versionKeyword.length;
      spuPart = spuPart.substring(0, versionEndIndex).trim();
    } else {
      const color = this.extractColorAdvanced(str);
      if (color) {
        const colorIndex = spuPart.lastIndexOf(color);
        if (colorIndex !== -1) {
          spuPart = spuPart.substring(0, colorIndex).trim();
        }
      }
      
      spuPart = spuPart.replace(/软胶|硅胶|皮革|陶瓷|玻璃/gi, '');
      spuPart = spuPart.trim().replace(/\s+/g, ' ');
    }
    
    return spuPart;
  }

  /**
   * 分词：将字符串分解为词汇
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
   */
  private calculateTokenSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }
    
    let matchCount = 0;
    
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (token1 === token2 || token1.includes(token2) || token2.includes(token1)) {
          matchCount++;
          break;
        }
      }
    }
    
    const totalTokens = Math.max(tokens1.length, tokens2.length);
    return matchCount / totalTokens;
  }

  /**
   * 查找最佳匹配的SPU
   */
  findBestSPUMatch(input: string, spuList: SPUData[], threshold: number = 0.6): {
    spu: SPUData | null;
    similarity: number;
  } {
    const inputSPUPart = this.extractSPUPart(input);
    const inputBrand = this.extractBrand(inputSPUPart);
    const inputModel = this.extractModel(inputSPUPart);
    const inputVersion = this.extractVersion(inputSPUPart);
    
    let bestMatch: SPUData | null = null;
    let bestScore = 0;
    let bestPriority = 0;
    
    // 第一阶段：有字母顺序全字匹配
    for (const spu of spuList) {
      if (this.shouldFilterSPU(input, spu.name)) {
        continue;
      }
      
      const spuSPUPart = this.extractSPUPart(spu.name);
      const spuBrand = this.extractBrand(spuSPUPart);
      const spuModel = this.extractModel(spuSPUPart);
      const spuVersion = this.extractVersion(spuSPUPart);
      
      let score = 0;
      
      if (inputBrand && spuBrand && inputBrand === spuBrand &&
          inputModel && spuModel && 
          inputModel.replace(/\s+/g, '') === spuModel.replace(/\s+/g, '')) {
        
        score = 0.8;
        
        if (inputVersion && spuVersion) {
          if (inputVersion.name === spuVersion.name) {
            score = 1.0;
          } else {
            score = 0.6;
          }
        } else if (!inputVersion && !spuVersion) {
          score = 1.0;
        } else if (inputVersion && !spuVersion) {
          score = 0.7;
        } else if (!inputVersion && spuVersion) {
          score = 0.9;
        }
        
        const priority = this.getSPUPriority(input, spu.name);
        
        if (score > bestScore || 
            (score === bestScore && priority > bestPriority) ||
            (score === bestScore && priority === bestPriority && spu.name.length < (bestMatch?.name.length || Infinity))) {
          bestScore = score;
          bestMatch = spu;
          bestPriority = priority;
        }
      }
    }
    
    if (bestMatch && bestScore >= threshold) {
      return { spu: bestMatch, similarity: bestScore };
    }
    
    // 第二阶段：无顺序的分词匹配
    bestMatch = null;
    bestScore = 0;
    bestPriority = 0;
    
    for (const spu of spuList) {
      if (this.shouldFilterSPU(input, spu.name)) {
        continue;
      }
      
      const spuSPUPart = this.extractSPUPart(spu.name);
      const spuBrand = this.extractBrand(spuSPUPart);
      const spuModel = this.extractModel(spuSPUPart);
      
      let score = 0;
      
      if (inputBrand && spuBrand && inputBrand !== spuBrand) {
        continue;
      }
      
      if (inputModel && spuModel) {
        const modelScore = this.calculateTokenSimilarity(
          this.tokenize(inputModel),
          this.tokenize(spuModel)
        );
        
        if (modelScore > 0.5) {
          score = 0.4 + modelScore * 0.6;
          
          if (score >= threshold) {
            const priority = this.getSPUPriority(input, spu.name);
            
            if (score > bestScore || (score === bestScore && priority > bestPriority)) {
              bestScore = score;
              bestMatch = spu;
              bestPriority = priority;
            }
          }
        }
      }
    }
    
    if (bestScore < threshold) {
      return { spu: null, similarity: 0 };
    }
    
    return { spu: bestMatch, similarity: bestScore };
  }

  /**
   * 改进的 SKU 匹配，考虑版本信息
   */
  findBestSKUWithVersion(
    input: string,
    skuList: SKUData[],
    inputVersion: VersionInfo | null
  ): { sku: SKUData | null; similarity: number } {
    const inputCapacity = this.extractCapacity(input);
    const inputColor = this.extractColorAdvanced(input);
    
    let bestMatch: SKUData | null = null;
    let bestScore = 0;
    
    for (const sku of skuList) {
      const skuCapacity = this.extractCapacity(sku.name);
      const skuColor = this.extractColorAdvanced(sku.name);
      const skuVersion = this.extractVersion(sku.name);
      
      let score = 0;
      let totalWeight = 0;
      
      // 版本匹配（基础权重 30%）
      if (inputVersion || skuVersion) {
        totalWeight += 0.3;
        if (inputVersion && skuVersion) {
          if (inputVersion.name === skuVersion.name) {
            score += 0.3;
          } else if (inputVersion.priority === skuVersion.priority) {
            score += 0.25;
          }
        } else if (!inputVersion && !skuVersion) {
          score += 0.3;
        }
      }
      
      // 容量匹配（基础权重 40%）
      if (inputCapacity || skuCapacity) {
        totalWeight += 0.4;
        if (inputCapacity && skuCapacity && inputCapacity === skuCapacity) {
          score += 0.4;
        }
      }
      
      // 颜色匹配（基础权重 30%）
      if (inputColor || skuColor) {
        totalWeight += 0.3;
        if (inputColor && skuColor && this.isColorMatch(inputColor, skuColor)) {
          score += 0.3;
        }
      }
      
      if (totalWeight === 0) {
        totalWeight = 1;
        score = 0.1;
      }
      
      const finalScore = score / totalWeight;
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMatch = sku;
      }
    }
    
    return { sku: bestMatch, similarity: bestScore };
  }

  /**
   * 在SKU列表中查找最佳匹配（基于参数）
   */
  findBestSKUInList(input: string, skuList: SKUData[]): {
    sku: SKUData | null;
    similarity: number;
  } {
    const inputCapacity = this.extractCapacity(input);
    const inputColor = this.extractColorAdvanced(input);
    
    let bestMatch: SKUData | null = null;
    let bestScore = 0;
    
    for (const sku of skuList) {
      const skuCapacity = this.extractCapacity(sku.name);
      const skuColor = this.extractColorAdvanced(sku.name);
      
      let paramScore = 0;
      let paramWeight = 0;
      
      if (inputCapacity && skuCapacity) {
        paramWeight += 0.7;
        if (inputCapacity === skuCapacity) {
          paramScore += 0.7;
        }
      }
      
      if (inputColor && skuColor) {
        paramWeight += 0.3;
        if (inputColor === skuColor) {
          paramScore += 0.3;
        } else if (isColorVariant(inputColor, skuColor)) {
          paramScore += 0.3;
        } else if (
          inputColor.length > 1 && skuColor.length > 1 && 
          (inputColor.includes(skuColor) || skuColor.includes(inputColor))
        ) {
          paramScore += 0.2;
        }
      }
      
      if (paramWeight === 0) {
        if (!bestMatch) {
          bestMatch = sku;
          bestScore = 0.8;
        }
        continue;
      }
      
      const finalScore = paramScore / paramWeight;
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMatch = sku;
      }
    }
    
    return { sku: bestMatch, similarity: bestScore };
  }
}
