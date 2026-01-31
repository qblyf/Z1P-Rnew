/**
 * PerformanceMetrics - 性能指标收集器
 * 
 * 功能：
 * - 收集匹配过程各阶段的性能数据
 * - 计算统计指标（平均值、中位数、P95、P99等）
 * - 提供性能报告和分析
 */

export interface PerformanceMetric {
  name: string;
  duration: number; // 毫秒
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PhaseMetrics {
  phase: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
}

export interface PerformanceReport {
  // 总体指标
  overall: {
    totalMatches: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
  };
  
  // 各阶段指标
  phases: PhaseMetrics[];
  
  // 时间范围
  timeRange: {
    start: number;
    end: number;
  };
  
  // 生成时间
  generatedAt: number;
}

export interface MetricsConfig {
  enabled: boolean;
  maxMetrics: number; // 最大保存指标数
  phases: string[]; // 要跟踪的阶段
}

const DEFAULT_CONFIG: MetricsConfig = {
  enabled: true,
  maxMetrics: 10000,
  phases: [
    'preprocessing',
    'extraction',
    'spu-match',
    'sku-match',
    'total'
  ]
};

export class PerformanceMetrics {
  private config: MetricsConfig;
  private metrics: PerformanceMetric[] = [];
  private activeTimers: Map<string, number> = new Map();

  constructor(config?: Partial<MetricsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 开始计时
   */
  startTimer(name: string): void {
    if (!this.config.enabled) {
      return;
    }
    this.activeTimers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  endTimer(name: string, metadata?: Record<string, unknown>): number {
    if (!this.config.enabled) {
      return 0;
    }

    const startTime = this.activeTimers.get(name);
    if (startTime === undefined) {
      console.warn(`Timer "${name}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(name);

    this.recordMetric({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });

    return duration;
  }

  /**
   * 直接记录指标
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) {
      return;
    }

    this.metrics.push(metric);

    // 限制指标数量
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, metadata);
      return result;
    } catch (error) {
      this.endTimer(name, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 根据名称查询指标
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * 根据时间范围查询指标
   */
  getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * 获取阶段统计
   */
  getPhaseStats(phase: string): PhaseMetrics | null {
    const phaseMetrics = this.getMetricsByName(phase);
    if (phaseMetrics.length === 0) {
      return null;
    }

    const durations = phaseMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      phase,
      count: durations.length,
      totalDuration,
      avgDuration: totalDuration / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      medianDuration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99)
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const totalMetrics = this.getMetricsByName('total');
    const durations = totalMetrics.map(m => m.duration).sort((a, b) => a - b);
    
    const overall = durations.length > 0 ? {
      totalMatches: durations.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      medianDuration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99)
    } : {
      totalMatches: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      medianDuration: 0,
      p95Duration: 0,
      p99Duration: 0
    };

    const phases: PhaseMetrics[] = [];
    for (const phase of this.config.phases) {
      const stats = this.getPhaseStats(phase);
      if (stats) {
        phases.push(stats);
      }
    }

    const timestamps = this.metrics.map(m => m.timestamp);
    const timeRange = timestamps.length > 0 ? {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps)
    } : {
      start: 0,
      end: 0
    };

    return {
      overall,
      phases,
      timeRange,
      generatedAt: Date.now()
    };
  }

  /**
   * 获取性能摘要（简化版报告）
   */
  getSummary(): {
    totalMatches: number;
    avgDuration: number;
    p95Duration: number;
    slowestPhase: string | null;
  } {
    const report = this.generateReport();
    
    let slowestPhase: string | null = null;
    let maxAvgDuration = 0;
    
    for (const phase of report.phases) {
      if (phase.phase !== 'total' && phase.avgDuration > maxAvgDuration) {
        maxAvgDuration = phase.avgDuration;
        slowestPhase = phase.phase;
      }
    }

    return {
      totalMatches: report.overall.totalMatches,
      avgDuration: report.overall.avgDuration,
      p95Duration: report.overall.p95Duration,
      slowestPhase
    };
  }

  /**
   * 检测性能问题
   */
  detectIssues(thresholds?: {
    avgDuration?: number;
    p95Duration?: number;
    maxDuration?: number;
  }): string[] {
    const issues: string[] = [];
    const report = this.generateReport();
    
    const defaultThresholds = {
      avgDuration: 500,
      p95Duration: 1000,
      maxDuration: 2000,
      ...thresholds
    };

    if (report.overall.avgDuration > defaultThresholds.avgDuration) {
      issues.push(
        `平均匹配时间过长: ${report.overall.avgDuration.toFixed(2)}ms (阈值: ${defaultThresholds.avgDuration}ms)`
      );
    }

    if (report.overall.p95Duration > defaultThresholds.p95Duration) {
      issues.push(
        `P95匹配时间过长: ${report.overall.p95Duration.toFixed(2)}ms (阈值: ${defaultThresholds.p95Duration}ms)`
      );
    }

    if (report.overall.maxDuration > defaultThresholds.maxDuration) {
      issues.push(
        `最大匹配时间过长: ${report.overall.maxDuration.toFixed(2)}ms (阈值: ${defaultThresholds.maxDuration}ms)`
      );
    }

    // 检查各阶段
    for (const phase of report.phases) {
      if (phase.phase !== 'total' && phase.avgDuration > defaultThresholds.avgDuration / 2) {
        issues.push(
          `阶段 "${phase.phase}" 平均耗时过长: ${phase.avgDuration.toFixed(2)}ms`
        );
      }
    }

    return issues;
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }

  /**
   * 导出指标为JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      metrics: this.metrics,
      report: this.generateReport()
    }, null, 2);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 私有方法

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
}

// 单例实例
let defaultMetrics: PerformanceMetrics | null = null;

/**
 * 获取默认性能指标收集器实例
 */
export function getDefaultMetrics(): PerformanceMetrics {
  if (!defaultMetrics) {
    defaultMetrics = new PerformanceMetrics();
  }
  return defaultMetrics;
}

/**
 * 配置默认性能指标收集器
 */
export function configureDefaultMetrics(config: Partial<MetricsConfig>): void {
  if (!defaultMetrics) {
    defaultMetrics = new PerformanceMetrics(config);
  } else {
    defaultMetrics.updateConfig(config);
  }
}
