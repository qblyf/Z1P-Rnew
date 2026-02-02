/**
 * 匹配协调器
 * 
 * 职责：
 * - 协调整个匹配流程
 * - 管理各个服务的调用顺序
 * - 聚合匹配结果
 * - 实现错误处理和日志记录
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * Design: Section 1.2.6
 */

import type { SPUData, BrandData } from '../types';
import { DataPreparationService } from './DataPreparationService';
import { PreprocessingService } from './PreprocessingService';
import { InfoExtractor } from './InfoExtractor';
import { SPUMatcher } from './SPUMatcher';
import { SKUMatcher } from './SKUMatcher';

/**
 * 匹配结果
 */
export interface MatchResult {
  // 输入信息
  inputName: string;
  
  // SPU匹配结果
  spuMatch: {
    spu: SPUData | null;
    score: number;
    explanation: {
      matchType: 'exact' | 'fuzzy';
      brandMatch: { matched: boolean; score: number };
      modelMatch: { matched: boolean; score: number };
      versionMatch: { matched: boolean; score: number };
      details: string;
    };
  };
  
  // SKU匹配结果
  skuMatch: {
    sku: any | null;
    score: number;
    specMatches: Record<string, { matched: boolean; score: number }>;
  };
  
  // 最终状态
  status: 'matched' | 'unmatched' | 'spu-matched';
  
  // 综合相似度
  similarity: number;
  
  // 提取的信息（用于显示）
  extractedInfo: {
    brand: string | null;
    version: string | null;
    memory: string | null;
    color: string | null;
  };
  
  // 匹配的信息（用于显示）
  matchedInfo: {
    spu: string | null;
    sku: string | null;
    gtins: string[];
  };
}

/**
 * 批量匹配结果
 */
export interface BatchMatchResult {
  results: MatchResult[];
  summary: {
    total: number;
    matched: number;
    spuMatched: number;
    unmatched: number;
    matchRate: number;
    duration: number; // 毫秒
  };
}

/**
 * 匹配协调器类
 */
export class MatchingOrchestrator {
  private dataPrep: DataPreparationService;
  private preprocessing: PreprocessingService;
  private infoExtractor: InfoExtractor;
  private spuMatcher: SPUMatcher;
  private skuMatcher: SKUMatcher;
  
  private isInitialized = false;
  private spuList: SPUData[] = [];
  
  constructor() {
    this.dataPrep = new DataPreparationService();
    this.preprocessing = new PreprocessingService();
    this.infoExtractor = new InfoExtractor();
    this.spuMatcher = new SPUMatcher();
    this.skuMatcher = new SKUMatcher();
  }
  
  /**
   * 初始化协调器
   * 
   * 加载所有必要的数据和配置
   * 
   * @param brandList 品牌列表
   * @param spuList SPU列表
   */
  async initialize(brandList: BrandData[], spuList: SPUData[]): Promise<void> {
    console.log('🚀 初始化 MatchingOrchestrator...');
    
    try {
      // Store SPU list for later use
      this.spuList = spuList;
      
      // 初始化各个服务
      await this.dataPrep.initialize(brandList);
      await this.preprocessing.initialize();
      this.infoExtractor.setBrandList(brandList);
      
      // 构建索引
      this.dataPrep.buildBrandIndex(spuList);
      this.dataPrep.buildModelIndex(spuList);
      this.dataPrep.buildSpecIndex(spuList);
      
      // 初始化 SPU 匹配器
      // 定义提取函数
      const extractBrand = (name: string): string | null => {
        const lowerName = name.toLowerCase();
        for (const brand of brandList) {
          if (lowerName.includes(brand.name.toLowerCase()) || 
              (brand.spell && lowerName.includes(brand.spell.toLowerCase()))) {
            return brand.name;
          }
        }
        return null;
      };
      
      const extractModel = (name: string, brand?: string | null): string | null => {
        let normalized = name.toLowerCase();
        if (brand) {
          normalized = normalized.replace(brand.toLowerCase(), '').trim();
        }
        return normalized || null;
      };
      
      const extractSPUPart = (name: string): string => {
        return name.replace(/\d+\+\d+/g, '').replace(/[\u4e00-\u9fa5]{2,4}$/g, '').trim();
      };
      
      this.spuMatcher.buildIndexes(
        spuList,
        extractBrand,
        extractModel,
        extractSPUPart
      );
      
      this.isInitialized = true;
      
      console.log('✅ MatchingOrchestrator 初始化完成');
      
      // 打印统计信息
      this.dataPrep.printStatisticsSummary();
    } catch (error) {
      console.error('❌ MatchingOrchestrator 初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行完整匹配流程
   * 
   * 步骤：
   * 1. 预处理输入
   * 2. 提取信息
   * 3. SPU匹配
   * 4. SKU匹配
   * 5. 聚合结果
   * 
   * @param input 输入字符串
   * @returns 匹配结果
   */
  async match(input: string): Promise<MatchResult> {
    if (!this.isInitialized) {
      throw new Error('MatchingOrchestrator 未初始化，请先调用 initialize()');
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`\n[匹配流程] 开始匹配: "${input}"`);
      
      // 1. 预处理输入
      const preprocessedInput = this.preprocessing.preprocess(input);
      console.log(`[预处理] "${input}" -> "${preprocessedInput}"`);
      
      // 2. 提取信息
      const extractedInfo = this.infoExtractor.extractAll(preprocessedInput);
      console.log(`[信息提取] 品牌: ${extractedInfo.brand.value}, 型号: ${extractedInfo.model.value}`);
      
      // 3. SPU匹配
      const spuMatchResult = this.spuMatcher.findBestMatch(
        extractedInfo, 
        this.spuList,
        undefined, // 使用默认阈值
        {
          extractBrand: (name: string) => this.infoExtractor.extractBrand(name).value,
          extractModel: (name: string, brand?: string | null) => this.infoExtractor.extractModel(name, brand || undefined).value,
          extractVersion: (name: string) => this.infoExtractor.extractVersion(name).value,
          extractSPUPart: (name: string) => {
            // 移除容量和颜色信息，保留SPU核心部分
            return name.replace(/\d+\+\d+/g, '').replace(/[\u4e00-\u9fa5]{2,4}$/g, '').trim();
          },
          isBrandMatch: (brand1: string | null, brand2: string | null) => {
            if (!brand1 || !brand2) return false;
            return brand1.toLowerCase() === brand2.toLowerCase();
          },
          shouldFilterSPU: (inputName: string, spuName: string) => {
            // 过滤礼盒版等
            const giftBoxKeywords = ['礼盒', '套装'];
            if (giftBoxKeywords.some(keyword => spuName.includes(keyword))) {
              return true;
            }
            
            // 过滤配件类商品（保护壳、钢化膜、充电器等）
            const accessoryKeywords = [
              '保护壳', '手机壳', '保护套', '手机套', '壳',
              '钢化膜', '膜', '贴膜', '屏幕保护',
              '充电器', '充电线', '数据线', '充电头',
              '耳机', '耳塞', '音频线',
              '支架', '车载', '车充',
              '电池', '移动电源', '充电宝',
              '表带', '腕带',
              '机模', '模型'
            ];
            
            // 检查是否包含配件关键词
            const lowerSpuName = spuName.toLowerCase();
            return accessoryKeywords.some(keyword => lowerSpuName.includes(keyword));
          },
          getSPUPriority: (inputName: string, spuName: string) => {
            // 标准版优先级最高
            const giftBoxKeywords = ['礼盒', '套装'];
            if (giftBoxKeywords.some(keyword => spuName.includes(keyword))) {
              return 1; // 礼盒版优先级低
            }
            return 3; // 标准版优先级高
          },
          tokenize: (str: string) => {
            // 简单的分词：按空格和标点分割
            return str.toLowerCase().split(/[\s\-_,，、。；;]+/).filter(t => t.length > 0);
          }
        }
      );
      if (!spuMatchResult) {
        console.log(`[SPU匹配] 未找到匹配`);
      } else {
        console.log(`[SPU匹配] 结果: ${spuMatchResult.spu.name}, 分数: ${spuMatchResult.score.toFixed(2)}`);
      }
      
      // 4. SKU匹配
      let skuMatchResult: any = {
        sku: null,
        score: 0,
        specMatches: {},
      };
      
      if (spuMatchResult?.spu) {
        skuMatchResult = await this.skuMatcher.findBestMatch(
          spuMatchResult.spu,
          extractedInfo,
          extractedInfo.productType
        );
        console.log(`[SKU匹配] 结果: ${skuMatchResult.sku?.id || '未匹配'}, 分数: ${skuMatchResult.score.toFixed(2)}`);
      }
      
      // 5. 聚合结果
      const result = this.aggregateResult(
        input,
        extractedInfo,
        spuMatchResult,
        skuMatchResult
      );
      
      const duration = Date.now() - startTime;
      console.log(`[匹配完成] 状态: ${result.status}, 耗时: ${duration}ms\n`);
      
      return result;
    } catch (error) {
      console.error(`[匹配错误] ${error}`);
      throw error;
    }
  }
  
  /**
   * 批量匹配
   * 
   * @param inputs 输入字符串数组
   * @returns 批量匹配结果
   */
  async batchMatch(inputs: string[]): Promise<BatchMatchResult> {
    if (!this.isInitialized) {
      throw new Error('MatchingOrchestrator 未初始化，请先调用 initialize()');
    }
    
    const startTime = Date.now();
    
    console.log(`\n[批量匹配] 开始处理 ${inputs.length} 条记录...`);
    
    const results: MatchResult[] = [];
    let matched = 0;
    let spuMatched = 0;
    let unmatched = 0;
    
    for (let i = 0; i < inputs.length; i++) {
      try {
        const result = await this.match(inputs[i]);
        results.push(result);
        
        if (result.status === 'matched') {
          matched++;
        } else if (result.status === 'spu-matched') {
          spuMatched++;
        } else {
          unmatched++;
        }
        
        // 每处理10条记录输出一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`[进度] 已处理 ${i + 1}/${inputs.length} 条记录`);
        }
      } catch (error) {
        console.error(`[错误] 处理第 ${i + 1} 条记录失败: ${error}`);
        // 继续处理下一条
      }
    }
    
    const duration = Date.now() - startTime;
    const matchRate = inputs.length > 0 ? (matched / inputs.length) * 100 : 0;
    
    console.log(`\n[批量匹配完成]`);
    console.log(`  总数: ${inputs.length}`);
    console.log(`  完全匹配: ${matched}`);
    console.log(`  SPU匹配: ${spuMatched}`);
    console.log(`  未匹配: ${unmatched}`);
    console.log(`  匹配率: ${matchRate.toFixed(2)}%`);
    console.log(`  耗时: ${duration}ms`);
    
    return {
      results,
      summary: {
        total: inputs.length,
        matched,
        spuMatched,
        unmatched,
        matchRate,
        duration,
      },
    };
  }
  
  /**
   * 聚合匹配结果
   * 
   * @param input 原始输入
   * @param extractedInfo 提取的信息
   * @param spuMatchResult SPU匹配结果
   * @param skuMatchResult SKU匹配结果
   * @returns 聚合后的匹配结果
   */
  private aggregateResult(
    input: string,
    extractedInfo: any,
    spuMatchResult: any,
    skuMatchResult: any
  ): MatchResult {
    // 确定最终状态
    let status: 'matched' | 'unmatched' | 'spu-matched' = 'unmatched';
    let similarity = 0;
    
    if (skuMatchResult.sku) {
      status = 'matched';
      similarity = skuMatchResult.score;
    } else if (spuMatchResult && spuMatchResult.spu) {
      status = 'spu-matched';
      similarity = spuMatchResult.score;
    }
    
    // 提取显示信息
    const extractedInfoDisplay = {
      brand: extractedInfo.brand.value,
      version: extractedInfo.version.value?.name || null,
      memory: extractedInfo.capacity.value,
      color: extractedInfo.color.value,
    };
    
    // 匹配的信息
    const matchedInfo = {
      spu: spuMatchResult && spuMatchResult.spu ? spuMatchResult.spu.name : null,
      sku: skuMatchResult.sku ? skuMatchResult.sku.skuID : null,
      gtins: skuMatchResult.sku ? (skuMatchResult.sku.gtins || []) : [],
    };
    
    return {
      inputName: input,
      spuMatch: spuMatchResult || {
        spu: null,
        score: 0,
        explanation: {
          matchType: 'exact' as const,
          brandMatch: { matched: false, score: 0 },
          modelMatch: { matched: false, score: 0 },
          versionMatch: { matched: false, score: 0 },
          details: '未找到匹配',
        },
      },
      skuMatch: skuMatchResult,
      status,
      similarity,
      extractedInfo: extractedInfoDisplay,
      matchedInfo,
    };
  }
  
  /**
   * 获取数据准备服务
   */
  getDataPreparationService(): DataPreparationService {
    return this.dataPrep;
  }
  
  /**
   * 获取预处理服务
   */
  getPreprocessingService(): PreprocessingService {
    return this.preprocessing;
  }
  
  /**
   * 获取信息提取器
   */
  getInfoExtractor(): InfoExtractor {
    return this.infoExtractor;
  }
  
  /**
   * 获取SPU匹配器
   */
  getSPUMatcher(): SPUMatcher {
    return this.spuMatcher;
  }
  
  /**
   * 获取SKU匹配器
   */
  getSKUMatcher(): SKUMatcher {
    return this.skuMatcher;
  }
}
