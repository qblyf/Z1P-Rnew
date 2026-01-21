# SPU 列表页面重新设计

## 概述

完全重新设计了 SPU 列表页面，添加了完整的编辑和批量编辑功能，优化了页面布局和用户体验。

## 主要功能

### 1. 分页功能 📄

#### 特性
- 支持自定义每页显示数量（20, 50, 100, 200）
- 显示总记录数
- 支持快速跳转到指定页
- 显示当前页码和总页数

#### 实现
```typescript
<Table
  pagination={{
    current: currentPage,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条记录`,
    pageSizeOptions: [20, 50, 100, 200],
    onChange: handleTableChange,
  }}
/>
```

### 2. 多选功能 ✅

#### 特性
- 支持单选和多选
- 支持全选和反选
- 显示已选择数量
- 选择后显示操作栏

#### 实现
```typescript
const rowSelection: TableRowSelection<SPUListItem> = {
  selectedRowKeys,
  onChange: (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  },
};
```

#### 操作栏
选择数据后，页面顶部会显示操作栏：
- 显示已选择数量
- 批量编辑按钮
- 取消选择按钮

### 3. 单个编辑功能 ✏️

#### 特性
- 点击表格中的"编辑"按钮
- 在右侧打开抽屉（66% 宽度）
- 使用完整的 SPUEdit 组件
- 编辑完成后自动刷新数据

#### 实现
```typescript
<Drawer
  title="编辑 SPU"
  placement="right"
  onClose={handleCloseDrawer}
  open={drawerOpen}
  width="66%"
  destroyOnClose
  afterOpenChange={(open) => {
    if (!open) {
      refreshData();
    }
  }}
>
  {editingSpuID && (
    <SPUEditWrapper spuId={editingSpuID} />
  )}
</Drawer>
```

### 4. 批量编辑功能 📝

#### 支持批量修改的字段
1. **品牌**：从下拉列表选择新品牌
2. **SPU 分类**：使用级联选择器选择新分类
3. **描述**：输入新的描述文本
4. **备注**：输入新的备注文本

#### 使用方式
1. 在表格中选择要编辑的 SPU（支持多选）
2. 点击"批量编辑"按钮
3. 在弹出的对话框中填写要修改的字段
4. 留空的字段不会被修改
5. 点击"开始编辑"确认修改

#### 特性
- 至少需要选择一个字段进行修改
- 二次确认机制，防止误操作
- 显示修改进度和结果
- 成功/失败统计
- 自动刷新数据

#### 实现
```typescript
<BatchEditModal
  visible={batchEditVisible}
  selectedIds={selectedRowKeys as number[]}
  onClose={() => setBatchEditVisible(false)}
  onSuccess={refreshData}
  allBrands={allBrands}
  cates={cates}
/>
```

### 5. 搜索功能 🔍

#### 搜索条件
- **名称关键词**：模糊搜索 SPU 名称
- **SPU 分类**：级联选择器，支持树形结构
- **品牌**：多选品牌
- **SKU 关联**：未关联/已关联/不过滤
- **状态**：有效/无效

#### 特性
- 支持回车键快速搜索
- 重置按钮一键清空所有条件
- 搜索时自动回到第一页
- 加载状态提示

## 页面布局

### 整体结构
```
┌─────────────────────────────────────┐
│ 页面标题和描述                       │
├─────────────────────────────────────┤
│ 搜索区域 (Card)                     │
│ - 名称关键词                         │
│ - SPU 分类                          │
│ - 品牌                              │
│ - SKU 关联                          │
│ - 状态                              │
│ - 重置/查找按钮                      │
├─────────────────────────────────────┤
│ 操作栏 (选择数据后显示)              │
│ - 已选择数量                         │
│ - 批量编辑按钮                       │
│ - 取消选择按钮                       │
├─────────────────────────────────────┤
│ 表格区域 (Card)                     │
│ - 统计信息 (总计/有效/无效)          │
│ - 数据表格                          │
│   - 多选框                          │
│   - SPU ID                          │
│   - SPU 名称                        │
│   - 品牌                            │
│   - 状态                            │
│   - 操作 (编辑按钮)                  │
│ - 分页控件                          │
└─────────────────────────────────────┘
```

### 功能区位置
1. **搜索区域**：页面顶部，使用 Card 包装
2. **操作栏**：搜索区域下方，选择数据后显示
3. **表格区域**：主要内容区，包含数据和分页
4. **编辑抽屉**：右侧滑出，66% 宽度
5. **批量编辑对话框**：居中弹出

## 技术实现

### 状态管理
```typescript
const [list, setList] = useState<SPUListItem[]>([]);
const [loading, setLoading] = useState(false);
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(50);
const [total, setTotal] = useState(0);
const [queryParams, setQueryParams] = useState<...>();
```

### 数据加载
```typescript
const loadData = async (page: number, size: number, params?: typeof queryParams) => {
  setLoading(true);
  try {
    const res = await getSPUListNew({
      ...params,
      limit: size,
      offset: (page - 1) * size,
    }, ['id', 'name', 'brand', 'state', 'cateID']);
    
    setList(res);
    setTotal(res.length < size ? (page - 1) * size + res.length : page * size + 1);
  } finally {
    setLoading(false);
  }
};
```

### 批量编辑
```typescript
for (const spuId of selectedIds) {
  try {
    await editSPUInfo(spuId, updateParams, { auth: token });
    successCount++;
  } catch (error) {
    failCount++;
  }
}
```

## 用户体验优化

### 1. 视觉反馈
- 加载状态：按钮和表格显示加载动画
- 选择反馈：选中行高亮显示
- 操作反馈：成功/失败消息提示
- 统计信息：彩色标签显示数据概览

### 2. 交互优化
- 回车搜索：输入框支持回车键
- 快速重置：一键清空所有筛选条件
- 二次确认：批量操作前确认
- 自动刷新：编辑完成后自动刷新

### 3. 错误处理
- 表单验证：必填字段检查
- API 错误：友好的错误提示
- 批量操作：显示成功/失败统计
- 权限检查：无权限时显示提示

## 使用场景

### 场景 1：查找特定 SPU
1. 在搜索区域输入关键词
2. 选择分类、品牌等筛选条件
3. 点击"查找"按钮
4. 在表格中查看结果

### 场景 2：编辑单个 SPU
1. 在表格中找到要编辑的 SPU
2. 点击"编辑"按钮
3. 在右侧抽屉中修改信息
4. 保存后自动刷新

### 场景 3：批量修改品牌
1. 在表格中选择多个 SPU
2. 点击"批量编辑"按钮
3. 在品牌下拉框中选择新品牌
4. 点击"开始编辑"确认
5. 等待批量修改完成

### 场景 4：批量修改分类
1. 选择要修改的 SPU
2. 点击"批量编辑"
3. 使用级联选择器选择新分类
4. 确认修改
5. 查看修改结果

## 对比总结

| 功能 | 优化前 | 优化后 |
|------|--------|--------|
| 分页 | 加载更多 | 标准分页 |
| 多选 | 无 | 支持 |
| 编辑 | 无 | 单个编辑 |
| 批量编辑 | 无 | 完整支持 |
| 操作栏 | 无 | 选择后显示 |
| 统计信息 | 简单 | 详细 |
| 布局 | 简单 | 合理分区 |
| 交互 | 基础 | 优化 |

## API 使用

### 查询 SPU 列表
```typescript
getSPUListNew(
  {
    cateIDs?: number[];
    nameKeyword?: string;
    brands?: string[];
    states?: SPUState[];
    lonely?: boolean;
    limit: number;
    offset: number;
    orderBy: Array<{ key: string; sort: 'ASC' | 'DESC' }>;
  },
  ['id', 'name', 'brand', 'state', 'cateID']
)
```

### 编辑 SPU
```typescript
editSPUInfo(
  spuId: number,
  {
    brand?: string;
    cateID?: number;
    description?: string;
    remark?: string;
    // ... 其他字段
  },
  { auth: token }
)
```

### 获取分类列表
```typescript
getSPUCateBaseList()
```

## 注意事项

### 批量编辑
1. 至少需要选择一个字段进行修改
2. 留空的字段不会被修改
3. 批量操作不可撤销，请谨慎操作
4. 建议先在少量数据上测试

### 性能优化
1. 分页加载，避免一次加载过多数据
2. 使用 destroyOnClose 销毁抽屉内容
3. 编辑完成后只刷新当前页数据
4. 批量操作显示进度反馈

### 权限控制
1. 需要 product-manage 权限
2. 编辑操作需要认证 token
3. 无权限时显示友好提示

## 更新日志

### 2024-01-21
- ✨ 添加分页功能
- ✨ 添加多选功能
- ✨ 添加单个编辑功能
- ✨ 添加批量编辑功能
- ✨ 重新设计页面布局
- ✨ 优化搜索区域
- ✨ 添加操作栏
- ✨ 改进用户体验
- 🎨 统一设计风格

## 后续优化建议

1. **导出功能**：导出选中的 SPU 数据
2. **批量删除**：支持批量删除 SPU
3. **批量修改状态**：批量设置有效/无效
4. **高级筛选**：更多筛选条件
5. **列配置**：自定义显示列
6. **排序功能**：支持多列排序
7. **批量导入**：Excel 批量导入
8. **操作历史**：记录编辑历史
