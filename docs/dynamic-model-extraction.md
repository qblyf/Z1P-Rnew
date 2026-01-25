# 动态型号提取系统

## 概述

传统的正则表达式方法难以覆盖所有 SPU 品类的型号模式。动态型号提取系统通过从实际数据库中的 SPU 数据学习型号模式，自动构建型号索引，大大提高匹配准确度。

## 核心思路

```
数据库 SPU → 提取型号 → 构建索引 → 精确匹配 → 回退到正则
```

### 工作流程

1. **加载 SPU 数据**：从数据库读取所有 SPU
2. **提取型号**：从每个 SPU 名称中提取标准化的型号
3. **构建索引**：
   - 全局型号索引（所有型号）
   - 按品牌分组的型号索引（加速查找）
4. **匹配时使用**：
   - 优先使用型号索引进行精确匹配
   - 如果索引匹配失败，回退到正则表达式

## 实现细节

### 1. 数据结构

```typescript
// 全局型号索引
private modelIndex: Set<string> = new Set();

// 按品牌分组的型号索引
private modelByBrand: Map<string, Set<string>> = new Map();
```

### 2. 构建索引

在 `buildSPUIndex` 方法中同时构建型号索引：

```typescript
buildSPUIndex(spuList: SPUData[]) {
  for (const spu of spuList) {
    const brand = spu.brand || this.extractBrand(spu.name);
    const model = this.extractModelFromSPU(spu.name, brand);
    
    if (model) {
      // 添加到全局索引
      this.modelIndex.add(model);
      
      // 添加到品牌索引
      if (!this.modelByBrand.has(brand)) {
        this.modelByBrand.set(brand, new Set());
      }
      this.modelByBrand.get(brand)!.add(model);
    }
  }
}
```

### 3. 从 SPU 提取型号

`extractModelFromSPU` 方法的处理步骤：

1. **移除品牌名**
2. **移除描述词**：智能手机、手机、智能手表、平板电脑等
3. **移除容量信息**：8+256、512GB 等
4. **移除颜色信息**：黑色、白色、蓝色等
5. **标准化**：移除空格，转换为小写

示例：

```
输入: "华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带"
步骤1: 移除品牌 → "WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带"
步骤2: 移除描述词 → "WATCH 十周年款 46mm 钛合金 蓝色素皮复合表带"
步骤3: 移除容量 → "WATCH 十周年款 46mm 钛合金 蓝色素皮复合表带"
步骤4: 移除颜色 → "WATCH 十周年款 46mm 钛合金 复合表带"
步骤5: 标准化 → "watch十周年款46mm钛合金复合表带"
```

### 4. 使用索引匹配

在 `extractModel` 方法中，优先使用索引：

```typescript
extractModel(str: string, brand?: string | null): string | null {
  // 优先级0: 使用动态型号索引
  if (this.modelIndex.size > 0) {
    const dynamicModel = this.extractModelFromIndex(normalizedStr, brand);
    if (dynamicModel) {
      return dynamicModel;
    }
  }
  
  // 回退到正则表达式...
}
```

### 5. 索引匹配算法

```typescript
extractModelFromIndex(normalizedStr: string, brand?: string | null): string | null {
  // 如果提供了品牌，优先在该品牌的型号中搜索
  let modelsToSearch = brand 
    ? this.modelByBrand.get(brand.toLowerCase()) 
    : this.modelIndex;
  
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  // 找到最长的匹配型号
  for (const model of modelsToSearch) {
    if (normalizedStr.includes(model)) {
      const score = model.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = model;
      }
    }
  }
  
  // 只有当匹配分数足够高时才返回（至少3个字符）
  return bestScore >= 3 ? bestMatch : null;
}
```

## 优势

### 1. 自动学习

- ✅ 无需手动编写正则表达式
- ✅ 自动适应新的型号模式
- ✅ 覆盖所有实际存在的 SPU 品类

### 2. 高准确度

- ✅ 精确匹配实际数据库中的型号
- ✅ 避免正则表达式的误匹配
- ✅ 支持特殊型号（如"十周年款"）

### 3. 高性能

- ✅ 使用 Set 和 Map 数据结构，查找速度 O(1)
- ✅ 按品牌分组，减少搜索范围
- ✅ 最长匹配优先，避免歧义

### 4. 可维护性

- ✅ 数据驱动，无需修改代码
- ✅ 新增 SPU 自动更新索引
- ✅ 易于调试和监控

## 匹配优先级

```
0. 动态型号索引（从实际 SPU 数据中学习）⭐ 新增
1. 平板型号（MatePad、iPad 等）
2. 字母+字母格式（Watch GT、Band 5 等）
3. 复杂型号（14 Pro Max+、Y300 Pro+ 等）
4. 简单型号（P50、14 等）
```

## 使用示例

### 初始化

```typescript
const matcher = new SimpleMatcher();
await matcher.initialize();

// 加载 SPU 数据并构建索引
const spuList = await getSPUListNew(...);
matcher.buildSPUIndex(spuList);
```

### 匹配

```typescript
const input = "华为 Watch十周年款 46mm蓝色";
const brand = matcher.extractBrand(input);
const model = matcher.extractModel(input, brand);

// 如果索引中有 "watch十周年款"，会直接返回
// 否则回退到正则表达式匹配
```

## 日志输出

```
✓ SPU index built: 50 brands, 1000 SPUs indexed, 0 SPUs without brand
✓ Model index built: 856 unique models from 1000 SPUs
  品牌索引示例: 华为, oppo, vivo, 小米, apple...
  型号索引示例: watch十周年款, pad4pro, reno15, mate60pro...

[动态匹配] 从型号索引中找到: "watch十周年款"
```

## 性能指标

- **索引构建时间**：O(n)，n = SPU 总数
- **索引空间复杂度**：O(n)
- **查找时间**：O(m)，m = 型号数量（通常很小）
- **内存占用**：约 1-2MB（1000个SPU）

## 注意事项

### 1. 型号提取质量

型号提取的质量直接影响匹配准确度。需要：
- 准确移除描述词
- 准确移除容量和颜色信息
- 保留关键的型号特征

### 2. 索引更新

当 SPU 数据更新时，需要重新构建索引：

```typescript
// 数据更新后
matcher.buildSPUIndex(newSpuList);
```

### 3. 回退机制

动态索引匹配失败时，会自动回退到正则表达式：

```typescript
// 优先级0: 动态索引
const dynamicModel = this.extractModelFromIndex(...);
if (dynamicModel) return dynamicModel;

// 回退到正则表达式
const tabletModel = this.extractTabletModel(...);
if (tabletModel) return tabletModel;
// ...
```

## 未来改进

1. **机器学习**：使用 ML 模型提取型号特征
2. **模糊匹配**：支持编辑距离匹配
3. **增量更新**：支持增量更新索引，无需全量重建
4. **持久化**：将索引持久化到文件，加速启动
5. **统计分析**：分析型号模式，优化提取算法

## 相关文件

- `utils/smartMatcher.ts` - 核心实现
- `buildSPUIndex()` - 构建索引
- `extractModelFromSPU()` - 从 SPU 提取型号
- `extractModelFromIndex()` - 使用索引匹配
