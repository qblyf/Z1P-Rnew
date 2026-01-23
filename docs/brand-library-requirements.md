# 品牌库要求

## 概述

智能匹配功能完全依赖品牌库数据来识别品牌和提取型号。品牌库必须包含所有需要识别的品牌及其变体。

## 品牌库数据结构

```typescript
interface Brand {
  name: string;      // 品牌名称（主要显示名称）
  spell?: string;    // 品牌拼音（用于匹配英文输入）
  color?: string;    // 品牌颜色（用于UI显示）
  order?: number;    // 排序顺序
}
```

## 品牌库要求

### 1. 必须包含中英文品牌名

对于有中英文名称的品牌，需要分别添加两个条目：

```typescript
// 正确示例
[
  { name: 'Redmi', spell: 'redmi' },
  { name: '红米', spell: 'redmi' },  // 中文品牌名
]

// 错误示例（缺少中文品牌名）
[
  { name: 'Redmi', spell: 'redmi' },
  // 缺少 '红米'，导致 "红米15R" 无法识别品牌
]
```

### 2. 拼音字段用于匹配英文输入

`spell` 字段用于匹配英文或拼音输入：

```typescript
{ name: '小米', spell: 'xiaomi' }
// 可以匹配：xiaomi、Xiaomi、XIAOMI
```

### 3. 品牌名称大小写

品牌名称的大小写会被保留并用于显示：

```typescript
{ name: 'HUAWEI', spell: 'huawei' }  // 显示为 HUAWEI
{ name: 'vivo', spell: 'vivo' }      // 显示为 vivo
{ name: '小米', spell: 'xiaomi' }    // 显示为 小米
```

## 常见品牌示例

```typescript
const brandList = [
  // Apple
  { name: 'Apple', spell: 'apple' },
  { name: '苹果', spell: 'apple' },
  
  // 华为
  { name: 'HUAWEI', spell: 'huawei' },
  { name: '华为', spell: 'huawei' },
  
  // 荣耀
  { name: 'HONOR', spell: 'honor' },
  { name: '荣耀', spell: 'honor' },
  
  // 小米
  { name: '小米', spell: 'xiaomi' },
  { name: 'Xiaomi', spell: 'xiaomi' },
  
  // 红米（独立品牌）
  { name: 'Redmi', spell: 'redmi' },
  { name: '红米', spell: 'redmi' },
  
  // vivo
  { name: 'vivo', spell: 'vivo' },
  
  // OPPO
  { name: 'OPPO', spell: 'oppo' },
  
  // 三星
  { name: '三星', spell: 'samsung' },
  { name: 'Samsung', spell: 'samsung' },
  
  // 一加
  { name: '一加', spell: 'oneplus' },
  { name: 'OnePlus', spell: 'oneplus' },
  
  // 真我
  { name: '真我', spell: 'realme' },
  { name: 'realme', spell: 'realme' },
  
  // iQOO
  { name: 'iQOO', spell: 'iqoo' },
];
```

## 使用方法

在 `SmartMatch` 组件中，品牌库数据会自动加载并传递给匹配器：

```typescript
// 加载品牌库
const brands = await getBrandBaseList();
setBrandList(brands);

// 在匹配前设置品牌库
matcher.setBrandList(brandList);
```

## 注意事项

1. **品牌库未加载时**：如果品牌库未加载，匹配器会输出警告，品牌识别和型号提取可能不准确。

2. **品牌优先级**：品牌按名称长度降序匹配，优先匹配更长的品牌名（避免部分匹配问题）。

3. **中文品牌匹配**：中文品牌不使用单词边界，直接进行字符串匹配。

4. **英文品牌匹配**：英文品牌使用单词边界 `\b`，确保完整匹配。

## 测试

运行以下命令测试品牌识别：

```bash
npm test
```

所有测试应该通过，确保品牌库数据正确。
