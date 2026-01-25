# OPPO Reno15 SPU 匹配修复总结

## 问题

在智能匹配中，"OPPO Reno15 16+256极光蓝" 被错误地匹配到 "OPPO Reno 15 Pro"，而应该匹配到 "OPPO Reno 15"。

## 根本原因

当两个 SPU 的匹配分数和优先级都相同时，原有的选择逻辑无法区分哪个是更准确的匹配。具体来说：

1. "OPPO Reno 15" 和 "OPPO Reno 15 Pro" 都是标准版（无礼盒、无特殊版本）
2. 两者的优先级都是 `SPU_PRIORITIES.STANDARD = 3`
3. 两者的匹配分数都是 0.95（都没有版本信息）
4. 原有逻辑只比较关键词数量，无法区分

## 解决方案

在 `utils/smartMatcher.ts` 中修改了 `selectBestSPUMatch()` 方法，添加了新的优先级规则：

### 选择优先级（从高到低）

1. **分数更高** - 精确匹配优于模糊匹配
2. **优先级更高** - 标准版 > 版本匹配 > 其他
3. **更简洁的SPU名称** ⭐ **新增** - 不包含 Pro、Max、Plus 等后缀的版本优先
4. **关键词匹配更多** - 名称中词汇更多的版本

### 核心改进

新增 `hasSPUSuffix()` 方法，用于检测 SPU 名称是否包含特殊后缀（Pro、Max、Plus、Ultra 等）。

当分数和优先级相同时，优先选择没有这些后缀的版本，因为：
- 用户输入通常是基础型号（如 "Reno15"）
- 基础型号应该优先匹配基础版本（"OPPO Reno 15"）
- 而不是特殊版本（"OPPO Reno 15 Pro"）

## 修改文件

- `utils/smartMatcher.ts`
  - 修改 `selectBestSPUMatch()` 方法
  - 新增 `hasSPUSuffix()` 方法

## 测试验证

✅ 所有测试通过：

| 场景 | 输入 | 候选SPU | 预期 | 实际 |
|------|------|--------|------|------|
| 1 | OPPO Reno15 16+256极光蓝 | Reno 15, Reno 15 Pro | Reno 15 | ✅ Reno 15 |
| 2 | 分数不同 | 0.90, 0.95 | 0.95 | ✅ 0.95 |
| 3 | 优先级不同 | 标准版, 礼盒版 | 标准版 | ✅ 标准版 |
| 4 | 多个Pro版本 | Pro, Pro Max | Pro Max | ✅ Pro Max |
| 5 | iPhone 15 | iPhone 15, iPhone 15 Pro Max | iPhone 15 | ✅ iPhone 15 |

## 向后兼容性

✅ 完全兼容，不影响现有逻辑：
- 分数更高的仍然优先选择
- 优先级更高的仍然优先选择
- 只在分数和优先级都相同时才应用新规则

## 使用建议

在智能匹配页面测试以下输入来验证修复：

```
1. OPPO Reno15 16+256极光蓝 → 应匹配到 OPPO Reno 15
2. iPhone 15 256GB → 应匹配到 iPhone 15
3. 小米14 12+256 → 应匹配到 小米14（如果有Pro版本）
```

## 相关文档

- 详细说明: `docs/fix-spu-priority-matching.md`
- 代码位置: `utils/smartMatcher.ts` (第 1500+ 行)
