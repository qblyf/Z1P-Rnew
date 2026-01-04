# SKU参数过滤功能实现

## 功能概述

在SKU参数配置页面中添加了参数值过滤功能，用户可以通过选择参数值（如版本、配置、颜色等）来过滤下方显示的SKU列表。

## 核心特性

### 1. 单选逻辑
- 每个参数维度只能选中一个值
- 重复点击已选中的值会取消选中
- 支持多个参数维度同时过滤

### 2. 默认状态
- 所有值未选中时，显示所有SKU列表
- 选中任何值后，列表只显示包含该值的SKU

### 3. 过滤条件显示
- 已选中的过滤条件以Tag形式显示在列表上方
- 支持单个条件移除和一键清除所有过滤

## 实现文件

### 新增文件
- `datahooks/useParamFilter.ts` - 参数过滤状态管理Hook

### 修改文件
- `app/spu-sku-param-config/page.tsx` - 集成过滤功能和SKU列表显示

## 使用方式

### Hook API

```typescript
const { selectedFilters, toggleFilter, clearFilters, hasActiveFilters } = useParamFilter();

// selectedFilters: Record<definitionID, selectedValue>
// toggleFilter(definitionID, value): 切换参数值的选中状态
// clearFilters(): 清除所有过滤条件
// hasActiveFilters: 是否有活跃的过滤条件
```

### 页面集成

1. 用户在参数配置区域选择参数值时，自动触发过滤
2. 选中的参数值会在SKU列表上方显示为Tag
3. SKU列表会实时更新，只显示匹配的SKU

## 工作流程

1. **初始化**: 页面加载时：
   - 获取参数定义
   - 获取当前SPU的SKU列表
   - 为每个SKU获取其参数值（存储在 `skuParamValuesMap`）
2. **选择参数**: 用户点击参数值时：
   - 更新参数编辑状态（用于保存）
   - 更新过滤状态（用于列表过滤）
3. **过滤列表**: 根据选中的参数值过滤SKU列表
   - 检查每个SKU的参数值是否匹配选中的过滤条件
4. **显示结果**: 
   - 无过滤条件：显示所有SKU
   - 有过滤条件：显示匹配的SKU

## 技术细节

### 过滤算法
```typescript
const filteredSkuList = useMemo(() => {
  if (!hasActiveFilters) {
    return skuList;
  }

  return skuList.filter(sku => {
    // 获取该SKU的参数值
    const skuParams = skuParamValuesMap[sku.id] || [];
    
    // 检查SKU是否包含所有选中的参数值
    return Object.entries(selectedFilters).every(
      ([definitionID, selectedValue]) => {
        const paramValue = skuParams.find(
          pv => pv.definitionID === Number(definitionID)
        );
        return paramValue?.value === selectedValue;
      }
    );
  });
}, [skuList, selectedFilters, hasActiveFilters, skuParamValuesMap]);
```

### 状态管理
- 参数编辑状态和过滤状态分离
- 参数编辑状态用于保存到服务器
- 过滤状态用于实时过滤列表显示
- `skuParamValuesMap`: 存储每个SKU的参数值，用于准确过滤
