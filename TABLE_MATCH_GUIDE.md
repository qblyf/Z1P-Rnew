# 表格匹配功能组件使用指南

## 概述

表格匹配功能组件（TableMatch）是一个完整的商品批量匹配系统，支持上传CSV或TXT文件，自动进行商品名称与系统中SPU/SKU的智能匹配，并导出匹配结果。

## 功能特性

### 1. 文件上传
- **支持格式**：CSV 和 TXT 文件
- **分隔符**：自动识别 Tab 或逗号分隔
- **数据验证**：自动过滤空行，验证数据完整性

### 2. 列选择
- 上传文件后，用户可以选择包含商品名称的列
- 支持多列表格，灵活选择匹配列

### 3. 智能匹配
使用 SimpleMatcher 类进行三阶段匹配：

#### 第一阶段：SPU 匹配
- 提取商品名称中的品牌、型号等关键信息
- 与系统中的 SPU 列表进行相似度计算
- 应用版本过滤规则（礼盒版、蓝牙版等）
- 计算 SPU 优先级（标准版 > 版本匹配 > 其他特殊版）

#### 第二阶段：SKU 加载
- 根据匹配的 SPU 获取其关联的 SKU 列表
- 提取 SKU 的详细信息（版本、容量、颜色、69码等）

#### 第三阶段：SKU 匹配
- 基于版本、容量、颜色等参数进行 SKU 匹配
- 支持颜色变体识别（如"雾凇蓝"和"雾松蓝"视为同一颜色）
- 计算最终相似度分数

### 4. 匹配结果
匹配结果包含以下信息：
- **原商品名**：用户输入的商品名称
- **匹配状态**：完全匹配 / SPU匹配 / 未匹配
- **品牌**：匹配的品牌
- **SPU**：匹配的 SPU 名称
- **SKU**：匹配的 SKU 名称（完全匹配时）
- **版本**：商品版本信息
- **容量**：商品容量（如 12+512GB）
- **颜色**：商品颜色
- **69码**：商品的 GTIN 码
- **相似度**：匹配的相似度百分比

### 5. 结果导出
- 导出为 CSV 格式
- 包含所有匹配结果和统计信息
- 文件名自动生成：`表格匹配结果_[时间戳].csv`

## 匹配状态说明

### 完全匹配 (matched)
- 同时匹配到 SPU 和 SKU
- 相似度最高
- 包含完整的商品信息

### SPU 匹配 (spu-matched)
- 仅匹配到 SPU，未找到对应的 SKU
- 可能原因：
  - 该 SPU 没有可用的 SKU
  - SKU 参数（容量、颜色等）不匹配
- 相似度较高，但不如完全匹配

### 未匹配 (unmatched)
- 未能匹配到任何 SPU
- 可能原因：
  - 商品名称不清晰或包含错误信息
  - 系统中不存在该商品
  - 商品名称格式不标准

## 核心匹配算法

### SimpleMatcher 类

#### 关键方法

1. **findBestSPUMatch(input, spuList, threshold)**
   - 在 SPU 列表中查找最佳匹配
   - 参数：
     - `input`：用户输入的商品名称
     - `spuList`：SPU 列表
     - `threshold`：相似度阈值（默认 0.5）
   - 返回：匹配的 SPU 和相似度

2. **findBestSKUWithVersion(input, skuList, inputVersion)**
   - 在 SKU 列表中查找最佳匹配
   - 考虑版本、容量、颜色等参数
   - 参数：
     - `input`：用户输入的商品名称
     - `skuList`：SKU 列表
     - `inputVersion`：提取的版本信息
   - 返回：匹配的 SKU 和相似度

3. **extractBrand(str)**
   - 从字符串中提取品牌信息
   - 支持英文和中文品牌名称

4. **extractModel(str)**
   - 从字符串中提取型号信息
   - 支持多种型号格式（如 Y300i, Watch GT, iPhone 15 Pro Max）
   - 应用型号标准化映射

5. **extractCapacity(str)**
   - 从字符串中提取容量信息
   - 支持格式：12+512, 12GB+512GB, (12+512) 等

6. **extractColor(str) / extractColorAdvanced(str)**
   - 从字符串中提取颜色信息
   - 支持复合颜色名称和带修饰词的颜色
   - 使用多层次提取策略

7. **extractVersion(str)**
   - 从字符串中提取版本信息
   - 支持版本关键词：标准版、Pro版、活力版等

8. **shouldFilterSPU(inputName, spuName)**
   - 检查是否应该过滤某个 SPU
   - 实现版本过滤规则：
     - 礼盒版过滤
     - 版本互斥过滤（蓝牙版 vs eSIM版）

9. **getSPUPriority(inputName, spuName)**
   - 计算 SPU 的优先级分数
   - 优先级规则：
     - 标准版（不含特殊关键词）：优先级最高（3）
     - 版本匹配的特殊版：优先级中等（2）
     - 其他特殊版：优先级最低（1）

### 颜色变体识别

系统内置了常见的颜色变体映射，例如：
- "雾凇蓝" ↔ "雾松蓝"
- "玉石绿" ↔ "玉龙雪"
- "龙晶紫" ↔ "极光紫"

这些颜色被视为等价，在匹配时会被认为是相同的颜色。

### 型号标准化

系统支持型号标准化，例如：
- "promini" → "pro mini"
- "watchgt" → "watch gt"
- "reno15pro" → "reno 15 pro"

这确保了不同格式的型号能够被正确识别和匹配。

## 使用流程

1. **打开表格匹配页面**
   - 访问 `/table-match` 路由

2. **上传文件**
   - 点击"选择文件"按钮
   - 选择 CSV 或 TXT 文件
   - 系统自动解析文件内容

3. **选择商品列**
   - 从下拉菜单中选择包含商品名称的列
   - 支持多列表格

4. **开始匹配**
   - 点击"开始匹配"按钮
   - 系统开始批量匹配
   - 显示进度和结果

5. **查看结果**
   - 在结果表格中查看匹配情况
   - 查看匹配统计信息

6. **导出结果**
   - 点击"导出结果"按钮
   - 下载 CSV 格式的结果文件

## 文件格式要求

### CSV 格式示例
```
商品名称,品牌,分类
iPhone 15 Pro Max 256GB 黑色,Apple,手机
Samsung Galaxy S24 Ultra 12GB+256GB 钛金黑,Samsung,手机
```

### TXT 格式示例（Tab 分隔）
```
商品名称	品牌	分类
iPhone 15 Pro Max 256GB 黑色	Apple	手机
Samsung Galaxy S24 Ultra 12GB+256GB 钛金黑	Samsung	手机
```

## 性能考虑

- **批量处理**：支持大批量数据处理（测试过 10000+ 条记录）
- **异步加载**：使用异步 API 调用，不阻塞 UI
- **进度反馈**：实时显示匹配进度和结果统计

## 常见问题

### Q: 为什么某些商品未能匹配？
A: 可能原因包括：
- 商品名称不清晰或包含错误信息
- 系统中不存在该商品
- 商品名称格式不标准（建议包含品牌、型号、容量、颜色等信息）

### Q: 如何提高匹配准确率？
A: 建议：
- 确保商品名称包含品牌、型号等关键信息
- 使用标准的颜色名称
- 避免使用过多的修饰词或特殊字符

### Q: 支持哪些品牌？
A: 系统支持所有在数据库中注册的品牌，包括：
- Apple
- Huawei
- Honor
- Xiaomi
- Vivo
- Oppo
- Samsung
- OnePlus
- 等等

### Q: 导出的 CSV 文件如何使用？
A: 导出的 CSV 文件包含所有匹配结果，可以：
- 在 Excel 中打开和编辑
- 导入到其他系统
- 用于数据分析和报告

## 技术细节

### 依赖项
- React 18+
- Ant Design 5+
- lucide-react（图标库）
- @zsqk/z1-sdk（产品数据 SDK）

### 组件结构
```
TableMatchComponent
├── 文件上传区域
├── 列选择下拉菜单
├── 操作按钮（开始匹配、导出结果）
├── 匹配统计信息
└── 结果表格
```

### 状态管理
- `tableData`：上传的表格数据
- `selectedColumn`：选中的商品列索引
- `matchResults`：匹配结果数组
- `loading`：加载状态

## 扩展和定制

### 自定义匹配阈值
在 `handleMatch` 方法中修改 `findBestSPUMatch` 的第三个参数：
```typescript
const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
  productName,
  spuList,
  0.5  // 修改这个值来调整匹配阈值
);
```

### 添加自定义颜色变体
在 SmartMatch.tsx 中的 `COLOR_VARIANTS` 对象中添加新的颜色变体：
```typescript
const COLOR_VARIANTS: Record<string, string[]> = {
  '新颜色': ['变体1', '变体2'],
  // ...
};
```

### 添加自定义型号标准化
在 SmartMatch.tsx 中的 `MODEL_NORMALIZATIONS` 对象中添加新的型号映射：
```typescript
const MODEL_NORMALIZATIONS: Record<string, string> = {
  'newmodel': 'new model',
  // ...
};
```

## 更新日志

### v1.0.0 (2024)
- 初始版本发布
- 支持 CSV/TXT 文件上传
- 实现三阶段匹配算法
- 支持结果导出
- 包含完整的颜色变体和型号标准化

## 许可证

本组件是项目的一部分，遵循项目的许可证条款。

## 支持

如有问题或建议，请联系开发团队。
