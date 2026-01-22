# SPU 栏组织 - 需求文档

## 介绍

本规范定义了商品管理页面中 SPU 栏的组织方式。SPU 栏是三栏布局的第二栏，用于展示和管理标准产品单位（SPU）。

本规范基于 [三栏布局通用需求模板](three-column-layout-common-requirements.md)，继承其通用需求并进行 SPU 特定的定制。

## 术语表

- **SPU**: 标准产品单位，商品的基本单位
- **SPU 分类**: SPU 所属的分类

## 需求

### 需求 1: SPU 列表展现 (SPU-COL-1)

继承自三栏布局通用需求 1，针对 SPU 栏进行定制。

**用户故事**: 作为商品管理员，我想要查看选定分类下的所有 SPU，以便快速找到需要管理的商品。

#### 接受标准

1. WHEN 用户选择 SPU 分类 THEN 系统 SHALL 在第二栏展现该分类下的所有 SPU 列表
2. WHEN 用户未选择分类 THEN 系统 SHALL 显示"请选择分类"提示
3. WHEN 用户查看 SPU 列表 THEN 系统 SHALL 显示 SPU 名称、编码和其他关键信息

### 需求 2: SPU 操作功能 (SPU-COL-2)

继承自三栏布局通用需求 2，针对 SPU 栏进行定制。

**用户故事**: 作为商品管理员，我想要能够添加、编辑和删除 SPU，以便管理商品信息。

#### 接受标准

1. WHEN 用户选择分类后点击"新增 SPU"按钮 THEN 系统 SHALL 打开新增 SPU 表单
2. WHEN 用户选择 SPU 后点击"编辑"按钮 THEN 系统 SHALL 打开编辑 SPU 表单
3. WHEN 用户删除 SPU THEN 系统 SHALL 检查 SPU 下是否有 SKU，如有则提示警告

### 需求 3: SPU 选择状态 (SPU-COL-3)

继承自三栏布局通用需求 3，针对 SPU 栏进行定制。

**用户故事**: 作为商品管理员，我想要清晰地看到当前选中的 SPU，以便了解当前的操作上下文。

### 需求 4: 响应式设计 (SPU-COL-4)

继承自三栏布局通用需求 4。

### 需求 5: 与其他栏的集成 (SPU-COL-5)

继承自三栏布局通用需求 5，针对 SPU 栏进行定制。

#### 接受标准

1. WHEN 用户选择 SPU THEN 系统 SHALL 自动更新 SKU 栏显示该 SPU 下的 SKU
2. WHEN 用户切换 SPU THEN 系统 SHALL 清除 SKU 的选择
3. WHEN 用户切换分类 THEN 系统 SHALL 更新 SPU 列表并清除 SPU 选择

