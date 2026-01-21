/**
 * Version Extractor
 * 版本提取器 - 提取产品版本标识
 * 
 * 职责：
 * - 识别常见版本标识词汇（活力版、标准版、青春版、至尊版、竞速版、极速版等）
 * - 提取版本标识
 * - 判断版本是否匹配
 */

export class VersionExtractor {
  // 版本标识词汇列表（按从长到短排序，优先匹配更具体的版本名称）
  private readonly versionKeywords = [
    '全网通5G版',
    '全网通版',
    '竞速版',
    '至尊版',
    '活力版',
    '标准版',
    '青春版',
    '极速版',
    '旗舰版',
    '尊享版',
    '典藏版',
    '纪念版',
    '限定版',
    '特别版',
    '周年版',
    '定制版',
    '专业版',
    '大师版',
    '先锋版',
    '探索版',
    '畅享版',
    '轻享版',
    '潮流版',
    '时尚版',
    '经典版',
    '豪华版',
    '精英版',
    '荣耀版',
    '冠军版',
    '传奇版',
    '超能版',
    '超级版',
    '增强版',
    '升级版',
    '进阶版',
    '高配版',
    '低配版',
    '入门版',
    '基础版',
    '简化版',
    '简约版',
    '纯净版',
    '素皮版',
    '玻璃版',
    '陶瓷版',
    '钛金版',
    '国行版',
    '港版',
    '美版',
    '欧版',
    '日版',
    '韩版',
    '国际版',
    '中国版',
    '移动版',
    '联通版',
    '电信版',
    '双卡版',
    '单卡版',
    '5G版',
    '4G版',
    '3G版',
  ];

  /**
   * 提取版本标识
   * @param productName 产品名称
   * @returns 版本标识（如"活力版"），如果没有找到返回null
   */
  extractVersion(productName: string): string | null {
    if (!productName) return null;

    const lowerStr = productName.toLowerCase().trim();

    // 按从长到短的顺序匹配，优先匹配更具体的版本名称
    for (const version of this.versionKeywords) {
      const lowerVersion = version.toLowerCase();
      
      // 检查是否包含版本关键词
      if (lowerStr.includes(lowerVersion)) {
        // 返回原始版本名称（保持大小写）
        return version;
      }
    }

    // 尝试匹配其他可能的版本模式
    // 例如：V1、V2、Gen 1、Gen 2、第一代、第二代等
    const versionPatterns = [
      /\bV(\d+)\b/i,           // V1, V2, V3...
      /\bGen\s*(\d+)\b/i,      // Gen 1, Gen 2, Gen2...
      /第([一二三四五六七八九十]+)代/,  // 第一代、第二代...
      /(\d+)代/,               // 1代、2代...
    ];

    for (const pattern of versionPatterns) {
      const match = productName.match(pattern);
      if (match) {
        // 返回匹配到的完整版本字符串
        return match[0];
      }
    }

    return null;
  }

  /**
   * 判断两个版本是否匹配
   * @param version1 版本1
   * @param version2 版本2
   * @returns 是否匹配
   */
  versionsMatch(version1: string | null, version2: string | null): boolean {
    // 如果两个都为空，认为匹配（都没有版本信息）
    if (!version1 && !version2) {
      return true;
    }

    // 如果只有一个为空，认为不匹配
    if (!version1 || !version2) {
      return false;
    }

    // 标准化版本字符串（去除空格、统一小写）
    const normalizedVersion1 = this.normalizeVersion(version1);
    const normalizedVersion2 = this.normalizeVersion(version2);

    // 完全匹配
    if (normalizedVersion1 === normalizedVersion2) {
      return true;
    }

    // 处理同义词和变体
    // 例如："5G版" 和 "全网通5G版" 可能是同一个版本
    if (this.areSynonyms(normalizedVersion1, normalizedVersion2)) {
      return true;
    }

    return false;
  }

  /**
   * 标准化版本字符串
   * @param version 版本字符串
   * @returns 标准化后的版本字符串
   */
  private normalizeVersion(version: string): string {
    return version
      .toLowerCase()
      .replace(/\s+/g, '')  // 去除所有空格
      .trim();
  }

  /**
   * 判断两个版本是否为同义词或变体
   * @param version1 标准化后的版本1
   * @param version2 标准化后的版本2
   * @returns 是否为同义词
   */
  private areSynonyms(version1: string, version2: string): boolean {
    // 定义同义词组
    const synonymGroups = [
      ['5g版', '全网通5g版'],
      ['4g版', '全网通4g版'],
      ['标准版', '基础版', '入门版'],
      ['旗舰版', '至尊版', '尊享版'],
      ['青春版', '轻享版', '畅享版'],
      ['竞速版', '极速版', '超能版'],
      ['国行版', '中国版'],
      ['港版', '香港版'],
      ['美版', '美国版'],
      ['欧版', '欧洲版'],
      ['日版', '日本版'],
      ['韩版', '韩国版'],
    ];

    // 检查是否在同一个同义词组中
    for (const group of synonymGroups) {
      if (group.includes(version1) && group.includes(version2)) {
        return true;
      }
    }

    // 检查是否一个版本包含另一个版本
    // 例如："全网通5G版" 包含 "5G版"
    if (version1.includes(version2) || version2.includes(version1)) {
      // 但要确保不是完全不相关的包含
      // 例如："活力版" 不应该匹配 "力"
      const minLength = Math.min(version1.length, version2.length);
      if (minLength >= 2) {  // 至少2个字符才认为是有效的包含关系
        return true;
      }
    }

    return false;
  }

  /**
   * 从产品名称中移除版本标识
   * 用于在匹配时忽略版本差异
   * @param productName 产品名称
   * @returns 移除版本标识后的产品名称
   */
  removeVersion(productName: string): string {
    if (!productName) return '';

    let result = productName;
    const version = this.extractVersion(productName);

    if (version) {
      // 移除版本标识及其周围的空格
      result = result.replace(version, '').replace(/\s+/g, ' ').trim();
    }

    return result;
  }

  /**
   * 获取所有支持的版本关键词
   * 用于调试和测试
   * @returns 版本关键词列表
   */
  getSupportedVersions(): string[] {
    return [...this.versionKeywords];
  }
}

// 导出单例实例
export const versionExtractor = new VersionExtractor();
