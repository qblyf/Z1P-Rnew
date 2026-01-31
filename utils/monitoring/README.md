# 监控工具 (Monitoring Utilities)

SKU智能匹配系统的监控、日志和调试工具集。

## 功能概述

### 1. 匹配日志记录 (MatchLogger)

记录每次匹配的详细信息，包括输入、提取信息、匹配结果和性能数据。

**特性：**
- 支持不同日志级别（DEBUG, INFO, WARN, ERROR）
- 可持久化到localStorage
- 提供日志查询和统计功能
- 支持导出为JSON或CSV格式

**使用示例：**

```typescript
import { getDefaultLogger } from './monitoring';

const logger = getDefaultLogger();

// 记录成功的匹配
logger.logSuccess({
  input: 'iPhone 15 Pro 256GB',
  extractedInfo: {
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    capacity: '256GB'
  },
  spuMatch: {
    matched: true,
    spuId: 123,
    spuName: 'iPhone 15 Pro',
    score: 0.95
  },
  skuMatch: {
    matched: true,
    skuId: 456,
    skuName: 'iPhone 15 Pro 256GB',
    score: 0.98
  },
  duration: 150
});

// 查询日志
const failedLogs = logger.queryLogs({ status: 'failed' });

// 获取统计信息
const stats = logger.getStats();
console.log(`成功率: ${(stats.successRate * 100).toFixed(1)}%`);

// 导出日志
const csv = logger.exportToCSV();
```

### 2. 性能指标收集 (PerformanceMetrics)

收集和分析匹配过程各阶段的性能数据。

**特性：**
- 计时器API用于测量执行时间
- 支持多个阶段的性能跟踪
- 计算统计指标（平均值、中位数、P95、P99）
- 性能问题检测

**使用示例：**

```typescript
import { getDefaultMetrics } from './monitoring';

const metrics = getDefaultMetrics();

// 使用计时器
metrics.startTimer('spu-match');
// ... 执行SPU匹配
metrics.endTimer('spu-match');

// 使用measure方法
const result = await metrics.measure('total', async () => {
  // ... 执行完整匹配流程
  return matchResult;
});

// 生成性能报告
const report = metrics.generateReport();
console.log(`平均耗时: ${report.overall.avgDuration.toFixed(2)}ms`);
console.log(`P95耗时: ${report.overall.p95Duration.toFixed(2)}ms`);

// 检测性能问题
const issues = metrics.detectIssues({
  avgDuration: 500,
  p95Duration: 1000
});
if (issues.length > 0) {
  console.warn('性能问题:', issues);
}
```

### 3. 调试工具 (DebugTools)

提供调试会话管理、日志可视化和结果对比功能。

**特性：**
- 调试会话跟踪
- 匹配过程可视化
- 日志和性能报告格式化
- 匹配结果对比

**使用示例：**

```typescript
import { getDefaultDebugTools } from './monitoring';

const debug = getDefaultDebugTools();

// 开始调试会话
debug.startDebugSession('iPhone 15 Pro');

// 记录步骤
debug.logStep({
  name: 'preprocessing',
  input: 'iPhone 15 Pro',
  output: 'iphone 15 pro',
  duration: 10,
  success: true
});

// 结束会话
const debugInfo = debug.endDebugSession({
  status: 'success',
  spuMatched: true,
  skuMatched: true
});

// 可视化日志
const visualization = debug.visualizeMatchLog(matchLog);
console.log(visualization);

// 生成调试报告
const report = debug.generateDebugReport(logger, metrics);
console.log(report);
```

### 4. 配置验证 (ConfigValidator)

验证监控配置的正确性和一致性。

**特性：**
- 配置验证和错误检测
- 配置一致性检查
- 生成推荐配置
- 配置诊断

**使用示例：**

```typescript
import { validateConfig, diagnoseConfig } from './monitoring';

const config = {
  logger: {
    enabled: true,
    level: 'INFO',
    maxLogs: 5000
  },
  metrics: {
    enabled: true,
    maxMetrics: 10000
  }
};

// 验证配置
const result = validateConfig(config);
if (!result.valid) {
  console.error('配置无效:', result.issues);
}

// 诊断配置
const diagnostics = diagnoseConfig(config);
if (diagnostics.length > 0) {
  console.warn('配置诊断:', diagnostics);
}

// 生成推荐配置
const validator = getDefaultConfigValidator();
const recommendedConfig = validator.generateRecommendedConfig('production');
```

## 完整使用示例

### 初始化监控系统

```typescript
import { initializeMonitoring } from './monitoring';

// 开发环境配置
initializeMonitoring({
  logger: {
    enabled: true,
    level: 'DEBUG',
    maxLogs: 5000,
    persistToStorage: true
  },
  metrics: {
    enabled: true,
    maxMetrics: 10000,
    phases: ['preprocessing', 'extraction', 'spu-match', 'sku-match', 'total']
  },
  debug: {
    enabled: true,
    verbose: true,
    logToConsole: true
  }
});
```

### 在匹配流程中使用

```typescript
import { getDefaultLogger, getDefaultMetrics, getDefaultDebugTools } from './monitoring';

async function matchProduct(input: string) {
  const logger = getDefaultLogger();
  const metrics = getDefaultMetrics();
  const debug = getDefaultDebugTools();
  
  // 开始调试会话
  debug.startDebugSession(input);
  
  // 开始总计时
  metrics.startTimer('total');
  
  try {
    // 预处理
    const preprocessed = await metrics.measure('preprocessing', () => {
      return preprocessInput(input);
    });
    
    debug.logStep({
      name: 'preprocessing',
      input,
      output: preprocessed,
      duration: metrics.endTimer('preprocessing'),
      success: true
    });
    
    // 信息提取
    const extracted = await metrics.measure('extraction', () => {
      return extractInfo(preprocessed);
    });
    
    // SPU匹配
    const spuMatch = await metrics.measure('spu-match', () => {
      return matchSPU(extracted);
    });
    
    // SKU匹配
    const skuMatch = spuMatch ? await metrics.measure('sku-match', () => {
      return matchSKU(spuMatch, extracted);
    }) : null;
    
    // 记录成功
    const totalDuration = metrics.endTimer('total');
    
    logger.logSuccess({
      input,
      preprocessedInput: preprocessed,
      extractedInfo: extracted,
      spuMatch: {
        matched: !!spuMatch,
        spuId: spuMatch?.id,
        spuName: spuMatch?.name,
        score: spuMatch?.score
      },
      skuMatch: skuMatch ? {
        matched: true,
        skuId: skuMatch.id,
        skuName: skuMatch.name,
        score: skuMatch.score
      } : undefined,
      duration: totalDuration
    });
    
    debug.endDebugSession({
      status: skuMatch ? 'success' : 'partial',
      spuMatched: !!spuMatch,
      skuMatched: !!skuMatch
    });
    
    return { spuMatch, skuMatch };
    
  } catch (error) {
    const totalDuration = metrics.endTimer('total');
    
    logger.logFailure({
      input,
      duration: totalDuration,
      error: error.message
    });
    
    debug.endDebugSession({
      status: 'failed',
      spuMatched: false,
      skuMatched: false
    });
    
    throw error;
  }
}
```

### 生成监控报告

```typescript
import { generateMonitoringReport, getMonitoringInstances } from './monitoring';

// 生成综合报告
const report = generateMonitoringReport();
console.log(report);

// 或者分别获取各部分
const { logger, metrics, debug } = getMonitoringInstances();

const logStats = logger.getStats();
const perfReport = metrics.generateReport();
const perfSummary = metrics.getSummary();

console.log('日志统计:', logStats);
console.log('性能报告:', perfReport);
console.log('性能摘要:', perfSummary);
```

## 配置选项

### LoggerConfig

```typescript
interface LoggerConfig {
  enabled: boolean;          // 是否启用日志
  level: LogLevel;           // 日志级别: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  maxLogs: number;           // 最大保存日志数
  persistToStorage?: boolean; // 是否持久化到localStorage
  storageKey?: string;       // localStorage键名
}
```

### MetricsConfig

```typescript
interface MetricsConfig {
  enabled: boolean;    // 是否启用性能指标
  maxMetrics: number;  // 最大保存指标数
  phases: string[];    // 要跟踪的阶段列表
}
```

### DebugConfig

```typescript
interface DebugConfig {
  enabled: boolean;        // 是否启用调试
  verbose: boolean;        // 详细模式
  logToConsole: boolean;   // 是否输出到控制台
  highlightIssues: boolean; // 是否高亮显示问题
}
```

## 性能建议

1. **生产环境配置：**
   - 设置日志级别为 `WARN` 或 `ERROR`
   - 禁用调试模式
   - 减少 `maxLogs` 和 `maxMetrics`
   - 禁用 `persistToStorage`

2. **开发环境配置：**
   - 设置日志级别为 `DEBUG`
   - 启用详细调试模式
   - 启用 `persistToStorage` 以便分析

3. **内存管理：**
   - 定期调用 `clearAllMonitoringData()` 清理数据
   - 根据实际需求调整 `maxLogs` 和 `maxMetrics`

## API文档

详细的API文档请参考各模块的TypeScript类型定义和JSDoc注释。

## 测试

所有监控工具都有完整的单元测试覆盖。运行测试：

```bash
npm test -- monitoring
```

## 许可证

与主项目相同。
