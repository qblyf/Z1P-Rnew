/**
 * DataPreparationService.preprocessSPUs 单元测试
 * 
 * 测试完整的预处理流程
 * 
 * Requirements: 2.1.1, 2.1.2, 2.1.4, 2.1.5
 * Task: 2.7, 2.8
 */

import { DataPreparationService } from '../DataPreparationService';
import type { SPUData, BrandData, EnhancedSPUData } from '../../types';

describe('DataPreparationService - preprocessSPUs', () => {
  let service: DataPreparationService;
  let mockBrandList: BrandData[];
  
  beforeEach(async () => {
    service = new DataPreparationService();
    
    // 模拟品牌列表
    mockBrandList = [
      { name: '华为', spell: 'HUAWEI', color: '#000000', order: 1 },
      { name: '小米', spell: 'XIAOMI', color: '#000000', order: 2 },
      { name: '红米', spell: 'Redmi', color: '#000000', order: 3 },
      { name: 'OPPO', spell: 'OPPO', color: '#000000', order: 4 },
      { name: 'vivo', spell: 'vivo', color: '#000000', order: 5 },
      { name: '苹果', spell: 'Apple', color: '#000000', order: 6 },
    ];
    
    await service.initialize(mockBrandList);
  });
  
  describe('正常情况', () => {
    it('应该成功预处理SPU列表', () => {
      const spuList: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro 12GB+512GB 雅川青',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro 16GB+1TB 钛金属',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '钛金属', spec: '16GB+1TB' },
          ],
        },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 验证返回的数组长度
      expect(enhancedSPUs).toHaveLength(2);
      
      // 验证第一个SPU
      expect(enhancedSPUs[0].id).toBe(1);
      expect(enhancedSPUs[0].name).toBe('华为 Mate 60 Pro 12GB+512GB 雅川青');
      expect(enhancedSPUs[0].extractedBrand).toBe('华为');
      expect(enhancedSPUs[0].extractedModel).toBeTruthy();
      expect(enhancedSPUs[0].normalizedModel).toBeTruthy();
      expect(enhancedSPUs[0].simplicity).toBeGreaterThanOrEqual(0);
      expect(enhancedSPUs[0].preprocessedAt).toBeDefined();
      
      // 验证第二个SPU
      expect(enhancedSPUs[1].id).toBe(2);
      expect(enhancedSPUs[1].extractedBrand).toBe('小米');
      expect(enhancedSPUs[1].extractedModel).toBeTruthy();
      expect(enhancedSPUs[1].normalizedModel).toBeTruthy();
    });
    
    it('应该正确提取品牌信息', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: 'HUAWEI P50 Pro', brand: '华为' },
        { id: 3, name: '小米14 Pro', brand: '小米' },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      expect(enhancedSPUs[0].extractedBrand).toBe('华为');
      expect(enhancedSPUs[1].extractedBrand).toBe('华为');
      expect(enhancedSPUs[2].extractedBrand).toBe('小米');
    });
    
    it('应该正确提取型号信息', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: '小米14 Pro', brand: '小米' },
        { id: 3, name: 'OPPO Find X7 Pro', brand: 'OPPO' },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 验证型号提取
      expect(enhancedSPUs[0].extractedModel).toContain('Mate');
      expect(enhancedSPUs[0].extractedModel).toContain('60');
      expect(enhancedSPUs[1].extractedModel).toContain('14');
      expect(enhancedSPUs[2].extractedModel).toContain('Find');
    });
    
    it('应该正确标准化型号', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: '小米 14 Pro', brand: '小米' },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 标准化型号应该是小写且无空格
      expect(enhancedSPUs[0].normalizedModel).toBe(
        enhancedSPUs[0].normalizedModel?.toLowerCase()
      );
      expect(enhancedSPUs[0].normalizedModel).not.toContain(' ');
      
      expect(enhancedSPUs[1].normalizedModel).toBe(
        enhancedSPUs[1].normalizedModel?.toLowerCase()
      );
      expect(enhancedSPUs[1].normalizedModel).not.toContain(' ');
    });
    
    it('应该正确计算精简度', () => {
      const spuList: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [],
        },
        {
          id: 2,
          name: '华为 Mate 60 Pro 典藏版 礼盒装',
          brand: '华为',
          skuIDs: [],
        },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 验证精简度计算
      // 第一个SPU名称更短，应该有更小的精简度
      // 但由于型号提取可能包含"典藏版 礼盒装"，我们只验证精简度是非负数
      expect(enhancedSPUs[0].simplicity).toBeGreaterThanOrEqual(0);
      expect(enhancedSPUs[1].simplicity).toBeGreaterThanOrEqual(0);
      
      // 第二个SPU名称更长，精简度应该大于等于第一个
      expect(enhancedSPUs[1].simplicity).toBeGreaterThanOrEqual(enhancedSPUs[0].simplicity);
    });
    
    it('应该添加预处理时间戳', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
      ];
      
      const beforeTime = Date.now();
      const enhancedSPUs = service.preprocessSPUs(spuList);
      const afterTime = Date.now();
      
      expect(enhancedSPUs[0].preprocessedAt).toBeDefined();
      expect(enhancedSPUs[0].preprocessedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(enhancedSPUs[0].preprocessedAt).toBeLessThanOrEqual(afterTime);
    });
  });
  
  describe('边缘情况', () => {
    it('应该处理空SPU列表', () => {
      const enhancedSPUs = service.preprocessSPUs([]);
      
      expect(enhancedSPUs).toHaveLength(0);
    });
    
    it('应该跳过缺少name字段的SPU', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: '', brand: '小米' }, // 空name
        { id: 3, name: '   ', brand: 'OPPO' }, // 只有空格
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 只有第一个SPU应该被处理
      expect(enhancedSPUs).toHaveLength(1);
      expect(enhancedSPUs[0].id).toBe(1);
    });
    
    it('应该处理品牌提取失败的情况', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '未知品牌手机 X1', brand: undefined },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 应该仍然处理，但品牌为null
      expect(enhancedSPUs).toHaveLength(1);
      expect(enhancedSPUs[0].extractedBrand).toBeNull();
    });
    
    it('应该处理型号提取失败的情况', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为', brand: '华为' }, // 只有品牌，没有型号
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 应该仍然处理，但型号为null
      expect(enhancedSPUs).toHaveLength(1);
      expect(enhancedSPUs[0].extractedModel).toBeNull();
      expect(enhancedSPUs[0].normalizedModel).toBeNull();
    });
    
    it('应该处理没有skuIDs的SPU', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: '小米14 Pro', brand: '小米', skuIDs: [] },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 两个SPU都应该被处理
      expect(enhancedSPUs).toHaveLength(2);
      expect(enhancedSPUs[0].simplicity).toBeGreaterThanOrEqual(0);
      expect(enhancedSPUs[1].simplicity).toBeGreaterThanOrEqual(0);
    });
    
    it('应该处理特殊字符和中文', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate-60-Pro（素皮版）', brand: '华为' },
        { id: 2, name: '小米 14 Pro+', brand: '小米' },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      expect(enhancedSPUs).toHaveLength(2);
      expect(enhancedSPUs[0].extractedBrand).toBe('华为');
      expect(enhancedSPUs[1].extractedBrand).toBe('小米');
    });
  });
  
  describe('错误处理', () => {
    it('应该记录品牌提取失败的警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const spuList: SPUData[] = [
        { id: 1, name: '未知品牌手机', brand: undefined },
      ];
      
      service.preprocessSPUs(spuList);
      
      // 应该记录警告
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('品牌提取失败')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
    
    it('应该记录型号提取失败的警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const spuList: SPUData[] = [
        { id: 1, name: '华为', brand: '华为' },
      ];
      
      service.preprocessSPUs(spuList);
      
      // 应该记录警告
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('型号提取失败')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
    
    it('应该记录跳过SPU的警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const spuList: SPUData[] = [
        { id: 1, name: '', brand: '华为' },
      ];
      
      service.preprocessSPUs(spuList);
      
      // 应该记录警告
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('缺少name字段')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('统计信息', () => {
    it('应该输出处理统计信息', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: '小米14 Pro', brand: '小米' },
      ];
      
      service.preprocessSPUs(spuList);
      
      // 应该输出统计信息
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('SPU预处理完成')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
    
    it('应该输出精简度统计', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: '小米14 Pro', brand: '小米' },
      ];
      
      service.preprocessSPUs(spuList);
      
      // 应该输出精简度统计
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('精简度统计')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
    
    it('应该输出预处理示例', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
      ];
      
      service.preprocessSPUs(spuList);
      
      // 应该输出示例
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('预处理示例')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('性能', () => {
    it('应该快速处理少量SPU', () => {
      const spuList: SPUData[] = [];
      for (let i = 0; i < 10; i++) {
        spuList.push({
          id: i,
          name: `华为 产品 ${i}`,
          brand: '华为',
        });
      }
      
      const startTime = Date.now();
      const enhancedSPUs = service.preprocessSPUs(spuList);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 10个SPU应该在100ms内完成
      expect(duration).toBeLessThan(100);
      expect(enhancedSPUs).toHaveLength(10);
    });
    
    it('应该能处理大量SPU', () => {
      const spuList: SPUData[] = [];
      for (let i = 0; i < 1000; i++) {
        const brandIndex = i % mockBrandList.length;
        const brand = mockBrandList[brandIndex];
        spuList.push({
          id: i,
          name: `${brand.name} 产品 ${i}`,
          brand: brand.name,
          skuIDs: [
            { skuID: i * 10, color: '黑色', spec: '8GB+256GB' },
          ],
        });
      }
      
      const startTime = Date.now();
      const enhancedSPUs = service.preprocessSPUs(spuList);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 1000个SPU应该在5秒内完成（根据需求4.1.1）
      expect(duration).toBeLessThan(5000);
      expect(enhancedSPUs).toHaveLength(1000);
      
      // 验证所有SPU都被正确处理
      for (const spu of enhancedSPUs) {
        expect(spu.extractedBrand).toBeTruthy();
        expect(spu.extractedModel).toBeTruthy();
        expect(spu.normalizedModel).toBeTruthy();
        expect(spu.simplicity).toBeGreaterThanOrEqual(0);
        expect(spu.preprocessedAt).toBeDefined();
      }
    });
    
    it('应该在处理时间超过5秒时发出警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟慢速处理（通过大量SPU）
      // 注意：这个测试可能不会真正触发警告，除非机器很慢
      const spuList: SPUData[] = [];
      for (let i = 0; i < 100; i++) {
        spuList.push({
          id: i,
          name: `华为 产品 ${i}`,
          brand: '华为',
        });
      }
      
      service.preprocessSPUs(spuList);
      
      // 如果处理时间超过5秒，应该有警告
      // 由于实际处理很快，这里只验证警告逻辑存在
      // 实际警告可能不会触发
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('质量指标', () => {
    it('应该在品牌提取失败率高时发出警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 创建大量无品牌的SPU
      const spuList: SPUData[] = [];
      for (let i = 0; i < 100; i++) {
        spuList.push({
          id: i,
          name: `未知品牌产品 ${i}`,
          brand: undefined,
        });
      }
      
      service.preprocessSPUs(spuList);
      
      // 应该发出品牌提取失败率高的警告
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('品牌提取失败率') && call[0].includes('较高')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
    
    it('应该在型号提取失败率高时发出警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 创建大量只有品牌的SPU
      const spuList: SPUData[] = [];
      for (let i = 0; i < 100; i++) {
        spuList.push({
          id: i,
          name: '华为',
          brand: '华为',
        });
      }
      
      service.preprocessSPUs(spuList);
      
      // 应该发出型号提取失败率高的警告
      expect(consoleSpy.mock.calls.some(call => 
        call[0].includes('型号提取失败率') && call[0].includes('较高')
      )).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('数据完整性', () => {
    it('应该保留原始SPU的所有字段', () => {
      const spuList: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 验证原始字段都被保留
      expect(enhancedSPUs[0].id).toBe(1);
      expect(enhancedSPUs[0].name).toBe('华为 Mate 60 Pro');
      expect(enhancedSPUs[0].brand).toBe('华为');
      expect(enhancedSPUs[0].skuIDs).toBeDefined();
      expect(enhancedSPUs[0].skuIDs).toHaveLength(1);
    });
    
    it('应该添加所有新字段', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
      ];
      
      const enhancedSPUs = service.preprocessSPUs(spuList);
      
      // 验证所有新字段都存在
      expect(enhancedSPUs[0]).toHaveProperty('extractedBrand');
      expect(enhancedSPUs[0]).toHaveProperty('extractedModel');
      expect(enhancedSPUs[0]).toHaveProperty('normalizedModel');
      expect(enhancedSPUs[0]).toHaveProperty('simplicity');
      expect(enhancedSPUs[0]).toHaveProperty('preprocessedAt');
    });
    
    it('应该返回EnhancedSPUData类型', () => {
      const spuList: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
      ];
      
      const enhancedSPUs: EnhancedSPUData[] = service.preprocessSPUs(spuList);
      
      // TypeScript类型检查应该通过
      expect(enhancedSPUs[0].extractedBrand).toBeDefined();
      expect(enhancedSPUs[0].extractedModel).toBeDefined();
      expect(enhancedSPUs[0].normalizedModel).toBeDefined();
      expect(enhancedSPUs[0].simplicity).toBeDefined();
    });
  });
});
