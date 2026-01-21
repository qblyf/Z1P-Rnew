/**
 * Watch Recognizer
 * 手表识别器 - 专门处理手表类产品的型号识别
 * 
 * 职责：
 * - 识别手表产品（Watch、手表等关键词）
 * - 提取手表型号代码（如WA2456C）
 * - 提取手表属性（表带材质、连接方式、颜色、尺寸）
 * - 标准化手表属性顺序
 */

/**
 * 手表属性接口
 */
export interface WatchAttributes {
  modelCode?: string;      // 型号代码（如WA2456C）
  connectionType?: string; // 连接方式（蓝牙版、eSIM版）
  strapMaterial?: string;  // 表带材质（软胶、皮革、金属）
  color?: string;          // 颜色
  size?: string;           // 尺寸（42mm、46mm等）
}

export class WatchRecognizer {
  // 手表关键词列表
  private readonly watchKeywords = [
    'watch',
    '手表',
    'smartwatch',
    '智能手表',
  ];

  // 连接方式关键词
  private readonly connectionTypes = [
    '蓝牙版',
    'esim版',
    'esim',
    '4g版',
    '5g版',
    'lte版',
    'gps版',
    'cellular版',
  ];

  // 表带材质关键词
  private readonly strapMaterials = [
    '软胶',
    '皮革',
    '金属',
    '尼龙',
    '硅胶',
    '橡胶',
    '不锈钢',
    '钛金属',
    '陶瓷',
  ];

  // 手表尺寸范围（毫米）
  private readonly validWatchSizes = {
    min: 38,
    max: 50,
  };

  /**
   * 判断是否为手表产品
   * @param productName 产品名称
   * @returns 是否为手表产品
   */
  isWatchProduct(productName: string): boolean {
    if (!productName) return false;

    const lowerStr = productName.toLowerCase().trim();

    // 检查是否包含手表关键词
    for (const keyword of this.watchKeywords) {
      if (lowerStr.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * 提取手表型号代码
   * 通常在括号内，格式如 WA2456C、WA1234D 等
   * @param productName 产品名称
   * @returns 型号代码（如WA2456C），如果没有找到返回null
   */
  extractWatchModelCode(productName: string): string | null {
    if (!productName) return null;

    // 匹配括号内的型号代码
    // 格式：字母+数字+可选字母，如 WA2456C、WA1234、GT2456E
    const bracketPattern = /[（(]([A-Z]{2}\d{4}[A-Z]?)[）)]/i;
    const bracketMatch = productName.match(bracketPattern);
    
    if (bracketMatch) {
      return bracketMatch[1].toUpperCase();
    }

    // 如果括号内没有找到，尝试直接匹配型号代码模式
    // 但要确保它看起来像手表型号代码（2个字母+4个数字+可选字母）
    const directPattern = /\b([A-Z]{2}\d{4}[A-Z]?)\b/i;
    const directMatch = productName.match(directPattern);
    
    if (directMatch) {
      return directMatch[1].toUpperCase();
    }

    return null;
  }

  /**
   * 提取手表属性
   * @param productName 产品名称
   * @returns 属性对象
   */
  extractWatchAttributes(productName: string): WatchAttributes {
    const attributes: WatchAttributes = {};

    if (!productName) return attributes;

    const lowerStr = productName.toLowerCase().trim();

    // 1. 提取型号代码
    const modelCode = this.extractWatchModelCode(productName);
    if (modelCode !== null) {
      attributes.modelCode = modelCode;
    }

    // 2. 提取连接方式
    for (const connectionType of this.connectionTypes) {
      if (lowerStr.includes(connectionType.toLowerCase())) {
        attributes.connectionType = connectionType;
        break; // 只取第一个匹配的连接方式
      }
    }

    // 3. 提取表带材质
    for (const material of this.strapMaterials) {
      if (lowerStr.includes(material.toLowerCase())) {
        attributes.strapMaterial = material;
        break; // 只取第一个匹配的材质
      }
    }

    // 4. 提取尺寸（毫米）
    const sizePattern = /(\d+)\s*mm/i;
    const sizeMatch = lowerStr.match(sizePattern);
    
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      // 验证尺寸是否在合理范围内
      if (size >= this.validWatchSizes.min && size <= this.validWatchSizes.max) {
        attributes.size = size + 'mm';
      }
    }

    // 5. 提取颜色（使用简单的颜色关键词匹配）
    // 注意：这里只提取基本颜色，更复杂的颜色提取应该使用 SmartMatcher 的 extractColor 方法
    // 按照从长到短的顺序匹配，优先匹配更具体的颜色名称
    const colorKeywords = [
      // 复合颜色名称（优先匹配）
      '夏夜黑', '星云灰', '月光银', '玫瑰金', '钛金属',
      '曜石黑', '幻夜黑', '午夜黑', '深空黑', '深空灰',
      '象牙白', '月影白', '雪域白', '星光白', '云海白',
      '远峰蓝', '天海青', '清风蓝', '晓山青', '云母蓝',
      '苍岭绿', '松岭青', '竹韵青', '旷野绿', '掠影绿', '原野绿', '玉石绿',
      '梦幻紫', '电光紫', '玉兰紫', '雾光紫', '砂岩紫',
      '樱花粉', '流沙粉', '玛瑙粉', '水晶粉',
      // 基本颜色
      '黑色', '黑', '白色', '白', '银色', '银', '金色', '金',
      '蓝色', '蓝', '红色', '红', '绿色', '绿', '紫色', '紫',
      '粉色', '粉', '灰色', '灰', '棕色', '棕', '橙色', '橙',
    ];

    for (const color of colorKeywords) {
      if (lowerStr.includes(color)) {
        attributes.color = color;
        break; // 只取第一个匹配的颜色
      }
    }

    return attributes;
  }

  /**
   * 标准化手表属性顺序
   * 标准顺序：型号代码 > 连接方式 > 颜色 > 表带材质 > 尺寸
   * @param attributes 属性对象
   * @returns 标准化后的属性字符串
   */
  normalizeWatchAttributes(attributes: WatchAttributes): string {
    const parts: string[] = [];

    // 按标准顺序添加属性
    if (attributes.modelCode) {
      parts.push(attributes.modelCode);
    }

    if (attributes.connectionType) {
      parts.push(attributes.connectionType);
    }

    if (attributes.color) {
      parts.push(attributes.color);
    }

    if (attributes.strapMaterial) {
      parts.push(attributes.strapMaterial);
    }

    if (attributes.size) {
      parts.push(attributes.size);
    }

    return parts.join(' ');
  }

  /**
   * 比较两个手表产品是否匹配
   * 主要基于型号代码和关键属性
   * @param productName1 产品名称1
   * @param productName2 产品名称2
   * @returns 是否匹配
   */
  compareWatchProducts(productName1: string, productName2: string): boolean {
    // 提取两个产品的属性
    const attrs1 = this.extractWatchAttributes(productName1);
    const attrs2 = this.extractWatchAttributes(productName2);

    // 如果两个都有型号代码，必须匹配
    if (attrs1.modelCode && attrs2.modelCode) {
      return attrs1.modelCode === attrs2.modelCode;
    }

    // 如果没有型号代码，则需要更多属性匹配
    let matchCount = 0;
    let totalAttributes = 0;

    // 比较连接方式
    if (attrs1.connectionType || attrs2.connectionType) {
      totalAttributes++;
      if (attrs1.connectionType === attrs2.connectionType) {
        matchCount++;
      }
    }

    // 比较尺寸
    if (attrs1.size || attrs2.size) {
      totalAttributes++;
      if (attrs1.size === attrs2.size) {
        matchCount++;
      }
    }

    // 比较颜色
    if (attrs1.color || attrs2.color) {
      totalAttributes++;
      if (attrs1.color === attrs2.color) {
        matchCount++;
      }
    }

    // 比较表带材质
    if (attrs1.strapMaterial || attrs2.strapMaterial) {
      totalAttributes++;
      if (attrs1.strapMaterial === attrs2.strapMaterial) {
        matchCount++;
      }
    }

    // 如果没有任何可比较的属性，返回false
    if (totalAttributes === 0) {
      return false;
    }

    // 至少80%的属性匹配才认为是同一产品
    return matchCount / totalAttributes >= 0.8;
  }
}

// 导出单例实例
export const watchRecognizer = new WatchRecognizer();
