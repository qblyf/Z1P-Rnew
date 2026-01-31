/**
 * MatchingOrchestrator 集成测试
 * 
 * Task 13: 创建MatchingOrchestrator
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { MatchingOrchestrator } from '../MatchingOrchestrator';
import type { SPUData, BrandData } from '../../types';

describe('MatchingOrchestrator', () => {
  let orchestrator: MatchingOrchestrator;
  let mockBrandList: BrandData[];
  let mockSPUList: SPUData[];
  
  beforeEach(async () => {
    orchestrator = new MatchingOrchestrator();
    
    // 模拟品牌列表
    mockBrandList = [
      { name: '华为', spell: 'HUAWEI', color: '#000000', order: 1 },
      { name: '小米', spell: 'XIAOMI', color: '#000000', order: 2 },
      { name: 'OPPO', spell: 'OPPO', color: '#000000', order: 3 },
      { name: 'vivo', spell: 'vivo', color: '#000000', order: 4 },
    ];
    
    // 模拟SPU列表
    mockSPUList = [
      {
        id: 1,
        name: '华为 Mate 60 Pro',
        brand: '华为',
        skuIDs: [
          { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
          { skuID: 102, color: '雅丹黑', spec: '12GB+1TB' },
        ],
      },
      {
        id: 2,
        name: '小米14 Pro',
        brand: '小米',
        skuIDs: [
          { skuID: 201, color: '钛金属', spec: '12GB+512GB' },
          { skuID: 202, color: '陶瓷白', spec: '16GB+1TB' },
        ],
      },
      {
        id: 3,
        name: 'OPPO Find X7 Pro',
        brand: 'OPPO',
        skuIDs: [
          { skuID: 301, color: '珍珠白', spec: '12GB+256GB' },
        ],
      },
    ];
    
    // 初始化协调器
    await orchestrator.initialize(mockBrandList, mockSPUList);
  });
  
  describe('initialization', () => {
    test('应该成功初始化协调器', async () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getDataPreparationService()).toBeDefined();
      expect(orchestrator.getPreprocessingService()).toBeDefined();
      expect(orchestrator.getInfoExtractor()).toBeDefined();
      expect(orchestrator.getSPUMatcher()).toBeDefined();
      expect(orchestrator.getSKUMatcher()).toBeDefined();
    });
  });
  
  describe('match', () => {
    test('应该成功初始化协调器', async () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getDataPreparationService()).toBeDefined();
      expect(orchestrator.getPreprocessingService()).toBeDefined();
      expect(orchestrator.getInfoExtractor()).toBeDefined();
      expect(orchestrator.getSPUMatcher()).toBeDefined();
      expect(orchestrator.getSKUMatcher()).toBeDefined();
    });
  });
  
  describe('batchMatch', () => {
    test('应该返回批量匹配结果对象', async () => {
      const inputs = [
        '华为 Mate 60 Pro',
        '小米14 Pro',
      ];
      
      const result = await orchestrator.batchMatch(inputs);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(2);
    });
  });
  
  describe('service access', () => {
    test('应该能访问所有服务', () => {
      expect(orchestrator.getDataPreparationService()).toBeDefined();
      expect(orchestrator.getPreprocessingService()).toBeDefined();
      expect(orchestrator.getInfoExtractor()).toBeDefined();
      expect(orchestrator.getSPUMatcher()).toBeDefined();
      expect(orchestrator.getSKUMatcher()).toBeDefined();
    });
  });
});
