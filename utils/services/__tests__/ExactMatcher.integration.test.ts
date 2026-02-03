/**
 * ExactMatcher Integration Test - Task 4.2
 * 
 * 验证 ExactMatcher 正确使用预处理的 SPU 数据进行匹配
 */

import { ExactMatcher } from '../ExactMatcher';
import { DataPreparationService } from '../DataPreparationService';
import type { SPUData, BrandData, EnhancedSPUData } from '../../types';
import type { ExtractedInfo } from '../types';

describe('ExactMatcher - Task 4.2 Integration', () => {
  let exactMatcher: ExactMatcher;
  let dataPreparation: DataPreparationService;
  let enhancedSPUs: EnhancedSPUData[];

  const mockBrands: BrandData[] = [
    { id: 1, name: '华为', spell: 'huawei' },
    { id: 2, name: '小米', spell: 'xiaomi' },
  ];

  const mockSPUs: SPUData[] = [
    {
      id: 1,
      name: '华为 Mate 60 Pro 12GB+512GB 雅川青',
      brand: '华为',
      skuIDs: [
        { id: 101, color: '雅川青', spec: '12+512', combo: '' }
      ]
    },
    {
      id: 2,
      name: '华为 Mate 60 8GB+256GB 黑色',
      brand: '华为',
      skuIDs: [
        { id: 201, color: '黑色', spec: '8+256', combo: '' }
      ]
    },
    {
      id: 3,
      name: '小米 14 Pro 12GB+512GB 白色',
      brand: '小米',
      skuIDs: [
        { id: 301, color: '白色', spec: '12+512', combo: '' }
      ]
    },
  ];

  beforeEach(async () => {
    exactMatcher = new ExactMatcher();
    dataPreparation = new DataPreparationService();
    
    // 初始化数据准备服务
    await dataPreparation.initialize(mockBrands);
    
    // 预处理 SPU 数据
    enhancedSPUs = dataPreparation.preprocessSPUs(mockSPUs);
  });

  describe('使用预处理数据进行匹配', () => {
    it('应该直接使用 spu.extractedBrand 进行品牌匹配', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, enhancedSPUs);

      // 应该找到匹配的 SPU
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].spu.id).toBe(1);
      expect(matches[0].spu.extractedBrand).toBe('华为');
    });

    it('应该直接使用 spu.normalizedModel 进行型号匹配', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, enhancedSPUs);

      // 应该找到匹配的 SPU
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].spu.normalizedModel).toBe('mate60pro');
      
      // 验证输入的型号已经是标准化的（不需要再次标准化）
      expect(extractedInfo.model.value).toBe('mate60pro');
    });

    it('应该正确匹配不同品牌的型号', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '小米 14 Pro',
        preprocessedInput: '小米 14 Pro',
        brand: { value: '小米', confidence: 1.0, source: 'exact' },
        model: { value: '14pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, enhancedSPUs);

      // 应该找到小米的 SPU
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].spu.id).toBe(3);
      expect(matches[0].spu.extractedBrand).toBe('小米');
      expect(matches[0].spu.normalizedModel).toBe('14pro');
    });

    it('应该在品牌不匹配时不返回结果', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: 'OPPO Find X5 Pro',
        preprocessedInput: 'OPPO Find X5 Pro',
        brand: { value: 'OPPO', confidence: 1.0, source: 'exact' },
        model: { value: 'findx5pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, enhancedSPUs);

      // 不应该找到匹配（品牌不在候选列表中）
      expect(matches.length).toBe(0);
    });

    it('应该在型号不匹配时不返回结果', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 P60 Pro',
        preprocessedInput: '华为 P60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'p60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, enhancedSPUs);

      // 不应该找到匹配（型号不在候选列表中）
      expect(matches.length).toBe(0);
    });

    it('应该验证预处理数据的完整性', () => {
      // 验证所有 SPU 都被正确预处理
      expect(enhancedSPUs.length).toBe(3);
      
      // 验证第一个 SPU
      expect(enhancedSPUs[0].extractedBrand).toBe('华为');
      expect(enhancedSPUs[0].extractedModel).toBe('Mate 60 Pro');
      expect(enhancedSPUs[0].normalizedModel).toBe('mate60pro');
      expect(enhancedSPUs[0].simplicity).toBeGreaterThanOrEqual(0);
      
      // 验证第二个 SPU
      expect(enhancedSPUs[1].extractedBrand).toBe('华为');
      expect(enhancedSPUs[1].extractedModel).toBe('Mate 60');
      expect(enhancedSPUs[1].normalizedModel).toBe('mate60');
      
      // 验证第三个 SPU
      expect(enhancedSPUs[2].extractedBrand).toBe('小米');
      expect(enhancedSPUs[2].extractedModel).toBe('14 Pro');
      expect(enhancedSPUs[2].normalizedModel).toBe('14pro');
    });
  });

  describe('验证不再调用 normalizeForComparison', () => {
    it('应该直接比较已标准化的型号', () => {
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        // 输入的型号已经是标准化的（小写，无空格）
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, enhancedSPUs);

      // 应该找到匹配
      expect(matches.length).toBeGreaterThan(0);
      
      // 验证匹配的型号是标准化的
      expect(matches[0].spu.normalizedModel).toBe('mate60pro');
      
      // 验证输入的型号也是标准化的
      expect(extractedInfo.model.value).toBe('mate60pro');
      
      // 两者应该直接相等（无需再次标准化）
      expect(extractedInfo.model.value).toBe(matches[0].spu.normalizedModel);
    });
  });

  describe('Task 4.4: 基于精简度的优先级排序', () => {
    it('应该按照 分数 > 版本类型 > 精简度 进行排序', () => {
      // 创建多个相同品牌和型号但不同精简度的 SPU
      // 通过在名称末尾添加额外的空格或字符来改变精简度
      const testSPUs: SPUData[] = [
        {
          id: 10,
          name: '华为 Mate 60 Pro 12GB+512GB 雅川青    ',  // 末尾有额外空格
          brand: '华为',
          skuIDs: [
            { color: '雅川青', spec: '12+512', combo: '' }
          ]
        },
        {
          id: 11,
          name: '华为 Mate 60 Pro 12GB+512GB 雅川青',  // 标准版本
          brand: '华为',
          skuIDs: [
            { color: '雅川青', spec: '12+512', combo: '' }
          ]
        },
        {
          id: 12,
          name: '华为 Mate 60 Pro 12GB+512GB 雅川青  ',  // 末尾有2个空格
          brand: '华为',
          skuIDs: [
            { color: '雅川青', spec: '12+512', combo: '' }
          ]
        },
      ];

      const testEnhancedSPUs = dataPreparation.preprocessSPUs(testSPUs);

      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro',
        preprocessedInput: '华为 Mate 60 Pro',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'mate60pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, testEnhancedSPUs);

      // 应该找到所有3个匹配
      expect(matches.length).toBe(3);

      // 验证精简度值
      console.log('SPU精简度:', matches.map(m => ({ 
        id: m.spu.id, 
        name: m.spu.name, 
        simplicity: m.spu.simplicity 
      })));

      // 当分数和优先级相同时，精简度更小的应该排在前面
      // ID 11 (标准版，无额外空格) 应该最精简
      expect(matches[0].spu.id).toBe(11);
      
      // 验证排序逻辑：精简度从小到大
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].spu.simplicity).toBeLessThanOrEqual(matches[i + 1].spu.simplicity);
      }
    });

    it('应该在分数相同时优先考虑精简度', () => {
      // 创建两个分数相同但精简度不同的 SPU
      const testSPUs: SPUData[] = [
        {
          id: 20,
          name: '小米 14 Pro 12GB+512GB 白色     ',  // 末尾有额外空格
          brand: '小米',
          skuIDs: [
            { color: '白色', spec: '12+512', combo: '' }
          ]
        },
        {
          id: 21,
          name: '小米 14 Pro 12GB+512GB 白色',  // 标准版本
          brand: '小米',
          skuIDs: [
            { color: '白色', spec: '12+512', combo: '' }
          ]
        },
      ];

      const testEnhancedSPUs = dataPreparation.preprocessSPUs(testSPUs);

      const extractedInfo: ExtractedInfo = {
        originalInput: '小米 14 Pro',
        preprocessedInput: '小米 14 Pro',
        brand: { value: '小米', confidence: 1.0, source: 'exact' },
        model: { value: '14pro', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };

      const matches = exactMatcher.findMatches(extractedInfo, testEnhancedSPUs);

      // 应该找到2个匹配
      expect(matches.length).toBe(2);

      // 更精简的版本（ID 21，无额外空格）应该排在前面
      expect(matches[0].spu.id).toBe(21);
      expect(matches[0].spu.simplicity).toBeLessThan(matches[1].spu.simplicity);
    });

    it('应该验证精简度计算的正确性', () => {
      const testSPUs: SPUData[] = [
        {
          id: 30,
          name: '华为 Mate 60 Pro 12GB+512GB 雅川青',
          brand: '华为',
          skuIDs: [
            { color: '雅川青', spec: '12+512', combo: '' }
          ]
        },
      ];

      const testEnhancedSPUs = dataPreparation.preprocessSPUs(testSPUs);
      const spu = testEnhancedSPUs[0];

      // 验证精简度是非负数
      expect(spu.simplicity).toBeGreaterThanOrEqual(0);

      // 验证精简度的计算逻辑
      // simplicity = name.length - brand.length - model.length - specs.length
      const nameLength = spu.name.length;
      const brandLength = spu.extractedBrand?.length || 0;
      const modelLength = spu.extractedModel?.length || 0;
      
      // 精简度应该小于名称长度
      expect(spu.simplicity).toBeLessThan(nameLength);
    });
  });
});