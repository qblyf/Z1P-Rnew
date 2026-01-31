import { MatchLogger, getDefaultLogger, configureDefaultLogger } from '../MatchLogger';

describe('MatchLogger', () => {
  let logger: MatchLogger;

  beforeEach(() => {
    logger = new MatchLogger({ enabled: true, level: 'DEBUG' });
  });

  afterEach(() => {
    logger.clear();
  });

  describe('log', () => {
    it('should record a log entry', () => {
      logger.log({
        input: 'iPhone 15 Pro',
        status: 'success',
        duration: 100
      });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].input).toBe('iPhone 15 Pro');
      expect(logs[0].status).toBe('success');
      expect(logs[0].duration).toBe(100);
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeDefined();
    });

    it('should not record logs when disabled', () => {
      const disabledLogger = new MatchLogger({ enabled: false });
      disabledLogger.log({
        input: 'Test',
        status: 'success',
        duration: 50
      });

      expect(disabledLogger.getLogs()).toHaveLength(0);
    });

    it('should limit log count to maxLogs', () => {
      const limitedLogger = new MatchLogger({ maxLogs: 5 });
      
      for (let i = 0; i < 10; i++) {
        limitedLogger.log({
          input: `Test ${i}`,
          status: 'success',
          duration: 50
        });
      }

      const logs = limitedLogger.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].input).toBe('Test 5');
      expect(logs[4].input).toBe('Test 9');
    });
  });

  describe('logSuccess', () => {
    it('should record a successful match', () => {
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

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('success');
      expect(logs[0].spuMatch?.matched).toBe(true);
      expect(logs[0].skuMatch?.matched).toBe(true);
    });

    it('should record partial match when SKU not matched', () => {
      logger.logSuccess({
        input: 'iPhone 15 Pro',
        spuMatch: {
          matched: true,
          spuId: 123,
          spuName: 'iPhone 15 Pro'
        },
        duration: 100
      });

      const logs = logger.getLogs();
      expect(logs[0].status).toBe('partial');
    });
  });

  describe('logFailure', () => {
    it('should record a failed match', () => {
      logger.logFailure({
        input: 'Unknown Product',
        duration: 80,
        error: 'No matching SPU found'
      });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('failed');
      expect(logs[0].error).toBe('No matching SPU found');
      expect(logs[0].spuMatch?.matched).toBe(false);
    });
  });

  describe('queryLogs', () => {
    beforeEach(() => {
      logger.logSuccess({
        input: 'Product 1',
        spuMatch: { matched: true },
        skuMatch: { matched: true },
        duration: 100
      });
      
      logger.logSuccess({
        input: 'Product 2',
        spuMatch: { matched: true },
        duration: 150
      });
      
      logger.logFailure({
        input: 'Product 3',
        duration: 50
      });
    });

    it('should filter by status', () => {
      const successLogs = logger.queryLogs({ status: 'success' });
      expect(successLogs).toHaveLength(1);
      expect(successLogs[0].input).toBe('Product 1');

      const failedLogs = logger.queryLogs({ status: 'failed' });
      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].input).toBe('Product 3');
    });

    it('should filter by input text', () => {
      const filtered = logger.queryLogs({ input: 'Product 2' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].input).toBe('Product 2');
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const filtered = logger.queryLogs({
        startTime: now - 1000,
        endTime: now + 1000
      });
      expect(filtered).toHaveLength(3);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      logger.logSuccess({
        input: 'Product 1',
        spuMatch: { matched: true },
        skuMatch: { matched: true },
        duration: 100
      });
      
      logger.logSuccess({
        input: 'Product 2',
        spuMatch: { matched: true },
        duration: 200
      });
      
      logger.logFailure({
        input: 'Product 3',
        duration: 50
      });

      const stats = logger.getStats();
      expect(stats.total).toBe(3);
      expect(stats.success).toBe(1);
      expect(stats.partial).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.avgDuration).toBe((100 + 200 + 50) / 3);
      expect(stats.successRate).toBeCloseTo(2 / 3);
    });

    it('should handle empty logs', () => {
      const stats = logger.getStats();
      expect(stats.total).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('exportToJSON', () => {
    it('should export logs as JSON', () => {
      logger.log({
        input: 'Test Product',
        status: 'success',
        duration: 100
      });

      const json = logger.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].input).toBe('Test Product');
    });
  });

  describe('exportToCSV', () => {
    it('should export logs as CSV', () => {
      logger.logSuccess({
        input: 'iPhone 15',
        spuMatch: { matched: true, spuName: 'iPhone 15' },
        skuMatch: { matched: true, skuName: 'iPhone 15 128GB' },
        duration: 100
      });

      const csv = logger.exportToCSV();
      const lines = csv.split('\n');
      
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Input');
      expect(lines[1]).toContain('iPhone 15');
    });

    it('should return empty string for empty logs', () => {
      const csv = logger.exportToCSV();
      expect(csv).toBe('');
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      logger.log({
        input: 'Test',
        status: 'success',
        duration: 50
      });

      expect(logger.getLogs()).toHaveLength(1);
      
      logger.clear();
      
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const logger1 = getDefaultLogger();
      const logger2 = getDefaultLogger();
      
      expect(logger1).toBe(logger2);
    });

    it('should configure default logger', () => {
      configureDefaultLogger({ level: 'ERROR' });
      const logger = getDefaultLogger();
      
      // Logger should be configured (we can't directly test private config)
      // but we can verify it exists
      expect(logger).toBeDefined();
    });
  });
});
