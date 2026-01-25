# 手表中文型号匹配修复

## 问题描述

输入 "华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带演示机蓝色" 未匹配，应该匹配到 "华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带"。

## 根本原因

`extractWordModel` 方法的正则表达式不支持中文后缀，无法识别 "Watch十周年款" 或 "WATCH 十周年款" 这样的型号。

### 问题分析

旧的正则表达式只匹配英文后缀：

```typescript
// 只能匹配: watch gt, watch pro, watch 3 等
/\b(watch|band|buds)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)...\b/gi
```

**不能匹配：**
- `watch十周年款`
- `watch 十周年款`
- `band纪念版`
- 其他中文后缀

## 解决方案

添加新的正则表达式模式，支持中文后缀：

```typescript
// Pattern 3: watch/band + 中文后缀
// 注意：不使用 \b，因为它在中英文边界不起作用
const wordModelPattern3 = /(watch|band|buds)\s*([\u4e00-\u9fa5]+款?)/gi;
```

### 关键改进

1. **支持中文后缀**：`[\u4e00-\u9fa5]+款?` 匹配一个或多个中文字符，可选"款"字
2. **移除单词边界**：不使用 `\b`，因为它在中英文混合时不起作用
3. **支持连写和空格**：`\s*` 允许可选空格

### 支持格式

| 输入 | 提取结果 | 状态 |
|------|---------|------|
| watch十周年款 | watch十周年款 | ✅ |
| watch 十周年款 | watch十周年款 | ✅ |
| WATCH 十周年款 | watch十周年款 | ✅ |
| band纪念版 | band纪念版 | ✅ |
| watch gt 3 | watchgt3 | ✅ |
| band 5 | band5 | ✅ |

## 修改文件

### utils/smartMatcher.ts

**修改内容：**

在 `extractWordModel` 方法中添加 Pattern 3：

```typescript
// Pattern 3: watch/band + 中文后缀（如 "watch十周年款"、"watch 十周年款"）
// 注意：不使用 \b，因为它在中英文边界不起作用
const wordModelPattern3 = /(watch|band|buds)\s*([\u4e00-\u9fa5]+款?)/gi;

const wordMatches1 = normalizedStr.match(wordModelPattern1);
const wordMatches2 = normalizedStr.match(wordModelPattern2);
const wordMatches3 = normalizedStr.match(wordModelPattern3); // 新增
const wordMatches = [...(wordMatches1 || []), ...(wordMatches2 || []), ...(wordMatches3 || [])];
```

## 测试验证

### 完整匹配测试

```
输入: 华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带演示机蓝色

步骤1: 清理演示机标记
结果: 华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带蓝色

步骤2: 提取品牌
结果: 华为 ✅

步骤3: 提取型号
旧方法: null ❌
新方法: watch十周年款 ✅

SPU: 华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带
SPU品牌: 华为 ✅
SPU型号: watch十周年款 ✅

匹配结果: ✅ 成功匹配
```

## 修复效果

### 修复前
```
输入: 华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带演示机蓝色
匹配: 未匹配 ❌
原因: 型号提取失败（null）
```

### 修复后
```
输入: 华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带演示机蓝色
匹配: 华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带 ✅
```

## 技术细节

### 为什么不使用 `\b`？

`\b` 是单词边界，在纯英文环境中工作良好，但在中英文混合时会失效：

```javascript
// 失败示例
/\bwatch\s*[\u4e00-\u9fa5]+\b/.test('watch十周年款')  // false

// 成功示例
/watch\s*[\u4e00-\u9fa5]+/.test('watch十周年款')      // true
```

**原因：** `\b` 依赖于 `\w`（字母、数字、下划线），而中文字符不属于 `\w`，导致边界检测失败。

### 优先级排序

当多个模式都匹配时，选择最长的匹配：

```typescript
const sorted = wordMatches.sort((a, b) => b.length - a.length);
return sorted[0].toLowerCase().replace(/\s+/g, '');
```

这确保了更具体的型号优先（如 "watch十周年款" 优于 "watch"）。

## 向后兼容性

✅ 完全兼容：
- 不影响现有的英文型号提取
- 不影响其他产品类型（手机、平板等）
- 只是添加了对中文后缀的支持

## 相关问题

这个修复同时解决了以下问题：
1. 中文型号无法识别
2. 中英文混合型号提取失败
3. 特殊版本（纪念版、限定版等）无法匹配

## 注意事项

1. **大小写不敏感**：所有型号都转换为小写
2. **空格标准化**：移除所有空格（"watch 十周年款" → "watch十周年款"）
3. **中文字符保留**：中文部分保持原样
4. **"款"字可选**：支持 "十周年款" 和 "十周年" 两种写法
