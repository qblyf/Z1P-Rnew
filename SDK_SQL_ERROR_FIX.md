# SDK SQL 错误修复说明

## 问题描述

PostgreSQL 错误：`for SELECT DISTINCT, ORDER BY expressions must appear in select list`

## 根本原因

`@zsqk/z1-sdk` 中的多个函数在使用字段选择时，内部使用了 `SELECT DISTINCT`，但 `ORDER BY` 子句中的字段没有包含在 `SELECT` 列表中。

## 受影响的 SDK 函数

1. `getSysSettings` - 系统设置查询
2. `getSPUListNew` - SPU 列表查询（当使用字段选择参数时）

## 临时修复方案

### 方案 1：移除 orderBy（已应用）

在以下文件中移除了 `orderBy` 参数：
- `Z1P-Rnew/components/TableMatch.tsx`
- `Z1P-Rnew/components/SmartMatch.tsx`

### 方案 2：使用 API 路由（已应用）

- `Z1P-Rnew/app/sync/page.tsx` - 使用 `/api/tenants` 代替直接调用 `getSysSettings`
- `Z1P-Rnew/app/api/tenants/route.ts` - 添加了错误处理和后备方案

### 方案 3：将 ORDER BY 字段添加到 SELECT 列表

如果需要排序，可以将排序字段添加到选择列表中：

```typescript
// 错误示例
const spuList = await getSPUListNew(
  {
    states: [SPUState.在用],
    orderBy: [{ key: 'p."created_at"', sort: 'DESC' }],
  },
  ['id', 'name', 'brand'] // created_at 不在列表中
);

// 正确示例
const spuList = await getSPUListNew(
  {
    states: [SPUState.在用],
    orderBy: [{ key: 'p."created_at"', sort: 'DESC' }],
  },
  ['id', 'name', 'brand', 'created_at'] // 添加 created_at
);
```

## 需要在 SDK 中修复的位置

在 `@zsqk/z1-sdk` 源码中，需要修改以下函数的 SQL 查询：

### getSysSettings
```sql
-- 当前（错误）
SELECT DISTINCT client_name, remarks, value
FROM sys_settings
ORDER BY created_at;

-- 修复方案 1：添加字段到 SELECT
SELECT DISTINCT client_name, remarks, value, created_at
FROM sys_settings
ORDER BY created_at;

-- 修复方案 2：移除 DISTINCT（如果不需要）
SELECT client_name, remarks, value
FROM sys_settings
ORDER BY created_at;

-- 修复方案 3：只按 SELECT 中的字段排序
SELECT DISTINCT client_name, remarks, value
FROM sys_settings
ORDER BY client_name;
```

### getSPUListNew
当使用字段选择参数时，确保 `ORDER BY` 中的所有字段都包含在 `SELECT` 列表中。

## 其他可能受影响的文件

以下文件使用了 `getSPUListNew` 并可能需要检查：
- `Z1P-Rnew/datahooks/product.ts`
- `Z1P-Rnew/app/basedata-manage/page.tsx`
- `Z1P-Rnew/app/spu-list/page.tsx`
- `Z1P-Rnew/app/spu-name-check/page.tsx`

## 长期解决方案

联系 SDK 维护者修复以下问题：
1. 在 `getSysSettings` 中修复 SQL 查询
2. 在 `getSPUListNew` 中，当使用字段选择时，自动将 `orderBy` 字段添加到 SELECT 列表
3. 或者在文档中明确说明使用限制

## 测试

修复后需要测试以下页面：
- [x] 数据同步页面 (`/sync`)
- [x] 表格匹配页面 (`/table-match`)
- [x] 智能匹配页面 (`/smart-match`)
- [ ] 基础数据管理页面 (`/basedata-manage`)
- [ ] SPU 列表页面 (`/spu-list`)
- [ ] SPU 名称检查页面 (`/spu-name-check`)
