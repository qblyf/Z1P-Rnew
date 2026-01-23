# 智能匹配规则文档

## 概述

智能匹配系统用于将用户输入的商品名称匹配到系统中的 SPU 和 SKU。

## 数据来源

### 系统数据（必须使用）

1. **品牌库**（基础数据管理）
   - 来源：`getBrandBaseList()` API
   - 字段：`name`, `spell`, `color`, `order`
   - 用途：品牌识别和匹配

2. **SPU 数据**（产品管理）
   - 来源：`getSPUListNew()` API
   - 字段：`id`, `name`, `brand`, `skuIDs`
   - 用途：产品匹配

3. **SKU 数据**（产品管理）
   - 来源：`getSKUsInfo()` API
   - 字段：`id`, `name`, `state`, `gtins`, 以及从 `skuIDs` 中提取的 `color`, `spec`, `combo`
   - 用途：规格匹配

4. **颜色数据**（从 SKU 提取）
   - 来源：从 SPU 的 `skuIDs` 中提取 `color` 字段
   - 用途：颜色识别和匹配

### 虚拟数据（需要移除或替换）

当前代码中存在的虚拟数据：

1. **产品类型特征** (`PRODUCT_TYPE_FEATURES`)
   - 位置：`utils/smartMatcher.ts`
   - 问题：硬编码的产品类型和特征
   - 建议：从系统的产品分类数据中获取

2. **版本关键词** (`VERSION_KEYWORDS_MAP`)
   - 位置：`utils/smartMatcher.ts`
   - 问题：硬编码的版本关键词
   - 建议：从系统配置或 SKU 数据中提取

3. **型号标准化映射** (`MODEL_NORMALIZATIONS`)
   - 位置：`utils/smartMatcher.ts`
   - 问题：硬编码的型号映射规则
   - 建议：从系统配置中获取或使用更通用的算法

4. **颜色变体映射** (`COLOR_VARIANTS`)
   - 位置：`utils/smartMatcher.ts`
   - 问题：硬编码的颜色变体
   - 建议：从系统配置中获取或使用颜色相似度算法

5. **礼盒版关键词** (`GIFT_BOX_KEYWORDS`)
   - 位置：`utils/smartMatcher.ts`
   - 问题：硬编码的关键词
   - 建议：从系统配置中获取

## 匹配流程

### 阶段 0：数据准备

```typescript
// 1. 加载品牌库
const brands = await getBrandBaseList();
matcher.setBrandList(brands);

// 2. 加载 SPU 列表
const spuList = await getSPUListNew({
  states: [SPUState.在用],
  limit: 10000,
  offset: 0
}, ['id', 'name', 'brand', 'skuIDs']);

// 3. 提取颜色列表（从 SKU 数据）
const colors = extractColorsFromSKUs(spuList);
matcher.setColorList(colors);
```

### 阶段 1：输入预处理

```typescript
// 1. 清理演示机标记
input = cleanDemoMarkers(input);

// 2. 预处理（移除括号、标准化格式）
input = preprocessInputAdvanced(input);
```

### 阶段 2：信息提取

```typescript
// 从输入中提取：
const brand = extractBrand(input);        // 品牌（使用品牌库）
const model = extractModel(input);        // 型号
const capacity = extractCapacity(input);  // 容量
const color = extractColorAdvanced(input); // 颜色（使用颜色列表）
const version = extractVersion(input);    // 版本
```

### 阶段 3：SPU 匹配

#### 第一阶段：精确匹配

```typescript
// 条件：品牌 + 型号完全匹配
if (inputBrand && spuBrand && isBrandMatch(inputBrand, spuBrand) &&
    inputModel && spuModel && inputModel === spuModel) {
  // 计算分数（考虑版本匹配）
  score = calculateScore(inputVersion, spuVersion);
}
```

#### 第二阶段：分词匹配

```typescript
// 条件：品牌匹配 + 型号相似
if (isBrandMatch(inputBrand, spuBrand) &&
    calculateTokenSimilarity(inputModel, spuModel) > 0.5) {
  // 计算分数
  score = 0.4 + modelScore * 0.6;
}
```

### 阶段 4：SKU 匹配

```typescript
// 在匹配的 SPU 中查找最佳 SKU
// 匹配条件：
// 1. 容量匹配（权重 40%）
// 2. 颜色匹配（权重 30%）
// 3. 版本匹配（权重 30%）
```

## 品牌匹配规则

### 规则 1：完全匹配

```typescript
if (brand1 === brand2) return true;
```

### 规则 2：拼音匹配

```typescript
// 通过品牌库的 spell 字段匹配
// 例如："红米"(spell: redmi) 和 "Redmi"(spell: redmi) 匹配
if (brand1Info.spell === brand2Info.spell) return true;
```

### 规则 3：优先使用 SPU 的 brand 字段

```typescript
// 优先使用 SPU 数据中的 brand 字段
const spuBrand = spu.brand || extractBrand(spu.name);
```

## 颜色匹配规则

### 规则 1：完全匹配（100% 分数）

```typescript
if (color1 === color2) return true;
```

### 规则 2：颜色变体匹配（90% 分数）

```typescript
// 使用 COLOR_VARIANTS 映射
// 例如："雾凇蓝" 和 "雾松蓝" 是变体
if (isColorVariant(color1, color2)) return true;
```

### 规则 3：基础颜色匹配（50% 分数）

```typescript
// 基于颜色族匹配
// 例如："曜石黑" 和 "深空黑" 都属于黑色系
if (isBasicColorMatch(color1, color2)) return true;
```

## 过滤规则

### 规则 1：礼盒版过滤

```typescript
// 如果输入不包含礼盒关键词，过滤掉礼盒版 SPU
if (!hasGiftBoxKeywordInInput && hasGiftBoxKeywordInSPU) {
  return true; // 过滤
}
```

### 规则 2：版本互斥过滤

```typescript
// 蓝牙版和 eSIM 版互斥
if (hasBluetooth && hasESIM) {
  return true; // 过滤
}
```

### 规则 3：品牌过滤

```typescript
// 如果输入品牌和 SPU 品牌都识别出来了，必须匹配
if (inputBrand && spuBrand && !isBrandMatch(inputBrand, spuBrand)) {
  continue; // 跳过
}

// 如果输入品牌未识别，但 SPU 有品牌，降低优先级
if (!inputBrand && spuBrand) {
  score = 0.3; // 降低分数
}
```

## 优先级规则

### SPU 优先级

1. **标准版**（无礼盒、无特殊版本）：优先级最高（3）
2. **版本匹配的特殊版**（如蓝牙版、eSIM版）：优先级中等（2）
3. **其他情况**（礼盒版等）：优先级最低（1）

### 匹配阶段优先级

1. **第一阶段**（精确匹配）：优先级最高
2. **第二阶段**（分词匹配）：优先级较低

## 评分规则

### SPU 评分

```typescript
// 基础分数
score = 0.8; // 品牌 + 型号匹配

// 版本匹配调整
if (inputVersion && spuVersion) {
  if (inputVersion.name === spuVersion.name) {
    score = 1.0; // 版本完全匹配
  } else {
    score = 0.6; // 版本不匹配
  }
} else if (!inputVersion && !spuVersion) {
  score = 1.0; // 都没有版本
}

// 关键词加分（最多 0.1 分）
const keywordBonus = Math.min(keywordMatchCount * 0.05, 0.1);
score = Math.min(score + keywordBonus, 1.0);
```

### SKU 评分

```typescript
// 权重分配
const versionWeight = 0.3;  // 版本权重 30%
const capacityWeight = 0.4; // 容量权重 40%
const colorWeight = 0.3;    // 颜色权重 30%

// 计算总分
score = (versionScore * versionWeight + 
         capacityScore * capacityWeight + 
         colorScore * colorWeight) / totalWeight;
```

### 最终评分

```typescript
// SPU 匹配占 50%，SKU 匹配占 50%
finalScore = spuSimilarity * 0.5 + skuSimilarity * 0.5;
```

## 阈值设置

- **SPU 匹配阈值**：0.5（50%）
- **SKU 匹配阈值**：无固定阈值，选择最佳匹配
- **型号相似度阈值**：0.5（50%）

## 数据依赖

### 必需数据

1. ✅ **品牌库**：必须正确配置，包含所有品牌的中英文名称和拼音
2. ✅ **SPU 数据**：必须包含 `brand` 字段
3. ✅ **SKU 数据**：必须包含规格信息（颜色、容量等）

### 可选数据

1. ⚠️ **产品类型配置**：当前硬编码，建议从系统获取
2. ⚠️ **版本关键词配置**：当前硬编码，建议从系统获取
3. ⚠️ **颜色变体配置**：当前硬编码，建议从系统获取

## 改进建议

### 短期改进（使用系统数据）

1. **移除硬编码的品牌映射**
   - ✅ 已完成：完全使用品牌库数据

2. **从 SKU 数据提取颜色**
   - ✅ 已完成：从 `skuIDs` 中提取颜色

3. **使用 SPU 的 brand 字段**
   - ✅ 已完成：优先使用 `spu.brand`

### 中期改进（配置化）

1. **产品类型配置化**
   - 将 `PRODUCT_TYPE_FEATURES` 移到配置文件或数据库
   - 支持动态添加新产品类型

2. **版本关键词配置化**
   - 将 `VERSION_KEYWORDS_MAP` 移到配置文件
   - 支持动态添加新版本类型

3. **颜色变体配置化**
   - 将 `COLOR_VARIANTS` 移到配置文件
   - 支持管理员在后台配置颜色变体

4. **型号标准化配置化**
   - 将 `MODEL_NORMALIZATIONS` 移到配置文件
   - 支持动态添加型号映射规则

### 长期改进（智能化）

1. **机器学习模型**
   - 使用历史匹配数据训练模型
   - 自动学习品牌、型号、颜色的匹配规则

2. **相似度算法优化**
   - 使用更先进的字符串相似度算法（如 Levenshtein 距离）
   - 考虑语义相似度（如词向量）

3. **用户反馈机制**
   - 收集用户对匹配结果的反馈
   - 根据反馈优化匹配规则

## 测试要求

### 单元测试

- ✅ 品牌提取测试
- ✅ 型号提取测试
- ✅ 颜色提取测试
- ✅ SPU 匹配测试
- ✅ SKU 匹配测试

### 集成测试

- ✅ 完整匹配流程测试
- ✅ 边界情况测试
- ✅ 性能测试

### 数据质量测试

- ⚠️ 品牌库完整性测试
- ⚠️ SPU 数据质量测试
- ⚠️ SKU 数据质量测试

## 监控指标

1. **匹配成功率**：成功匹配的比例
2. **匹配准确率**：匹配结果正确的比例
3. **平均匹配时间**：单次匹配的平均耗时
4. **品牌识别率**：品牌成功识别的比例
5. **颜色识别率**：颜色成功识别的比例
