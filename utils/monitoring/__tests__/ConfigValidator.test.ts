import {
  ConfigValidator,
  getDefaultConfigValidator,
  validateConfig,
  diagnoseConfig
} from '../ConfigValidator';

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  describe('validateMonitoringConfig', () => {
    it('should validate valid configuration', () => {
      const config = {
        logger: {
          enabled: true,
          level: 'INFO' as const,
          maxLogs: 1000
        },
        metrics: {
          enabled: true,
          maxMetrics: 5000,
          phases: ['total', 'preprocessing']
        },
        debug: {
          enabled: false
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it('should detect invalid maxLogs', () => {
      const config = {
        logger: {
          maxLogs: -1
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.valid).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('maxLogs'))).toBe(true);
    });

    it('should warn about large maxLogs', () => {
      const config = {
        logger: {
          maxLogs: 150000
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('very large'))).toBe(true);
    });

    it('should detect invalid log level', () => {
      const config = {
        logger: {
          level: 'INVALID' as 'DEBUG' // Type assertion to bypass type checking for test
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('Invalid log level'))).toBe(true);
    });

    it('should detect invalid maxMetrics', () => {
      const config = {
        metrics: {
          maxMetrics: 0
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('maxMetrics'))).toBe(true);
    });

    it('should warn about empty phases array', () => {
      const config = {
        metrics: {
          phases: []
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('phases array is empty'))).toBe(true);
    });

    it('should detect duplicate phases', () => {
      const config = {
        metrics: {
          phases: ['total', 'preprocessing', 'total']
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('duplicates'))).toBe(true);
    });

    it('should provide info about verbose debug mode', () => {
      const config = {
        debug: {
          enabled: true,
          verbose: true
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.summary.infos).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('Verbose'))).toBe(true);
    });
  });

  describe('checkConfigConsistency', () => {
    it('should warn when debug enabled but logger disabled', () => {
      const config = {
        debug: {
          enabled: true
        },
        logger: {
          enabled: false
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.issues.some(i => 
        i.message.includes('Debug is enabled but logger is disabled')
      )).toBe(true);
    });

    it('should suggest enabling metrics when logger is enabled', () => {
      const config = {
        logger: {
          enabled: true
        },
        metrics: {
          enabled: false
        }
      };

      const result = validator.validateMonitoringConfig(config);

      expect(result.issues.some(i => 
        i.message.includes('Logger is enabled but metrics are disabled')
      )).toBe(true);
    });
  });

  describe('formatValidationResult', () => {
    it('should format validation result', () => {
      const config = {
        logger: {
          maxLogs: -1,
          level: 'INVALID' as 'DEBUG' // Type assertion to bypass type checking for test
        }
      };

      const result = validator.validateMonitoringConfig(config);
      const formatted = validator.formatValidationResult(result);

      expect(formatted).toContain('监控配置验证结果');
      expect(formatted).toContain('❌ 配置无效');
      expect(formatted).toContain('错误:');
      expect(formatted).toContain('maxLogs');
    });

    it('should format valid result', () => {
      const config = {
        logger: {
          enabled: true,
          level: 'INFO' as const,
          maxLogs: 1000
        }
      };

      const result = validator.validateMonitoringConfig(config);
      const formatted = validator.formatValidationResult(result);

      expect(formatted).toContain('✅ 配置有效');
    });
  });

  describe('generateRecommendedConfig', () => {
    it('should generate development config', () => {
      const config = validator.generateRecommendedConfig('development');

      expect(config.logger?.enabled).toBe(true);
      expect(config.logger?.level).toBe('DEBUG');
      expect(config.debug?.enabled).toBe(true);
      expect(config.debug?.verbose).toBe(true);
    });

    it('should generate production config', () => {
      const config = validator.generateRecommendedConfig('production');

      expect(config.logger?.enabled).toBe(true);
      expect(config.logger?.level).toBe('WARN');
      expect(config.debug?.enabled).toBe(false);
      expect(config.logger?.persistToStorage).toBe(false);
    });
  });

  describe('diagnoseConfig', () => {
    it('should diagnose invalid config', () => {
      const config = {
        logger: {
          maxLogs: -1
        }
      };

      const diagnostics = validator.diagnoseConfig(config);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.includes('配置验证失败'))).toBe(true);
    });

    it('should diagnose high memory usage', () => {
      const config = {
        logger: {
          enabled: true,
          maxLogs: 15000000  // 15 million logs
        },
        metrics: {
          enabled: true,
          maxMetrics: 10000000  // 10 million metrics
        }
      };

      const diagnostics = validator.diagnoseConfig(config);
      
      // Memory calculation: (15000000 * 1 + 10000000 * 0.5) / 1000 = 20000 KB > 10000 KB threshold
      expect(diagnostics.some(d => d.includes('内存占用'))).toBe(true);
    });

    it('should diagnose disabled monitoring', () => {
      const config = {
        logger: {
          enabled: false
        },
        metrics: {
          enabled: false
        }
      };

      const diagnostics = validator.diagnoseConfig(config);

      expect(diagnostics.some(d => d.includes('监控功能将无法工作'))).toBe(true);
    });
  });

  describe('singleton and convenience functions', () => {
    it('should return the same instance', () => {
      const validator1 = getDefaultConfigValidator();
      const validator2 = getDefaultConfigValidator();

      expect(validator1).toBe(validator2);
    });

    it('should validate config using convenience function', () => {
      const config = {
        logger: {
          enabled: true,
          level: 'INFO' as const
        }
      };

      const result = validateConfig(config);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    it('should diagnose config using convenience function', () => {
      const config = {
        logger: {
          maxLogs: -1
        }
      };

      const diagnostics = diagnoseConfig(config);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });
});
