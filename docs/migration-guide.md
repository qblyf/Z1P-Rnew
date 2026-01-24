# 智能匹配 API 迁移指南

## 📅 更新日期
2026-01-24

## 🎯 迁移目标
从旧的 SKU 匹配 API 迁移到统一的 `findBestSKU()` API。

---

## ⚠️ 重要提示

**所有旧方法已被删除**，不再支持向后兼容。如果你的代码使用了旧方法，必须立即迁移。

---

## 🔄 API 变更

### 1. findBestSKUWithVersion() → findBestSKU()

**旧 API（已删除）：**
```typescript
const { sku, similarity } = matcher.findBestSKUWithVersion(
  input,
  skuList,
  inputVersion  // 第三个参数
);
```

**新 API：**
```typescript
const { sku, similarity } = matcher.findBestSKU(
  input,
  skuList,
  { inputVersion }  // 使用 options 对象
);
```

---

### 2. findBestSKUInList() → findBestSKU()

**旧 API（已删除）：**
```typescript
const { sku, similarity } = matcher.findBestSKUInList(
  input,
  skuList
);
```

**新 API：**
```typescript
const { sku, similarity } = matcher.findBestSKU(
  input,
  skuList,
  {
    versionWeight: 0,      // 不考虑版本
    capacityWeight: 0.7,   // 容量权重 70%
    colorWeight: 0.3,      // 颜色权重 30%
  }
);
```

---

## 📝 迁移步骤

### 步骤 1：查找所有旧 API 调用

在你的项目中搜索：
- `findBestSKUWithVersion`
- `findBestSKUInList`

### 步骤 2：替换为新 API

根据上面的示例进行替换。

### 步骤 3：测试

运行测试确保功能正常：
```bash
npm test
```

---

## 🎁 新 API 的优势

### 1. 统一接口
只需要记住一个方法：`findBestSKU()`

### 2. 灵活配置
可以自定义权重：
```typescript
// 颜色优先匹配
matcher.findBestSKU(input, skuList, {
  versionWeight: 0.2,
  capacityWeight: 0.3,
  colorWeight: 0.5,  // 颜色权重最高
});

// 容量优先匹配
matcher.findBestSKU(input, skuList, {
  versionWeight: 0.1,
  capacityWeight: 0.7,  // 容量权重最高
  colorWeight: 0.2,
});
```

### 3. 默认值合理
如果不传 options，使用默认权重：
```typescript
// 使用默认权重（版本 30%，容量 40%，颜色 30%）
matcher.findBestSKU(input, skuList);
```

---

## 💡 常见场景

### 场景 1：标准 SKU 匹配（考虑版本）
```typescript
const inputVersion = matcher.extractVersion(input);
const result = matcher.findBestSKU(input, skuList, { inputVersion });
```

### 场景 2：不考虑版本的匹配
```typescript
const result = matcher.findBestSKU(input, skuList, {
  versionWeight: 0,
  capacityWeight: 0.6,
  colorWeight: 0.4,
});
```

### 场景 3：只匹配容量和颜色
```typescript
const result = matcher.findBestSKU(input, skuList, {
  inputVersion: null,  // 明确不考虑版本
});
```

---

## ❓ 常见问题

### Q1: 为什么删除旧方法？
**A:** 为了简化 API，减少维护成本，避免代码重复。

### Q2: 新 API 的性能如何？
**A:** 性能完全相同，因为旧方法内部也是调用新方法。

### Q3: 如何保持与旧代码相同的行为？
**A:** 参考上面的迁移示例，使用相同的权重配置即可。

### Q4: 可以不传 options 吗？
**A:** 可以，会使用默认权重（版本 30%，容量 40%，颜色 30%）。

---

## 📚 相关文档

- [重构总结](./refactoring-summary.md)
- [代码质量分析](./code-quality-analysis.md)
- [智能匹配规则](./smart-match-rules.md)

---

## 🆘 需要帮助？

如果在迁移过程中遇到问题，请：
1. 查看上面的示例
2. 运行测试确认行为
3. 查看 `smartMatcher.test.ts` 中的测试用例

---

## ✅ 迁移检查清单

- [ ] 搜索所有 `findBestSKUWithVersion` 调用
- [ ] 搜索所有 `findBestSKUInList` 调用
- [ ] 替换为 `findBestSKU`
- [ ] 运行测试
- [ ] 验证功能正常
- [ ] 删除旧代码注释

---

**迁移完成后，你的代码将更简洁、更易维护！** 🎉
