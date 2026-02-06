# SKU 规格排序设置功能 - 项目结构

## 已完成的任务 1：设置项目结构和核心类型定义

本文档记录了任务 1 的完成情况和创建的文件结构。

## 创建的文件

### 核心类型定义和工具函数

```
Z1P-Rnew/features/sku-spec-sorting/
├── README.md                          # 功能说明文档
├── STRUCTURE.md                       # 本文件 - 项目结构说明
├── index.ts                           # 主导出文件
├── types.ts                           # TypeScript 类型定义
├── sortUtils.ts                       # 排序工具函数
├── validationUtils.ts                 # 验证工具函数
├── categoryUtils.ts                   # 分类工具函数
└── __tests__/                         # 测试文件目录
    ├── setup.ts                       # 测试设置和 fast-check 生成器
    ├── sortUtils.test.ts              # 排序函数单元测试 (18 个测试)
    ├── validationUtils.test.ts        # 验证函数单元测试 (18 个测试)
    └── categoryUtils.test.ts          # 分类函数单元测试 (15 个测试)
```

### 配置文件更新

- **jest.config.cjs**: 已更新，添加 `features` 目录到测试根目录和覆盖率收集范围

## 类型定义 (types.ts)

定义了以下核心类型：

1. **SpecAttributeType**: 规格属性类型枚举 ('version' | 'config' | 'color')
2. **SpecAttribute**: 规格属性接口（包含 id, name, type, sortOrder 等字段）
3. **SortOperation**: 排序操作接口
4. **ValidationResult**: 验证结果接口
5. **CategorizedSpecs**: 分类后的规格属性接口
6. **SDKResponse**: SDK 接口响应基础结构
7. **AllSpuSpecAttributeRequest/Response**: 获取规格属性的请求/响应类型
8. **EditSpuSpecAttributeRequest/Response**: 编辑规格属性的请求/响应类型
9. **SpecSortingPageState**: 页面状态接口

## 工具函数

### sortUtils.ts - 排序工具函数

- `initializeSortOrders()`: 初始化排序序号
- `recalculateSortOrders()`: 拖拽后重新计算排序序号
- `swapSortOrders()`: 按钮移动后重新计算排序序号
- `sortByOrderDescending()`: 按排序号降序排列

### validationUtils.ts - 验证工具函数

- `validateSortOrders()`: 验证排序序号的有效性（唯一性和正整数）
- `validateSpecAttribute()`: 验证单个规格属性的数据格式
- `validateSpecAttributeList()`: 批量验证规格属性列表

### categoryUtils.ts - 分类工具函数

- `categorizeAndSortSpecs()`: 按类型分组并排序规格属性
- `mergeCategorizedSpecs()`: 合并分类后的规格属性为单一列表
- `findSpecIndexInCategory()`: 查找规格属性在其类别中的索引

## 测试框架配置

### 测试工具

- **Jest**: 单元测试框架（已配置）
- **ts-jest**: TypeScript 支持（已配置）
- **fast-check**: 基于属性的测试库（已安装，v4.5.3）

### 测试生成器 (setup.ts)

创建了以下 fast-check 生成器用于基于属性的测试：

- `specAttributeTypeArbitrary`: 生成随机的规格属性类型
- `specAttributeArbitrary`: 生成随机的规格属性对象
- `specAttributeListOfType()`: 生成指定类型的规格属性列表
- `specAttributeListArbitrary()`: 生成混合类型的规格属性列表

辅助函数：
- `isDescending()`: 检查列表是否按降序排列
- `haveSameIds()`: 检查两个列表是否包含相同的 ID

常量：
- `PBT_NUM_RUNS = 100`: 基于属性的测试默认运行次数

## 测试覆盖

### 当前测试统计

- **测试套件**: 3 个
- **测试用例**: 51 个
- **通过率**: 100%

### 测试分布

1. **sortUtils.test.ts**: 18 个测试
   - initializeSortOrders: 4 个测试
   - recalculateSortOrders: 5 个测试
   - swapSortOrders: 5 个测试
   - sortByOrderDescending: 4 个测试

2. **validationUtils.test.ts**: 18 个测试
   - validateSortOrders: 7 个测试
   - validateSpecAttribute: 7 个测试
   - validateSpecAttributeList: 4 个测试

3. **categoryUtils.test.ts**: 15 个测试
   - categorizeAndSortSpecs: 5 个测试
   - mergeCategorizedSpecs: 4 个测试
   - findSpecIndexInCategory: 6 个测试

## 核心设计原则

### 排序规则

- **降序显示**: sortOrder 值越大的项越靠前
- **间隔分配**: 使用 10 的倍数作为间隔（10, 20, 30...），便于后续插入
- **类型隔离**: 每个类型栏（版本、配置、颜色）独立排序

### 数据验证

- sortOrder 必须是正整数（> 0）
- 同一类型栏内的 sortOrder 不能重复
- 必需字段：id, name, type, sortOrder

### 函数式设计

- 所有工具函数都是纯函数，不修改输入参数
- 返回新的对象/数组，保持不可变性
- 便于测试和推理

## 下一步

任务 1 已完成。接下来的任务包括：

- **任务 2**: 实现核心排序和验证逻辑（包括基于属性的测试）
- **任务 3**: 实现 SDK 接口适配器
- **任务 4-6**: 实现 UI 组件
- **任务 7**: 实现主页面组件
- **任务 8-11**: 集成测试和优化

## 使用示例

```typescript
import {
  SpecAttribute,
  categorizeAndSortSpecs,
  initializeSortOrders,
  validateSortOrders
} from '@/features/sku-spec-sorting';

// 示例：分类和排序
const specs: SpecAttribute[] = [
  { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
  { id: '2', name: 'C1', type: 'color', sortOrder: 20 }
];

const categorized = categorizeAndSortSpecs(specs);
// categorized.version = [V1]
// categorized.color = [C1]

// 示例：验证
const validation = validateSortOrders(specs);
if (!validation.valid) {
  console.error('验证失败:', validation.errors);
}
```

## 技术栈

- **语言**: TypeScript 5.9.3
- **测试框架**: Jest 30.2.0 + ts-jest 29.4.6
- **属性测试**: fast-check 4.5.3
- **前端框架**: React 18.3.1 (用于后续 UI 组件)
- **UI 库**: Ant Design 5.29.3 (用于后续 UI 组件)
- **拖拽库**: react-dnd 16.0.1 (用于后续拖拽功能)

## 文档

- [功能说明](./README.md)
- [需求文档](../../../.kiro/specs/sku-spec-sorting/requirements.md)
- [设计文档](../../../.kiro/specs/sku-spec-sorting/design.md)
- [任务列表](../../../.kiro/specs/sku-spec-sorting/tasks.md)
