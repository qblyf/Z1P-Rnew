/**
 * Monitoring Utilities
 * 
 * This module provides comprehensive monitoring, logging, and debugging
 * tools for the SKU matching system.
 * 
 * Features:
 * - Match logging with detailed information
 * - Performance metrics collection and analysis
 * - Debug tools for troubleshooting
 * - Configuration validation
 */

// Match Logger
export {
  MatchLogger,
  type MatchLog,
  type LogLevel,
  type LoggerConfig
} from './MatchLogger';

// Performance Metrics
export {
  PerformanceMetrics,
  type PerformanceMetric,
  type PhaseMetrics,
  type PerformanceReport,
  type MetricsConfig
} from './PerformanceMetrics';

// Debug Tools
export {
  DebugTools,
  type DebugConfig,
  type MatchDebugInfo,
  type DebugStep
} from './DebugTools';

// Config Validator
export {
  ConfigValidator,
  validateConfig,
  diagnoseConfig,
  type MonitoringConfig,
  type ValidationIssue,
  type ConfigValidationResult
} from './ConfigValidator';

import { MatchLogger, type LoggerConfig } from './MatchLogger';
import { PerformanceMetrics, type MetricsConfig } from './PerformanceMetrics';
import { DebugTools, type DebugConfig } from './DebugTools';

/**
 * Initialize monitoring system with configuration
 */
export function initializeMonitoring(config?: {
  logger?: Partial<LoggerConfig>;
  metrics?: Partial<MetricsConfig>;
  debug?: Partial<DebugConfig>;
}): { logger: MatchLogger; metrics: PerformanceMetrics; debug: DebugTools } {
  const logger = new MatchLogger(config?.logger);
  const metrics = new PerformanceMetrics(config?.metrics);
  const debug = new DebugTools(config?.debug);
  
  return { logger, metrics, debug };
}

/**
 * Clear all monitoring data
 */
export function clearAllMonitoringData(logger: MatchLogger, metrics: PerformanceMetrics): void {
  logger.clear();
  metrics.clear();
}

/**
 * Generate comprehensive monitoring report
 */
export function generateMonitoringReport(logger: MatchLogger, metrics: PerformanceMetrics, debug: DebugTools): string {
  return debug.generateDebugReport(logger, metrics);
}
