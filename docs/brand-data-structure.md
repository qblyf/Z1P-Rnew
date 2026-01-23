# 品牌数据结构说明

## 概述

智能匹配系统通过 `getBrandBaseList()` API 获取品牌信息。

---

## 完整的品牌数据结构（Brand 接口）

```typescript
interface Brand {
  /** 品牌名 */
  name: string;
  
  /** 品牌英文（用于匹配不同语言的品牌名） */
  spell?: string;
  
  /** 颜色 (用于前端对品牌名进行着色) */
  color: string;
  
  /** 排序依据 */
  order: number;
  
  /** 是否在列表中显示 */
  display: boolean;
  
  /** LOGO 图片地址 */
  logo?: ImgURL;
}
```

---

## 智能匹配使用的字段

`getBrandBaseList()` 返回的是 Brand 接口的部分字段：

```typescript
type GetBrandBaseList = () => Promise<Array<Pick<Brand, 'name' | 'spell' | 'order' | 'color'>>>;
```

**实际返回的字段**：

```typescript
interface BrandData {
  /** 品牌名称（必需） */
  name: string;
  
  /** 品牌英文（可选，用于匹配） */
  spell?: string;
  
  /** 排序号（可选） */
  order?: number;
  
  /** 颜色（必需，用于UI显示） */
  color: string;
}
```

---

## 字段说明

### 1. name（品牌名称）

- **类型**: `string`
- **必需**: ✅ 是
- **用途**: 
  - 品牌识别的主要字段
  - 用于匹配输入中的品牌名
  - 显示在匹配结果中
- **示例**: 
  - `"红米"`
  - `"Redmi"`
  - `"小米"`
  - `"Xiaomi"`
  - `"Apple"`

**重要提示**：
- 中英文品牌名应该分别添加
- 例如："红米" 和 "Redmi" 应该是两个独立的品牌记录
- 但它们应该有相同的 `spell` 字段

---

### 2. spell（品牌英文）

- **类型**: `string | undefined`
- **必需**: ⚠️ 可选，但强烈建议填写
- **用途**: 
  - 用于匹配不同语言的品牌名
  - 实现中英文品牌名的关联
  - 例如："红米" 和 "Redmi" 通过 `spell: "redmi"` 关联
- **示例**:
  - `"redmi"` - 红米/Redmi
  - `"xiaomi"` - 小米/Xiaomi
  - `"oneplus"` - 一加/OnePlus
  - `"apple"` - 苹果/Apple

**重要提示**：
- 品牌英文应该使用小写
- 中英文品牌名应该使用相同的品牌英文
- 这是实现品牌匹配的关键字段

**品牌匹配逻辑**：
```typescript
// 通过 spell 字段匹配不同写法的品牌
// "红米" (spell: "redmi") 和 "Redmi" (spell: "redmi") 会被识别为同一品牌
function isBrandMatch(brand1: string, brand2: string): boolean {
  // 1. 完全匹配
  if (brand1 === brand2) return true;
  
  // 2. 通过 spell 字段匹配
  const brand1Info = brandList.find(b => b.name === brand1);
  const brand2Info = brandList.find(b => b.name === brand2);
  
  if (brand1Info?.spell && brand2Info?.spell) {
    return brand1Info.spell === brand2Info.spell;
  }
  
  return false;
}
```

---

### 3. color（颜色）

- **类型**: `string`
- **必需**: ✅ 是
- **用途**: 
  - 用于前端 UI 显示
  - 在匹配结果中给品牌名着色
  - 提升用户体验
- **格式**: 十六进制颜色代码
- **示例**:
  - `"#FF6B6B"` - 红色系
  - `"#4ECDC4"` - 青色系
  - `"#95E1D3"` - 绿色系
  - `"#F38181"` - 粉色系

**在 UI 中的使用**：
```tsx
<Tag color={brand.color}>{brand.name}</Tag>
```

---

### 4. order（排序号）

- **类型**: `number | undefined`
- **必需**: ⚠️ 可选
- **用途**: 
  - 控制品牌在列表中的显示顺序
  - 数字越小，排序越靠前
- **示例**:
  - `1` - 最高优先级
  - `10` - 中等优先级
  - `100` - 较低优先级

---

## 数据示例

### 完整的品牌配置示例

```json
[
  {
    "name": "红米",
    "spell": "redmi",
    "color": "#FF6B6B",
    "order": 10
  },
  {
    "name": "Redmi",
    "spell": "redmi",
    "color": "#FF6B6B",
    "order": 11
  },
  {
    "name": "小米",
    "spell": "xiaomi",
    "color": "#FF9800",
    "order": 5
  },
  {
    "name": "Xiaomi",
    "spell": "xiaomi",
    "color": "#FF9800",
    "order": 6
  },
  {
    "name": "Apple",
    "spell": "apple",
    "color": "#000000",
    "order": 1
  },
  {
    "name": "苹果",
    "spell": "apple",
    "color": "#000000",
    "order": 2
  }
]
```

---

## 品牌配置最佳实践

### 1. 中英文品牌都要添加

✅ **正确做法**：
```json
[
  { "name": "红米", "spell": "redmi", "color": "#FF6B6B", "order": 10 },
  { "name": "Redmi", "spell": "redmi", "color": "#FF6B6B", "order": 11 }
]
```

❌ **错误做法**：
```json
[
  { "name": "红米", "spell": "redmi", "color": "#FF6B6B", "order": 10 }
  // 缺少 "Redmi"
]
```

**原因**：
- 用户输入可能是中文或英文
- 两种写法都需要能够识别
- 通过相同的 `spell` 字段关联

---

### 2. spell 字段必须填写

✅ **正确做法**：
```json
{ "name": "红米", "spell": "redmi", "color": "#FF6B6B" }
```

❌ **错误做法**：
```json
{ "name": "红米", "color": "#FF6B6B" }
// 缺少 spell 字段
```

**原因**：
- `spell` 字段是品牌匹配的关键
- 没有 `spell` 字段，中英文品牌无法关联
- 会导致品牌匹配失败

---

### 3. spell 字段使用小写

✅ **正确做法**：
```json
{ "name": "Redmi", "spell": "redmi" }
```

❌ **错误做法**：
```json
{ "name": "Redmi", "spell": "Redmi" }
// spell（品牌英文）应该是小写
```

**原因**：
- 代码中会将 spell 转换为小写进行比较
- 统一使用小写避免大小写问题

---

### 4. 相同品牌的中英文使用相同的 spell

✅ **正确做法**：
```json
[
  { "name": "红米", "spell": "redmi" },
  { "name": "Redmi", "spell": "redmi" }
  // 相同的品牌英文
]
```

❌ **错误做法**：
```json
[
  { "name": "红米", "spell": "hongmi" },
  { "name": "Redmi", "spell": "redmi" }
  // 不同的品牌英文，无法关联
]
```

---

## 品牌识别流程

### 1. 品牌提取

```typescript
extractBrand(input: string): string | null {
  const lowerStr = input.toLowerCase();
  
  // 按品牌名称长度降序排序，优先匹配更长的品牌名
  const sortedBrands = [...brandList].sort((a, b) => b.name.length - a.name.length);
  
  for (const brand of sortedBrands) {
    const brandName = brand.name.toLowerCase();
    const brandSpell = brand.spell?.toLowerCase();
    
    // 匹配中文品牌名
    if (lowerStr.includes(brandName)) {
      return brand.name;
    }
    
    // 匹配品牌英文
    if (brandSpell && lowerStr.includes(brandSpell)) {
      return brand.name;
    }
  }
  
  return null;
}
```

**示例**：
- 输入：`"红米15R 4+128星岩黑"`
- 匹配：`brandName = "红米"` → 返回 `"红米"`

- 输入：`"Redmi 15R 4+128星岩黑"`
- 匹配：`brandSpell = "redmi"` → 返回 `"Redmi"`

---

### 2. 品牌匹配

```typescript
isBrandMatch(brand1: string, brand2: string): boolean {
  // 完全匹配
  if (brand1 === brand2) return true;
  
  // 通过 spell 字段匹配
  const brand1Info = brandList.find(b => b.name === brand1);
  const brand2Info = brandList.find(b => b.name === brand2);
  
  if (brand1Info?.spell && brand2Info?.spell) {
    return brand1Info.spell.toLowerCase() === brand2Info.spell.toLowerCase();
  }
  
  return false;
}
```

**示例**：
- `isBrandMatch("红米", "Redmi")` → `true` (相同的 spell: "redmi")
- `isBrandMatch("红米", "小米")` → `false` (不同的 spell)

---

## 常见问题

### Q1: 为什么"红米"没有被识别？

**可能原因**：
1. 品牌库中没有"红米"品牌
2. "红米"品牌缺少 `spell` 字段
3. 品牌库加载失败

**解决方案**：
1. 检查品牌库：`console.table(brandList)`
2. 添加品牌（如果不存在）
3. 确保 `spell` 字段正确

---

### Q2: 为什么"红米"和"Redmi"无法关联？

**可能原因**：
1. 两个品牌的 `spell` 字段不同
2. 其中一个品牌缺少 `spell` 字段

**解决方案**：
确保两个品牌有相同的 `spell` 字段：
```json
[
  { "name": "红米", "spell": "redmi" },
  { "name": "Redmi", "spell": "redmi" }
]
```

---

### Q3: 如何添加新品牌？

**步骤**：
1. 进入 **数据管理 > 基础数据管理 > 品牌管理**
2. 点击"添加品牌"
3. 填写信息：
   - 品牌名称：`红米`
   - 品牌英文：`redmi`
   - 颜色：`#FF6B6B`
   - 排序号：`10`
4. 如果有英文名，再添加一个：
   - 品牌名称：`Redmi`
   - 品牌英文：`redmi` (相同)
   - 颜色：`#FF6B6B` (相同)
   - 排序号：`11`
5. 保存并刷新智能匹配页面

---

## 调试工具

### 检查品牌库

```javascript
// 在浏览器控制台运行
console.log('品牌库:', brandList);
console.log('品牌数量:', brandList.length);

// 查看所有品牌
console.table(brandList);

// 搜索特定品牌
const hongmi = brandList.find(b => b.name === '红米');
console.log('红米品牌:', hongmi);

// 检查 spell 字段
const redmiBrands = brandList.filter(b => b.spell === 'redmi');
console.log('spell=redmi 的品牌:', redmiBrands);
```

---

## 相关文档

- [品牌库配置指南](./brand-library-requirements.md)
- [品牌提取调试指南](./debug-brand-extraction.md)
- [品牌匹配问题排查](./troubleshooting-brand-matching.md)
- [智能匹配规则](./smart-match-rules.md)
