# 智能匹配系统第二阶段改进 - 任务文档

## 任务概览

本文档定义了第二阶段改进的具体实施任务。总共 5 个需求，分解为 15 个具体任务。

---

## 任务 1: 特殊产品类型识别 (PHASE2-1)

### 任务 1.1: 定义产品类型特征 (PHASE2-1-1)

**目标**: 在 SmartMatch.tsx 中定义产品类型特征常量

**实施步骤**:
1. 在 SimpleMatcher 类前添加 PRODUCT_TYPE_FEATURES 常量
2. 定义 watch、tablet、laptop、earbuds、band、phone 六种产品类型
3. 为每种类型定义关键词、型号正则、特殊参数等

**验收标准**:
- ✅ 常量定义完整，包含所有 6 种产品类型
- ✅ 每种类型都有关键词、型号正则、特殊参数
- ✅ 正则表达式正确，能够匹配各种格式
- ✅ TypeScript 类型检查通过

**预期时间**: 1 小时

---

### 任务 1.2: 实现产品类型检测方法 (PHASE2-1-2)

**目标**: 在 SimpleMatcher 类中实现 detectProductType 方法

**实施步骤**:
1. 添加 detectProductType(input: string): ProductType 方法
2. 遍历 PRODUCT_TYPE_FEATURES，检查输入中的关键词
3. 返回匹配的产品类型，默认返回 'unknown'

**验收标准**:
- ✅ 方法能够正确识别各种产品类型
- ✅ 对于不明确的输入返回 'unknown'
- ✅ 性能良好（O(1) 时间复杂度）
- ✅ 单元测试通过

**测试用例**:
```typescript
expect(matcher.detectProductType('华为WatchGT6')).toBe('watch');
expect(matcher.detectProductType('华为MatePad Pro')).toBe('tablet');
expect(matcher.detectProductType('华为MateBook14')).toBe('laptop');
expect(matcher.detectProductType('华为P50')).toBe('phone');
```

**预期时间**: 1 小时

---

### 任务 1.3: 实现特殊参数提取方法 (PHASE2-1-3)

**目标**: 在 SimpleMatcher 类中实现 extractSpecialParams 方法

**实施步骤**:
1. 添加 extractSpecialParams(input: string, productType: ProductType) 方法
2. 使用产品类型的 paramPattern 提取特殊参数
3. 返回参数对象 { size?, screen?, version? }

**验收标准**:
- ✅ 能够正确提取尺寸信息（如 "42mm"、"11寸"）
- ✅ 能够正确提取屏幕参数（如 "柔光版"、"标准版"）
- ✅ 能够正确提取版本信息
- ✅ 单元测试通过

**测试用例**:
```typescript
const params = matcher.extractSpecialParams('华为WatchGT6 41mm 柔光版', 'watch');
expect(params.size).toBe('41mm');
expect(params.version).toBe('柔光版');
```

**预期时间**: 1 小时

---

### 任务 1.4: 改进型号提取方法 (PHASE2-1-4)

**目标**: 改进 extractModel 方法，支持按产品类型提取

**实施步骤**:
1. 添加 extractModelByType(input: string, productType: ProductType) 方法
2. 移除特殊参数后再提取型号
3. 使用产品类型特定的正则进行提取
4. 保留原有的 extractModel 方法作为后备

**验收标准**:
- ✅ 能够正确提取各种产品类型的型号
- ✅ 不被特殊参数干扰
- ✅ 返回标准化的型号格式
- ✅ 单元测试通过

**测试用例**:
```typescript
expect(matcher.extractModelByType('华为WatchGT6 41mm', 'watch')).toBe('watch gt 6');
expect(matcher.extractModelByType('华为MatePad Pro 11寸', 'tablet')).toBe('mate pad pro');
expect(matcher.extractModelByType('华为MateBook14 i7', 'laptop')).toBe('mate book 14');
```

**预期时间**: 1.5 小时

---

### 任务 1.5: 集成产品类型识别到主流程 (PHASE2-1-5)

**目标**: 在 handleMatch 方法中集成产品类型识别

**实施步骤**:
1. 在 handleMatch 中调用 detectProductType
2. 使用 extractModelByType 替代 extractModel
3. 记录产品类型信息用于调试

**验收标准**:
- ✅ 产品类型检测正确集成
- ✅ 型号提取使用产品类型特定的方法
- ✅ 不影响现有的匹配流程
- ✅ 集成测试通过

**预期时间**: 1 小时

---

## 任务 2: 版本/变体处理改进 (PHASE2-2)

### 任务 2.1: 定义版本关键词 (PHASE2-2-1)

**目标**: 定义版本关键词常量

**实施步骤**:
1. 在 SimpleMatcher 类前添加 VERSION_KEYWORDS 常量
2. 定义 6 种版本：standard、lite、enjoy、premium、pro、ultra
3. 为每种版本定义关键词和优先级

**验收标准**:
- ✅ 常量定义完整
- ✅ 每种版本都有关键词
- ✅ 优先级设置合理
- ✅ TypeScript 类型检查通过

**预期时间**: 0.5 小时

---

### 任务 2.2: 实现版本提取方法 (PHASE2-2-2)

**目标**: 在 SimpleMatcher 类中实现 extractVersion 方法

**实施步骤**:
1. 添加 extractVersion(input: string): VersionInfo | null 方法
2. 遍历 VERSION_KEYWORDS，检查输入中的关键词
3. 返回匹配的版本信息，未匹配返回 null

**验收标准**:
- ✅ 方法能够正确识别各种版本
- ✅ 对于不包含版本的输入返回 null
- ✅ 单元测试通过

**测试用例**:
```typescript
expect(matcher.extractVersion('华为P50 活力版')).toEqual({ name: '活力版', ... });
expect(matcher.extractVersion('华为P50')).toBeNull();
```

**预期时间**: 0.5 小时

---

### 任务 2.3: 改进 SKU 匹配逻辑 (PHASE2-2-3)

**目标**: 改进 findBestSKU 方法，考虑版本信息

**实施步骤**:
1. 添加 findBestSKUWithVersion 方法
2. 在匹配时考虑版本信息（权重 30%）
3. 容量匹配权重 40%，颜色匹配权重 30%
4. 返回最佳匹配的 SKU 和相似度

**验收标准**:
- ✅ 版本匹配优先级正确
- ✅ 权重分配合理
- ✅ 能够处理没有版本信息的情况
- ✅ 单元测试通过

**预期时间**: 1.5 小时

---

### 任务 2.4: 集成版本处理到主流程 (PHASE2-2-4)

**目标**: 在 handleMatch 方法中集成版本处理

**实施步骤**:
1. 在 handleMatch 中调用 extractVersion
2. 使用 findBestSKUWithVersion 替代 findBestSKU
3. 记录版本信息用于调试

**验收标准**:
- ✅ 版本处理正确集成
- ✅ SKU 匹配使用版本信息
- ✅ 不影响现有的匹配流程
- ✅ 集成测试通过

**预期时间**: 1 小时

---

## 任务 3: 特殊颜色名称识别 (PHASE2-3)

### 任务 3.1: 扩展颜色识别库 (PHASE2-3-1)

**目标**: 定义扩展的颜色识别库

**实施步骤**:
1. 在 SimpleMatcher 类前添加 EXTENDED_COLOR_MAP 常量
2. 定义至少 20 种特殊颜色及其变体
3. 为每种颜色定义别名和分类

**验收标准**:
- ✅ 颜色库包含常见的特殊颜色
- ✅ 每种颜色都有变体和别名
- ✅ 颜色分类正确
- ✅ TypeScript 类型检查通过

**预期时间**: 1 小时

---

### 任务 3.2: 改进颜色提取方法 (PHASE2-3-2)

**目标**: 改进 extractColor 方法，支持特殊颜色识别

**实施步骤**:
1. 添加 extractColorAdvanced 方法
2. 使用扩展颜色库进行匹配
3. 支持别名匹配
4. 支持从字符串末尾提取颜色

**验收标准**:
- ✅ 能够识别特殊颜色名称
- ✅ 能够识别颜色别名
- ✅ 能够从末尾提取颜色
- ✅ 单元测试通过

**测试用例**:
```typescript
expect(matcher.extractColorAdvanced('华为P50 玉石绿')).toBe('玉石绿');
expect(matcher.extractColorAdvanced('华为P50 玉绿')).toBe('玉石绿');
```

**预期时间**: 1 小时

---

### 任务 3.3: 改进颜色匹配算法 (PHASE2-3-3)

**目标**: 改进 isColorMatch 方法，支持颜色变体匹配

**实施步骤**:
1. 添加 isColorMatchAdvanced 方法
2. 支持完全匹配
3. 支持变体匹配
4. 支持分类匹配
5. 支持基础颜色匹配

**验收标准**:
- ✅ 完全匹配正确
- ✅ 变体匹配正确
- ✅ 分类匹配正确
- ✅ 基础颜色匹配正确
- ✅ 单元测试通过

**预期时间**: 1 小时

---

### 任务 3.4: 集成颜色识别到主流程 (PHASE2-3-4)

**目标**: 在 handleMatch 方法中集成改进的颜色识别

**实施步骤**:
1. 在 handleMatch 中调用 extractColorAdvanced
2. 在 SKU 匹配时使用 isColorMatchAdvanced
3. 记录颜色信息用于调试

**验收标准**:
- ✅ 颜色识别正确集成
- ✅ 颜色匹配使用改进的算法
- ✅ 不影响现有的匹配流程
- ✅ 集成测试通过

**预期时间**: 0.5 小时

---

## 任务 4: 产品名称格式统一 (PHASE2-4)

### 任务 4.1: 改进输入预处理 (PHASE2-4-1)

**目标**: 改进 preprocessInput 方法，处理格式差异

**实施步骤**:
1. 添加 preprocessInputAdvanced 方法
2. 处理空格变体（"Reno15" → "Reno 15"）
3. 处理大小写（首字母大写）
4. 清理多余空格
5. 处理特殊字符（"（" → "("）
6. 移除型号代码

**验收标准**:
- ✅ 空格变体处理正确
- ✅ 大小写处理正确
- ✅ 特殊字符处理正确
- ✅ 型号代码移除正确
- ✅ 单元测试通过

**测试用例**:
```typescript
expect(matcher.preprocessInputAdvanced('reno15')).toBe('Reno 15');
expect(matcher.preprocessInputAdvanced('华为P50（WA2456C）')).toBe('华为 P 50');
```

**预期时间**: 1 小时

---

### 任务 4.2: 集成格式统一到主流程 (PHASE2-4-2)

**目标**: 在 handleMatch 方法中集成改进的预处理

**实施步骤**:
1. 在 handleMatch 中调用 preprocessInputAdvanced
2. 替代原有的 preprocessInput 调用
3. 记录预处理结果用于调试

**验收标准**:
- ✅ 预处理正确集成
- ✅ 格式统一有效
- ✅ 不影响现有的匹配流程
- ✅ 集成测试通过

**预期时间**: 0.5 小时

---

## 任务 5: 多品牌混淆处理 (PHASE2-5)

### 任务 5.1: 改进品牌识别优先级 (PHASE2-5-1)

**目标**: 改进 extractBrand 方法，支持优先级识别

**实施步骤**:
1. 添加 extractBrandWithPriority 方法
2. 定义三个优先级：产品品牌（0.9）、子品牌（0.7）、配件品牌（0.3）
3. 按优先级顺序检查品牌
4. 返回品牌和置信度

**验收标准**:
- ✅ 优先级识别正确
- ✅ 置信度计算正确
- ✅ 能够区分产品品牌和配件品牌
- ✅ 单元测试通过

**预期时间**: 0.5 小时

---

### 任务 5.2: 实现品牌验证方法 (PHASE2-5-2)

**目标**: 实现 verifyBrandByModel 方法

**实施步骤**:
1. 添加 verifyBrandByModel(brand: string, model: string): boolean 方法
2. 构建品牌-型号映射
3. 检查型号是否与品牌匹配
4. 返回验证结果

**验收标准**:
- ✅ 品牌-型号映射完整
- ✅ 验证逻辑正确
- ✅ 能够处理多个型号
- ✅ 单元测试通过

**测试用例**:
```typescript
expect(matcher.verifyBrandByModel('xiaomi', 'redmi note 11')).toBe(true);
expect(matcher.verifyBrandByModel('xiaomi', 'mate 50')).toBe(false);
```

**预期时间**: 0.5 小时

---

### 任务 5.3: 集成品牌处理到主流程 (PHASE2-5-3)

**目标**: 在 handleMatch 方法中集成改进的品牌处理

**实施步骤**:
1. 在 handleMatch 中调用 extractBrandWithPriority
2. 使用 verifyBrandByModel 进行反向确认
3. 记录品牌信息用于调试

**验收标准**:
- ✅ 品牌处理正确集成
- ✅ 品牌验证有效
- ✅ 不影响现有的匹配流程
- ✅ 集成测试通过

**预期时间**: 1 小时

---

## 总体任务统计

| 任务 | 数量 | 预期时间 |
|------|------|--------|
| PHASE2-1 (产品类型) | 5 | 5.5 小时 |
| PHASE2-2 (版本处理) | 4 | 4 小时 |
| PHASE2-3 (颜色识别) | 4 | 3.5 小时 |
| PHASE2-4 (格式统一) | 2 | 1.5 小时 |
| PHASE2-5 (品牌处理) | 3 | 2 小时 |
| **总计** | **18** | **16.5 小时** |

---

## 实施顺序建议

1. **PHASE2-1**: 特殊产品类型识别（高优先级，影响最大）
2. **PHASE2-4**: 产品名称格式统一（高优先级，基础性改进）
3. **PHASE2-2**: 版本/变体处理改进（中优先级）
4. **PHASE2-3**: 特殊颜色名称识别（中优先级）
5. **PHASE2-5**: 多品牌混淆处理（中优先级）

---

## 测试策略

### 单元测试
- 每个方法都需要单元测试
- 测试用例应覆盖正常情况和边界情况
- 使用 Jest 框架

### 集成测试
- 测试完整的 handleMatch 流程
- 测试多个修复的组合效果
- 使用真实的 CSV 数据进行测试

### 回归测试
- 确保第一阶段的修复仍然有效
- 确保新修复不会破坏现有功能
- 对比修复前后的准确率

---

## 成功标准

1. ✅ 所有 18 个任务都完成
2. ✅ 所有单元测试通过
3. ✅ 所有集成测试通过
4. ✅ 准确率从 73.5% 提升到 83.5%
5. ✅ 代码无错误，通过 TypeScript 类型检查
6. ✅ 所有修改都已提交到 Git
