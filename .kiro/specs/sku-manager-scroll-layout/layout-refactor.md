# SKU Manager 布局重构方案

## 当前问题
- 布局层级复杂，嵌套过深
- 空间分配逻辑不清晰
- 多个flex容器相互影响

## 新的布局架构

### 三层结构

```
┌─────────────────────────────────────┐
│ Layer 1: Fixed Header               │ flexShrink: 0
│ (SPU ID & Name)                     │ height: auto
├─────────────────────────────────────┤
│ Layer 2: Main Content (flex: 1)     │
│ ├─────────────────────────────────┤ │
│ │ 2.1: Filters Section            │ │ flexShrink: 0, max-height: 200px
│ │ (Version/Config/Color/Params)   │ │ overflow-y: auto
│ ├─────────────────────────────────┤ │
│ │ 2.2: Actions Section            │ │ flexShrink: 0, height: auto
│ │ (+ 新增, 确认修改)              │ │
│ ├─────────────────────────────────┤ │
│ │ 2.3: Table Section (flex: 1)    │ │
│ │ (SKU List Table)                │ │ overflow-y: auto
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 关键改进

### 1. 简化嵌套结构
- 移除不必要的Form包装
- 直接使用div容器管理布局
- 减少CSS类的数量

### 2. 清晰的空间分配
- Layer 1: 固定高度，不参与flex计算
- Layer 2: flex: 1, minHeight: 0，占据剩余空间
  - 2.1: flexShrink: 0，固定高度（可滚动）
  - 2.2: flexShrink: 0，固定高度
  - 2.3: flex: 1, minHeight: 0，占据剩余空间

### 3. 独立的滚动区域
- 过滤器区域：独立滚动（max-height: 200px）
- 表格区域：独立滚动（flex: 1）
- 不会相互影响

## 实现步骤

1. 移除Form的flex样式
2. 将选择器提取到独立的div
3. 将操作按钮提取到独立的div
4. 将表格包装在独立的div
5. 更新CSS类名和样式
6. 测试空间分配

## 预期效果

- ✅ 所有SKU都能显示
- ✅ 过滤器可以独立滚动
- ✅ 表格占据所有可用空间
- ✅ 操作按钮始终可见
- ✅ 布局清晰易维护
