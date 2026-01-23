# 品牌提取调试指南

## 问题：为什么"红米"没有被识别？

### 可能的原因

1. **品牌库中没有"红米"**
2. **品牌库加载失败**
3. **品牌名称格式问题**
4. **代码逻辑问题**

---

## 调试步骤

### 步骤 1: 检查品牌库是否加载

打开智能匹配页面，打开浏览器控制台（F12），查看日志：

```
已加载品牌数据: X 个品牌
```

**如果看到 0 个品牌**：
- 品牌库加载失败
- 检查网络请求
- 检查 API 是否正常

---

### 步骤 2: 检查品牌库中是否有"红米"

在浏览器控制台中运行：

```javascript
// 查看所有品牌
console.table(brandList);

// 搜索"红米"
const hongmi = brandList.find(b => b.name === '红米');
console.log('红米品牌:', hongmi);

// 搜索"Redmi"
const redmi = brandList.find(b => b.name === 'Redmi');
console.log('Redmi品牌:', redmi);

// 搜索包含"红"的品牌
const hongBrands = brandList.filter(b => b.name.includes('红'));
console.log('包含"红"的品牌:', hongBrands);
```

**预期结果**：
```javascript
{
  name: '红米',
  spell: 'redmi',
  color: '#FF6B6B',
  order: 10
}
```

**如果找不到**：
- 进入 **数据管理 > 基础数据管理 > 品牌管理**
- 添加品牌：
  - 品牌名称：`红米`
  - 品牌英文：`redmi`
  - 颜色：任意
- 刷新智能匹配页面

---

### 步骤 3: 测试品牌提取逻辑

在浏览器控制台中运行：

```javascript
// 获取 matcher 实例（从页面中）
// 注意：需要在智能匹配页面的 React 组件中访问

// 方法 1: 通过全局变量（如果有）
const matcher = window.matcher;

// 方法 2: 通过 React DevTools
// 1. 安装 React DevTools
// 2. 选择 SmartMatchComponent
// 3. 在 Console 中访问 $r.matcher

// 测试品牌提取
const testInput = '红米15R 4+128星岩黑';
const brand = matcher.extractBrand(testInput);
console.log('提取的品牌:', brand);

// 测试小写
const brand2 = matcher.extractBrand('红米15r 4+128星岩黑');
console.log('提取的品牌（小写）:', brand2);

// 测试英文
const brand3 = matcher.extractBrand('Redmi 15R 4+128星岩黑');
console.log('提取的品牌（英文）:', brand3);
```

**预期结果**：
```
提取的品牌: 红米
提取的品牌（小写）: 红米
提取的品牌（英文）: 红米
```

---

### 步骤 4: 检查品牌匹配逻辑

```javascript
// 测试品牌匹配
const isSame = matcher.isBrandMatch('红米', 'Redmi');
console.log('红米 和 Redmi 是否匹配:', isSame);  // 应该是 true

const isSame2 = matcher.isBrandMatch('红米', '红米');
console.log('红米 和 红米 是否匹配:', isSame2);  // 应该是 true
```

---

### 步骤 5: 完整的匹配测试

```javascript
// 完整测试
const testInput = '红米15R 4+128星岩黑';

console.log('=== 开始测试 ===');
console.log('输入:', testInput);

// 1. 品牌提取
const brand = matcher.extractBrand(testInput);
console.log('1. 提取的品牌:', brand);

// 2. 型号提取
const model = matcher.extractModel(testInput);
console.log('2. 提取的型号:', model);

// 3. 容量提取
const capacity = matcher.extractCapacity(testInput);
console.log('3. 提取的容量:', capacity);

// 4. 颜色提取
const color = matcher.extractColorAdvanced(testInput);
console.log('4. 提取的颜色:', color);

// 5. SPU 匹配
const spuResult = matcher.findBestSPUMatch(testInput, spuList, 0.5);
console.log('5. SPU 匹配结果:', spuResult);

console.log('=== 测试完成 ===');
```

---

## 常见问题和解决方案

### 问题 1: 品牌库中没有"红米"

**症状**：
```javascript
const hongmi = brandList.find(b => b.name === '红米');
console.log(hongmi);  // undefined
```

**解决方案**：
1. 进入 **数据管理 > 基础数据管理 > 品牌管理**
2. 点击"添加品牌"
3. 填写信息：
   - 品牌名称：`红米`
   - 品牌英文：`redmi`
   - 颜色：`#FF6B6B`（或任意颜色）
4. 保存
5. 刷新智能匹配页面

### 问题 2: 品牌名称大小写不匹配

**症状**：
```javascript
// 品牌库中是 "红米"
// 但代码中查找 "红米" 时找不到
```

**原因**：
- 品牌库中的名称可能有空格或特殊字符
- 例如：`"红米 "` (末尾有空格)

**解决方案**：
1. 检查品牌库中的品牌名称
2. 确保没有多余的空格
3. 如果有，编辑品牌，去掉空格

### 问题 3: 品牌库加载失败

**症状**：
```
已加载品牌数据: 0 个品牌
```

**解决方案**：
1. 检查网络请求（F12 > Network）
2. 查找 `getBrandBaseList` 请求
3. 检查响应状态码
4. 如果失败，检查 API 服务是否正常

### 问题 4: 品牌提取逻辑问题

**症状**：
```javascript
const brand = matcher.extractBrand('红米15R');
console.log(brand);  // null
```

**可能原因**：
1. `brandList` 未设置
2. 品牌名称不匹配

**解决方案**：
```javascript
// 检查 brandList 是否设置
console.log('brandList 长度:', matcher.brandList?.length || 0);

// 如果为 0，手动设置
matcher.setBrandList(brandList);

// 再次测试
const brand = matcher.extractBrand('红米15R');
console.log(brand);  // 应该输出: 红米
```

---

## 快速检查脚本

复制以下代码到浏览器控制台，一键检查所有问题：

```javascript
(function() {
  console.log('=== 品牌提取诊断工具 ===\n');
  
  // 1. 检查品牌库
  console.log('1. 品牌库检查:');
  console.log(`   总品牌数: ${brandList?.length || 0}`);
  
  if (!brandList || brandList.length === 0) {
    console.error('   ❌ 品牌库未加载或为空');
    return;
  }
  
  // 2. 检查"红米"品牌
  console.log('\n2. "红米"品牌检查:');
  const hongmi = brandList.find(b => b.name === '红米');
  if (hongmi) {
    console.log('   ✓ 找到"红米"品牌:', hongmi);
  } else {
    console.error('   ❌ 未找到"红米"品牌');
    console.log('   提示: 请在"数据管理 > 基础数据管理 > 品牌管理"中添加');
  }
  
  // 3. 检查"Redmi"品牌
  console.log('\n3. "Redmi"品牌检查:');
  const redmi = brandList.find(b => b.name === 'Redmi');
  if (redmi) {
    console.log('   ✓ 找到"Redmi"品牌:', redmi);
  } else {
    console.warn('   ⚠️ 未找到"Redmi"品牌');
    console.log('   提示: 建议添加英文品牌名');
  }
  
  // 4. 检查品牌英文字段
  console.log('\n4. 品牌英文字段检查:');
  if (hongmi && hongmi.spell) {
    console.log(`   ✓ "红米"的品牌英文: ${hongmi.spell}`);
  } else if (hongmi) {
    console.warn('   ⚠️ "红米"缺少品牌英文字段');
  }
  
  if (redmi && redmi.spell) {
    console.log(`   ✓ "Redmi"的品牌英文: ${redmi.spell}`);
  } else if (redmi) {
    console.warn('   ⚠️ "Redmi"缺少品牌英文字段');
  }
  
  // 5. 测试品牌提取（如果 matcher 可用）
  if (typeof matcher !== 'undefined') {
    console.log('\n5. 品牌提取测试:');
    
    const tests = [
      '红米15R 4+128星岩黑',
      'Redmi 15R 4+128星岩黑',
      '红米 15R 4+128星岩黑'
    ];
    
    tests.forEach(test => {
      const brand = matcher.extractBrand(test);
      if (brand) {
        console.log(`   ✓ "${test}" → 品牌: ${brand}`);
      } else {
        console.error(`   ❌ "${test}" → 品牌: null`);
      }
    });
  } else {
    console.warn('\n5. ⚠️ matcher 实例不可用，跳过品牌提取测试');
  }
  
  console.log('\n=== 诊断完成 ===');
})();
```

---

## 预期的正确配置

### 品牌库配置

| 品牌名称 | 品牌英文 | 说明 |
|---------|---------|------|
| 红米 | redmi | 中文品牌名 |
| Redmi | redmi | 英文品牌名 |
| 小米 | xiaomi | 中文品牌名 |
| Xiaomi | xiaomi | 英文品牌名 |
| 一加 | oneplus | 中文品牌名 |
| OnePlus | oneplus | 英文品牌名 |

### 品牌提取预期结果

| 输入 | 提取的品牌 |
|------|-----------|
| 红米15R 4+128星岩黑 | 红米 |
| Redmi 15R 4+128星岩黑 | 红米 |
| 红米 15R 4+128星岩黑 | 红米 |
| redmi15r 4+128星岩黑 | 红米 |

---

## 下一步

如果按照以上步骤检查后仍然无法识别"红米"品牌，请：

1. 截图品牌库配置
2. 截图浏览器控制台日志
3. 提供完整的输入字符串
4. 联系技术支持

---

## 相关文档

- [品牌库配置指南](./brand-library-requirements.md)
- [品牌匹配问题排查](./troubleshooting-brand-matching.md)
- [智能匹配规则](./smart-match-rules.md)
