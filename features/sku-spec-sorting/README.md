# SKU 规格排序设置功能

商品规格排序设置功能允许管理员管理和自定义 SKU 规格属性的显示顺序。

## 目录结构

```
sku-spec-sorting/
├── README.md                 # 功能说明文档
├── index.ts                  # 主导出文件
├── types.ts                  # TypeScript 类型定义
├── sortUtils.ts              # 排序相关工具函数
├── validationUtils.ts        # 验证相关工具函数
├── categoryUtils.ts          # 分类相关工具函数
├── sdkAdapter.ts             # SDK 接口适配器
└── __tests__/                # 测试文件目录
    ├── setup.ts              # 测试设置和生成器
    ├── sortUtils.test.ts     # 排序函数单元测试
    ├── validationUtils.test.ts  # 验证函数单元测试
    ├── categoryUtils.test.ts    # 分类函数单元测试
    ├── sdkAdapter.test.ts       # SDK 适配器单元测试
    └── properties.test.ts       # 基于属性的测试
```

## 核心概念

### 规格属性类型

系统支持三种规格属性类型：
- **version**: 版本（如 iPhone 14, iPhone 14 Pro）
- **config**: 配置（如 128GB, 256GB）
- **color**: 颜色（如 黑色, 白色）

### 排序规则

- 排序序号（sortOrder）是数值类型
- **降序显示**：sortOrder 值越大的项越靠前
- 每个类型栏内独立排序
- 排序序号必须是正整数且唯一

### 排序操作

支持两种排序方式：
1. **拖拽排序**：在同一类型栏内拖动规格属性到新位置
2. **按钮排序**：使用上移/下移按钮精确调整位置

## 使用示例

### 导入模块

```typescript
import {
  // 类型
  SpecAttribute,
  CategorizedSpecs,
  ValidationResult,
  
  // 排序函数
  initializeSortOrders,
  recalculateSortOrders,
  swapSortOrders,
  
  // 验证函数
  validateSortOrders,
  validateSpecAttribute,
  
  // 分类函数
  categorizeAndSortSpecs,
  
  // SDK 适配器
  getAllSpuSpecAttributes,
  editSpuSpecAttribute,
  batchUpdateSortOrders,
  SDKError
} from '@/features/sku-spec-sorting';
```

### SDK 接口调用

#### 获取所有规格属性

```typescript
import { getAllSpuSpecAttributes } from '@/features/sku-spec-sorting';

try {
  const response = await getAllSpuSpecAttributes({
    auth: jwtToken
  });
  
  console.log('规格属性列表:', response.data);
} catch (error) {
  if (error instanceof SDKError) {
    console.error('SDK 错误:', error.message, error.code);
  }
}
```

#### 编辑规格属性

```typescript
import { editSpuSpecAttribute } from '@/features/sku-spec-sorting';

try {
  const response = await editSpuSpecAttribute({
    id: 'spec-id',
    name: '新名称',
    sortOrder: 150,
    auth: jwtToken
  });
  
  console.log('更新成功:', response.data);
} catch (error) {
  if (error instanceof SDKError) {
    console.error('更新失败:', error.message);
  }
}
```

#### 批量更新排序

```typescript
import { batchUpdateSortOrders } from '@/features/sku-spec-sorting';

const specs = [
  { id: '1', sortOrder: 100 },
  { id: '2', sortOrder: 90 },
  { id: '3', sortOrder: 80 }
];

const result = await batchUpdateSortOrders(specs, jwtToken);

if (result.success) {
  console.log('所有更新成功');
} else {
  console.log('部分更新失败:', result.failedIds);
}
```

#### 自定义重试配置

```typescript
import { getAllSpuSpecAttributes } from '@/features/sku-spec-sorting';

const response = await getAllSpuSpecAttributes(
  { auth: jwtToken },
  {
    maxRetries: 5,           // 最大重试次数
    retryDelay: 2000,        // 重试延迟（毫秒）
    exponentialBackoff: true // 使用指数退避
  }
);
```

### 初始化排序

```typescript
const specs: SpecAttribute[] = [
  { id: '1', name: 'V1', type: 'version', sortOrder: 0 },
  { id: '2', name: 'V2', type: 'version', sortOrder: 0 }
];

const initialized = initializeSortOrders(specs);
// initialized[0].sortOrder = 20
// initialized[1].sortOrder = 10
```

### 分类和排序

```typescript
const allSpecs: SpecAttribute[] = [
  { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
  { id: '2', name: 'C1', type: 'color', sortOrder: 20 },
  { id: '3', name: 'V2', type: 'version', sortOrder: 10 }
];

const categorized = categorizeAndSortSpecs(allSpecs);
// categorized.version = [V1(30), V2(10)]
// categorized.config = []
// categorized.color = [C1(20)]
```

### 拖拽排序

```typescript
const specs: SpecAttribute[] = [
  { id: '1', name: 'A', type: 'version', sortOrder: 30 },
  { id: '2', name: 'B', type: 'version', sortOrder: 20 },
  { id: '3', name: 'C', type: 'version', sortOrder: 10 }
];

// 将第一项拖到最后
const reordered = recalculateSortOrders(specs, 0, 2);
// 结果顺序: B, C, A
```

### 按钮移动

```typescript
const specs: SpecAttribute[] = [
  { id: '1', name: 'A', type: 'version', sortOrder: 30 },
  { id: '2', name: 'B', type: 'version', sortOrder: 20 }
];

// 将第二项上移
const moved = swapSortOrders(specs, 1, 'up');
// 结果顺序: B, A
```

### 数据验证

```typescript
const specs: SpecAttribute[] = [
  { id: '1', name: 'A', type: 'version', sortOrder: 10 },
  { id: '2', name: 'B', type: 'version', sortOrder: 10 } // 重复
];

const validation = validateSortOrders(specs);
// validation.valid = false
// validation.errors = ['排序序号 10 重复']
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test sortUtils.test.ts

# 运行基于属性的测试
npm test properties.test.ts
```

### 测试策略

本功能采用双重测试方法：

1. **单元测试**：验证特定示例、边缘情况和错误条件
2. **基于属性的测试**：使用 fast-check 验证通用属性，每个测试运行 100 次迭代

## 相关文档

- [需求文档](../../../.kiro/specs/sku-spec-sorting/requirements.md)
- [设计文档](../../../.kiro/specs/sku-spec-sorting/design.md)
- [任务列表](../../../.kiro/specs/sku-spec-sorting/tasks.md)
