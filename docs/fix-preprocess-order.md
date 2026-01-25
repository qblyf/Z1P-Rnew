# 修复预处理顺序问题

## 问题描述

用户报告输入商品名称的顺序被预处理改变了，导致无法正确匹配：

**输入名称：** `OPPO A5活力版(12+256)玉石绿`  
**表格输入名称：** `OPPO A5 12+256 活力版玉石绿`（错误）

本来 `A5活力版` 是一个整体（型号+版本），但预处理将容量插入到版本前面，导致版本信息被打断，无法正确匹配。

## 根本原因

`preprocessInputAdvanced()` 函数在处理括号内的容量时，没有考虑版本关键词的位置，直接将容量插入到第一个中文字符前，导致：

```
OPPO A5活力版(12+256)玉石绿
↓ 移除括号
OPPO A5活力版玉石绿
↓ 插入容量（在第一个中文字符"活"前）
OPPO A5 12+256 活力版玉石绿  ❌ 错误
```

## 正确顺序

根据用户要求，商品名称的正确顺序应该是：

**品牌 + 型号 + 版本 + 容量 + 颜色**

示例：
- `OPPO A5活力版 12+256 玉石绿`
- `Xiaomi 14 Pro标准版 8+256 黑色`
- `vivo Y50 8+128 白金`（无版本）

## 解决方案

修改 `preprocessInputAdvanced()` 函数的容量插入逻辑：

### 1. 扩展容量提取正则

支持两种容量格式：
- `8+256`（双容量）
- `256GB`（单容量）

```typescript
const capacityPattern = /\((\d+(?:GB|TB|T)?\s*\+\s*\d+(?:GB|TB|T)?|\d+(?:GB|TB|T))\)/gi;
```

### 2. 智能容量插入

```typescript
// 查找版本关键词的结束位置
const versionKeywords = ['活力版', '标准版', '优享版', '尊享版', 'Pro版', 'pro版', '轻享版', '基础版'];
let versionEndIndex = -1;

for (const keyword of versionKeywords) {
  const index = processed.indexOf(keyword);
  if (index !== -1) {
    versionEndIndex = index + keyword.length;
    break;
  }
}

if (versionEndIndex !== -1) {
  // 在版本后插入容量
  processed = processed.slice(0, versionEndIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(versionEndIndex).trim();
} else {
  // 如果没有版本，在第一个中文字符（通常是颜色）前插入容量
  const chinesePattern = /[\u4e00-\u9fa5]/;
  const chineseIndex = processed.search(chinesePattern);
  
  if (chineseIndex !== -1) {
    processed = processed.slice(0, chineseIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(chineseIndex).trim();
  } else {
    processed = processed.trim() + ' ' + capacities[0];
  }
}
```

### 3. 移除不必要的 camelCase 处理

原来的步骤 5 包含了 camelCase 处理逻辑，会将 "iPhone" 拆分成 "i Phone"，这是不必要的。移除这些正则：

```typescript
// ❌ 移除这些
processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
processed = processed.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
```

## 测试结果

```
✅ "OPPO A5活力版(12+256)玉石绿"
   结果: "OPPO A5活力版 12+256 玉石绿"

✅ "Xiaomi 14 Pro标准版(8+256)黑色"
   结果: "Xiaomi 14 Pro标准版 8+256 黑色"

✅ "vivo Y50(8+128)白金"
   结果: "vivo Y50 8+128 白金"

✅ "iPhone 14 Pro Max(256GB)深空黑"
   结果: "iPhone 14 Pro Max 256GB 深空黑"
```

## 优点

1. **保持版本完整性**：`A5活力版` 不会被容量打断
2. **符合自然阅读顺序**：版本 → 容量 → 颜色
3. **与 SPU 名称格式一致**：便于匹配
4. **支持多种容量格式**：`8+256`、`256GB` 等

## 影响范围

- 文件：`Z1P-Rnew/utils/smartMatcher.ts`
- 函数：`preprocessInputAdvanced()`
- 测试：`Z1P-Rnew/scripts/test-preprocess-fix.ts`

## 相关问题

- 用户查询 #11：匹配输入商品名称把顺序给改了
- 用户查询 #12：容量不应该在版本前面，正确排序为 版本，容量，颜色
