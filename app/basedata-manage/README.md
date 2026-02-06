# 基础数据管理

## 概述

基础数据管理页面提供了统一的界面来管理系统中的基础数据，包括品牌、版本、配置和颜色等信息。

## 功能模块

### 1. 品牌管理

管理系统中的品牌信息。

**数据结构：**
- `name`: 品牌名称
- `spell`: 拼音码
- `order`: 排序号
- `color`: 标签颜色
- `logo`: 品牌LOGO URL
- `display`: 是否展示

**功能：**
- 卡片格栅布局展示
- 搜索品牌名称或拼音码
- 点击卡片编辑品牌
- 新增品牌
- 自动生成拼音码

**SDK接口：**
- `getBrandInfo()` - 获取品牌信息
- `addBrandInfo()` - 新增品牌
- `editBrandInfo()` - 编辑品牌

### 2. 版本管理

管理SKU规格属性中的版本类型（对应SDK中的"组合"类型）。

**数据结构：**
- `zid`: 规格属性ID
- `name`: SpecName.组合 (固定值)
- `value`: 版本值（如"标准版"、"豪华版"）
- `label`: 标签数组
- `sortWeight`: 排序权重 (0-999，数值越大越靠前)

**功能：**
- 卡片格栅布局展示
- 搜索版本值或标签
- 点击卡片编辑版本
- 新增版本
- 按排序权重降序显示

**SDK接口：**
- `allSpuSpecAttribute()` - 获取所有规格属性
- `addSpuSpecAttribute()` - 新增规格属性
- `editSpuSpecAttribute()` - 编辑规格属性

### 3. 配置管理

管理SKU规格属性中的配置类型（对应SDK中的"规格"类型，如容量、尺寸等）。

**数据结构：**
- `zid`: 规格属性ID
- `name`: SpecName.规格 (固定值)
- `value`: 配置值（如"128GB"、"256GB"）
- `label`: 标签数组
- `sortWeight`: 排序权重 (0-999)

**功能：**
- 与版本管理相同的界面和交互
- 独立的数据集合

**SDK接口：**
- 同版本管理

### 4. 颜色管理

管理SKU规格属性中的颜色类型。

**数据结构：**
- `zid`: 规格属性ID
- `name`: SpecName.颜色 (固定值)
- `value`: 颜色值（如"红色"、"蓝色"）
- `label`: 标签数组
- `sortWeight`: 排序权重 (0-999)

**功能：**
- 与版本管理相同的界面和交互
- 独立的数据集合

**SDK接口：**
- 同版本管理

## 界面设计

### 布局特点

1. **标签页导航**
   - 品牌管理
   - 版本管理
   - 配置管理
   - 颜色管理

2. **卡片格栅布局**
   - 响应式列数：
     - xs (手机): 2列
     - sm (小平板): 3列
     - md (平板): 4列
     - lg (小屏幕): 6列
     - xl (中屏幕): 8列
     - xxl (大屏幕): 12列
   - 每页默认60个项目
   - 支持分页：60/120/180/240

3. **卡片内容**
   - 主要信息（品牌名/规格值）
   - 次要信息（拼音码/标签）
   - 排序信息

4. **交互方式**
   - 点击卡片直接编辑
   - 悬停效果
   - 搜索过滤
   - 分页导航

### 统计卡片

每个管理页面顶部显示统计信息：
- 品牌管理：全部品牌、展示中、已隐藏
- 版本/配置/颜色管理：全部数量

### 编辑抽屉

右侧抽屉用于编辑和新增：
- 响应式宽度（移动端全屏，桌面端420px）
- 表单验证
- 实时预览（标签）
- 保存/取消操作

## 技术实现

### 状态管理

- 使用React Hooks管理组件状态
- `useState` 管理数据和UI状态
- `useEffect` 处理数据加载和搜索
- `useMemo` 优化分页计算
- `useCallback` 优化函数引用

### 数据流

1. **加载数据**
   ```typescript
   loadSpecs() -> SDK API -> 过滤 -> 排序 -> setState
   ```

2. **搜索过滤**
   ```typescript
   search input -> filter specs -> update filtered list -> reset page
   ```

3. **分页**
   ```typescript
   filtered list -> slice by page -> display paginated data
   ```

4. **编辑/新增**
   ```typescript
   open drawer -> load data -> edit form -> save -> refresh list
   ```

### SDK集成

**品牌管理SDK：**
```typescript
import { getBrandInfo, addBrandInfo, editBrandInfo } from '@zsqk/z1-sdk/es/z1p/brand';
```

**规格属性SDK：**
```typescript
import {
  allSpuSpecAttribute,
  addSpuSpecAttribute,
  editSpuSpecAttribute,
} from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute';
import { SpecName } from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute-types';
```

### 样式设计

- 使用Ant Design组件库
- 自定义CSS-in-JS样式
- 响应式设计
- 统一的视觉风格

## 使用说明

### 品牌管理

1. 点击"新增品牌"按钮
2. 填写品牌信息（名称会自动生成拼音码）
3. 设置排序号、颜色、LOGO等
4. 点击"创建品牌"保存

编辑品牌：
1. 点击品牌卡片
2. 修改信息
3. 点击"保存修改"

### 规格属性管理（版本/配置/颜色）

1. 切换到对应标签页
2. 点击"新增XXX"按钮
3. 填写规格值
4. 添加标签（用逗号分隔）
5. 设置排序权重（0-999，越大越靠前）
6. 点击"创建XXX"保存

编辑规格：
1. 点击规格卡片
2. 修改信息
3. 点击"保存修改"

注意：规格属性的`name`字段（版本/配置/颜色对应SDK中的组合/规格/颜色）不可编辑。

## 性能优化

1. **分页加载** - 每页最多显示240个项目
2. **搜索防抖** - 实时搜索优化
3. **Memo优化** - 避免不必要的重新计算
4. **虚拟滚动** - 大数据量时的性能优化（待实现）

## 未来改进

1. 批量操作功能
2. 导入/导出功能
3. 拖拽排序
4. 更多筛选条件
5. 数据统计图表
6. 操作日志记录
