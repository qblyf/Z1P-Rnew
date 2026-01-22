# 智能匹配系统第二阶段改进 - 快速参考指南

## 新增方法速查表

### PHASE2-1: 特殊产品类型识别

#### `detectProductType(input: string): ProductType`
检测输入中的产品类型。

**参数**:
- `input` - 输入字符串

**返回值**:
- `'phone'` - 手机
- `'watch'` - 手表
- `'tablet'` - 平板
- `'laptop'` - 笔记本
- `'earbuds'` - 耳机
- `'band'` - 手环
- `'unknown'` - 未知

**示例**:
```typescript
const type = matcher.detectProductType('华为WatchGT6 41mm');
// 返回: 'watch'
```

#### `extractSpecialParams(input: string, productType: ProductType): Record<string, string>`
提取特殊参数（尺寸、屏幕等）。

**参数**:
- `input` - 输入字符串
- `productType` - 产品类型

**返回值**:
- `{ size?: string, screen?: string, version?: string }`

**示例**:
```typescript
const params = matcher.extractSpecialParams('华为WatchGT6 41mm 柔光版', 'watch');
// 返回: { size: '41mm', version: '柔光版' }
```

#### `extractModelByType(input: string, productType: ProductType): string | null`
按产品类型提取型号。

**参数**:
- `input` - 输入字符串
- `productType` - 产品类型

**返回值**:
- 提取的型号字符串，或 null

**示例**:
```typescript
const model = matcher.extractModelByType('华为WatchGT6 41mm', 'watch');
// 返回: 'watch gt 6'
```

---

### PHASE2-2: 版本/变体处理改进

#### `extractVersion(input: string): VersionInfo | null`
提取版本信息。

**参数**:
- `input` - 输入字符串

**返回值**:
- `VersionInfo` 对象或 null
  - `name` - 版本名称（如"标准版"、"活力版"）
  - `keywords` - 版本关键词
  - `priority` - 优先级（1-5）

**示例**:
```typescript
const version = matcher.extractVersion('华为P50 活力版');
// 返回: { name: '活力版', keywords: ['活力版', '轻享版'], priority: 2 }
```

#### `findBestSKUWithVersion(input: string, skuList: SKUData[], inputVersion: VersionInfo | null)`
改进的 SKU 匹配，考虑版本信息。

**参数**:
- `input` - 输入字符串
- `skuList` - SKU 列表
- `inputVersion` - 输入版本信息

**返回值**:
- `{ sku: SKUData | null, similarity: number }`

**权重分配**:
- 版本匹配：30%
- 容量匹配：40%
- 颜色匹配：30%

**示例**:
```typescript
const { sku, similarity } = matcher.findBestSKUWithVersion(
  '华为P50 活力版 12+256 黑色',
  skuList,
  versionInfo
);
```

---

### PHASE2-3: 特殊颜色名称识别

#### `extractColorAdvanced(input: string): string | null`
改进的颜色提取，支持特殊颜色名称。

**参数**:
- `input` - 输入字符串

**返回值**:
- 提取的颜色字符串，或 null

**支持的颜色类型**:
- 复合颜色名称：可可黑、薄荷青、柠檬黄、酷莓粉
- 带修饰词的颜色：夏夜黑、辰夜黑、龙晶紫
- 基础颜色：黑、白、蓝、红等

**示例**:
```typescript
const color = matcher.extractColorAdvanced('华为P50 玉石绿');
// 返回: '玉石绿'
```

#### `isColorMatch(color1: string, color2: string): boolean`
改进的颜色匹配，支持变体匹配。

**参数**:
- `color1` - 第一个颜色
- `color2` - 第二个颜色

**返回值**:
- `true` - 颜色匹配
- `false` - 颜色不匹配

**匹配规则**:
1. 完全匹配：color1 === color2
2. 变体匹配：使用 COLOR_VARIANTS 映射
3. 基础颜色匹配：两个颜色都包含相同的基础颜色

**示例**:
```typescript
const match = matcher.isColorMatch('雾凇蓝', '雾松蓝');
// 返回: true（已知的颜色变体）

const match2 = matcher.isColorMatch('龙晶紫', '极光紫');
// 返回: true（都包含"紫"）
```

---

### PHASE2-4: 产品名称格式统一

#### `preprocessInputAdvanced(input: string): string`
改进的输入预处理，处理格式差异。

**参数**:
- `input` - 输入字符串

**返回值**:
- 预处理后的字符串

**处理规则**:
1. 处理空格变体：Reno15 → Reno 15
2. 处理大小写：首字母大写
3. 清理多余空格
4. 处理特殊字符：（ → (，） → )
5. 移除型号代码：WatchGT6 (WA2456C) → WatchGT6

**示例**:
```typescript
const processed = matcher.preprocessInputAdvanced('reno15（WA2456C）');
// 返回: 'Reno 15'
```

---

### PHASE2-5: 多品牌混淆处理

#### `extractBrandWithPriority(input: string): { brand: string; confidence: number } | null`
改进的品牌识别，带优先级。

**参数**:
- `input` - 输入字符串

**返回值**:
- `{ brand: string, confidence: number }` 或 null
  - `brand` - 品牌名称
  - `confidence` - 置信度（0-1）

**优先级**:
- 产品品牌：0.9（最高）- apple, huawei, honor, xiaomi, vivo, oppo, samsung, oneplus
- 子品牌：0.7（中等）- redmi, nova, mate, reno, find
- 配件品牌：0.3（最低）- 优诺严选, 品牌, 赠品

**示例**:
```typescript
const brand = matcher.extractBrandWithPriority('华为 Mate 60 Pro');
// 返回: { brand: 'huawei', confidence: 0.9 }

const brand2 = matcher.extractBrandWithPriority('优诺严选 华为手机壳');
// 返回: { brand: '优诺严选', confidence: 0.3 }
```

#### `verifyBrandByModel(brand: string, model: string): boolean`
使用型号验证品牌。

**参数**:
- `brand` - 品牌名称
- `model` - 型号

**返回值**:
- `true` - 品牌与型号匹配
- `false` - 品牌与型号不匹配

**示例**:
```typescript
const valid = matcher.verifyBrandByModel('xiaomi', 'redmi note 11');
// 返回: true

const invalid = matcher.verifyBrandByModel('xiaomi', 'mate 50');
// 返回: false
```

---

## 集成示例

### 完整的匹配流程

```typescript
// 1. 清理演示机标记
let input = matcher.cleanDemoMarkers(inputText);

// 2. 改进的输入预处理
input = matcher.preprocessInputAdvanced(input);

// 3. 检测产品类型
const productType = matcher.detectProductType(input);

// 4. 提取版本信息
const version = matcher.extractVersion(input);

// 5. 匹配 SPU
const { spu, similarity: spuSimilarity } = matcher.findBestSPUMatch(input, spuList);

// 6. 获取 SKU 列表
const skuData = await getSKUData(spu.id);

// 7. 改进的 SKU 匹配，考虑版本
const { sku, similarity: skuSimilarity } = matcher.findBestSKUWithVersion(
  input,
  skuData,
  version
);

// 8. 计算最终相似度
const finalSimilarity = spuSimilarity * 0.5 + skuSimilarity * 0.5;
```

---

## 常见问题

### Q: 如何处理不在 PRODUCT_TYPE_FEATURES 中的产品类型？
A: 使用 `detectProductType()` 会返回 `'unknown'`，然后使用原有的 `extractModel()` 方法作为后备。

### Q: 颜色变体是如何定义的？
A: 在 `COLOR_VARIANTS` 常量中定义。例如：
```typescript
'雾凇蓝': ['雾松蓝'],
'玉石绿': ['玉龙雪', '锆石黑'],
```

### Q: 版本优先级有什么用？
A: 当输入版本与 SKU 版本不完全匹配时，会比较优先级。优先级相同的版本被视为等价。

### Q: 如何添加新的产品类型？
A: 在 `PRODUCT_TYPE_FEATURES` 中添加新的条目：
```typescript
newType: {
  keywords: ['keyword1', 'keyword2'],
  modelPattern: /pattern/i,
  specialParams: ['param1', 'param2'],
  paramPattern: /pattern/g,
}
```

### Q: 如何添加新的版本？
A: 在 `VERSION_KEYWORDS_MAP` 中添加新的条目：
```typescript
'newVersion': {
  name: '新版本',
  keywords: ['keyword1', 'keyword2'],
  priority: 6,
}
```

---

## 性能提示

1. **颜色列表排序** - 动态颜色列表已按长度降序排序，优先匹配更长的颜色词
2. **关键词匹配** - 产品类型和版本检测使用关键词匹配，性能为 O(1)
3. **缓存** - 考虑缓存 PRODUCT_TYPE_FEATURES 和 VERSION_KEYWORDS_MAP 的查询结果
4. **批量处理** - 对于大量输入，考虑使用批量处理以提高效率

---

## 调试技巧

### 启用详细日志
所有新方法都包含 `console.log()` 调用，可以在浏览器控制台查看详细的匹配过程。

### 检查提取结果
```typescript
console.log('产品类型:', matcher.detectProductType(input));
console.log('版本信息:', matcher.extractVersion(input));
console.log('颜色:', matcher.extractColorAdvanced(input));
console.log('预处理后:', matcher.preprocessInputAdvanced(input));
```

### 验证品牌
```typescript
const brand = matcher.extractBrandWithPriority(input);
console.log('品牌:', brand?.brand, '置信度:', brand?.confidence);
console.log('验证结果:', matcher.verifyBrandByModel(brand?.brand, model));
```
