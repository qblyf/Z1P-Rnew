/**
 * MatchLogger - 匹配日志记录器
 * 
 * 功能：
 * - 记录每次匹配的详细信息
 * - 支持不同日志级别（DEBUG, INFO, WARN, ERROR）
 * - 提供日志查询和导出功能
 */

export interface MatchLog {
  // 基本信息
  id: string;
  timestamp: number;
  
  // 输入信息
  input: string;
  preprocessedInput?: string;
  
  // 提取信息
  extractedInfo?: {
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    capacity?: string | null;
    version?: string | null;
  };
  
  // SPU匹配结果
  spuMatch?: {
    matched: boolean;
    spuId?: number;
    spuName?: string;
    score?: number;
    matchType?: 'exact' | 'fuzzy';
  };
  
  // SKU匹配结果
  skuMatch?: {
    matched: boolean;
    skuId?: number;
    skuName?: string;
    score?: number;
  };
  
  // 性能信息
  duration: number; // 毫秒
  
  // 状态
  status: 'success' | 'partial' | 'failed';
  
  // 错误信息（如果有）
  error?: string;
  
  // 额外信息
  metadata?: Record<string, unknown>;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  maxLogs: number; // 最大保存日志数
  persistToStorage?: boolean; // 是否持久化到localStorage
  storageKey?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  level: 'INFO',
  maxLogs: 1000,
  persistToStorage: false,
  storageKey: 'match-logs'
};

export class MatchLogger {
  private config: LoggerConfig;
  private logs: MatchLog[] = [];
  private logLevels: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadLogsFromStorage();
  }

  /**
   * 记录匹配日志
   */
  log(log: Omit<MatchLog, 'id' | 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    const fullLog: MatchLog = {
      ...log,
      id: this.generateLogId(),
      timestamp: Date.now()
    };

    this.logs.push(fullLog);

    // 限制日志数量
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // 持久化
    if (this.config.persistToStorage) {
      this.saveLogsToStorage();
    }

    // 输出到控制台
    this.logToConsole(fullLog);
  }

  /**
   * 记录成功的匹配
   */
  logSuccess(params: {
    input: string;
    preprocessedInput?: string;
    extractedInfo?: MatchLog['extractedInfo'];
    spuMatch: MatchLog['spuMatch'];
    skuMatch?: MatchLog['skuMatch'];
    duration: number;
    metadata?: Record<string, unknown>;
  }): void {
    this.log({
      ...params,
      status: params.skuMatch?.matched ? 'success' : 'partial',
      spuMatch: { ...params.spuMatch, matched: true }
    });
  }

  /**
   * 记录失败的匹配
   */
  logFailure(params: {
    input: string;
    preprocessedInput?: string;
    extractedInfo?: MatchLog['extractedInfo'];
    duration: number;
    error?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.log({
      ...params,
      status: 'failed',
      spuMatch: { matched: false }
    });
  }

  /**
   * 获取所有日志
   */
  getLogs(): MatchLog[] {
    return [...this.logs];
  }

  /**
   * 根据条件查询日志
   */
  queryLogs(filter: {
    status?: MatchLog['status'];
    startTime?: number;
    endTime?: number;
    input?: string;
  }): MatchLog[] {
    return this.logs.filter(log => {
      if (filter.status && log.status !== filter.status) {
        return false;
      }
      if (filter.startTime && log.timestamp < filter.startTime) {
        return false;
      }
      if (filter.endTime && log.timestamp > filter.endTime) {
        return false;
      }
      if (filter.input && !log.input.includes(filter.input)) {
        return false;
      }
      return true;
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    success: number;
    partial: number;
    failed: number;
    avgDuration: number;
    successRate: number;
  } {
    const total = this.logs.length;
    const success = this.logs.filter(l => l.status === 'success').length;
    const partial = this.logs.filter(l => l.status === 'partial').length;
    const failed = this.logs.filter(l => l.status === 'failed').length;
    const avgDuration = total > 0
      ? this.logs.reduce((sum, l) => sum + l.duration, 0) / total
      : 0;
    const successRate = total > 0 ? (success + partial) / total : 0;

    return {
      total,
      success,
      partial,
      failed,
      avgDuration,
      successRate
    };
  }

  /**
   * 清除所有日志
   */
  clear(): void {
    this.logs = [];
    if (this.config.persistToStorage) {
      this.clearStorage();
    }
  }

  /**
   * 导出日志为JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导出日志为CSV
   */
  exportToCSV(): string {
    if (this.logs.length === 0) {
      return '';
    }

    const headers = [
      'ID',
      'Timestamp',
      'Input',
      'Status',
      'Duration(ms)',
      'SPU Matched',
      'SKU Matched',
      'Error'
    ];

    const rows = this.logs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.input,
      log.status,
      log.duration.toString(),
      log.spuMatch?.matched ? 'Yes' : 'No',
      log.skuMatch?.matched ? 'Yes' : 'No',
      log.error || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 私有方法

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logToConsole(log: MatchLog): void {
    const level = this.getLogLevel(log);
    
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return;
    }

    const message = this.formatLogMessage(log);
    
    switch (level) {
      case 'DEBUG':
        console.debug(message, log);
        break;
      case 'INFO':
        console.info(message);
        break;
      case 'WARN':
        console.warn(message);
        break;
      case 'ERROR':
        console.error(message, log.error);
        break;
    }
  }

  private getLogLevel(log: MatchLog): LogLevel {
    if (log.error) {
      return 'ERROR';
    }
    if (log.status === 'failed') {
      return 'WARN';
    }
    if (log.status === 'partial') {
      return 'INFO';
    }
    return 'DEBUG';
  }

  private formatLogMessage(log: MatchLog): string {
    const status = log.status.toUpperCase();
    const duration = `${log.duration}ms`;
    
    if (log.status === 'success') {
      return `[MATCH ${status}] "${log.input}" -> SPU: ${log.spuMatch?.spuName}, SKU: ${log.skuMatch?.skuName} (${duration})`;
    } else if (log.status === 'partial') {
      return `[MATCH ${status}] "${log.input}" -> SPU: ${log.spuMatch?.spuName}, SKU: Not matched (${duration})`;
    } else {
      return `[MATCH ${status}] "${log.input}" -> No match (${duration})`;
    }
  }

  private loadLogsFromStorage(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey!);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }

  private saveLogsToStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.config.storageKey!, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  private clearStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(this.config.storageKey!);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}

// 单例实例
let defaultLogger: MatchLogger | null = null;

/**
 * 获取默认日志记录器实例
 */
export function getDefaultLogger(): MatchLogger {
  if (!defaultLogger) {
    defaultLogger = new MatchLogger();
  }
  return defaultLogger;
}

/**
 * 配置默认日志记录器
 */
export function configureDefaultLogger(config: Partial<LoggerConfig>): void {
  if (!defaultLogger) {
    defaultLogger = new MatchLogger(config);
  } else {
    defaultLogger.updateConfig(config);
  }
}
