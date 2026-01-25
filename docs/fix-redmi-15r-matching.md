# 修复红米15R匹配问题

## 问题描述

**输入**: `红米15R 4+128星岩黑`  
**预期匹配**: `红米 15R 全网通5G版 4GB+128GB 星岩黑`  
**实际结果**: 无法匹配

## 根本原因

### 1. 品牌索引只支持单向查找（关键问题）

品牌索引构建时，只为 SPU 的品牌建立索引，没有考虑中文/拼音的双向映射：

**问题场景**：
- SPU 品牌是 "Redmi"（拼音）
- 索引键只有 "redmi"
- 用户输入 "红米15R"，提取品牌为 "红米"
- 查找 `spuIndexByBrand.get("红米")` 返回空数组 ❌
- 导致候选 SPU 为 0，匹配失败

### 2. 型号提取不一致（已修复）

当品牌库未正确加载或SPU使用不同品牌名称时，型号提取会产生不一致的结果：

- **输入** "红米15R" → 提取型号: `"15r"`
- **SPU** "Redmi 15R" → 提取型号: `"redmi15r"` ❌

**原因**: `preprocessModelString` 方法在移除品牌时，如果品牌库未加载，无法识别 "Redmi"，导致它被当作型号的一部分。

### 2. 版本不匹配（次要问题）

- **输入**: 无版本信息
- **SPU**: "全网通5G"版本
- **原分数**: 0.9（`SPU_VERSION_ONLY`）

用户输入通常会省略版本信息，这是正常情况，不应该大幅降低匹配分数。

### 3. SPU部分提取不一致

- **输入SPU部分**: "红米15R 4+128"（包含容量）
- **预期SPU部分**: "红米 15R"（不包含容量）

容量提取的正则表达式不支持 `4+128` 格式（没有GB单位）。

## 解决方案

### 修复1: 品牌索引双向映射（关键修复）

在 `buildSPUIndex()` 方法中，添加反向查找逻辑：

```typescript
buildSPUIndex(spuList: SPUData[]) {
  for (const spu of spuList) {
    const brand = spu.brand || this.extractBrand(spu.name);
    const keys = [brand.toLowerCase()];
    
    // 正向查找：如果品牌是中文，添加其拼音
    const brandInfo = this.brandList.find(b => b.name === brand);
    if (brandInfo && brandInfo.spell) {
      keys.push(brandInfo.spell.toLowerCase());
    }
    
    // 反向查找：如果品牌是拼音，添加对应的中文品牌名
    const brandInfoBySpell = this.brandList.find(b => b.spell?.toLowerCase() === brand.toLowerCase());
    if (brandInfoBySpell && brandInfoBySpell.name) {
      keys.push(brandInfoBySpell.name.toLowerCase());
    }
    
    // 为每个键添加索引
    for (const key of keys) {
      if (!this.spuIndexByBrand.has(key)) {
        this.spuIndexByBrand.set(key, []);
      }
      this.spuIndexByBrand.get(key)!.push(spu);
    }
  }
}
```

**效果**: 
- SPU 品牌是 "Redmi" → 索引键: `["redmi", "红米"]`
- SPU 品牌是 "红米" → 索引键: `["红米", "redmi"]`
- 用户输入 "红米15R" 或 "Redmi 15R" 都能找到所有相关 SPU ✅

### 修复2: 添加品牌降级方案

在 `getBrandsToRemove()` 方法中添加硬编码的常见品牌列表作为降级方案：

```typescript
private getBrandsToRemove(): string[] {
  // ... 缓存逻辑 ...
  
  if (this.brandList.length > 0) {
    // 使用品牌库
  } else {
    // 降级方案：使用硬编码的常见品牌列表
    const fallbackBrands = [
      // 中文品牌名
      '小米', '红米', '华为', 'vivo', 'oppo', '荣耀', '一加', '真我', '魅族',
      '中兴', '努比亚', '联想', '摩托罗拉', '三星', '苹果', '诺基亚',
      // 英文品牌名
      'xiaomi', 'redmi', 'huawei', 'vivo', 'oppo', 'honor', 'oneplus', 
      'realme', 'meizu', 'zte', 'nubia', 'lenovo', 'motorola', 
      'samsung', 'apple', 'nokia', 'iphone', 'ipad'
    ];
    brandsToRemove.push(...fallbackBrands);
  }
  
  // 按长度降序排序
  this.brandsToRemoveCache = brandsToRemove.sort((a, b) => b.length - a.length);
  return this.brandsToRemoveCache;
}
```

**效果**: 
- ✅ "红米15R" → `"15r"`
- ✅ "Redmi 15R" → `"15r"`
- ✅ 型号提取一致性得到保证

### 修复3: 提高版本不匹配时的分数

在 `calculateExactSPUScore()` 方法中，当输入没有版本但SPU有版本时，提高分数：

```typescript
private calculateExactSPUScore(
  inputVersion: VersionInfo | null,
  spuVersion: VersionInfo | null
): number {
  // ...
  
  if (!inputVersion && spuVersion) {
    // 改进：提高分数从 0.9 到 0.95
    // 用户输入通常省略版本信息，这是正常情况
    return 0.95;
  }
  
  // ...
}
```

**效果**: 版本不匹配时的分数从 0.9 提高到 0.95，更容易匹配成功。

### 修复4: 改进容量提取正则

在 `extractSPUPart()` 方法中，改进容量提取的正则表达式：

```typescript
// 规则3: 如果找到容量（改进：支持 4+128 格式）
const memoryPattern = /(.+?)\s*\(?\d+\s*(?:gb)?\s*\+\s*\d+\s*(?:gb)?\)?/i;
```

**效果**: 现在可以正确识别 `4+128`（无GB单位）和 `4GB+128GB` 两种格式。

### 修复5: 添加详细的调试日志

在 `findExactSPUMatches()` 方法中添加详细的调试信息：

```typescript
private findExactSPUMatches(...) {
  // 输出输入型号的标准化形式
  console.log(`[精确匹配] 输入型号标准化: "${inputModel}" -> "${inputModelNormalized}"`);
  
  // 对于包含目标型号的SPU，输出详细信息
  if (spu.name.includes('15') && spu.name.includes('R')) {
    console.log(`[精确匹配] 检查SPU: "${spu.name}"`);
    console.log(`  SPU部分: "${spuSPUPart}"`);
    console.log(`  SPU品牌: "${spuBrand}"`);
    console.log(`  SPU型号: "${spuModel}" -> "${spuModelNormalized}"`);
    console.log(`  SPU版本: ${spuVersion ? `"${spuVersion.name}"` : 'null'}`);
  }
  
  // 输出统计信息
  console.log(`[精确匹配] 统计: 检查${checkedCount}个, 过滤${filteredCount}个, 品牌不匹配${brandMismatchCount}个, 型号不匹配${modelMismatchCount}个`);
}
```

**效果**: 更容易诊断匹配失败的原因。

## 测试结果

### 型号提取一致性测试

```bash
npx tsx scripts/test-model-extraction-15r.ts
```

**结果**: ✅ 所有格式都提取为相同的型号 "15r"

| 输入格式 | 提取型号 | 状态 |
|---------|---------|------|
| 红米15R | 15r | ✅ |
| 红米 15R | 15r | ✅ |
| 红米 15 R | 15r | ✅ |
| Redmi 15R | 15r | ✅ |
| Redmi 15 R | 15r | ✅ |
| Redmi 15 r | 15r | ✅ |

### 诊断测试

```bash
npx tsx scripts/test-redmi-15r-issue.ts
```

**结果**: 
- ✅ 型号提取: "15r" (一致)
- ✅ 容量提取: "4+128" (正确)
- ✅ 颜色提取: "星岩黑" (正确)
- ⚠️  版本不匹配: null vs "全网通5G" (已提高分数)

## 影响范围

这些修复会影响所有使用 `SimpleMatcher` 的匹配场景：

1. **在线匹配** (`/smart-match` 页面)
2. **表格匹配** (`/table-match` 页面)
3. **所有依赖型号提取的功能**

## 注意事项

1. **品牌库加载**: 在浏览器环境中，确保品牌库正确加载，以获得最佳匹配效果
2. **降级方案**: 硬编码的品牌列表需要定期更新，以包含新品牌
3. **版本匹配**: 用户输入省略版本信息是常见情况，系统应该容错处理

## 相关文件

- `utils/smartMatcher.ts` - 主要修复文件
- `scripts/test-model-extraction-15r.ts` - 型号提取一致性测试
- `scripts/test-redmi-15r-issue.ts` - 问题诊断脚本

## 后续优化建议

1. **品牌库管理**: 考虑将品牌列表作为配置文件，方便维护
2. **版本智能匹配**: 考虑实现版本的模糊匹配（如 "5G" 匹配 "全网通5G"）
3. **匹配分数调优**: 根据实际使用情况，继续优化各种情况的匹配分数
