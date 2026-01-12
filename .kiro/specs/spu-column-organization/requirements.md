# SPU 栏组织 - 需求文档

## 介绍

本需求文档描述了如何组织和优化商品管理页面中的 SPU 栏。SPU 栏是三栏布局的第二栏，用于展示和管理标准产品单位（SPU）。

## 术语表

- **SPU**: 标准产品单位，商品的基本单位
- **SPU 分类**: SPU 所属的分类
- **SPU 列表**: 展现 SPU 的列表视图
- **SPU 详情**: SPU 的详细信息

## 需求

### 需求 1: SPU 列表展现

**用户故事**: 作为商品管理员，我想要查看选定分类下的所有 SPU，以便快速找到需要管理的商品。

#### 接受标准

1. WHEN 用户选择 SPU 分类 THEN 系统 SHALL 在第二栏展现该分类下的所有 SPU 列表
2. WHEN 用户未选择分类 THEN 系统 SHALL 显示"请选择分类"提示
3. WHEN 用户查看 SPU 列表 THEN 系统 SHALL 显示 SPU 名称、编码和其他关键信息
4. WHEN SPU 数量较多 THEN 系统 SHALL 提供搜索或筛选功能
5. WHEN 用户点击 SPU THEN 系统 SHALL 选中该 SPU 并更新 SKU 栏的内容

### 需求 2: SPU 操作功能

**用户故事**: 作为商品管理员，我想要能够添加、编辑和删除 SPU，以便管理商品信息。

#### 接受标准

1. WHEN 用户选择分类后点击"新增 SPU"按钮 THEN 系统 SHALL 打开新增 SPU 表单
2. WHEN 用户选择 SPU 后点击"编辑"按钮 THEN 系统 SHALL 打开编辑 SPU 表单
3. WHEN 用户删除 SPU THEN 系统 SHALL 检查 SPU 下是否有 SKU，如有则提示警告
4. WHEN 用户完成 SPU 操作 THEN 系统 SHALL 更新 SPU 列表
5. WHEN 操作失败 THEN 系统 SHALL 显示错误提示

### 需求 3: SPU 选择状态

**用户故事**: 作为商品管理员，我想要清晰地看到当前选中的 SPU，以便了解当前的操作上下文。

#### 接受标准

1. WHEN 用户选择 SPU THEN 系统 SHALL 高亮显示选中的 SPU
2. WHEN 用户未选择 SPU THEN 系统 SHALL 显示"未选择"状态
3. WHEN 用户切换 SPU THEN 系统 SHALL 更新高亮显示
4. WHEN SPU 被删除 THEN 系统 SHALL 清除选择状态
5. WHEN 用户查看 SPU 详情 THEN 系统 SHALL 显示 SPU 的完整信息

### 需求 4: 响应式设计

**用户故事**: 作为商品管理员，我想要在不同屏幕尺寸上都能正常使用 SPU 栏，以便在各种设备上工作。

#### 接受标准

1. WHEN 在桌面设备上查看 THEN 系统 SHALL 以栏形式展现 SPU 列表
2. WHEN 在平板设备上查看 THEN 系统 SHALL 调整 SPU 列表的宽度和高度
3. WHEN 在手机设备上查看 THEN 系统 SHALL 以 Tab 或抽屉形式展现 SPU 列表
4. WHEN SPU 列表过长 THEN 系统 SHALL 提供滚动功能
5. WHEN 屏幕尺寸变化 THEN 系统 SHALL 自动调整布局

### 需求 5: 与其他栏的集成

**用户故事**: 作为系统开发者，我想要 SPU 栏与 SPU 分类栏和 SKU 栏无缝集成，以便保持系统的一致性。

#### 接受标准

1. WHEN 用户选择 SPU THEN 系统 SHALL 自动更新 SKU 栏显示该 SPU 下的 SKU
2. WHEN 用户切换 SPU THEN 系统 SHALL 清除 SKU 的选择
3. WHEN 用户切换分类 THEN 系统 SHALL 更新 SPU 列表并清除 SPU 选择
4. WHEN 用户在编辑模式下 THEN 系统 SHALL 保持 SPU 栏的可见性
5. WHEN 用户返回查看模式 THEN 系统 SHALL 恢复 SPU 栏的正常显示

