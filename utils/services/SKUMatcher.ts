/**
 * SKUMatcher - SKU 匹配器
 * 
 * 在匹配的 SPU 中查找最佳 SKU
 * 支持多维度规格匹配，根据产品类型调整权重
 */

import type { SPUData, SKUData, ProductType } from '../types';
import type { SKUMatchResult, ExtractedInfo } from './types';
import type { MatchLogger } from '../monitoring/MatchLogger';
import type { PerformanceMetrics } from '../monitoring/PerformanceMetrics';

/**
 * 规格权重配置
 */
interface SpecWeights {
  color?: number;
  capacity?: number;
  version?: number;
  size?: number;
  band?: number;
  spec?: number;
  [key: string]: number | undefined;
}

/**
 * 产品类型配置
 */
interface ProductTypeConfig {
  id: string;
  name: string;
  keywords: string[];
  specWeights: SpecWeights;
}

/**
 * SKU 规格信息
 */
interface SKUSpecs {
  color: string | null;
  capacity: string | null;
  version: string | null;
  spec: string | null;
  combo: string | null;
  // 手表特定规格
  size?: string | null;
  band?: string | null;
}

export class SKUMatcher {
  private logger?: MatchLogger;
  private metrics?: PerformanceMetrics;
  
  // 产品类型配置
  private productTypeConfigs: Map<string, ProductTypeConfig> = new Map();
  
  // 默认权重（当没有配置时使用）
  private defaultWeights: SpecWeights = {
    color: 0.3,
    capacity: 0.4,
    version: 0.3,
  };
  
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
   * 加载产品类型配置
   */
  loadProductTypeConfigs(configs: ProductTypeConfig[]) {
    this.productTypeConfigs.clear();
    
    for (const config of configs) {
      this.productTypeConfigs.set(config.id, config);
    }
    
    console.log(`✓ 加载产品类型配置: ${this.productTypeConfigs.size} 个类型`);
  }
  
  /**
   * 查找最佳匹配的 SKU
   * 
   * @param spu 匹配的 SPU
   * @param extractedInfo 提取的信息
   * @param productType 产品类型
   * @param skuList 可选的 SKU 列表（如果已加载）
   * @returns SKU 匹配结果
   */
  async findBestMatch(
    spu: SPUData,
    extractedInfo: ExtractedInfo,
    productType: ProductType,
    skuList?: SKUData[]
  ): Promise<SKUMatchResult> {
    // 开始性能监控
    if (this.metrics) {
      this.metrics.startTimer('sku-match');
    }
    
    const startTime = Date.now();
    
    console.log(`[SKU匹配] 开始匹配 SPU: "${spu.name}" (ID: ${spu.id})`);
    console.log(`[SKU匹配] 产品类型: ${productType}`);
    
    // 日志：开始 SKU 匹配
    if (this.logger) {
      console.log(`[SKU匹配] ========== 开始SKU匹配 ==========`);
      console.log(`[SKU匹配] SPU: "${spu.name}" (ID: ${spu.id})`);
      console.log(`[SKU匹配] 产品类型: ${productType}`);
      console.log(`[SKU匹配] 提取信息: 颜色="${extractedInfo.color.value}", 容量="${extractedInfo.capacity.value}", 版本="${extractedInfo.version.value?.name || 'N/A'}"`);
    }
    
    // 获取规格权重
    const weights = this.getSpecWeights(productType);
    console.log(`[SKU匹配] 规格权重:`, weights);
    
    // 如果没有提供 SKU 列表，需要从 API 加载
    // 这里假设 skuList 已经提供，实际使用时需要调用 API
    if (!skuList || skuList.length === 0) {
      console.warn(`[SKU匹配] ⚠️  没有 SKU 列表，无法匹配`);
      
      // 结束性能监控
      if (this.metrics) {
        this.metrics.endTimer('sku-match', {
          matched: false,
          reason: 'no-skus',
          spuId: spu.id
        });
      }
      
      return {
        sku: null,
        score: 0,
        specMatches: {}
      };
    }
    
    console.log(`[SKU匹配] SKU 候选数量: ${skuList.length}`);
    
    // 对每个 SKU 计算匹配分数
    let bestSKU: SKUData | null = null;
    let bestScore = -1; // 使用 -1 作为初始值，这样即使所有 SKU 分数都是 0，也会选择第一个
    let bestSpecMatches = {};
    
    for (const sku of skuList) {
      // 提取 SKU 规格
      const skuSpecs = this.extractSKUSpecs(sku, spu);
      
      // 计算各维度匹配分数
      const specScores = this.calculateSpecScores(extractedInfo, skuSpecs, productType);
      
      // 计算加权总分
      const totalScore = this.calculateWeightedScore(specScores, weights);
      
      console.log(`[SKU匹配]   SKU "${sku.name}": 总分=${totalScore.toFixed(3)}, 颜色=${specScores.color?.toFixed(3) || 'N/A'}, 容量=${specScores.capacity?.toFixed(3) || 'N/A'}, 版本=${specScores.version?.toFixed(3) || 'N/A'}`);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestSKU = sku;
        bestSpecMatches = this.buildSpecMatches(specScores);
      }
    }
    
    const duration = Date.now() - startTime;
    
    // 结束性能监控
    if (this.metrics) {
      this.metrics.endTimer('sku-match', {
        matched: bestSKU !== null,
        score: bestScore >= 0 ? bestScore : 0,
        skuCount: skuList.length,
        spuId: spu.id
      });
    }
    
    if (bestSKU) {
      console.log(`[SKU匹配] ✓ 最佳匹配: "${bestSKU.name}", 分数: ${bestScore.toFixed(3)}`);
      
      // 日志：匹配成功
      if (this.logger) {
        console.log(`[SKU匹配] ========== 匹配成功 ==========`);
        console.log(`[SKU匹配] 匹配SKU: "${bestSKU.name}" (ID: ${bestSKU.id})`);
        console.log(`[SKU匹配] 匹配分数: ${bestScore.toFixed(3)}`);
        console.log(`[SKU匹配] 规格匹配详情:`, bestSpecMatches);
        console.log(`[SKU匹配] 耗时: ${duration}ms`);
      }
    } else {
      console.log(`[SKU匹配] ❌ 未找到匹配的 SKU`);
      
      // 日志：匹配失败
      if (this.logger) {
        console.log(`[SKU匹配] ========== 匹配失败 ==========`);
        console.log(`[SKU匹配] 原因: 未找到符合条件的SKU`);
        console.log(`[SKU匹配] 耗时: ${duration}ms`);
      }
    }
    
    return {
      sku: bestSKU,
      score: bestScore >= 0 ? bestScore : 0,
      specMatches: bestSpecMatches
    };
  }
  
  /**
   * 获取产品类型的规格权重
   */
  private getSpecWeights(productType: ProductType): SpecWeights {
    const config = this.productTypeConfigs.get(productType);
    
    if (config && config.specWeights) {
      return config.specWeights;
    }
    
    // 返回默认权重
    console.warn(`[SKU匹配] ⚠️  产品类型 "${productType}" 没有配置权重，使用默认权重`);
    return this.defaultWeights;
  }
  
  /**
   * 从 SKU 中提取规格信息
   * 
   * 优先从 SPU 的 skuIDs 结构化数据中提取，
   * 如果没有则从 SKU 名称中提取
   */
  private extractSKUSpecs(sku: SKUData, spu: SPUData): SKUSpecs {
    const specs: SKUSpecs = {
      color: null,
      capacity: null,
      version: null,
      spec: null,
      combo: null,
    };
    
    // 1. 从 SPU 的 skuIDs 中查找结构化数据
    if (spu.skuIDs && spu.skuIDs.length > 0) {
      const skuInfo = spu.skuIDs.find(info => info.skuID === sku.id);
      
      if (skuInfo) {
        specs.color = skuInfo.color || null;
        specs.spec = skuInfo.spec || null;
        specs.combo = skuInfo.combo || null;
        
        // 从 spec 字段提取容量（如 "12GB+512GB"）
        if (skuInfo.spec) {
          specs.capacity = this.extractCapacityFromSpec(skuInfo.spec);
        }
      }
    }
    
    // 2. 从 SKU 对象的字段中提取
    if (!specs.color && sku.color) {
      specs.color = sku.color;
    }
    
    if (!specs.capacity && sku.memory) {
      specs.capacity = sku.memory;
    }
    
    if (!specs.version && sku.version) {
      specs.version = sku.version;
    }
    
    // 3. 从 SKU 名称中提取（作为后备）
    if (!specs.color) {
      specs.color = this.extractColorFromName(sku.name);
    }
    
    if (!specs.capacity) {
      specs.capacity = this.extractCapacityFromName(sku.name);
    }
    
    // 4. 提取手表特定规格
    if (sku.name.includes('Watch') || sku.name.includes('手表')) {
      specs.size = this.extractWatchSize(sku.name);
      specs.band = this.extractWatchBand(sku.name);
    }
    
    return specs;
  }
  
  /**
   * 从 spec 字段提取容量
   * 例如: "12GB+512GB" -> "12+512"
   */
  private extractCapacityFromSpec(spec: string): string | null {
    // 匹配 "数字+数字" 或 "数字GB+数字GB" 格式
    const match = spec.match(/(\d+)(?:GB?)?\s*\+\s*(\d+)(?:GB?)?/i);
    if (match) {
      return `${match[1]}+${match[2]}`;
    }
    
    // 匹配单个容量 "512GB" 或 "512"
    const singleMatch = spec.match(/(\d+)(?:GB?)?/i);
    if (singleMatch) {
      return singleMatch[1];
    }
    
    return null;
  }
  
  /**
   * 从名称中提取颜色
   */
  private extractColorFromName(name: string): string | null {
    // 常见颜色关键词
    const colorKeywords = [
      '黑', '白', '蓝', '红', '绿', '金', '银', '灰', '粉', '紫', '橙', '黄',
      '青', '棕', '米', '香槟', '玫瑰', '曜石', '雅川', '雪域', '羽砂', '素皮',
      'Black', 'White', 'Blue', 'Red', 'Green', 'Gold', 'Silver', 'Gray', 'Pink', 'Purple'
    ];
    
    for (const keyword of colorKeywords) {
      const regex = new RegExp(`([^\\s]*${keyword}[^\\s]*)`, 'i');
      const match = name.match(regex);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }
  
  /**
   * 从名称中提取容量
   */
  private extractCapacityFromName(name: string): string | null {
    // 匹配 "12GB+512GB" 或 "12+512" 格式
    const match = name.match(/(\d+)(?:GB?)?\s*\+\s*(\d+)(?:GB?)?/i);
    if (match) {
      return `${match[1]}+${match[2]}`;
    }
    
    // 匹配单个容量 "512GB"
    const singleMatch = name.match(/(\d+)GB/i);
    if (singleMatch) {
      return singleMatch[1];
    }
    
    return null;
  }
  
  /**
   * 提取手表尺寸
   */
  private extractWatchSize(name: string): string | null {
    // 匹配 "46mm" 或 "46毫米" 格式
    const match = name.match(/(\d+)\s*(?:mm|毫米)/i);
    if (match) {
      return `${match[1]}mm`;
    }
    
    return null;
  }
  
  /**
   * 提取手表表带
   */
  private extractWatchBand(name: string): string | null {
    // 常见表带关键词
    const bandKeywords = [
      '氟橡胶', '皮革', '尼龙', '金属', '编织', '运动', '商务',
      'Fluoroelastomer', 'Leather', 'Nylon', 'Metal', 'Sport', 'Business'
    ];
    
    for (const keyword of bandKeywords) {
      if (name.includes(keyword)) {
        return keyword;
      }
    }
    
    return null;
  }
  
  /**
   * 计算各维度的匹配分数
   */
  private calculateSpecScores(
    extractedInfo: ExtractedInfo,
    skuSpecs: SKUSpecs,
    productType: ProductType
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // 颜色匹配
    if (extractedInfo.color.value || skuSpecs.color) {
      scores.color = this.matchColor(extractedInfo.color.value, skuSpecs.color);
    }
    
    // 容量匹配
    if (extractedInfo.capacity.value || skuSpecs.capacity) {
      scores.capacity = this.matchCapacity(extractedInfo.capacity.value, skuSpecs.capacity);
    }
    
    // 版本匹配
    if (extractedInfo.version.value || skuSpecs.version || skuSpecs.combo) {
      scores.version = this.matchVersion(
        extractedInfo.version.value?.name || null,
        skuSpecs.version,
        skuSpecs.combo
      );
    }
    
    // 手表特定规格匹配
    if (productType === 'watch') {
      // 尺寸匹配（从输入中提取）
      const inputSize = this.extractWatchSize(extractedInfo.originalInput);
      if (inputSize || skuSpecs.size) {
        scores.size = this.matchExact(inputSize, skuSpecs.size ?? null);
      }
      
      // 表带匹配
      const inputBand = this.extractWatchBand(extractedInfo.originalInput);
      if (inputBand || skuSpecs.band) {
        scores.band = this.matchExact(inputBand, skuSpecs.band ?? null);
      }
    }
    
    // 通用规格匹配（从 spec 字段）
    if (skuSpecs.spec) {
      scores.spec = this.matchSpec(extractedInfo.originalInput, skuSpecs.spec);
    }
    
    return scores;
  }
  
  /**
   * 颜色匹配
   * 
   * 匹配优先级：
   * 1. 完全匹配（1.0）
   * 2. 包含匹配（0.8）
   * 3. 基础颜色匹配（0.5）
   */
  private matchColor(inputColor: string | null, skuColor: string | null): number {
    if (!inputColor || !skuColor) {
      return 0;
    }
    
    const input = inputColor.toLowerCase();
    const sku = skuColor.toLowerCase();
    
    // 完全匹配
    if (input === sku) {
      return 1.0;
    }
    
    // 包含匹配
    if (input.includes(sku) || sku.includes(input)) {
      return 0.8;
    }
    
    // 基础颜色匹配（提取基础颜色词）
    const baseColors = ['黑', '白', '蓝', '红', '绿', '金', '银', '灰', '粉', '紫'];
    for (const color of baseColors) {
      if (input.includes(color) && sku.includes(color)) {
        return 0.5;
      }
    }
    
    return 0;
  }
  
  /**
   * 容量匹配
   * 
   * 匹配优先级：
   * 1. 完全匹配（1.0）
   * 2. 标准化后匹配（0.95）
   * 3. 存储容量匹配（0.7）
   */
  private matchCapacity(inputCapacity: string | null, skuCapacity: string | null): number {
    if (!inputCapacity || !skuCapacity) {
      return 0;
    }
    
    const input = this.normalizeCapacity(inputCapacity);
    const sku = this.normalizeCapacity(skuCapacity);
    
    // 完全匹配
    if (input === sku) {
      return 1.0;
    }
    
    // 只匹配存储容量部分（忽略内存）
    const inputStorage = input.split('+').pop();
    const skuStorage = sku.split('+').pop();
    
    if (inputStorage === skuStorage) {
      return 0.7;
    }
    
    return 0;
  }
  
  /**
   * 标准化容量格式
   * 例如: "12GB+512GB" -> "12+512"
   */
  private normalizeCapacity(capacity: string): string {
    return capacity
      .replace(/GB/gi, '')
      .replace(/G/gi, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }
  
  /**
   * 版本匹配
   */
  private matchVersion(
    inputVersion: string | null,
    skuVersion: string | null,
    skuCombo: string | null
  ): number {
    if (!inputVersion) {
      // 如果输入没有版本信息，优先匹配标准版
      if (skuVersion?.includes('标准') || skuCombo?.includes('标准')) {
        return 0.8;
      }
      return 0.5; // 没有版本信息时给一个中等分数
    }
    
    const input = inputVersion.toLowerCase();
    
    // 检查 SKU 版本字段
    if (skuVersion) {
      const sku = skuVersion.toLowerCase();
      if (input === sku || input.includes(sku) || sku.includes(input)) {
        return 1.0;
      }
    }
    
    // 检查 SKU combo 字段
    if (skuCombo) {
      const combo = skuCombo.toLowerCase();
      if (input === combo || input.includes(combo) || combo.includes(input)) {
        return 1.0;
      }
    }
    
    return 0;
  }
  
  /**
   * 精确匹配
   */
  private matchExact(input: string | null, skuValue: string | null): number {
    if (!input || !skuValue) {
      return 0;
    }
    
    return input.toLowerCase() === skuValue.toLowerCase() ? 1.0 : 0;
  }
  
  /**
   * 规格匹配（通用）
   */
  private matchSpec(input: string, skuSpec: string): number {
    const inputLower = input.toLowerCase();
    const specLower = skuSpec.toLowerCase();
    
    // 检查输入是否包含规格信息
    if (inputLower.includes(specLower)) {
      return 1.0;
    }
    
    // 部分匹配
    const specTokens = specLower.split(/[\s\+\/]/);
    let matchCount = 0;
    
    for (const token of specTokens) {
      if (token && inputLower.includes(token)) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      return matchCount / specTokens.length;
    }
    
    return 0;
  }
  
  /**
   * 计算加权总分
   */
  private calculateWeightedScore(
    specScores: Record<string, number>,
    weights: SpecWeights
  ): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [spec, score] of Object.entries(specScores)) {
      const weight = weights[spec] || 0;
      if (weight > 0) {
        totalScore += score * weight;
        totalWeight += weight;
      }
    }
    
    // 如果没有任何权重配置，返回 0
    if (totalWeight === 0) {
      return 0;
    }
    
    // 归一化分数
    return totalScore / totalWeight;
  }
  
  /**
   * 构建规格匹配详情
   */
  private buildSpecMatches(specScores: Record<string, number>): SKUMatchResult['specMatches'] {
    const matches: SKUMatchResult['specMatches'] = {};
    
    for (const [spec, score] of Object.entries(specScores)) {
      matches[spec] = {
        matched: score > 0,
        score: score
      };
    }
    
    return matches;
  }
}
