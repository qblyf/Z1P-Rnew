# 品牌库调试指南

## 在浏览器控制台中检查品牌库

### 步骤1：打开智能匹配页面

1. 登录系统
2. 进入**智能匹配**页面
3. 按 `F12` 打开浏览器控制台

### 步骤2：检查品牌库是否加载

在控制台中查看日志，应该看到：

```
已加载品牌数据: X 个品牌
```

如果看到这条日志，说明品牌库已成功加载。

### 步骤3：查看品牌列表

在控制台中运行以下代码：

```javascript
// 方法1：从 React DevTools 获取
// 1. 安装 React DevTools 扩展
// 2. 在 Components 标签中找到 SmartMatchComponent
// 3. 查看 brandList state

// 方法2：直接调用 API
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';

const brands = await getBrandBaseList();
console.log('品牌总数:', brands.length);
console.log('品牌列表:', brands);

// 显示所有品牌名称
brands.forEach((brand, index) => {
  console.log(`${index + 1}. ${brand.name} (spell: ${brand.spell || '无'})`);
});
```

### 步骤4：检查关键品牌

```javascript
// 检查关键品牌是否存在
const keyBrands = ['红米', 'Redmi', '小米', 'Xiaomi', '一加', 'OnePlus', 'WIWU'];

keyBrands.forEach(brandName => {
  const found = brands.find(b => b.name === brandName);
  if (found) {
    console.log(`✓ ${brandName} (spell: ${found.spell || '无'})`);
  } else {
    console.log(`✗ ${brandName} - 未找到`);
  }
});
```

### 步骤5：测试品牌识别

```javascript
// 创建 SimpleMatcher 实例
const { SimpleMatcher } = await import('./utils/smartMatcher');
const matcher = new SimpleMatcher();

// 设置品牌库
matcher.setBrandList(brands);

// 测试品牌提取
const testCases = [
  '红米15R 4+128星岩黑',
  'Redmi 15R 全网通5G版',
  '小米14 Ultra 16GB+512GB',
  '一加 15 全网通5G版',
  'WIWU 青春手提包电脑包15.6寸'
];

testCases.forEach(input => {
  const brand = matcher.extractBrand(input);
  const model = matcher.extractModel(input);
  console.log(`输入: ${input}`);
  console.log(`  品牌: ${brand || '未识别'}`);
  console.log(`  型号: ${model || '未识别'}`);
  console.log('');
});
```

### 步骤6：检查品牌数据结构

```javascript
// 查看第一个品牌的完整数据结构
if (brands.length > 0) {
  console.log('品牌数据结构示例:');
  console.log(JSON.stringify(brands[0], null, 2));
}

// 检查是否有缺失的字段
const missingSpell = brands.filter(b => !b.spell);
if (missingSpell.length > 0) {
  console.warn(`警告: ${missingSpell.length} 个品牌缺少品牌英文字段:`);
  missingSpell.forEach(b => console.log(`  - ${b.name}`));
}
```

## 常见问题排查

### 问题1：品牌库未加载

**症状**：
- 控制台没有"已加载品牌数据"日志
- 或显示"加载品牌数据失败"错误

**排查步骤**：

1. 检查网络请求：
   ```javascript
   // 在 Network 标签中查找品牌相关的 API 请求
   // 检查请求是否成功（状态码 200）
   ```

2. 检查 API 响应：
   ```javascript
   // 查看 API 返回的数据格式
   // 确保返回的是数组，且包含 name 和 spell 字段
   ```

3. 检查错误信息：
   ```javascript
   // 在控制台中查看详细的错误信息
   ```

### 问题2：品牌识别失败

**症状**：
- 输入"红米15R"，品牌识别为 null

**排查步骤**：

1. 检查品牌是否在品牌库中：
   ```javascript
   const found = brands.find(b => b.name === '红米');
   console.log('红米品牌:', found);
   ```

2. 检查品牌名称是否完全匹配：
   ```javascript
   // 注意大小写和空格
   brands.filter(b => b.name.includes('红米')).forEach(b => {
     console.log(`品牌名称: "${b.name}" (长度: ${b.name.length})`);
   });
   ```

3. 测试品牌提取逻辑：
   ```javascript
   const matcher = new SimpleMatcher();
   matcher.setBrandList(brands);
   
   // 测试不同的输入格式
   console.log('红米15R:', matcher.extractBrand('红米15R'));
   console.log('Redmi 15R:', matcher.extractBrand('Redmi 15R'));
   console.log('redmi15r:', matcher.extractBrand('redmi15r'));
   ```

### 问题3：品牌库数据不完整

**症状**：
- 部分品牌可以识别，部分不能

**排查步骤**：

1. 统计品牌数量：
   ```javascript
   console.log('品牌总数:', brands.length);
   
   // 按品牌英文分组
   const spellGroups = {};
   brands.forEach(b => {
     if (b.spell) {
       if (!spellGroups[b.spell]) {
         spellGroups[b.spell] = [];
       }
       spellGroups[b.spell].push(b.name);
     }
   });
   
   console.log('品牌英文分组:');
   Object.entries(spellGroups).forEach(([spell, names]) => {
     console.log(`  ${spell}: ${names.join(', ')}`);
   });
   ```

2. 检查缺失的品牌：
   ```javascript
   const expectedBrands = [
     '红米', 'Redmi',
     '小米', 'Xiaomi',
     '一加', 'OnePlus',
     'HUAWEI', '华为',
     'HONOR', '荣耀',
     'OPPO', 'vivo',
     'Apple', '苹果',
     '三星', 'Samsung',
     '真我', 'realme',
     'iQOO', 'WIWU'
   ];
   
   const missing = expectedBrands.filter(name => 
     !brands.find(b => b.name === name)
   );
   
   if (missing.length > 0) {
     console.warn('缺失的品牌:', missing);
   } else {
     console.log('✓ 所有关键品牌都已配置');
   }
   ```

## 数据验证脚本

完整的验证脚本（复制到控制台运行）：

```javascript
(async function validateBrandLibrary() {
  console.log('=== 品牌库验证 ===\n');
  
  try {
    // 1. 加载品牌库
    const { getBrandBaseList } = await import('@zsqk/z1-sdk/es/z1p/brand');
    const brands = await getBrandBaseList();
    
    console.log(`✓ 成功加载 ${brands.length} 个品牌\n`);
    
    // 2. 检查关键品牌
    const keyBrands = [
      '红米', 'Redmi',
      '小米', 'Xiaomi',
      '一加', 'OnePlus',
      'WIWU'
    ];
    
    console.log('=== 关键品牌检查 ===');
    let allFound = true;
    keyBrands.forEach(name => {
      const found = brands.find(b => b.name === name);
      if (found) {
        console.log(`✓ ${name}`);
      } else {
        console.log(`✗ ${name} - 未找到`);
        allFound = false;
      }
    });
    
    if (allFound) {
      console.log('\n✓ 所有关键品牌都已配置');
    } else {
      console.warn('\n⚠️ 部分关键品牌缺失，请在基础数据管理中添加');
    }
    
    // 3. 测试品牌识别
    console.log('\n=== 品牌识别测试 ===');
    const { SimpleMatcher } = await import('./utils/smartMatcher');
    const matcher = new SimpleMatcher();
    matcher.setBrandList(brands);
    
    const testCases = [
      { input: '红米15R 4+128星岩黑', expectedBrand: '红米' },
      { input: 'Redmi 15R 全网通5G版', expectedBrand: 'Redmi' },
      { input: 'WIWU 青春手提包电脑包15.6寸', expectedBrand: 'WIWU' }
    ];
    
    testCases.forEach(({ input, expectedBrand }) => {
      const brand = matcher.extractBrand(input);
      const match = brand === expectedBrand;
      console.log(`${match ? '✓' : '✗'} ${input}`);
      console.log(`  识别: ${brand || '未识别'} (期望: ${expectedBrand})`);
    });
    
    console.log('\n=== 验证完成 ===');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
})();
```

## 修复建议

如果发现品牌库不完整：

1. **进入基础数据管理**：
   - 路径：数据管理 > 基础数据管理 > 品牌管理

2. **添加缺失的品牌**：
   - 对于每个品牌，添加中英文两个条目
   - 例如：添加"红米"（spell: redmi）和"Redmi"（spell: redmi）

3. **刷新页面**：
   - 添加完成后，刷新智能匹配页面
   - 重新运行验证脚本

4. **验证修复**：
   - 使用上面的验证脚本确认品牌已正确加载
   - 测试实际的匹配功能
