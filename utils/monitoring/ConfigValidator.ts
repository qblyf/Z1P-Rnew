/**
 * ConfigValidator - 配置验证工具（监控专用）
 * 
 * 功能：
 * - 验证监控配置的正确性
 * - 检查配置的一致性
 * - 提供配置诊断和建议
 * - 集成到监控系统中
 */

import { LoggerConfig } from './MatchLogger';
import { MetricsConfig } from './PerformanceMetrics';
import { DebugConfig } from './DebugTools';

export interface MonitoringConfig {
  logger?: Partial<LoggerConfig>;
  metrics?: Partial<MetricsConfig>;
  debug?: Partial<DebugConfig>;
}

export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  category: 'logger' | 'metrics' | 'debug' | 'general';
  message: string;
  suggestion?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export class ConfigValidator {
  /**
   * 验证监控配置
   */
  validateMonitoringConfig(config: MonitoringConfig): ConfigValidationResult {
    const issues: ValidationIssue[] = [];

    // 验证日志配置
    if (config.logger) {
      issues.push(...this.validateLoggerConfig(config.logger));
    }

    // 验证性能指标配置
    if (config.metrics) {
      issues.push(...this.validateMetricsConfig(config.metrics));
    }

    // 验证调试配置
    if (config.debug) {
      issues.push(...this.validateDebugConfig(config.debug));
    }

    // 检查配置一致性
    issues.push(...this.checkConfigConsistency(config));

    const summary = this.summarizeIssues(issues);
    const valid = summary.errors === 0;

    return {
      valid,
      issues,
      summary
    };
  }

  /**
   * 验证日志配置
   */
  private validateLoggerConfig(config: Partial<LoggerConfig>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查maxLogs
    if (config.maxLogs !== undefined) {
      if (config.maxLogs <= 0) {
        issues.push({
          level: 'error',
          category: 'logger',
          message: 'maxLogs must be greater than 0',
          suggestion: 'Set maxLogs to a positive number (recommended: 1000-10000)'
        });
      } else if (config.maxLogs > 100000) {
        issues.push({
          level: 'warning',
          category: 'logger',
          message: `maxLogs is very large (${config.maxLogs})`,
          suggestion: 'Consider reducing maxLogs to avoid memory issues (recommended: < 50000)'
        });
      }
    }

    // 检查level
    if (config.level !== undefined) {
      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      if (!validLevels.includes(config.level)) {
        issues.push({
          level: 'error',
          category: 'logger',
          message: `Invalid log level: ${config.level}`,
          suggestion: `Use one of: ${validLevels.join(', ')}`
        });
      }
    }

    // 检查persistToStorage
    if (config.persistToStorage && typeof window === 'undefined') {
      issues.push({
        level: 'warning',
        category: 'logger',
        message: 'persistToStorage is enabled but localStorage is not available',
        suggestion: 'Disable persistToStorage in server-side environments'
      });
    }

    // 检查storageKey
    if (config.persistToStorage && !config.storageKey) {
      issues.push({
        level: 'warning',
        category: 'logger',
        message: 'persistToStorage is enabled but storageKey is not set',
        suggestion: 'Set a unique storageKey to avoid conflicts'
      });
    }

    return issues;
  }

  /**
   * 验证性能指标配置
   */
  private validateMetricsConfig(config: Partial<MetricsConfig>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查maxMetrics
    if (config.maxMetrics !== undefined) {
      if (config.maxMetrics <= 0) {
        issues.push({
          level: 'error',
          category: 'metrics',
          message: 'maxMetrics must be greater than 0',
          suggestion: 'Set maxMetrics to a positive number (recommended: 5000-20000)'
        });
      } else if (config.maxMetrics > 100000) {
        issues.push({
          level: 'warning',
          category: 'metrics',
          message: `maxMetrics is very large (${config.maxMetrics})`,
          suggestion: 'Consider reducing maxMetrics to avoid memory issues (recommended: < 50000)'
        });
      }
    }

    // 检查phases
    if (config.phases !== undefined) {
      if (!Array.isArray(config.phases)) {
        issues.push({
          level: 'error',
          category: 'metrics',
          message: 'phases must be an array',
          suggestion: 'Set phases to an array of phase names'
        });
      } else if (config.phases.length === 0) {
        issues.push({
          level: 'warning',
          category: 'metrics',
          message: 'phases array is empty',
          suggestion: 'Add at least one phase to track (e.g., "total", "preprocessing")'
        });
      } else {
        // 检查重复的phase
        const uniquePhases = new Set(config.phases);
        if (uniquePhases.size !== config.phases.length) {
          issues.push({
            level: 'warning',
            category: 'metrics',
            message: 'phases array contains duplicates',
            suggestion: 'Remove duplicate phase names'
          });
        }
      }
    }

    return issues;
  }

  /**
   * 验证调试配置
   */
  private validateDebugConfig(config: Partial<DebugConfig>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查logToConsole
    if (config.logToConsole && typeof console === 'undefined') {
      issues.push({
        level: 'warning',
        category: 'debug',
        message: 'logToConsole is enabled but console is not available',
        suggestion: 'Disable logToConsole in environments without console'
      });
    }

    // 性能建议
    if (config.enabled && config.verbose) {
      issues.push({
        level: 'info',
        category: 'debug',
        message: 'Verbose debug mode is enabled',
        suggestion: 'Verbose mode may impact performance. Disable in production.'
      });
    }

    return issues;
  }

  /**
   * 检查配置一致性
   */
  private checkConfigConsistency(config: MonitoringConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 如果调试启用，建议启用日志
    if (config.debug?.enabled && config.logger?.enabled === false) {
      issues.push({
        level: 'warning',
        category: 'general',
        message: 'Debug is enabled but logger is disabled',
        suggestion: 'Enable logger to capture debug information'
      });
    }

    // 如果日志启用，建议启用性能指标
    if (config.logger?.enabled && config.metrics?.enabled === false) {
      issues.push({
        level: 'info',
        category: 'general',
        message: 'Logger is enabled but metrics are disabled',
        suggestion: 'Enable metrics to track performance alongside logs'
      });
    }

    // 生产环境建议
    if (config.debug?.enabled || config.logger?.level === 'DEBUG') {
      issues.push({
        level: 'info',
        category: 'general',
        message: 'Debug features are enabled',
        suggestion: 'Consider disabling debug features in production for better performance'
      });
    }

    return issues;
  }

  /**
   * 汇总问题
   */
  private summarizeIssues(issues: ValidationIssue[]): {
    errors: number;
    warnings: number;
    infos: number;
  } {
    return {
      errors: issues.filter(i => i.level === 'error').length,
      warnings: issues.filter(i => i.level === 'warning').length,
      infos: issues.filter(i => i.level === 'info').length
    };
  }

  /**
   * 格式化验证结果
   */
  formatValidationResult(result: ConfigValidationResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('监控配置验证结果');
    lines.push('='.repeat(60));
    lines.push('');

    // 状态
    if (result.valid) {
      lines.push('✅ 配置有效');
    } else {
      lines.push('❌ 配置无效');
    }
    lines.push('');

    // 摘要
    lines.push('📊 问题摘要:');
    lines.push(`  错误: ${result.summary.errors}`);
    lines.push(`  警告: ${result.summary.warnings}`);
    lines.push(`  信息: ${result.summary.infos}`);
    lines.push('');

    // 详细问题
    if (result.issues.length > 0) {
      lines.push('📋 详细问题:');
      lines.push('');

      const errorIssues = result.issues.filter(i => i.level === 'error');
      const warningIssues = result.issues.filter(i => i.level === 'warning');
      const infoIssues = result.issues.filter(i => i.level === 'info');

      if (errorIssues.length > 0) {
        lines.push('❌ 错误:');
        errorIssues.forEach((issue, index) => {
          lines.push(`  ${index + 1}. [${issue.category}] ${issue.message}`);
          if (issue.suggestion) {
            lines.push(`     💡 ${issue.suggestion}`);
          }
        });
        lines.push('');
      }

      if (warningIssues.length > 0) {
        lines.push('⚠️  警告:');
        warningIssues.forEach((issue, index) => {
          lines.push(`  ${index + 1}. [${issue.category}] ${issue.message}`);
          if (issue.suggestion) {
            lines.push(`     💡 ${issue.suggestion}`);
          }
        });
        lines.push('');
      }

      if (infoIssues.length > 0) {
        lines.push('ℹ️  信息:');
        infoIssues.forEach((issue, index) => {
          lines.push(`  ${index + 1}. [${issue.category}] ${issue.message}`);
          if (issue.suggestion) {
            lines.push(`     💡 ${issue.suggestion}`);
          }
        });
        lines.push('');
      }
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * 生成推荐配置
   */
  generateRecommendedConfig(environment: 'development' | 'production'): MonitoringConfig {
    if (environment === 'development') {
      return {
        logger: {
          enabled: true,
          level: 'DEBUG',
          maxLogs: 5000,
          persistToStorage: true,
          storageKey: 'match-logs-dev'
        },
        metrics: {
          enabled: true,
          maxMetrics: 10000,
          phases: ['preprocessing', 'extraction', 'spu-match', 'sku-match', 'total']
        },
        debug: {
          enabled: true,
          verbose: true,
          logToConsole: true,
          highlightIssues: true
        }
      };
    } else {
      return {
        logger: {
          enabled: true,
          level: 'WARN',
          maxLogs: 1000,
          persistToStorage: false
        },
        metrics: {
          enabled: true,
          maxMetrics: 5000,
          phases: ['total']
        },
        debug: {
          enabled: false,
          verbose: false,
          logToConsole: false,
          highlightIssues: false
        }
      };
    }
  }

  /**
   * 诊断配置问题
   */
  diagnoseConfig(config: MonitoringConfig): string[] {
    const diagnostics: string[] = [];
    const result = this.validateMonitoringConfig(config);

    if (!result.valid) {
      diagnostics.push('配置验证失败，存在错误需要修复');
    }

    if (result.summary.warnings > 0) {
      diagnostics.push(`发现 ${result.summary.warnings} 个警告，建议检查`);
    }

    // 性能诊断
    const maxLogs = config.logger?.maxLogs || 1000;
    const maxMetrics = config.metrics?.maxMetrics || 10000;
    const totalMemory = (maxLogs * 1 + maxMetrics * 0.5) / 1000; // 粗略估算 KB

    if (totalMemory > 10000) {
      diagnostics.push(`预计内存占用较高 (~${totalMemory.toFixed(0)}KB)，建议减少maxLogs或maxMetrics`);
    }

    // 功能诊断
    if (!config.logger?.enabled && !config.metrics?.enabled) {
      diagnostics.push('日志和性能指标都未启用，监控功能将无法工作');
    }

    return diagnostics;
  }
}

// 单例实例
let defaultValidator: ConfigValidator | null = null;

/**
 * 获取默认配置验证器实例
 */
export function getDefaultConfigValidator(): ConfigValidator {
  if (!defaultValidator) {
    defaultValidator = new ConfigValidator();
  }
  return defaultValidator;
}

/**
 * 快速验证配置
 */
export function validateConfig(config: MonitoringConfig): ConfigValidationResult {
  return getDefaultConfigValidator().validateMonitoringConfig(config);
}

/**
 * 快速诊断配置
 */
export function diagnoseConfig(config: MonitoringConfig): string[] {
  return getDefaultConfigValidator().diagnoseConfig(config);
}
