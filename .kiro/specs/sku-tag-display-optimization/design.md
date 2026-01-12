# SKU 标签展现形式优化 - 设计文档

## 概述

本设计文档描述了如何优化 SKU 管理页面中版本、配置、颜色的展现形式。通过改进 Ant Design Select 组件的样式和视觉展现，使其更像标签形式，提供更直观的视觉体验。

## 架构

### 组件结构

```
SKUManager (现有)
├── Select (版本) - 样式优化
├── Select (配置) - 样式优化
└── Select (颜色) - 样式优化
```

### 数据流

```
SKUManager (状态管理)
    ↓
    ├─→ Select (版本) - 样式优化后
    ├─→ Select (配置) - 样式优化后
    └─→ Select (颜色) - 样式优化后
```

## 样式优化策略

### Select 组件样式改进

通过 CSS 样式优化，使 Ant Design Select 组件在 `mode="tags"` 时呈现更好的标签形式：

1. **标签容器样式**
   - 增加圆角和间距
   - 改进背景色和边框
   - 优化标签之间的间距

2. **标签项样式**
   - 应用不同的颜色方案（版本、配置、颜色）
   - 改进删除按钮的样式
   - 添加悬停效果

3. **输入框样式**
   - 改进输入框的外观
   - 优化焦点状态
   - 改进禁用状态

## 数据模型

### 标签类型

```typescript
type TagType = 'combo' | 'spec' | 'color';

interface TagDefinition {
  id: number;
  name: string;
  type: TagType;
}
```

## 样式设计

### 标签样式

```css
/* Select 组件在 mode="tags" 时的样式优化 */
.ant-select-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  background-color: #fafafa;
  transition: all 0.3s ease;
}

.ant-select-selector:hover {
  border-color: #40a9ff;
  background-color: #fff;
}

.ant-select-selector:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 标签项样式 */
.ant-select-selection-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.ant-select-selection-item:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

/* 删除按钮样式 */
.ant-select-selection-item-remove {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.ant-select-selection-item-remove:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* 禁用状态 */
.ant-select-disabled .ant-select-selector {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.ant-select-disabled .ant-select-selection-item {
  opacity: 0.6;
}
```

### 颜色方案

```typescript
const tagColorScheme = {
  combo: {
    background: '#E6F7FF',
    color: '#0050B3',
    borderColor: '#91D5FF',
  },
  spec: {
    background: '#F6FFED',
    color: '#274A0D',
    borderColor: '#B7EB8F',
  },
  color: {
    background: '#FFF7E6',
    color: '#AD6800',
    borderColor: '#FFD591',
  },
};
```

### 响应式设计

- **桌面 (≥1024px)**: 标签以水平流式布局展现，每行可显示多个标签
- **平板 (768px-1024px)**: 标签以水平流式布局展现，根据屏幕宽度自动换行
- **手机 (<768px)**: 标签以垂直堆叠方式展现，每行显示 1-2 个标签

## 状态管理流程

### 初始状态
```
selectedCombos: []
selectedSpecs: []
selectedColors: []
preCombos: []
preSpecs: []
preColors: []
```

### 用户添加标签
```
selectedCombos: [...selectedCombos, newCombo]
possibleSKUs: 更新为新的 SKU 组合
```

### 用户删除标签
```
// 如果是预先存在的标签
显示警告信息，不允许删除

// 如果是新创建的标签
selectedCombos: selectedCombos.filter(v => v !== tag)
possibleSKUs: 更新为新的 SKU 组合
```

## 错误处理

### 无效操作处理

- 如果用户尝试添加重复标签，显示提示信息
- 如果用户尝试删除预先存在的标签，显示警告信息
- 如果标签操作失败，显示错误提示

### 用户反馈

- 添加标签时显示成功提示
- 删除标签时显示确认提示（对于预先存在的标签）
- 标签操作时显示加载状态

## 测试策略

### 单元测试

- 测试 Select 组件的样式应用
- 测试标签的添加和删除功能
- 测试标签删除逻辑
- 测试重复标签防护
- 测试预先存在标签的保护

### 属性测试

- 验证标签添加后出现在列表中
- 验证标签删除后从列表中移除
- 验证 SKU 列表在标签变化时正确更新
- 验证标签状态与 SKU 组合的一致性
- 验证响应式布局在不同屏幕尺寸上的正确性

## 正确性属性

属性是系统应该满足的特征或行为，是人类可读的规范和机器可验证的正确性保证之间的桥梁。

### Property 1: 标签添加后出现在列表中

*对于任何* 新添加的标签，系统应该在标签列表中显示该标签。

**验证**: 需求 1.4

### Property 2: 标签删除后从列表中移除

*对于任何* 新创建的标签，删除后应该从标签列表中移除。

**验证**: 需求 1.3

### Property 3: 防止添加重复标签

*对于任何* 已存在的标签，系统应该防止添加重复的标签。

**验证**: 需求 1.5

### Property 4: 防止删除预先存在的标签

*对于任何* 预先存在的标签，系统应该防止删除并显示警告信息。

**验证**: 需求 1.3

### Property 5: 标签变化时 SKU 列表更新

*对于任何* 标签的添加或删除操作，系统应该自动更新可能的 SKU 列表。

**验证**: 需求 4.1

### Property 6: 标签类型的颜色方案正确

*对于任何* 标签，系统应该根据其类型（版本、配置、颜色）应用正确的颜色方案。

**验证**: 需求 2.1

### Property 7: 响应式布局在不同屏幕尺寸上正确

*对于任何* 屏幕尺寸，标签应该以适当的布局方式展现，保持可读性。

**验证**: 需求 3.1, 3.2, 3.3

### Property 8: 标签状态与后端数据同步

*对于任何* 标签操作，系统应该将更改同步到后端数据库。

**验证**: 需求 4.2

