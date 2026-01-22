# 智能匹配逻辑重构说明

## 重构目标

将表格匹配和在线匹配的逻辑统一，使用同一套更准确的匹配算法。

## 主要变更

### 1. 创建统一的匹配工具类

**文件**: `utils/smartMatcher.ts`

提取了完整的智能匹配逻辑到独立的工具类 `SimpleMatcher`，包括：

- **类型定义**: SPUData, SKUData, MatchResult, ProductType, VersionInfo
- **配置常量**: 产品类型特征、版本关键词、型号标准化映射、颜色变体等
- **核心匹配方法**:
  - `preprocessInputAdvanced()` - 输入预处理
  - `cleanDemoMarkers()` - 清理演示机标记
  - `extractBrand()` - 提取品牌
  - `extractModel()` - 提取型号（多层次匹配）
  - `extractCapacity()` - 提取容量
  - `extractColorAdvanced()` - 改进的颜色提取
  - `extractVersion()` - 提取版本信息
  - `extractSPUPart()` - 提取SPU部分
  - `findBestSPUMatch()` - SPU匹配（两阶段：全字匹配 + 分词匹配）
  - `findBestSKUWithVersion()` - SKU匹配（考虑版本、容量、颜色）
  - `shouldFilterSPU()` - SPU过滤规则
  - `getSPUPriority()` - SPU优先级计算
  - `isColorMatch()` - 颜色匹配（支持变体和基础颜色）

### 2. 更新在线匹配组件

**文件**: `components/SmartMatch.tsx`

- 移除了内部的 SimpleMatcher 类定义（约1700行代码）
- 从 `utils/smartMatcher` 导入 SimpleMatcher 和相关类型
- 保持原有的UI和交互逻辑不变
- 使用统一的匹配算法

### 3. 更新表格匹配组件

**文件**: `components/TableMatch.tsx`

- 移除了简化版的 SimpleMatcher 类定义（约100行代码）
- 从 `utils/smartMatcher` 导入 SimpleMatcher 和相关类型
- 升级匹配逻辑，使用与在线匹配相同的算法：
  - 添加输入预处理（`preprocessInputAdvanced`）
  - 添加演示机标记清理（`cleanDemoMarkers`）
  - 添加版本信息提取（`extractVersion`）
  - 使用改进的颜色提取（`extractColorAdvanced`）
  - 使用两阶段SPU匹配（全字匹配 + 分词匹配）
  - 使用考虑版本的SKU匹配（`findBestSKUWithVersion`）
  - 添加动态颜色列表支持

## 优势

1. **代码复用**: 两个组件共享同一套匹配逻辑，减少重复代码
2. **易于维护**: 匹配算法的改进只需在一个地方修改
3. **一致性**: 确保在线匹配和表格匹配使用相同的准确度
4. **可测试性**: 独立的工具类更容易编写单元测试
5. **可扩展性**: 新的匹配功能可以轻松添加到工具类中

## 匹配算法特性

### SPU匹配（两阶段）

1. **第一阶段 - 全字匹配**:
   - 品牌 + 型号完全匹配
   - 版本信息匹配（可选）
   - 优先级排序（标准版 > 版本匹配 > 其他）

2. **第二阶段 - 分词匹配**:
   - 无顺序的词汇匹配
   - 支持型号变体
   - 阈值过滤

### SKU匹配

- 版本匹配（30%权重）
- 容量匹配（40%权重）
- 颜色匹配（30%权重）
- 动态权重调整
- 颜色变体支持

### 过滤规则

- 礼盒版过滤
- 版本互斥过滤（蓝牙版 vs eSIM版）
- 配件过滤

## 使用示例

```typescript
import { SimpleMatcher } from '../utils/smartMatcher';

const matcher = new SimpleMatcher();

// 设置动态颜色列表
matcher.setColorList(colors);

// 预处理输入
const processed = matcher.preprocessInputAdvanced(input);

// SPU匹配
const { spu, similarity } = matcher.findBestSPUMatch(input, spuList, 0.5);

// SKU匹配
const { sku, similarity: skuSim } = matcher.findBestSKUWithVersion(
  input,
  skuList,
  inputVersion
);
```

## 测试建议

1. 测试在线匹配功能是否正常
2. 测试表格匹配功能是否正常
3. 对比重构前后的匹配准确率
4. 验证两个组件的匹配结果是否一致

## 后续优化

1. 为 SimpleMatcher 类添加单元测试
2. 考虑添加匹配结果缓存机制
3. 优化大批量匹配的性能
4. 添加匹配日志和调试工具
