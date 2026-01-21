'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, XCircle, Download, Settings } from 'lucide-react';
import { Card, Input, Button, Table, Tag, Space, message, Spin, Checkbox, Dropdown } from 'antd';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

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

// 简化的匹配算法
class SimpleMatcher {
  private dynamicColors: string[] = [];
  
  // 设置动态颜色列表
  setColorList(colors: string[]) {
    this.dynamicColors = colors;
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
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus', 'realme'];
    
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
    
    return null;
  }

  // 提取型号（包括字母和数字）
  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 先尝试匹配常见的完整型号格式
    // Y300Pro+, Y300i, Y300, Y50, Y3, X Note, Mate60, iPhone15等
    
    // 1. 匹配复杂型号：字母+数字+Pro/Max/Plus/Ultra等+可选的+号
    // 支持有空格和无空格：Y500Pro, Y500 Pro, Mate60Pro, Mate60 Pro
    const complexModelPattern = /\b([a-z])(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note)(\+)?\b/gi;
    const complexMatches = lowerStr.match(complexModelPattern);
    
    if (complexMatches && complexMatches.length > 0) {
      // 返回最长的匹配（通常是最完整的型号）
      const filtered = complexMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('gb') && !lower.endsWith('g');
      });
      
      if (filtered.length > 0) {
        // 统一去除空格，使 Y500Pro 和 Y500 Pro 都变成 y500pro
        return filtered.sort((a, b) => b.length - a.length)[0]
          .toLowerCase()
          .replace(/\s+/g, '');
      }
    }
    
    // 2. 匹配简单型号：字母+数字+可选字母（如 Y300i, Y50, Y3, Mate60）
    // 改进：先匹配所有可能的型号，然后按优先级过滤
    const simpleModelPattern = /\b([a-z]+)(\d+)([a-z]*)\b/gi;
    const simpleMatches = lowerStr.match(simpleModelPattern);
    
    if (simpleMatches && simpleMatches.length > 0) {
      // 过滤掉容量和网络制式相关的匹配
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
        
        // 排除：纯数字+g（如 8g, 12g）
        if (/^\d+g$/i.test(lower)) {
          return false;
        }
        
        return true;
      });
      
      if (filtered.length > 0) {
        // 优先选择：
        // 1. 包含字母后缀的（如 Y300i）
        // 2. 较长的型号
        // 3. 字母开头的
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
        
        return sorted[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    // 3. 匹配 "字母 字母" 格式（如 X Note, X Fold）
    const wordModelPattern = /\b([a-z]+)\s+([a-z]+)\b/gi;
    const wordMatches = lowerStr.match(wordModelPattern);
    
    if (wordMatches && wordMatches.length > 0) {
      // 过滤掉常见的非型号词组
      const filtered = wordMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('全网通') && 
               !lower.includes('版本') &&
               !lower.includes('网通');
      });
      
      if (filtered.length > 0) {
        return filtered[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
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

  // 提取颜色（改进版：使用多种方法）
  extractColor(str: string): string | null {
    // 方法1：优先使用动态颜色列表（从实际数据中提取的）
    if (this.dynamicColors.length > 0) {
      for (const color of this.dynamicColors) {
        if (str.includes(color)) {
          return color;
        }
      }
    }
    
    // 方法2：从字符串末尾提取颜色（通常颜色在最后）
    // 例如：vivo Y500 全网通5G 12GB+512GB 龙晶紫 → 龙晶紫
    const lastWords = str.match(/[\u4e00-\u9fa5]{2,5}$/);
    if (lastWords) {
      const word = lastWords[0];
      // 排除常见的非颜色词
      const excludeWords = ['全网通', '网通', '版本', '标准', '套餐'];
      if (!excludeWords.includes(word)) {
        return word;
      }
    }
    
    // 方法3：从容量后提取颜色
    // 例如：12GB+512GB 龙晶紫 → 龙晶紫
    const afterCapacity = str.match(/\d+GB[+]\d+GB\s*([\u4e00-\u9fa5]{2,5})/);
    if (afterCapacity && afterCapacity[1]) {
      return afterCapacity[1];
    }
    
    // 方法4：使用基础颜色作为后备
    const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰'];
    for (const color of basicColors) {
      if (str.includes(color)) {
        return color;
      }
    }
    
    return null;
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
      if (color1 === color2 || 
          (color1.includes('雾凇') && color2.includes('雾松')) ||
          (color1.includes('雾松') && color2.includes('雾凇'))) {
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
    // 提取输入的关键信息
    const inputBrand = this.extractBrand(input);
    const inputModel = this.extractModel(input);
    
    console.log('=== SPU匹配输入 ===');
    console.log('原始输入:', input);
    console.log('提取品牌:', inputBrand);
    console.log('提取型号:', inputModel);
    
    let bestMatch: SPUData | null = null;
    let bestScore = 0;
    
    for (const spu of spuList) {
      const spuBrand = this.extractBrand(spu.name);
      const spuModel = this.extractModel(spu.name);
      
      let score = 0;
      let matchCount = 0;
      let totalCount = 0;
      
      // 品牌匹配（必须）
      if (inputBrand) {
        totalCount++;
        if (spuBrand && inputBrand === spuBrand) {
          matchCount++;
          score += 0.4; // 品牌权重40%
        } else {
          continue; // 品牌不匹配，跳过
        }
      }
      
      // 型号匹配（必须）
      if (inputModel) {
        totalCount++;
        if (spuModel && inputModel === spuModel) {
          matchCount++;
          score += 0.6; // 型号权重60%
        } else {
          continue; // 型号不匹配，跳过
        }
      }
      
      // 如果既没有品牌也没有型号，使用字符串相似度
      if (!inputBrand && !inputModel) {
        const similarity = this.calculateSimilarity(input, spu.name);
        score = similarity;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = spu;
      }
    }
    
    console.log('最佳SPU匹配:', {
      spu: bestMatch?.name,
      score: bestScore,
      threshold
    });
    
    if (bestScore < threshold) {
      return { spu: null, similarity: 0 };
    }
    
    return { spu: bestMatch, similarity: bestScore };
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
        // 特殊颜色变体匹配（雾凇/雾松）
        else if (
          (inputColor.includes('雾凇') && skuColor.includes('雾松')) ||
          (inputColor.includes('雾松') && skuColor.includes('雾凇'))
        ) {
          paramScore += 0.3; // 雾凇和雾松视为完全匹配
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
  const matcher = new SimpleMatcher();

  // 加载所有SPU数据并从SKU中提取颜色
  useEffect(() => {
    const loadSPUData = async () => {
      try {
        setLoadingSPU(true);
        const data = await getSPUListNew(
          {
            states: [SPUState.在用],
            limit: 100000, // 加载所有SPU
            offset: 0,
            orderBy: [{ key: 'p."id"', sort: 'DESC' }],
          },
          ['id', 'name', 'brand']
        );
        setSPUList(data);
        
        // 从实际 SKU 数据中提取颜色词
        // 采样部分 SPU 来提取颜色（避免加载太多数据）
        const extractedColors = new Set<string>();
        const sampleSize = Math.min(100, data.length); // 采样前100个SPU
        
        console.log('开始从 SKU 中提取颜色词...');
        
        for (let i = 0; i < sampleSize; i++) {
          const spu = data[i];
          try {
            const spuInfo = await getSPUInfo(spu.id);
            const skuIDs = spuInfo.skuIDs || [];
            
            if (skuIDs.length > 0) {
              const skuDetails = await getSKUsInfo(skuIDs.map(s => s.skuID));
              
              for (const sku of skuDetails) {
                if ('errInfo' in sku) continue;
                
                const name = sku.name;
                
                // 方法1：提取最后2-5个字符（通常是颜色）
                const lastWords = name.match(/[\u4e00-\u9fa5]{2,5}$/);
                if (lastWords) {
                  const word = lastWords[0];
                  // 排除常见的非颜色词
                  const excludeWords = ['全网通', '网通', '版本', '标准', '套餐'];
                  if (!excludeWords.includes(word)) {
                    extractedColors.add(word);
                  }
                }
                
                // 方法2：提取容量后面的词（通常是颜色）
                // 例如：12GB+512GB 龙晶紫 → 龙晶紫
                const afterCapacity = name.match(/\d+GB[+]\d+GB\s*([\u4e00-\u9fa5]{2,5})/);
                if (afterCapacity && afterCapacity[1]) {
                  extractedColors.add(afterCapacity[1]);
                }
                
                // 方法3：提取所有2-5个字符的词，包含基础颜色的
                const allWords = name.match(/[\u4e00-\u9fa5]{2,5}/g);
                if (allWords) {
                  const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰'];
                  for (const word of allWords) {
                    if (basicColors.some(c => word.includes(c))) {
                      extractedColors.add(word);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error(`提取 SPU ${spu.id} 的颜色失败:`, error);
          }
          
          // 每10个显示进度
          if ((i + 1) % 10 === 0) {
            console.log(`已处理 ${i + 1}/${sampleSize} 个 SPU，提取 ${extractedColors.size} 个颜色`);
          }
        }
        
        // 转换为数组并按长度降序排序（优先匹配更长的颜色词）
        const colors = Array.from(extractedColors).sort((a, b) => b.length - a.length);
        setColorList(colors);
        
        console.log('提取的颜色列表:', colors);
        message.success(`已加载 ${data.length} 个SPU，从 ${sampleSize} 个SPU中提取 ${colors.length} 个颜色词`);
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
        const trimmedLine = lines[i].trim();
        
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
              const color = matcher.extractColor(sku.name);
              
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
          
          // 第三阶段：在SKU中匹配参数（容量、颜色）
          const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKUInList(
            trimmedLine,
            skuData
          );
          
          if (matchedSKU) {
            // 计算综合相似度
            // SPU 匹配（品牌+型号）占 50%
            // SKU 参数匹配（容量+颜色）占 50%
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
      render: (text: string | null) => text ? <Tag color="orange">{text}</Tag> : '-',
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
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* 左侧：输入区域 */}
      <div className="w-1/3 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <div className="flex flex-col h-full">
            <div className="mb-4">
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
                style={{ height: 'calc(100vh - 400px)', minHeight: '300px' }}
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
                    menu={{
                      items: [
                        {
                          key: 'inputName',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('inputName')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'inputName']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'inputName'));
                                }
                              }}
                            >
                              输入商品名称
                            </Checkbox>
                          ),
                        },
                        {
                          key: 'matchedSPU',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('matchedSPU')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'matchedSPU']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'matchedSPU'));
                                }
                              }}
                            >
                              匹配的SPU
                            </Checkbox>
                          ),
                        },
                        {
                          key: 'specs',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('specs')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'specs']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'specs'));
                                }
                              }}
                            >
                              规格标签
                            </Checkbox>
                          ),
                        },
                        {
                          key: 'matchedSKU',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('matchedSKU')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'matchedSKU']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'matchedSKU'));
                                }
                              }}
                            >
                              匹配的SKU
                            </Checkbox>
                          ),
                        },
                        {
                          key: 'matchedBrand',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('matchedBrand')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'matchedBrand']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'matchedBrand'));
                                }
                              }}
                            >
                              品牌
                            </Checkbox>
                          ),
                        },
                        {
                          key: 'matchedGtins',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('matchedGtins')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'matchedGtins']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'matchedGtins'));
                                }
                              }}
                            >
                              69码
                            </Checkbox>
                          ),
                        },
                        {
                          key: 'statusAndSimilarity',
                          label: (
                            <Checkbox
                              checked={visibleColumns.includes('statusAndSimilarity')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleColumns([...visibleColumns, 'statusAndSimilarity']);
                                } else {
                                  setVisibleColumns(visibleColumns.filter(c => c !== 'statusAndSimilarity'));
                                }
                              }}
                            >
                              状态/相似度
                            </Checkbox>
                          ),
                        },
                      ],
                    }}
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
              <div className="flex-1 overflow-x-auto">
                <Table
                  columns={columns}
                  dataSource={results}
                  rowKey={(record, index) => `${record.inputName}-${index}`}
                  scroll={{ x: 'max-content', y: 'calc(100vh - 450px)' }}
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
          <Card className="flex-1 flex items-center justify-center">
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
