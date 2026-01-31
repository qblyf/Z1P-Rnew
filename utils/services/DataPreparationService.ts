/**
 * 数据准备服务
 * 
 * 职责：
 * - 加载品牌库、SPU列表
 * - 从SKU提取规格信息，构建索引
 * - 管理所有索引（品牌索引、型号索引、规格索引）
 * - 规格标准化（统一格式）
 * 
 * Requirements: 2.1.1, 2.1.2, 2.1.3, 2.1.4
 * Design: Section 1.2.1, 3.1.2
 */

import type { SPUData, BrandData } from '../types';
import { ConfigLoader, type TextMappingsConfig } from '../config-loader';

/**
 * 规格频率项
 */
export interface SpecFrequencyItem {
  value: string;
  count: number;
}

/**
 * 规格索引结构
 */
export interface SpecIndexes {
  // 颜色索引：颜色 -> SPU IDs
  colorIndex: Map<string, Set<number>>;
  
  // 容量索引：容量 -> SPU IDs
  capacityIndex: Map<string, Set<number>>;
  
  // 版本索引：版本 -> SPU IDs
  versionIndex: Map<string, Set<number>>;
  
  // 规格索引：规格 -> SPU IDs（从skuIDs.spec提取）
  specIndex: Map<string, Set<number>>;
  
  // 组合索引：组合 -> SPU IDs（从skuIDs.combo提取）
  comboIndex: Map<string, Set<number>>;
  
  // 频率排序列表（按使用频率降序排序，用于优先匹配常见规格）
  // Requirements: 2.1.3 - 规格索引表按使用频率排序，优先匹配常见规格
  frequencyLists: {
    colors: SpecFrequencyItem[];      // 颜色频率列表（降序）
    specs: SpecFrequencyItem[];       // 规格频率列表（降序）
    combos: SpecFrequencyItem[];      // 组合频率列表（降序）
  };
  
  // 统计信息
  stats: {
    totalColors: number;
    totalCapacities: number;
    totalVersions: number;
    totalSpecs: number;
    totalCombos: number;
  };
}

/**
 * 索引统计信息
 */
export interface IndexStatistics {
  // 品牌索引统计
  brandIndex: {
    totalBrands: number;
    totalSPUs: number;
    avgSPUsPerBrand: number;
    topBrands: Array<{ brand: string; count: number }>;
    buildTime: number; // 毫秒
  };
  
  // 型号索引统计
  modelIndex: {
    totalModels: number;
    totalSPUs: number;
    avgSPUsPerModel: number;
    topModels: Array<{ model: string; count: number }>;
    buildTime: number; // 毫秒
  };
  
  // 规格索引统计
  specIndex: {
    colors: {
      total: number;
      avgSPUsPerColor: number;
      topColors: Array<{ color: string; count: number }>;
    };
    specs: {
      total: number;
      avgSPUsPerSpec: number;
      topSpecs: Array<{ spec: string; count: number }>;
    };
    combos: {
      total: number;
      avgSPUsPerCombo: number;
      topCombos: Array<{ combo: string; count: number }>;
    };
    buildTime: number; // 毫秒
    totalSKUsProcessed: number;
  };
  
  // 总体统计
  overall: {
    totalIndexBuildTime: number; // 毫秒
    estimatedMemoryUsage: number; // 字节
  };
}

/**
 * 数据准备服务类
 */
export class DataPreparationService {
  // 品牌索引：品牌名（小写） -> SPU列表
  private brandIndex: Map<string, SPUData[]> = new Map();
  
  // 型号索引：型号（小写） -> SPU列表
  private modelIndex: Map<string, SPUData[]> = new Map();
  
  // 规格索引
  private specIndexes: SpecIndexes = {
    colorIndex: new Map(),
    capacityIndex: new Map(),
    versionIndex: new Map(),
    specIndex: new Map(),
    comboIndex: new Map(),
    frequencyLists: {
      colors: [],
      specs: [],
      combos: [],
    },
    stats: {
      totalColors: 0,
      totalCapacities: 0,
      totalVersions: 0,
      totalSpecs: 0,
      totalCombos: 0,
    },
  };
  
  // 品牌列表（用于品牌识别）
  private brandList: BrandData[] = [];
  
  // 规格标准化映射表（从配置文件加载）
  private specNormalizationMap: Map<string, string> = new Map();
  
  // 索引统计信息
  private statistics: IndexStatistics = {
    brandIndex: {
      totalBrands: 0,
      totalSPUs: 0,
      avgSPUsPerBrand: 0,
      topBrands: [],
      buildTime: 0,
    },
    modelIndex: {
      totalModels: 0,
      totalSPUs: 0,
      avgSPUsPerModel: 0,
      topModels: [],
      buildTime: 0,
    },
    specIndex: {
      colors: {
        total: 0,
        avgSPUsPerColor: 0,
        topColors: [],
      },
      specs: {
        total: 0,
        avgSPUsPerSpec: 0,
        topSpecs: [],
      },
      combos: {
        total: 0,
        avgSPUsPerCombo: 0,
        topCombos: [],
      },
      buildTime: 0,
      totalSKUsProcessed: 0,
    },
    overall: {
      totalIndexBuildTime: 0,
      estimatedMemoryUsage: 0,
    },
  };
  
  /**
   * 初始化服务
   * 
   * @param brandList 品牌列表
   */
  async initialize(brandList: BrandData[]): Promise<void> {
    this.brandList = brandList;
    
    // 加载规格标准化配置
    await this.loadSpecNormalizationConfig();
    
    console.log('✓ DataPreparationService initialized with', brandList.length, 'brands');
    console.log('✓ Loaded', this.specNormalizationMap.size, 'spec normalization rules');
  }
  
  /**
   * 加载规格标准化配置
   * 
   * 从text-mappings.json加载capacityNormalizations配置
   * 
   * Requirements: 2.1.4 - 系统能识别并合并相同含义的规格
   * Design: Section 3.1.2 - 规格标准化
   */
  private async loadSpecNormalizationConfig(): Promise<void> {
    try {
      const config = await ConfigLoader.load<TextMappingsConfig>('text-mappings');
      
      if (config && config.capacityNormalizations) {
        // 将配置转换为Map
        for (const [key, value] of Object.entries(config.capacityNormalizations)) {
          this.specNormalizationMap.set(key, value as string);
        }
        
        console.log('✓ Loaded spec normalization config:', this.specNormalizationMap.size, 'rules');
      } else {
        console.warn('⚠️  No capacityNormalizations found in text-mappings config');
      }
    } catch (error) {
      console.error('❌ Failed to load spec normalization config:', error);
      // 继续执行，使用空的标准化映射
    }
  }
  
  /**
   * 标准化规格字符串
   * 
   * 将不同格式的规格统一为标准格式
   * 例如："8GB+256GB", "8G+256G", "8+256GB" 都标准化为 "8+256"
   * 
   * Requirements: 2.1.4 - 系统能识别并合并相同含义的规格
   * Design: Section 3.1.2 - 规格标准化
   * 
   * @param spec 原始规格字符串
   * @returns 标准化后的规格字符串
   */
  normalizeSpec(spec: string): string {
    if (!spec) {
      return '';
    }
    
    const trimmedSpec = spec.trim();
    
    // 处理空白字符串
    if (!trimmedSpec) {
      return '';
    }
    
    // 1. 首先尝试直接映射（精确匹配）
    if (this.specNormalizationMap.has(trimmedSpec)) {
      return this.specNormalizationMap.get(trimmedSpec)!;
    }
    
    // 2. 尝试大小写不敏感的匹配
    const lowerSpec = trimmedSpec.toLowerCase();
    for (const [key, value] of this.specNormalizationMap.entries()) {
      if (key.toLowerCase() === lowerSpec) {
        return value;
      }
    }
    
    // 3. 如果没有找到映射，尝试自动标准化
    // 移除常见的单位后缀（GB, G, TB, T）
    let normalized = trimmedSpec
      .replace(/GB/gi, '')
      .replace(/G(?=\+|$)/gi, '') // 只替换后面跟+或结尾的G
      .replace(/TB/gi, 'T')
      .trim();
    
    // 如果标准化后的结果与原始不同，返回标准化结果
    if (normalized !== trimmedSpec) {
      return normalized;
    }
    
    // 4. 如果无法标准化，返回原始值
    return trimmedSpec;
  }
  
  /**
   * 构建品牌索引
   * 
   * 将SPU按品牌分组，加速查找
   * 支持中文品牌名和拼音双向索引
   * 
   * Requirements: 2.1.2 - 系统能构建完整的规格索引表
   * 
   * @param spuList SPU列表
   */
  buildBrandIndex(spuList: SPUData[]): void {
    console.log('=== 开始构建品牌索引 ===');
    const startTime = Date.now();
    
    // 清空现有索引
    this.brandIndex.clear();
    
    let indexedCount = 0;
    let noBrandCount = 0;
    const brandCounts = new Map<string, number>(); // 用于统计每个品牌的SPU数量
    
    for (const spu of spuList) {
      // 获取品牌名（优先使用spu.brand字段）
      const brand = spu.brand || this.extractBrandFromName(spu.name);
      
      if (!brand) {
        noBrandCount++;
        console.warn(`⚠️  SPU "${spu.name}" (ID: ${spu.id}) 品牌提取失败`);
        continue;
      }
      
      // 构建索引键列表（支持中文和拼音）
      const keys = this.getBrandIndexKeys(brand);
      
      // 为每个键添加品牌索引
      for (const key of keys) {
        if (!this.brandIndex.has(key)) {
          this.brandIndex.set(key, []);
        }
        this.brandIndex.get(key)!.push(spu);
      }
      
      // 统计品牌SPU数量（使用标准化的品牌名）
      const normalizedBrand = brand.toLowerCase();
      brandCounts.set(normalizedBrand, (brandCounts.get(normalizedBrand) || 0) + 1);
      
      indexedCount++;
    }
    
    const endTime = Date.now();
    const buildTime = endTime - startTime;
    
    // 计算统计信息
    const totalSPUs = indexedCount;
    const totalBrands = brandCounts.size;
    const avgSPUsPerBrand = totalBrands > 0 ? totalSPUs / totalBrands : 0;
    
    // 获取Top品牌（按SPU数量排序）
    const topBrands = Array.from(brandCounts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
    
    // 估算内存使用
    const memoryUsage = this.estimateMapMemory(this.brandIndex);
    
    // 更新统计信息
    this.statistics.brandIndex = {
      totalBrands,
      totalSPUs,
      avgSPUsPerBrand,
      topBrands,
      buildTime,
    };
    
    // 更新总体统计
    this.statistics.overall.totalIndexBuildTime += buildTime;
    this.statistics.overall.estimatedMemoryUsage += memoryUsage;
    
    console.log('=== 品牌索引构建完成 ===');
    console.log(`总SPU数量: ${spuList.length}`);
    console.log(`成功索引: ${indexedCount} 个SPU`);
    console.log(`品牌数量: ${totalBrands} 个（唯一品牌）`);
    console.log(`索引键数量: ${this.brandIndex.size} 个（包含中文和拼音）`);
    console.log(`无品牌: ${noBrandCount} 个SPU`);
    console.log(`平均每品牌SPU数: ${avgSPUsPerBrand.toFixed(2)}`);
    console.log(`构建耗时: ${buildTime}ms`);
    console.log(`估算内存: ${this.formatBytes(memoryUsage)}`);
    
    // 输出品牌索引的前10个品牌（用于调试）
    const brandKeys = Array.from(this.brandIndex.keys()).slice(0, 10);
    console.log(`品牌索引示例: ${brandKeys.join(', ')}${this.brandIndex.size > 10 ? '...' : ''}`);
    
    // 输出Top 5品牌
    if (topBrands.length > 0) {
      const top5 = topBrands.slice(0, 5).map(item => `${item.brand}(${item.count})`).join(', ');
      console.log(`Top 5 品牌: ${top5}`);
    }
  }
  
  /**
   * 构建型号索引
   * 
   * 将SPU按型号分组，加速查找
   * 型号从SPU名称中提取（去除品牌后的部分）
   * 
   * Requirements: 2.1.2 - 系统能构建完整的规格索引表
   * 
   * @param spuList SPU列表
   */
  buildModelIndex(spuList: SPUData[]): void {
    console.log('=== 开始构建型号索引 ===');
    const startTime = Date.now();
    
    // 清空现有索引
    this.modelIndex.clear();
    
    let indexedCount = 0;
    let noModelCount = 0;
    const modelCounts = new Map<string, number>(); // 用于统计每个型号的SPU数量
    
    for (const spu of spuList) {
      // 提取型号
      const model = this.extractModelFromSPU(spu);
      
      if (!model) {
        noModelCount++;
        console.warn(`⚠️  SPU "${spu.name}" (ID: ${spu.id}) 型号提取失败`);
        continue;
      }
      
      // 标准化型号（小写、去除多余空格）
      const normalizedModel = this.normalizeModel(model);
      
      // 添加到索引
      if (!this.modelIndex.has(normalizedModel)) {
        this.modelIndex.set(normalizedModel, []);
      }
      this.modelIndex.get(normalizedModel)!.push(spu);
      
      // 统计型号SPU数量
      modelCounts.set(normalizedModel, (modelCounts.get(normalizedModel) || 0) + 1);
      
      indexedCount++;
    }
    
    const endTime = Date.now();
    const buildTime = endTime - startTime;
    
    // 计算统计信息
    const totalSPUs = indexedCount;
    const totalModels = this.modelIndex.size;
    const avgSPUsPerModel = totalModels > 0 ? totalSPUs / totalModels : 0;
    
    // 获取Top型号（按SPU数量排序）
    const topModels = Array.from(modelCounts.entries())
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);
    
    // 估算内存使用
    const memoryUsage = this.estimateMapMemory(this.modelIndex);
    
    // 更新统计信息
    this.statistics.modelIndex = {
      totalModels,
      totalSPUs,
      avgSPUsPerModel,
      topModels,
      buildTime,
    };
    
    // 更新总体统计
    this.statistics.overall.totalIndexBuildTime += buildTime;
    this.statistics.overall.estimatedMemoryUsage += memoryUsage;
    
    console.log('=== 型号索引构建完成 ===');
    console.log(`总SPU数量: ${spuList.length}`);
    console.log(`成功索引: ${indexedCount} 个SPU`);
    console.log(`型号数量: ${totalModels} 个`);
    console.log(`无型号: ${noModelCount} 个SPU`);
    console.log(`平均每型号SPU数: ${avgSPUsPerModel.toFixed(2)}`);
    console.log(`构建耗时: ${buildTime}ms`);
    console.log(`估算内存: ${this.formatBytes(memoryUsage)}`);
    
    // 输出型号索引的前10个型号（用于调试）
    const modelKeys = Array.from(this.modelIndex.keys()).slice(0, 10);
    console.log(`型号索引示例: ${modelKeys.join(', ')}${this.modelIndex.size > 10 ? '...' : ''}`);
    
    // 输出Top 5型号
    if (topModels.length > 0) {
      const top5 = topModels.slice(0, 5).map(item => `${item.model}(${item.count})`).join(', ');
      console.log(`Top 5 型号: ${top5}`);
    }
  }
  
  /**
   * 获取品牌索引
   */
  getBrandIndex(): Map<string, SPUData[]> {
    return this.brandIndex;
  }
  
  /**
   * 获取型号索引
   */
  getModelIndex(): Map<string, SPUData[]> {
    return this.modelIndex;
  }
  
  /**
   * 获取规格索引
   */
  getSpecIndex(): SpecIndexes {
    return this.specIndexes;
  }
  
  /**
   * 获取索引统计信息
   * 
   * 返回所有索引的详细统计信息，包括：
   * - 索引大小
   * - 构建时间
   * - 内存使用估算
   * - 高频项统计
   * 
   * @returns 索引统计信息
   */
  getStatistics(): IndexStatistics {
    return this.statistics;
  }
  
  /**
   * 打印索引统计摘要
   * 
   * 输出格式化的统计信息到控制台，便于调试和监控
   */
  printStatisticsSummary(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           数据准备服务 - 索引统计摘要                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // 品牌索引统计
    console.log('📊 品牌索引:');
    console.log(`   • 品牌数量: ${this.statistics.brandIndex.totalBrands}`);
    console.log(`   • SPU总数: ${this.statistics.brandIndex.totalSPUs}`);
    console.log(`   • 平均每品牌SPU数: ${this.statistics.brandIndex.avgSPUsPerBrand.toFixed(2)}`);
    console.log(`   • 构建耗时: ${this.statistics.brandIndex.buildTime}ms`);
    if (this.statistics.brandIndex.topBrands.length > 0) {
      console.log('   • Top 5 品牌:');
      this.statistics.brandIndex.topBrands.slice(0, 5).forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.brand}: ${item.count} 个SPU`);
      });
    }
    
    // 型号索引统计
    console.log('\n📊 型号索引:');
    console.log(`   • 型号数量: ${this.statistics.modelIndex.totalModels}`);
    console.log(`   • SPU总数: ${this.statistics.modelIndex.totalSPUs}`);
    console.log(`   • 平均每型号SPU数: ${this.statistics.modelIndex.avgSPUsPerModel.toFixed(2)}`);
    console.log(`   • 构建耗时: ${this.statistics.modelIndex.buildTime}ms`);
    if (this.statistics.modelIndex.topModels.length > 0) {
      console.log('   • Top 5 型号:');
      this.statistics.modelIndex.topModels.slice(0, 5).forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.model}: ${item.count} 个SPU`);
      });
    }
    
    // 规格索引统计
    console.log('\n📊 规格索引:');
    console.log(`   • 颜色数量: ${this.statistics.specIndex.colors.total}`);
    console.log(`   • 规格数量: ${this.statistics.specIndex.specs.total}`);
    console.log(`   • 组合数量: ${this.statistics.specIndex.combos.total}`);
    console.log(`   • SKU总数: ${this.statistics.specIndex.totalSKUsProcessed}`);
    console.log(`   • 构建耗时: ${this.statistics.specIndex.buildTime}ms`);
    
    if (this.statistics.specIndex.colors.topColors.length > 0) {
      console.log('   • Top 5 颜色:');
      this.statistics.specIndex.colors.topColors.slice(0, 5).forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.color}: ${item.count} 个SKU`);
      });
    }
    
    if (this.statistics.specIndex.specs.topSpecs.length > 0) {
      console.log('   • Top 5 规格:');
      this.statistics.specIndex.specs.topSpecs.slice(0, 5).forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.spec}: ${item.count} 个SKU`);
      });
    }
    
    // 总体统计
    console.log('\n📊 总体统计:');
    console.log(`   • 总构建耗时: ${this.statistics.overall.totalIndexBuildTime}ms`);
    console.log(`   • 估算内存使用: ${this.formatBytes(this.statistics.overall.estimatedMemoryUsage)}`);
    
    console.log('\n' + '═'.repeat(60) + '\n');
  }
  
  /**
   * 格式化字节数为可读格式
   * 
   * @param bytes 字节数
   * @returns 格式化后的字符串（如 "1.5 MB"）
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 估算Map的内存使用
   * 
   * 粗略估算：
   * - 每个Map entry: ~100 bytes (key + value + overhead)
   * - 每个Set entry: ~50 bytes
   * - 每个SPU对象引用: ~8 bytes
   * 
   * @param map 要估算的Map
   * @returns 估算的字节数
   */
  private estimateMapMemory(map: Map<string, Set<number> | number[] | SPUData[]>): number {
    let totalBytes = 0;
    
    for (const [key, value] of map.entries()) {
      // Key的内存（字符串长度 * 2 bytes per char + overhead）
      const keyBytes = typeof key === 'string' ? key.length * 2 + 40 : 8;
      totalBytes += keyBytes;
      
      // Value的内存
      if (Array.isArray(value)) {
        // 数组：每个元素8字节引用 + 数组overhead
        totalBytes += value.length * 8 + 40;
      } else if (value instanceof Set) {
        // Set：每个元素估算50字节
        totalBytes += value.size * 50 + 40;
      } else {
        // 其他类型
        totalBytes += 8;
      }
      
      // Map entry overhead
      totalBytes += 20;
    }
    
    return totalBytes;
  }
  
  /**
   * 从SPU名称中提取品牌
   * 
   * @param spuName SPU名称
   * @returns 品牌名称或null
   */
  private extractBrandFromName(spuName: string): string | null {
    const lowerName = spuName.toLowerCase();
    
    // 使用品牌库数据
    if (this.brandList.length > 0) {
      // 按品牌名称长度降序排序，优先匹配更长的品牌名
      const sortedBrands = [...this.brandList].sort((a, b) => b.name.length - a.name.length);
      
      for (const brand of sortedBrands) {
        const brandName = brand.name.toLowerCase();
        const brandSpell = brand.spell?.toLowerCase();
        
        // 匹配中文品牌名
        if (lowerName.includes(brandName)) {
          return brand.name; // 返回原始品牌名（保持大小写）
        }
        
        // 匹配拼音
        if (brandSpell && lowerName.includes(brandSpell)) {
          return brand.name;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 从SPU中提取型号
   * 
   * 提取逻辑：
   * 1. 如果SPU有brand字段，从name中去除品牌部分
   * 2. 如果没有brand字段，尝试从name中识别并去除品牌
   * 3. 清理剩余的型号字符串（去除多余空格、特殊字符等）
   * 
   * @param spu SPU数据
   * @returns 型号字符串或null
   */
  private extractModelFromSPU(spu: SPUData): string | null {
    let name = spu.name.trim();
    
    if (!name) {
      return null;
    }
    
    // 获取品牌（优先使用spu.brand字段）
    const brand = spu.brand || this.extractBrandFromName(name);
    
    if (brand) {
      // 从名称中去除品牌部分
      const brandLower = brand.toLowerCase();
      const nameLower = name.toLowerCase();
      
      // 查找品牌在名称中的位置
      let brandIndex = nameLower.indexOf(brandLower);
      
      // 如果找不到中文品牌名，尝试拼音
      if (brandIndex === -1) {
        const brandInfo = this.brandList.find(b => b.name.toLowerCase() === brandLower);
        if (brandInfo && brandInfo.spell) {
          const spellLower = brandInfo.spell.toLowerCase();
          brandIndex = nameLower.indexOf(spellLower);
          
          if (brandIndex !== -1) {
            // 使用拼音长度去除品牌
            name = name.substring(0, brandIndex) + name.substring(brandIndex + brandInfo.spell.length);
          }
        }
      } else {
        // 使用品牌名长度去除品牌
        name = name.substring(0, brandIndex) + name.substring(brandIndex + brand.length);
      }
    }
    
    // 清理型号字符串
    name = name.trim();
    
    // 去除常见的前缀/后缀
    name = name.replace(/^[\s\-_]+/, ''); // 去除开头的空格、横线、下划线
    name = name.replace(/[\s\-_]+$/, ''); // 去除结尾的空格、横线、下划线
    
    return name || null;
  }
  
  /**
   * 标准化型号
   * 
   * 标准化规则：
   * 1. 转换为小写
   * 2. 去除多余空格（多个空格合并为一个）
   * 3. 去除特殊字符（保留字母、数字、空格、常见符号）
   * 
   * @param model 原始型号
   * @returns 标准化后的型号
   */
  private normalizeModel(model: string): string {
    return model
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // 多个空格合并为一个
      .replace(/[^\w\s\-+]/g, ''); // 只保留字母、数字、空格、横线、加号
  }
  
  /**
   * 构建规格索引（从skuIDs提取）
   * 
   * 从SPU的skuIDs字段中提取color、spec、combo信息，构建索引
   * 支持快速查找包含特定规格的SPU
   * 
   * Requirements: 2.1.1 - 系统能从SPU的skuIDs字段中提取所有SKU的color、spec、combo信息
   * Requirements: 2.1.2 - 系统能构建完整的规格索引表
   * Requirements: 2.1.3 - 规格索引表按使用频率排序
   * 
   * @param spuList SPU列表
   */
  buildSpecIndex(spuList: SPUData[]): void {
    console.log('=== 开始构建规格索引 ===');
    const startTime = Date.now();
    
    // 清空现有索引
    this.specIndexes.colorIndex.clear();
    this.specIndexes.capacityIndex.clear();
    this.specIndexes.versionIndex.clear();
    this.specIndexes.specIndex.clear();
    this.specIndexes.comboIndex.clear();
    
    // 统计计数器
    let processedSPUCount = 0;
    let skippedSPUCount = 0;
    let totalSKUCount = 0;
    
    // 频率统计（用于排序）
    const colorFrequency = new Map<string, number>();
    const specFrequency = new Map<string, number>();
    const comboFrequency = new Map<string, number>();
    
    for (const spu of spuList) {
      // 检查是否有skuIDs字段
      if (!spu.skuIDs || !Array.isArray(spu.skuIDs) || spu.skuIDs.length === 0) {
        skippedSPUCount++;
        continue;
      }
      
      processedSPUCount++;
      totalSKUCount += spu.skuIDs.length;
      
      // 用于去重的Set（同一个SPU的多个SKU可能有相同的规格）
      const colorsInSPU = new Set<string>();
      const specsInSPU = new Set<string>();
      const combosInSPU = new Set<string>();
      
      // 遍历所有SKU
      for (const skuInfo of spu.skuIDs) {
        // 提取颜色
        if (skuInfo.color && skuInfo.color.trim()) {
          const color = skuInfo.color.trim();
          colorsInSPU.add(color);
          
          // 更新频率统计
          colorFrequency.set(color, (colorFrequency.get(color) || 0) + 1);
        }
        
        // 提取规格（spec）并标准化
        if (skuInfo.spec && skuInfo.spec.trim()) {
          const originalSpec = skuInfo.spec.trim();
          const normalizedSpec = this.normalizeSpec(originalSpec);
          specsInSPU.add(normalizedSpec);
          
          // 更新频率统计（使用标准化后的规格）
          specFrequency.set(normalizedSpec, (specFrequency.get(normalizedSpec) || 0) + 1);
        }
        
        // 提取组合（combo）
        if (skuInfo.combo && skuInfo.combo.trim()) {
          const combo = skuInfo.combo.trim();
          combosInSPU.add(combo);
          
          // 更新频率统计
          comboFrequency.set(combo, (comboFrequency.get(combo) || 0) + 1);
        }
      }
      
      // 将SPU ID添加到对应的索引中
      for (const color of colorsInSPU) {
        if (!this.specIndexes.colorIndex.has(color)) {
          this.specIndexes.colorIndex.set(color, new Set());
        }
        this.specIndexes.colorIndex.get(color)!.add(spu.id);
      }
      
      for (const spec of specsInSPU) {
        if (!this.specIndexes.specIndex.has(spec)) {
          this.specIndexes.specIndex.set(spec, new Set());
        }
        this.specIndexes.specIndex.get(spec)!.add(spu.id);
      }
      
      for (const combo of combosInSPU) {
        if (!this.specIndexes.comboIndex.has(combo)) {
          this.specIndexes.comboIndex.set(combo, new Set());
        }
        this.specIndexes.comboIndex.get(combo)!.add(spu.id);
      }
    }
    
    // 更新统计信息
    this.specIndexes.stats = {
      totalColors: this.specIndexes.colorIndex.size,
      totalCapacities: this.specIndexes.capacityIndex.size,
      totalVersions: this.specIndexes.versionIndex.size,
      totalSpecs: this.specIndexes.specIndex.size,
      totalCombos: this.specIndexes.comboIndex.size,
    };
    
    const endTime = Date.now();
    const buildTime = endTime - startTime;
    
    // 计算详细统计信息
    const totalColors = this.specIndexes.colorIndex.size;
    const totalSpecs = this.specIndexes.specIndex.size;
    const totalCombos = this.specIndexes.comboIndex.size;
    
    // 计算平均值
    const avgSPUsPerColor = totalColors > 0 
      ? Array.from(this.specIndexes.colorIndex.values()).reduce((sum, set) => sum + set.size, 0) / totalColors 
      : 0;
    const avgSPUsPerSpec = totalSpecs > 0 
      ? Array.from(this.specIndexes.specIndex.values()).reduce((sum, set) => sum + set.size, 0) / totalSpecs 
      : 0;
    const avgSPUsPerCombo = totalCombos > 0 
      ? Array.from(this.specIndexes.comboIndex.values()).reduce((sum, set) => sum + set.size, 0) / totalCombos 
      : 0;
    
    // 获取Top项（按频率排序）
    const topColors = Array.from(colorFrequency.entries())
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count);
    
    const topSpecs = Array.from(specFrequency.entries())
      .map(([spec, count]) => ({ spec, count }))
      .sort((a, b) => b.count - a.count);
    
    const topCombos = Array.from(comboFrequency.entries())
      .map(([combo, count]) => ({ combo, count }))
      .sort((a, b) => b.count - a.count);
    
    // 构建频率排序列表（用于优先匹配常见规格）
    // Requirements: 2.1.3 - 规格索引表按使用频率排序，优先匹配常见规格
    this.specIndexes.frequencyLists = {
      colors: topColors.map(item => ({ value: item.color, count: item.count })),
      specs: topSpecs.map(item => ({ value: item.spec, count: item.count })),
      combos: topCombos.map(item => ({ value: item.combo, count: item.count })),
    };
    
    // 估算内存使用
    const colorMemory = this.estimateMapMemory(this.specIndexes.colorIndex);
    const specMemory = this.estimateMapMemory(this.specIndexes.specIndex);
    const comboMemory = this.estimateMapMemory(this.specIndexes.comboIndex);
    const totalMemory = colorMemory + specMemory + comboMemory;
    
    // 更新统计信息
    this.statistics.specIndex = {
      colors: {
        total: totalColors,
        avgSPUsPerColor,
        topColors,
      },
      specs: {
        total: totalSpecs,
        avgSPUsPerSpec,
        topSpecs,
      },
      combos: {
        total: totalCombos,
        avgSPUsPerCombo,
        topCombos,
      },
      buildTime,
      totalSKUsProcessed: totalSKUCount,
    };
    
    // 更新总体统计
    this.statistics.overall.totalIndexBuildTime += buildTime;
    this.statistics.overall.estimatedMemoryUsage += totalMemory;
    
    console.log('=== 规格索引构建完成 ===');
    console.log(`总SPU数量: ${spuList.length}`);
    console.log(`处理的SPU: ${processedSPUCount} 个`);
    console.log(`跳过的SPU: ${skippedSPUCount} 个（无skuIDs）`);
    console.log(`总SKU数量: ${totalSKUCount} 个`);
    console.log(`颜色数量: ${totalColors} 个（平均每颜色 ${avgSPUsPerColor.toFixed(2)} 个SPU）`);
    console.log(`规格数量: ${totalSpecs} 个（平均每规格 ${avgSPUsPerSpec.toFixed(2)} 个SPU）`);
    console.log(`组合数量: ${totalCombos} 个（平均每组合 ${avgSPUsPerCombo.toFixed(2)} 个SPU）`);
    console.log(`构建耗时: ${buildTime}ms`);
    console.log(`估算内存: ${this.formatBytes(totalMemory)}`);
    
    // 输出频率排序列表的统计信息
    console.log(`\n📊 频率统计（按使用频率降序排序）:`);
    console.log(`   • 颜色频率列表: ${this.specIndexes.frequencyLists.colors.length} 项`);
    console.log(`   • 规格频率列表: ${this.specIndexes.frequencyLists.specs.length} 项`);
    console.log(`   • 组合频率列表: ${this.specIndexes.frequencyLists.combos.length} 项`);
    
    // 输出频率最高的前5个颜色（用于调试）
    if (topColors.length > 0) {
      const top5Colors = topColors.slice(0, 5)
        .map(item => `${item.color}(${item.count})`)
        .join(', ');
      console.log(`高频颜色 (Top 5): ${top5Colors}`);
    }
    
    // 输出频率最高的前5个规格（用于调试）
    if (topSpecs.length > 0) {
      const top5Specs = topSpecs.slice(0, 5)
        .map(item => `${item.spec}(${item.count})`)
        .join(', ');
      console.log(`高频规格 (Top 5): ${top5Specs}`);
    }
    
    // 输出频率最高的前5个组合（用于调试）
    if (topCombos.length > 0) {
      const top5Combos = topCombos.slice(0, 5)
        .map(item => `${item.combo}(${item.count})`)
        .join(', ');
      console.log(`高频组合 (Top 5): ${top5Combos}`);
    }
  }
  
  /**
   * 获取频率排序的规格列表
   * 
   * 返回按使用频率降序排序的规格列表，用于优先匹配常见规格
   * 
   * Requirements: 2.1.3 - 规格索引表按使用频率排序，优先匹配常见规格
   * 
   * @returns 频率排序的规格列表
   */
  getFrequencyLists(): {
    colors: SpecFrequencyItem[];
    specs: SpecFrequencyItem[];
    combos: SpecFrequencyItem[];
  } {
    return this.specIndexes.frequencyLists;
  }
  
  /**
   * 根据频率获取最可能的规格
   * 
   * 给定一个规格类型（color/spec/combo），返回频率最高的N个规格
   * 用于在匹配时优先尝试常见规格
   * 
   * Requirements: 2.1.3 - 规格索引表按使用频率排序，优先匹配常见规格
   * 
   * @param type 规格类型（'color' | 'spec' | 'combo'）
   * @param limit 返回的最大数量（默认10）
   * @returns 频率最高的规格列表
   */
  getTopFrequentSpecs(type: 'color' | 'spec' | 'combo', limit = 10): SpecFrequencyItem[] {
    const list = type === 'color' 
      ? this.specIndexes.frequencyLists.colors
      : type === 'spec'
      ? this.specIndexes.frequencyLists.specs
      : this.specIndexes.frequencyLists.combos;
    
    return list.slice(0, limit);
  }
  
  /**
   * 获取品牌的所有索引键（中文和拼音）
   * 
   * 支持双向索引：
   * - 中文品牌名 -> SPU列表
   * - 拼音品牌名 -> SPU列表
   * 
   * @param brand 品牌名称
   * @returns 索引键列表
   */
  private getBrandIndexKeys(brand: string): string[] {
    const keys = [brand.toLowerCase()];
    
    // 正向查找：如果品牌是中文，添加其拼音
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
    
    return keys;
  }
}
