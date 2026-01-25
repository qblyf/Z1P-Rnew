# Pad 匹配问题修复

## 问题描述

输入 "OPPO Pad4Pro 16+512 WiFi版深空灰" 错误匹配到 "OPPO Pad 5 孙颍莎定制限定立牌"（赠品），而不是正确的 "OPPO Pad 4 Pro 2025款 13.2英寸 WiFi版 16GB+512GB 深空灰"。

## 根本原因

### 问题1：型号提取不完整

旧的 `extractTabletModel` 方法无法正确提取连写的型号：

```
输入: "Pad4Pro"
旧提取: "pad" (丢失了 "4" 和 "Pro")
新提取: "pad4pro" (完整)
```

**原因：** 正则表达式 `/\b(matepad|ipad|pad)(?:[a-z]*)?...` 只匹配 "pad" 后面的可选字母，不能正确处理数字和后缀的组合。

### 问题2：赠品未被过滤

"赠品"、"定制"、"限定"、"立牌"等关键词没有被过滤，导致赠品 SPU 参与匹配。

## 解决方案

### 修复1：改进平板型号提取

更新 `extractTabletModel` 方法的正则表达式：

```typescript
// 旧正则（有问题）
/\b(matepad|ipad|pad)(?:[a-z]*)?(?:[\u4e00-\u9fa5]*)?(?:\s*(?:(pro|air|mini|plus|ultra|lite|se|x|m|t|s)?(?:\s+(\d+))?)?)?/gi

// 新正则（修复）
/\b(matepad|ipad|pad)\s*(\d+)?\s*(pro|air|mini|plus|ultra|lite|se|x|m|t|s)?\b/gi
```

**改进点：**
1. 明确匹配数字部分 `(\d+)?`
2. 明确匹配后缀部分 `(pro|air|...)?`
3. 支持连写和空格分隔（`\s*`）
4. 移除复杂的嵌套可选组

**支持格式：**
- `pad4pro` → `pad4pro`
- `pad 4 pro` → `pad4pro`
- `pad4 pro` → `pad4pro`
- `pad 4pro` → `pad4pro`
- `pad5` → `pad5`

### 修复2：添加赠品过滤

在 `shouldFilterSPU` 方法中添加赠品关键词过滤：

```typescript
// 规则2: 赠品/定制/限定过滤
const giftKeywords = ['赠品', '定制', '限定', '立牌', '周边', '手办', '摆件'];
const hasGiftKeywordInInput = giftKeywords.some(keyword => 
  lowerInput.includes(keyword)
);
const hasGiftKeywordInSPU = giftKeywords.some(keyword => 
  lowerSPU.includes(keyword)
);

// 如果输入不包含赠品关键词，但 SPU 包含赠品关键词，则过滤
if (!hasGiftKeywordInInput && hasGiftKeywordInSPU) {
  console.log(`[过滤] SPU "${spuName}" 被过滤 - 包含赠品/定制关键词`);
  return true;
}
```

## 修改文件

### utils/smartMatcher.ts

**修改内容：**

1. **extractTabletModel 方法**：
   - 更新正则表达式，支持连写和空格分隔
   - 正确提取数字和后缀部分
   - 添加注释说明支持的格式

2. **shouldFilterSPU 方法**：
   - 添加赠品关键词列表
   - 添加赠品过滤逻辑
   - 添加日志输出

## 测试验证

### 型号提取测试

| 输入 | 标准化 | 旧提取 | 新提取 | 状态 |
|------|--------|--------|--------|------|
| Pad4Pro | pad4pro | pad | pad4pro | ✅ |
| Pad 4 Pro | pad 4 pro | pad | pad4pro | ✅ |
| Pad 5 | pad 5 | pad | pad5 | ✅ |

### 赠品过滤测试

| 输入 | SPU | 应该过滤 | 实际结果 | 状态 |
|------|-----|---------|---------|------|
| OPPO Pad4Pro | OPPO Pad 4 Pro 2025款 | false | false | ✅ |
| OPPO Pad4Pro | OPPO Pad 5 孙颍莎定制限定立牌 | true | true | ✅ |

### 完整匹配测试

```
输入: OPPO Pad4Pro 16+512 WiFi版深空灰

候选SPU:
1. OPPO Pad 4 Pro 2025款 13.2英寸 WiFi版 16GB+512GB 深空灰
   - 型号: pad4pro ✅ 匹配
   - 过滤: false ✅ 不过滤
   - 结果: 候选

2. OPPO Pad 5 孙颍莎定制限定立牌
   - 型号: pad5 ❌ 不匹配
   - 过滤: true ✅ 过滤（包含"定制"、"限定"、"立牌"）
   - 结果: 被过滤

最终匹配: OPPO Pad 4 Pro 2025款 ✅
```

## 修复效果

### 修复前
```
输入: OPPO Pad4Pro 16+512 WiFi版深空灰
匹配: OPPO Pad 5 孙颍莎定制限定立牌 ❌
```

### 修复后
```
输入: OPPO Pad4Pro 16+512 WiFi版深空灰
匹配: OPPO Pad 4 Pro 2025款 13.2英寸 WiFi版 16GB+512GB 深空灰 ✅
```

## 赠品关键词列表

以下关键词会被自动过滤（当输入不包含这些关键词时）：

- 赠品
- 定制
- 限定
- 立牌
- 周边
- 手办
- 摆件

## 向后兼容性

✅ 完全兼容：
- 不影响其他型号的提取
- 不影响手机、手表等其他产品类型
- 只改进平板型号的提取精度

## 相关问题

这个修复同时解决了以下问题：
1. 连写型号无法识别（如 "Pad4Pro"）
2. 赠品/定制商品参与匹配
3. 型号提取不完整导致的误匹配

## 注意事项

1. **连写支持**：现在支持 "Pad4Pro" 这样的连写格式
2. **空格容错**：支持 "Pad 4 Pro"、"Pad4 Pro"、"Pad 4Pro" 等各种空格组合
3. **赠品过滤**：自动过滤包含赠品关键词的 SPU
4. **日志输出**：过滤时会输出日志，方便调试
