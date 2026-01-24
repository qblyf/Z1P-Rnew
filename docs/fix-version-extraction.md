# 修复版本提取问题

## 问题描述

**案例**：
- 输入：`Vivo S30 Pro mini 5G 12+512 可可黑`
- 匹配到：`vivo S30 Pro mini 全网通5G 12GB+512GB 可可黑`
- 显示规格：`Pro 版 12+512 可可黑` ❌
- 期望规格：`5G 12+512 可可黑` ✅

**问题**：
1. 输入中的版本应该是 "5G"，但被识别为 "Pro 版"
2. SKU 中的版本应该是 "全网通5G"，但被识别为 "Pro 版"
3. "Pro mini" 是型号的一部分，不是版本

## 根本原因

### 原因 1: 版本识别优先级错误

```typescript
// 修复前的代码
extractVersion(input: string): VersionInfo | null {
  const lowerInput = input.toLowerCase();
  
  // ❌ 直接检查产品版本关键词
  for (const versionInfo of this.versionKeywords) {
    for (const keyword of versionInfo.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return versionInfo; // 找到 "pro" 就返回 "Pro 版"
      }
    }
  }
  
  return null;
}
```

**问题**：
- 产品版本（标准版、Pro 版等）优先于网络制式版本（5G、蓝牙版等）
- "S30 Pro mini 5G" 中先匹配到 "pro"，返回 "Pro 版"
- 忽略了更重要的网络制式 "5G"

### 原因 2: 型号中的 "Pro" 被误识别

```typescript
// "Pro mini" 中的 "Pro" 是型号的一部分
// 但被版本关键词 ["pro", "pro版"] 匹配到
```

**问题场景**：
- `iPhone 14 Pro Max` → "Pro" 是型号，不是版本
- `S30 Pro mini` → "Pro" 是型号，不是版本
- `Watch GT Pro` → "Pro" 是型号，不是版本
- `Pad 6 Pro 版` → "Pro 版" 才是真正的版本 ✅

### 原因 3: 网络版本配置不完整

```json
// 修复前的配置
"networkVersions": [
  "蓝牙版",
  "eSIM版",
  "5G版",  // ✅ 有 "5G版"
  "4G版",
  "全网通版"
  // ❌ 缺少单独的 "5G"、"4G"
  // ❌ 缺少 "全网通5G"
]
```

**问题**：
- 只能匹配 "5G版"，无法匹配单独的 "5G"
- 无法匹配 "全网通5G"（会被拆分为 "全网通版" 和 "5G"）

## 解决方案

### 修复 1: 调整版本识别优先级

```typescript
extractVersion(input: string): VersionInfo | null {
  const lowerInput = input.toLowerCase();
  
  // ✅ 优先检查网络制式版本
  const sortedNetworkVersions = [...this.networkVersions]
    .sort((a, b) => b.length - a.length); // 按长度降序，优先匹配更长的
  
  for (const networkVersion of sortedNetworkVersions) {
    if (lowerInput.includes(networkVersion.toLowerCase())) {
      return {
        id: `network-${networkVersion.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        name: networkVersion,
        keywords: [networkVersion],
        priority: 10, // 网络版本优先级高于产品版本
      };
    }
  }
  
  // 再检查产品版本
  for (const versionInfo of this.versionKeywords) {
    // ...
  }
  
  return null;
}
```

**效果**：
- "S30 Pro mini 5G" → 先匹配到 "5G" ✅
- "S30 Pro mini 全网通5G" → 先匹配到 "全网通5G" ✅

### 修复 2: 避免型号中的 "Pro" 被误识别

```typescript
// 检查产品版本时，特殊处理 "pro"
for (const versionInfo of this.versionKeywords) {
  for (const keyword of versionInfo.keywords) {
    const lowerKeyword = keyword.toLowerCase();
    
    // ✅ 特殊处理：如果是 "pro"，检查是否是型号的一部分
    if (lowerKeyword === 'pro' || lowerKeyword === 'pro版') {
      // 检查 "pro" 后面是否跟着型号后缀
      const proPattern = /\bpro\s*(mini|max|plus|ultra|air|lite|se)\b/i;
      if (proPattern.test(input)) {
        // "pro" 是型号的一部分，跳过
        continue;
      }
    }
    
    if (lowerInput.includes(lowerKeyword)) {
      return versionInfo;
    }
  }
}
```

**效果**：
- `"S30 Pro mini"` → "Pro" 后面有 "mini"，跳过 ✅
- `"14 Pro Max"` → "Pro" 后面有 "Max"，跳过 ✅
- `"Pad 6 Pro 版"` → "Pro 版" 是完整关键词，匹配 ✅

### 修复 3: 完善网络版本配置

```json
{
  "networkVersions": [
    "全网通5G",  // ✅ 新增：优先匹配
    "全网通版",
    "蓝牙版",
    "eSIM版",
    "esim版",
    "5G版",
    "4G版",
    "3G版",
    "5G",        // ✅ 新增：单独的 5G
    "4G",        // ✅ 新增：单独的 4G
    "3G"         // ✅ 新增：单独的 3G
  ]
}
```

**排序策略**：
- 按长度降序排序：`["全网通5G", "5G版", "5G"]`
- 优先匹配更长、更具体的版本
- 避免 "全网通5G" 被拆分为 "全网通版" + "5G"

## 测试验证

### 测试用例

| 输入 | 提取版本 | 期望 | 状态 |
|------|----------|------|------|
| Vivo S30 Pro mini 5G 12+512 可可黑 | 5G | 5G | ✅ |
| vivo S30 Pro mini 全网通5G 12GB+512GB 可可黑 | 全网通5G | 全网通5G | ✅ |
| iPhone 14 Pro Max | null | null | ✅ |
| iPhone 14 Pro Max 全网通5G | 全网通5G | 全网通5G | ✅ |
| Xiaomi 14 Pro 标准版 | 标准版 | 标准版 | ✅ |
| Xiaomi 14 Pro 标准版 5G | 5G | 5G | ✅ |
| Huawei Watch GT Pro 蓝牙版 | 蓝牙版 | 蓝牙版 | ✅ |
| Xiaomi Pad 6 Pro 版 | Pro 版 | Pro 版 | ✅ |

### 测试脚本

```bash
npx tsx Z1P-Rnew/scripts/test-version-fix.ts
```

## 影响分析

### 正面影响

1. **版本识别更准确**
   - 网络制式版本（5G、蓝牙版）优先识别
   - 避免型号中的 "Pro" 被误识别为版本

2. **规格标签更正确**
   - 显示 "5G 12+512 可可黑" 而不是 "Pro 版 12+512 可可黑"
   - 用户能看到正确的网络制式信息

3. **匹配更精确**
   - 版本匹配时，"5G" 和 "全网通5G" 能正确区分
   - 提高 SKU 匹配的准确率

### 潜在风险

1. **边界情况**
   - 某些产品可能同时有产品版本和网络版本
   - 例如："Pad 6 Pro 版 5G" → 应该识别 "5G" 还是 "Pro 版"？
   - 当前策略：优先识别网络版本 "5G"

2. **配置维护**
   - 需要持续维护网络版本列表
   - 新的网络制式（如 6G）需要及时添加

## 版本类型说明

### 网络制式版本（优先级高）

- **定义**：描述设备的网络连接方式
- **示例**：5G、4G、3G、全网通5G、蓝牙版、eSIM版
- **特点**：
  - 通常出现在 SKU 名称中
  - 影响设备的网络功能
  - 用户关心的重要信息

### 产品版本（优先级低）

- **定义**：描述产品的配置等级或特殊版本
- **示例**：标准版、活力版、优享版、尊享版、Pro 版
- **特点**：
  - 通常表示不同的配置或价格档次
  - 可能影响存储、内存等配置
  - 不影响网络功能

### 型号后缀（不是版本）

- **定义**：型号名称的一部分
- **示例**：Pro、Max、Plus、Ultra、Mini、Air、Lite、SE
- **特点**：
  - 与数字或其他型号标识连用
  - 例如：14 Pro Max、S30 Pro mini、Watch GT Pro
  - 不应该被识别为版本

## 相关文件

- `Z1P-Rnew/utils/smartMatcher.ts` - 核心匹配逻辑
- `Z1P-Rnew/.kiro/config/version-keywords.json` - 版本配置
- `Z1P-Rnew/scripts/test-version-fix.ts` - 修复验证脚本
- `Z1P-Rnew/scripts/test-version-extraction.ts` - 问题分析脚本

## 后续优化建议

### 短期优化

1. **版本组合处理**
   - 支持同时识别产品版本和网络版本
   - 例如："标准版 5G" → 产品版本="标准版"，网络版本="5G"

2. **配置化型号后缀**
   - 将 `mini|max|plus|ultra` 等移到配置文件
   - 支持动态添加新的型号后缀

### 长期优化

1. **版本分类**
   - 在数据模型中区分网络版本和产品版本
   - SKU 数据中分别存储两种版本

2. **智能识别**
   - 使用机器学习识别版本类型
   - 根据上下文判断 "Pro" 是型号还是版本

## 修复日期

2026-01-24
