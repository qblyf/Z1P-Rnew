# z1-sdk 更新总结

**更新日期**: 2026-01-31  
**状态**: ✅ 完成

## 更新内容

### SDK 版本
- **旧版本**: 3.0.202601251229-26432-feat-discount-approval-baysky
- **新版本**: 3.0.202601311111-26579-feat-invoice-detail-baysky
- **更新时间**: 2026-01-31 11:11:20

### 主要变更

#### 1. OrderBy 类型定义变更 ⚠️ Breaking Change

**旧格式**:
```typescript
orderBy: { key: 'id', sort: 'ASC' }
```

**新格式**:
```typescript
orderBy: [{ key: GetSKUListOrderByKey.skuID, sort: OrderBySort.升序 }]
```

**变更说明**:
- `orderBy` 从单个对象改为数组格式
- `key` 必须使用枚举值 `GetSKUListOrderByKey`
- `sort` 必须使用枚举值 `OrderBySort`

#### 2. 新增枚举类型

**GetSKUListOrderByKey**:
```typescript
enum GetSKUListOrderByKey {
    skuID = "id",
    颜色 = "color",
    规格 = "spec",
    组合 = "combo"
}
```

**OrderBySort**:
```typescript
enum OrderBySort {
    升序 = "ASC",
    降序 = "DESC"
}
```

## 修复的文件

### 1. app/data-export/page.tsx
- ✅ 更新 getSKUList 的 orderBy 参数
- ✅ 导入 GetSKUListOrderByKey 和 OrderBySort
- ✅ 使用枚举值替代字符串

**修改前**:
```typescript
orderBy: { key: 'id', sort: 'ASC' }
```

**修改后**:
```typescript
orderBy: [{ key: GetSKUListOrderByKey.skuID, sort: OrderBySort.升序 }]
```

### 2. components/SPUParamConfig.tsx
- ✅ 更新 getSKUListJoinSPU 的 orderBy 参数
- ✅ 导入必要的枚举类型
- ✅ 将 'p.id' 改为 GetSKUListOrderByKey.skuID

**修改前**:
```typescript
orderBy: { key: 'p.id', sort: 'DESC' }
```

**修改后**:
```typescript
orderBy: [{ key: GetSKUListOrderByKey.skuID, sort: OrderBySort.降序 }]
```

### 3. app/spu-sku-param-config/page.tsx
- ✅ 更新 getSKUListJoinSPU 的 orderBy 参数
- ✅ 导入必要的枚举类型
- ✅ 使用正确的枚举值

### 4. components/ChangeTable.tsx
- ℹ️ 保持原格式（getChangeList 仍使用旧格式）
- ℹ️ changes API 尚未更新为数组格式

## 构建验证

### 构建结果
```bash
✅ npm run build - 成功
✅ TypeScript 编译 - 无错误
✅ 23个路由页面正常
```

### 构建输出
- 所有页面编译成功
- 无类型错误
- 构建产物正常生成

## API 兼容性

### 已更新的 API
- ✅ `getSKUList` - 使用新的 orderBy 数组格式
- ✅ `getSKUListJoinSPU` - 使用新的 orderBy 数组格式

### 未更新的 API
- ℹ️ `getChangeList` - 仍使用旧的 orderBy 对象格式

## 注意事项

### 1. 类型安全
- 必须使用枚举值，不能使用字符串字面量
- TypeScript 会在编译时检查类型错误

### 2. 排序键限制
- `getSKUList` 和 `getSKUListJoinSPU` 只支持以下排序键：
  - `skuID` (id)
  - `颜色` (color)
  - `规格` (spec)
  - `组合` (combo)
- 不再支持 'p.id' 等自定义键

### 3. 向后兼容性
- ⚠️ 这是一个 Breaking Change
- 旧代码需要更新才能使用新版本 SDK
- 建议在更新 SDK 后立即修复所有 orderBy 使用

## 测试建议

### 功能测试
1. ✅ 数据导出功能
2. ✅ SPU/SKU 参数配置
3. ✅ 列表排序功能

### 回归测试
1. 测试所有使用 getSKUList 的页面
2. 测试所有使用 getSKUListJoinSPU 的页面
3. 验证排序功能是否正常

## Git 提交

**提交哈希**: 61e2b21  
**提交信息**: fix: 更新z1-sdk并修复orderBy类型错误

**变更文件**:
- app/data-export/page.tsx
- app/spu-sku-param-config/page.tsx
- components/SPUParamConfig.tsx
- package-lock.json

## 总结

✅ **SDK 更新成功完成**

- z1-sdk 已更新到最新版本
- 所有 orderBy 类型错误已修复
- 构建和类型检查通过
- 代码已推送到 GitHub

**下一步**:
- 在 Vercel 上触发重新部署
- 进行功能测试验证
- 监控生产环境运行状况
