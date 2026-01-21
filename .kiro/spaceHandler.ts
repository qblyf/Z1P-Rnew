/**
 * Space Handler
 * 空格处理器 - 标准化型号名称中的空格
 * 
 * 职责：
 * - 识别品牌后的空格（IQOO、OPPO、VIVO、Hi等）
 * - 识别型号后缀前的空格（Pro、Max、Mini、Plus、Ultra、SE、Air、Turbo等）
 * - 处理特殊情况（Ace系列、MateBook系列）
 * - 清理多余空格
 */

export class SpaceHandler {
  // 品牌列表（需要在品牌后添加空格）
  private readonly brands = [
    'IQOO',
    'OPPO',
    'VIVO',
    'Hi',
  ];

  // 型号后缀列表（需要在后缀前添加空格）
  private readonly suffixes = [
    'Pro',
    'Max',
    'Mini',
    'Plus',
    'Ultra',
    'SE',
    'Air',
    'Turbo',
    '竞速版',
    '至尊版',
    '活力版',
    '标准版',
    '青春版',
    '极速版',
  ];

  /**
   * 标准化型号名称中的空格
   * @param modelName 原始型号名称
   * @returns 标准化后的型号名称
   */
  normalizeSpaces(modelName: string): string {
    if (!modelName) return '';

    let normalized = modelName;

    // 0. 先处理全角/半角符号（在处理空格前）
    normalized = this.normalizeFullWidthChars(normalized);

    // 1. 品牌后添加空格
    normalized = this.addSpaceAfterBrand(normalized);

    // 2. 型号后缀前添加空格
    normalized = this.addSpaceBeforeSuffix(normalized);

    // 3. 处理特殊情况
    normalized = this.handleSpecialCases(normalized);

    // 4. 清理多余空格
    normalized = this.cleanupSpaces(normalized);

    return normalized;
  }

  /**
   * 标准化全角/半角字符
   * @param str 输入字符串
   * @returns 处理后的字符串
   */
  private normalizeFullWidthChars(str: string): string {
    return str
      .replace(/＋/g, '+')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/【/g, '[')
      .replace(/】/g, ']')
      .replace(/，/g, ',')
      .replace(/。/g, '.')
      .replace(/；/g, ';')
      .replace(/：/g, ':')
      .replace(/　/g, ' ');  // 全角空格转半角
  }

  /**
   * 识别并处理品牌后的空格
   * @param str 输入字符串
   * @returns 处理后的字符串
   */
  private addSpaceAfterBrand(str: string): string {
    let result = str;

    // 处理 IQOO、OPPO、VIVO、Hi 等品牌
    // 例如：IQOOZ10 -> IQOO Z10, OPPOA5 -> OPPO A5
    for (const brand of this.brands) {
      // 大写版本
      const upperPattern = new RegExp(`^(${brand})([A-Z0-9])`, 'g');
      result = result.replace(upperPattern, '$1 $2');

      // 小写版本
      const lowerBrand = brand.toLowerCase();
      const lowerPattern = new RegExp(`^(${lowerBrand})([a-z0-9])`, 'gi');
      result = result.replace(lowerPattern, '$1 $2');
    }

    // 处理 MateBook 系列（特殊处理，保持原始大小写）
    // MateBookD16 -> MateBook D 16
    // MateBook16S -> MateBook 16 S
    // 使用回调函数保持原始大小写
    result = result.replace(/matebook([a-z])(\d+)/gi, (match, letter, digits) => {
      // 保持 MateBook 的原始大小写
      const matebookPart = match.substring(0, 8); // "MateBook" or "matebook"
      return `${matebookPart} ${letter} ${digits}`;
    });
    result = result.replace(/matebook(\d+)([a-z])/gi, (match, digits, letter) => {
      // 保持 MateBook 的原始大小写
      const matebookPart = match.substring(0, 8); // "MateBook" or "matebook"
      return `${matebookPart} ${digits} ${letter}`;
    });
    result = result.replace(/matebook([a-z])/gi, (match, letter) => {
      // 保持 MateBook 的原始大小写
      const matebookPart = match.substring(0, 8); // "MateBook" or "matebook"
      return `${matebookPart} ${letter}`;
    });

    return result;
  }

  /**
   * 识别并处理型号后缀前的空格
   * @param str 输入字符串
   * @returns 处理后的字符串
   */
  private addSpaceBeforeSuffix(str: string): string {
    let result = str;

    // 处理型号和版本之间添加空格
    // 例如：Z10Turbo -> Z10 Turbo, A5Pro -> A5 Pro, A5活力版 -> A5 活力版
    // 也处理 Z10Turbo+ -> Z10 Turbo+（在Turbo后添加空格，但保留+号）
    for (const suffix of this.suffixes) {
      // 英文后缀（大小写不敏感）
      if (/^[A-Za-z]+$/.test(suffix)) {
        // 匹配：字母或数字 + 后缀 + 可选的+号
        // 使用回调函数来保持后缀的标准大小写
        const pattern = new RegExp(`([A-Z0-9])(${suffix})(\\+)?`, 'gi');
        result = result.replace(pattern, (match, prefix, foundSuffix, plus) => {
          // 使用标准的后缀大小写（从 this.suffixes 中获取）
          return `${prefix} ${suffix}${plus || ''}`;
        });
      } else {
        // 中文后缀
        const pattern = new RegExp(`([A-Z0-9])(${suffix})(\\+)?`, 'g');
        result = result.replace(pattern, '$1 $2$3');
      }
    }

    // 处理大小写不一致（A5x -> A5X, A5pro -> A5 Pro）
    // 这些规则会覆盖上面的通用规则，确保正确的大小写
    result = result.replace(/([A-Z]\d+)x\b/gi, '$1X');
    result = result.replace(/([A-Z]\d+)pro\b/gi, '$1 Pro');
    result = result.replace(/([A-Z]\d+)max\b/gi, '$1 Max');
    result = result.replace(/([A-Z]\d+)plus\b/gi, '$1 Plus');
    result = result.replace(/([A-Z]\d+)ultra\b/gi, '$1 Ultra');
    result = result.replace(/([A-Z]\d+)mini\b/gi, '$1 Mini');
    result = result.replace(/([A-Z]\d+)se\b/gi, '$1 SE');
    result = result.replace(/([A-Z]\d+)air\b/gi, '$1 Air');

    // 数字和中文之间添加空格
    result = result.replace(/(\d)([一-龥])/g, '$1 $2');
    
    // 字母和中文之间添加空格（如 GB版 -> GB 版）
    result = result.replace(/([A-Za-z])([一-龥])/g, '$1 $2');

    return result;
  }

  /**
   * 处理特殊情况
   * @param str 输入字符串
   * @returns 处理后的字符串
   */
  private handleSpecialCases(str: string): string {
    let result = str;

    // 特殊处理 Ace 系列（在其他处理前）
    // ACE5 -> Ace 5, ace5 -> Ace 5
    result = result.replace(/ACE(\d)/gi, 'Ace $1');
    result = result.replace(/ace(\d)/gi, 'Ace $1');

    return result;
  }

  /**
   * 清理多余空格
   * @param str 输入字符串
   * @returns 处理后的字符串
   */
  private cleanupSpaces(str: string): string {
    return str
      .replace(/\s+/g, ' ')  // 多个空格替换为单个空格
      .trim();               // 去除首尾空格
  }
}

// 导出单例实例
export const spaceHandler = new SpaceHandler();
