/**
 * Smart Matching Service
 * 智能匹配服务 - 处理不同命名规范的产品数据匹配
 */

import { spaceHandler } from './spaceHandler';
import { watchRecognizer } from './watchRecognizer';
import { versionExtractor } from './versionExtractor';
import { modelDisambiguator } from './modelDisambiguator';

export class SmartMatcher {
  // 品牌名映射表
  private brandMapping: Map<string, string[]> = new Map([
    ['apple', ['苹果', 'apple', 'iphone', 'ipad', 'macbook', 'mac', 'airpods']],
    ['beats', ['beats']],
    ['huawei', ['华为', 'huawei', 'mate', 'p系列', 'nova', 'pura', 'matepad', 'matebook', 'hi', '畅享', '智选']],
    ['honor', ['荣耀', 'honor', 'magic', 'x70', 'power', '畅玩', '400', '500']],
    ['xiaomi', ['小米', 'xiaomi', 'redmi', '红米']],
    ['oppo', ['oppo', '欧珀', 'reno', 'find', 'a5', 'a6', 'k13', 'pad']],
    ['vivo', ['vivo', 'iqoo', 'iqooz']],
    ['samsung', ['三星', 'samsung', 'galaxy']],
    ['oneplus', ['一加', 'oneplus', 'ace', '13t', '15']],
  ]);

  // 品牌别名映射表（用于标准化品牌名称）
  private brandAliasMap: Map<string, string> = new Map([
    ['欧珀', 'oppo'],
    ['oppo', 'oppo'],
    ['苹果', 'apple'],
    ['apple', 'apple'],
    ['华为', 'huawei'],
    ['huawei', 'huawei'],
    ['荣耀', 'honor'],
    ['honor', 'honor'],
    ['小米', 'xiaomi'],
    ['xiaomi', 'xiaomi'],
    ['红米', 'redmi'],
    ['redmi', 'redmi'],
    ['三星', 'samsung'],
    ['samsung', 'samsung'],
    ['一加', 'oneplus'],
    ['oneplus', 'oneplus'],
    ['vivo', 'vivo'],
    ['iqoo', 'vivo'],
  ]);

  // 规格单位标准化
  private specMapping: Map<string, string> = new Map([
    ['gb', 'gb'],
    ['g', 'gb'],
    ['tb', 'tb'],
    ['t', 'tb'],
    ['英寸', '英寸'],
    ['寸', '英寸'],
    ['"', '英寸'],
    ['inch', '英寸'],
  ]);

  // 颜色标准化映射表
  private colorMapping: Map<string, string[]> = new Map([
    ['银色', ['银色', '银', 'silver', '银白', '银白色']],
    ['金色', ['金色', '金', 'gold', '香槟金', '鎏光金', '沙漠金', '沙漠色']],
    ['星光色', ['星光色', '星光', 'starlight']],
    ['玫瑰金', ['玫瑰金', '粉金', 'rose gold']],
    ['黑色', ['黑色', '黑', 'black', '曜石黑', '幻夜黑', '竞黑', '闪速黑', '琥珀黑', '玄武黑']],
    ['午夜色', ['午夜色', '午夜', 'midnight']],
    ['午夜黑', ['午夜黑', 'midnight black']],
    ['深空灰', ['深空灰', '深空灰色', 'space gray', 'space grey', '极地灰']],
    ['深空黑', ['深空黑', '深空黑色', 'space black']],
    ['白色', ['白色', '白', 'white', '纯白', '象牙白', '月影白', '雪域白', '闪白', '星光白', '石英白', '钻石白', '云海白']],
    ['蓝色', ['蓝色', '蓝', 'blue', '天蓝', '海蓝', '远峰蓝', '天海青', '清风蓝', '晓山青', '云母蓝']],
    ['深蓝色', ['深蓝色', '深蓝', 'deep blue']],
    ['浅蓝色', ['浅蓝色', '浅蓝', 'light blue']],
    ['红色', ['红色', '红', 'red', '中国红', '产品红', '朱砂红', '追光红']],
    ['深红色', ['深红色', '深红', '酒红', 'deep red']],
    ['绿色', ['绿色', '绿', 'green', '苍岭绿', '松岭青', '竹韵青', '旷野绿', '掠影绿', '原野绿', '玉石绿']],
    ['暗夜绿', ['暗夜绿', '暗夜绿色', 'midnight green']],
    ['紫色', ['紫色', '紫', 'purple', '梦幻紫', '电光紫', '玉兰紫', '雾光紫', '砂岩紫']],
    ['深紫色', ['深紫色', '深紫', 'deep purple']],
    ['浅紫色', ['浅紫色', '浅紫', 'light purple']],
    ['粉色', ['粉色', '粉', 'pink', '粉红', '樱花粉', '流沙粉', '玛瑙粉', '水晶粉']],
    ['灰色', ['灰色', '灰', 'gray', 'grey', '极夜灰', '晨曦金']],
    ['黄色', ['黄色', '黄', 'yellow', '柠檬黄']],
    ['橙色', ['橙色', '橙', 'orange']],
    ['棕色', ['棕色', '棕', 'brown', '摩卡棕']],
    ['钛色', ['钛色', '钛', 'titanium', '燃力钛', '燃']],
  ]);

  /**
   * 从产品名称中提取品牌
   * @param productName 产品名称
   * @returns 标准化的品牌标识符，如果未找到返回null
   */
  extractBrand(productName: string): string | null {
    if (!productName) return null;

    const lowerStr = productName.toLowerCase().trim();

    // 创建一个包含所有别名的数组，按长度降序排序（优先匹配更长的别名）
    const allAliases: Array<{ brand: string; alias: string }> = [];
    
    for (const [standardBrand, aliases] of this.brandMapping) {
      for (const alias of aliases) {
        allAliases.push({ brand: standardBrand, alias });
      }
    }
    
    // 按别名长度降序排序，优先匹配更长的别名
    allAliases.sort((a, b) => b.alias.length - a.alias.length);

    // 遍历排序后的别名列表，查找匹配的品牌
    for (const { brand, alias } of allAliases) {
      const aliasLower = alias.toLowerCase();
      
      // 对于英文别名，使用多种匹配方式
      if (/^[a-z]+$/i.test(aliasLower)) {
        // 首先尝试单词边界匹配
        const wordBoundaryPattern = new RegExp(`\\b${aliasLower}\\b`, 'i');
        if (wordBoundaryPattern.test(lowerStr)) {
          return brand;
        }
        
        // 然后尝试直接包含匹配（用于"iqoo15"这样的情况）
        if (lowerStr.includes(aliasLower)) {
          return brand;
        }
      } else {
        // 对于中文别名，使用包含检查
        if (lowerStr.includes(aliasLower)) {
          return brand;
        }
      }
    }

    return null;
  }

  /**
   * 标准化品牌名称
   * @param brandName 品牌名称（可能是别名或不同格式）
   * @returns 标准化的品牌标识符
   */
  normalizeBrand(brandName: string): string {
    if (!brandName) return '';

    const lowerStr = brandName.toLowerCase().trim();
    
    // 查找品牌别名映射表
    const normalized = this.brandAliasMap.get(lowerStr);
    if (normalized) {
      return normalized;
    }

    // 如果不在别名映射表中，直接返回小写版本
    return lowerStr;
  }

  /**
   * 深度标准化字符串
   * @param str 输入字符串
   * @returns 标准化后的字符串
   */
  deepNormalize(str: string): string {
    if (!str) return '';

    // 首先使用 SpaceHandler 标准化空格
    let normalized = this.normalizeSpaces(str)
      .toLowerCase()
      .trim()
      
      // 1. 移除样品机相关标记（演示机、样机等）
      .replace(/样品/g, '')
      .replace(/样机/g, '')
      .replace(/演示机/g, '')
      .replace(/展示机/g, '')
      .replace(/demo/gi, '')
      .replace(/展示/g, '')
      .replace(/试用/g, '')
      
      // 2. 全角/半角转换（在其他处理前）
      .replace(/＋/g, '+')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/【/g, '[')
      .replace(/】/g, ']')
      .replace(/，/g, ',')
      .replace(/。/g, '.')
      .replace(/；/g, ';')
      .replace(/：/g, ':')
      
      // 3. 品牌名标准化
      .replace(/苹果/g, 'apple')
      .replace(/华为/g, 'huawei')
      .replace(/荣耀/g, 'honor')
      .replace(/小米/g, 'xiaomi')
      .replace(/红米/g, 'redmi')
      .replace(/三星/g, 'samsung')
      .replace(/欧珀/g, 'oppo')
      .replace(/一加/g, 'oneplus')
      
      // 4. 网络制式标准化（在容量处理前）
      .replace(/全网通5g/gi, '5g')
      .replace(/全网通4g/gi, '4g')
      .replace(/全网通/g, '')
      .replace(/版本/g, '')
      .replace(/版/g, '')
      
      // 5. 标准化容量格式（在去除空格前处理）
      // 处理括号内的容量：(12+256) → 12gb+256gb
      .replace(/\((\d+)\s*\+\s*(\d+)\)/g, '$1gb+$2gb')
      // 处理括号内的容量（带g）：(12g+256g) → 12gb+256gb
      .replace(/\((\d+)\s*g\s*\+\s*(\d+)\s*g\)/gi, '$1gb+$2gb')
      // 处理不在括号内的容量：12+256 → 12gb+256gb（但不要匹配已经是gb的）
      .replace(/(\d+)\s*\+\s*(\d+)(?!\s*gb)/g, '$1gb+$2gb')
      // 处理不在括号内的容量（带g）：12g+256g → 12gb+256gb
      .replace(/(\d+)\s*g\s*\+\s*(\d+)\s*g(?!b)/gi, '$1gb+$2gb')
      
      // 6. 标准化单个容量（8G → 8GB）
      // 匹配数字后跟g或t，但不是gb或tb或g+或t+的情况
      // 使用正向后查看确保g/t后面不是字母（避免匹配"turbo"中的"t"）
      // 只在明确的容量上下文中匹配（如括号内、加号附近、或明确的容量格式）
      // 先处理括号内的容量
      .replace(/\((\d+)\s*g\s*\)/gi, '($1gb)')
      .replace(/\((\d+)\s*t\s*\)/gi, '($1tb)')
      // 然后处理加号附近的容量
      .replace(/(\d+)\s*g\s*\+/gi, '$1gb+')
      .replace(/\+\s*(\d+)\s*g(?!b)/gi, '+$1gb')
      .replace(/(\d+)\s*t\s*\+/gi, '$1tb+')
      .replace(/\+\s*(\d+)\s*t(?!b)/gi, '+$1tb')
      
      // 7. 去除所有空格
      .replace(/\s+/g, '')
      
      // 8. 去除括号及其内容（型号代码等）
      .replace(/[（(].*?[）)]/g, '')
      
      // 9. 去除特殊字符（但保留+用于容量）
      .replace(/[_/\\|]/g, '')
      .replace(/寸/g, '英寸')
      
      // 10. 最后将 + 转换为 plus 以便匹配
      .replace(/\+/g, 'plus');

    return normalized;
  }

  /**
   * 标准化空格（在深度标准化之前调用）
   * @param str 输入字符串
   * @returns 标准化后的字符串
   */
  normalizeSpaces(str: string): string {
    if (!str) return '';

    // 使用 SpaceHandler 进行空格标准化
    return spaceHandler.normalizeSpaces(str);
  }

  /**
   * 提取颜色信息（提取所有颜色）
   * @param str 输入字符串
   * @returns 标准化的颜色名称数组
   */
  extractColors(str: string): string[] {
    if (!str) return [];

    let lowerStr = str.toLowerCase().trim();
    
    // 移除可能导致误识别的词语
    // "蓝牙"和"bluetooth"中的"蓝"/"blue"不应该被识别为蓝色
    lowerStr = lowerStr.replace(/蓝牙/g, 'wireless');
    lowerStr = lowerStr.replace(/bluetooth/g, 'wireless');
    
    const foundColors = new Set<string>();

    // 按照别名长度从长到短排序，优先匹配更具体的颜色名称
    const sortedColors: Array<[string, string]> = [];
    
    for (const [standardColor, aliases] of this.colorMapping) {
      for (const alias of aliases) {
        sortedColors.push([standardColor, alias]);
      }
    }
    
    // 按别名长度降序排序
    sortedColors.sort((a, b) => b[1].length - a[1].length);
    
    // 查找所有匹配的颜色
    for (const [standardColor, alias] of sortedColors) {
      if (lowerStr.includes(alias.toLowerCase())) {
        foundColors.add(standardColor);
      }
    }

    return Array.from(foundColors);
  }

  /**
   * 提取颜色信息（兼容旧接口，返回第一个颜色）
   * @param str 输入字符串
   * @returns 标准化的颜色名称，如果没有找到返回null
   */
  extractColor(str: string): string | null {
    const colors = this.extractColors(str);
    return colors.length > 0 ? colors[0] : null;
  }

  /**
   * 提取产品类型
   * @param str 输入字符串
   * @returns 产品类型，如果没有找到返回null
   */
  extractProductType(str: string): string | null {
    if (!str) return null;

    // 首先使用 WatchRecognizer 检查是否为手表产品
    if (watchRecognizer.isWatchProduct(str)) {
      return 'Watch';
    }

    const lowerStr = str.toLowerCase().trim();

    // 产品类型映射表（按优先级排序，更具体的在前）
    // 重要：更具体的产品类型应该在前面，以避免被更宽泛的类型匹配
    const productTypes = [
      // 配件类（优先识别，避免误匹配）
      { type: '钢化膜', keywords: ['钢化膜', '贴膜', '保护膜', '屏幕膜', '屏保', 'screen protector'] },
      { type: '保护壳', keywords: ['保护壳', '手机壳', '保护套', '手机套', 'case', 'cover', '壳', '套'] },
      { type: '背包', keywords: ['背包', '包', 'bag', 'backpack', '手提包', '公文包'] },
      { type: '充电器', keywords: ['充电器', '充电头', 'charger', '电源适配器'] },
      { type: '数据线', keywords: ['数据线', '充电线', 'cable', '线材'] },
      { type: '耳机', keywords: ['耳机', 'earphone', 'headphone', 'earbud'] },
      
      // 智能家居和音频设备（在手机之前，因为更具体）
      { type: '智慧屏', keywords: ['智慧屏', 'huawei vision', 'vision pro'] },
      { type: '智能音箱', keywords: ['智能音箱', 'sound x', 'homepod', 'echo', '音箱'] },
      { type: '智能电视', keywords: ['智能电视', '电视', 'tv', 'television'] },
      { type: '平板电脑', keywords: ['平板', 'ipad', 'tablet', 'matepad', 'pad'] },
      { type: '笔记本', keywords: ['笔记本', 'macbook', 'laptop', 'matebook', 'book'] },
      
      // Apple 产品（在通用品牌之前）
      { type: 'iPhone', keywords: ['iphone'] },
      { type: 'iPad', keywords: ['ipad'] },
      { type: 'MacBook', keywords: ['macbook'] },
      { type: 'iMac', keywords: ['imac'] },
      { type: 'Mac', keywords: ['mac mini', 'mac studio', 'mac pro'] },
      { type: 'Apple Watch', keywords: ['watch', '手表', 'apple watch'] },
      { type: 'AirPods', keywords: ['airpods', 'airpod'] },
      { type: 'HomePod', keywords: ['homepod'] },
      { type: 'Apple Pencil', keywords: ['pencil', '触控笔'] },
      { type: 'AirTag', keywords: ['airtag'] },
      
      // 其他品牌手机（最后，因为最宽泛）
      { type: 'Huawei Phone', keywords: ['mate', 'p系列', 'nova', 'pura'] },
      { type: 'Honor Phone', keywords: ['荣耀', 'honor', 'magic'] },
      { type: 'Xiaomi Phone', keywords: ['小米', 'xiaomi', 'redmi', '红米'] },
      { type: 'OPPO Phone', keywords: ['oppo', 'reno', 'find'] },
      { type: 'vivo Phone', keywords: ['vivo', 'iqoo'] },
      { type: 'Samsung Phone', keywords: ['三星', 'samsung', 'galaxy'] },
    ];

    // 按顺序查找匹配的产品类型
    for (const { type, keywords } of productTypes) {
      for (const keyword of keywords) {
        if (lowerStr.includes(keyword.toLowerCase())) {
          return type;
        }
      }
    }

    return null;
  }

  /**
   * 提取屏幕尺寸
   * @param str 输入字符串
   * @returns 屏幕尺寸（统一为英寸或毫米），如果没有找到返回null
   */
  extractScreenSize(str: string): string | null {
    if (!str) return null;

    const lowerStr = str.toLowerCase().trim();

    // 1. 匹配手表尺寸：数字 + mm（毫米）
    // 例如：42mm、44mm、46mm、49mm
    const watchSizePattern = /(\d+)\s*mm/gi;
    const watchMatches = lowerStr.match(watchSizePattern);
    
    if (watchMatches && watchMatches.length > 0) {
      const firstMatch = watchMatches[0];
      const numberMatch = firstMatch.match(/\d+/);
      
      if (numberMatch) {
        const size = parseInt(numberMatch[0]);
        // 合理的手表尺寸范围：38-50mm
        if (size >= 38 && size <= 50) {
          return size + 'mm';
        }
      }
    }

    // 2. 匹配屏幕尺寸：数字 + 英寸/寸/inch/"
    // 例如：13英寸、15.3英寸、11寸、13.6"、13 inch、65英寸、75英寸（大屏幕如电视、平板）
    const screenSizePattern = /(\d+\.?\d*)\s*(英寸|寸|inch|")/gi;
    const screenMatches = lowerStr.match(screenSizePattern);

    if (screenMatches && screenMatches.length > 0) {
      const firstMatch = screenMatches[0];
      const numberMatch = firstMatch.match(/\d+\.?\d*/);
      
      if (numberMatch) {
        const size = parseFloat(numberMatch[0]);
        // 扩大屏幕尺寸范围：3-100英寸（包括手机、平板、笔记本、电视等）
        if (size >= 3 && size <= 100) {
          return size + '英寸';
        }
      }
    }

    // 3. 从MateBook型号中提取屏幕尺寸
    // 例如：MateBook D16 -> 16英寸, MateBook D14 -> 14英寸, MateBookD16 -> 16英寸
    // 也支持 MateBook 14S -> 14英寸, MateBook 16S -> 16英寸
    // 支持有空格和无空格的格式
    
    // 首先尝试匹配 "字母 数字" 的格式（如 "d 16" 或 "14s"）
    let matebookSizeMatch = lowerStr.match(/matebook\s*([a-z])\s*(\d+)/i);
    if (matebookSizeMatch) {
      const screenSize = matebookSizeMatch[2];
      const size = parseInt(screenSize);
      // 合理的笔记本尺寸范围：11-17英寸
      if (size >= 11 && size <= 17) {
        return size + '英寸';
      }
    }
    
    // 然后尝试匹配 "数字 字母" 的格式（如 "14s", "16s"）
    matebookSizeMatch = lowerStr.match(/matebook\s*(\d+)\s*([a-z])/i);
    if (matebookSizeMatch) {
      const screenSize = matebookSizeMatch[1];
      const size = parseInt(screenSize);
      // 合理的笔记本尺寸范围：11-17英寸
      if (size >= 11 && size <= 17) {
        return size + '英寸';
      }
    }

    return null;
  }

  /**
   * 提取关键词
   * @param str 输入字符串
   * @returns 关键词数组
   */
  extractKeywords(str: string): string[] {
    if (!str) return [];

    // 如果是手表产品，提取手表型号代码
    if (watchRecognizer.isWatchProduct(str)) {
      const modelCode = watchRecognizer.extractWatchModelCode(str);
      if (modelCode) {
        // 对于手表，型号代码是最重要的关键词
        const keywords = [modelCode];
        
        // 也提取其他属性作为关键词
        const attributes = watchRecognizer.extractWatchAttributes(str);
        if (attributes.connectionType) keywords.push(attributes.connectionType);
        if (attributes.size) keywords.push(attributes.size);
        if (attributes.strapMaterial) keywords.push(attributes.strapMaterial);
        
        return keywords;
      }
    }

    // 移除样品机相关标记，以便匹配到正式商品
    // 例如："苹果样品16" -> "苹果16", "2021版第九代ipad样机" -> "2021版第九代ipad"
    let cleanedStr = str
      .replace(/样品/g, '')
      .replace(/样机/g, '')
      .replace(/演示机/g, '')
      .replace(/展示机/g, '')
      .replace(/展示/g, '')
      .replace(/试用/g, '')
      .replace(/demo/gi, '')
      .replace(/\s+/g, ' ') // 规范化空格
      .trim();

    // 使用清理后的字符串进行关键词提取，保留空格以便更好地分词
    const lowerStr = cleanedStr.toLowerCase().trim();
    const keywords: string[] = [];

    // 提取品牌（包括别名映射）
    // 注意：只在字符串中明确出现的品牌才提取，避免误识别
    for (const [brand, aliases] of this.brandMapping) {
      for (const alias of aliases) {
        // 使用单词边界匹配，避免部分匹配
        // 例如：不要在"荣耀"中匹配"华为"
        const aliasLower = alias.toLowerCase();
        
        // 检查是否是完整的单词匹配（不是子字符串）
        // 对于中文，使用简单的包含检查
        // 对于英文，使用单词边界
        // 对于纯数字，使用单词边界以避免匹配部分数字（如"500"不应该匹配"12500"）
        let isMatch = false;
        
        if (/^[a-z]+$/i.test(aliasLower)) {
          // 英文别名，使用单词边界
          const pattern = new RegExp(`\\b${aliasLower}\\b`, 'i');
          isMatch = pattern.test(lowerStr);
        } else if (/^\d+$/.test(aliasLower)) {
          // 纯数字别名，使用单词边界以避免匹配部分数字
          const pattern = new RegExp(`\\b${aliasLower}\\b`);
          isMatch = pattern.test(lowerStr);
        } else {
          // 中文别名，使用包含检查
          isMatch = lowerStr.includes(aliasLower);
        }
        
        if (isMatch) {
          keywords.push(brand);
          // 也添加标准化的品牌别名
          const standardBrand = this.brandAliasMap.get(alias.toLowerCase());
          if (standardBrand && standardBrand !== brand) {
            keywords.push(standardBrand);
          }
          break;
        }
      }
    }

    // 提取产品类型关键词（包括Plus, Pro, Max, Air等）
    // 注意：需要处理"Hi"这样的特殊品牌前缀
    const productTypes = ['iphone', 'ipad', 'macbook', 'watch', 'airpods', 'mate', 'magic', 'reno', 'find', 'air', 'plus', 'pro', 'max', 'mini', 'se', 'pencil', 'homepod', 'flex', 'studio', 'solo', 'buds', 'hi'];
    for (const type of productTypes) {
      if (lowerStr.includes(type)) {
        keywords.push(type);
      }
    }

    // 提取中文数字代数（第九代→9，第十一代→11等）
    // 但不要提取"12代"中的"12"作为型号
    const chineseNumberMap: { [key: string]: string } = {
      '第一代': '1', '第二代': '2', '第三代': '3', '第四代': '4', '第五代': '5',
      '第六代': '6', '第七代': '7', '第八代': '8', '第九代': '9', '第十代': '10',
      '第十一代': '11', '第十二代': '12', '第十三代': '13', '第十四代': '14', '第十五代': '15'
    };
    for (const [chinese, number] of Object.entries(chineseNumberMap)) {
      if (lowerStr.includes(chinese)) {
        keywords.push(number);
      }
    }

    // 提取芯片型号（M1, M2, M3, M4等）
    const chipPattern = /\bm[1-4]\b/gi;
    const chipMatches = lowerStr.match(chipPattern);
    if (chipMatches) {
      keywords.push(...chipMatches.map(m => m.toLowerCase()));
    }

    // 提取手表尺寸（40mm, 42mm, 44mm, 46mm, 49mm）
    const watchSizePattern = /\b(40|42|44|45|46|49)\s*mm\b/gi;
    const watchSizeMatches = lowerStr.match(watchSizePattern);
    if (watchSizeMatches) {
      keywords.push(...watchSizeMatches.map(m => m.toLowerCase().replace(/\s+/g, '')));
    }

    // 提取屏幕尺寸（如11英寸, 13英寸, 11寸等）- 先提取以避免干扰型号数字
    const sizePattern = /(\d+\.?\d*)\s*(英寸|寸|inch|")/gi;
    const sizeMatches = lowerStr.match(sizePattern);
    const screenSizes = new Set<string>();
    if (sizeMatches) {
      // 提取数字部分
      const sizes = sizeMatches.map(s => {
        const num = s.match(/\d+\.?\d*/);
        return num ? num[0] + '英寸' : '';
      }).filter(s => s);
      keywords.push(...sizes);
      
      // 记录屏幕尺寸中的数字，避免后续提取为型号
      sizeMatches.forEach(s => {
        const nums = s.match(/\d+/g);
        if (nums) {
          nums.forEach(n => screenSizes.add(n));
        }
      });
    }

    // 改进的型号数字提取
    // 1. 先提取"数字+Plus/Pro/Max"组合（如16Plus, 17Pro, 13ProMax）
    const modelWithSuffixPattern = /(\d{1,3})\s*(plus|pro|max|mini|se|air|e)/gi;
    const modelWithSuffixMatches = lowerStr.match(modelWithSuffixPattern);
    if (modelWithSuffixMatches) {
      for (const match of modelWithSuffixMatches) {
        // 提取数字部分
        const numMatch = match.match(/\d{1,3}/);
        if (numMatch && !screenSizes.has(numMatch[0])) {
          keywords.push(numMatch[0]);
        }
      }
    }

    // 1.5. 提取"Ace/Turbo/Pro等+数字"组合（如Ace5, Turbo+, Pro12等）
    const brandModelPattern = /(ace|turbo|pro|max|mini|se|air|ultra|plus)\s*(\d{1,3})/gi;
    const brandModelMatches = lowerStr.match(brandModelPattern);
    if (brandModelMatches) {
      for (const match of brandModelMatches) {
        const numMatch = match.match(/\d{1,3}/);
        if (numMatch && !screenSizes.has(numMatch[0])) {
          keywords.push(numMatch[0]);
        }
      }
    }

    // 2. 提取带字母前缀的型号（如V75, V65, Z10, A5等）
    // 这些是关键的型号标识符，必须保留字母前缀以区分不同型号
    // 例如：V75和V65是完全不同的产品，不能只提取数字部分
    const prefixedModelPattern = /\b([a-z])(\d{1,3})\b/gi;
    const prefixedModelMatches = lowerStr.match(prefixedModelPattern);
    if (prefixedModelMatches) {
      const prefixedModels = prefixedModelMatches
        .map(m => m.toLowerCase())
        .filter(m => !screenSizes.has(m.replace(/[a-z]/i, ''))); // 排除屏幕尺寸中的数字
      keywords.push(...prefixedModels);
    }

    // 2.5. 提取独立的型号数字（如 15, 16, 80等）
    // 匹配独立的1-3位数字，但排除屏幕尺寸中的数字
    // 不匹配紧跟在字母后的数字（如Z10、A5），因为这些是型号代码的一部分
    // 也不匹配后跟"g"的数字（如5G），因为这是网络制式
    // 也不匹配后跟"代"的数字（如12代），因为这是代数指示符
    // 也不匹配前后跟"+"的数字（如6+128），因为这是容量组合的一部分
    // 注意：需要处理"12 代"这样有空格的情况
    
    // 首先收集容量组合中的数字
    const capacityNumbers = new Set<string>();
    const capacityCombinationPatternForFilter = /(\d+)\s*(?:gb|g)?\s*\+\s*(\d+)\s*(?:gb|g)?/gi;
    const combinationMatchesForFilter = lowerStr.match(capacityCombinationPatternForFilter);
    if (combinationMatchesForFilter) {
      for (const match of combinationMatchesForFilter) {
        const nums = match.match(/\d+/g);
        if (nums) {
          nums.forEach(n => capacityNumbers.add(n));
        }
      }
    }
    
    const modelPattern = /\b(\d{1,3})\b(?!g)(?![a-z])(?!\s*代)/gi;
    const modelMatches = lowerStr.match(modelPattern);
    if (modelMatches) {
      const filteredModels = modelMatches
        .map(m => m.toLowerCase())
        .filter(m => !screenSizes.has(m) && !capacityNumbers.has(m)); // 排除屏幕尺寸和容量中的数字
      keywords.push(...filteredModels);
    }

    // 3. 提取型号代码（如A3291, A3524等）
    const modelCodePattern = /\b[a-z]\d{4}\b/gi;
    const modelCodeMatches = lowerStr.match(modelCodePattern);
    if (modelCodeMatches) {
      keywords.push(...modelCodeMatches.map(m => m.toLowerCase()));
    }

    // 提取存储容量（如128gb, 256gb, 16gb等）
    // 支持多种格式：128gb, 128g, 128GB, (128+256), 128+256等
    // 注意：避免匹配"5G"中的"G"和"Z10"中的"10"
    // 策略：只在容量组合中提取单个数字（如 12+256），或者两位数以上的单独容量
    
    // 1. 先提取容量组合（如 12gb+256gb, 16+512 等）
    const capacityCombinationPattern = /(\d+)\s*(?:gb|g)?\s*\+\s*(\d+)\s*(?:gb|g)?/gi;
    const combinationMatches = lowerStr.match(capacityCombinationPattern);
    if (combinationMatches) {
      const normalized = combinationMatches.map(s => {
        const nums = s.match(/\d+/g);
        if (nums && nums.length === 2) {
          return `${nums[0]}gb+${nums[1]}gb`;
        }
        return '';
      }).filter(s => s);
      keywords.push(...normalized);
    }
    
    // 2. 提取单个容量（两位数以上，或者明确带gb/tb的）
    // 避免匹配型号代码中的数字（如Z10中的10）
    const singleCapacityPattern = /(\d{2,})\s*(?:gb|tb)|(?:^|\s)(\d+)\s*(?:gb|tb)/gi;
    const singleMatches = lowerStr.match(singleCapacityPattern);
    if (singleMatches) {
      const normalized = singleMatches.map(s => 
        s.toLowerCase()
          .replace(/\s+/g, '')
          .replace(/^(\d+)g$/g, '$1gb')  // 只有 g 的情况
          .replace(/^(\d+)t$/g, '$1tb')  // 只有 t 的情况
          .replace(/gb$/, 'gb')          // 已经是 gb 的保持不变
          .replace(/tb$/, 'tb')          // 已经是 tb 的保持不变
      );
      keywords.push(...normalized);
    }

    // 提取年份（如2024, 2025）
    const yearPattern = /\b(202[0-9])\b/g;
    const yearMatches = lowerStr.match(yearPattern);
    if (yearMatches) {
      keywords.push(...yearMatches);
    }

    // 提取版本标识（如"活力版"、"标准版"等）
    const version = versionExtractor.extractVersion(str);
    if (version) {
      keywords.push(version.toLowerCase());
    }

    return [...new Set(keywords)]; // 去重
  }

  /**
   * 计算Levenshtein距离（编辑距离）
   * @param str1 字符串1
   * @param str2 字符串2
   * @returns 编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 计算编辑距离
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // 删除
          matrix[i][j - 1] + 1,      // 插入
          matrix[i - 1][j - 1] + cost // 替换
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * 计算字符串相似度（0-1之间）
   * @param str1 字符串1
   * @param str2 字符串2
   * @returns 相似度分数
   */
  calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const normalized1 = this.deepNormalize(str1);
    const normalized2 = this.deepNormalize(str2);

    if (normalized1 === normalized2) return 1;

    const maxLen = Math.max(normalized1.length, normalized2.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    return 1 - distance / maxLen;
  }

  /**
   * 计算关键词匹配度
   * @param keywords1 关键词数组1
   * @param keywords2 关键词数组2
   * @returns 匹配度分数（0-1）
   */
  calculateKeywordMatch(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    let matchCount = 0;
    for (const keyword of set1) {
      if (set2.has(keyword)) {
        matchCount++;
      }
    }

    // 使用Jaccard相似度
    const unionSize = new Set([...set1, ...set2]).size;
    return matchCount / unionSize;
  }

  /**
   * 提取产品系列名称（包含版本号）
   * 用于区分不同的产品系列和版本
   * 例如：Nova 和 Mate 是不同系列，FIT4 和 Fit 是不同版本
   * 支持型号后跟 Turbo, Pro, Max, Plus 等后缀（如 Z10 Turbo+）
   * @param str 输入字符串
   * @returns 系列名称（如"v75"或"nova14"或"watchfit4"或"watchfit"或"畅享"），如果没有找到返回null
   */
  extractPrefixedModel(str: string): string | null {
    if (!str) return null;

    const lowerStr = str.toLowerCase().trim();

    // 1. 特殊处理 Watch 系列 - 需要捕获 "fit", "fit4", "fit 4" 等变体
    // 例如：Watch FIT4 → "watchfit4", Watch Fit → "watchfit", Watch FIT 4 → "watchfit4"
    // 支持格式：watch fit, watch fit4, watch fit 4, watchfit, watchfit4
    const watchPattern = /watch\s*([a-z]+)(?:\s*(\d+))?/i;
    const watchMatch = lowerStr.match(watchPattern);
    if (watchMatch) {
      let watchSeries = 'watch';
      const watchKeyword = watchMatch[1].toLowerCase();
      const watchNumber = watchMatch[2] ? watchMatch[2] : '';
      
      watchSeries += watchKeyword;
      if (watchNumber) {
        watchSeries += watchNumber;
      }
      
      return watchSeries.toLowerCase();
    }

    // 2. 首先尝试提取系列名称 + 版本号的组合
    // 例如：Nova14 → "nova14", Mate70 → "mate70"
    // 这样可以区分不同版本的同一系列产品
    const seriesWithVersionPattern = /(nova|mate|p|pura|honor|magic|galaxy|reno|find|ace|iqoo|iphone|ipad|macbook)\s*([a-z]*\d+)?/i;
    let match = lowerStr.match(seriesWithVersionPattern);
    
    if (match) {
      const series = match[1].toLowerCase();
      const version = match[2] ? match[2].toLowerCase() : '';
      
      // 排除处理器型号
      if ((series === 'i' && ['3', '5', '7', '9'].includes(version)) ||
          (series === 'm' && ['1', '2', '3', '4'].includes(version))) {
        // 继续尝试其他模式
      } else {
        // 返回系列 + 版本号
        let result = series;
        if (version) {
          result += version;
        }
        
        return result.toLowerCase();
      }
    }

    // 3. 尝试提取已知的华为系列名称（不带版本号）
    const huaweiSeries = ['nova', 'mate', 'p系列', 'p', 'pura', '畅享', '智选', 'honor', 'magic'];
    for (const series of huaweiSeries) {
      if (lowerStr.includes(series)) {
        return series.toLowerCase();
      }
    }

    // 4. 尝试提取其他品牌的系列名称（不带版本号）
    const otherSeries = ['iphone', 'ipad', 'macbook', 'galaxy', 'reno', 'find', 'ace', 'iqoo'];
    for (const series of otherSeries) {
      if (lowerStr.includes(series)) {
        return series.toLowerCase();
      }
    }

    // 5. 如果没有找到已知系列，尝试提取单字母前缀的型号（如V75, Z10, A5等）
    // 模式：字母 + 1-3位数字 + 可选的后缀 + 可选的+号
    const singleLetterPattern = /([a-z])(\d{1,3})(?:(turbo|pro|max|mini|se|air|ultra|plus))?(\+)?/i;
    match = lowerStr.match(singleLetterPattern);
    
    if (match) {
      const letter = match[1];
      const number = match[2];
      const suffix = match[3] ? match[3].toLowerCase() : '';
      const plusSign = match[4] ? match[4] : '';
      
      // 排除处理器型号
      if ((letter === 'i' && ['3', '5', '7', '9'].includes(number)) ||
          (letter === 'm' && ['1', '2', '3', '4'].includes(number))) {
        return null;
      }
      
      // 返回完整的型号，包括后缀和+号
      let result = letter + number;
      if (suffix) {
        result += suffix;
      }
      if (plusSign) {
        result += 'plus';
      }
      
      return result.toLowerCase();
    }

    return null;
  }

  /**
   * 提取处理器型号（如i7, i5, m1, m2等）
   * @param str 输入字符串
   * @returns 处理器型号（如"i7"），如果没有找到返回null
   */
  extractProcessor(str: string): string | null {
    if (!str) return null;

    const lowerStr = str.toLowerCase().trim();

    // 匹配Intel处理器（i3, i5, i7, i9）
    const intelPattern = /\bi([3579])\b/i;
    const intelMatch = lowerStr.match(intelPattern);
    if (intelMatch) {
      return 'i' + intelMatch[1];
    }

    // 匹配Apple芯片（M1, M2, M3, M4）
    const applePattern = /\bm([1-4])\b/i;
    const appleMatch = lowerStr.match(applePattern);
    if (appleMatch) {
      return 'm' + appleMatch[1];
    }

    // 匹配AMD处理器（Ryzen等）
    const amdPattern = /\b(ryzen|amd)\b/i;
    const amdMatch = lowerStr.match(amdPattern);
    if (amdMatch) {
      return 'amd';
    }

    return null;
  }

  /**
   * 提取产品系列（如MateBook 16S, MateBook E等）
   * 用于区分同一品牌下的不同产品线
   * @param str 输入字符串
   * @returns 产品系列（如"matebook16s"或"matebookd"），如果没有找到返回null
   */
  extractProductSeries(str: string): string | null {
    if (!str) return null;

    const lowerStr = str.toLowerCase().trim();

    // 华为MateBook系列 - 需要区分 D, E, 16S 等不同系列
    // 同时需要区分屏幕尺寸（D14 vs D16）
    // 匹配 matebook 后面跟着的字母或数字（可能没有空格）
    // 支持 "d 16" 或 "d16" 或 "16s" 或 "16 s" 等格式
    // 使用两个不同的正则表达式来处理不同的情况
    
    // 首先尝试匹配 "字母 数字" 的格式（如 "d 16"）
    // 支持数字后面跟着任何非字母字符（如括号、空格等）
    let matebookMatch = lowerStr.match(/matebook\s+([a-z])\s+(\d+)(?:\s|[^a-z]|$)/i);
    if (matebookMatch) {
      const letter = matebookMatch[1];
      const number = matebookMatch[2];
      return 'matebook' + number + letter;
    }
    
    // 然后尝试匹配 "数字 字母" 的格式（如 "16 s"）
    matebookMatch = lowerStr.match(/matebook\s+(\d+)\s+([a-z])(?:\s+\d|$)/i);
    if (matebookMatch) {
      const number = matebookMatch[1];
      const letter = matebookMatch[2];
      return 'matebook' + number + letter;
    }
    
    // 最后尝试匹配 "字母数字" 或 "数字字母" 的格式（如 "d16" 或 "16s"）
    // 支持 "16s" 或 "16 s" 等格式
    matebookMatch = lowerStr.match(/matebook\s*(\d+)\s*([a-z])?(?:\s|$)/i);
    if (matebookMatch) {
      const number = matebookMatch[1];
      const letter = matebookMatch[2];
      
      if (letter) {
        // 如果有字母后缀（如 16s），返回 matebook16s
        return 'matebook' + number + letter;
      } else {
        // 如果只有数字，尝试查找字母后缀
        // 例如：MateBook 16S -> 16S
        const fullMatch = lowerStr.match(/matebook\s*(\d+)\s*([a-z])/i);
        if (fullMatch) {
          return 'matebook' + fullMatch[1] + fullMatch[2];
        }
        return 'matebook' + number;
      }
    }
    
    // 尝试匹配 "字母数字" 的格式（如 "d16"）
    matebookMatch = lowerStr.match(/matebook\s*([a-z])(\d+)(?:\s|$)/i);
    if (matebookMatch) {
      const letter = matebookMatch[1];
      const number = matebookMatch[2];
      return 'matebook' + number + letter;
    }
    
    // 尝试匹配只有字母的格式（如 "e"）
    matebookMatch = lowerStr.match(/matebook\s+([a-z])(?:\s|$)/i);
    if (matebookMatch) {
      const letter = matebookMatch[1];
      
      // 对于D系列，尝试提取屏幕尺寸
      if (letter === 'd') {
        const screenSizePattern = /(\d+)\s*英寸/i;
        const screenSizeMatch = lowerStr.match(screenSizePattern);
        if (screenSizeMatch) {
          const screenSize = screenSizeMatch[1];
          return 'matebook' + screenSize + letter;
        }
      }
      return 'matebook' + letter;
    }
    
    // iPhone系列
    const iphonePattern = /iphone\s*([a-z0-9]+)/i;
    const iphoneMatch = lowerStr.match(iphonePattern);
    if (iphoneMatch) {
      return 'iphone' + iphoneMatch[1].replace(/\s+/g, '');
    }

    // iPad系列
    const ipadPattern = /ipad\s*([a-z0-9]+)/i;
    const ipadMatch = lowerStr.match(ipadPattern);
    if (ipadMatch) {
      return 'ipad' + ipadMatch[1].replace(/\s+/g, '');
    }

    // OPPO系列 - 需要区分 Pad, Reno, Find 等不同系列
    // 支持 "pad 4 pro" 或 "pad4pro" 等格式
    // 首先尝试匹配 "pad" 系列
    let oppoPattern = /oppo\s+(pad)\s*(\d+)?(?:\s+(pro|max|mini|se|air|ultra|plus))?/i;
    let oppoMatch = lowerStr.match(oppoPattern);
    
    if (oppoMatch) {
      const series = oppoMatch[1].toLowerCase();
      const number = oppoMatch[2] ? oppoMatch[2] : '';
      const suffix = oppoMatch[3] ? oppoMatch[3].toLowerCase() : '';
      
      let result = 'oppo' + series;
      if (number) {
        result += number;
      }
      if (suffix) {
        result += suffix;
      }
      return result;
    }
    
    // 然后尝试匹配其他 OPPO 系列（Reno, Find等）
    oppoPattern = /oppo\s*([a-z0-9]+)/i;
    oppoMatch = lowerStr.match(oppoPattern);
    if (oppoMatch) {
      return 'oppo' + oppoMatch[1].replace(/\s+/g, '');
    }

    // Vivo系列 - 需要区分 Y50i 和 Y50m 等不同变体
    // 支持 "y50i" 或 "y 50i" 或 "y50 i" 等格式
    // 首先尝试匹配有空格的格式
    let vivoPattern = /vivo\s+([a-z])(\d+)([a-z])?(?:\s+(turbo|pro|max|mini|se|air|ultra|plus))?(?:\+)?/i;
    let vivoMatch = lowerStr.match(vivoPattern);
    
    if (vivoMatch) {
      const letter1 = vivoMatch[1].toLowerCase();
      const number = vivoMatch[2];
      const letter2 = vivoMatch[3] ? vivoMatch[3].toLowerCase() : '';
      const suffix = vivoMatch[4] ? vivoMatch[4].toLowerCase() : '';
      
      // 返回完整的系列标识符，包括所有字母和后缀
      let result = 'vivo' + letter1 + number;
      if (letter2) {
        result += letter2;
      }
      if (suffix) {
        result += suffix;
      }
      return result;
    }
    
    // 然后尝试匹配没有空格的格式（如 vivoy50i）
    vivoPattern = /vivo([a-z])(\d+)([a-z])?(?:(turbo|pro|max|mini|se|air|ultra|plus))?(?:\+)?/i;
    vivoMatch = lowerStr.match(vivoPattern);
    
    if (vivoMatch) {
      const letter1 = vivoMatch[1].toLowerCase();
      const number = vivoMatch[2];
      const letter2 = vivoMatch[3] ? vivoMatch[3].toLowerCase() : '';
      const suffix = vivoMatch[4] ? vivoMatch[4].toLowerCase() : '';
      
      // 返回完整的系列标识符，包括所有字母和后缀
      let result = 'vivo' + letter1 + number;
      if (letter2) {
        result += letter2;
      }
      if (suffix) {
        result += suffix;
      }
      return result;
    }

    // IQOO系列 - 需要区分 Z10 Turbo 和 Z10 Turbo+ 等不同变体
    // 支持 "z10 turbo" 或 "z10turbo" 或 "z10turbo+" 等格式
    // 首先尝试匹配有空格的格式
    let iqooPattern = /iqoo\s+([a-z]\d+)(?:\s+(turbo|pro|max|mini|se|air|ultra|plus))?(?:\+)?/i;
    let iqooMatch = lowerStr.match(iqooPattern);
    
    if (iqooMatch) {
      const baseModel = iqooMatch[1].replace(/\s+/g, '');
      const suffix = iqooMatch[2] ? iqooMatch[2].toLowerCase() : '';
      
      // 返回完整的系列标识符，包括后缀
      if (suffix) {
        return 'iqoo' + baseModel + suffix;
      }
      return 'iqoo' + baseModel;
    }
    
    // 然后尝试匹配没有空格的格式（如 iqooz10turbo+）
    iqooPattern = /iqoo([a-z]\d+)(?:(turbo|pro|max|mini|se|air|ultra|plus))?(?:\+)?/i;
    iqooMatch = lowerStr.match(iqooPattern);
    
    if (iqooMatch) {
      const baseModel = iqooMatch[1].replace(/\s+/g, '');
      const suffix = iqooMatch[2] ? iqooMatch[2].toLowerCase() : '';
      
      // 返回完整的系列标识符，包括后缀
      if (suffix) {
        return 'iqoo' + baseModel + suffix;
      }
      return 'iqoo' + baseModel;
    }

    return null;
  }

  /**
   * 提取并标准化容量信息
   * @param str 输入字符串
   * @returns 标准化的容量字符串（如 "12gb+256gb"），如果没有找到返回null
   */
  extractCapacity(str: string): string | null {
    if (!str) return null;

    const lowerStr = str.toLowerCase().trim();

    // 1. 匹配容量组合（如12gb+256gb, 16gb+512gb, (12+256), 12+256等）
    // 支持多种格式：12gb+256gb, 12g+256g, (12+256), 12+256等
    const capacityCombinationPattern = /(\d+)\s*(?:gb|g)?\s*\+\s*(\d+)\s*(?:gb|g)?/gi;
    const combinationMatches = lowerStr.match(capacityCombinationPattern);
    
    if (combinationMatches && combinationMatches.length > 0) {
      const firstMatch = combinationMatches[0];
      // 提取数字部分
      const numbers = firstMatch.match(/\d+/g);
      if (numbers && numbers.length === 2) {
        // 标准化为 "12gb+256gb" 格式
        return `${numbers[0]}gb+${numbers[1]}gb`;
      }
    }

    // 2. 匹配单个容量（如128gb, 256gb, 128g, 256g等）
    const singleCapacityPattern = /(\d+)\s*(?:gb|g|tb|t)\b/gi;
    const singleMatches = lowerStr.match(singleCapacityPattern);
    
    if (singleMatches && singleMatches.length > 0) {
      const firstMatch = singleMatches[0];
      const numberMatch = firstMatch.match(/\d+/);
      if (numberMatch) {
        // 判断是GB还是TB
        if (firstMatch.toLowerCase().includes('t')) {
          return `${numberMatch[0]}tb`;
        } else {
          return `${numberMatch[0]}gb`;
        }
      }
    }

    return null;
  }

  /**
   * 综合匹配分数计算
   * @param excelValue Excel中的值
   * @param csvValue CSV中的值
   * @returns 综合匹配分数（0-1）
   */
  calculateMatchScore(excelValue: string, csvValue: string): number {
    // 0. 先进行空格标准化
    const normalizedExcel = this.normalizeSpaces(excelValue);
    const normalizedCsv = this.normalizeSpaces(csvValue);
    
    // 0.5. 特殊处理手表产品
    const isWatch1 = watchRecognizer.isWatchProduct(normalizedExcel);
    const isWatch2 = watchRecognizer.isWatchProduct(normalizedCsv);
    
    if (isWatch1 && isWatch2) {
      // 两个都是手表产品，使用手表专用匹配逻辑
      const watchMatch = watchRecognizer.compareWatchProducts(normalizedExcel, normalizedCsv);
      
      if (watchMatch) {
        // 手表匹配成功，返回高分
        return 0.95;
      } else {
        // 手表不匹配，但仍然计算基础相似度
        // 继续执行下面的通用匹配逻辑，但会应用更严格的阈值
      }
    } else if (isWatch1 !== isWatch2) {
      // 一个是手表，另一个不是，直接返回低分
      return 0.0;
    }
    
    // 1. 字符串相似度（权重40%，从30%提升到40%）
    const stringSimilarity = this.calculateSimilarity(normalizedExcel, normalizedCsv);

    // 2. 关键词匹配度（权重60%，从70%降低到60%）
    const keywords1 = this.extractKeywords(normalizedExcel);
    const keywords2 = this.extractKeywords(normalizedCsv);
    const keywordMatch = this.calculateKeywordMatch(keywords1, keywords2);

    // 3. 型号前缀检查 - 如果两边都有带字母的型号，必须匹配
    // 例如：V75 vs V65，虽然都是华为智慧屏，但型号完全不同
    const prefixedModel1 = this.extractPrefixedModel(normalizedExcel);
    const prefixedModel2 = this.extractPrefixedModel(normalizedCsv);
    
    let modelPrefixPenalty = 0;
    if (prefixedModel1 && prefixedModel2 && prefixedModel1 !== prefixedModel2) {
      // 型号前缀不匹配，这是关键差异，应该大幅降低分数
      // 例如：V75 vs V65 应该被拒绝
      modelPrefixPenalty = 0.7; // 降低70%的分数
    }

    // 3.2. 完整型号检查 - 使用 ModelDisambiguator 进行精确型号匹配
    // 例如：X200 Pro vs X200 Pro mini，虽然相似但是不同型号
    const fullModel1 = modelDisambiguator.extractFullModel(normalizedExcel);
    const fullModel2 = modelDisambiguator.extractFullModel(normalizedCsv);
    
    let modelDisambiguationPenalty = 0;
    if (fullModel1 && fullModel2) {
      // 计算型号匹配分数
      const modelMatchScore = modelDisambiguator.calculateModelMatchScore(fullModel1, fullModel2);
      
      if (modelMatchScore === 0.0) {
        // 完全不匹配，应该大幅降低分数
        modelDisambiguationPenalty = 0.8; // 降低80%的分数
      } else if (modelMatchScore < 1.0) {
        // 部分匹配（如基础型号相同但后缀不同），降低更多分数
        // 例如：Mate60 Pro vs Mate60，或 X200 Pro vs X200 Pro mini
        // 从 0.5 * (1.0 - modelMatchScore) 改为 0.7 * (1.0 - modelMatchScore)
        // 这样对于 modelMatchScore = 0.5 的情况，惩罚从 0.25 提升到 0.35
        // 对于 modelMatchScore = 0.3 的情况，惩罚从 0.35 提升到 0.49
        modelDisambiguationPenalty = 0.7 * (1.0 - modelMatchScore);
      }
      // 如果 modelMatchScore === 1.0，则完全匹配，不惩罚
    }

    // 3.5. 产品系列检查 - 如果两边都有产品系列，必须匹配
    // 例如：MateBook 16S vs MateBook E，虽然都是华为MateBook，但系列完全不同
    const series1 = this.extractProductSeries(normalizedExcel);
    const series2 = this.extractProductSeries(normalizedCsv);
    
    let seriesPenalty = 0;
    if (series1 && series2 && series1 !== series2) {
      // 产品系列不匹配，这是关键差异，应该大幅降低分数
      // 例如：matebook16s vs matebooke 应该被拒绝
      // 例如：iqooneo10 vs iqoo12 应该被拒绝
      
      // 对于所有产品系列不匹配的情况，都应用严格惩罚
      // 除非是同一品牌内的不同变体（如Z10 Turbo vs Z10）
      // 检查是否是同一基础系列的不同变体
      const isSameBaseSeries = 
        (series1.replace(/turbo|pro|max|mini|se|air|ultra|plus/gi, '') === 
         series2.replace(/turbo|pro|max|mini|se|air|ultra|plus/gi, ''));
      
      if (!isSameBaseSeries) {
        // 不同的基础系列，应用严格惩罚
        seriesPenalty = 0.8; // 降低80%的分数（比型号前缀更严格）
      }
    }

    // 3.7. 处理器检查 - 如果两边都有处理器信息，必须匹配
    // 例如：i7 vs i5，这是关键规格差异
    const processor1 = this.extractProcessor(normalizedExcel);
    const processor2 = this.extractProcessor(normalizedCsv);
    
    let processorPenalty = 0;
    if (processor1 && processor2 && processor1 !== processor2) {
      // 处理器不匹配，这是关键规格差异，应该大幅降低分数
      // 例如：i7 vs i5 应该被拒绝
      processorPenalty = 0.7; // 降低70%的分数
    }

    // 3.8. 年份检查 - 如果两边都有年份信息，必须匹配
    // 例如：2023款 vs 2021款，这是关键产品代数差异
    const yearPattern = /\b(202[0-9])\b/g;
    const years1 = normalizedExcel.match(yearPattern);
    const years2 = normalizedCsv.match(yearPattern);
    
    let yearPenalty = 0;
    if (years1 && years2) {
      // 两边都有年份信息
      const year1 = years1[0]; // 取第一个年份
      const year2 = years2[0];
      
      if (year1 !== year2) {
        // 年份不匹配，这是关键产品代数差异，应该大幅降低分数
        // 例如：2023款 vs 2021款 应该被拒绝
        yearPenalty = 0.6; // 降低60%的分数
      }
    }

    // 3.9. 版本标识检查 - 如果两边都有版本标识，必须匹配
    // 例如：活力版 vs 标准版，这是不同的产品版本
    const version1 = versionExtractor.extractVersion(normalizedExcel);
    const version2 = versionExtractor.extractVersion(normalizedCsv);
    
    let versionPenalty = 0;
    if (version1 && version2) {
      // 两边都有版本标识
      if (!versionExtractor.versionsMatch(version1, version2)) {
        // 版本不匹配，降低80%的分数（从50%提升到80%）
        // 版本标识是关键产品差异，应该严格区分
        versionPenalty = 0.8;
      }
    } else if ((version1 && !version2) || (!version1 && version2)) {
      // 一边有版本标识，另一边没有
      // 这可能表示不同的产品版本，降低50%的分数（从30%提升到50%）
      versionPenalty = 0.5;
    }

    // 4. 容量验证 - 如果两边都有容量信息且不匹配，大幅降低分数
    // 或者如果一边有容量而另一边没有，也应该降低分数（可能是不同的产品）
    const capacity1 = this.extractCapacity(excelValue);
    const capacity2 = this.extractCapacity(csvValue);
    
    let capacityPenalty = 0;
    if (capacity1 && capacity2) {
      // 两边都有容量信息
      if (capacity1 !== capacity2) {
        // 容量不匹配，降低60%的分数（容量是关键规格）
        capacityPenalty = 0.6;
      }
    } else if ((capacity1 && !capacity2) || (!capacity1 && capacity2)) {
      // 一边有容量，另一边没有
      // 这通常表示不同的产品（例如：iPad Air 64GB vs iPad Air包）
      // 降低40%的分数
      capacityPenalty = 0.4;
    }

    // 5. 颜色验证 - 如果两边都有颜色信息且不匹配，大幅降低分数
    const colors1 = this.extractColors(excelValue);
    const colors2 = this.extractColors(csvValue);
    
    let colorPenalty = 0;
    if (colors1.length > 0 && colors2.length > 0) {
      // 检查是否有任何颜色匹配
      const hasCommonColor = colors1.some(c1 => colors2.includes(c1));
      
      if (!hasCommonColor) {
        // 完全没有共同颜色，降低50%的分数
        colorPenalty = 0.5;
      }
      // 如果有任何颜色匹配，就不惩罚（支持多颜色产品，如表壳+表带）
    }

    // 6. 产品类型验证 - 如果产品类型不匹配，直接拒绝
    const type1 = this.extractProductType(excelValue);
    const type2 = this.extractProductType(csvValue);
    
    let productTypePenalty = 0;
    if (type1 && type2 && type1 !== type2) {
      // 产品类型不匹配，降低50%的分数（比颜色惩罚更严重）
      productTypePenalty = 0.5;
    }

    // 7. 屏幕尺寸验证 - 如果尺寸不匹配，大幅降低分数
    const size1 = this.extractScreenSize(excelValue);
    const size2 = this.extractScreenSize(csvValue);
    
    let sizePenalty = 0;
    if (size1 && size2 && size1 !== size2) {
      // 提取数字部分进行比较
      const sizeNum1 = parseFloat(size1.replace(/[^0-9.]/g, ''));
      const sizeNum2 = parseFloat(size2.replace(/[^0-9.]/g, ''));
      
      // 计算尺寸差异
      const sizeDiff = Math.abs(sizeNum1 - sizeNum2);
      
      // 如果差异小于0.5英寸，认为是同一规格（例如14英寸 vs 14.2英寸）
      if (sizeDiff < 0.5) {
        // 轻微差异，不惩罚或轻微惩罚
        sizePenalty = 0;
      } else if (sizeDiff < 1.0) {
        // 中等差异（例如14英寸 vs 15英寸），降低30%的分数
        sizePenalty = 0.3;
      } else {
        // 明显差异（例如14英寸 vs 16英寸），降低70%的分数
        sizePenalty = 0.7;
      }
    }

    // 综合分数
    let finalScore = stringSimilarity * 0.6 + keywordMatch * 0.4;
    
    // 应用惩罚（产品系列、处理器、型号前缀、型号消歧、容量、颜色、产品类型、尺寸、年份、版本）
    // 注意：产品系列、处理器和型号消歧的惩罚最严格，因为它们是关键的产品标识符
    finalScore = Math.max(0, finalScore - seriesPenalty - processorPenalty - modelPrefixPenalty - modelDisambiguationPenalty - capacityPenalty - colorPenalty - productTypePenalty - sizePenalty - yearPenalty - versionPenalty);

    return finalScore;
  }

  /**
   * 判断是否匹配（基于阈值）
   * @param excelValue Excel中的值
   * @param csvValue CSV中的值
   * @param threshold 匹配阈值（默认0.5）
   * @returns 是否匹配
   */
  isMatch(excelValue: string, csvValue: string, threshold: number = 0.5): boolean {
    const score = this.calculateMatchScore(excelValue, csvValue);
    return score >= threshold;
  }

  /**
   * 在多个字段中查找最佳匹配
   * @param excelValue Excel中的值
   * @param csvFields CSV中的多个字段值
   * @param threshold 匹配阈值
   * @returns 最佳匹配的字段索引和分数，如果没有匹配返回null
   */
  findBestMatch(
    excelValue: string,
    csvFields: string[],
    threshold: number = 0.6
  ): { index: number; score: number } | null {
    let bestMatch: { index: number; score: number } | null = null;

    for (let i = 0; i < csvFields.length; i++) {
      const score = this.calculateMatchScore(excelValue, csvFields[i]);
      
      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { index: i, score };
        }
      }
    }

    return bestMatch;
  }
}

export const smartMatcher = new SmartMatcher();
