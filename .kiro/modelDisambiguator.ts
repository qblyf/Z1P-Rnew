/**
 * Model Disambiguator
 * 型号消歧器 - 区分相似型号
 * 
 * 职责：
 * - 提取完整型号（包括后缀）
 * - 判断型号是否完全匹配
 * - 计算型号匹配分数
 * - 将后缀（mini、Plus等）视为型号的一部分
 */

export class ModelDisambiguator {
  // 型号后缀列表（这些后缀是型号的一部分，不是可选属性）
  private readonly modelSuffixes = [
    'Pro',
    'Max',
    'Mini',
    'Plus',
    'Ultra',
    'SE',
    'Air',
    'Turbo',
    'Lite',
    'Note',
    'Edge',
    'Fold',
    'Flip',
    'X',
    'S',
    'R',
    'T',
    'GT',
    'RS',
    'Neo',
    'Ace',
  ];

  /**
   * 提取完整型号（包括后缀）
   * @param productName 产品名称
   * @returns 完整型号（如"X200 Pro mini"），如果没有找到返回null
   */
  extractFullModel(productName: string): string | null {
    if (!productName) return null;

    // 标准化输入（统一大小写和空格）
    const normalized = productName.trim();

    // 型号模式：品牌 + 型号代码 + 可选后缀
    // 例如：VIVO X200 Pro mini, OPPO A5 Pro, IQOO Z10 Turbo
    // 也支持：Mate60 Pro, Reno12 Pro, Magic6 Pro, 14 Ultra, 15 Pro
    // 也支持：Z10 Turbo+（带+号的变体）
    
    // 匹配模式：
    // 1. 字母+数字组合（如X200、A5、Z10、Mate60、Reno12）或纯数字（如14、15）
    // 2. 可选的后缀（Pro、Max、Mini等）
    // 3. 可选的第二个后缀（如Pro mini、Max Plus）
    // 4. 可选的+号（如Turbo+）
    
    // 首先尝试匹配完整的型号模式（带空格）
    // 支持单字母型号（X200）、多字母型号（Mate60、Reno12）和纯数字型号（14、15）
    // 支持后缀后的+号（如Turbo+）
    const fullModelPattern = /\b((?:[A-Z][a-z]*)?(\d+)(?:[A-Z])?(?:\s+(?:Pro|Max|Mini|Plus|Ultra|SE|Air|Turbo|Lite|Note|Edge|Fold|Flip|X|S|R|T|GT|RS|Neo|Ace)(?:\+)?)*)/i;
    const fullMatch = normalized.match(fullModelPattern);
    
    if (fullMatch) {
      // 标准化大小写（保持型号代码大写，后缀使用标准大小写）
      // 保留+号
      let model = fullMatch[1];
      return this.normalizeModelCase(model);
    }

    // 尝试匹配没有空格的型号模式（如VIVOX200Pro, VivoS30Promini）
    // 匹配：字母+数字+可选后缀（无空格）
    const noSpacePattern = /((?:[A-Z][a-z]*)?(\d+)(?:[A-Z])?)((?:Pro|Max|Mini|Plus|Ultra|SE|Air|Turbo|Lite|Note|Edge|Fold|Flip|GT|RS|Neo|Ace)+)(\+)?/i;
    const noSpaceMatch = normalized.match(noSpacePattern);
    
    if (noSpaceMatch) {
      // 提取型号代码和后缀
      const modelCode = noSpaceMatch[1];
      const suffixes = noSpaceMatch[3];
      const plusSign = noSpaceMatch[4] || '';
      
      // 将后缀分割成单独的后缀（如"Promini" -> ["Pro", "mini"]）
      const splitSuffixes = this.splitSuffixes(suffixes);
      
      // 组合型号代码和后缀，保留+号
      const fullModel = modelCode + ' ' + splitSuffixes.join(' ') + plusSign;
      
      // 标准化大小写
      return this.normalizeModelCase(fullModel);
    }

    // 如果没有匹配到完整模式，尝试只匹配型号代码
    // 支持单字母（X200）、多字母（Mate60）和纯数字（14）型号
    const basicModelPattern = /\b((?:[A-Z][a-z]*)?(\d+)[A-Z]?)\b/i;
    const basicMatch = normalized.match(basicModelPattern);
    
    if (basicMatch) {
      return this.normalizeModelCase(basicMatch[1]);
    }

    return null;
  }

  /**
   * 将连续的后缀字符串分割成单独的后缀
   * @param suffixes 连续的后缀字符串（如"Promini"）
   * @returns 分割后的后缀数组（如["Pro", "mini"]）
   */
  private splitSuffixes(suffixes: string): string[] {
    const result: string[] = [];
    let remaining = suffixes;

    // 按从长到短的顺序尝试匹配后缀
    const sortedSuffixes = [...this.modelSuffixes].sort((a, b) => b.length - a.length);

    while (remaining.length > 0) {
      let matched = false;

      for (const suffix of sortedSuffixes) {
        const pattern = new RegExp(`^${suffix}`, 'i');
        if (pattern.test(remaining)) {
          result.push(suffix);
          remaining = remaining.substring(suffix.length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // 如果没有匹配到任何后缀，跳过当前字符
        remaining = remaining.substring(1);
      }
    }

    return result;
  }

  /**
   * 标准化型号大小写
   * @param model 原始型号
   * @returns 标准化后的型号
   */
  private normalizeModelCase(model: string): string {
    if (!model) return '';

    let result = model;

    // 将型号代码部分转为标准大小写
    // 对于单字母型号（X200），首字母大写
    // 对于多字母型号（Mate60），首字母大写，其余小写
    result = result.replace(/^([a-z]+)(\d+)/i, (match, letters, digits) => {
      // 首字母大写，其余小写
      return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase() + digits;
    });

    // 标准化后缀大小写
    for (const suffix of this.modelSuffixes) {
      const pattern = new RegExp(`\\b${suffix}\\b`, 'gi');
      result = result.replace(pattern, suffix);
    }

    return result;
  }

  /**
   * 判断两个型号是否完全匹配
   * @param model1 型号1
   * @param model2 型号2
   * @returns 是否完全匹配
   */
  modelsExactMatch(model1: string | null, model2: string | null): boolean {
    // 如果两个都为空，认为匹配
    if (!model1 && !model2) {
      return true;
    }

    // 如果只有一个为空，认为不匹配
    if (!model1 || !model2) {
      return false;
    }

    // 标准化两个型号（去除空格、统一大小写）
    const normalized1 = this.normalizeModelForComparison(model1);
    const normalized2 = this.normalizeModelForComparison(model2);

    // 完全匹配
    return normalized1 === normalized2;
  }

  /**
   * 标准化型号用于比较
   * @param model 型号
   * @returns 标准化后的型号
   */
  private normalizeModelForComparison(model: string): string {
    return model
      .toLowerCase()
      .replace(/\s+/g, '')  // 去除所有空格
      .trim();
  }

  /**
   * 计算型号匹配分数
   * @param inputModel 输入型号
   * @param candidateModel 候选型号
   * @returns 匹配分数（0-1）
   */
  calculateModelMatchScore(inputModel: string | null, candidateModel: string | null): number {
    // 如果两个都为空，返回1.0（完全匹配）
    if (!inputModel && !candidateModel) {
      return 1.0;
    }

    // 如果只有一个为空，返回0.0（不匹配）
    if (!inputModel || !candidateModel) {
      return 0.0;
    }

    // 标准化两个型号
    const normalized1 = this.normalizeModelForComparison(inputModel);
    const normalized2 = this.normalizeModelForComparison(candidateModel);

    // 完全匹配：返回1.0
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // 检查是否为部分匹配（一个是另一个的前缀）
    // 例如：X200 vs X200 Pro
    if (normalized1.startsWith(normalized2) || normalized2.startsWith(normalized1)) {
      // 获取较短和较长的型号
      const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
      const longer = normalized1.length < normalized2.length ? normalized2 : normalized1;

      // 检查较长的型号是否只是在较短的型号后面添加了后缀
      const suffix = longer.substring(shorter.length);

      // 如果后缀是已知的型号后缀，则认为是不同的型号（不是部分匹配）
      // 例如：X200 Pro 不应该匹配 X200 Pro mini
      const hasSuffix = this.modelSuffixes.some(s => 
        suffix.toLowerCase().includes(s.toLowerCase())
      );

      if (hasSuffix) {
        // 这是不同的型号，返回0.0
        return 0.0;
      } else {
        // 这可能是部分匹配（如X200 vs X200活力版），返回0.5
        return 0.5;
      }
    }

    // 检查基础型号是否相同（忽略后缀）
    // 例如：X200 Pro vs X200 Max
    const baseModel1 = this.extractBaseModel(normalized1);
    const baseModel2 = this.extractBaseModel(normalized2);

    if (baseModel1 === baseModel2) {
      // 基础型号相同但后缀不同，返回0.3
      return 0.3;
    }

    // 完全不匹配：返回0.0
    return 0.0;
  }

  /**
   * 提取基础型号（不包括后缀）
   * @param normalizedModel 标准化后的型号
   * @returns 基础型号
   */
  private extractBaseModel(normalizedModel: string): string {
    // 移除所有已知的后缀
    let baseModel = normalizedModel;

    for (const suffix of this.modelSuffixes) {
      const lowerSuffix = suffix.toLowerCase();
      // 从末尾移除后缀
      if (baseModel.endsWith(lowerSuffix)) {
        baseModel = baseModel.substring(0, baseModel.length - lowerSuffix.length);
      }
    }

    return baseModel.trim();
  }

  /**
   * 判断一个型号是否包含另一个型号（考虑后缀）
   * 用于排除相似但不同的型号
   * @param inputModel 输入型号
   * @param candidateModel 候选型号
   * @returns 是否应该排除候选型号
   */
  shouldExcludeCandidate(inputModel: string | null, candidateModel: string | null): boolean {
    if (!inputModel || !candidateModel) {
      return false;
    }

    // 标准化两个型号
    const normalized1 = this.normalizeModelForComparison(inputModel);
    const normalized2 = this.normalizeModelForComparison(candidateModel);

    // 如果完全匹配，不排除
    if (normalized1 === normalized2) {
      return false;
    }

    // 检查候选型号是否包含输入型号作为前缀，并且有额外的后缀
    // 例如：输入"X200 Pro"，候选"X200 Pro mini" -> 应该排除
    if (normalized2.startsWith(normalized1)) {
      const suffix = normalized2.substring(normalized1.length);
      
      // 如果后缀是已知的型号后缀，则排除
      const hasSuffix = this.modelSuffixes.some(s => 
        suffix.toLowerCase().includes(s.toLowerCase())
      );

      return hasSuffix;
    }

    // 检查输入型号是否包含候选型号作为前缀，并且有额外的后缀
    // 例如：输入"X200 Pro mini"，候选"X200 Pro" -> 不排除（候选更通用）
    if (normalized1.startsWith(normalized2)) {
      // 不排除更通用的候选型号
      return false;
    }

    return false;
  }

  /**
   * 获取所有支持的型号后缀
   * 用于调试和测试
   * @returns 型号后缀列表
   */
  getSupportedSuffixes(): string[] {
    return [...this.modelSuffixes];
  }
}

// 导出单例实例
export const modelDisambiguator = new ModelDisambiguator();
