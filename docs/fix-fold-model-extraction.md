# 修复 Fold 型号提取问题

## 问题描述

**案例**：
- 输入：`Vivo X FOLD5 5G 16+1T 青松`
- 错误匹配：`vivo X Fold 3 保护膜`
- 期望匹配：`vivo X Fold5 全网通5G 16GB+1TB 青松`

**问题**：
1. 型号提取错误：`X FOLD5` 被提取为 `xfold` 而不是 `xfold5`
2. 匹配到配件：手机匹配到了保护膜

## 根本原因

### 原因 1: 字母+字母型号正则缺少数字部分

```typescript
// 修复前的正则
const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
```

**问题流程**：
1. 输入：`Vivo X FOLD5 5G 16+1T 青松`
2. 预处理：`x fold5 5g 16+1t 青松`
3. 标准化：`x fold 5 5 g 16+1 t 青松`
   - `fold` 是关键词，前面加空格
   - 字母数字间加空格：`fold5` → `fold 5`
4. 正则匹配：`/\b([a-z])\s+(fold)\b/gi`
   - 匹配到 `x fold`
   - **丢失了数字 `5`** ❌
5. 结果：`xfold` 而不是 `xfold5`

**影响范围**：
- `X Fold5` → `xfold` ❌
- `Z Fold5` → `zfold` ❌
- `Z Flip3` → `zflip` ❌
- `X Fold 3` → `xfold` ❌

### 原因 2: 配件关键词缺少"保护膜"

```json
// 修复前的配置
"accessoryKeywords": [
  "充电器", "充电线", "数据线", "耳机", 
  "保护壳", "保护套", "贴膜", "钢化膜",
  // ❌ 缺少 "保护膜"
  "支架", "转接头", "适配器", "电源",
  "原装", "配件", "套餐"
]
```

**问题**：
- `vivo X Fold 3 保护膜` 中的 "保护膜" 未被识别为配件
- 导致手机可能匹配到保护膜产品

## 解决方案

### 修复 1: 字母+字母型号正则添加可选数字

```typescript
// ✅ 修复后的正则
const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)(?:\s+(\d+))?\b/gi;
//                                                          ^^^^^^^^^^^^^^^^
//                                                          添加可选的数字部分
```

**效果**：
- `x fold 5` → 匹配到 `x fold 5` → 返回 `xfold5` ✅
- `z fold5` → 匹配到 `z fold5` → 返回 `zfold5` ✅
- `x fold` → 匹配到 `x fold` → 返回 `xfold` ✅（向后兼容）

**正则说明**：
- `\b([a-z])` - 匹配单个字母（如 `x`, `z`）
- `\s+` - 匹配一个或多个空格
- `(note|fold|flip|pad)` - 匹配关键词
- `(?:\s+(\d+))?` - **新增**：可选的空格+数字（如 ` 5`, ` 3`）
  - `(?:...)` - 非捕获组
  - `\s+` - 一个或多个空格
  - `(\d+)` - 一个或多个数字
  - `?` - 整个组是可选的

### 修复 2: 配件关键词添加"保护膜"

```json
{
  "accessoryKeywords": [
    "充电器", "充电线", "数据线", "耳机",
    "保护壳", "保护套", 
    "保护膜",  // ✅ 新增
    "贴膜", "钢化膜",
    "支架", "转接头", "适配器", "电源",
    "原装", "配件", "套餐"
  ]
}
```

**效果**：
- `vivo X Fold 3 保护膜` → 包含 "保护膜"，被过滤 ✅
- 手机不会匹配到保护膜产品

## 测试验证

### 测试用例 1: 型号提取

| 输入 | 提取型号 | 期望 | 状态 |
|------|----------|------|------|
| Vivo X FOLD5 5G 16+1T 青松 | xfold5 | xfold5 | ✅ |
| vivo X Fold 3 保护膜 | xfold3 | xfold3 | ✅ |
| vivo X Fold3 Pro | xfold3 | xfold3 | ✅ |
| Samsung Galaxy Z Fold5 | zfold5 | zfold5 | ✅ |
| Samsung Galaxy Z Flip3 | zflip3 | zflip3 | ✅ |

### 测试用例 2: 配件过滤

| 输入 | SPU | 过滤 | 期望 | 状态 |
|------|-----|------|------|------|
| Vivo X FOLD5 5G 16+1T 青松 | vivo X Fold 3 保护膜 | 是 | 是 | ✅ |
| Vivo X FOLD5 5G 16+1T 青松 | vivo X Fold5 全网通5G 16GB+1TB 青松 | 否 | 否 | ✅ |

### 测试脚本

```bash
npx tsx Z1P-Rnew/scripts/test-fold-fix.ts
```

## 影响分析

### 正面影响

1. **型号识别更准确**
   - Fold/Flip 系列型号能正确提取数字
   - `X Fold5` 不再被误识别为 `X Fold`

2. **匹配更精确**
   - `X Fold5` 和 `X Fold3` 能正确区分
   - 避免不同代数的产品互相匹配

3. **配件过滤更完善**
   - 保护膜被正确识别为配件
   - 手机不会匹配到保护膜产品

### 潜在风险

1. **向后兼容性**
   - 正则添加了可选数字部分，保持向后兼容
   - 没有数字的情况（如 `X Fold`）仍然能正确匹配

2. **边界情况**
   - 某些特殊命名可能需要额外处理
   - 例如：`X Fold Pro` vs `X Fold 5 Pro`

## 相关型号

### Fold 系列

- **vivo**：X Fold、X Fold+、X Fold2、X Fold3、X Fold5
- **Samsung**：Galaxy Z Fold、Z Fold2、Z Fold3、Z Fold4、Z Fold5、Z Fold6
- **OPPO**：Find N、Find N2、Find N3
- **Honor**：Magic V、Magic V2、Magic V3

### Flip 系列

- **Samsung**：Galaxy Z Flip、Z Flip3、Z Flip4、Z Flip5、Z Flip6
- **Motorola**：Razr、Razr 5G、Razr 40、Razr 40 Ultra

## 配件关键词完整列表

```json
{
  "accessoryKeywords": [
    "充电器",    // 充电设备
    "充电线",    // 数据线
    "数据线",
    "耳机",      // 音频配件
    "保护壳",    // 保护类
    "保护套",
    "保护膜",    // ✅ 新增
    "贴膜",
    "钢化膜",
    "支架",      // 其他配件
    "转接头",
    "适配器",
    "电源",
    "原装",      // 通用标识
    "配件",
    "套餐"
  ]
}
```

## 相关文件

- `Z1P-Rnew/utils/smartMatcher.ts` - 核心匹配逻辑
- `Z1P-Rnew/.kiro/config/filter-keywords.json` - 配件关键词配置
- `Z1P-Rnew/scripts/test-fold-fix.ts` - 修复验证脚本
- `Z1P-Rnew/scripts/test-fold-model.ts` - 问题分析脚本

## 后续优化建议

### 短期优化

1. **扩展配件关键词**
   - 添加更多配件类型：手机壳、手机膜、车载支架等
   - 支持多语言配件名称

2. **型号标准化**
   - 统一 Fold/Flip 型号的命名规则
   - 例如：`X Fold 5` vs `X Fold5` vs `XFold5`

### 长期优化

1. **产品分类**
   - 在 SPU 数据中添加产品类型字段（手机、配件、平板等）
   - 根据产品类型进行匹配过滤

2. **智能识别**
   - 使用机器学习识别配件产品
   - 根据产品名称特征自动分类

## 修复日期

2026-01-24
