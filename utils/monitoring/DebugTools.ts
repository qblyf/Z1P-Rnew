/**
 * DebugTools - 调试工具集
 * 
 * 功能：
 * - 匹配过程可视化
 * - 提取结果查看器
 * - 匹配结果对比
 * - 调试信息输出
 */

import { MatchLogger, MatchLog } from './MatchLogger';
import { PerformanceMetrics, PerformanceReport } from './PerformanceMetrics';

export interface DebugConfig {
  enabled: boolean;
  verbose: boolean; // 详细模式
  logToConsole: boolean;
  highlightIssues: boolean; // 高亮显示问题
}

const DEFAULT_CONFIG: DebugConfig = {
  enabled: false,
  verbose: false,
  logToConsole: true,
  highlightIssues: true
};

export interface MatchDebugInfo {
  input: string;
  steps: DebugStep[];
  result: {
    status: 'success' | 'partial' | 'failed';
    spuMatched: boolean;
    skuMatched: boolean;
  };
  performance: {
    totalDuration: number;
    stepDurations: Record<string, number>;
  };
  issues: string[];
}

export interface DebugStep {
  name: string;
  input: unknown;
  output: unknown;
  duration: number;
  success: boolean;
  error?: string;
  warnings?: string[];
}

export class DebugTools {
  private config: DebugConfig;
  private currentDebugInfo: MatchDebugInfo | null = null;

  constructor(config?: Partial<DebugConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 开始调试会话
   */
  startDebugSession(input: string): void {
    if (!this.config.enabled) {
      return;
    }

    this.currentDebugInfo = {
      input,
      steps: [],
      result: {
        status: 'failed',
        spuMatched: false,
        skuMatched: false
      },
      performance: {
        totalDuration: 0,
        stepDurations: {}
      },
      issues: []
    };

    if (this.config.logToConsole) {
      console.group(`🔍 调试会话: "${input}"`);
    }
  }

  /**
   * 记录调试步骤
   */
  logStep(step: DebugStep): void {
    if (!this.config.enabled || !this.currentDebugInfo) {
      return;
    }

    this.currentDebugInfo.steps.push(step);
    this.currentDebugInfo.performance.stepDurations[step.name] = step.duration;

    if (this.config.logToConsole) {
      if (step.error) {
        console.error('  错误:', step.error);
      }
    }
  }

  /**
   * 结束调试会话
   */
  endDebugSession(result: MatchDebugInfo['result']): MatchDebugInfo | null {
    if (!this.config.enabled || !this.currentDebugInfo) {
      return null;
    }

    this.currentDebugInfo.result = result;
    this.currentDebugInfo.performance.totalDuration = 
      Object.values(this.currentDebugInfo.performance.stepDurations)
        .reduce((sum, d) => sum + d, 0);

    // 检测问题
    this.currentDebugInfo.issues = this.detectIssues(this.currentDebugInfo);

    if (this.config.logToConsole) {
      this.printSummary(this.currentDebugInfo);
      console.groupEnd();
    }

    const debugInfo = this.currentDebugInfo;
    this.currentDebugInfo = null;
    
    return debugInfo;
  }

  /**
   * 可视化匹配日志
   */
  visualizeMatchLog(log: MatchLog): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push(`匹配日志 #${log.id}`);
    lines.push('='.repeat(60));
    lines.push('');
    
    // 基本信息
    lines.push('📝 基本信息:');
    lines.push(`  输入: ${log.input}`);
    lines.push(`  时间: ${new Date(log.timestamp).toLocaleString()}`);
    lines.push(`  状态: ${this.getStatusEmoji(log.status)} ${log.status}`);
    lines.push(`  耗时: ${log.duration.toFixed(2)}ms`);
    lines.push('');
    
    // 提取信息
    if (log.extractedInfo) {
      lines.push('🔍 提取信息:');
      for (const [key, value] of Object.entries(log.extractedInfo)) {
        if (value !== null && value !== undefined) {
          lines.push(`  ${key}: ${value}`);
        }
      }
      lines.push('');
    }
    
    // SPU匹配
    if (log.spuMatch) {
      lines.push('📦 SPU匹配:');
      lines.push(`  匹配: ${log.spuMatch.matched ? '✅' : '❌'}`);
      if (log.spuMatch.matched) {
        lines.push(`  SPU ID: ${log.spuMatch.spuId}`);
        lines.push(`  SPU名称: ${log.spuMatch.spuName}`);
        lines.push(`  分数: ${(log.spuMatch.score || 0).toFixed(2)}`);
        lines.push(`  类型: ${log.spuMatch.matchType}`);
      }
      lines.push('');
    }
    
    // SKU匹配
    if (log.skuMatch) {
      lines.push('📱 SKU匹配:');
      lines.push(`  匹配: ${log.skuMatch.matched ? '✅' : '❌'}`);
      if (log.skuMatch.matched) {
        lines.push(`  SKU ID: ${log.skuMatch.skuId}`);
        lines.push(`  SKU名称: ${log.skuMatch.skuName}`);
        lines.push(`  分数: ${(log.skuMatch.score || 0).toFixed(2)}`);
      }
      lines.push('');
    }
    
    // 错误信息
    if (log.error) {
      lines.push('❌ 错误:');
      lines.push(`  ${log.error}`);
      lines.push('');
    }
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * 可视化性能报告
   */
  visualizePerformanceReport(report: PerformanceReport): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('性能报告');
    lines.push('='.repeat(60));
    lines.push('');
    
    // 总体指标
    lines.push('📊 总体指标:');
    lines.push(`  总匹配次数: ${report.overall.totalMatches}`);
    lines.push(`  平均耗时: ${report.overall.avgDuration.toFixed(2)}ms`);
    lines.push(`  最小耗时: ${report.overall.minDuration.toFixed(2)}ms`);
    lines.push(`  最大耗时: ${report.overall.maxDuration.toFixed(2)}ms`);
    lines.push(`  中位数: ${report.overall.medianDuration.toFixed(2)}ms`);
    lines.push(`  P95: ${report.overall.p95Duration.toFixed(2)}ms`);
    lines.push(`  P99: ${report.overall.p99Duration.toFixed(2)}ms`);
    lines.push('');
    
    // 各阶段指标
    if (report.phases.length > 0) {
      lines.push('⏱️  各阶段指标:');
      for (const phase of report.phases) {
        lines.push(`  ${phase.phase}:`);
        lines.push(`    次数: ${phase.count}`);
        lines.push(`    平均: ${phase.avgDuration.toFixed(2)}ms`);
        lines.push(`    P95: ${phase.p95Duration.toFixed(2)}ms`);
      }
      lines.push('');
    }
    
    // 时间范围
    lines.push('📅 时间范围:');
    lines.push(`  开始: ${new Date(report.timeRange.start).toLocaleString()}`);
    lines.push(`  结束: ${new Date(report.timeRange.end).toLocaleString()}`);
    lines.push('');
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * 对比两次匹配结果
   */
  compareMatches(log1: MatchLog, log2: MatchLog): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('匹配结果对比');
    lines.push('='.repeat(60));
    lines.push('');
    
    lines.push('输入:');
    lines.push(`  匹配1: ${log1.input}`);
    lines.push(`  匹配2: ${log2.input}`);
    lines.push('');
    
    lines.push('状态:');
    lines.push(`  匹配1: ${this.getStatusEmoji(log1.status)} ${log1.status}`);
    lines.push(`  匹配2: ${this.getStatusEmoji(log2.status)} ${log2.status}`);
    lines.push('');
    
    lines.push('性能:');
    lines.push(`  匹配1: ${log1.duration.toFixed(2)}ms`);
    lines.push(`  匹配2: ${log2.duration.toFixed(2)}ms`);
    lines.push(`  差异: ${(log2.duration - log1.duration).toFixed(2)}ms`);
    lines.push('');
    
    if (log1.spuMatch && log2.spuMatch) {
      lines.push('SPU匹配:');
      lines.push(`  匹配1: ${log1.spuMatch.spuName || 'N/A'}`);
      lines.push(`  匹配2: ${log2.spuMatch.spuName || 'N/A'}`);
      lines.push(`  相同: ${log1.spuMatch.spuId === log2.spuMatch.spuId ? '✅' : '❌'}`);
      lines.push('');
    }
    
    if (log1.skuMatch && log2.skuMatch) {
      lines.push('SKU匹配:');
      lines.push(`  匹配1: ${log1.skuMatch.skuName || 'N/A'}`);
      lines.push(`  匹配2: ${log2.skuMatch.skuName || 'N/A'}`);
      lines.push(`  相同: ${log1.skuMatch.skuId === log2.skuMatch.skuId ? '✅' : '❌'}`);
      lines.push('');
    }
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * 生成调试报告
   */
  generateDebugReport(
    logger: MatchLogger,
    metrics: PerformanceMetrics
  ): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('调试报告');
    lines.push('='.repeat(80));
    lines.push('');
    
    // 日志统计
    const logStats = logger.getStats();
    lines.push('📊 匹配统计:');
    lines.push(`  总次数: ${logStats.total}`);
    lines.push(`  成功: ${logStats.success} (${(logStats.success / logStats.total * 100).toFixed(1)}%)`);
    lines.push(`  部分: ${logStats.partial} (${(logStats.partial / logStats.total * 100).toFixed(1)}%)`);
    lines.push(`  失败: ${logStats.failed} (${(logStats.failed / logStats.total * 100).toFixed(1)}%)`);
    lines.push(`  成功率: ${(logStats.successRate * 100).toFixed(1)}%`);
    lines.push('');
    
    // 性能摘要
    const perfSummary = metrics.getSummary();
    lines.push('⚡ 性能摘要:');
    lines.push(`  平均耗时: ${perfSummary.avgDuration.toFixed(2)}ms`);
    lines.push(`  P95耗时: ${perfSummary.p95Duration.toFixed(2)}ms`);
    lines.push(`  最慢阶段: ${perfSummary.slowestPhase || 'N/A'}`);
    lines.push('');
    
    // 性能问题
    const issues = metrics.detectIssues();
    if (issues.length > 0) {
      lines.push('⚠️  性能问题:');
      issues.forEach(issue => {
        lines.push(`  - ${issue}`);
      });
      lines.push('');
    }
    
    // 最近失败的匹配
    const failedLogs = logger.queryLogs({ status: 'failed' }).slice(-5);
    if (failedLogs.length > 0) {
      lines.push('❌ 最近失败的匹配:');
      failedLogs.forEach(log => {
        lines.push(`  - "${log.input}" (${log.error || '未知错误'})`);
      });
      lines.push('');
    }
    
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 私有方法

  private detectIssues(debugInfo: MatchDebugInfo): string[] {
    const issues: string[] = [];
    
    // 检查性能问题
    if (debugInfo.performance.totalDuration > 500) {
      issues.push(`总耗时过长: ${debugInfo.performance.totalDuration.toFixed(2)}ms`);
    }
    
    // 检查各步骤耗时
    for (const [step, duration] of Object.entries(debugInfo.performance.stepDurations)) {
      if (duration > 200) {
        issues.push(`步骤 "${step}" 耗时过长: ${duration.toFixed(2)}ms`);
      }
    }
    
    // 检查失败步骤
    const failedSteps = debugInfo.steps.filter(s => !s.success);
    if (failedSteps.length > 0) {
      issues.push(`${failedSteps.length} 个步骤失败`);
    }
    
    // 检查警告
    const warnings = debugInfo.steps.flatMap(s => s.warnings || []);
    if (warnings.length > 0) {
      issues.push(`${warnings.length} 个警告`);
    }
    
    return issues;
  }

  private printSummary(debugInfo: MatchDebugInfo): void {
    // Debug summary removed for production
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'success':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  }
}

// 单例实例
let defaultDebugTools: DebugTools | null = null;

/**
 * 获取默认调试工具实例
 */
export function getDefaultDebugTools(): DebugTools {
  if (!defaultDebugTools) {
    defaultDebugTools = new DebugTools();
  }
  return defaultDebugTools;
}

/**
 * 配置默认调试工具
 */
export function configureDefaultDebugTools(config: Partial<DebugConfig>): void {
  if (!defaultDebugTools) {
    defaultDebugTools = new DebugTools(config);
  } else {
    defaultDebugTools.updateConfig(config);
  }
}
