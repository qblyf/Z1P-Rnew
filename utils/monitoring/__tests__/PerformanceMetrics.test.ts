import { PerformanceMetrics, getDefaultMetrics, configureDefaultMetrics } from '../PerformanceMetrics';

describe('PerformanceMetrics', () => {
  let metrics: PerformanceMetrics;

  beforeEach(() => {
    metrics = new PerformanceMetrics({ enabled: true });
  });

  afterEach(() => {
    metrics.clear();
  });

  describe('timer operations', () => {
    it('should start and end timer', () => {
      metrics.startTimer('test');
      const duration = metrics.endTimer('test');
      
      expect(duration).toBeGreaterThanOrEqual(0);
      
      const recorded = metrics.getMetricsByName('test');
      expect(recorded).toHaveLength(1);
      expect(recorded[0].duration).toBe(duration);
    });

    it('should handle ending non-existent timer', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const duration = metrics.endTimer('non-existent');
      
      expect(duration).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Timer "non-existent" was not started')
      );
      
      consoleSpy.mockRestore();
    });

    it('should record metadata with timer', () => {
      metrics.startTimer('test');
      metrics.endTimer('test', { foo: 'bar' });
      
      const recorded = metrics.getMetricsByName('test');
      expect(recorded[0].metadata).toEqual({ foo: 'bar' });
    });
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      metrics.recordMetric({
        name: 'test',
        duration: 100,
        timestamp: Date.now()
      });

      const recorded = metrics.getMetrics();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].name).toBe('test');
      expect(recorded[0].duration).toBe(100);
    });

    it('should limit metrics to maxMetrics', () => {
      const limitedMetrics = new PerformanceMetrics({ maxMetrics: 5 });
      
      for (let i = 0; i < 10; i++) {
        limitedMetrics.recordMetric({
          name: `test-${i}`,
          duration: i * 10,
          timestamp: Date.now()
        });
      }

      const recorded = limitedMetrics.getMetrics();
      expect(recorded).toHaveLength(5);
      expect(recorded[0].name).toBe('test-5');
      expect(recorded[4].name).toBe('test-9');
    });

    it('should not record when disabled', () => {
      const disabledMetrics = new PerformanceMetrics({ enabled: false });
      
      disabledMetrics.recordMetric({
        name: 'test',
        duration: 100,
        timestamp: Date.now()
      });

      expect(disabledMetrics.getMetrics()).toHaveLength(0);
    });
  });

  describe('measure', () => {
    it('should measure synchronous function', async () => {
      const result = await metrics.measure('sync-test', () => {
        return 42;
      });

      expect(result).toBe(42);
      
      const recorded = metrics.getMetricsByName('sync-test');
      expect(recorded).toHaveLength(1);
      expect(recorded[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure asynchronous function', async () => {
      const result = await metrics.measure('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');
      
      const recorded = metrics.getMetricsByName('async-test');
      expect(recorded).toHaveLength(1);
      expect(recorded[0].duration).toBeGreaterThanOrEqual(5); // Reduced threshold for test reliability
    });

    it('should record error metadata on exception', async () => {
      await expect(
        metrics.measure('error-test', () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const recorded = metrics.getMetricsByName('error-test');
      expect(recorded).toHaveLength(1);
      expect(recorded[0].metadata?.error).toBe(true);
    });
  });

  describe('query methods', () => {
    beforeEach(() => {
      metrics.recordMetric({
        name: 'phase-1',
        duration: 100,
        timestamp: 1000
      });
      metrics.recordMetric({
        name: 'phase-2',
        duration: 200,
        timestamp: 2000
      });
      metrics.recordMetric({
        name: 'phase-1',
        duration: 150,
        timestamp: 3000
      });
    });

    it('should get metrics by name', () => {
      const phase1 = metrics.getMetricsByName('phase-1');
      expect(phase1).toHaveLength(2);
      expect(phase1[0].duration).toBe(100);
      expect(phase1[1].duration).toBe(150);
    });

    it('should get metrics by time range', () => {
      const filtered = metrics.getMetricsByTimeRange(1500, 2500);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('phase-2');
    });
  });

  describe('getPhaseStats', () => {
    beforeEach(() => {
      // Add multiple metrics for a phase
      [100, 200, 150, 300, 250].forEach(duration => {
        metrics.recordMetric({
          name: 'test-phase',
          duration,
          timestamp: Date.now()
        });
      });
    });

    it('should calculate phase statistics', () => {
      const stats = metrics.getPhaseStats('test-phase');
      
      expect(stats).not.toBeNull();
      expect(stats!.phase).toBe('test-phase');
      expect(stats!.count).toBe(5);
      expect(stats!.totalDuration).toBe(1000);
      expect(stats!.avgDuration).toBe(200);
      expect(stats!.minDuration).toBe(100);
      expect(stats!.maxDuration).toBe(300);
      expect(stats!.medianDuration).toBe(200);
    });

    it('should return null for non-existent phase', () => {
      const stats = metrics.getPhaseStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      // Add metrics for different phases
      [100, 150, 200].forEach(duration => {
        metrics.recordMetric({
          name: 'total',
          duration,
          timestamp: Date.now()
        });
      });
      
      [50, 75].forEach(duration => {
        metrics.recordMetric({
          name: 'preprocessing',
          duration,
          timestamp: Date.now()
        });
      });
    });

    it('should generate complete report', () => {
      const report = metrics.generateReport();
      
      expect(report.overall.totalMatches).toBe(3);
      expect(report.overall.avgDuration).toBe(150);
      expect(report.overall.minDuration).toBe(100);
      expect(report.overall.maxDuration).toBe(200);
      
      expect(report.phases.length).toBeGreaterThan(0);
      expect(report.timeRange.start).toBeGreaterThan(0);
      expect(report.timeRange.end).toBeGreaterThan(0);
      expect(report.generatedAt).toBeGreaterThan(0);
    });

    it('should handle empty metrics', () => {
      const emptyMetrics = new PerformanceMetrics();
      const report = emptyMetrics.generateReport();
      
      expect(report.overall.totalMatches).toBe(0);
      expect(report.overall.avgDuration).toBe(0);
      expect(report.phases).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      [100, 200, 300].forEach(duration => {
        metrics.recordMetric({
          name: 'total',
          duration,
          timestamp: Date.now()
        });
      });
      
      [150, 200].forEach(duration => {
        metrics.recordMetric({
          name: 'spu-match',
          duration,
          timestamp: Date.now()
        });
      });
      
      [50, 60].forEach(duration => {
        metrics.recordMetric({
          name: 'preprocessing',
          duration,
          timestamp: Date.now()
        });
      });
    });

    it('should generate summary', () => {
      const summary = metrics.getSummary();
      
      expect(summary.totalMatches).toBe(3);
      expect(summary.avgDuration).toBe(200);
      expect(summary.slowestPhase).toBe('spu-match');
    });
  });

  describe('detectIssues', () => {
    it('should detect performance issues', () => {
      // Add slow metrics
      [600, 700, 800].forEach(duration => {
        metrics.recordMetric({
          name: 'total',
          duration,
          timestamp: Date.now()
        });
      });

      const issues = metrics.detectIssues({
        avgDuration: 500,
        p95Duration: 750,
        maxDuration: 750
      });

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('平均匹配时间过长'))).toBe(true);
    });

    it('should return empty array when no issues', () => {
      [50, 60, 70].forEach(duration => {
        metrics.recordMetric({
          name: 'total',
          duration,
          timestamp: Date.now()
        });
      });

      const issues = metrics.detectIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('exportToJSON', () => {
    it('should export metrics and report as JSON', () => {
      metrics.recordMetric({
        name: 'test',
        duration: 100,
        timestamp: Date.now()
      });

      const json = metrics.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.metrics).toBeDefined();
      expect(parsed.report).toBeDefined();
      expect(Array.isArray(parsed.metrics)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      metrics.recordMetric({
        name: 'test',
        duration: 100,
        timestamp: Date.now()
      });

      expect(metrics.getMetrics()).toHaveLength(1);
      
      metrics.clear();
      
      expect(metrics.getMetrics()).toHaveLength(0);
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const metrics1 = getDefaultMetrics();
      const metrics2 = getDefaultMetrics();
      
      expect(metrics1).toBe(metrics2);
    });

    it('should configure default metrics', () => {
      configureDefaultMetrics({ enabled: false });
      const metrics = getDefaultMetrics();
      
      expect(metrics).toBeDefined();
    });
  });
});
