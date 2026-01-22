# 智能匹配系统修复方案

## 一、品牌识别库扩展

### 当前问题
- 缺少子品牌识别（红米、荣耀等）
- 某些品牌的中英文混合形式无法识别

### 修复方案

```typescript
// 在 SmartMatch.tsx 中扩展品牌识别

const BRAND_MAPPING: Record<string, string> = {
  // 主品牌
  'apple': 'apple',
  'huawei': 'huawei',
  'honor': 'honor',
  'xiaomi': 'xiaomi',
  'vivo': 'vivo',
  'oppo': 'oppo',
  'samsung': 'samsung',
  'oneplus': 'oneplus',
  'realme': 'realme',
  'iqoo': 'iqoo',
  
  // 子品牌 - 小米
  'redmi': 'xiaomi',
  '红米': 'xiaomi',
  
  // 子品牌 - 华为
  'honor': 'honor',
  '荣耀': 'honor',
  'nova': 'huawei',
  'mate': 'huawei',
  'pura': 'huawei',
  'pocket': 'huawei',
  'matex': 'huawei',
  'matepad': 'huawei',
  'matebook': 'huawei',
  
  // 子品牌 - OPPO
  'reno': 'oppo',
  'find': 'oppo',
  'pad': 'oppo',
  
  // 子品牌 - vivo
  'iqoo': 'vivo',
  'iqoo': 'vivo',
  
  // 中文品牌
  '苹果': 'apple',
  '华为': 'huawei',
  '荣耀': 'honor',
  '小米': 'xiaomi',
  '红米': 'xiaomi',
  '欧珀': 'oppo',
  '一加': 'oneplus',
};

// 改进的品牌提取方法
extractBrand(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  // 首先检查完整品牌名称
  for (const [brand, normalized] of Object.entries(BRAND_MAPPING)) {
    if (lowerStr.includes(brand)) {
      return normalized;
    }
  }
  
  return null;
}
```

---

## 二、型号标准化完善

### 当前问题
- MODEL_NORMALIZATIONS 映射不完整
- 无法处理空格变体
- 特殊产品类型（手表、平板）的型号格式不同

### 修复方案

```typescript
// 扩展 MODEL_NORMALIZATIONS
const MODEL_NORMALIZATIONS: Record<string, string> = {
  // 现有映射
  'promini': 'pro mini',
  'promax': 'pro max',
  'proplus': 'pro plus',
  
  // 手表型号
  'watchgt': 'watch gt',
  'watchse': 'watch se',
  'watch3': 'watch 3',
  'watch4': 'watch 4',
  'watch5': 'watch 5',
  'watch6': 'watch 6',
  'watch7': 'watch 7',
  'watchd': 'watch d',
  'watchd2': 'watch d2',
  'watchfit': 'watch fit',
  'watchx2mini': 'watch x2 mini',
  'watchs': 'watch s',
  
  // 手环型号
  'band3': 'band 3',
  'band4': 'band 4',
  'band5': 'band 5',
  'band6': 'band 6',
  'band7': 'band 7',
  'band8': 'band 8',
  'band9': 'band 9',
  'band10': 'band 10',
  
  // 耳机型号
  'buds3': 'buds 3',
  'buds4': 'buds 4',
  'buds5': 'buds 5',
  'budsz': 'buds z',
  'budsx': 'buds x',
  
  // 手机型号
  'xnote': 'x note',
  'xfold': 'x fold',
  'xflip': 'x flip',
  'xfold5': 'x fold5',
  'xfold6': 'x fold6',
  'xfold7': 'x fold7',
  
  // 平板型号
  'matepad': 'mate pad',
  'matepadpro': 'mate pad pro',
  'matepadair': 'mate pad air',
  'matepadse': 'mate pad se',
  'matepadmini': 'mate pad mini',
  
  // 笔记本型号
  'matebook': 'mate book',
  'matebookx': 'mate book x',
  'matebookd': 'mate book d',
  'matebookpro': 'mate book pro',
  'matebookgt': 'mate book gt',
  
  // OPPO 产品
  'reno15': 'reno 15',
  'reno15pro': 'reno 15 pro',
  'reno15c': 'reno 15c',
  'findx9': 'find x9',
  'findx9pro': 'find x9 pro',
  'findn5': 'find n5',
  'a5pro': 'a5 pro',
  'a5x': 'a5x',
  'a6pro': 'a6 pro',
  'a6': 'a6',
  
  // vivo 产品
  'y300i': 'y300i',
  'y300pro': 'y300 pro',
  'y300proplus': 'y300 pro plus',
  'y50i': 'y50i',
  's30promini': 's30 pro mini',
  's50promini': 's50 pro mini',
  'xfold5': 'x fold5',
  'x200pro': 'x200 pro',
  'x200s': 'x200s',
  'x200ultra': 'x200 ultra',
  'x300pro': 'x300 pro',
};

// 改进的型号提取方法，处理空格变体
extractModel(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  // 步骤1: 移除括号内的型号代码
  let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
  
  // 步骤1.5: 提取并移除品牌
  const brands = Object.values(BRAND_MAPPING);
  for (const brand of brands) {
    const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
  }
  
  normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
  
  // 步骤2: 应用 MODEL_NORMALIZATIONS 映射
  Object.entries(MODEL_NORMALIZATIONS).forEach(([from, to]) => {
    // 处理有空格和无空格的变体
    const regex1 = new RegExp(`\\b${from}\\b`, 'gi');
    const regex2 = new RegExp(`\\b${from.replace(/\s+/g, '')}\\b`, 'gi');
    normalizedStr = normalizedStr.replace(regex1, to);
    normalizedStr = normalizedStr.replace(regex2, to);
  });
  
  // 步骤3: 多层次型号匹配（保持现有逻辑）
  // ... 现有代码 ...
  
  return null;
}
```

---

## 三、演示机/样机标记清理

### 当前问题
- 演示机标记干扰 SPU 匹配
- 品牌识别混淆（配件品牌 vs 产品品牌）

### 修复方案

```typescript
// 在 SmartMatch.tsx 中添加预处理步骤

const DEMO_KEYWORDS = [
  '演示机',
  '样机',
  '展示机',
  '体验机',
  '试用机',
  '测试机',
];

const ACCESSORY_BRANDS = [
  '优诺严选',
  '品牌',
  '赠品',
  '严选',
  '檀木',
  '钢化膜',
  '保护壳',
  '皮革保护壳',
  '智能键盘',
  '手表膜',
];

// 改进的输入预处理
preprocessInput(input: string): string {
  let cleaned = input;
  
  // 移除演示机标记
  for (const keyword of DEMO_KEYWORDS) {
    cleaned = cleaned.replace(new RegExp(keyword, 'g'), '');
  }
  
  // 移除配件品牌前缀
  for (const brand of ACCESSORY_BRANDS) {
    cleaned = cleaned.replace(new RegExp(`^${brand}\\s*`, 'g'), '');
  }
  
  // 清理多余空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// 在 handleMatch 中使用
const handleMatch = async () => {
  // ...
  for (let i = 0; i < lines.length; i++) {
    let trimmedLine = lines[i].trim();
    
    // 添加预处理步骤
    trimmedLine = this.preprocessInput(trimmedLine);
    
    // 继续匹配逻辑
    // ...
  }
};
```

---

## 四、颜色识别扩展

### 当前问题
- COLOR_VARIANTS 映射不完整
- 某些特殊颜色无法识别

### 修复方案

```typescript
// 扩展 COLOR_VARIANTS
const COLOR_VARIANTS: Record<string, string[]> = {
  // 现有映射
  '雾凇蓝': ['雾松蓝'],
  '雾松蓝': ['雾凇蓝'],
  
  // 新增映射
  '玉石绿': ['玉龙雪', '锆石黑'],  // 相似颜色
  '玛瑙粉': ['晶钻粉', '粉梦生花'],
  '琥珀黑': ['锆石黑', '曜石黑'],
  '玄武黑': ['曜石黑', '深空黑'],
  '龙晶紫': ['极光紫', '流光紫'],
  '冰川蓝': ['天青蓝', '星河蓝'],
  '柔粉': ['粉梦生花', '玛瑙粉'],
  '浅绿': ['玉石绿', '原野绿'],
  '祥云金': ['流沙金', '晨曦金'],
  '可可黑': ['曜石黑', '玄武黑'],
  '薄荷青': ['天青蓝', '冰川蓝'],
  '桃桃粉': ['玛瑙粉', '粉梦生花'],
  '柠檬黄': ['流沙金', '祥云金'],
  '酷莓粉': ['玛瑙粉', '粉梦生花'],
  '告白': ['深空黑', '灵感紫'],
  '深空黑': ['曜石黑', '玄武黑'],
  '灵感紫': ['流光紫', '龙晶紫'],
  '悠悠蓝': ['冰川蓝', '天青蓝'],
  '自在蓝': ['冰川蓝', '星河蓝'],
  '纯粹黑': ['曜石黑', '深空黑'],
  '惬意紫': ['流光紫', '龙晶紫'],
  '旷野棕': ['琥珀棕', '马鞍棕'],
  '白月光': ['零度白', '雪域白'],
  '辰夜黑': ['曜石黑', '深空黑'],
  '简黑': ['曜石黑', '深空黑'],
  '黑ka': ['曜石黑', '深空黑'],
  '幸运彩': ['彩虹色', '渐变色'],
};

// 改进的颜色提取方法
extractColor(str: string): string | null {
  // 方法1：优先使用动态颜色列表
  if (this.dynamicColors.length > 0) {
    for (const color of this.dynamicColors) {
      if (str.includes(color)) {
        return color;
      }
    }
  }
  
  // 方法2：从"版"字后提取颜色
  const afterVersion = str.match(/版([\u4e00-\u9fa5]{2,5})$/);
  if (afterVersion && afterVersion[1]) {
    return afterVersion[1];
  }
  
  // 方法3：从字符串末尾提取颜色
  const lastWords = str.match(/[\u4e00-\u9fa5]{2,5}$/);
  if (lastWords) {
    const word = lastWords[0];
    const excludeWords = ['全网通', '网通', '版本', '标准', '套餐', '蓝牙版', '活力版', '优享版', '尊享版'];
    if (!excludeWords.includes(word)) {
      return word;
    }
  }
  
  // 方法4：从容量后提取颜色
  const afterCapacity = str.match(/\d+GB[+]\d+GB\s*([\u4e00-\u9fa5]{2,5})/);
  if (afterCapacity && afterCapacity[1]) {
    return afterCapacity[1];
  }
  
  // 方法5：使用基础颜色作为后备
  const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青'];
  for (const color of basicColors) {
    if (str.includes(color)) {
      return color;
    }
  }
  
  return null;
}

// 改进的颜色匹配方法
isColorMatch(color1: string, color2: string): boolean {
  if (!color1 || !color2) return false;
  
  // 完全匹配
  if (color1 === color2) return true;
  
  // 变体匹配
  if (isColorVariant(color1, color2)) return true;
  
  // 相似颜色匹配（通过 COLOR_VARIANTS）
  const variants1 = COLOR_VARIANTS[color1] || [];
  if (variants1.includes(color2)) return true;
  
  const variants2 = COLOR_VARIANTS[color2] || [];
  if (variants2.includes(color1)) return true;
  
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

## 五、版本/变体处理改进

### 当前问题
- 版本信息（活力版、优享版等）导致 SKU 匹配错误
- SKU 列表中的版本标记不一致

### 修复方案

```typescript
// 添加版本提取方法
const VERSION_KEYWORDS = [
  '活力版',
  '优享版',
  '尊享版',
  '标准版',
  '柔光版',
  '高能版',
  '鸿蒙版',
  '昆仑版',
  '典藏版',
  '演示版',
];

extractVersion(str: string): string | null {
  for (const version of VERSION_KEYWORDS) {
    if (str.includes(version)) {
      return version;
    }
  }
  return null;
}

// 改进的 SKU 匹配方法
findBestSKUInList(input: string, skuList: SKUData[]): {
  sku: SKUData | null;
  similarity: number;
} {
  const inputCapacity = this.extractCapacity(input);
  const inputColor = this.extractColor(input);
  const inputVersion = this.extractVersion(input);
  
  let bestMatch: SKUData | null = null;
  let bestScore = 0;
  
  for (const sku of skuList) {
    const skuCapacity = this.extractCapacity(sku.name);
    const skuColor = this.extractColor(sku.name);
    const skuVersion = this.extractVersion(sku.name);
    
    let paramScore = 0;
    let paramWeight = 0;
    
    // 版本匹配（权重20%）
    if (inputVersion && skuVersion) {
      paramWeight += 0.2;
      if (inputVersion === skuVersion) {
        paramScore += 0.2;
      }
    } else if (!inputVersion && !skuVersion) {
      // 都没有版本信息，视为匹配
      paramScore += 0.2;
      paramWeight += 0.2;
    }
    
    // 容量匹配（权重50%）
    if (inputCapacity && skuCapacity) {
      paramWeight += 0.5;
      if (inputCapacity === skuCapacity) {
        paramScore += 0.5;
      }
    }
    
    // 颜色匹配（权重30%）
    if (inputColor && skuColor) {
      paramWeight += 0.3;
      if (this.isColorMatch(inputColor, skuColor)) {
        paramScore += 0.3;
      }
    }
    
    if (paramWeight === 0) {
      if (!bestMatch) {
        bestMatch = sku;
        bestScore = 0.8;
      }
      continue;
    }
    
    const finalScore = paramScore / paramWeight;
    
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = sku;
    }
  }
  
  return { sku: bestMatch, similarity: bestScore };
}
```

---

## 六、实施计划

### 第一阶段（立即）
1. 扩展品牌识别库
2. 改进型号标准化
3. 添加演示机标记清理
4. 补充缺失的 SPU/SKU 数据

### 第二阶段（1-2周）
5. 扩展颜色识别
6. 改进版本/变体处理
7. 优化容量提取

### 第三阶段（2-4周）
8. 为特殊产品类型设计专门规则
9. 性能优化和测试
10. 部署和监控

---

## 七、测试用例

```typescript
// 测试品牌识别
test('品牌识别', () => {
  expect(matcher.extractBrand('红米15R 4+128星岩黑')).toBe('xiaomi');
  expect(matcher.extractBrand('荣耀手表5')).toBe('honor');
  expect(matcher.extractBrand('华为Mate70')).toBe('huawei');
});

// 测试型号提取
test('型号提取', () => {
  expect(matcher.extractModel('VIVO WatchGT 软胶蓝牙版')).toBe('watchgt');
  expect(matcher.extractModel('OPPO Reno15 16+512')).toBe('reno15');
  expect(matcher.extractModel('华为MateBook14')).toBe('matebook14');
});

// 测试演示机清理
test('演示机清理', () => {
  const input = '华为WatchGT6 41mm 演示机冰雪蓝';
  const cleaned = matcher.preprocessInput(input);
  expect(cleaned).not.toContain('演示机');
});

// 测试颜色匹配
test('颜色匹配', () => {
  expect(matcher.isColorMatch('雾凇蓝', '雾松蓝')).toBe(true);
  expect(matcher.isColorMatch('玉石绿', '玉龙雪')).toBe(true);
  expect(matcher.isColorMatch('黑', '曜石黑')).toBe(true);
});
```

