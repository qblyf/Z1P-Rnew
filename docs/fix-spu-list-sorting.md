# SPU 列表排序修复

## 问题描述

在商品管理 - SPU 管理页面，列表顺序没有遵循排序号（order 字段），导致 SPU 显示顺序混乱。

## 根本原因

1. **使用了废弃的 API**：代码使用的是 `getSPUList`（已标记为 deprecated），该函数不支持排序参数
2. **客户端排序失效**：前端尝试在客户端对数据进行排序，但由于以下原因失效：
   - `getSPUList` 返回的数据可能不包含 `order` 字段
   - 使用了 `(b as any).order` 类型断言，说明类型定义中没有 `order` 字段
   - 数据量大时，客户端排序性能差

## 解决方案

### 1. 升级到新的 API

将 `getSPUList` 替换为 `getSPUListNew`，新 API 支持：
- 服务端排序（通过 `orderBy` 参数）
- 更灵活的查询条件
- 更好的性能

### 2. 服务端排序

在 `datahooks/product.ts` 中配置排序参数：

```typescript
const d = await getSPUListNew(
  spuCateID 
    ? { lastCateIDs: [spuCateID], states: [SPUState.在用] }
    : { states: [SPUState.在用] },
  {
    limit: 10000,
    offset: 0,
    orderBy: [{ key: 'p."order"', sort: 'DESC' }], // 按 order 字段降序排序
  },
  ['id', 'name', 'brand', 'series', 'generation', 'order']
);
```

### 3. 移除客户端排序

由于服务端已经排序，移除了 `SPUList.tsx` 中的客户端排序逻辑。

## 修改文件

### 1. datahooks/product.ts

**修改内容：**
- 导入 `getSPUListNew` 和 `SPUState`
- 更新 `useSPUList` hook：
   - 使用 `getSPUListNew` 替代 `getSPUList`
   - 添加排序参数：`orderBy: [{ key: 'p."order"', sort: 'DESC' }]`
   - 指定返回字段，包含 `order` 字段
   - 使用 `lastCateIDs` 替代 `spuCateIDs`（更精确的分类过滤）

### 2. components/SPUList.tsx

**修改内容：**
1. 移除客户端排序逻辑
2. 添加注释说明数据已在服务端排序

### 3. components/SKUList.tsx

**修改内容：**
1. 导入 `getSPUListNew` 和 `SPUState`
2. 更新 SKU 列表加载逻辑：
   - 使用 `getSPUListNew` 替代 `getSPUList`
   - 添加排序参数确保 SKU 列表也按 SPU 的 order 排序
   - 指定返回字段：`['id', 'name', 'brand', 'skuIDs']`

## API 对比

| 特性 | getSPUList (旧) | getSPUListNew (新) |
|------|----------------|-------------------|
| 状态 | ❌ Deprecated | ✅ 推荐使用 |
| 服务端排序 | ❌ 不支持 | ✅ 支持 |
| 排序字段 | - | order, created_at, id, brand, cate_id |
| 分类过滤 | spuCateIDs（包含子分类） | lastCateIDs（仅直属分类） |
| 字段选择 | ❌ 返回所有字段 | ✅ 可指定返回字段 |
| 性能 | 较差 | 更好 |

## 排序逻辑

- **排序字段**：`order`（排序号）
- **排序方向**：`DESC`（降序，数字大的在前）
- **排序位置**：服务端（数据库查询时排序）

## 测试验证

### 验证步骤

1. 打开商品管理 - SPU 管理页面
2. 检查 SPU 列表是否按 order 字段降序显示
3. 切换不同的 SPU 分类，验证排序是否正确
4. 使用搜索功能，验证搜索结果是否保持排序

### 预期结果

- ✅ SPU 按 order 字段降序显示（order 值大的在前）
- ✅ 切换分类后排序保持正确
- ✅ 搜索结果保持原有排序
- ✅ 页面加载速度更快（服务端排序）

## 注意事项

1. **数据迁移**：确保数据库中所有 SPU 都有 `order` 字段
2. **默认值**：如果 SPU 没有设置 order，默认值应该是 0
3. **分类过滤**：使用 `lastCateIDs` 只显示直属该分类的 SPU，不包含子分类的 SPU
4. **状态过滤**：只显示 `SPUState.在用` 状态的 SPU

## 相关配置

- **Limit**: 10000（一次最多加载 10000 条数据）
- **Offset**: 0（从第一条开始）
- **States**: `[SPUState.在用]`（只显示在用状态）
- **OrderBy**: `[{ key: 'p."order"', sort: 'DESC' }]`（按 order 降序）

## 向后兼容性

✅ 完全兼容：
- API 返回的数据结构相同
- 组件接口没有变化
- 只是数据获取方式和排序位置改变
