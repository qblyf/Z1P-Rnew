import { DebugTools, getDefaultDebugTools, configureDefaultDebugTools } from '../DebugTools';
import { MatchLogger } from '../MatchLogger';
import { PerformanceMetrics } from '../PerformanceMetrics';

describe('DebugTools', () => {
  let debugTools: DebugTools;

  beforeEach(() => {
    debugTools = new DebugTools({ enabled: true, logToConsole: false });
  });

  describe('debug session', () => {
    it('should start and end debug session', () => {
      debugTools.startDebugSession('Test input');
      
      debugTools.logStep({
        name: 'step1',
        input: 'test',
        output: 'result',
        duration: 50,
        success: true
      });
      
      const result = debugTools.endDebugSession({
        status: 'success',
        spuMatched: true,
        skuMatched: true
      });
      
      expect(result).not.toBeNull();
      expect(result!.input).toBe('Test input');
      expect(result!.steps).toHaveLength(1);
      expect(result!.result.status).toBe('success');
      expect(result!.performance.totalDuration).toBe(50);
    });

    it('should not record when disabled', () => {
      const disabledTools = new DebugTools({ enabled: false });
      
      disabledTools.startDebugSession('Test');
      disabledTools.logStep({
        name: 'step1',
        input: 'test',
        output: 'result',
        duration: 50,
        success: true
      });
      
      const result = disabledTools.endDebugSession({
        status: 'success',
        spuMatched: true,
        skuMatched: true
      });
      
      expect(result).toBeNull();
    });

    it('should detect performance issues', () => {
      debugTools.startDebugSession('Test input');
      
      debugTools.logStep({
        name: 'slow-step',
        input: 'test',
        output: 'result',
        duration: 600,
        success: true
      });
      
      const result = debugTools.endDebugSession({
        status: 'success',
        spuMatched: true,
        skuMatched: true
      });
      
      expect(result!.issues.length).toBeGreaterThan(0);
      expect(result!.issues.some(i => i.includes('耗时过长'))).toBe(true);
    });

    it('should detect failed steps', () => {
      debugTools.startDebugSession('Test input');
      
      debugTools.logStep({
        name: 'failed-step',
        input: 'test',
        output: null,
        duration: 50,
        success: false,
        error: 'Test error'
      });
      
      const result = debugTools.endDebugSession({
        status: 'failed',
        spuMatched: false,
        skuMatched: false
      });
      
      expect(result!.issues.some(i => i.includes('步骤失败'))).toBe(true);
    });

    it('should detect warnings', () => {
      debugTools.startDebugSession('Test input');
      
      debugTools.logStep({
        name: 'warning-step',
        input: 'test',
        output: 'result',
        duration: 50,
        success: true,
        warnings: ['Warning 1', 'Warning 2']
      });
      
      const result = debugTools.endDebugSession({
        status: 'success',
        spuMatched: true,
        skuMatched: true
      });
      
      expect(result!.issues.some(i => i.includes('警告'))).toBe(true);
    });
  });

  describe('visualizeMatchLog', () => {
    it('should visualize match log', () => {
      const log = {
        id: 'test-123',
        timestamp: Date.now(),
        input: 'iPhone 15 Pro',
        status: 'success' as const,
        duration: 150,
        extractedInfo: {
          brand: 'Apple',
          model: 'iPhone 15 Pro'
        },
        spuMatch: {
          matched: true,
          spuId: 123,
          spuName: 'iPhone 15 Pro',
          score: 0.95,
          matchType: 'exact' as const
        },
        skuMatch: {
          matched: true,
          skuId: 456,
          skuName: 'iPhone 15 Pro 256GB',
          score: 0.98
        }
      };
      
      const visualization = debugTools.visualizeMatchLog(log);
      
      expect(visualization).toContain('iPhone 15 Pro');
      expect(visualization).toContain('success');
      expect(visualization).toContain('Apple');
      expect(visualization).toContain('✅');
    });

    it('should handle failed match', () => {
      const log = {
        id: 'test-456',
        timestamp: Date.now(),
        input: 'Unknown Product',
        status: 'failed' as const,
        duration: 80,
        error: 'No matching SPU found'
      };
      
      const visualization = debugTools.visualizeMatchLog(log);
      
      expect(visualization).toContain('Unknown Product');
      expect(visualization).toContain('failed');
      expect(visualization).toContain('No matching SPU found');
      expect(visualization).toContain('❌');
    });
  });

  describe('visualizePerformanceReport', () => {
    it('should visualize performance report', () => {
      const report = {
        overall: {
          totalMatches: 100,
          totalDuration: 15000,
          avgDuration: 150,
          minDuration: 50,
          maxDuration: 500,
          medianDuration: 140,
          p95Duration: 300,
          p99Duration: 450
        },
        phases: [
          {
            phase: 'preprocessing',
            count: 100,
            totalDuration: 5000,
            avgDuration: 50,
            minDuration: 20,
            maxDuration: 100,
            medianDuration: 45,
            p95Duration: 80,
            p99Duration: 95
          }
        ],
        timeRange: {
          start: Date.now() - 3600000,
          end: Date.now()
        },
        generatedAt: Date.now()
      };
      
      const visualization = debugTools.visualizePerformanceReport(report);
      
      expect(visualization).toContain('性能报告');
      expect(visualization).toContain('100');
      expect(visualization).toContain('150');
      expect(visualization).toContain('preprocessing');
    });
  });

  describe('compareMatches', () => {
    it('should compare two match logs', () => {
      const log1 = {
        id: 'log1',
        timestamp: Date.now(),
        input: 'iPhone 15',
        status: 'success' as const,
        duration: 100,
        spuMatch: {
          matched: true,
          spuId: 123,
          spuName: 'iPhone 15'
        },
        skuMatch: {
          matched: true,
          skuId: 456,
          skuName: 'iPhone 15 128GB'
        }
      };
      
      const log2 = {
        id: 'log2',
        timestamp: Date.now(),
        input: 'iPhone 15',
        status: 'success' as const,
        duration: 150,
        spuMatch: {
          matched: true,
          spuId: 123,
          spuName: 'iPhone 15'
        },
        skuMatch: {
          matched: true,
          skuId: 789,
          skuName: 'iPhone 15 256GB'
        }
      };
      
      const comparison = debugTools.compareMatches(log1, log2);
      
      expect(comparison).toContain('匹配结果对比');
      expect(comparison).toContain('iPhone 15');
      expect(comparison).toContain('100');
      expect(comparison).toContain('150');
      expect(comparison).toContain('50.00ms'); // difference
    });
  });

  describe('generateDebugReport', () => {
    it('should generate comprehensive debug report', () => {
      const logger = new MatchLogger({ enabled: true });
      const metrics = new PerformanceMetrics({ enabled: true });
      
      // Add some test data
      logger.logSuccess({
        input: 'Test 1',
        spuMatch: { matched: true },
        skuMatch: { matched: true },
        duration: 100
      });
      
      logger.logFailure({
        input: 'Test 2',
        duration: 50,
        error: 'Test error'
      });
      
      metrics.recordMetric({
        name: 'total',
        duration: 100,
        timestamp: Date.now()
      });
      
      const report = debugTools.generateDebugReport(logger, metrics);
      
      expect(report).toContain('调试报告');
      expect(report).toContain('匹配统计');
      expect(report).toContain('性能摘要');
      expect(report).toContain('最近失败的匹配');
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const tools1 = getDefaultDebugTools();
      const tools2 = getDefaultDebugTools();
      
      expect(tools1).toBe(tools2);
    });

    it('should configure default debug tools', () => {
      configureDefaultDebugTools({ enabled: true, verbose: true });
      const tools = getDefaultDebugTools();
      
      expect(tools).toBeDefined();
    });
  });
});
