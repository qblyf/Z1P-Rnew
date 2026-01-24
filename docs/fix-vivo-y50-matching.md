# 修复 Vivo Y50 匹配问题

## 问题描述

用户报告的问题：
- **输入**: `Vivo Y50 5G(8+256)白金`
- **错误匹配**: `vivo 原装 50W无线闪充立式充电器（CH2177） 白色`
- **期望匹配**: `vivo Y50 全网通5G 8GB+256GB 白金`

## 根本原因分析

### 问题 1: 品牌大小写敏感

**原因**：`isBrandMatch` 函数缺少大小写不敏感的比较

```typescript
// 修复前的代码
private isBrandMatch(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false;
  
  // 完全匹配（大小写敏感）
  if (brand1 === brand2) return true;  // ❌ "Vivo" !== "vivo"
  
  // 通过拼音匹配
  // ...
  
  return false;
}
```

**问题场景**：
1. 输入 `"Vivo Y50"` → 提取品牌 → 返回 `"vivo"` 或 `"Vivo"`（取决于品牌库中的记录）
2. SPU `"vivo Y50"` → 提取品牌 → 返回 `"vivo"`
3. 如果品牌库中有多个大小写不同的 vivo 条目，可能导致：
   - 输入提取到 `"Vivo"`
   - SPU 提取到 `"vivo"`
   - `"Vivo" !== "vivo"` → 匹配失败 ❌

### 问题 2: 缺少配件过滤

**原因**：`shouldFilterSPU` 函数没有过滤配件类产品

```typescript
// 修复前的代码
shouldFilterSPU(inputName: string, spuName: string): boolean {
  // 只有礼盒版和版本互斥过滤
  // 没有配件过滤 ❌
}
```

**问题场景**：
1. 输入 `"Vivo Y50 5G(8+256)白金"` 包含品牌 `"vivo"` 和型号 `"Y50"`
2. 充电器 `"vivo 原装 50W无线闪充立式充电器"` 也包含品牌 `"vivo"` 和数字 `"50"`
3. 型号提取可能将 `"50W"` 误识别为 `"50"`
4. 导致手机匹配到充电器 ❌

## 解决方案

### 修复 1: 添加大小写不敏感的品牌匹配

```typescript
private isBrandMatch(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false;
  
  // 完全匹配（精确）
  if (brand1 === brand2) return true;
  
  // ✅ 新增：大小写不敏感匹配
  if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
  
  // 通过拼音匹配
  if (this.brandList.length > 0) {
    const brand1Info = this.brandList.find(b => b.name === brand1);
    const brand2Info = this.brandList.find(b => b.name === brand2);
    
    if (brand1Info && brand2Info && brand1Info.spell && brand2Info.spell) {
      return brand1Info.spell.toLowerCase() === brand2Info.spell.toLowerCase();
    }
  }
  
  return false;
}
```

**效果**：
- `"Vivo"` 和 `"vivo"` 现在可以正确匹配 ✅
- `"VIVO"` 和 `"vivo"` 也可以匹配 ✅
- 不影响其他品牌的匹配逻辑

### 修复 2: 添加配件关键词过滤

```typescript
shouldFilterSPU(inputName: string, spuName: string): boolean {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  // ... 原有的礼盒版和版本互斥过滤 ...
  
  // ✅ 新增：配件过滤
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', 
    '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
    '原装', '配件', '套餐'
  ];
  
  const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  // 如果输入不包含配件关键词，但 SPU 包含，则过滤
  if (!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU) {
    console.log(`[过滤] SPU "${spuName}" 被过滤 - 包含配件关键词`);
    return true;
  }
  
  return false;
}
```

**效果**：
- 输入 `"Vivo Y50 5G(8+256)白金"` 不会匹配到充电器 ✅
- 输入 `"vivo 原装充电器"` 仍然可以匹配到充电器 ✅
- 防止手机、平板等主设备匹配到配件

## 测试验证

### 测试用例 1: 品牌大小写匹配

| 品牌 1 | 品牌 2 | 修复前 | 修复后 |
|--------|--------|--------|--------|
| Vivo   | vivo   | ❌ false | ✅ true |
| vivo   | Vivo   | ❌ false | ✅ true |
| VIVO   | vivo   | ❌ false | ✅ true |
| vivo   | vivo   | ✅ true  | ✅ true |

### 测试用例 2: 配件过滤

| 输入 | SPU | 修复前 | 修复后 |
|------|-----|--------|--------|
| Vivo Y50 5G(8+256)白金 | vivo Y50 全网通5G 8GB+256GB 白金 | ✅ 不过滤 | ✅ 不过滤 |
| Vivo Y50 5G(8+256)白金 | vivo 原装 50W无线闪充立式充电器 | ❌ 不过滤 | ✅ 过滤 |
| vivo 原装充电器 | vivo 原装 50W无线闪充立式充电器 | ✅ 不过滤 | ✅ 不过滤 |

## 影响范围

### 正面影响
1. **提高匹配准确率**：品牌大小写不再影响匹配
2. **减少误匹配**：手机不会再匹配到配件
3. **更好的用户体验**：匹配结果更符合预期

### 潜在风险
1. **配件关键词列表**：需要持续维护，确保覆盖所有配件类型
2. **特殊情况**：某些产品名称可能同时包含主设备和配件关键词（如"手机+耳机套餐"）

## 后续优化建议

### 短期优化
1. **配件关键词配置化**：将配件关键词移到配置文件 `filter-keywords.json`
2. **品牌库去重**：确保品牌库中每个品牌只有一个标准条目
3. **型号提取优化**：改进型号提取逻辑，避免将 "50W" 识别为型号 "50"

### 长期优化
1. **产品分类**：在 SPU 数据中添加产品分类字段（手机、配件、平板等）
2. **机器学习**：使用历史匹配数据训练模型，自动识别配件
3. **用户反馈**：收集用户对匹配结果的反馈，持续优化规则

## 相关文件

- `Z1P-Rnew/utils/smartMatcher.ts` - 核心匹配逻辑
- `Z1P-Rnew/.kiro/config/filter-keywords.json` - 过滤关键词配置
- `Z1P-Rnew/scripts/test-vivo-fix.ts` - 修复验证脚本
- `Z1P-Rnew/docs/smart-match-rules.md` - 匹配规则文档

## 修复日期

2026-01-24
