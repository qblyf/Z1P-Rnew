# 智能匹配功能优化 - 设计文档

## 1. 概述

本设计文档描述了智能匹配系统的优化方案，主要目标是将型号提取从匹配阶段前移到预处理阶段，并实现基于预提取数据的高效精确匹配。

### 1.1 核心改进

1. **预处理阶段增强**：在数据加载时提取并存储品牌、型号、精简度等信息
2. **匹配阶段简化**：直接使用预提取的标准化数据进行匹配，无需动态提取
3. **优先级排序优化**：基于分数、版本类型和精简度的多维度排序
4. **数据结构增强**：扩展SPU数据结构以存储预提取信息

### 1.2 设计原则

- **关注点分离**：预处理负责数据提取，匹配负责比较
- **性能优先**：避免重复计算，使用预计算结果
- **向后兼容**：保持现有API接口不变
- **可测试性**：每个组件都可独立测试

---

## 2. 架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     数据加载阶段                              │
│  ┌──────────────┐                                            │
│  │ 原始SPU数据  │                                            │
│  └──────┬───────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         DataPreparationService (增强)                 │   │
│  │  • 提取品牌 (extractedBrand)                          │   │
│  │  • 提取型号 (extractedModel)                          │   │
│  │  • 标准化型号 (normalizedModel)                       │   │
│  │  • 计算精简度 (simplicity)                            │   │
│  │  • 构建索引 (品牌索引、型号索引)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                            │
│  │ 增强的SPU数据 │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     匹配阶段                                  │
│  ┌──────────────┐                                            │
│  │  用户输入    │                                            │
│  └──────┬───────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         PreprocessingService                          │   │
│  │  • 清洗输入                                           │   │
│  │  • 纠错                                               │   │
│  │  • 展开缩写                                           │   │
│  │  • 标准化格式                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         InfoExtractor                                 │   │
│  │  • 提取品牌                                           │   │
│  │  • 提取型号                                           │   │
│  │  • 提取颜色、容量、版本                               │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         ExactMatcher (修改)                           │   │
│  │  • 使用品牌索引过滤候选SPU                            │   │
│  │  • 比较标准化型号 (normalizedModel)                   │   │
│  │  • 计算匹配分数                                       │   │
│  │  • 按优先级排序 (分数 > 版本类型 > 精简度)            │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                            │
│  │  匹配结果    │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```


### 2.2 数据流

```
原始SPU → 预处理 → 增强SPU → 索引构建 → 存储
                                          ↓
用户输入 → 清洗 → 信息提取 → 精确匹配 ← 使用预处理数据
```

---

## 3. 组件和接口

### 3.1 增强的SPU数据结构

**目的**：扩展现有SPU数据结构以存储预提取信息

**新增字段**：

```typescript
interface EnhancedSPUData extends SPUData {
  // 预提取的品牌信息
  extractedBrand: string | null;
  
  // 预提取的型号信息（原始格式）
  extractedModel: string | null;
  
  // 标准化的型号（用于匹配）
  // 规则：小写 + 移除所有空格和特殊字符
  normalizedModel: string | null;
  
  // 精简度分数（越小越精简）
  // 计算公式：name.length - brand.length - model.length - specs.length
  simplicity: number;
  
  // 预处理时间戳（用于调试）
  preprocessedAt?: number;
}
```

**字段说明**：

- `extractedBrand`: 从SPU名称中提取的品牌，优先使用`brand`字段
- `extractedModel`: 从SPU名称中提取的型号（移除品牌后的核心部分）
- `normalizedModel`: 标准化后的型号，用于精确匹配比较
- `simplicity`: 精简度指标，用于优先级排序
- `preprocessedAt`: 预处理时间戳（可选，用于调试和缓存验证）

**示例**：

```typescript
// 原始SPU
{
  id: 1,
  name: "华为 Mate 60 Pro 12GB+512GB 雅川青",
  brand: "华为",
  skuIDs: [...]
}

// 增强后的SPU
{
  id: 1,
  name: "华为 Mate 60 Pro 12GB+512GB 雅川青",
  brand: "华为",
  skuIDs: [...],
  extractedBrand: "华为",
  extractedModel: "Mate 60 Pro",
  normalizedModel: "mate60pro",  // 小写 + 移除空格
  simplicity: 5,  // 假设计算结果
  preprocessedAt: 1704067200000
}
```


### 3.2 DataPreparationService 增强

**新增方法**：

```typescript
class DataPreparationService {
  /**
   * 预处理SPU列表，提取并存储品牌、型号、精简度
   * 
   * @param spuList 原始SPU列表
   * @returns 增强的SPU列表
   */
  preprocessSPUs(spuList: SPUData[]): EnhancedSPUData[];
  
  /**
   * 从SPU名称中提取品牌
   * 
   * @param spu SPU数据
   * @returns 品牌名称或null
   */
  private extractBrand(spu: SPUData): string | null;
  
  /**
   * 从SPU名称中提取型号
   * 
   * @param spu SPU数据
   * @param brand 品牌名称（用于从名称中移除品牌）
   * @returns 型号字符串或null
   */
  private extractModel(spu: SPUData, brand: string | null): string | null;
  
  /**
   * 标准化型号用于匹配
   * 
   * 规则：
   * 1. 转换为小写
   * 2. 移除所有空格
   * 3. 移除特殊字符（-、_等）
   * 
   * @param model 原始型号
   * @returns 标准化型号
   */
  private normalizeModelForMatching(model: string): string;
  
  /**
   * 计算SPU的精简度
   * 
   * 精简度 = name长度 - brand长度 - model长度 - specs长度
   * 
   * @param spu SPU数据
   * @param brand 品牌
   * @param model 型号
   * @returns 精简度分数
   */
  private calculateSimplicity(
    spu: SPUData, 
    brand: string | null, 
    model: string | null
  ): number;
}
```

**实现细节**：

1. **品牌提取**：
   - 优先使用`spu.brand`字段
   - 如果没有，使用现有的`extractBrandFromName`方法
   - 支持中文和拼音品牌名

2. **型号提取**：
   - 复用`InfoExtractor.extractModel`的逻辑
   - 从SPU名称中移除品牌部分
   - 移除容量、颜色等规格信息
   - 保留核心型号部分

3. **型号标准化**：
   - 转换为小写：`"Mate 60 Pro"` → `"mate 60 pro"`
   - 移除所有空格：`"mate 60 pro"` → `"mate60pro"`
   - 移除特殊字符：`"mate-60-pro"` → `"mate60pro"`

4. **精简度计算**：
   ```typescript
   simplicity = name.length - brand.length - model.length - specs.length
   ```
   其中`specs.length`是从`skuIDs`中提取的规格信息总长度


### 3.3 ExactMatcher 修改

**修改的方法**：

```typescript
class ExactMatcher {
  /**
   * 查找精确匹配的SPU
   * 
   * 修改点：
   * 1. 不再动态提取SPU的型号
   * 2. 直接使用预提取的normalizedModel进行比较
   * 3. 使用simplicity进行优先级排序
   * 
   * @param extractedInfo 从用户输入提取的信息
   * @param candidates 候选SPU列表（已增强）
   * @returns 匹配结果列表
   */
  findMatches(
    extractedInfo: ExtractedInfo,
    candidates: EnhancedSPUData[]
  ): SPUMatchResult[];
}
```

**实现变更**：

**之前**（动态提取）：
```typescript
for (const spu of candidates) {
  // 动态提取SPU信息
  const spuBrand = options?.extractBrand(spu.name);
  const spuModel = options?.extractModel(spu.name, spuBrand);
  
  // 标准化后比较
  const inputModelNorm = inputModel ? this.normalizeForComparison(inputModel) : null;
  const spuModelNorm = spuModel ? this.normalizeForComparison(spuModel) : null;
  const modelMatch = inputModelNorm && spuModelNorm && inputModelNorm === spuModelNorm;
  
  if (!modelMatch) continue;
  // ...
}
```

**之后**（使用预提取数据）：
```typescript
for (const spu of candidates) {
  // 直接使用预提取的数据
  const spuBrand = spu.extractedBrand;
  const spuModelNorm = spu.normalizedModel;
  
  // 品牌匹配检查
  const brandMatch = inputBrand === spuBrand;
  if (!brandMatch) continue;
  
  // 型号匹配检查（直接比较标准化型号）
  const inputModelNorm = inputModel ? this.normalizeForComparison(inputModel) : null;
  const modelMatch = inputModelNorm && spuModelNorm && inputModelNorm === spuModelNorm;
  
  if (!modelMatch) continue;
  // ...
}
```

**优先级排序**：

```typescript
function selectBestMatch(matches: SPUMatchResult[]): SPUMatchResult {
  return matches.sort((a, b) => {
    // 1. 分数更高优先
    if (a.score !== b.score) return b.score - a.score;
    
    // 2. 版本类型优先级（标准版 > 版本匹配 > 其他）
    if (a.priority !== b.priority) return b.priority - a.priority;
    
    // 3. 精简度优先（值越小越精简）
    if (a.spu.simplicity !== b.spu.simplicity) {
      return a.spu.simplicity - b.spu.simplicity;
    }
    
    return 0;
  })[0];
}
```


### 3.4 MatchingOrchestrator 修改

**修改点**：

1. 在初始化时调用`DataPreparationService.preprocessSPUs`
2. 将增强的SPU数据传递给匹配器
3. 保持现有API接口不变

```typescript
class MatchingOrchestrator {
  async initialize(
    brandList: BrandData[],
    spuList: SPUData[]
  ): Promise<void> {
    // 1. 初始化数据准备服务
    await this.dataPreparation.initialize(brandList);
    
    // 2. 预处理SPU列表（新增）
    const enhancedSPUs = this.dataPreparation.preprocessSPUs(spuList);
    
    // 3. 构建索引（使用增强的SPU数据）
    this.dataPreparation.buildBrandIndex(enhancedSPUs);
    this.dataPreparation.buildModelIndex(enhancedSPUs);
    this.dataPreparation.buildSpecIndex(enhancedSPUs);
    
    // 4. 存储增强的SPU列表
    this.enhancedSPUs = enhancedSPUs;
    
    // ...其他初始化逻辑
  }
}
```

---

## 4. 数据模型

### 4.1 型号标准化规则

**目的**：确保输入型号和SPU型号使用相同的标准化规则

**规则**：

1. **转换为小写**：
   - `"Mate 60 Pro"` → `"mate 60 pro"`
   - `"iPhone 15 Pro Max"` → `"iphone 15 pro max"`

2. **移除所有空格**：
   - `"mate 60 pro"` → `"mate60pro"`
   - `"iphone 15 pro max"` → `"iphone15promax"`

3. **移除特殊字符**：
   - `"mate-60-pro"` → `"mate60pro"`
   - `"a5_pro"` → `"a5pro"`

**实现**：

```typescript
function normalizeModelForMatching(model: string): string {
  return model
    .toLowerCase()                    // 转换为小写
    .replace(/[\s\-_]/g, '');        // 移除空格、横线、下划线
}
```

**示例**：

| 原始型号 | 标准化型号 |
|---------|-----------|
| `"Mate 60 Pro"` | `"mate60pro"` |
| `"iPhone 15 Pro Max"` | `"iphone15promax"` |
| `"A5 Pro"` | `"a5pro"` |
| `"Watch GT 5"` | `"watchgt5"` |
| `"Y50"` | `"y50"` |


### 4.2 精简度计算

**目的**：量化SPU名称的精简程度，用于优先级排序

**计算公式**：

```
simplicity = name.length - brand.length - model.length - specs.length
```

其中：
- `name.length`: SPU名称的总字符数
- `brand.length`: 品牌名称的字符数
- `model.length`: 型号的字符数
- `specs.length`: 规格信息的总字符数（从skuIDs提取）

**规格信息提取**：

从`skuIDs`中提取所有唯一的规格值：
- 颜色（color）
- 容量（spec）
- 组合（combo）

```typescript
function extractSpecsLength(spu: SPUData): number {
  const uniqueSpecs = new Set<string>();
  
  for (const sku of spu.skuIDs) {
    if (sku.color) uniqueSpecs.add(sku.color);
    if (sku.spec) uniqueSpecs.add(sku.spec);
    if (sku.combo) uniqueSpecs.add(sku.combo);
  }
  
  // 计算所有唯一规格的总长度
  return Array.from(uniqueSpecs).reduce((sum, spec) => sum + spec.length, 0);
}
```

**示例**：

```typescript
// SPU 1: "华为 Mate 60 Pro 12GB+512GB 雅川青"
{
  name: "华为 Mate 60 Pro 12GB+512GB 雅川青",  // 长度: 28
  brand: "华为",                                // 长度: 2
  model: "Mate 60 Pro",                        // 长度: 11
  skuIDs: [
    { color: "雅川青", spec: "12+512", ... }   // 规格长度: 3 + 6 = 9
  ],
  simplicity: 28 - 2 - 11 - 9 = 6
}

// SPU 2: "华为 Mate 60 Pro 典藏版 12GB+512GB 雅川青"
{
  name: "华为 Mate 60 Pro 典藏版 12GB+512GB 雅川青",  // 长度: 32
  brand: "华为",                                      // 长度: 2
  model: "Mate 60 Pro",                              // 长度: 11
  skuIDs: [
    { color: "雅川青", spec: "12+512", ... }         // 规格长度: 3 + 6 = 9
  ],
  simplicity: 32 - 2 - 11 - 9 = 10
}

// SPU 1 更精简（simplicity = 6 < 10）
```

**排序规则**：

当分数和版本类型相同时，`simplicity`值越小的SPU越优先。

---

## 5. 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*


### 5.1 数据预处理属性

**属性 1: 品牌提取一致性**  
*对于任何* SPU，如果其`brand`字段存在，则`extractedBrand`应该等于`brand`字段；如果`brand`字段不存在，则应该从`name`中提取品牌  
**验证需求: 2.1.1**

**属性 2: 型号标准化幂等性**  
*对于任何* 型号字符串，对其进行标准化后再次标准化应该产生相同的结果（即 `normalize(normalize(model)) === normalize(model)`）  
**验证需求: 2.1.2**

**属性 3: 规格索引完整性**  
*对于任何* SPU，其所有SKU中的颜色、容量、版本信息都应该被提取并添加到相应的索引中  
**验证需求: 2.1.3**

**属性 4: 精简度计算正确性**  
*对于任何* SPU，其精简度应该等于 `name.length - brand.length - model.length - specs.length`，其中所有长度都是非负数  
**验证需求: 2.1.4**

**属性 5: 型号标准化一致性**  
*对于任何* 型号字符串，无论是从SPU预处理还是从用户输入提取，使用相同的标准化函数应该产生相同的结果  
**验证需求: 2.1.2, 2.3.2**

### 5.2 输入处理属性

**属性 6: 清洗操作保留核心信息**  
*对于任何* 包含演示机标记的输入，清洗后应该移除标记但保留品牌、型号、规格信息  
**验证需求: 2.2.1**

**属性 7: 拼写纠错映射正确性**  
*对于任何* 配置文件中定义的拼写错误，纠错后应该替换为正确的拼写  
**验证需求: 2.2.2**

**属性 8: 缩写展开映射正确性**  
*对于任何* 配置文件中定义的缩写，展开后应该替换为完整形式  
**验证需求: 2.2.3**

**属性 9: 品牌别名映射正确性**  
*对于任何* 配置文件中定义的品牌别名，应该映射到规范的品牌名称  
**验证需求: 2.2.4**

**属性 10: 容量标准化一致性**  
*对于任何* 容量字符串（如"8GB+256GB"、"8G+256G"、"8+256"），标准化后应该产生相同的格式  
**验证需求: 2.2.5**


### 5.3 信息提取属性

**属性 11: 品牌提取置信度有效性**  
*对于任何* 输入字符串，提取的品牌信息的置信度应该在 [0, 1] 范围内  
**验证需求: 2.3.1, 2.3.6**

**属性 12: 型号提取置信度有效性**  
*对于任何* 输入字符串，提取的型号信息的置信度应该在 [0, 1] 范围内  
**验证需求: 2.3.2, 2.3.6**

**属性 13: 颜色提取置信度有效性**  
*对于任何* 输入字符串，提取的颜色信息的置信度应该在 [0, 1] 范围内  
**验证需求: 2.3.3, 2.3.6**

**属性 14: 容量提取置信度有效性**  
*对于任何* 输入字符串，提取的容量信息的置信度应该在 [0, 1] 范围内  
**验证需求: 2.3.4, 2.3.6**

**属性 15: 版本提取置信度有效性**  
*对于任何* 输入字符串，提取的版本信息的置信度应该在 [0, 1] 范围内  
**验证需求: 2.3.5, 2.3.6**

### 5.4 精确匹配属性

**属性 16: 品牌匹配大小写不敏感**  
*对于任何* 两个品牌字符串，如果它们在转换为小写后相等，则应该被判定为匹配  
**验证需求: 2.4.1**

**属性 17: 型号匹配标准化后精确比较**  
*对于任何* 两个型号字符串，只有在标准化后完全相等时才应该被判定为匹配  
**验证需求: 2.4.2**

**属性 18: 品牌索引过滤正确性**  
*对于任何* 品牌查询，品牌索引返回的所有SPU都应该具有匹配的品牌  
**验证需求: 2.4.3**

**属性 19: 版本匹配可选性**  
*对于任何* 输入，即使没有版本信息或版本不匹配，只要品牌和型号匹配，也应该能找到匹配的SPU  
**验证需求: 2.4.4**

**属性 20: 匹配分数计算正确性**  
*对于任何* 匹配结果，其分数应该等于基础分（0.8）加上版本匹配分（0-0.2），总分在 [0.8, 1.0] 范围内  
**验证需求: 2.4.5**


### 5.5 优先级排序属性

**属性 21: 多级排序正确性**  
*对于任何* 匹配结果列表，排序后应该满足：(1) 分数更高的在前，(2) 分数相同时版本类型优先级更高的在前，(3) 分数和版本类型都相同时精简度更小的在前  
**验证需求: 2.5.1, 2.5.2, 2.5.3**

**属性 22: 精简度单调性**  
*对于任何* SPU，如果在其名称中添加额外的字符（不改变品牌、型号、规格），其精简度应该增加  
**验证需求: 2.5.4**

### 5.6 SKU匹配属性

**属性 23: SKU多维度匹配完整性**  
*对于任何* SKU匹配，应该考虑颜色、容量、版本三个维度，并根据产品类型应用正确的权重  
**验证需求: 2.6.1, 2.6.2**

**属性 24: SKU分数计算正确性**  
*对于任何* SKU匹配，其分数应该等于 Σ(维度分数 × 维度权重) / Σ(维度权重)，结果在 [0, 1] 范围内  
**验证需求: 2.6.4**

**属性 25: 最佳SKU选择正确性**  
*对于任何* SKU匹配结果列表，返回的SKU应该是分数最高的那个  
**验证需求: 2.6.5**

### 5.7 模糊匹配属性

**属性 26: 模糊匹配触发条件**  
*对于任何* 匹配请求，只有当精确匹配失败或最高分数 < 0.99 时，才应该触发模糊匹配  
**验证需求: 2.7.1**

**属性 27: 模糊匹配品牌严格性**  
*对于任何* 模糊匹配结果，其品牌必须与输入品牌完全匹配（大小写不敏感）  
**验证需求: 2.7.2**

**属性 28: 模糊匹配相似度阈值**  
*对于任何* 模糊匹配结果，其型号相似度应该 ≥ 0.5  
**验证需求: 2.7.3**

**属性 29: 模糊匹配分数计算正确性**  
*对于任何* 模糊匹配结果，其分数应该等于 0.4 + 型号相似度 × 0.6，结果在 [0.4, 1.0] 范围内  
**验证需求: 2.7.4**

**属性 30: 模糊匹配类型标注**  
*对于任何* 模糊匹配结果，其`matchType`字段应该被设置为"fuzzy"  
**验证需求: 2.7.5**

---

## 6. 错误处理

### 6.1 预处理阶段错误

**场景 1: SPU缺少必要字段**
- **错误**: SPU没有`name`字段或`name`为空
- **处理**: 记录警告日志，跳过该SPU，不添加到索引
- **影响**: 该SPU无法被匹配

**场景 2: 品牌提取失败**
- **错误**: 无法从SPU名称中提取品牌
- **处理**: 记录警告日志，设置`extractedBrand`为null，继续处理
- **影响**: 该SPU可能无法通过品牌过滤

**场景 3: 型号提取失败**
- **错误**: 无法从SPU名称中提取型号
- **处理**: 记录警告日志，设置`extractedModel`和`normalizedModel`为null，继续处理
- **影响**: 该SPU可能无法通过型号匹配


### 6.2 匹配阶段错误

**场景 4: 输入为空或无效**
- **错误**: 用户输入为空字符串或null
- **处理**: 返回空的匹配结果，不抛出异常
- **影响**: 无匹配结果

**场景 5: 品牌索引查询失败**
- **错误**: 品牌索引中没有对应的品牌
- **处理**: 返回空的候选SPU列表，继续执行（可能触发模糊匹配）
- **影响**: 精确匹配失败，可能进入模糊匹配

**场景 6: 所有候选SPU都不匹配**
- **错误**: 品牌匹配但型号都不匹配
- **处理**: 返回空的匹配结果或触发模糊匹配
- **影响**: 可能需要模糊匹配或返回无结果

### 6.3 数据一致性错误

**场景 7: 预处理数据与原始数据不一致**
- **错误**: `extractedBrand`与`brand`字段不一致
- **处理**: 优先使用`extractedBrand`，记录警告日志
- **影响**: 可能影响匹配准确性

**场景 8: 标准化型号为空**
- **错误**: `normalizedModel`为null或空字符串
- **处理**: 跳过该SPU的型号匹配，记录警告日志
- **影响**: 该SPU无法通过型号匹配

---

## 7. 测试策略

### 7.1 双重测试方法

本系统采用**单元测试**和**基于属性的测试**相结合的方法：

- **单元测试**: 验证特定示例、边缘情况和错误条件
- **基于属性的测试**: 验证所有输入的通用属性

两者是互补的，对于全面覆盖都是必要的。

### 7.2 单元测试重点

单元测试应该专注于：
- 特定示例，展示正确行为
- 组件之间的集成点
- 边缘情况和错误条件

避免编写过多的单元测试 - 基于属性的测试可以处理大量输入的覆盖。

### 7.3 基于属性的测试配置

**测试库选择**: 使用 `fast-check` (TypeScript的属性测试库)

**配置要求**:
- 每个属性测试最少运行 100 次迭代（由于随机化）
- 每个属性测试必须引用其设计文档中的属性
- 标签格式: `Feature: smart-match-optimization, Property {number}: {property_text}`

**示例**:
```typescript
import fc from 'fast-check';

// Feature: smart-match-optimization, Property 2: 型号标准化幂等性
test('model normalization is idempotent', () => {
  fc.assert(
    fc.property(fc.string(), (model) => {
      const normalized = normalizeModelForMatching(model);
      const doubleNormalized = normalizeModelForMatching(normalized);
      expect(doubleNormalized).toBe(normalized);
    }),
    { numRuns: 100 }
  );
});
```


### 7.4 测试覆盖范围

**预处理阶段测试**:
- 品牌提取（中文、拼音、英文）
- 型号提取（简单型号、复杂型号、带后缀）
- 型号标准化（大小写、空格、特殊字符）
- 精简度计算（各种SPU名称长度）
- 索引构建（品牌索引、型号索引、规格索引）

**输入处理测试**:
- 清洗操作（演示机标记、礼盒标记、配件标记）
- 拼写纠错（配置文件中的所有映射）
- 缩写展开（配置文件中的所有映射）
- 品牌别名（配置文件中的所有映射）
- 容量标准化（各种格式）

**匹配阶段测试**:
- 品牌匹配（精确匹配、大小写变化）
- 型号匹配（精确匹配、标准化后匹配）
- 版本匹配（有版本、无版本、版本不匹配）
- 分数计算（基础分、版本加分）
- 优先级排序（分数、版本类型、精简度）

**SKU匹配测试**:
- 多维度匹配（颜色、容量、版本）
- 权重应用（不同产品类型）
- 分数计算（加权平均）
- 最佳SKU选择

**模糊匹配测试**:
- 触发条件（精确匹配失败、分数低）
- 品牌严格匹配
- 型号相似度计算
- 分数计算
- 类型标注

### 7.5 性能测试

**预处理性能**:
- 测试目标: 10000个SPU预处理 < 5秒
- 测试方法: 使用真实数据集，测量预处理时间
- 验证指标: 总耗时、平均每个SPU耗时

**匹配性能**:
- 测试目标: 单次匹配 < 100ms
- 测试方法: 使用各种输入，测量匹配时间
- 验证指标: 平均耗时、P95耗时、P99耗时

**批量匹配性能**:
- 测试目标: 100条记录批量匹配 < 10秒
- 测试方法: 批量处理100个输入，测量总时间
- 验证指标: 总耗时、平均每条耗时

**内存使用**:
- 测试目标: 内存占用 < 500MB
- 测试方法: 监控预处理和匹配过程的内存使用
- 验证指标: 峰值内存、平均内存

---

## 8. 实现注意事项

### 8.1 向后兼容性

**保持现有API不变**:
- `MatchingOrchestrator.match(input)` 接口保持不变
- 返回的数据结构保持不变
- 现有的配置文件格式保持不变

**内部实现变更**:
- 在`initialize`阶段增加预处理步骤
- 修改`ExactMatcher`使用预提取数据
- 扩展SPU数据结构（向后兼容）

### 8.2 性能优化

**预处理优化**:
- 使用批量处理减少函数调用开销
- 缓存品牌列表查找结果
- 并行处理独立的SPU（如果数据量大）

**匹配优化**:
- 使用品牌索引快速过滤候选SPU
- 避免重复的标准化操作
- 提前终止不匹配的比较

**内存优化**:
- 使用Map和Set存储索引（高效查找）
- 避免重复存储相同的字符串
- 及时清理不需要的临时数据


### 8.3 可维护性

**代码组织**:
- 将预处理逻辑集中在`DataPreparationService`
- 将匹配逻辑保持在`ExactMatcher`
- 避免跨组件的紧耦合

**日志和调试**:
- 记录预处理统计信息（处理的SPU数量、失败数量）
- 记录匹配过程的关键步骤
- 提供详细的匹配解释

**文档**:
- 为新增的字段和方法添加详细注释
- 更新API文档
- 提供使用示例

### 8.4 测试策略

**单元测试**:
- 测试每个新增方法的正确性
- 测试边缘情况（空输入、特殊字符等）
- 测试错误处理

**集成测试**:
- 测试完整的预处理流程
- 测试完整的匹配流程
- 测试与现有组件的集成

**基于属性的测试**:
- 为每个正确性属性编写属性测试
- 使用`fast-check`生成随机输入
- 验证属性在所有输入下都成立

**性能测试**:
- 测试预处理性能
- 测试匹配性能
- 测试内存使用

---

## 9. 迁移计划

### 9.1 阶段1: 数据结构扩展

**目标**: 扩展SPU数据结构，添加新字段

**任务**:
1. 定义`EnhancedSPUData`接口
2. 更新类型定义文件
3. 确保向后兼容

**验证**:
- 编译通过
- 现有代码不受影响

### 9.2 阶段2: 预处理实现

**目标**: 实现预处理逻辑

**任务**:
1. 在`DataPreparationService`中添加预处理方法
2. 实现品牌提取
3. 实现型号提取和标准化
4. 实现精简度计算
5. 编写单元测试和属性测试

**验证**:
- 所有测试通过
- 预处理性能达标

### 9.3 阶段3: 匹配器修改

**目标**: 修改匹配器使用预提取数据

**任务**:
1. 修改`ExactMatcher.findMatches`方法
2. 移除动态提取逻辑
3. 使用预提取的`normalizedModel`
4. 使用`simplicity`进行排序
5. 编写单元测试和属性测试

**验证**:
- 所有测试通过
- 匹配准确率不降低
- 匹配性能提升

### 9.4 阶段4: 集成和测试

**目标**: 集成所有组件并进行全面测试

**任务**:
1. 在`MatchingOrchestrator`中集成预处理
2. 运行完整的集成测试
3. 运行性能测试
4. 修复发现的问题

**验证**:
- 所有测试通过
- 性能指标达标
- 准确率达标

### 9.5 阶段5: 部署和监控

**目标**: 部署到生产环境并监控

**任务**:
1. 部署到测试环境
2. 进行用户验收测试
3. 部署到生产环境
4. 监控性能和准确率

**验证**:
- 用户验收通过
- 生产环境稳定
- 性能和准确率符合预期

---

## 10. 附录

### 10.1 术语表

- **SPU**: Standard Product Unit，标准产品单元
- **SKU**: Stock Keeping Unit，库存单元
- **精简度**: SPU名称中除核心信息外的冗余字符数
- **标准化**: 将不同格式统一为一致格式的过程
- **预处理**: 在数据加载时提前进行的数据提取和转换
- **属性测试**: 基于属性的测试，验证通用属性在所有输入下都成立

### 10.2 参考资料

- 现有代码：`Z1P-Rnew/utils/services/`
- 配置文件：`Z1P-Rnew/public/.kiro/config/text-mappings.json`
- 需求文档：`Z1P-Rnew/.kiro/specs/smart-match-optimization/requirements.md`
- TypeScript文档：https://www.typescriptlang.org/
- fast-check文档：https://github.com/dubzzz/fast-check

### 10.3 示例代码

**预处理示例**:

```typescript
// 预处理SPU列表
const enhancedSPUs = dataPreparation.preprocessSPUs(rawSPUs);

// 结果示例
console.log(enhancedSPUs[0]);
// {
//   id: 1,
//   name: "华为 Mate 60 Pro 12GB+512GB 雅川青",
//   brand: "华为",
//   extractedBrand: "华为",
//   extractedModel: "Mate 60 Pro",
//   normalizedModel: "mate60pro",
//   simplicity: 5,
//   skuIDs: [...]
// }
```

**匹配示例**:

```typescript
// 用户输入
const input = "华为 Mate 60 Pro 12GB+512GB 雅川青";

// 匹配
const result = await orchestrator.match(input);

// 结果
console.log(result);
// {
//   spu: { id: 1, name: "华为 Mate 60 Pro 12GB+512GB 雅川青", ... },
//   sku: { id: 101, color: "雅川青", spec: "12+512", ... },
//   score: 1.0,
//   explanation: { ... }
// }
```

