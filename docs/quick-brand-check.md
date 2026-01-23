# 快速品牌检查

## 在浏览器控制台中运行

打开智能匹配页面，按 F12，在控制台中运行以下代码：

### 步骤1：检查品牌库是否加载

```javascript
// 查看日志中是否有 "已加载品牌数据: X 个品牌"
// 如果有，说明品牌库已加载
```

从你的日志可以看到：
```
已加载品牌数据: 96 个品牌 ✓
```

### 步骤2：检查关键品牌

在控制台中运行：

```javascript
// 重新获取品牌库
const { getBrandBaseList } = await import('@zsqk/z1-sdk/es/z1p/brand');
const brands = await getBrandBaseList();

// 检查关键品牌
const keyBrands = ['红米', 'Redmi', '小米', '一加', 'WIWU', 'HUAWEI', 'OPPO', 'vivo', 'Apple'];

console.log('=== 关键品牌检查 ===');
keyBrands.forEach(name => {
  const found = brands.find(b => b.name === name);
  console.log(found ? `✓ ${name}` : `✗ ${name} - 未找到`);
});
```

### 步骤3：查看所有品牌

```javascript
// 显示所有品牌名称
console.log('=== 所有品牌 ===');
brands.forEach((b, i) => console.log(`${i+1}. ${b.name} (spell: ${b.spell || '无'})`));
```

### 步骤4：按拼音分组查看

```javascript
// 按拼音分组
const groups = {};
brands.forEach(b => {
  if (b.spell) {
    if (!groups[b.spell]) groups[b.spell] = [];
    groups[b.spell].push(b.name);
  }
});

console.log('=== 拼音分组 ===');
Object.entries(groups)
  .filter(([_, names]) => names.length > 1)
  .forEach(([spell, names]) => {
    console.log(`${spell}: ${names.join(', ')}`);
  });
```

## 预期结果

### 必需的品牌对（中英文）

以下品牌对必须都存在：

| 拼音 | 中文品牌 | 英文品牌 | 说明 |
|------|---------|---------|------|
| redmi | 红米 | Redmi | 红米是独立品牌 |
| xiaomi | 小米 | Xiaomi | 小米主品牌 |
| oneplus | 一加 | OnePlus | 一加品牌 |
| huawei | 华为 | HUAWEI | 华为品牌 |
| honor | 荣耀 | HONOR | 荣耀品牌 |
| oppo | - | OPPO | OPPO品牌 |
| vivo | - | vivo | vivo品牌 |
| apple | 苹果 | Apple | 苹果品牌 |
| wiwu | - | WIWU | WIWU品牌 |

### 检查结果示例

**正确的配置**：
```
=== 拼音分组 ===
redmi: 红米, Redmi
xiaomi: 小米, Xiaomi
oneplus: 一加, OnePlus
huawei: 华为, HUAWEI
honor: 荣耀, HONOR
```

**错误的配置**（缺少中文品牌）：
```
=== 拼音分组 ===
redmi: Redmi  ❌ 缺少"红米"
xiaomi: 小米, Xiaomi
```

## 常见问题

### Q1: 品牌库有96个品牌，但"红米15R"还是匹配错误

**可能原因**：
1. 品牌库中只有"Redmi"，没有"红米"
2. 品牌拼音配置错误

**解决方案**：
运行步骤2的检查脚本，确认"红米"品牌是否存在

### Q2: 如何确认品牌库配置正确？

运行以下完整检查：

```javascript
const { getBrandBaseList } = await import('@zsqk/z1-sdk/es/z1p/brand');
const brands = await getBrandBaseList();

// 检查必需品牌
const required = [
  ['红米', 'redmi'],
  ['Redmi', 'redmi'],
  ['小米', 'xiaomi'],
  ['一加', 'oneplus'],
  ['WIWU', 'wiwu']
];

console.log('=== 必需品牌检查 ===');
let allFound = true;
required.forEach(([name, spell]) => {
  const found = brands.find(b => b.name === name && b.spell === spell);
  if (found) {
    console.log(`✓ ${name} (spell: ${spell})`);
  } else {
    console.log(`✗ ${name} (spell: ${spell}) - 未找到或拼音不匹配`);
    allFound = false;
  }
});

if (allFound) {
  console.log('\n✓ 所有必需品牌都已正确配置');
} else {
  console.log('\n❌ 部分必需品牌缺失或配置错误');
  console.log('请在 数据管理 > 基础数据管理 > 品牌管理 中添加缺失的品牌');
}
```

## 修复步骤

如果发现品牌缺失：

1. **进入基础数据管理**
   - 路径：数据管理 > 基础数据管理 > 品牌管理

2. **添加缺失的品牌**
   - 例如：添加"红米"
   - 品牌名称：`红米`
   - 拼音：`redmi`
   - 保存

3. **刷新页面**
   - 刷新智能匹配页面
   - 重新运行检查脚本

4. **验证修复**
   - 确认品牌已正确加载
   - 测试实际匹配功能
