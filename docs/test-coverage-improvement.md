# 测试覆盖率提升指南

## 📅 创建日期
2026-01-24

## 🎯 目标
将测试覆盖率从当前的 ~60% 提升到 80%+

---

## 📊 当前测试状态

### 已有测试
```
Test Suites: 8 passed, 8 total
Tests:       212 passed, 212 total
```

**测试文件：**
1. ✅ `modelNormalization.property.test.ts` - 型号标准化测试
2. ✅ `spuPriority.test.ts` - SPU 优先级测试
3. ✅ `task-2.3-integration.test.ts` - 集成测试
4. ✅ `extractModel.test.ts` - 型号提取测试
5. ✅ `colorVariant.test.ts` - 颜色变体测试
6. ✅ `versionFilter.test.ts` - 版本过滤测试
7. ✅ `colorExtraction.test.ts` - 颜色提取测试
8. ✅ `spuPriorityIntegration.test.ts` - SPU 优先级集成测试

---

## 🔍 测试覆盖率分析

### 已覆盖的功能
- ✅ 型号提取（extractModel）
- ✅ 颜色提取（extractColorAdvanced）
- ✅ 颜色匹配（isColorMatch）
- ✅ SPU 优先级（getSPUPriority）
- ✅ 版本过滤
- ✅ 型号标准化

### 未覆盖或覆盖不足的功能
- ❌ 品牌提取（extractBrand）
- ❌ 容量提取（extractCapacity）
- ❌ 版本提取（extractVersion）
- ❌ SPU 匹配（findBestSPUMatch）
- ❌ SKU 匹配（findBestSKU）
- ❌ 配置加载（ConfigLoader）
- ❌ ColorMatcher 类
- ❌ 输入预处理（preprocessInputAdvanced）
- ❌ 演示机清理（cleanDemoMarkers）

---

## 📝 需要添加的测试

### 1. 品牌提取测试

**文件：** `utils/smartMatcher.brand.test.ts`

```typescript
import { SimpleMatcher } from './smartMatcher';

describe('SimpleMatcher - 品牌提取', () => {
  let matcher: SimpleMatcher;

  beforeEach(async () => {
    matcher = new SimpleMatcher();
    await matcher.initialize();
    
    // 设置测试品牌列表
    matcher.setBrandList([
      { name: '华为', spell: 'huawei' },
      { name: '苹果', spell: 'apple' },
      { name: '小米', spell: 'xiaomi' },
      { name: 'Redmi', spell: 'redmi' },
      { name: '红米', spell: 'redmi' },
    ]);
  });

  test('应该提取中文品牌名', () => {
    expect(matcher.extractBrand('华为 Mate 60 Pro')).toBe('华为');
    expect(matcher.extractBrand('苹果 iPhone 15')).toBe('苹果');
    expect(matcher.extractBrand('小米14 Ultra')).toBe('小米');
  });

  test('应该提取英文品牌名', () => {
    expect(matcher.extractBrand('Huawei Mate 60 Pro')).toBe('华为');
    expect(matcher.extractBrand('Apple iPhone 15')).toBe('苹果');
    expect(matcher.extractBrand('Xiaomi 14 Ultra')).toBe('小米');
  });

  test('应该优先匹配更长的品牌名', () => {
    matcher.setBrandList([
      { name: '小米', spell: 'xiaomi' },
      { name: '小米科技', spell: 'xiaomi' },
    ]);
    expect(matcher.extractBrand('小米科技14 Ultra')).toBe('小米科技');
  });

  test('品牌库未加载时应该返回 null', () => {
    const emptyMatcher = new SimpleMatcher();
    expect(emptyMatcher.extractBrand('华为 Mate 60 Pro')).toBeNull();
  });
});
```

---

### 2. 容量提取测试

**文件：** `utils/smartMatcher.capacity.test.ts`

```typescript
describe('SimpleMatcher - 容量提取', () => {
  const matcher = new SimpleMatcher();

  test('应该提取括号内的容量', () => {
    expect(matcher.extractCapacity('华为 Mate 60 Pro (12+256)')).toBe('12+256');
    expect(matcher.extractCapacity('iPhone 15 (8GB+128GB)')).toBe('8+128');
  });

  test('应该提取不在括号内的容量', () => {
    expect(matcher.extractCapacity('华为 Mate 60 Pro 12+256')).toBe('12+256');
    expect(matcher.extractCapacity('iPhone 15 8GB+128GB')).toBe('8+128');
  });

  test('应该提取单个容量', () => {
    expect(matcher.extractCapacity('iPhone 15 256GB')).toBe('256');
    expect(matcher.extractCapacity('iPad 128GB')).toBe('128');
  });

  test('没有容量时应该返回 null', () => {
    expect(matcher.extractCapacity('华为 Mate 60 Pro')).toBeNull();
    expect(matcher.extractCapacity('iPhone 15')).toBeNull();
  });
});
```

---

### 3. 版本提取测试

**文件：** `utils/smartMatcher.version.test.ts`

```typescript
describe('SimpleMatcher - 版本提取', () => {
  let matcher: SimpleMatcher;

  beforeEach(async () => {
    matcher = new SimpleMatcher();
    await matcher.initialize();
  });

  test('应该提取标准版', () => {
    const version = matcher.extractVersion('华为 Watch GT 标准版');
    expect(version?.name).toBe('标准版');
  });

  test('应该提取活力版', () => {
    const version = matcher.extractVersion('华为 Watch GT 活力版');
    expect(version?.name).toBe('活力版');
  });

  test('应该提取 Pro 版', () => {
    const version = matcher.extractVersion('华为 Watch GT Pro');
    expect(version?.name).toBe('Pro 版');
  });

  test('没有版本时应该返回 null', () => {
    expect(matcher.extractVersion('华为 Mate 60')).toBeNull();
  });
});
```

---

### 4. SPU 匹配测试

**文件：** `utils/smartMatcher.spu.test.ts`

```typescript
describe('SimpleMatcher - SPU 匹配', () => {
  let matcher: SimpleMatcher;

  beforeEach(async () => {
    matcher = new SimpleMatcher();
    await matcher.initialize();
    matcher.setBrandList([
      { name: '华为', spell: 'huawei' },
      { name: 'vivo', spell: 'vivo' },
    ]);
  });

  test('应该精确匹配 SPU', () => {
    const spuList = [
      { id: 1, name: '华为 Mate 60 Pro 全网通5G', brand: '华为' },
      { id: 2, name: '华为 Mate 60 全网通5G', brand: '华为' },
    ];

    const { spu } = matcher.findBestSPUMatch('华为 Mate 60 Pro 12+256 黑色', spuList);
    expect(spu?.id).toBe(1);
  });

  test('应该过滤礼盒版', () => {
    const spuList = [
      { id: 1, name: '华为 Mate 60 Pro 全网通5G', brand: '华为' },
      { id: 2, name: '华为 Mate 60 Pro 礼盒版', brand: '华为' },
    ];

    const { spu } = matcher.findBestSPUMatch('华为 Mate 60 Pro 12+256', spuList);
    expect(spu?.id).toBe(1);
  });

  test('应该优先匹配标准版', () => {
    const spuList = [
      { id: 1, name: 'vivo Watch GT 蓝牙版', brand: 'vivo' },
      { id: 2, name: 'vivo Watch GT', brand: 'vivo' },
    ];

    const { spu } = matcher.findBestSPUMatch('vivo Watch GT 46mm', spuList);
    expect(spu?.id).toBe(2); // 标准版优先级更高
  });

  test('阈值以下应该返回 null', () => {
    const spuList = [
      { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
    ];

    const { spu } = matcher.findBestSPUMatch('小米14 Ultra', spuList);
    expect(spu).toBeNull();
  });
});
```

---

### 5. SKU 匹配测试

**文件：** `utils/smartMatcher.sku.test.ts`

```typescript
describe('SimpleMatcher - SKU 匹配', () => {
  let matcher: SimpleMatcher;

  beforeEach(async () => {
    matcher = new SimpleMatcher();
    await matcher.initialize();
  });

  test('应该匹配容量和颜色', () => {
    const skuList = [
      { id: 1, name: '华为 Mate 60 Pro 12+256 黑色', memory: '12+256', color: '黑色', gtins: [] },
      { id: 2, name: '华为 Mate 60 Pro 12+512 黑色', memory: '12+512', color: '黑色', gtins: [] },
    ];

    const { sku } = matcher.findBestSKU('华为 Mate 60 Pro 12+256 黑色', skuList);
    expect(sku?.id).toBe(1);
  });

  test('应该支持自定义权重', () => {
    const skuList = [
      { id: 1, name: 'SKU 1', memory: '12+256', color: '黑色', gtins: [] },
      { id: 2, name: 'SKU 2', memory: '12+512', color: '白色', gtins: [] },
    ];

    // 容量优先
    const { sku: sku1 } = matcher.findBestSKU('12+256 白色', skuList, {
      capacityWeight: 0.7,
      colorWeight: 0.3,
    });
    expect(sku1?.id).toBe(1);

    // 颜色优先
    const { sku: sku2 } = matcher.findBestSKU('12+512 黑色', skuList, {
      capacityWeight: 0.3,
      colorWeight: 0.7,
    });
    expect(sku2?.id).toBe(1);
  });
});
```

---

### 6. ColorMatcher 测试

**文件：** `utils/colorMatcher.test.ts`

```typescript
describe('ColorMatcher', () => {
  // 测试颜色提取
  // 测试颜色匹配
  // 测试颜色变体
  // 测试基础颜色匹配
});
```

---

### 7. ConfigLoader 测试

**文件：** `utils/config-loader.test.ts`

```typescript
describe('ConfigLoader', () => {
  test('应该加载配置文件', async () => {
    const config = await ConfigLoader.load('version-keywords');
    expect(config).toHaveProperty('versions');
  });

  test('加载失败时应该使用默认值', async () => {
    const config = await ConfigLoader.load('non-existent');
    expect(config).toBeDefined();
  });

  test('应该缓存配置', async () => {
    const config1 = await ConfigLoader.load('version-keywords');
    const config2 = await ConfigLoader.load('version-keywords');
    expect(config1).toBe(config2); // 同一个对象引用
  });
});
```

---

### 8. 组件测试

**文件：** `components/SmartMatch/InputPanel.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { InputPanel } from './InputPanel';

describe('InputPanel', () => {
  test('应该渲染输入框', () => {
    render(<InputPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText(/请输入商品名称/)).toBeInTheDocument();
  });

  test('应该调用 onInputChange', () => {
    const onInputChange = jest.fn();
    render(<InputPanel {...defaultProps} onInputChange={onInputChange} />);
    
    const textarea = screen.getByPlaceholderText(/请输入商品名称/);
    fireEvent.change(textarea, { target: { value: '华为 Mate 60 Pro' } });
    
    expect(onInputChange).toHaveBeenCalledWith('华为 Mate 60 Pro');
  });

  test('loading 时应该禁用按钮', () => {
    render(<InputPanel {...defaultProps} loading={true} />);
    expect(screen.getByText('匹配中...')).toBeDisabled();
  });
});
```

---

## 📊 测试覆盖率目标

### 当前覆盖率（估算）
- 语句覆盖率：~60%
- 分支覆盖率：~55%
- 函数覆盖率：~65%
- 行覆盖率：~60%

### 目标覆盖率
- 语句覆盖率：80%+
- 分支覆盖率：75%+
- 函数覆盖率：85%+
- 行覆盖率：80%+

---

## 🎯 实施计划

### 第一阶段：核心功能测试（1-2 天）
1. ✅ 添加品牌提取测试
2. ✅ 添加容量提取测试
3. ✅ 添加版本提取测试

### 第二阶段：匹配逻辑测试（2-3 天）
4. ✅ 添加 SPU 匹配测试
5. ✅ 添加 SKU 匹配测试
6. ✅ 添加 ColorMatcher 测试

### 第三阶段：工具类和组件测试（2-3 天）
7. ✅ 添加 ConfigLoader 测试
8. ✅ 添加组件测试
9. ✅ 添加集成测试

---

## 💡 测试最佳实践

### 1. 使用描述性的测试名称
```typescript
// ❌ 不好
test('test1', () => { ... });

// ✅ 好
test('应该提取括号内的容量', () => { ... });
```

### 2. 遵循 AAA 模式
```typescript
test('应该匹配 SPU', () => {
  // Arrange（准备）
  const matcher = new SimpleMatcher();
  const spuList = [...];

  // Act（执行）
  const result = matcher.findBestSPUMatch(input, spuList);

  // Assert（断言）
  expect(result.spu?.id).toBe(1);
});
```

### 3. 测试边界情况
```typescript
test('空输入应该返回 null', () => {
  expect(matcher.extractBrand('')).toBeNull();
});

test('null 输入应该返回 null', () => {
  expect(matcher.extractBrand(null)).toBeNull();
});
```

### 4. 使用测试数据工厂
```typescript
function createTestSPU(overrides = {}) {
  return {
    id: 1,
    name: '华为 Mate 60 Pro',
    brand: '华为',
    ...overrides,
  };
}
```

---

## 🔧 运行测试

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
npm test -- smartMatcher.brand.test.ts
```

### 生成覆盖率报告
```bash
npm test -- --coverage
```

### 监听模式
```bash
npm test -- --watch
```

---

## 📈 预期成果

完成所有测试后：
- ✅ 测试覆盖率从 60% 提升到 80%+
- ✅ 新增 ~100 个测试用例
- ✅ 更高的代码质量和可靠性
- ✅ 更容易发现和修复 Bug
- ✅ 更安全的重构

---

## 🎉 总结

通过系统地添加测试，我们可以：
1. 提高代码质量
2. 减少 Bug
3. 更安全地重构
4. 提升开发信心

**建议按阶段逐步实施，每个阶段完成后运行覆盖率报告。**
