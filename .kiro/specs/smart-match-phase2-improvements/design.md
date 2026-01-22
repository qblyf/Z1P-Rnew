# 智能匹配系统第二阶段改进 - 设计文档

## 架构概览

```
输入处理层
    ↓
品牌识别 → 型号提取 → 版本提取 → 颜色提取
    ↓
SPU 匹配层
    ↓
SKU 匹配层
    ↓
结果输出
```

## 设计方案

### 1. 特殊产品类型识别 (PHASE2-1)

#### 设计思路

为不同产品类型设计专门的型号提取规则，通过产品类型检测来选择合适的提取策略。

#### 数据结构

```typescript
// 产品类型定义
type ProductType = 'phone' | 'watch' | 'tablet' | 'laptop' | 'earbuds' | 'band' | 'unknown';

// 产品类型特征
interface ProductTypeFeature {
  keywords: string[];           // 产品类型关键词
  modelPattern: RegExp;         // 型号提取正则
  specialParams: string[];      // 特殊参数（尺寸、屏幕等）
  paramPattern: RegExp;         // 特殊参数提取正则
}

// 产品类型配置
const PRODUCT_TYPE_FEATURES: Record<ProductType, ProductTypeFeature> = {
  watch: {
    keywords: ['watch', 'band', '手表', '手环'],
    modelPattern: /watch\s*(?:gt|se|d|fit|s|x2|ultra)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['mm', '寸', '屏幕', '柔光版', '标准版'],
    paramPattern: /(\d+mm|\d+寸|柔光版|标准版)/g,
  },
  tablet: {
    keywords: ['pad', 'tablet', '平板', 'matepad'],
    modelPattern: /(?:mate\s*)?pad\s*(?:pro|air|se|mini)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['寸', '屏幕', '柔光版', '标准版'],
    paramPattern: /(\d+寸|柔光版|标准版)/g,
  },
  laptop: {
    keywords: ['book', 'laptop', '笔记本', 'matebook'],
    modelPattern: /(?:mate\s*)?book\s*(?:x|d|pro|gt)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['寸', '屏幕', '处理器'],
    paramPattern: /(\d+寸|i\d|ryzen\s*\d)/gi,
  },
  earbuds: {
    keywords: ['buds', '耳机', '耳塞'],
    modelPattern: /buds\s*(?:\d|z|x|pro)?/i,
    specialParams: ['无线', '降噪', '版本'],
    paramPattern: /(无线|降噪|pro|标准版)/g,
  },
  band: {
    keywords: ['band', '手环'],
    modelPattern: /band\s*\d+/i,
    specialParams: ['mm', '屏幕'],
    paramPattern: /(\d+mm|amoled|lcd)/gi,
  },
  phone: {
    keywords: ['phone', '手机', 'pro', 'max', 'ultra'],
    modelPattern: /[a-z0-9\s]+/i,
    specialParams: [],
    paramPattern: /$/,
  },
};
```

#### 实现方法

```typescript
// 检测产品类型
detectProductType(input: string): ProductType {
  const lowerInput = input.toLowerCase();
  
  for (const [type, features] of Object.entries(PRODUCT_TYPE_FEATURES)) {
    for (const keyword of features.keywords) {
      if (lowerInput.includes(keyword)) {
        return type as ProductType;
      }
    }
  }
  
  return 'unknown';
}

// 提取特殊参数
extractSpecialParams(input: string, productType: ProductType): Record<string, string> {
  const features = PRODUCT_TYPE_FEATURES[productType];
  if (!features) return {};
  
  const params: Record<string, string> = {};
  const matches = input.match(features.paramPattern);
  
  if (matches) {
    matches.forEach(match => {
      if (match.includes('mm')) params.size = match;
      if (match.includes('寸')) params.screen = match;
      if (match.includes('版')) params.version = match;
    });
  }
  
  return params;
}

// 改进的型号提取
extractModelByType(input: string, productType: ProductType): string | null {
  const features = PRODUCT_TYPE_FEATURES[productType];
  if (!features) return this.extractModel(input);
  
  // 移除特殊参数
  let cleaned = input;
  const specialParams = this.extractSpecialParams(input, productType);
  
  for (const param of Object.values(specialParams)) {
    cleaned = cleaned.replace(param, '');
  }
  
  // 使用产品类型特定的正则提取型号
  const match = cleaned.match(features.modelPattern);
  if (match) {
    return match[0].toLowerCase().replace(/\s+/g, ' ').trim();
  }
  
  return null;
}
```

---

### 2. 版本/变体处理改进 (PHASE2-2)

#### 设计思路

在 SPU 和 SKU 匹配时都考虑版本信息，提高版本匹配的准确性。

#### 数据结构

```typescript
// 版本信息
interface VersionInfo {
  name: string;           // 版本名称
  keywords: string[];     // 版本关键词
  priority: number;       // 优先级（高优先级优先匹配）
}

const VERSION_KEYWORDS: Record<string, VersionInfo> = {
  'standard': {
    name: '标准版',
    keywords: ['标准版', '基础版'],
    priority: 1,
  },
  'lite': {
    name: '活力版',
    keywords: ['活力版', '轻享版'],
    priority: 2,
  },
  'enjoy': {
    name: '优享版',
    keywords: ['优享版', '享受版'],
    priority: 3,
  },
  'premium': {
    name: '尊享版',
    keywords: ['尊享版', '高端版'],
    priority: 4,
  },
  'pro': {
    name: 'Pro 版',
    keywords: ['pro', 'pro版'],
    priority: 5,
  },
};
```

#### 实现方法

```typescript
// 提取版本信息
extractVersion(input: string): VersionInfo | null {
  const lowerInput = input.toLowerCase();
  
  for (const [key, versionInfo] of Object.entries(VERSION_KEYWORDS)) {
    for (const keyword of versionInfo.keywords) {
      if (lowerInput.includes(keyword)) {
        return versionInfo;
      }
    }
  }
  
  return null;
}

// 改进的 SKU 匹配，考虑版本信息
findBestSKUWithVersion(
  input: string,
  skuList: SKUData[],
  inputVersion: VersionInfo | null
): { sku: SKUData | null; similarity: number } {
  const inputCapacity = this.extractCapacity(input);
  const inputColor = this.extractColor(input);
  
  let bestMatch: SKUData | null = null;
  let bestScore = 0;
  
  for (const sku of skuList) {
    const skuCapacity = this.extractCapacity(sku.name);
    const skuColor = this.extractColor(sku.name);
    const skuVersion = this.extractVersion(sku.name);
    
    let score = 0;
    let weight = 0;
    
    // 版本匹配（权重 30%）
    weight += 0.3;
    if (inputVersion && skuVersion) {
      if (inputVersion.name === skuVersion.name) {
        score += 0.3;  // 版本完全匹配
      } else if (inputVersion.priority === skuVersion.priority) {
        score += 0.25; // 版本优先级匹配
      }
    } else if (!inputVersion && !skuVersion) {
      score += 0.3;  // 都没有版本信息
    }
    
    // 容量匹配（权重 40%）
    weight += 0.4;
    if (inputCapacity && skuCapacity && inputCapacity === skuCapacity) {
      score += 0.4;
    }
    
    // 颜色匹配（权重 30%）
    weight += 0.3;
    if (inputColor && skuColor && this.isColorMatch(inputColor, skuColor)) {
      score += 0.3;
    }
    
    const finalScore = weight > 0 ? score / weight : 0;
    
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = sku;
    }
  }
  
  return { sku: bestMatch, similarity: bestScore };
}
```

---

### 3. 特殊颜色名称识别 (PHASE2-3)

#### 设计思路

扩展颜色识别库，支持更多特殊颜色名称和相似颜色匹配。

#### 数据结构

```typescript
// 颜色分类
type ColorCategory = 'black' | 'white' | 'blue' | 'red' | 'green' | 'purple' | 'pink' | 'gold' | 'silver' | 'gray' | 'brown' | 'cyan';

// 颜色信息
interface ColorInfo {
  name: string;           // 颜色名称
  category: ColorCategory; // 颜色分类
  variants: string[];     // 颜色变体
  aliases: string[];      // 颜色别名
}

const EXTENDED_COLOR_MAP: Record<string, ColorInfo> = {
  '玉石绿': {
    name: '玉石绿',
    category: 'green',
    variants: ['玉龙雪', '原野绿'],
    aliases: ['玉绿', '石绿'],
  },
  '玛瑙粉': {
    name: '玛瑙粉',
    category: 'pink',
    variants: ['晶钻粉', '粉梦生花'],
    aliases: ['玛粉', '瑙粉'],
  },
};
```

#### 实现方法

```typescript
// 改进的颜色提取
extractColorAdvanced(input: string): string | null {
  // 方法 1: 使用扩展颜色库
  for (const [colorName, colorInfo] of Object.entries(EXTENDED_COLOR_MAP)) {
    if (input.includes(colorName)) {
      return colorName;
    }
    // 检查别名
    for (const alias of colorInfo.aliases) {
      if (input.includes(alias)) {
        return colorName;
      }
    }
  }
  
  // 方法 2: 使用动态颜色列表
  if (this.dynamicColors.length > 0) {
    for (const color of this.dynamicColors) {
      if (input.includes(color)) {
        return color;
      }
    }
  }
  
  // 方法 3: 从字符串末尾提取
  const lastWords = input.match(/[\u4e00-\u9fa5]{2,5}$/);
  if (lastWords) {
    return lastWords[0];
  }
  
  return null;
}

// 改进的颜色匹配
isColorMatchAdvanced(color1: string, color2: string): boolean {
  if (!color1 || !color2) return false;
  
  // 完全匹配
  if (color1 === color2) return true;
  
  // 查找颜色信息
  const info1 = EXTENDED_COLOR_MAP[color1];
  const info2 = EXTENDED_COLOR_MAP[color2];
  
  // 变体匹配
  if (info1 && info1.variants.includes(color2)) return true;
  if (info2 && info2.variants.includes(color1)) return true;
  
  // 分类匹配
  if (info1 && info2 && info1.category === info2.category) {
    return true;
  }
  
  // 基础颜色匹配
  const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青'];
  for (const basic of basicColors) {
    if (color1.includes(basic) && color2.includes(basic)) {
      return true;
    }
  }
  
  return false;
}
```

---

### 4. 产品名称格式统一 (PHASE2-4)

#### 设计思路

改进输入预处理，处理各种格式差异，使输入与系统中的产品名称格式一致。

#### 实现方法

```typescript
// 改进的输入预处理
preprocessInputAdvanced(input: string): string {
  let processed = input;
  
  // 1. 处理空格变体
  // "Reno15" → "Reno 15"
  processed = processed.replace(/(\D)(\d)/g, '$1 $2');
  processed = processed.replace(/(\d)([A-Za-z])/g, '$1 $2');
  
  // 2. 处理大小写
  // 保持首字母大写，其余小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 3. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  // 4. 处理特殊字符
  // "（" → "(", "）" → ")"
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 5. 移除型号代码（括号内的内容）
  // "WatchGT6 (WA2456C)" → "WatchGT6"
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 6. 清理最终空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
}
```

---

### 5. 多品牌混淆处理 (PHASE2-5)

#### 设计思路

改进品牌识别优先级，添加反向确认逻辑，使用型号信息进行品牌验证。

#### 实现方法

```typescript
// 改进的品牌识别，带优先级
extractBrandWithPriority(input: string): { brand: string; confidence: number } | null {
  const lowerInput = input.toLowerCase();
  
  // 优先级 1: 产品品牌（高优先级）
  const productBrands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus'];
  for (const brand of productBrands) {
    if (lowerInput.includes(brand)) {
      return { brand, confidence: 0.9 };
    }
  }
  
  // 优先级 2: 子品牌（中优先级）
  const subBrands = ['redmi', 'nova', 'mate', 'reno', 'find'];
  for (const brand of subBrands) {
    if (lowerInput.includes(brand)) {
      return { brand, confidence: 0.7 };
    }
  }
  
  // 优先级 3: 配件品牌（低优先级）
  const accessoryBrands = ['优诺严选', '品牌', '赠品'];
  for (const brand of accessoryBrands) {
    if (lowerInput.includes(brand)) {
      return { brand, confidence: 0.3 };
    }
  }
  
  return null;
}

// 反向确认：使用型号验证品牌
verifyBrandByModel(brand: string, model: string): boolean {
  // 构建品牌-型号映射
  const brandModelMap: Record<string, string[]> = {
    'xiaomi': ['redmi', 'mi', 'poco'],
    'huawei': ['mate', 'nova', 'p', 'watch'],
    'oppo': ['reno', 'find', 'a', 'k'],
    'vivo': ['x', 'y', 'iqoo', 's'],
  };
  
  const expectedModels = brandModelMap[brand] || [];
  const lowerModel = model.toLowerCase();
  
  for (const expectedModel of expectedModels) {
    if (lowerModel.includes(expectedModel)) {
      return true;
    }
  }
  
  return false;
}
```

---

## 集成方案

### 改进的 handleMatch 流程

```typescript
const handleMatch = async () => {
  for (let i = 0; i < lines.length; i++) {
    let trimmedLine = lines[i].trim();
    
    // 1. 清理演示机标记（第一阶段）
    trimmedLine = matcher.cleanDemoMarkers(trimmedLine);
    
    // 2. 改进的输入预处理（第二阶段）
    trimmedLine = matcher.preprocessInputAdvanced(trimmedLine);
    
    // 3. 检测产品类型（第二阶段）
    const productType = matcher.detectProductType(trimmedLine);
    
    // 4. 提取品牌（改进版）
    const brandResult = matcher.extractBrandWithPriority(trimmedLine);
    const brand = brandResult?.brand || null;
    
    // 5. 提取型号（按产品类型）
    const model = matcher.extractModelByType(trimmedLine, productType);
    
    // 6. 验证品牌（反向确认）
    if (brand && model && !matcher.verifyBrandByModel(brand, model)) {
      // 品牌验证失败，尝试从型号推断品牌
      // ...
    }
    
    // 7. 提取版本信息（第二阶段）
    const version = matcher.extractVersion(trimmedLine);
    
    // 8. 提取颜色（改进版）
    const color = matcher.extractColorAdvanced(trimmedLine);
    
    // 9. 匹配 SPU
    const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
      trimmedLine,
      spuList,
      0.5
    );
    
    // 10. 匹配 SKU（考虑版本）
    if (matchedSPU && matchedSPU.skuIDs && matchedSPU.skuIDs.length > 0) {
      const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKUWithVersion(
        trimmedLine,
        matchedSPU.skuIDs,
        version
      );
      
      // 记录结果
      // ...
    }
  }
};
```

---

## 测试策略

### 单元测试
- 产品类型检测
- 版本提取
- 颜色识别
- 输入预处理
- 品牌验证

### 集成测试
- 完整的匹配流程
- 多个修复的组合效果

### 回归测试
- 确保第一阶段的修复仍然有效
- 确保新修复不会破坏现有功能

---

## 性能考虑

- 产品类型检测：O(1) - 使用关键词匹配
- 版本提取：O(1) - 使用关键词匹配
- 颜色识别：O(n) - n 为颜色库大小
- 输入预处理：O(m) - m 为输入长度
- 总体性能影响：可忽略
