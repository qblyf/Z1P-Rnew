# 数据迁移计划：从虚拟数据到系统数据

## 目标

将智能匹配系统中的所有硬编码数据迁移到系统数据或配置文件中，提高系统的可维护性和灵活性。

## 当前虚拟数据清单

### 1. 产品类型特征 (`PRODUCT_TYPE_FEATURES`)

**位置**：`utils/smartMatcher.ts` 第 52-95 行

**当前实现**：
```typescript
const PRODUCT_TYPE_FEATURES: Record<ProductType, ProductTypeFeature> = {
  watch: {
    keywords: ['watch', 'band', '手表', '手环'],
    modelPattern: /watch\s*(?:gt|se|d|fit|s|x2|ultra)?\s*\d*(?:\s*pro)?/i,
    specialParams: ['mm', '寸', '屏幕', '柔光版', '标准版'],
    paramPattern: /(\d+mm|\d+寸|柔光版|标准版)/g,
  },
  // ... 其他类型
};
```

**问题**：
- 硬编码的产品类型和特征
- 新增产品类型需要修改代码
- 无法动态调整匹配规则

**迁移方案**：

#### 方案 A：配置文件（推荐）

在 `.kiro/config/` 目录下创建 `product-types.json`：

```json
{
  "productTypes": {
    "watch": {
      "keywords": ["watch", "band", "手表", "手环"],
      "modelPattern": "watch\\s*(?:gt|se|d|fit|s|x2|ultra)?\\s*\\d*(?:\\s*pro)?",
      "specialParams": ["mm", "寸", "屏幕", "柔光版", "标准版"],
      "paramPattern": "(\\d+mm|\\d+寸|柔光版|标准版)"
    }
  }
}
```

**优点**：
- 易于维护和修改
- 不需要重新部署代码
- 可以版本控制

**缺点**：
- 需要在启动时加载配置
- 正则表达式以字符串形式存储

#### 方案 B：数据库表

创建 `product_type_config` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 产品类型（如 'watch'） |
| keywords | json | 关键词数组 |
| model_pattern | string | 型号匹配正则 |
| special_params | json | 特殊参数数组 |
| param_pattern | string | 参数匹配正则 |

**优点**：
- 可以通过管理界面动态配置
- 支持多租户
- 易于查询和统计

**缺点**：
- 需要数据库支持
- 增加系统复杂度

**推荐方案**：方案 A（配置文件）

---

### 2. 版本关键词 (`VERSION_KEYWORDS_MAP`)

**位置**：`utils/smartMatcher.ts` 第 97-103 行

**当前实现**：
```typescript
const VERSION_KEYWORDS_MAP: Record<string, VersionInfo> = {
  'standard': { name: '标准版', keywords: ['标准版', '基础版'], priority: 1 },
  'lite': { name: '活力版', keywords: ['活力版', '轻享版'], priority: 2 },
  // ...
};
```

**迁移方案**：

#### 配置文件：`version-keywords.json`

```json
{
  "versions": [
    {
      "id": "standard",
      "name": "标准版",
      "keywords": ["标准版", "基础版"],
      "priority": 1
    },
    {
      "id": "lite",
      "name": "活力版",
      "keywords": ["活力版", "轻享版"],
      "priority": 2
    }
  ]
}
```

**实现步骤**：
1. 创建配置文件
2. 添加配置加载方法
3. 更新 `extractVersion()` 方法使用配置数据
4. 移除硬编码常量

---

### 3. 型号标准化映射 (`MODEL_NORMALIZATIONS`)

**位置**：`utils/smartMatcher.ts` 第 105-145 行

**当前实现**：
```typescript
const MODEL_NORMALIZATIONS: Record<string, string> = {
  'promini': 'pro mini',
  'promax': 'pro max',
  // ... 100+ 条映射
};
```

**问题**：
- 映射规则过多，难以维护
- 新型号需要手动添加
- 无法动态更新

**迁移方案**：

#### 方案 A：配置文件

```json
{
  "modelNormalizations": {
    "promini": "pro mini",
    "promax": "pro max"
  }
}
```

#### 方案 B：智能算法（推荐）

使用算法自动处理型号标准化，而不是维护映射表：

```typescript
function normalizeModel(model: string): string {
  // 1. 在 pro/max/plus/ultra 等关键词前添加空格
  model = model.replace(/(pro|max|plus|ultra|mini|se|air|lite)/gi, ' $1');
  
  // 2. 在数字和字母之间添加空格
  model = model.replace(/(\d)([a-z])/gi, '$1 $2');
  
  // 3. 清理多余空格
  model = model.replace(/\s+/g, ' ').trim();
  
  return model.toLowerCase();
}
```

**推荐方案**：方案 B（智能算法）+ 方案 A（特殊情况配置）

---

### 4. 颜色变体映射 (`COLOR_VARIANTS`)

**位置**：`utils/smartMatcher.ts` 第 160-175 行

**当前实现**：
```typescript
const COLOR_VARIANTS: Record<string, string[]> = {
  '雾凇蓝': ['雾松蓝'],
  '雾松蓝': ['雾凇蓝'],
  // ...
};
```

**问题**：
- 颜色变体需要手动维护
- 双向映射导致冗余
- 无法动态添加新颜色变体

**迁移方案**：

#### 方案 A：配置文件

```json
{
  "colorVariants": [
    {
      "group": "blue_mist",
      "colors": ["雾凇蓝", "雾松蓝"]
    },
    {
      "group": "white_space",
      "colors": ["空白格", "空格白"]
    }
  ]
}
```

#### 方案 B：数据库表（推荐）

创建 `color_variant_groups` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| group_name | string | 颜色组名称 |
| colors | json | 颜色数组 |
| created_at | timestamp | 创建时间 |

**管理界面**：
- 在基础数据管理中添加"颜色变体管理"
- 支持添加、编辑、删除颜色组
- 支持批量导入

**推荐方案**：方案 B（数据库表）

---

### 5. 礼盒版关键词 (`GIFT_BOX_KEYWORDS`)

**位置**：`utils/smartMatcher.ts` 第 147 行

**当前实现**：
```typescript
const GIFT_BOX_KEYWORDS = ['礼盒', '套装', '系列', '礼品', '礼包'];
```

**迁移方案**：

#### 配置文件：`filter-keywords.json`

```json
{
  "giftBox": ["礼盒", "套装", "系列", "礼品", "礼包"],
  "demo": ["演示机", "样机", "展示机", "体验机"],
  "accessory": ["优诺严选", "品牌", "赠品", "严选", "檀木"]
}
```

---

### 6. 版本关键词 (`VERSION_KEYWORDS`)

**位置**：`utils/smartMatcher.ts` 第 149 行

**当前实现**：
```typescript
const VERSION_KEYWORDS = ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版'];
```

**迁移方案**：合并到 `version-keywords.json`

---

## 实施计划

### 阶段 1：配置文件迁移（1-2 天）

**任务**：
1. ✅ 创建 `.kiro/config/` 目录
2. ✅ 创建配置文件：
   - `product-types.json`
   - `version-keywords.json`
   - `filter-keywords.json`
3. ✅ 实现配置加载器
4. ✅ 更新 `SimpleMatcher` 类使用配置数据
5. ✅ 测试验证

**优先级**：高

### 阶段 2：型号标准化算法优化（1 天）

**任务**：
1. ✅ 实现智能型号标准化算法
2. ✅ 保留特殊情况配置
3. ✅ 测试验证
4. ✅ 移除大部分硬编码映射

**优先级**：中

### 阶段 3：颜色变体管理（2-3 天）

**任务**：
1. ⚠️ 设计数据库表结构
2. ⚠️ 实现 API 接口
3. ⚠️ 创建管理界面
4. ⚠️ 迁移现有数据
5. ⚠️ 更新匹配逻辑
6. ⚠️ 测试验证

**优先级**：中

### 阶段 4：产品类型配置化（可选）

**任务**：
1. ⚠️ 评估是否需要动态配置
2. ⚠️ 如果需要，实现配置加载
3. ⚠️ 测试验证

**优先级**：低

## 配置文件结构

```
.kiro/
├── config/
│   ├── product-types.json      # 产品类型配置
│   ├── version-keywords.json   # 版本关键词配置
│   ├── filter-keywords.json    # 过滤关键词配置
│   └── model-normalizations.json # 特殊型号映射
└── steering/
    └── smart-match.md          # 匹配规则说明
```

## 配置加载器实现

```typescript
// config-loader.ts
export class ConfigLoader {
  private static instance: ConfigLoader;
  private configs: Map<string, any> = new Map();
  
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }
  
  async loadConfig(name: string): Promise<any> {
    if (this.configs.has(name)) {
      return this.configs.get(name);
    }
    
    try {
      const response = await fetch(`/.kiro/config/${name}.json`);
      const config = await response.json();
      this.configs.set(name, config);
      return config;
    } catch (error) {
      console.error(`Failed to load config: ${name}`, error);
      return null;
    }
  }
  
  getConfig(name: string): any {
    return this.configs.get(name);
  }
}
```

## 使用示例

```typescript
// 在 SimpleMatcher 初始化时加载配置
class SimpleMatcher {
  private configLoader = ConfigLoader.getInstance();
  
  async initialize() {
    // 加载配置
    await this.configLoader.loadConfig('version-keywords');
    await this.configLoader.loadConfig('filter-keywords');
    
    // 使用配置
    const versionConfig = this.configLoader.getConfig('version-keywords');
    this.versionKeywords = versionConfig.versions;
  }
}
```

## 测试计划

### 配置加载测试

```typescript
test('should load version keywords config', async () => {
  const config = await configLoader.loadConfig('version-keywords');
  expect(config).toBeDefined();
  expect(config.versions).toBeInstanceOf(Array);
});
```

### 匹配功能测试

```typescript
test('should match using config data', async () => {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  const result = matcher.extractVersion('红米15R 标准版');
  expect(result).toBeDefined();
  expect(result.name).toBe('标准版');
});
```

## 回滚计划

如果迁移出现问题，可以快速回滚：

1. 保留原有硬编码数据作为备份
2. 添加配置加载失败时的降级逻辑
3. 使用特性开关控制新旧实现

```typescript
const USE_CONFIG = process.env.USE_CONFIG === 'true';

if (USE_CONFIG) {
  // 使用配置数据
  versionKeywords = await loadConfig('version-keywords');
} else {
  // 使用硬编码数据（备份）
  versionKeywords = VERSION_KEYWORDS_MAP;
}
```

## 监控和日志

添加配置加载和使用的监控：

```typescript
console.log('Config loaded:', {
  name: 'version-keywords',
  itemCount: config.versions.length,
  loadTime: Date.now() - startTime
});
```

## 文档更新

需要更新的文档：

1. ✅ `smart-match-rules.md` - 匹配规则文档
2. ⚠️ `config-guide.md` - 配置文件指南（新建）
3. ⚠️ `admin-guide.md` - 管理员指南（更新）
4. ⚠️ `api-docs.md` - API 文档（更新）
