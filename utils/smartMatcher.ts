/**
 * 智能匹配工具类
 * 
 * @deprecated 此类已弃用，请使用 MatchingOrchestrator 替代
 * 
 * 迁移指南:
 * - 旧: import { SimpleMatcher } from './smartMatcher'
 * - 新: import { MatchingOrchestrator } from './services/MatchingOrchestrator'
 * 
 * 旧用法:
 *   const matcher = new SimpleMatcher();
 *   await matcher.initialize();
 *   const result = matcher.findBestSPUMatch(input, spuList, threshold);
 * 
 * 新用法:
 *   const orchestrator = new MatchingOrchestrator();
 *   await orchestrator.initialize(brands, spuList);
 *   const result = await orchestrator.match(input);
 * 
 * 提供统一的商品匹配逻辑，供在线匹配和表格匹配使用
 */

import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { 
  ConfigLoader, 
  type VersionKeywordConfig, 
  type ColorVariantConfig, 
  type FilterKeywordConfig,
  type ModelNormalizationConfig,
  type BasicColorMapConfig
} from './config-loader';
import { InfoExtractor } from './services/InfoExtractor';

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
  originalString?: string; // 原始输入中的版本字符串（如"全网通5G版"）
}

// ==================== 配置常量 ====================

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

// 颜色匹配分数常量
export const COLOR_MATCH_SCORES = {
  EXACT: 1.0,      // 完全匹配
  VARIANT: 0.9,    // 颜色变体匹配
  BASIC: 0.5,      // 基础颜色匹配
} as const;

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

// ==================== ColorMatcher 类 ====================

/**
 * 颜色匹配服务类
 * 统一管理所有颜色相关的匹配逻辑
 */
class ColorMatcher {
  private dynamicColors: string[] = [];
  private colorVariantsMap: Map<string, string[]> = new Map();
  private basicColorMap: Map<string, string[]> = new Map();
  
  /**
   * 设置动态颜色列表
   */
  setColorList(colors: string[]) {
    this.dynamicColors = colors;
  }
  
  /**
   * 设置颜色变体映射
   */
  setColorVariants(variants: Array<{ colors: string[] }>) {
    variants.forEach(variant => {
      variant.colors.forEach(color => {
        this.colorVariantsMap.set(color, variant.colors);
      });
    });
  }
  
  /**
   * 设置基础颜色映射
   */
  setBasicColorMap(colorFamilies: Array<{ keywords: string[] }>) {
    colorFamilies.forEach(family => {
      family.keywords.forEach(keyword => {
        this.basicColorMap.set(keyword, family.keywords);
      });
    });
  }
  
  /**
   * 提取颜色（改进的颜色提取）
   */
  extractColor(input: string): string | null {
    // 🔥 关键修复：先移除材质和配件关键词，避免误识别
    // 例如："真皮表带" 中的 "真皮" 不应该被识别为颜色
    let cleanedInput = input;
    const materialKeywords = [
      '真皮', '素皮', '皮革', '陶瓷', '玻璃', '金属', '塑料', '硅胶', '软胶',
      '蓝牙', '无线', '有线', '充电', '快充', '超级快充',
      '表带', '表盘', '手环', '耳机', '耳塞', '充电器', '数据线', '保护壳', '保护套',
      '智能', '手表', '手机', '平板', '笔记本', '电脑'
    ];
    
    for (const keyword of materialKeywords) {
      // 移除材质关键词及其前后的中文字符
      // 例如："星岩黑真皮" -> 移除 "真皮" -> "星岩黑"
      cleanedInput = cleanedInput.replace(new RegExp(keyword, 'g'), '');
    }
    
    cleanedInput = cleanedInput.trim();
    
    // 方法1: 使用配置的颜色变体库
    if (this.colorVariantsMap.size > 0) {
      for (const [colorName, variants] of this.colorVariantsMap.entries()) {
        if (cleanedInput.includes(colorName)) {
          return colorName;
        }
        for (const variant of variants) {
          if (cleanedInput.includes(variant)) {
            return colorName; // 返回主颜色名
          }
        }
      }
    }
    
    // 方法2: 使用动态颜色列表
    if (this.dynamicColors.length > 0) {
      for (const color of this.dynamicColors) {
        if (cleanedInput.includes(color)) {
          return color;
        }
      }
    }
    
    // 方法3: 从字符串末尾提取
    const lastWords = cleanedInput.match(/[\u4e00-\u9fa5]{2,5}$/);
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
   * 颜色匹配（统一入口）
   * 
   * @returns { match: boolean, score: number, type: 'exact' | 'variant' | 'basic' | 'none' }
   */
  match(color1: string, color2: string): { 
    match: boolean; 
    score: number; 
    type: 'exact' | 'variant' | 'basic' | 'none' 
  } {
    if (!color1 || !color2) {
      return { match: false, score: 0, type: 'none' };
    }
    
    // 优先级1: 完全匹配
    if (color1 === color2) {
      return { match: true, score: COLOR_MATCH_SCORES.EXACT, type: 'exact' };
    }
    
    // 优先级2: 颜色变体匹配
    if (this.isVariant(color1, color2)) {
      return { match: true, score: COLOR_MATCH_SCORES.VARIANT, type: 'variant' };
    }
    
    // 优先级3: 基础颜色匹配
    if (this.isBasicMatch(color1, color2)) {
      return { match: true, score: COLOR_MATCH_SCORES.BASIC, type: 'basic' };
    }
    
    return { match: false, score: 0, type: 'none' };
  }
  
  /**
   * 检查两个颜色是否为已知的变体对
   */
  private isVariant(color1: string, color2: string): boolean {
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
   * 基础颜色匹配（仅用于模糊匹配）
   */
  private isBasicMatch(color1: string, color2: string): boolean {
    if (!color1 || !color2) return false;
    
    // 如果已经加载了配置的基础颜色映射，使用配置
    if (this.basicColorMap.size > 0) {
      for (const [keyword, family] of this.basicColorMap.entries()) {
        const color1HasKeyword = color1.includes(keyword);
        const color2HasKeyword = color2.includes(keyword);
        
        if (color1HasKeyword && color2HasKeyword) {
          return true;
        }
      }
      return false;
    }
    
    // 降级方案：使用硬编码的基础颜色映射
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
}

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
  
  // 颜色匹配器
  private colorMatcher = new ColorMatcher();
  
  // 信息提取器 - 用于统一的信息提取逻辑
  private infoExtractor = new InfoExtractor();
  
  // 性能优化：缓存
  private brandsToRemoveCache: string[] | null = null;
  
  // 性能优化：SPU 品牌索引
  private spuIndexByBrand: Map<string, SPUData[]> = new Map();
  
  // 动态型号索引：从实际 SPU 数据中提取的型号
  private modelIndex: Set<string> = new Set();
  private modelByBrand: Map<string, Set<string>> = new Map();
  
  /**
   * 初始化配置（异步）
   * 在使用 matcher 前应该调用此方法
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // 加载所有配置
      const [versionConfig, colorConfig, filterConfig, modelConfig, basicColorConfig] = await Promise.all([
        ConfigLoader.load<VersionKeywordConfig>('version-keywords'),
        ConfigLoader.load<ColorVariantConfig>('color-variants'),
        ConfigLoader.load<FilterKeywordConfig>('filter-keywords'),
        ConfigLoader.load<ModelNormalizationConfig>('model-normalizations'),
        ConfigLoader.load<BasicColorMapConfig>('basic-color-map')
      ]);
      
      // 设置版本关键词
      this.versionKeywords = versionConfig.versions;
      this.networkVersions = versionConfig.networkVersions;
      
      // 设置颜色变体映射（保留用于向后兼容）
      colorConfig.variants.forEach(variant => {
        variant.colors.forEach(color => {
          this.colorVariantsMap.set(color, variant.colors);
        });
      });
      
      // 初始化颜色匹配器
      this.colorMatcher.setColorVariants(colorConfig.variants);
      this.colorMatcher.setBasicColorMap(basicColorConfig.colorFamilies);
      
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
    this.colorMatcher.setColorList(colors);
    this.infoExtractor.setColorList(colors);
  }

  /**
   * 设置品牌列表（从品牌库读取）
   */
  setBrandList(brands: Array<{ name: string; spell?: string; color?: string }>) {
    this.brandList = brands;
    // InfoExtractor expects BrandData[] with color field, but we can pass brands with optional color
    this.infoExtractor.setBrandList(brands as any);
    // 清除缓存，因为品牌列表已更新
    this.brandsToRemoveCache = null;
  }

  /**
   * 建立 SPU 品牌索引和型号索引（性能优化）
   * 
   * 将 SPU 按品牌分组，加速查找
   * 同时从实际 SPU 数据中提取型号，构建型号索引
   * 
   * 时间复杂度：O(n)，n = SPU 总数
   * 空间复杂度：O(n)
   * 
   * @param spuList SPU 列表
   */
  buildSPUIndex(spuList: SPUData[]) {
    this.spuIndexByBrand.clear();
    this.modelIndex.clear();
    this.modelByBrand.clear();
    
    let indexedCount = 0;
    let noBrandCount = 0;
    let modelCount = 0;
    
    for (const spu of spuList) {
      const brand = spu.brand || this.extractBrand(spu.name);
      if (!brand) {
        noBrandCount++;
        console.warn(`⚠️  SPU "${spu.name}" (ID: ${spu.id}) 品牌提取失败`);
        continue;
      }
      
      // ✅ 修复：同时使用品牌名和拼音作为索引键
      const keys = [brand.toLowerCase()];
      
      // 正向查找：如果品牌是中文，添加其拼音
      // 使用大小写不敏感的匹配
      const brandInfo = this.brandList.find(b => 
        b.name.toLowerCase() === brand.toLowerCase()
      );
      if (brandInfo && brandInfo.spell) {
        const spellKey = brandInfo.spell.toLowerCase();
        if (!keys.includes(spellKey)) {
          keys.push(spellKey);
        }
        // 同时添加中文品牌名（标准化后的）
        const chineseKey = brandInfo.name.toLowerCase();
        if (!keys.includes(chineseKey)) {
          keys.push(chineseKey);
        }
      }
      
      // 反向查找：如果品牌是拼音，添加对应的中文品牌名
      const brandInfoBySpell = this.brandList.find(b => 
        b.spell?.toLowerCase() === brand.toLowerCase()
      );
      if (brandInfoBySpell && brandInfoBySpell.name) {
        const chineseKey = brandInfoBySpell.name.toLowerCase();
        if (!keys.includes(chineseKey)) {
          keys.push(chineseKey);
        }
        // 同时添加拼音（标准化后的）
        if (brandInfoBySpell.spell) {
          const spellKey = brandInfoBySpell.spell.toLowerCase();
          if (!keys.includes(spellKey)) {
            keys.push(spellKey);
          }
        }
      }
      
      // 为每个键添加品牌索引
      for (const key of keys) {
        if (!this.spuIndexByBrand.has(key)) {
          this.spuIndexByBrand.set(key, []);
        }
        this.spuIndexByBrand.get(key)!.push(spu);
      }
      
      // 提取型号并添加到型号索引
      const model = this.extractModelFromSPU(spu.name, brand);
      if (model) {
        this.modelIndex.add(model);
        modelCount++;
        
        // 按品牌分组型号
        for (const key of keys) {
          if (!this.modelByBrand.has(key)) {
            this.modelByBrand.set(key, new Set());
          }
          this.modelByBrand.get(key)!.add(model);
        }
      } else {
        // 调试：记录型号提取失败的SPU
        if (spu.name.includes('15R') || spu.name.includes('15r')) {
          console.warn(`⚠️  型号提取失败: "${spu.name}" (品牌: ${brand})`);
        }
      }
      
      indexedCount++;
    }
    
    console.log(`✓ SPU index built: ${this.spuIndexByBrand.size} brands, ${indexedCount} SPUs indexed, ${noBrandCount} SPUs without brand`);
    console.log(`✓ Model index built: ${this.modelIndex.size} unique models from ${modelCount} SPUs`);
    
    // 输出品牌索引的前10个品牌（用于调试）
    const brandKeys = Array.from(this.spuIndexByBrand.keys()).slice(0, 10);
    console.log(`  品牌索引示例: ${brandKeys.join(', ')}${this.spuIndexByBrand.size > 10 ? '...' : ''}`);
    
    // 输出型号索引的前10个型号（用于调试）
    const modelKeys = Array.from(this.modelIndex).slice(0, 10);
    console.log(`  型号索引示例: ${modelKeys.join(', ')}${this.modelIndex.size > 10 ? '...' : ''}`);
  }

  /**
   * 从 SPU 名称中提取型号
   * 这个方法用于构建型号索引，从实际数据中学习型号模式
   * 
   * @param spuName SPU 名称
   * @param brand 品牌名称
   * @returns 提取的型号（标准化后）
   */
  private extractModelFromSPU(spuName: string, brand: string): string | null {
    // 移除品牌名
    let normalized = spuName.toLowerCase();
    normalized = normalized.replace(brand.toLowerCase(), '').trim();
    
    // 移除常见的描述词
    const descriptors = [
      '智能手机', '手机', '智能手表', '手表', '平板电脑', '平板', '笔记本电脑', '笔记本',
      '无线耳机', '耳机', '手环', '智能', '款', '版', '英寸', 'mm', 'gb', 'tb',
      '钛合金', '陶瓷', '素皮', '皮革', '玻璃', '金属', '塑料',
      '蓝牙', 'wifi', '5g', '4g', '3g', '全网通', 'esim',
      '年', '月', '日', '新品', '上市', '发布',
      '全', // 移除 "全" 字（如 "全智能手表" 中的 "全"）
    ];
    
    for (const desc of descriptors) {
      normalized = normalized.replace(new RegExp(desc, 'gi'), ' ');
    }
    
    // 移除容量信息
    normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' ');
    normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' ');
    
    // 移除颜色信息（改进：移除颜色词及其前后的中文字符）
    // 例如："星岩黑" -> 全部移除，而不是只移除 "黑"
    const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
    for (const color of colors) {
      // 匹配：颜色词前面的中文字符 + 颜色词 + 颜色词后面的中文字符
      normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
    }
    
    // 清理空格
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    // 如果剩余内容太短或太长，返回 null
    if (normalized.length < 2 || normalized.length > 50) {
      return null;
    }
    
    // 移除所有空格，返回标准化的型号
    return normalized.replace(/\s+/g, '');
  }

  /**
   * 检查两个品牌是否匹配（考虑不同写法）
   * 例如："红米" 和 "Redmi" 应该匹配（它们有相同的拼音）
   */
  private isBrandMatch(brand1: string | null, brand2: string | null): boolean {
    if (!brand1 || !brand2) return false;
    
    // 完全匹配（精确）
    if (brand1 === brand2) return true;
    
    // 大小写不敏感匹配（修复 Vivo vs vivo 问题）
    if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
    
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
   * 提取版本信息（委托给 InfoExtractor）
   * @deprecated 此方法已迁移到 InfoExtractor，保留用于向后兼容
   * 
   * @param input 输入字符串
   * @param extractOriginal 是否提取原始字符串（包含"版"字等）- 此参数已废弃，保留用于兼容性
   * @returns 版本信息对象，包含标准化名称和原始字符串
   */
  extractVersion(input: string, extractOriginal: boolean = false): VersionInfo | null {
    const result = this.infoExtractor.extractVersion(input);
    return result.value;
  }

  /**
   * 改进的输入预处理
   * 
   * 正确顺序：品牌 + 型号 + 版本 + 容量 + 颜色
   * 例如：OPPO A5 活力版 12+256 玉石绿
   */
  preprocessInputAdvanced(input: string): string {
    let processed = input;
    
    // 1. 提取容量信息（支持两种格式：8+256 和 256GB）
    const capacityPattern = /\((\d+(?:GB|TB|T)?\s*\+\s*\d+(?:GB|TB|T)?|\d+(?:GB|TB|T))\)/gi;
    const capacities: string[] = [];
    let match;
    while ((match = capacityPattern.exec(processed)) !== null) {
      capacities.push(match[1]);
    }
    
    // 2. 移除所有括号内容
    processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
    
    // 3. 重新添加容量信息
    if (capacities.length > 0) {
      // 策略：在版本后、颜色前添加容量
      // 正确顺序：品牌 + 型号 + 版本 + 容量 + 颜色
      
      // 查找版本关键词的结束位置
      const versionKeywords = ['活力版', '标准版', '优享版', '尊享版', 'Pro版', 'pro版', '轻享版', '基础版'];
      let versionEndIndex = -1;
      
      for (const keyword of versionKeywords) {
        const index = processed.indexOf(keyword);
        if (index !== -1) {
          versionEndIndex = index + keyword.length;
          break;
        }
      }
      
      if (versionEndIndex !== -1) {
        // 在版本后插入容量
        processed = processed.slice(0, versionEndIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(versionEndIndex).trim();
      } else {
        // 如果没有版本，在第一个中文字符（通常是颜色）前插入容量
        const chinesePattern = /[\u4e00-\u9fa5]/;
        const chineseIndex = processed.search(chinesePattern);
        
        if (chineseIndex !== -1) {
          processed = processed.slice(0, chineseIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(chineseIndex).trim();
        } else {
          // 如果没有中文字符，在末尾添加容量
          processed = processed.trim() + ' ' + capacities[0];
        }
      }
    }
    
    // 4. 处理特殊字符
    processed = processed.replace(/[（）]/g, (match) => match === '（' ? '(' : ')');
    
    // 5. 清理多余空格
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
   * 提取品牌（委托给 InfoExtractor）
   * @deprecated 此方法已迁移到 InfoExtractor，保留用于向后兼容
   */
  extractBrand(str: string): string | null {
    const result = this.infoExtractor.extractBrand(str);
    return result.value;
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
   * 
   * 匹配优先级：
   * 0. 动态型号索引（从实际 SPU 数据中学习）
   * 1. 可穿戴设备型号（手环、手表等）
   * 2. 平板型号（MatePad、iPad 等）
   * 3. 字母+字母格式（Watch GT、Band 5 等）
   * 4. 复杂型号（14 Pro Max+、Y300 Pro+ 等）
   * 5. 简单型号（P50、14 等）
   */
  extractModel(str: string, brand?: string | null): string | null {
    let lowerStr = str.toLowerCase();
    
    // 特殊调试：对于 "15r" 相关的输入
    const is15R = lowerStr.includes('15') && lowerStr.includes('r') && !lowerStr.includes('note');
    
    // 预处理：移除括号和品牌
    let normalizedStr = this.preprocessModelString(lowerStr);
    
    // 调试：对于包含"15"的字符串，输出预处理结果
    if (is15R) {
      console.log(`\n[extractModel-15R] ========== 开始提取型号 ==========`);
      console.log(`[extractModel-15R] 输入: "${str}"`);
      console.log(`[extractModel-15R] 品牌: "${brand}"`);
      console.log(`[extractModel-15R] 小写后: "${lowerStr}"`);
      console.log(`[extractModel-15R] 预处理后: "${normalizedStr}" (长度: ${normalizedStr.length})`);
    }
    
    // 优先级0: 使用动态型号索引进行精确匹配
    if (this.modelIndex.size > 0) {
      const dynamicModel = this.extractModelFromIndex(normalizedStr, brand);
      if (dynamicModel) {
        if (is15R) {
          console.log(`[extractModel-15R] ✅ 从型号索引中找到: "${dynamicModel}"`);
          console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
        } else {
          console.log(`[动态匹配] 从型号索引中找到: "${dynamicModel}"`);
        }
        return dynamicModel;
      } else if (is15R) {
        console.log(`[extractModel-15R] ❌ 型号索引中未找到匹配`);
      }
    }
    
    // 优先级1: 可穿戴设备型号（手环、手表等）
    // 这些产品的型号通常包含产品类型词，如"手环10"、"手表3"
    const wearableModel = this.extractWearableModel(normalizedStr);
    if (wearableModel) {
      if (is15R) {
        console.log(`[extractModel-15R] ✅ 可穿戴设备型号匹配: "${wearableModel}"`);
        console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
      }
      return wearableModel;
    }
    
    // ⚠️ 重要：先尝试提取简单型号（在 normalizeModel 之前）
    // 因为 normalizeModel 会在字母和数字之间添加空格，导致 "y50" 变成 "y 50"
    const simpleModelBeforeNormalize = this.extractSimpleModel(normalizedStr);
    
    // 调试：对于包含"15"的字符串，输出简单型号提取结果
    if (is15R) {
      console.log(`[extractModel-15R] 简单型号提取(标准化前): ${simpleModelBeforeNormalize ? `"${simpleModelBeforeNormalize}"` : 'null'}`);
    }
    
    // 应用智能标准化（用于复杂型号匹配）
    normalizedStr = this.normalizeModel(normalizedStr);
    
    if (is15R) {
      console.log(`[extractModel-15R] 智能标准化后: "${normalizedStr}"`);
    }
    
    // 优先级2: 平板型号
    const tabletModel = this.extractTabletModel(normalizedStr);
    if (tabletModel) {
      if (is15R) {
        console.log(`[extractModel-15R] ✅ 平板型号匹配: "${tabletModel}"`);
        console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
      }
      return tabletModel;
    } else if (is15R) {
      console.log(`[extractModel-15R] 平板型号匹配: null`);
    }
    
    // 优先级3: 字母+字母格式（Watch GT、Band 5 等）
    const wordModel = this.extractWordModel(normalizedStr);
    if (wordModel) {
      if (is15R) {
        console.log(`[extractModel-15R] ✅ 字母型号匹配: "${wordModel}"`);
        console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
      }
      return wordModel;
    } else if (is15R) {
      console.log(`[extractModel-15R] 字母型号匹配: null`);
    }
    
    // 优先级4: 复杂型号（14 Pro Max+、Y300 Pro+ 等）
    const complexModel = this.extractComplexModel(normalizedStr);
    if (complexModel) {
      if (is15R) {
        console.log(`[extractModel-15R] ✅ 复杂型号匹配: "${complexModel}"`);
        console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
      }
      return complexModel;
    } else if (is15R) {
      console.log(`[extractModel-15R] 复杂型号匹配: null`);
    }
    
    // 优先级5: 简单型号（优先使用标准化前的结果）
    if (simpleModelBeforeNormalize) {
      if (is15R) {
        console.log(`[extractModel-15R] ✅ 简单型号匹配(标准化前): "${simpleModelBeforeNormalize}"`);
        console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
      }
      return simpleModelBeforeNormalize;
    }
    
    // 降级：尝试从标准化后的字符串提取
    const simpleModel = this.extractSimpleModel(normalizedStr);
    if (simpleModel) {
      if (is15R) {
        console.log(`[extractModel-15R] ✅ 简单型号匹配(标准化后): "${simpleModel}"`);
        console.log(`[extractModel-15R] ========== 提取成功 ==========\n`);
      }
      return simpleModel;
    } else if (is15R) {
      console.log(`[extractModel-15R] 简单型号匹配(标准化后): null`);
    }
    
    // 调试：对于包含"15"的字符串，输出提取失败信息
    if (is15R) {
      console.log(`[extractModel-15R] ❌ 所有提取方法都失败`);
      console.log(`[extractModel-15R] ========== 提取失败 ==========\n`);
    }
    
    return null;
  }

  /**
   * 从动态型号索引中提取型号
   * 
   * 匹配策略：
   * 1. 完整性优先：优先选择能完整匹配输入的型号
   * 2. 精简性其次：在完整匹配的情况下，选择更精简（更短）的型号
   * 
   * 例如：
   * - 输入: "s50 pro mini"
   * - 候选: ["s50", "s50promini"]
   * - "s50" 只匹配了部分（不完整）
   * - "s50promini" 完整匹配了所有内容
   * - 应该选择 "s50promini"
   * 
   * @param normalizedStr 标准化后的字符串
   * @param brand 品牌名称（可选，用于缩小搜索范围）
   * @returns 匹配的型号
   */
  private extractModelFromIndex(normalizedStr: string, brand?: string | null): string | null {
    // 如果提供了品牌，优先在该品牌的型号中搜索
    let modelsToSearch: Set<string>;
    
    if (brand && this.modelByBrand.size > 0) {
      // 关键修复：搜索品牌的所有变体（中文和拼音）
      const brandKeys = [brand.toLowerCase()];
      
      // 添加品牌的拼音变体
      const brandInfo = this.brandList.find(b => 
        b.name.toLowerCase() === brand.toLowerCase()
      );
      if (brandInfo && brandInfo.spell) {
        const spellKey = brandInfo.spell.toLowerCase();
        if (!brandKeys.includes(spellKey)) {
          brandKeys.push(spellKey);
        }
      }
      
      // 添加品牌的中文变体（如果输入是拼音）
      const brandInfoBySpell = this.brandList.find(b => 
        b.spell?.toLowerCase() === brand.toLowerCase()
      );
      if (brandInfoBySpell && brandInfoBySpell.name) {
        const chineseKey = brandInfoBySpell.name.toLowerCase();
        if (!brandKeys.includes(chineseKey)) {
          brandKeys.push(chineseKey);
        }
      }
      
      // 合并所有品牌变体的型号
      modelsToSearch = new Set<string>();
      for (const key of brandKeys) {
        const models = this.modelByBrand.get(key);
        if (models) {
          models.forEach(model => modelsToSearch.add(model));
        }
      }
      
      // 如果没有找到任何型号，回退到全局索引
      if (modelsToSearch.size === 0) {
        modelsToSearch = this.modelIndex;
      }
    } else {
      modelsToSearch = this.modelIndex;
    }
    
    // 标准化输入字符串：移除所有空格和特殊字符
    const normalizedInput = normalizedStr.replace(/[\s\-_]/g, '').toLowerCase();
    
    // 调试：对于包含"15"的输入，输出详细信息
    if (normalizedInput.includes('15')) {
      console.log(`[动态索引匹配] 输入: "${normalizedStr}" -> "${normalizedInput}"`);
      console.log(`[动态索引匹配] 品牌: "${brand}", 候选型号数: ${modelsToSearch.size}`);
      console.log(`[动态索引匹配] 候选型号: ${Array.from(modelsToSearch).slice(0, 10).join(', ')}${modelsToSearch.size > 10 ? '...' : ''}`);
    }
    
    let bestMatch: string | null = null;
    let bestCompleteness = 0; // 完整性分数（匹配的字符数占输入的比例）
    let bestLength = Infinity; // 在完整性相同的情况下，选择更短的
    
    // 遍历所有型号，找到最佳匹配
    for (const model of modelsToSearch) {
      // 标准化型号：移除所有空格和特殊字符
      const normalizedModel = model.replace(/[\s\-_]/g, '').toLowerCase();
      
      // 检查输入是否包含该型号
      if (normalizedInput.includes(normalizedModel)) {
        // 计算完整性分数：型号覆盖了输入的多少内容
        const completeness = normalizedModel.length / normalizedInput.length;
        
        // 调试：对于"15"相关的匹配，输出详细信息
        if (normalizedInput.includes('15') && normalizedModel.includes('15')) {
          console.log(`[动态索引匹配] 检查型号: "${model}" (标准化: "${normalizedModel}")`);
          console.log(`[动态索引匹配] 是否包含: ${normalizedInput.includes(normalizedModel)}`);
          if (normalizedInput.includes(normalizedModel)) {
            console.log(`[动态索引匹配] 完整性: ${completeness.toFixed(2)} (${normalizedModel.length}/${normalizedInput.length})`);
          }
        }
        
        // 优先选择完整性更高的
        if (completeness > bestCompleteness) {
          bestCompleteness = completeness;
          bestLength = normalizedModel.length;
          bestMatch = model;
        } 
        // 如果完整性相同，选择更精简的（更短的）
        else if (completeness === bestCompleteness && normalizedModel.length < bestLength) {
          bestLength = normalizedModel.length;
          bestMatch = model;
        }
      }
    }
    
    // 只有当匹配分数足够高时才返回（至少覆盖50%的输入）
    if (bestCompleteness >= 0.5 && bestMatch) {
      // 调试：对于"15"相关的匹配，输出结果
      if (normalizedInput.includes('15')) {
        console.log(`[动态索引匹配] 最佳匹配: "${bestMatch}", 完整性: ${bestCompleteness.toFixed(2)}`);
      }
      return bestMatch;
    }
    
    // 调试：对于"15"相关的匹配失败，输出原因
    if (normalizedInput.includes('15')) {
      console.log(`[动态索引匹配] ❌ 匹配失败: 完整性 ${bestCompleteness.toFixed(2)} < 0.5 或 bestMatch=${bestMatch}`);
    }
    
    return null;
  }

  /**
   * 预处理型号字符串：移除括号和品牌
   */
  private preprocessModelString(lowerStr: string): string {
    // 移除括号内容
    let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
    
    // 移除品牌
    const brandsToRemove = this.getBrandsToRemove();
    
    for (const brand of brandsToRemove) {
      // 转义特殊字符
      const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 对于中文品牌，不使用单词边界；对于英文品牌，使用单词边界
      const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
      const brandRegex = hasChinese 
        ? new RegExp(escapedBrand, 'gi')
        : new RegExp(`\\b${escapedBrand}\\b`, 'gi');
      
      normalizedStr = normalizedStr.replace(brandRegex, ' ');
    }
    
    return normalizedStr.replace(/\s+/g, ' ').trim();
  }

  /**
   * 获取需要移除的品牌列表（带缓存优化）
   */
  private getBrandsToRemove(): string[] {
    // 如果缓存存在，直接返回
    if (this.brandsToRemoveCache) {
      return this.brandsToRemoveCache;
    }
    
    const brandsToRemove: string[] = [];
    
    if (this.brandList.length > 0) {
      for (const brand of this.brandList) {
        brandsToRemove.push(brand.name.toLowerCase());
        if (brand.spell) {
          brandsToRemove.push(brand.spell.toLowerCase());
        }
      }
    } else {
      // 降级方案：使用硬编码的常见品牌列表
      console.warn('品牌库未加载，使用硬编码品牌列表');
      const fallbackBrands = [
        // 中文品牌名
        '小米', '红米', '华为', 'vivo', 'oppo', '荣耀', '一加', '真我', '魅族',
        '中兴', '努比亚', '联想', '摩托罗拉', '三星', '苹果', '诺基亚',
        // 英文品牌名
        'xiaomi', 'redmi', 'huawei', 'vivo', 'oppo', 'honor', 'oneplus', 
        'realme', 'meizu', 'zte', 'nubia', 'lenovo', 'motorola', 
        'samsung', 'apple', 'nokia', 'iphone', 'ipad'
      ];
      brandsToRemove.push(...fallbackBrands);
    }
    
    // 按长度降序排序，优先移除更长的品牌名，并缓存结果
    this.brandsToRemoveCache = brandsToRemove.sort((a, b) => b.length - a.length);
    return this.brandsToRemoveCache;
  }

  /**
   * 提取可穿戴设备型号（手环、手表等）
   * 
   * 支持格式：
   * - 手环10
   * - 手表3 Pro
   * - Band 5
   * - Watch GT 2
   * - Watch Fit 3
   */
  private extractWearableModel(normalizedStr: string): string | null {
    // 匹配中文产品类型 + 数字 + 可选后缀
    // 例如: 手环10, 手表3 Pro, 手环9 NFC
    const chineseWearablePattern = /(手环|手表|智能手环|智能手表)\s*(\d+)\s*(pro|max|plus|ultra|nfc|se|活力版|标准版)?\b/gi;
    const chineseMatch = normalizedStr.match(chineseWearablePattern);
    
    if (chineseMatch && chineseMatch.length > 0) {
      let model = chineseMatch[0].toLowerCase().trim();
      // 标准化空格
      model = model.replace(/\s+/g, '');
      return model;
    }
    
    // 匹配英文产品类型 + 数字 + 可选后缀
    // 例如: band5, watch gt 2, watch fit 3
    const englishWearablePattern = /\b(band|watch)\s*(\w+)?\s*(\d+)?\s*(pro|max|plus|ultra|gt|fit|se)?\b/gi;
    const englishMatch = normalizedStr.match(englishWearablePattern);
    
    if (englishMatch && englishMatch.length > 0) {
      let model = englishMatch[0].toLowerCase().trim();
      // 移除中文字符
      model = model.replace(/[\u4e00-\u9fa5]/g, '').trim();
      // 标准化空格
      model = model.replace(/\s+/g, '');
      
      // 只有当不是纯字母时才返回（避免匹配到 "watch" 这样的单词）
      if (!/^[a-z]+$/.test(model) && model.length > 0) {
        return model;
      }
    }
    
    return null;
  }

  /**
   * 提取平板型号（MatePad、iPad、Pad 等）
   * 
   * 支持格式：
   * - MatePad Pro
   * - iPad Air 2026
   * - MatePad 11
   * - Pad 4 Pro
   * - Pad4Pro (连写)
   */
  private extractTabletModel(normalizedStr: string): string | null {
    // 改进的正则表达式，支持连写和空格分隔
    // 匹配: pad, pad4, pad 4, pad4pro, pad 4 pro, pad4 pro 等
    const tabletModelPattern = /\b(matepad|ipad|pad)\s*(\d+)?\s*(pro|air|mini|plus|ultra|lite|se|x|m|t|s)?\b/gi;
    const tabletMatches = normalizedStr.match(tabletModelPattern);
    
    if (!tabletMatches || tabletMatches.length === 0) {
      return null;
    }
    
    // 提取型号并清理
    let tabletModel = tabletMatches[0].toLowerCase().trim();
    
    // 移除中文字符
    tabletModel = tabletModel.replace(/[\u4e00-\u9fa5]/g, '').trim();
    
    // 标准化空格（移除所有空格）
    tabletModel = tabletModel.replace(/\s+/g, '');
    
    // 检查是否有年份信息
    const year = this.extractYearFromString(normalizedStr);
    if (year) {
      tabletModel += year;
    }
    
    // 只有当不是纯数字时才返回
    if (!/^\d+$/.test(tabletModel) && tabletModel.length > 0) {
      return tabletModel;
    }
    
    return null;
  }

  /**
   * 从字符串中提取年份信息
   */
  private extractYearFromString(str: string): string | null {
    const yearPattern = /\b(\d{4})\b/g;
    const yearMatches = str.match(yearPattern);
    
    if (!yearMatches || yearMatches.length === 0) {
      return null;
    }
    
    // 过滤掉容量相关的数字（如 8+128）
    const validYears = yearMatches.filter(year => {
      const num = parseInt(year);
      return num >= 2000 && num <= 2100;
    });
    
    return validYears.length > 0 ? validYears[0] : null;
  }

  /**
   * 提取字母+字母格式的型号（Watch GT、Band 5、X Fold5、Watch 十周年款 等）
   */
  private extractWordModel(normalizedStr: string): string | null {
    // Pattern 1: watch/band/buds + 英文后缀或数字
    const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
    
    // Pattern 2: 单字母 + 关键词 + 可选数字（如 X Fold5, Z Flip3）
    const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)(?:\s+(\d+))?\b/gi;
    
    // Pattern 3: watch/band + 中文后缀（如 "watch十周年款"、"watch 十周年款"）
    // 注意：不使用 \b，因为它在中英文边界不起作用
    const wordModelPattern3 = /(watch|band|buds)\s*([\u4e00-\u9fa5]+款?)/gi;
    
    // Pattern 4: watch/band + 型号代码（如 "RTS-AL00"、"LTN-AL00"）
    const wordModelPattern4 = /(watch|band|buds)\s+([a-z]{3}-[a-z]{2}\d{2})/gi;
    
    const wordMatches1 = normalizedStr.match(wordModelPattern1);
    const wordMatches2 = normalizedStr.match(wordModelPattern2);
    const wordMatches3 = normalizedStr.match(wordModelPattern3);
    const wordMatches4 = normalizedStr.match(wordModelPattern4);
    const wordMatches = [...(wordMatches1 || []), ...(wordMatches2 || []), ...(wordMatches3 || []), ...(wordMatches4 || [])];
    
    if (wordMatches && wordMatches.length > 0) {
      // 优先返回最长的匹配（更具体）
      const sorted = wordMatches.sort((a, b) => b.length - a.length);
      return sorted[0].toLowerCase().replace(/\s+/g, '');
    }
    
    return null;
  }

  /**
   * 提取复杂型号（14 Pro Max+、Y300 Pro+ 等）
   * 
   * 支持格式：
   * - 14 Pro Max+
   * - Y300 Pro+
   * - Mate 60 Pro
   */
  private extractComplexModel(normalizedStr: string): string | null {
    const complexModelPattern = /\b([a-z]*)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note|turbo|r)(\+)?(\s+(mini|max|plus|ultra|pro))?\b/gi;
    const complexMatches = normalizedStr.match(complexModelPattern);
    
    if (!complexMatches || complexMatches.length === 0) {
      return null;
    }
    
    const filtered = complexMatches.filter(m => {
      const lower = m.toLowerCase();
      return !lower.includes('gb') && !/\d+g$/i.test(lower);
    });
    
    if (filtered.length > 0) {
      return filtered.sort((a, b) => b.length - a.length)[0].toLowerCase().replace(/\s+/g, '');
    }
    
    return null;
  }

  /**
   * 提取简单型号（P50、14、K70 等）
   * 
   * 支持格式：
   * - P50（字母+数字）
   * - 14（纯数字）
   * - K70（字母+数字）
   */
  private extractSimpleModel(normalizedStr: string): string | null {
    const simpleModelPattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
    const simpleMatches = normalizedStr.match(simpleModelPattern);
    
    if (!simpleMatches || simpleMatches.length === 0) {
      return null;
    }
    
    const filtered = simpleMatches.filter(m => {
      const lower = m.toLowerCase().trim();
      // 过滤掉网络制式、容量等
      return !/^[345]g$/i.test(lower) && 
             !lower.includes('gb') && 
             !/^\d+g$/i.test(lower) &&
             !/^\d+\+\d+$/i.test(lower);
    });
    
    if (filtered.length === 0) {
      return null;
    }
    
    const sorted = filtered.sort((a, b) => {
      const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
      const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
      if (aHasSuffix && !bHasSuffix) return -1;
      if (!aHasSuffix && bHasSuffix) return 1;
      return b.length - a.length;
    });
    
    return sorted[0].toLowerCase().trim().replace(/\s+/g, '');
  }

  /**
   * 提取容量（委托给 InfoExtractor）
   * @deprecated 此方法已迁移到 InfoExtractor，保留用于向后兼容
   */
  extractCapacity(str: string): string | null {
    const result = this.infoExtractor.extractCapacity(str);
    return result.value;
  }

  /**
   * 提取手表尺寸（新增）
   * 用于提取手表/手环的尺寸规格，如 "46mm"、"42mm"、"1.43寸" 等
   * 
   * @param str 输入字符串
   * @returns 尺寸字符串（如 "46mm"）或 null
   */
  extractWatchSize(str: string): string | null {
    // 匹配 mm 尺寸（如 46mm、42mm）
    const mmPattern = /(\d+)\s*mm\b/i;
    const mmMatch = str.match(mmPattern);
    if (mmMatch) {
      return `${mmMatch[1]}mm`;
    }
    
    // 匹配寸尺寸（如 1.43寸、1.96寸）
    const inchPattern = /(\d+\.?\d*)\s*寸\b/;
    const inchMatch = str.match(inchPattern);
    if (inchMatch) {
      return `${inchMatch[1]}寸`;
    }
    
    return null;
  }

  /**
   * 提取表带类型（新增）
   * 用于提取手表的表带材质和颜色，如 "复合编织表带托帕蓝"、"氟橡胶表带黑色" 等
   * 
   * @param str 输入字符串
   * @returns 表带描述字符串或 null
   */
  extractWatchBand(str: string): string | null {
    // 表带关键词列表
    const bandKeywords = [
      '编织表带', '复合编织表带', '尼龙编织表带',
      '皮革表带', '真皮表带', '素皮表带',
      '金属表带', '不锈钢表带', '钛金属表带',
      '硅胶表带', '氟橡胶表带', '橡胶表带',
      '表带', '腕带', '表链'
    ];
    
    // 按长度降序排序，优先匹配更具体的表带类型
    const sortedKeywords = bandKeywords.sort((a, b) => b.length - a.length);
    
    for (const keyword of sortedKeywords) {
      const index = str.indexOf(keyword);
      if (index !== -1) {
        // 找到表带关键词，提取从关键词开始到字符串末尾的内容
        // 这样可以包含表带的材质和颜色信息
        // 例如："复合编织表带托帕蓝" -> "复合编织表带托帕蓝"
        const bandInfo = str.substring(index).trim();
        
        // 移除可能的括号和型号信息
        const cleaned = bandInfo.replace(/\([^)]*\)/g, '').trim();
        
        return cleaned;
      }
    }
    
    return null;
  }

  /**
   * 改进的颜色提取（委托给 InfoExtractor）
   * @deprecated 此方法已迁移到 InfoExtractor，保留用于向后兼容
   */
  extractColorAdvanced(input: string): string | null {
    const result = this.infoExtractor.extractColor(input);
    return result.value;
  }

  /**
   * 改进的颜色匹配（使用 ColorMatcher）
   * 
   * 匹配优先级：
   * 1. 完全匹配（精确匹配）
   * 2. 颜色变体匹配（已知的颜色变体对）
   * 3. 基础颜色匹配（模糊匹配，同一基础颜色族）
   */
  isColorMatch(color1: string, color2: string): boolean {
    return this.colorMatcher.match(color1, color2).match;
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
    
    // 规则2: 赠品/定制/限定过滤
    const giftKeywords = ['赠品', '定制', '限定', '立牌', '周边', '手办', '摆件'];
    const hasGiftKeywordInInput = giftKeywords.some(keyword => 
      lowerInput.includes(keyword)
    );
    const hasGiftKeywordInSPU = giftKeywords.some(keyword => 
      lowerSPU.includes(keyword)
    );
    
    // 如果输入不包含赠品关键词，但 SPU 包含赠品关键词，则过滤
    if (!hasGiftKeywordInInput && hasGiftKeywordInSPU) {
      console.log(`[过滤] SPU "${spuName}" 被过滤 - 包含赠品/定制关键词`);
      return true;
    }
    
    // 规则3: 版本互斥过滤
    const hasBluetooth = lowerInput.includes('蓝牙版');
    const hasESIM = lowerInput.includes('esim版') || lowerInput.includes('esim版');
    
    if (hasBluetooth && (lowerSPU.includes('esim版') || lowerSPU.includes('esim版'))) {
      return true;
    }
    
    if (hasESIM && lowerSPU.includes('蓝牙版')) {
      return true;
    }
    
    // 规则4: 配件过滤（使用配置或默认值）
    const accessoryKeywords = this.filterKeywords?.accessoryKeywords || [
      '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
      '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
      '原装', '配件', '套餐', '底座', '充电底座', '无线充电'
    ];
    
    // 特殊处理：对于包含 "底座" 的 SPU，需要更严格的判断
    // 如果 SPU 包含 "底座" 或 "充电底座"，且输入不包含这些词，则应该过滤
    if ((lowerSPU.includes('底座') || lowerSPU.includes('充电底座')) && 
        !lowerInput.includes('底座') && !lowerInput.includes('充电底座')) {
      console.log(`[过滤] SPU "${spuName}" 被过滤 - 包含配件关键词（底座）`);
      return true;
    }
    
    const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
      lowerInput.includes(keyword)
    );
    const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
      lowerSPU.includes(keyword)
    );
    
    // 如果输入不包含配件关键词，但 SPU 包含配件关键词，则过滤
    if (!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU) {
      console.log(`[过滤] SPU "${spuName}" 被过滤 - 包含配件关键词`);
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
      return SPU_PRIORITIES.STANDARD; // 标准版：优先级最高
    }
    
    if (hasSpecialVersion) {
      for (const keyword of networkVersions) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerInput.includes(lowerKeyword) && lowerSPU.includes(lowerKeyword)) {
          return SPU_PRIORITIES.VERSION_MATCH; // 版本匹配的特殊版：优先级中等
        }
      }
    }
    
    return SPU_PRIORITIES.OTHER; // 其他情况：优先级最低
  }

  /**
   * 提取 SPU 部分
   */
  extractSPUPart(str: string): string {
    // 特殊调试：对于 "15R" 相关的输入
    const is15R = str.toLowerCase().includes('15') && str.toLowerCase().includes('r') && !str.toLowerCase().includes('note');
    
    if (is15R) {
      console.log(`\n[extractSPUPart-15R] ========== 开始提取SPU部分 ==========`);
      console.log(`[extractSPUPart-15R] 输入: "${str}"`);
    }
    
    // 规则1: 优先检查 "全网通5G"
    const fullNetworkFiveGPattern = /(.+?)\s*全网通\s*5g(?:版)?\b/i;
    const fullNetworkFiveGMatch = str.match(fullNetworkFiveGPattern);
    if (fullNetworkFiveGMatch) {
      if (is15R) {
        console.log(`[extractSPUPart-15R] 规则1匹配: 全网通5G -> "${fullNetworkFiveGMatch[1].trim()}"`);
        console.log(`[extractSPUPart-15R] ========== 提取完成 ==========\n`);
      }
      return fullNetworkFiveGMatch[1].trim();
    } else if (is15R) {
      console.log(`[extractSPUPart-15R] 规则1: 全网通5G - 未匹配`);
    }
    
    // 规则2: 检查网络制式（5G、4G、3G 等）
    // 这些都是 SKU 级别的属性，不属于 SPU
    const networkPattern = /(.+?)\s*(?:5g|4g|3g|2g)(?:版)?\b/i;
    const networkMatch = str.match(networkPattern);
    if (networkMatch) {
      if (is15R) {
        console.log(`[extractSPUPart-15R] 规则2匹配: 网络制式 -> "${networkMatch[1].trim()}"`);
        console.log(`[extractSPUPart-15R] ========== 提取完成 ==========\n`);
      }
      return networkMatch[1].trim();
    } else if (is15R) {
      console.log(`[extractSPUPart-15R] 规则2: 网络制式 - 未匹配`);
    }
    
    // 规则3: 如果找到容量（改进：支持 4+128 格式）
    const memoryPattern = /(.+?)\s*\(?\d+\s*(?:gb)?\s*\+\s*\d+\s*(?:gb)?\)?/i;
    const memoryMatch = str.match(memoryPattern);
    if (memoryMatch) {
      if (is15R) {
        console.log(`[extractSPUPart-15R] 规则3匹配: 容量 -> "${memoryMatch[1].trim()}"`);
        console.log(`[extractSPUPart-15R] ========== 提取完成 ==========\n`);
      }
      return memoryMatch[1].trim();
    } else if (is15R) {
      console.log(`[extractSPUPart-15R] 规则3: 容量 - 未匹配`);
    }
    
    // 🔥 新增规则4: 手表尺寸规格（46mm、42mm 等）
    // 对于手表产品，尺寸是SKU级别的属性，不属于SPU
    // 例如："华为WatchGT5 46mm 复合编织表带托帕蓝" -> SPU应该是 "华为WatchGT5"
    const watchSizePattern = /(.+?)\s+(\d+)\s*mm\b/i;
    const watchSizeMatch = str.match(watchSizePattern);
    if (watchSizeMatch) {
      const beforeSize = watchSizeMatch[1].trim();
      // 检查是否是手表产品（包含 watch、band、手表、手环 等关键词）
      const isWatch = /watch|band|手表|手环/i.test(beforeSize);
      if (isWatch) {
        if (is15R) {
          console.log(`[extractSPUPart-15R] 规则4匹配: 手表尺寸 -> "${beforeSize}"`);
          console.log(`[extractSPUPart-15R] ========== 提取完成 ==========\n`);
        }
        return beforeSize;
      } else if (is15R) {
        console.log(`[extractSPUPart-15R] 规则4: 找到尺寸但不是手表产品`);
      }
    } else if (is15R) {
      console.log(`[extractSPUPart-15R] 规则4: 手表尺寸 - 未匹配`);
    }
    
    // 规则5: 按照品牌+型号方法确定SPU
    let spuPart = str;
    
    if (is15R) {
      console.log(`[extractSPUPart-15R] 规则5: 开始品牌+型号方法`);
    }
    
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
      if (is15R) {
        console.log(`[extractSPUPart-15R] 找到版本关键词: "${versionKeyword}" at ${versionIndex}`);
        console.log(`[extractSPUPart-15R] 截取到版本结束: "${spuPart}"`);
      }
    } else {
      if (is15R) {
        console.log(`[extractSPUPart-15R] 未找到版本关键词，尝试颜色提取`);
      }
      
      // 🔥 关键修复：先移除品牌名，再移除配件关键词，最后提取颜色
      // 避免把品牌名中的颜色字（如"红米"中的"红"）误识别为颜色
      // 避免把配件关键词中的颜色字（如"蓝色表带"中的"蓝色"）误识别为产品颜色
      let spuPartWithoutBrand = spuPart;
      const brand = this.extractBrand(spuPart);
      if (brand) {
        // 移除品牌名（大小写不敏感）
        const brandRegex = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        spuPartWithoutBrand = spuPart.replace(brandRegex, '').trim();
        if (is15R) {
          console.log(`[extractSPUPart-15R] 提取品牌: "${brand}"`);
          console.log(`[extractSPUPart-15R] 移除品牌后: "${spuPartWithoutBrand}"`);
        }
      }
      
      // 🔥 新增：移除配件关键词（表带、表盘等）
      // 这些关键词后面的内容通常是配件的颜色/材质，不是产品本身的颜色
      const accessoryKeywords = [
        '表带', '表盘', '表链', '表扣', '表冠',
        '手环', '腕带', '编织表带', '皮革表带', '金属表带', '硅胶表带',
        '耳机', '耳塞', '充电器', '数据线', '保护壳', '保护套',
        '键盘', '鼠标', '触控笔', '手写笔'
      ];
      
      let spuPartWithoutAccessory = spuPartWithoutBrand;
      for (const keyword of accessoryKeywords) {
        const index = spuPartWithoutAccessory.indexOf(keyword);
        if (index !== -1) {
          // 找到配件关键词，截取到关键词之前
          spuPartWithoutAccessory = spuPartWithoutAccessory.substring(0, index).trim();
          if (is15R) {
            console.log(`[extractSPUPart-15R] 找到配件关键词: "${keyword}" at ${index}`);
            console.log(`[extractSPUPart-15R] 截取到配件关键词前: "${spuPartWithoutAccessory}"`);
          }
          break;
        }
      }
      
      // 从移除品牌和配件关键词后的字符串中提取颜色
      const color = this.extractColorAdvanced(spuPartWithoutAccessory);
      if (is15R) {
        console.log(`[extractSPUPart-15R] 提取颜色: ${color ? `"${color}"` : 'null'}`);
      }
      
      if (color) {
        // 在原始字符串中查找颜色位置（使用 lastIndexOf 找最后一个）
        const colorIndex = spuPart.lastIndexOf(color);
        if (is15R) {
          console.log(`[extractSPUPart-15R] 颜色在原始字符串中的位置: ${colorIndex}`);
        }
        // 只有当颜色不在品牌名中时才截取
        // 通过检查颜色位置是否在品牌名之后来判断
        const brandLength = brand ? brand.length : 0;
        if (colorIndex !== -1 && colorIndex >= brandLength) {
          spuPart = spuPart.substring(0, colorIndex).trim();
          if (is15R) {
            console.log(`[extractSPUPart-15R] 截取到颜色前: "${spuPart}"`);
          }
        } else if (is15R) {
          console.log(`[extractSPUPart-15R] 颜色在品牌名中，不截取`);
        }
      }
      
      spuPart = spuPart.replace(/软胶|硅胶|皮革|陶瓷|玻璃/gi, '');
      spuPart = spuPart.trim().replace(/\s+/g, ' ');
      
      if (is15R) {
        console.log(`[extractSPUPart-15R] 移除材质后: "${spuPart}"`);
      }
    }
    
    if (is15R) {
      console.log(`[extractSPUPart-15R] 最终结果: "${spuPart}"`);
      console.log(`[extractSPUPart-15R] ========== 提取完成 ==========\n`);
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
   * 查找最佳匹配的SPU（使用品牌索引优化）
   */
  findBestSPUMatch(input: string, spuList: SPUData[], threshold: number = MATCH_THRESHOLDS.SPU): {
    spu: SPUData | null;
    similarity: number;
  } {
    const inputSPUPart = this.extractSPUPart(input);
    const inputBrand = this.extractBrand(inputSPUPart);
    const inputModel = this.extractModel(inputSPUPart, inputBrand);
    const inputVersion = this.extractVersion(inputSPUPart);
    
    console.log(`[匹配调试] 输入: "${input}"`);
    console.log(`[匹配调试] SPU部分: "${inputSPUPart}"`);
    console.log(`[匹配调试] 提取品牌: "${inputBrand}"`);
    console.log(`[匹配调试] 提取型号: "${inputModel}"`);
    
    // 性能优化：使用品牌索引缩小候选范围
    let candidateSPUs: SPUData[];
    let usedBrandFilter = false;
    
    if (inputBrand && this.spuIndexByBrand.size > 0) {
      const lowerBrand = inputBrand.toLowerCase();
      candidateSPUs = this.spuIndexByBrand.get(lowerBrand) || [];
      
      console.log(`[匹配调试] 品牌索引查找 "${lowerBrand}": ${candidateSPUs.length} 个SPU`);
      
      // 如果品牌索引中没有找到，尝试通过拼音匹配
      if (candidateSPUs.length === 0) {
        const brandInfo = this.brandList.find(b => b.name === inputBrand);
        if (brandInfo && brandInfo.spell) {
          candidateSPUs = this.spuIndexByBrand.get(brandInfo.spell.toLowerCase()) || [];
          console.log(`[匹配调试] 拼音索引查找 "${brandInfo.spell}": ${candidateSPUs.length} 个SPU`);
        }
      }
      
      if (candidateSPUs.length > 0) {
        console.log(`✓ 使用品牌索引: ${inputBrand}, 候选SPU: ${candidateSPUs.length}/${spuList.length}`);
        usedBrandFilter = true;
      } else {
        // 关键修复：如果品牌识别成功但索引中没有找到，说明数据有问题
        // 不应该回退到全部 SPU，而是应该严格过滤
        console.warn(`⚠️  品牌 "${inputBrand}" 在索引中未找到，将严格过滤品牌`);
        candidateSPUs = spuList.filter(spu => {
          const spuBrand = spu.brand || this.extractBrand(spu.name);
          return spuBrand && this.isBrandMatch(inputBrand, spuBrand);
        });
        console.log(`[匹配调试] 严格品牌过滤后: ${candidateSPUs.length} 个SPU`);
        usedBrandFilter = true;
      }
    } else {
      if (!inputBrand) {
        console.warn(`⚠️  品牌提取失败，将在所有 ${spuList.length} 个SPU中搜索`);
      }
      candidateSPUs = spuList;
    }
    
    // 如果没有候选SPU，返回null
    if (candidateSPUs.length === 0) {
      console.log(`[匹配调试] 没有候选SPU，匹配失败`);
      return { spu: null, similarity: 0 };
    }
    
    let bestMatch: SPUData | null = null;
    let bestScore = 0;
    let bestPriority = 0;
    
    // 第一阶段：精确匹配（品牌+型号完全匹配）
    console.log(`[匹配调试] 开始精确匹配，候选SPU: ${candidateSPUs.length} 个`);
    const exactMatches = this.findExactSPUMatches(
      input,
      candidateSPUs, // 使用候选列表而不是完整列表
      inputBrand,
      inputModel,
      inputVersion
    );
    
    console.log(`[匹配调试] 精确匹配结果: ${exactMatches.length} 个`);
    if (exactMatches.length > 0) {
      const best = this.selectBestSPUMatch(exactMatches);
      bestMatch = best.spu;
      bestScore = best.score;
      bestPriority = best.priority;
      console.log(`[匹配调试] 精确匹配最佳: "${best.spu.name}", 分数: ${best.score.toFixed(2)}`);
    }
    
    // 第二阶段：模糊匹配（如果第一阶段没有找到高分匹配）
    if (!bestMatch || bestScore < 0.99) {
      console.log(`[匹配调试] 开始模糊匹配${bestMatch ? `（精确匹配分数 ${bestScore.toFixed(2)} < 0.99）` : ''}`);
      const fuzzyMatches = this.findFuzzySPUMatches(
        input,
        candidateSPUs, // 使用候选列表而不是完整列表
        inputBrand,
        inputModel,
        threshold
      );
      
      console.log(`[匹配调试] 模糊匹配结果: ${fuzzyMatches.length} 个`);
      if (fuzzyMatches.length > 0) {
        const best = this.selectBestSPUMatch(fuzzyMatches);
        console.log(`[匹配调试] 模糊匹配最佳: "${best.spu.name}", 分数: ${best.score.toFixed(2)}`);
        if (best.score > bestScore || !bestMatch) {
          bestMatch = best.spu;
          bestScore = best.score;
        }
      }
    }
    
    console.log(`[匹配调试] 最终匹配: ${bestMatch ? `"${bestMatch.name}"` : 'null'}, 分数: ${bestScore.toFixed(2)}, 阈值: ${threshold}`);
    if (bestScore < threshold) {
      console.log(`[匹配调试] ❌ 分数低于阈值，匹配失败`);
      return { spu: null, similarity: 0 };
    }
    
    return { spu: bestMatch, similarity: bestScore };
  }

  /**
   * 第一阶段：查找精确匹配的 SPU（品牌+型号完全匹配）
   */
  private findExactSPUMatches(
    input: string,
    spuList: SPUData[],
    inputBrand: string | null,
    inputModel: string | null,
    inputVersion: VersionInfo | null
  ): Array<{ spu: SPUData; score: number; priority: number }> {
    const matches: Array<{ spu: SPUData; score: number; priority: number }> = [];
    
    // 调试：记录输入型号的标准化形式
    const inputModelNormalized = inputModel?.toLowerCase().replace(/\s+/g, '');
    console.log(`[精确匹配] 输入型号标准化: "${inputModel}" -> "${inputModelNormalized}"`);
    
    let checkedCount = 0;
    let filteredCount = 0;
    let brandMismatchCount = 0;
    let modelMismatchCount = 0;
    let modelExtractionFailedCount = 0;
    
    // 收集所有提取的型号（用于调试）
    const extractedModels = new Set<string>();
    
    // 调试：输出前10个候选SPU
    console.log(`[精确匹配] 前10个候选SPU:`);
    spuList.slice(0, 10).forEach((spu, index) => {
      console.log(`  ${index + 1}. "${spu.name}" (ID: ${spu.id}, 品牌: ${spu.brand || '未设置'})`);
    });
    
    for (const spu of spuList) {
      checkedCount++;
      
      // 调试：对于包含"15"或"R"的SPU，输出检查信息
      const lowerName = spu.name.toLowerCase();
      const is15R = lowerName.includes('15') && lowerName.includes('r') && !lowerName.includes('note');
      
      if (is15R) {
        console.log(`\n[精确匹配-15R] ========== 开始检查SPU: "${spu.name}" (ID: ${spu.id}) ==========`);
      }
      
      if (this.shouldFilterSPU(input, spu.name)) {
        filteredCount++;
        if (is15R) {
          console.log(`[精确匹配-15R] ❌ SPU被过滤`);
        }
        continue;
      }
      
      const spuSPUPart = this.extractSPUPart(spu.name);
      if (is15R) {
        console.log(`[精确匹配-15R] SPU部分: "${spu.name}" -> "${spuSPUPart}"`);
      }
      
      const spuBrand = spu.brand || this.extractBrand(spuSPUPart);
      if (is15R) {
        console.log(`[精确匹配-15R] 品牌: spu.brand="${spu.brand}", 提取="${this.extractBrand(spuSPUPart)}", 最终="${spuBrand}"`);
      }
      
      const spuModel = this.extractModel(spuSPUPart, spuBrand);
      if (is15R) {
        console.log(`[精确匹配-15R] 型号提取: extractModel("${spuSPUPart}", "${spuBrand}") = ${spuModel ? `"${spuModel}"` : 'null'}`);
        if (!spuModel) {
          console.log(`[精确匹配-15R] ❌ 型号提取失败！`);
        }
      }
      
      const spuVersion = this.extractVersion(spuSPUPart);
      
      // 收集提取的型号
      if (spuModel) {
        extractedModels.add(spuModel);
      } else {
        modelExtractionFailedCount++;
      }
      
      if (is15R) {
        console.log(`[精确匹配-15R] SPU版本: ${spuVersion ? `"${spuVersion.name}"` : 'null'}`);
      }
      
      // 调试：对于包含"s50"的SPU，输出详细信息
      if (spu.name.toLowerCase().includes('s50')) {
        const normalizeForComparison = (model: string) => model.toLowerCase().replace(/[\s\-_]/g, '');
        const spuModelNormalized = spuModel ? normalizeForComparison(spuModel) : 'null';
        const inputModelNormalized = inputModel ? normalizeForComparison(inputModel) : 'null';
        console.log(`[精确匹配] 检查SPU: "${spu.name}"`);
        console.log(`  SPU部分: "${spuSPUPart}"`);
        console.log(`  SPU品牌: "${spuBrand}"`);
        console.log(`  SPU型号: "${spuModel}" -> "${spuModelNormalized}"`);
        console.log(`  输入型号: "${inputModel}" -> "${inputModelNormalized}"`);
        console.log(`  型号匹配: ${spuModelNormalized === inputModelNormalized}`);
        console.log(`  SPU版本: ${spuVersion ? `"${spuVersion.name}"` : 'null'}`);
      }
      
      // 品牌和型号必须完全匹配
      const brandMatch = this.isBrandMatch(inputBrand, spuBrand);
      
      if (is15R) {
        console.log(`[精确匹配-15R] 品牌匹配: isBrandMatch("${inputBrand}", "${spuBrand}") = ${brandMatch}`);
      }
      
      // 标准化型号进行比较：移除所有空格和特殊字符
      const normalizeForComparison = (model: string) => {
        return model.toLowerCase().replace(/[\s\-_]/g, '');
      };
      
      const modelMatch = inputModel && spuModel && 
                        normalizeForComparison(inputModel) === normalizeForComparison(spuModel);
      
      if (is15R) {
        console.log(`[精确匹配-15R] 型号匹配: "${inputModel}" vs "${spuModel}"`);
        console.log(`[精确匹配-15R] 标准化: "${inputModel ? normalizeForComparison(inputModel) : 'null'}" vs "${spuModel ? normalizeForComparison(spuModel) : 'null'}"`);
        console.log(`[精确匹配-15R] 匹配结果: ${modelMatch}`);
        console.log(`[精确匹配-15R] ========== 结束检查 ==========\n`);
      }
      
      if (!brandMatch) {
        brandMismatchCount++;
      }
      
      if (!modelMatch && spuModel) {
        modelMismatchCount++;
      }
      
      if (inputBrand && spuBrand && brandMatch && modelMatch) {
        const score = this.calculateExactSPUScore(inputVersion, spuVersion);
        const priority = this.getSPUPriority(input, spu.name);
        const keywordBonus = this.calculateKeywordBonus(input, spu.name);
        const modelDetailBonus = this.calculateModelDetailBonus(inputModel, spuModel);
        const finalScore = Math.min(score + keywordBonus + modelDetailBonus, 1.0);
        
        console.log(`[精确匹配] ✓ 找到匹配: "${spu.name}", 基础分: ${score.toFixed(2)}, 关键词加分: ${keywordBonus.toFixed(2)}, 型号详细度加分: ${modelDetailBonus.toFixed(2)}, 最终分数: ${finalScore.toFixed(2)}`);
        matches.push({ spu, score: finalScore, priority });
      }
    }
    
    console.log(`[精确匹配] 统计: 检查${checkedCount}个, 过滤${filteredCount}个, 品牌不匹配${brandMismatchCount}个, 型号不匹配${modelMismatchCount}个, 型号提取失败${modelExtractionFailedCount}个`);
    
    // 如果没有找到匹配，输出所有提取的型号（帮助调试）
    if (matches.length === 0 && extractedModels.size > 0) {
      const modelList = Array.from(extractedModels).sort();
      console.log(`[精确匹配] ❌ 未找到匹配。候选SPU中提取的型号列表（共${modelList.length}个）:`);
      console.log(`  ${modelList.slice(0, 20).join(', ')}${modelList.length > 20 ? ` ... 还有${modelList.length - 20}个` : ''}`);
      console.log(`[精确匹配] 💡 提示: 输入型号"${inputModel}"不在上述列表中，请检查：`);
      console.log(`  1. 数据库中是否存在该型号的产品`);
      console.log(`  2. 产品名称格式是否不同（如"Note 15R"而不是"15R"）`);
      console.log(`  3. 型号提取逻辑是否需要调整`);
      
      // 额外调试：输出型号提取失败的SPU名称（前10个）
      if (modelExtractionFailedCount > 0) {
        console.log(`[精确匹配] 🔍 型号提取失败的SPU示例（共${modelExtractionFailedCount}个）:`);
        let failedCount = 0;
        for (const spu of spuList) {
          if (this.shouldFilterSPU(input, spu.name)) continue;
          
          const spuSPUPart = this.extractSPUPart(spu.name);
          const spuBrand = spu.brand || this.extractBrand(spuSPUPart);
          const spuModel = this.extractModel(spuSPUPart, spuBrand);
          
          if (!spuModel) {
            console.log(`  - "${spu.name}" (品牌: ${spu.brand || '未设置'})`);
            failedCount++;
            if (failedCount >= 10) break;
          }
        }
      }
    }
    
    return matches;
  }

  /**
   * 第二阶段：查找模糊匹配的 SPU（分词匹配）
   */
  private findFuzzySPUMatches(
    input: string,
    spuList: SPUData[],
    inputBrand: string | null,
    inputModel: string | null,
    threshold: number
  ): Array<{ spu: SPUData; score: number; priority: number }> {
    const matches: Array<{ spu: SPUData; score: number; priority: number }> = [];
    
    for (const spu of spuList) {
      if (this.shouldFilterSPU(input, spu.name)) {
        continue;
      }
      
      const spuSPUPart = this.extractSPUPart(spu.name);
      const spuBrand = spu.brand || this.extractBrand(spuSPUPart);
      const spuModel = this.extractModel(spuSPUPart, spuBrand);
      
      // 严格的品牌过滤 - 关键修复
      const brandMatch = this.isBrandMatch(inputBrand, spuBrand);
      
      // 如果输入品牌识别成功，必须严格匹配
      if (inputBrand && spuBrand && !brandMatch) {
        continue;
      }
      
      // 如果输入品牌识别成功，但 SPU 品牌未识别，也应该跳过
      // 这可以防止手机匹配到配件等问题
      if (inputBrand && !spuBrand) {
        console.log(`[模糊匹配] 跳过 SPU "${spu.name}" - 输入品牌"${inputBrand}"已识别，但SPU品牌未识别`);
        continue;
      }
      
      let score = 0;
      
      // 只有在输入品牌未识别时才降低分数
      if (!inputBrand && spuBrand) {
        score = 0.3; // 输入品牌未识别，降低基础分数
      }
      
      if (inputModel && spuModel) {
        const modelScore = this.calculateTokenSimilarity(
          this.tokenize(inputModel),
          this.tokenize(spuModel)
        );
        
        if (modelScore > MATCH_THRESHOLDS.MODEL_SIMILARITY) {
          score = Math.max(score, SPU_MATCH_SCORES.FUZZY_BASE + modelScore * SPU_MATCH_SCORES.FUZZY_MODEL_WEIGHT);
          
          if (score >= threshold) {
            const priority = this.getSPUPriority(input, spu.name);
            const keywordBonus = this.calculateKeywordBonus(input, spu.name);
            const finalScore = Math.min(score + keywordBonus, 1.0);
            
            matches.push({ spu, score: finalScore, priority });
          }
        }
      }
    }
    
    return matches;
  }

  /**
   * 计算精确匹配的 SPU 分数（基于版本匹配和型号详细度）
   * 
   * 改进：
   * 1. 当输入没有版本但SPU有版本时，给予更高的分数
   * 2. 根据型号的详细程度调整分数（如包含型号代码、特殊标识等）
   */
  private calculateExactSPUScore(
    inputVersion: VersionInfo | null,
    spuVersion: VersionInfo | null
  ): number {
    let score: number = SPU_MATCH_SCORES.BASE;
    
    if (inputVersion && spuVersion) {
      if (inputVersion.name === spuVersion.name) {
        score = SPU_MATCH_SCORES.VERSION_EXACT;
      } else {
        score = SPU_MATCH_SCORES.VERSION_MISMATCH;
      }
    } else if (!inputVersion && !spuVersion) {
      score = SPU_MATCH_SCORES.NO_VERSION;
    } else if (inputVersion && !spuVersion) {
      score = SPU_MATCH_SCORES.INPUT_VERSION_ONLY;
    } else if (!inputVersion && spuVersion) {
      // 改进：提高分数从 0.9 到 0.95
      // 用户输入通常省略版本信息，这是正常情况
      score = 0.95;
    }
    
    return score;
  }
  
  /**
   * 计算型号详细度加分
   * 如果输入包含更详细的型号信息（如型号代码、特殊标识），给予加分
   */
  private calculateModelDetailBonus(inputModel: string | null, spuModel: string | null): number {
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
    
    return Math.min(bonus, 0.15); // 最多加15分
  }

  /**
   * 计算关键词匹配加分
   */
  private calculateKeywordBonus(input: string, spuName: string): number {
    let keywordMatchCount = 0;
    const inputTokens = this.tokenize(input);
    
    for (const token of inputTokens) {
      if (token.length > 2 && spuName.toLowerCase().includes(token)) {
        keywordMatchCount++;
      }
    }
    
    return Math.min(
      keywordMatchCount * SPU_MATCH_SCORES.KEYWORD_BONUS_PER_MATCH,
      SPU_MATCH_SCORES.KEYWORD_BONUS_MAX
    );
  }

  /**
   * 从匹配列表中选择最佳 SPU
   * 
   * 选择优先级（从高到低）：
   * 1. 分数更高
   * 2. 优先级更高（标准版 > 版本匹配 > 其他）
   * 3. 更简洁的SPU名称（不包含Pro、Max等后缀）
   * 4. 关键词匹配更多
   */
  private selectBestSPUMatch(
    matches: Array<{ spu: SPUData; score: number; priority: number }>
  ): { spu: SPUData; score: number; priority: number } {
    return matches.reduce((best, current) => {
      // 优先选择分数更高的
      if (current.score > best.score) {
        return current;
      }
      
      // 分数相同时，选择优先级更高的
      if (current.score === best.score && current.priority > best.priority) {
        return current;
      }
      
      // 分数和优先级都相同时，选择更简洁的SPU名称
      // 这样可以优先匹配标准版而不是Pro/Max等特殊版本
      if (current.score === best.score && current.priority === best.priority) {
        const currentHasSuffix = this.hasSPUSuffix(current.spu.name);
        const bestHasSuffix = this.hasSPUSuffix(best.spu.name);
        
        // 如果当前SPU没有后缀但最佳SPU有后缀，选择当前SPU
        if (!currentHasSuffix && bestHasSuffix) {
          return current;
        }
        
        // 如果都有后缀或都没有后缀，选择关键词匹配更多的
        if (currentHasSuffix === bestHasSuffix) {
          const currentKeywords = this.tokenize(current.spu.name).length;
          const bestKeywords = this.tokenize(best.spu.name).length;
          if (currentKeywords > bestKeywords) {
            return current;
          }
        }
      }
      
      return best;
    });
  }

  /**
   * 检查SPU名称是否包含特殊后缀（Pro、Max、Plus、Ultra等）
   * 用于在分数相同时优先选择更简洁的版本
   */
  private hasSPUSuffix(spuName: string): boolean {
    const suffixes = ['Pro', 'Max', 'Plus', 'Ultra', 'Mini', 'SE', 'Air', 'Lite', 'Note', 'Turbo'];
    const lowerName = spuName.toLowerCase();
    
    for (const suffix of suffixes) {
      // 检查后缀是否在名称末尾（使用单词边界）
      const regex = new RegExp(`\\b${suffix.toLowerCase()}\\b`, 'i');
      if (regex.test(lowerName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 统一的 SKU 匹配函数
   * 
   * 颜色匹配优先级：
   * 1. 完全匹配（100%分数）
   * 2. 颜色变体匹配（90%分数）
   * 3. 基础颜色匹配（50%分数）
   * 
   * 匹配维度（新增手表规格）：
   * - 版本（活力版、标准版等）
   * - 容量（8+256GB 等）
   * - 颜色（星岩黑、冰霜银等）
   * - 手表尺寸（46mm、42mm 等）- 新增
   * - 表带类型（复合编织表带托帕蓝等）- 新增
   * 
   * @param input 输入字符串
   * @param skuList SKU 列表
   * @param options 匹配选项
   * @returns 最佳匹配的 SKU 和相似度
   */
  findBestSKU(
    input: string,
    skuList: SKUData[],
    options?: {
      inputVersion?: VersionInfo | null;
      versionWeight?: number;
      capacityWeight?: number;
      colorWeight?: number;
      watchSizeWeight?: number;  // 新增：手表尺寸权重
      watchBandWeight?: number;  // 新增：表带类型权重
    }
  ): { sku: SKUData | null; similarity: number } {
    const inputCapacity = this.extractCapacity(input);
    const inputColor = this.extractColorAdvanced(input);
    const inputVersion = options?.inputVersion;
    const inputWatchSize = this.extractWatchSize(input);      // 新增
    const inputWatchBand = this.extractWatchBand(input);      // 新增
    
    // 检测是否是手表产品
    const isWatchProduct = /watch|band|手表|手环/i.test(input);
    
    // 默认权重
    const versionWeight = options?.versionWeight ?? 0.3;
    const capacityWeight = options?.capacityWeight ?? 0.4;
    const colorWeight = options?.colorWeight ?? 0.3;
    const watchSizeWeight = options?.watchSizeWeight ?? (isWatchProduct ? 0.3 : 0);  // 手表产品才使用尺寸权重
    const watchBandWeight = options?.watchBandWeight ?? (isWatchProduct ? 0.2 : 0);  // 手表产品才使用表带权重
    
    let bestMatch: SKUData | null = null;
    let bestScore = 0;
    
    for (const sku of skuList) {
      const skuCapacity = this.extractCapacity(sku.name);
      const skuColor = this.extractColorAdvanced(sku.name);
      const skuVersion = this.extractVersion(sku.name);
      const skuWatchSize = this.extractWatchSize(sku.name);    // 新增
      const skuWatchBand = this.extractWatchBand(sku.name);    // 新增
      
      let score = 0;
      let totalWeight = 0;
      
      // 版本匹配
      if (inputVersion || skuVersion) {
        totalWeight += versionWeight;
        if (inputVersion && skuVersion) {
          if (inputVersion.name === skuVersion.name) {
            score += versionWeight;
          } else if (inputVersion.priority === skuVersion.priority) {
            score += versionWeight * 0.83; // 83% 的版本权重
          }
        } else if (!inputVersion && !skuVersion) {
          score += versionWeight;
        }
      }
      
      // 容量匹配
      if (inputCapacity || skuCapacity) {
        totalWeight += capacityWeight;
        if (inputCapacity && skuCapacity && inputCapacity === skuCapacity) {
          score += capacityWeight;
        }
      }
      
      // 颜色匹配 - 区分完全匹配、变体匹配和基础匹配
      if (inputColor || skuColor) {
        totalWeight += colorWeight;
        if (inputColor && skuColor) {
          const colorMatchResult = this.colorMatcher.match(inputColor, skuColor);
          if (colorMatchResult.match) {
            score += colorWeight * colorMatchResult.score;
          }
        }
      }
      
      // 🔥 新增：手表尺寸匹配
      if (isWatchProduct && (inputWatchSize || skuWatchSize)) {
        totalWeight += watchSizeWeight;
        if (inputWatchSize && skuWatchSize && inputWatchSize === skuWatchSize) {
          score += watchSizeWeight;
        }
      }
      
      // 🔥 新增：表带类型匹配
      if (isWatchProduct && (inputWatchBand || skuWatchBand)) {
        totalWeight += watchBandWeight;
        if (inputWatchBand && skuWatchBand) {
          // 表带匹配：检查是否包含相同的关键词
          // 例如："复合编织表带托帕蓝" 包含 "复合编织表带" 和 "托帕蓝"
          const inputBandLower = inputWatchBand.toLowerCase();
          const skuBandLower = skuWatchBand.toLowerCase();
          
          // 完全匹配
          if (inputBandLower === skuBandLower) {
            score += watchBandWeight;
          }
          // 部分匹配：检查是否包含相同的表带类型关键词
          else {
            const bandTypes = ['编织', '皮革', '金属', '硅胶', '橡胶', '不锈钢', '钛金属'];
            let hasCommonType = false;
            
            for (const type of bandTypes) {
              if (inputBandLower.includes(type) && skuBandLower.includes(type)) {
                hasCommonType = true;
                break;
              }
            }
            
            if (hasCommonType) {
              score += watchBandWeight * 0.7; // 部分匹配给70%的分数
            }
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

}
