/**
 * 智能匹配工具类
 * 提供统一的商品匹配逻辑，供在线匹配和表格匹配使用
 */

import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { 
  ConfigLoader, 
  type VersionKeywordConfig, 
  type ColorVariantConfig, 
  type FilterKeywordConfig,
  type ModelNormalizationConfig 
} from './config-loader';

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

// ==================== SimpleMatcher 类 ====================
export class SimpleMatcher {
  private dynamicColors: string[] = [];
  private brandList: Array<{ name: string; spell?: string }> = [];
  private versionKeywords: VersionKeywordConfig['versions'] = [];
  private networkVersions: string[] = [];
  private colorVariantsMap: Map<string, string[]> = new Map();
  private filterKeywords: FilterKeywordConfig | null = null;
  private modelNormalizations: Record<string, string> = {};
  private initialized = false;
  
  /**
   * 初始化配置（异步）
   * 在使用 matcher 前应该调用此方法
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // 加载所有配置
      const [versionConfig, colorConfig, filterConfig, modelConfig] = await Promise.all([
        ConfigLoader.load<VersionKeywordConfig>('version-keywords'),
        ConfigLoader.load<ColorVariantConfig>('color-variants'),
        ConfigLoader.load<FilterKeywordConfig>('filter-keywords'),
        ConfigLoader.load<ModelNormalizationConfig>('model-normalizations')
      ]);
      
      // 设置版本关键词
      this.versionKeywords = versionConfig.versions;
      this.networkVersions = versionConfig.networkVersions;
      
      // 设置颜色变体映射
      colorConfig.variants.forEach(variant => {
        variant.colors.forEach(color => {
          this.colorVariantsMap.set(color, variant.colors);
        });
      });
      
      // 设置过滤关键词
      this.filterKeywords = filterConfig;
      
      // 设置型号标准化映射
      this.modelNormalizations = modelConfig.normalizations;
      
      this.initialized = true;
      console.log('✓ SimpleMatcher initialized with configs');
    } catch (error) {
      console.error('Failed to initialize SimpleMatcher:', error);
      // 使用默认值继续运行
      this.initialized = true;
    }
  }
  
  /**
   * 设置动态颜色列表
   */
  setColorList(colors: string[]) {
    this.dynamicColors = colors;
  }

  /**
   * 设置品牌列表（从品牌库读取）
   */
  setBrandList(brands: Array<{ name: string; spell?: string }>) {
    this.brandList = brands;
  }

  /**
   * 检查两个品牌是否匹配（考虑不同写法）
   * 例如："红米" 和 "Redmi" 应该匹配（它们有相同的拼音）
   */
  private isBrandMatch(brand1: string | null, brand2: string | null): boolean {
    if (!brand1 || !brand2) return false;
    
    // 完全匹配
    if (brand1 === brand2) return true;
    
    // 通过拼音匹配
    if (this.brandList.length > 0) {
      const brand1Info = this.brandList.find(b => b.name === brand1);
      const brand2Info = this.brandList.find(b => b.name === brand2);
      
      // 如果两个品牌有相同的拼音，认为它们匹配
      if (brand1Info && brand2Info && brand1Info.spell && brand2Info.spell) {
        return brand1Info.spell.toLowerCase() === brand2Info.spell.toLowerCase();
      }
    }
    
    return false;
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
    
    // 使用配置的版本关键词
    for (const versionInfo of this.versionKeywords) {
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
      // 改进：在品牌+型号后添加容量，而不是只在网络制式后
      // 策略：在第一个中文字符（通常是颜色）前添加容量
      const chinesePattern = /[\u4e00-\u9fa5]/;
      const chineseIndex = processed.search(chinesePattern);
      
      if (chineseIndex !== -1) {
        // 在中文字符前插入容量
        processed = processed.slice(0, chineseIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(chineseIndex).trim();
      } else {
        // 如果没有中文字符，在末尾添加容量
        processed = processed.trim() + ' ' + capacities[0];
      }
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
    // 使用配置的关键词，如果未加载则使用默认值
    const demoKeywords = this.filterKeywords?.demo || ['演示机', '样机', '展示机', '体验机', '试用机', '测试机'];
    const accessoryBrands = this.filterKeywords?.accessoryBrands || ['优诺严选', '品牌', '赠品', '严选', '檀木'];
    
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
   * 提取品牌（完全使用品牌库数据）
   */
  extractBrand(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 使用品牌库数据
    if (this.brandList.length > 0) {
      // 按品牌名称长度降序排序，优先匹配更长的品牌名
      const sortedBrands = [...this.brandList].sort((a, b) => b.name.length - a.name.length);
      
      for (const brand of sortedBrands) {
        const brandName = brand.name.toLowerCase();
        const brandSpell = brand.spell?.toLowerCase();
        
        // 匹配中文品牌名
        if (lowerStr.includes(brandName)) {
          return brand.name; // 返回原始品牌名（保持大小写）
        }
        
        // 匹配拼音
        if (brandSpell && lowerStr.includes(brandSpell)) {
          return brand.name;
        }
      }
    } else {
      // 如果品牌库未加载，记录警告
      console.warn('品牌库未加载，品牌识别可能不准确');
    }
    
    return null;
  }

  /**
   * 智能型号标准化
   * 自动在关键词前添加空格，减少硬编码映射
   */
  private normalizeModel(model: string): string {
    if (!model) return model;
    
    let normalized = model.toLowerCase();
    
    // 1. 在常见后缀关键词前添加空格
    const suffixKeywords = [
      'pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite',
      'note', 'turbo', 'fold', 'flip', 'find', 'reno'
    ];
    
    suffixKeywords.forEach(keyword => {
      // 使用负向后顾断言，确保关键词前面不是空格
      const regex = new RegExp(`(?<!\\s)${keyword}`, 'gi');
      normalized = normalized.replace(regex, ` ${keyword}`);
    });
    
    // 2. 在数字和字母之间添加空格
    normalized = normalized.replace(/(\d)([a-z])/gi, '$1 $2');
    normalized = normalized.replace(/([a-z])(\d)/gi, '$1 $2');
    
    // 3. 清理多余空格
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    // 4. 应用配置的特殊情况标准化
    if (this.modelNormalizations && Object.keys(this.modelNormalizations).length > 0) {
      Object.entries(this.modelNormalizations).forEach(([from, to]) => {
        const regex = new RegExp(`\\b${from}\\b`, 'gi');
        normalized = normalized.replace(regex, to);
      });
    }
    
    return normalized;
  }

  /**
   * 提取型号（多层次匹配）
   */
  extractModel(str: string): string | null {
    let lowerStr = str.toLowerCase();
    
    // 移除括号内容
    let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
    
    // 移除品牌（完全使用品牌库数据）
    const brandsToRemove: string[] = [];
    
    if (this.brandList.length > 0) {
      // 使用品牌库数据
      for (const brand of this.brandList) {
        brandsToRemove.push(brand.name.toLowerCase());
        if (brand.spell) {
          brandsToRemove.push(brand.spell.toLowerCase());
        }
      }
    } else {
      // 如果品牌库未加载，记录警告但继续处理
      console.warn('品牌库未加载，型号提取可能不准确');
    }
    
    // 按长度降序排序，优先移除更长的品牌名（避免部分匹配问题）
    brandsToRemove.sort((a, b) => b.length - a.length);
    
    for (const brand of brandsToRemove) {
      // 转义特殊字符
      const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 对于中文品牌，不使用单词边界；对于英文品牌，使用单词边界
      const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
      const brandRegex = hasChinese 
        ? new RegExp(escapedBrand, 'gi')  // 中文：直接匹配
        : new RegExp(`\\b${escapedBrand}\\b`, 'gi');  // 英文：使用单词边界
      
      normalizedStr = normalizedStr.replace(brandRegex, ' ');
    }
    
    normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
    
    // 应用智能标准化（包含配置的特殊情况）
    normalizedStr = this.normalizeModel(normalizedStr);
    
    // 优先级1: 平板特殊处理 - 提取 MatePad/iPad 等平板型号
    // 对于平板，型号通常是 "MatePad" + 可选的版本/尺寸信息
    // 改进：支持中文字符混合的情况（如 "MatePad鸿蒙"）和年份信息（如 "MatePad 2026"）
    const tabletModelPattern = /\b(matepad|ipad|pad)(?:[a-z]*)?(?:[\u4e00-\u9fa5]*)?(?:\s*(?:(pro|air|mini|plus|ultra|lite|se|x|m|t|s)?(?:\s+(\d+))?)?)?/gi;
    const tabletMatches = normalizedStr.match(tabletModelPattern);
    if (tabletMatches && tabletMatches.length > 0) {
      // 对于平板，返回完整的型号（包括 Pro/Air 等后缀）
      let tabletModel = tabletMatches[0].toLowerCase().trim();
      // 移除中文字符
      tabletModel = tabletModel.replace(/[\u4e00-\u9fa5]/g, '').trim();
      tabletModel = tabletModel.replace(/\s+/g, '');
      
      // 检查是否有年份信息（4位数字）
      const yearPattern = /\b(\d{4})\b/g;
      const yearMatches = normalizedStr.match(yearPattern);
      if (yearMatches && yearMatches.length > 0) {
        // 过滤掉容量相关的数字（如 8+128）
        const validYears = yearMatches.filter(year => {
          const num = parseInt(year);
          return num >= 2000 && num <= 2100; // 合理的年份范围
        });
        if (validYears.length > 0) {
          tabletModel += validYears[0]; // 添加年份信息
        }
      }
      
      // 只有当不是纯数字时才返回
      if (!/^\d+$/.test(tabletModel) && tabletModel.length > 0) {
        return tabletModel;
      }
    }
    
    // 优先级2: 字母+字母格式
    const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
    const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
    
    const wordMatches2 = normalizedStr.match(wordModelPattern2);
    const wordMatches1 = normalizedStr.match(wordModelPattern1);
    const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
    
    if (wordMatches && wordMatches.length > 0) {
      return wordMatches[0].toLowerCase().replace(/\s+/g, '');
    }
    
    // 优先级2: 复杂型号格式（支持 Pro+, Max+ 等带加号的型号）
    // 改进：支持数字开头的型号（如 "14 ultra"）
    const complexModelPattern = /\b([a-z]*)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note|turbo|r)(\+)?(\s+(mini|max|plus|ultra|pro))?\b/gi;
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
    
    // 优先级3: 简单型号格式（改进：支持纯数字开头的型号和纯数字型号）
    // 匹配模式：字母+数字+可选字母 或 数字+字母 或 纯数字（2-3位）
    const simpleModelPattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
    const simpleMatches = normalizedStr.match(simpleModelPattern);
    
    if (simpleMatches && simpleMatches.length > 0) {
      const filtered = simpleMatches.filter(m => {
        const lower = m.toLowerCase().trim();
        // 过滤掉网络制式、容量等
        return !/^[345]g$/i.test(lower) && 
               !lower.includes('gb') && 
               !/^\d+g$/i.test(lower) &&
               !/^\d+\+\d+$/i.test(lower); // 过滤掉容量格式如 4+128
      });
      
      if (filtered.length > 0) {
        const sorted = filtered.sort((a, b) => {
          const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
          const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
          if (aHasSuffix && !bHasSuffix) return -1;
          if (!aHasSuffix && bHasSuffix) return 1;
          return b.length - a.length;
        });
        
        return sorted[0].toLowerCase().trim().replace(/\s+/g, '');
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
   * 检查两个颜色是否为已知的变体对
   */
  private isColorVariant(color1: string, color2: string): boolean {
    if (!color1 || !color2) return false;
    
    // 使用配置的颜色变体映射
    if (this.colorVariantsMap.size > 0) {
      const variants1 = this.colorVariantsMap.get(color1);
      if (variants1 && variants1.includes(color2)) return true;
      
      const variants2 = this.colorVariantsMap.get(color2);
      if (variants2 && variants2.includes(color1)) return true;
    }
    
    return false;
  }

  /**
   * 改进的颜色提取
   */
  extractColorAdvanced(input: string): string | null {
    // 方法1: 使用配置的颜色变体库
    if (this.colorVariantsMap.size > 0) {
      for (const [colorName, variants] of this.colorVariantsMap.entries()) {
        if (input.includes(colorName)) {
          return colorName;
        }
        for (const variant of variants) {
          if (input.includes(variant)) {
            return colorName; // 返回主颜色名
          }
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
   * 
   * 匹配优先级：
   * 1. 完全匹配（精确匹配）
   * 2. 颜色变体匹配（已知的颜色变体对）
   * 3. 基础颜色匹配（模糊匹配，同一基础颜色族）
   */
  isColorMatch(color1: string, color2: string): boolean {
    if (!color1 || !color2) return false;
    
    // 优先级1: 完全匹配
    if (color1 === color2) return true;
    
    // 优先级2: 颜色变体匹配
    if (this.isColorVariant(color1, color2)) return true;
    
    // 优先级3: 基础颜色匹配
    return this.isBasicColorMatch(color1, color2);
  }

  /**
   * 检查是否应该过滤某个SPU
   */
  shouldFilterSPU(inputName: string, spuName: string): boolean {
    const lowerInput = inputName.toLowerCase();
    const lowerSPU = spuName.toLowerCase();
    
    // 规则1: 礼盒版过滤
    const giftBoxKeywords = this.filterKeywords?.giftBox || ['礼盒', '套装', '系列', '礼品', '礼包'];
    const hasGiftBoxKeywordInInput = giftBoxKeywords.some(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    const hasGiftBoxKeywordInSPU = giftBoxKeywords.some(keyword => 
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
    
    const giftBoxKeywords = this.filterKeywords?.giftBox || ['礼盒', '套装', '系列', '礼品', '礼包'];
    const hasGiftBoxKeyword = giftBoxKeywords.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    const networkVersions = this.networkVersions.length > 0 
      ? this.networkVersions 
      : ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];
    const hasSpecialVersion = networkVersions.some(keyword => 
      lowerSPU.includes(keyword.toLowerCase())
    );
    
    if (!hasGiftBoxKeyword && !hasSpecialVersion) {
      return 3; // 标准版：优先级最高
    }
    
    if (hasSpecialVersion) {
      for (const keyword of networkVersions) {
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
    
    // 使用配置的版本关键词
    for (const versionInfo of this.versionKeywords) {
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
      // 优先使用 SPU 的 brand 字段，如果不存在则从名称中提取
      const spuBrand = spu.brand || this.extractBrand(spuSPUPart);
      const spuModel = this.extractModel(spuSPUPart);
      const spuVersion = this.extractVersion(spuSPUPart);
      
      let score = 0;
      
      // 品牌匹配：需要考虑品牌的不同写法（如"红米"和"Redmi"）
      const brandMatch = this.isBrandMatch(inputBrand, spuBrand);
      
      if (inputBrand && spuBrand && brandMatch &&
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
        
        // 改进：计算关键词匹配数，作为额外的评分因素
        let keywordMatchCount = 0;
        const inputTokens = this.tokenize(input);
        for (const token of inputTokens) {
          if (token.length > 2 && spu.name.toLowerCase().includes(token)) {
            keywordMatchCount++;
          }
        }
        
        // 关键词匹配数越多，分数越高（最多加 0.1 分，确保总分不超过 1.0）
        const keywordBonus = Math.min(keywordMatchCount * 0.05, 0.1);
        const finalScore = Math.min(score + keywordBonus, 1.0); // 确保不超过 1.0
        
        if (finalScore > bestScore || 
            (finalScore === bestScore && priority > bestPriority) ||
            (finalScore === bestScore && priority === bestPriority && keywordMatchCount > (bestMatch ? this.tokenize(bestMatch.name).filter(t => t.length > 2 && input.toLowerCase().includes(t)).length : 0))) {
          bestScore = finalScore;
          bestMatch = spu;
          bestPriority = priority;
        }
      }
    }
    
    if (bestMatch && bestScore >= threshold) {
      // 改进：不要立即返回，继续检查第二阶段，看是否有更好的匹配
      // 只有当分数非常高（>= 0.99）且没有其他候选项时，才立即返回
      // 否则继续执行第二阶段，看是否有更好的匹配
    }
    
    // 第二阶段：无顺序的分词匹配
    // 重置最佳匹配（如果第一阶段没有找到足够好的匹配）
    if (!bestMatch || bestScore < 0.99) {
      let secondBestMatch: SPUData | null = null;
      let secondBestScore = 0;
      let secondBestPriority = 0;
      
      for (const spu of spuList) {
        if (this.shouldFilterSPU(input, spu.name)) {
          continue;
        }
        
        const spuSPUPart = this.extractSPUPart(spu.name);
        // 优先使用 SPU 的 brand 字段，如果不存在则从名称中提取
        const spuBrand = spu.brand || this.extractBrand(spuSPUPart);
        const spuModel = this.extractModel(spuSPUPart);
        
        let score = 0;
        
        // 严格的品牌过滤：
        // 1. 如果输入品牌和SPU品牌都识别出来了，必须匹配（考虑不同写法）
        // 2. 如果输入品牌未识别，但SPU品牌识别出来了，跳过（避免误匹配）
        const brandMatch = this.isBrandMatch(inputBrand, spuBrand);
        
        if (inputBrand && spuBrand && !brandMatch) {
          continue;  // 品牌不匹配，跳过
        }
        
        if (!inputBrand && spuBrand) {
          // 输入品牌未识别，但SPU有品牌，降低优先级（可能是品牌库问题）
          // 不直接跳过，但给予较低的分数
          score = 0.3;  // 基础分数降低
        }
        
        if (inputModel && spuModel) {
          const modelScore = this.calculateTokenSimilarity(
            this.tokenize(inputModel),
            this.tokenize(spuModel)
          );
          
          if (modelScore > 0.5) {
            score = Math.max(score, 0.4 + modelScore * 0.6);
            
            if (score >= threshold) {
              const priority = this.getSPUPriority(input, spu.name);
              
              // 改进：计算关键词匹配数，作为额外的评分因素
              let keywordMatchCount = 0;
              const inputTokens = this.tokenize(input);
              for (const token of inputTokens) {
                if (token.length > 2 && spu.name.toLowerCase().includes(token)) {
                  keywordMatchCount++;
                }
              }
              
              // 关键词匹配数越多，分数越高（最多加 0.1 分，确保总分不超过 1.0）
              const keywordBonus = Math.min(keywordMatchCount * 0.05, 0.1);
              const finalScore = Math.min(score + keywordBonus, 1.0); // 确保不超过 1.0
              
              if (finalScore > secondBestScore || 
                  (finalScore === secondBestScore && priority > secondBestPriority)) {
                secondBestScore = finalScore;
                secondBestMatch = spu;
                secondBestPriority = priority;
              }
            }
          }
        }
      }
      
      // 如果第二阶段找到了更好的匹配，使用第二阶段的结果
      if (secondBestMatch && (secondBestScore > bestScore || !bestMatch)) {
        bestMatch = secondBestMatch;
        bestScore = secondBestScore;
      }
    }
    
    if (bestScore < threshold) {
      return { spu: null, similarity: 0 };
    }
    
    return { spu: bestMatch, similarity: bestScore };
  }

  /**
   * 改进的 SKU 匹配，考虑版本信息
   * 
   * 颜色匹配优先级：
   * 1. 完全匹配（100%分数）
   * 2. 颜色变体匹配（90%分数）
   * 3. 基础颜色匹配（50%分数）
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
      
      // 颜色匹配（基础权重 30%）- 改进：区分完全匹配、变体匹配和基础匹配
      if (inputColor || skuColor) {
        totalWeight += 0.3;
        if (inputColor && skuColor) {
          // 优先级1: 完全匹配（100%分数）
          if (inputColor === skuColor) {
            score += 0.3;
          }
          // 优先级2: 颜色变体匹配（90%分数）
          else if (this.isColorVariant(inputColor, skuColor)) {
            score += 0.27;
          }
          // 优先级3: 基础颜色匹配（50%分数）
          else if (this.isBasicColorMatch(inputColor, skuColor)) {
            score += 0.15;
          }
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
   * 基础颜色匹配（仅用于模糊匹配）
   */
  private isBasicColorMatch(color1: string, color2: string): boolean {
    if (!color1 || !color2) return false;
    
    const basicColorMap: Record<string, string[]> = {
      '黑': ['黑', '深', '曜', '玄', '纯', '简', '辰'],
      '白': ['白', '零', '雪', '空', '格', '告'],
      '蓝': ['蓝', '天', '星', '冰', '悠', '自', '薄'],
      '红': ['红', '深'],
      '绿': ['绿', '原', '玉'],
      '紫': ['紫', '灵', '龙', '流', '极', '惬'],
      '粉': ['粉', '玛', '晶', '梦', '桃', '酷'],
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
        } else if (this.isColorVariant(inputColor, skuColor)) {
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
