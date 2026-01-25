# 智能匹配版本显示修复

## 问题描述

在智能匹配中，输入 "OPPO Reno15pro 全网通5G版 16＋512蜜糖金"，规格标签只显示 "16+512蜜糖金"，没有显示 "全网通5G版"。

实际显示：`16+512` `蜜糖金`  
期望显示：`全网通5G版` `16+512` `蜜糖金`

## 根本原因

1. **版本提取正常**：`extractVersion` 方法能正确识别 "全网通5G版"
2. **显示使用标准化名称**：显示时使用的是配置文件中的标准化名称（"全网通5G"），而不是用户输入的原始字符串（"全网通5G版"）

### 问题流程

```
用户输入: "全网通5G版"
    ↓
配置匹配: "全网通5G" (配置文件中的标准名称)
    ↓
显示结果: "全网通5G" (缺少"版"字)
```

## 解决方案

### 核心改进

修改 `extractVersion` 方法，添加 `extractOriginal` 参数，用于提取原始输入中的版本字符串：

```typescript
// 旧方法
extractVersion(input: string): VersionInfo | null

// 新方法
extractVersion(input: string, extractOriginal: boolean = false): VersionInfo | null
```

### 实现逻辑

1. **提取原始字符串**：
   - 找到匹配的版本关键词在输入中的位置
   - 检查后面是否紧跟"版"字
   - 返回完整的原始字符串

2. **更新类型定义**：
   ```typescript
   export interface VersionInfo {
     name: string;              // 标准化名称（如"全网通5G"）
     keywords: string[];
     priority: number;
     originalString?: string;   // 原始字符串（如"全网通5G版"）
   }
   ```

3. **更新显示逻辑**：
   ```typescript
   // 使用原始字符串优先，回退到标准化名称
   const displayVersion = inputVersion?.originalString || inputVersion?.name || null;
   ```

## 修改文件

### 1. utils/smartMatcher.ts

**修改内容：**
- 更新 `VersionInfo` 接口，添加 `originalString` 字段
- 修改 `extractVersion` 方法：
  - 添加 `extractOriginal` 参数（默认 false）
  - 当 `extractOriginal=true` 时，提取原始字符串
  - 检查版本关键词后是否有"版"字
  - 返回包含原始字符串的 VersionInfo 对象

### 2. components/SmartMatch.tsx

**修改内容：**
- 调用 `extractVersion` 时传入 `extractOriginal=true`
- 使用 `originalString` 优先显示版本信息
- 添加注释说明显示逻辑

## 测试验证

### 测试用例

| 输入 | 旧显示 | 新显示 | 状态 |
|------|--------|--------|------|
| OPPO Reno15pro 全网通5G版 16＋512蜜糖金 | 全网通5G | 全网通5G版 | ✅ |
| OPPO Reno15 全网通5G 16+256极光蓝 | 全网通5G | 全网通5G | ✅ |
| iPhone 15 Pro 5G版 256GB | 5G版 | 5G版 | ✅ |
| OPPO A5 蓝牙版 8+128 | 蓝牙版 | 蓝牙版 | ✅ |
| Xiaomi 14 5G 12+256 | 5G | 5G | ✅ |

### 验证步骤

1. 打开智能匹配页面
2. 输入：`OPPO Reno15pro 全网通5G版 16＋512蜜糖金`
3. 点击"开始匹配"
4. 检查规格标签是否显示：`全网通5G版` `16+512` `蜜糖金`

### 预期结果

✅ 版本信息完整显示（包含"版"字）  
✅ 容量信息正确显示  
✅ 颜色信息正确显示  
✅ 其他输入格式也正常工作

## 技术细节

### 版本字符串提取逻辑

```typescript
// 找到匹配位置
const index = lowerInput.indexOf(lowerVersion);

if (index !== -1) {
  let originalString = networkVersion;
  
  if (extractOriginal) {
    const endIndex = index + lowerVersion.length;
    // 检查后面是否紧跟"版"字
    if (endIndex < input.length && input[endIndex] === '版') {
      originalString = input.substring(index, endIndex + 1);
    } else {
      originalString = input.substring(index, endIndex);
    }
  }
  
  return {
    name: networkVersion,
    originalString,
    // ...
  };
}
```

### 显示优先级

1. **originalString**（原始输入字符串）- 最高优先级
2. **name**（标准化名称）- 回退选项
3. **null**（未匹配）- 不显示

## 向后兼容性

✅ 完全兼容：
- `extractOriginal` 参数默认为 `false`，保持原有行为
- `originalString` 字段为可选，不影响现有代码
- 只在需要显示时使用原始字符串

## 相关配置

配置文件：`.kiro/config/version-keywords.json`

```json
{
  "networkVersions": [
    "全网通5G",
    "全网通版",
    "蓝牙版",
    "eSIM版",
    "5G版",
    "4G版",
    "3G版",
    "5G",
    "4G",
    "3G"
  ]
}
```

## 注意事项

1. **配置文件中不需要包含"版"字**：代码会自动检测并提取
2. **按长度降序匹配**：优先匹配更长的版本（如"全网通5G"优先于"5G"）
3. **大小写不敏感**：匹配时会转换为小写
4. **保留原始大小写**：提取时保留用户输入的原始大小写
