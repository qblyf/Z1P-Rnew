/**
 * 品牌索引构建验证测试
 * 
 * 任务: 10.1 验证品牌索引构建
 * 需求: 2.1.2, 2.4.3
 * 
 * 验证内容：
 * - 确认品牌索引正确构建
 * - 确认支持中文和拼音双向索引
 * - 确认索引统计信息正确
 */

import { DataPreparationService } from '../DataPreparationService';
import type { SPUData, BrandData } from '../../types';

describe('任务 10.1: 品牌索引构建验证', () => {
  let service: DataPreparationService;
  
  // 模拟品牌数据
  const mockBrandList: BrandData[] = [
    { name: '华为', color: '#FF0000', spell: 'huawei', order: 1 },
    { name: '小米', color: '#FF6600', spell: 'xiaomi', order: 2 },
    { name: 'OPPO', color: '#00AA00', spell: 'oppo', order: 3 },
    { name: 'vivo', color: '#0066FF', spell: 'vivo', order: 4 },
    { name: '红米', color: '#FF3333', spell: 'redmi', order: 5 },
    { name: 'Apple', color: '#000000', spell: 'apple', order: 6 },
  ];
  
  // 模拟SPU数据
  const mockSPUList: SPUData[] = [
    {
      id: 1,
      name: '华为 Mate 60 Pro 12GB+512GB 雅川青',
      brand: '华为',
      skuIDs: [
        { skuID: 101, color: '雅川青', spec: '12+512' }
      ]
    },
    {
      id: 2,
      name: '华为 P60 Pro 8GB+256GB 洛可可白',
      brand: '华为',
      skuIDs: [
        { skuID: 201, color: '洛可可白', spec: '8+256' }
      ]
    },
    {
      id: 3,
      name: '小米 14 Pro 16GB+1TB 钛金属',
      brand: '小米',
      skuIDs: [
        { skuID: 301, color: '钛金属', spec: '16+1024' }
      ]
    },
    {
      id: 4,
      name: 'OPPO Find X7 Ultra 16GB+512GB 大漠银月',
      brand: 'OPPO',
      skuIDs: [
        { skuID: 401, color: '大漠银月', spec: '16+512' }
      ]
    },
    {
      id: 5,
      name: 'vivo X100 Pro 16GB+512GB 落日橙',
      brand: 'vivo',
      skuIDs: [
        { skuID: 501, color: '落日橙', spec: '16+512' }
      ]
    },
    {
      id: 6,
      name: '红米 K70 Pro 16GB+512GB 墨羽',
      brand: '红米',
      skuIDs: [
        { skuID: 601, color: '墨羽', spec: '16+512' }
      ]
    },
    {
      id: 7,
      name: 'Apple iPhone 15 Pro Max 256GB 钛金属',
      brand: 'Apple',
      skuIDs: [
        { skuID: 701, color: '钛金属', spec: '256' }
      ]
    },
  ];
  
  beforeEach(async () => {
    service = new DataPreparationService();
    await service.initialize(mockBrandList);
  });
  
  describe('验收标准 1: 品牌索引正确构建', () => {
    it('应该成功构建品牌索引并包含所有品牌', () => {
      // 构建品牌索引
      service.buildBrandIndex(mockSPUList);
      
      // 获取品牌索引
      const brandIndex = service.getBrandIndex();
      
      // 验证索引不为空
      expect(brandIndex.size).toBeGreaterThan(0);
      
      // 验证所有品牌都被索引（包括中文和拼音）
      // 华为品牌应该有两个键：'华为' 和 'huawei'
      expect(brandIndex.has('华为')).toBe(true);
      expect(brandIndex.has('huawei')).toBe(true);
      
      // 小米品牌应该有两个键：'小米' 和 'xiaomi'
      expect(brandIndex.has('小米')).toBe(true);
      expect(brandIndex.has('xiaomi')).toBe(true);
      
      // OPPO品牌应该有一个键：'oppo'（中文和拼音相同）
      expect(brandIndex.has('oppo')).toBe(true);
      
      // vivo品牌应该有一个键：'vivo'（中文和拼音相同）
      expect(brandIndex.has('vivo')).toBe(true);
      
      // 红米品牌应该有两个键：'红米' 和 'redmi'
      expect(brandIndex.has('红米')).toBe(true);
      expect(brandIndex.has('redmi')).toBe(true);
      
      // Apple品牌应该有两个键：'apple'（中文和拼音相同）
      expect(brandIndex.has('apple')).toBe(true);
    });
    
    it('应该正确映射品牌到SPU列表', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // 验证华为品牌的SPU数量
      const huaweiSPUs = brandIndex.get('华为');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2); // 有2个华为SPU
      
      // 验证SPU内容
      const spuNames = huaweiSPUs!.map(spu => spu.name);
      expect(spuNames).toContain('华为 Mate 60 Pro 12GB+512GB 雅川青');
      expect(spuNames).toContain('华为 P60 Pro 8GB+256GB 洛可可白');
      
      // 验证小米品牌的SPU数量
      const xiaomiSPUs = brandIndex.get('小米');
      expect(xiaomiSPUs).toBeDefined();
      expect(xiaomiSPUs!.length).toBe(1); // 有1个小米SPU
      
      // 验证OPPO品牌的SPU数量
      const oppoSPUs = brandIndex.get('oppo');
      expect(oppoSPUs).toBeDefined();
      expect(oppoSPUs!.length).toBe(1); // 有1个OPPO SPU
    });
    
    it('应该正确处理品牌大小写（索引键使用小写）', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // 验证索引键都是小写的
      const keys = Array.from(brandIndex.keys());
      keys.forEach(key => {
        expect(key).toBe(key.toLowerCase());
      });
      
      // 验证可以通过小写键查询
      expect(brandIndex.has('华为')).toBe(true);
      expect(brandIndex.has('huawei')).toBe(true);
      expect(brandIndex.has('oppo')).toBe(true);
      expect(brandIndex.has('apple')).toBe(true);
    });
  });
  
  describe('验收标准 2: 支持中文和拼音双向索引', () => {
    it('应该支持通过中文品牌名查询', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // 通过中文品牌名查询
      const huaweiSPUs = brandIndex.get('华为');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2);
      
      const xiaomiSPUs = brandIndex.get('小米');
      expect(xiaomiSPUs).toBeDefined();
      expect(xiaomiSPUs!.length).toBe(1);
      
      const redmiSPUs = brandIndex.get('红米');
      expect(redmiSPUs).toBeDefined();
      expect(redmiSPUs!.length).toBe(1);
    });
    
    it('应该支持通过拼音品牌名查询', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // 通过拼音品牌名查询
      const huaweiSPUs = brandIndex.get('huawei');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2);
      
      const xiaomiSPUs = brandIndex.get('xiaomi');
      expect(xiaomiSPUs).toBeDefined();
      expect(xiaomiSPUs!.length).toBe(1);
      
      const redmiSPUs = brandIndex.get('redmi');
      expect(redmiSPUs).toBeDefined();
      expect(redmiSPUs!.length).toBe(1);
    });
    
    it('中文和拼音查询应该返回相同的SPU列表', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // 华为品牌：中文和拼音查询应该返回相同的SPU
      const huaweiByZh = brandIndex.get('华为');
      const huaweiByPy = brandIndex.get('huawei');
      expect(huaweiByZh).toEqual(huaweiByPy);
      
      // 小米品牌：中文和拼音查询应该返回相同的SPU
      const xiaomiByZh = brandIndex.get('小米');
      const xiaomiByPy = brandIndex.get('xiaomi');
      expect(xiaomiByZh).toEqual(xiaomiByPy);
      
      // 红米品牌：中文和拼音查询应该返回相同的SPU
      const redmiByZh = brandIndex.get('红米');
      const redmiByPy = brandIndex.get('redmi');
      expect(redmiByZh).toEqual(redmiByPy);
    });
    
    it('应该正确处理中文和拼音相同的品牌（如OPPO、vivo）', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // OPPO品牌：中文和拼音相同，应该只有一个索引键
      const oppoSPUs = brandIndex.get('oppo');
      expect(oppoSPUs).toBeDefined();
      expect(oppoSPUs!.length).toBe(1);
      
      // vivo品牌：中文和拼音相同，应该只有一个索引键
      const vivoSPUs = brandIndex.get('vivo');
      expect(vivoSPUs).toBeDefined();
      expect(vivoSPUs!.length).toBe(1);
      
      // Apple品牌：中文和拼音相同，应该只有一个索引键
      const appleSPUs = brandIndex.get('apple');
      expect(appleSPUs).toBeDefined();
      expect(appleSPUs!.length).toBe(1);
    });
    
    it('应该支持混合查询（部分品牌用中文，部分用拼音）', () => {
      service.buildBrandIndex(mockSPUList);
      const brandIndex = service.getBrandIndex();
      
      // 混合查询：华为用中文，小米用拼音
      const huaweiSPUs = brandIndex.get('华为');
      const xiaomiSPUs = brandIndex.get('xiaomi');
      const oppoSPUs = brandIndex.get('oppo');
      
      expect(huaweiSPUs).toBeDefined();
      expect(xiaomiSPUs).toBeDefined();
      expect(oppoSPUs).toBeDefined();
      
      expect(huaweiSPUs!.length).toBe(2);
      expect(xiaomiSPUs!.length).toBe(1);
      expect(oppoSPUs!.length).toBe(1);
    });
  });
  
  describe('验收标准 3: 索引统计信息正确', () => {
    it('应该正确统计品牌数量', () => {
      service.buildBrandIndex(mockSPUList);
      const statistics = service.getStatistics();
      
      // 验证品牌数量（唯一品牌数）
      // 有6个唯一品牌：华为、小米、OPPO、vivo、红米、Apple
      expect(statistics.brandIndex.totalBrands).toBe(6);
    });
    
    it('应该正确统计SPU总数', () => {
      service.buildBrandIndex(mockSPUList);
      const statistics = service.getStatistics();
      
      // 验证SPU总数
      expect(statistics.brandIndex.totalSPUs).toBe(7); // 7个SPU
    });
    
    it('应该正确计算平均每品牌SPU数', () => {
      service.buildBrandIndex(mockSPUList);
      const statistics = service.getStatistics();
      
      // 验证平均每品牌SPU数
      // 7个SPU / 6个品牌 ≈ 1.17
      expect(statistics.brandIndex.avgSPUsPerBrand).toBeCloseTo(7 / 6, 2);
    });
    
    it('应该正确统计Top品牌', () => {
      service.buildBrandIndex(mockSPUList);
      const statistics = service.getStatistics();
      
      // 验证Top品牌列表
      expect(statistics.brandIndex.topBrands).toBeDefined();
      expect(statistics.brandIndex.topBrands.length).toBeGreaterThan(0);
      
      // 验证Top品牌按SPU数量降序排序
      const topBrands = statistics.brandIndex.topBrands;
      for (let i = 0; i < topBrands.length - 1; i++) {
        expect(topBrands[i].count).toBeGreaterThanOrEqual(topBrands[i + 1].count);
      }
      
      // 验证华为品牌应该在Top品牌中（有2个SPU）
      const huaweiBrand = topBrands.find(b => b.brand === '华为');
      expect(huaweiBrand).toBeDefined();
      expect(huaweiBrand!.count).toBe(2);
    });
    
    it('应该记录构建耗时', () => {
      service.buildBrandIndex(mockSPUList);
      const statistics = service.getStatistics();
      
      // 验证构建耗时
      expect(statistics.brandIndex.buildTime).toBeGreaterThanOrEqual(0);
      expect(statistics.brandIndex.buildTime).toBeLessThan(1000); // 应该在1秒内完成
    });
    
    it('应该更新总体统计信息', () => {
      service.buildBrandIndex(mockSPUList);
      const statistics = service.getStatistics();
      
      // 验证总体构建时间
      expect(statistics.overall.totalIndexBuildTime).toBeGreaterThanOrEqual(0);
      expect(statistics.overall.totalIndexBuildTime).toBeGreaterThanOrEqual(statistics.brandIndex.buildTime);
      
      // 验证估算内存使用
      expect(statistics.overall.estimatedMemoryUsage).toBeGreaterThan(0);
    });
    
    it('应该在重新构建索引时更新统计信息', () => {
      // 第一次构建
      service.buildBrandIndex(mockSPUList);
      const stats1 = service.getStatistics();
      const totalSPUs1 = stats1.brandIndex.totalSPUs;
      
      // 第二次构建（使用更少的SPU）
      const smallerList = mockSPUList.slice(0, 3);
      service.buildBrandIndex(smallerList);
      const stats2 = service.getStatistics();
      const totalSPUs2 = stats2.brandIndex.totalSPUs;
      
      // 验证统计信息已更新
      expect(totalSPUs2).toBeLessThan(totalSPUs1);
      expect(totalSPUs2).toBe(3);
    });
  });
  
  describe('边缘情况测试', () => {
    it('应该正确处理空SPU列表', () => {
      service.buildBrandIndex([]);
      const brandIndex = service.getBrandIndex();
      
      // 验证索引为空
      expect(brandIndex.size).toBe(0);
      
      // 验证统计信息
      const statistics = service.getStatistics();
      expect(statistics.brandIndex.totalBrands).toBe(0);
      expect(statistics.brandIndex.totalSPUs).toBe(0);
    });
    
    it('应该跳过没有品牌的SPU', () => {
      const spuWithoutBrand: SPUData[] = [
        {
          id: 999,
          name: '未知产品 12GB+512GB',
          // 没有brand字段
          skuIDs: []
        }
      ];
      
      service.buildBrandIndex([...mockSPUList, ...spuWithoutBrand]);
      const statistics = service.getStatistics();
      
      // 验证统计信息（应该只统计有品牌的SPU）
      expect(statistics.brandIndex.totalSPUs).toBe(7); // 只有7个有品牌的SPU
    });
    
    it('应该支持重复构建索引（清空旧索引）', () => {
      // 第一次构建
      service.buildBrandIndex(mockSPUList);
      const brandIndex1 = service.getBrandIndex();
      const size1 = brandIndex1.size;
      
      // 第二次构建（使用更少的SPU）
      const smallerSPUList = mockSPUList.slice(0, 3);
      service.buildBrandIndex(smallerSPUList);
      const brandIndex2 = service.getBrandIndex();
      const size2 = brandIndex2.size;
      
      // 验证索引已更新（不是累加）
      expect(size2).toBeLessThanOrEqual(size1);
      
      // 验证只包含新的SPU
      const huaweiSPUs = brandIndex2.get('华为');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2); // 前3个SPU中有2个华为
    });
  });
  
  describe('性能测试', () => {
    it('应该在合理时间内完成索引构建', () => {
      // 创建较大的SPU列表（100个SPU）
      const largeSPUList: SPUData[] = [];
      for (let i = 0; i < 100; i++) {
        largeSPUList.push({
          id: i,
          name: `华为 Mate ${i} Pro 12GB+512GB`,
          brand: '华为',
          skuIDs: []
        });
      }
      
      const startTime = Date.now();
      service.buildBrandIndex(largeSPUList);
      const endTime = Date.now();
      const buildTime = endTime - startTime;
      
      // 验证构建时间（100个SPU应该在100ms内完成）
      expect(buildTime).toBeLessThan(100);
      
      // 验证索引正确构建
      const brandIndex = service.getBrandIndex();
      expect(brandIndex.size).toBeGreaterThan(0);
    });
  });
  
  describe('集成测试：品牌索引与预处理', () => {
    it('应该能够使用预处理后的增强SPU数据构建品牌索引', () => {
      // 1. 预处理SPU列表
      const enhancedSPUs = service.preprocessSPUs(mockSPUList);
      
      // 2. 使用增强的SPU数据构建品牌索引
      service.buildBrandIndex(enhancedSPUs);
      
      // 3. 验证品牌索引正确构建
      const brandIndex = service.getBrandIndex();
      expect(brandIndex.size).toBeGreaterThan(0);
      
      // 4. 验证可以通过品牌查询到增强的SPU
      const huaweiSPUs = brandIndex.get('华为');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2);
      
      // 5. 验证增强的SPU包含预提取的信息
      const firstSPU = huaweiSPUs![0] as any;
      expect(firstSPU.extractedBrand).toBeDefined();
      expect(firstSPU.extractedModel).toBeDefined();
      expect(firstSPU.normalizedModel).toBeDefined();
      expect(firstSPU.simplicity).toBeDefined();
    });
  });
});
