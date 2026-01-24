/**
 * 颜色匹配服务类
 * 统一管理所有颜色相关的匹配逻辑
 */

// 颜色匹配分数常量
export const COLOR_MATCH_SCORES = {
  EXACT: 1.0,      // 完全匹配
  VARIANT: 0.9,    // 颜色变体匹配
  BASIC: 0.5,      // 基础颜色匹配
} as const;

export class ColorMatcher {
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
    // 方法1: 使用配置的颜色变体库
    if (this.colorVariantsMap.size > 0) {
      for (const [colorName, variants] of this.colorVariantsMap.entries()) {
        if (input.includes(colorName)) {
          return colorName;
        }
        for (const variant of variants) {
          if (input.includes(variant)) {
            return colorName; // 返回主颜色名
          }
        }
      }
    }
    
    // 方法2: 使用动态颜色列表
    if (this.dynamicColors.length > 0) {
      for (const color of this.dynamicColors) {
        if (input.includes(color)) {
          return color;
        }
      }
    }
    
    // 方法3: 从字符串末尾提取
    const lastWords = input.match(/[\u4e00-\u9fa5]{2,5}$/);
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
