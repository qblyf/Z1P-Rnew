# SKU 栏组织 - 需求文档

## 介绍

本规范定义了商品管理页面中 SKU 栏的组织方式。SKU 栏是三栏布局的第三栏，用于展示和管理库存单位（SKU）。

本规范基于 [三栏布局通用需求模板](three-column-layout-common-requirements.md)，继承其通用需求并进行 SKU 特定的定制。

## 术语表

- **SKU**: 库存单位，商品的最小销售单位
- **SPU**: 标准产品单位，商品的基本单位
- **版本、配置、颜色**: SKU 的属性维度

## 需求

### 需求 1: SKU 列表展现 (SKU-COL-1)

继承自三栏布局通用需求 1，针对 SKU 栏进行定制。

**用户故事**: 作为商品管理员，我想要查看选定 SPU 下的所有 SKU，以便快速找到需要管理的库存单位。

#### 接受标准

1. WHEN 用户选择 SPU THEN 系统 SHALL 在第三栏展现该 SPU 下的所有 SKU 列表
2. WHEN 用户未选择 SPU THEN 系统 SHALL 显示"请选择 SPU"提示
3. WHEN 用户查看 SKU 列表 THEN 系统 SHALL 显示 SKU 名称、版本、配置、颜色等信息
4. WHEN SKU 数量较多 THEN 系统 SHALL 提供搜索或筛选功能

### 需求 2: SKU 操作功能 (SKU-COL-2)

继承自三栏布局通用需求 2，针对 SKU 栏进行定制。

**用户故事**: 作为商品管理员，我想要能够添加、编辑和删除 SKU，以便管理库存单位。

#### 接受标准

1. WHEN 用户选择 SPU 后点击"新增 SKU"按钮 THEN 系统 SHALL 打开新增 SKU 表单
2. WHEN 用户选择 SKU 后点击"编辑"按钮 THEN 系统 SHALL 打开编辑 SKU 表单
3. WHEN 用户删除 SKU THEN 系统 SHALL 检查 SKU 是否有库存，如有则提示警告

### 需求 3: SKU 属性管理 (SKU-COL-3)

**用户故事**: 作为商品管理员，我想要能够管理 SKU 的版本、配置、颜色等属性，以便清晰地区分不同的库存单位。

#### 接受标准

1. WHEN 用户查看 SKU 列表 THEN 系统 SHALL 以标签形式展现版本、配置、颜色等属性
2. WHEN 属性值重复 THEN 系统 SHALL 防止添加并显示提示
3. WHEN 属性是预先存在的 THEN 系统 SHALL 防止删除并显示警告

### 需求 4: SKU 选择状态 (SKU-COL-4)

继承自三栏布局通用需求 3，针对 SKU 栏进行定制。

**用户故事**: 作为商品管理员，我想要清晰地看到当前选中的 SKU，以便了解当前的操作上下文。

#### 接受标准

1. WHEN 用户选择 SKU THEN 系统 SHALL 高亮显示选中的 SKU
2. WHEN 用户未选择 SKU THEN 系统 SHALL 显示"未选择"状态

### 需求 5: 响应式设计 (SKU-COL-5)

继承自三栏布局通用需求 4。

### 需求 6: 与其他栏的集成 (SKU-COL-6)

继承自三栏布局通用需求 5，针对 SKU 栏进行定制。

#### 接受标准

1. WHEN 用户切换 SPU THEN 系统 SHALL 更新 SKU 列表并清除 SKU 选择
2. WHEN 用户切换分类 THEN 系统 SHALL 清除 SKU 列表和选择

