# SPU 列表排序修复总结

## 问题

商品管理 - SPU 管理页面的列表顺序没有遵循排序号（order 字段）。

## 根本原因

1. 使用了废弃的 `getSPUList` API，不支持服务端排序
2. 客户端排序失效（数据可能不包含 order 字段）
3. 类型定义不完整，使用了 `(b as any).order` 类型断言

## 解决方案

### 核心改进

将 `getSPUList`（废弃）升级为 `getSPUListNew`（推荐），并配置服务端排序：

```typescript
// 旧代码（不支持排序）
const d = await getSPUList({ spuCateIDs: [spuCateID] });

// 新代码（支持服务端排序）
const d = await getSPUListNew(
  { lastCateIDs: [spuCateID], states: [SPUState.在用] },
  {
    limit: 10000,
    offset: 0,
    orderBy: [{ key: 'p."order"', sort: 'DESC' }], // 按 order 降序
  },
  ['id', 'name', 'brand', 'series', 'generation', 'order']
);
```

### 关键变化

1. **API 升级**：`getSPUList` → `getSPUListNew`
2. **服务端排序**：添加 `orderBy: [{ key: 'p."order"', sort: 'DESC' }]`
3. **字段选择**：明确指定返回字段，包含 `order`
4. **移除客户端排序**：数据已在服务端排序，无需前端再排序

## 修改文件

### 1. datahooks/product.ts

**修改内容：**
- 导入 `getSPUListNew` 和 `SPUState`
- 更新 `useSPUList` hook 使用新 API
- 配置服务端排序参数

**影响：**
- 所有使用 SPU 列表的页面都会受益
- 数据按 order 字段正确排序
- 性能提升（服务端排序比客户端快）

### 2. components/SPUList.tsx

**修改内容：**
- 移除客户端排序逻辑
- 简化 `spuListFiltered` 计算

**影响：**
- 代码更简洁
- 性能更好（减少不必要的排序计算）

### 3. components/SKUList.tsx

**修改内容：**
- 导入 `getSPUListNew` 和 `SPUState`
- 更新 SKU 列表加载逻辑使用新 API
- 添加排序参数

**影响：**
- SKU 列表也按 SPU 的 order 排序
- 与 SPU 列表保持一致的排序

## API 对比

| 特性 | getSPUList (旧) | getSPUListNew (新) |
|------|----------------|-------------------|
| 状态 | ❌ Deprecated | ✅ 推荐 |
| 服务端排序 | ❌ | ✅ |
| 字段选择 | ❌ | ✅ |
| 性能 | 较差 | 更好 |

## 排序规则

- **字段**：`order`（排序号）
- **方向**：`DESC`（降序，数字大的在前）
- **位置**：服务端（数据库查询时排序）

## 测试验证

### 验证步骤

1. 打开商品管理 - SPU 管理页面
2. 检查列表是否按 order 字段降序显示
3. 切换 SPU 分类，验证排序是否正确
4. 使用搜索功能，验证结果排序

### 预期结果

✅ SPU 按 order 字段降序显示  
✅ 切换分类后排序正确  
✅ 搜索结果保持排序  
✅ 页面加载更快

## 向后兼容性

✅ 完全兼容：
- 数据结构相同
- 组件接口不变
- 只是数据获取和排序方式改变

## 相关文档

- 详细说明：`docs/fix-spu-list-sorting.md`
- 修改文件：
  - `datahooks/product.ts`
  - `components/SPUList.tsx`
  - `components/SKUList.tsx`

## 注意事项

1. 确保数据库中所有 SPU 都有 `order` 字段
2. 如果 SPU 没有设置 order，默认值应该是 0
3. 只显示 `SPUState.在用` 状态的 SPU
4. 使用 `lastCateIDs` 只显示直属分类的 SPU
