# SKU 栏组织 - 需求文档

## 介绍

本需求文档描述了如何组织和优化商品管理页面中的 SKU 栏。SKU 栏是三栏布局的第三栏，用于展示和管理库存单位（SKU）。

## 术语表

- **SKU**: 库存单位，商品的最小销售单位
- **SPU**: 标准产品单位，商品的基本单位
- **SKU 列表**: 展现 SKU 的列表视图
- **SKU 详情**: SKU 的详细信息
- **版本、配置、颜色**: SKU 的属性维度

## 需求

### 需求 1: SKU 列表展现

**用户故事**: 作为商品管理员，我想要查看选定 SPU 下的所有 SKU，以便快速找到需要管理的库存单位。

#### 接受标准

1. WHEN 用户选择 SPU THEN 系统 SHALL 在第三栏展现该 SPU 下的所有 SKU 列表
2. WHEN 用户未选择 SPU THEN 系统 SHALL 显示"请选择 SPU"提示
3. WHEN 用户查看 SKU 列表 THEN 系统 SHALL 显示 SKU 名称、版本、配置、颜色等信息
4. WHEN SKU 数量较多 THEN 系统 SHALL 提供搜索或筛选功能
5. WHEN 用户点击 SKU THEN 系统 SHALL 选中该 SKU 并显示其详细信息

### 需求 2: SKU 操作功能

**用户故事**: 作为商品管理员，我想要能够添加、编辑和删除 SKU，以便管理库存单位。

#### 接受标准

1. WHEN 用户选择 SPU 后点击"新增 SKU"按钮 THEN 系统 SHALL 打开新增 SKU 表单
2. WHEN 用户选择 SKU 后点击"编辑"按钮 THEN 系统 SHALL 打开编辑 SKU 表单
3. WHEN 用户删除 SKU THEN 系统 SHALL 检查 SKU 是否有库存，如有则提示警告
4. WHEN 用户完成 SKU 操作 THEN 系统 SHALL 更新 SKU 列表
5. WHEN 操作失败 THEN 系统 SHALL 显示错误提示

### 需求 3: SKU 属性管理

**用户故事**: 作为商品管理员，我想要能够管理 SKU 的版本、配置、颜色等属性，以便清晰地区分不同的库存单位。

#### 接受标准

1. WHEN 用户查看 SKU 列表 THEN 系统 SHALL 以标签形式展现版本、配置、颜色等属性
2. WHEN 用户添加新属性 THEN 系统 SHALL 在 SKU 列表中显示新属性
3. WHEN 用户删除属性 THEN 系统 SHALL 更新 SKU 列表
4. WHEN 属性值重复 THEN 系统 SHALL 防止添加并显示提示
5. WHEN 属性是预先存在的 THEN 系统 SHALL 防止删除并显示警告

### 需求 4: SKU 选择状态

**用户故事**: 作为商品管理员，我想要清晰地看到当前选中的 SKU，以便了解当前的操作上下文。

#### 接受标准

1. WHEN 用户选择 SKU THEN 系统 SHALL 高亮显示选中的 SKU
2. WHEN 用户未选择 SKU THEN 系统 SHALL 显示"未选择"状态
3. WHEN 用户切换 SKU THEN 系统 SHALL 更新高亮显示
4. WHEN SKU 被删除 THEN 系统 SHALL 清除选择状态
5. WHEN 用户查看 SKU 详情 THEN 系统 SHALL 显示 SKU 的完整信息

### 需求 5: 响应式设计

**用户故事**: 作为商品管理员，我想要在不同屏幕尺寸上都能正常使用 SKU 栏，以便在各种设备上工作。

#### 接受标准

1. WHEN 在桌面设备上查看 THEN 系统 SHALL 以栏形式展现 SKU 列表
2. WHEN 在平板设备上查看 THEN 系统 SHALL 调整 SKU 列表的宽度和高度
3. WHEN 在手机设备上查看 THEN 系统 SHALL 以 Tab 或抽屉形式展现 SKU 列表
4. WHEN SKU 列表过长 THEN 系统 SHALL 提供滚动功能
5. WHEN 屏幕尺寸变化 THEN 系统 SHALL 自动调整布局

### 需求 6: 与其他栏的集成

**用户故事**: 作为系统开发者，我想要 SKU 栏与 SPU 分类栏和 SPU 栏无缝集成，以便保持系统的一致性。

#### 接受标准

1. WHEN 用户选择 SKU THEN 系统 SHALL 显示该 SKU 的详细信息
2. WHEN 用户切换 SPU THEN 系统 SHALL 更新 SKU 列表并清除 SKU 选择
3. WHEN 用户切换分类 THEN 系统 SHALL 清除 SKU 列表和选择
4. WHEN 用户在编辑模式下 THEN 系统 SHALL 保持 SKU 栏的可见性
5. WHEN 用户返回查看模式 THEN 系统 SHALL 恢复 SKU 栏的正常显示

