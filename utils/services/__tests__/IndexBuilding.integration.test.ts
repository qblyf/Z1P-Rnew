/**
 * 索引构建集成测试
 * 
 * 验证预处理后的增强SPU数据能够正确用于索引构建
 * 
 * Requirements: 2.1.2, 2.4.3
 * Task: 6.2 - 更新索引构建调用
 */

import { DataPreparationService } from '../DataPreparationService';
import type { BrandData, SPUData, EnhancedSPUData } from '../../types';

describe('索引构建集成测试', () => {
  let service: DataPreparationService;
  
  const mockBrandList: BrandData[] = [
    { id: 1, name: '华为', spell: 'huawei' },
    { id: 2, name: '小米', spell: 'xiaomi' },
    { id: 3, name: 'OPPO', spell: 'oppo' },
  ];
  
  const mockSPUList: SPUData[] = [
    {
      id: 1,
      name: '华为 Mate 60 Pro 12GB+512GB 雅川青',
      brand: '华为',
      skuIDs: [
        { id: 101, skuID: 'SKU101', color: '雅川青', spec: '12+512', combo: '' },
      ],
    },
    {
      id: 2,
      name: '小米 14 Pro 16GB+1TB 钛金属',
      brand: '小米',
      skuIDs: [
        { id: 201, skuID: 'SKU201', color: '钛金属', spec: '16+1024', combo: '' },
      ],
    },
    {
      id: 3,
      name: 'OPPO Find X7 Ultra 16GB+512GB 大漠银月',
      brand: 'OPPO',
      skuIDs: [
        { id: 301, skuID: 'SKU301', color: '大漠银月', spec: '16+512', combo: '' },
      ],
    },
  ];
  
  beforeEach(async () => {
    service = new DataPreparationService();
    await service.initialize(mockBrandList);
  });
  
  describe('完整流程：预处理 -> 索引构建', () => {
    it('应该能够使用预处理后的增强SPU数据构建品牌索引', () => {
      // 1. 预处理SPU列表
      const enhancedSPUs = service.preprocessSPUs(mockSPUList);
      
      // 验证预处理成功
      expect(enhancedSPUs).toHaveLength(3);
      expect(enhancedSPUs[0].extractedBrand).toBe('华为');
      expect(enhancedSPUs[1].extractedBrand).toBe('小米');
      expect(enhancedSPUs[2].extractedBrand).toBe('OPPO');
      
      // 2. 使用增强的SPU数据构建品牌索引
      service.buildBrandIndex(enhancedSPUs);
      
      // 3. 验证品牌索引正确构建
      const brandIndex = service.getBrandIndex();
      
      // 验证中文品牌名索引
      expect(brandIndex.has('华为')).toBe(true);
      expect(brandIndex.has('小米')).toBe(true);
      expect(brandIndex.has('oppo')).toBe(true);
      
      // 验证拼音品牌名索引
      expect(brandIndex.has('huawei')).toBe(true);
      expect(brandIndex.has('xiaomi')).toBe(true);
      
      // 验证索引内容
      const huaweiSPUs = brandIndex.get('华为');
      expect(huaweiSPUs).toHaveLength(1);
      expect(huaweiSPUs![0].id).toBe(1);
      expect(huaweiSPUs![0].name).toContain('Mate 60 Pro');
    });
    
    it('应该能够使用预处理后的增强SPU数据构建型号索引', () => {
      // 1. 预处理SPU列表
      const enhancedSPUs = service.preprocessSPUs(mockSPUList);
      
      // 验证预处理成功
      expect(enhancedSPUs[0].extractedModel).toBeTruthy();
      expect(enhancedSPUs[0].normalizedModel).toBeTruthy();
      expect(enhancedSPUs[1].extractedModel).toBeTruthy();
      expect(enhancedSPUs[1].normalizedModel).toBeTruthy();
      
      // 2. 使用增强的SPU数据构建型号索引
      service.buildModelIndex(enhancedSPUs);
      
      // 3. 验证型号索引正确构建
      const modelIndex = service.getModelIndex();
      
      // 验证索引大小
      expect(modelIndex.size).toBeGreaterThan(0);
      
      // 验证可以通过型号查找SPU
      // 注意：型号索引使用的是标准化后的型号（小写、去空格）
      const allModels = Array.from(modelIndex.keys());
      expect(allModels.length).toBeGreaterThan(0);
      
      // 验证至少有一个型号索引包含SPU
      let foundSPU = false;
      for (const [model, spus] of modelIndex.entries()) {
        if (spus.length > 0) {
          foundSPU = true;
          break;
        }
      }
      expect(foundSPU).toBe(true);
    });
    
    it('应该能够使用预处理后的增强SPU数据构建规格索引', () => {
      // 1. 预处理SPU列表
      const enhancedSPUs = service.preprocessSPUs(mockSPUList);
      
      // 2. 使用增强的SPU数据构建规格索引
      service.buildSpecIndex(enhancedSPUs);
      
      // 3. 验证规格索引正确构建
      const specIndex = service.getSpecIndex();
      
      // 验证颜色索引
      expect(specIndex.colorIndex.has('雅川青')).toBe(true);
      expect(specIndex.colorIndex.has('钛金属')).toBe(true);
      expect(specIndex.colorIndex.has('大漠银月')).toBe(true);
      
      // 验证规格索引（容量）
      expect(specIndex.specIndex.has('12+512')).toBe(true);
      expect(specIndex.specIndex.has('16+1024')).toBe(true);
      expect(specIndex.specIndex.has('16+512')).toBe(true);
      
      // 验证颜色索引内容
      const yachuanqingSPUs = specIndex.colorIndex.get('雅川青');
      expect(yachuanqingSPUs).toBeDefined();
      expect(yachuanqingSPUs!.has(1)).toBe(true);
      
      // 验证规格索引内容
      const spec12_512SPUs = specIndex.specIndex.get('12+512');
      expect(spec12_512SPUs).toBeDefined();
      expect(spec12_512SPUs!.has(1)).toBe(true);
    });
    
    it('应该能够构建所有三个索引并保持数据一致性', () => {
      // 1. 预处理SPU列表
      const enhancedSPUs = service.preprocessSPUs(mockSPUList);
      
      // 验证所有SPU都被增强
      expect(enhancedSPUs).toHaveLength(mockSPUList.length);
      enhancedSPUs.forEach((spu) => {
        expect(spu.extractedBrand).toBeTruthy();
        expect(spu.extractedModel).toBeTruthy();
        expect(spu.normalizedModel).toBeTruthy();
        expect(spu.simplicity).toBeGreaterThanOrEqual(0);
        expect(spu.preprocessedAt).toBeDefined();
      });
      
      // 2. 构建所有索引
      service.buildBrandIndex(enhancedSPUs);
      service.buildModelIndex(enhancedSPUs);
      service.buildSpecIndex(enhancedSPUs);
      
      // 3. 验证所有索引都已构建
      const brandIndex = service.getBrandIndex();
      const modelIndex = service.getModelIndex();
      const specIndex = service.getSpecIndex();
      
      expect(brandIndex.size).toBeGreaterThan(0);
      expect(modelIndex.size).toBeGreaterThan(0);
      expect(specIndex.colorIndex.size).toBeGreaterThan(0);
      expect(specIndex.specIndex.size).toBeGreaterThan(0);
      
      // 4. 验证数据一致性：同一个SPU应该在所有索引中都能找到
      const testSPU = enhancedSPUs[0];
      
      // 在品牌索引中查找
      const brandSPUs = brandIndex.get(testSPU.extractedBrand!.toLowerCase());
      expect(brandSPUs).toBeDefined();
      expect(brandSPUs!.some(spu => spu.id === testSPU.id)).toBe(true);
      
      // 在规格索引中查找（通过颜色）
      const testColor = testSPU.skuIDs[0].color;
      const colorSPUs = specIndex.colorIndex.get(testColor);
      expect(colorSPUs).toBeDefined();
      expect(colorSPUs!.has(testSPU.id)).toBe(true);
    });
    
    it('应该正确处理增强SPU数据的类型兼容性', () => {
      // 1. 预处理SPU列表
      const enhancedSPUs: EnhancedSPUData[] = service.preprocessSPUs(mockSPUList);
      
      // 2. 验证增强SPU数据可以作为SPUData使用（向后兼容）
      // 这是TypeScript的类型检查，如果类型不兼容会编译失败
      const spuList: SPUData[] = enhancedSPUs;
      
      // 3. 验证可以传递给索引构建方法
      service.buildBrandIndex(spuList);
      service.buildModelIndex(spuList);
      service.buildSpecIndex(spuList);
      
      // 4. 验证索引构建成功
      expect(service.getBrandIndex().size).toBeGreaterThan(0);
      expect(service.getModelIndex().size).toBeGreaterThan(0);
      expect(service.getSpecIndex().colorIndex.size).toBeGreaterThan(0);
    });
  });
  
  describe('性能验证', () => {
    it('应该能够高效处理大量SPU的预处理和索引构建', () => {
      // 创建大量测试数据
      const largeSPUList: SPUData[] = [];
      for (let i = 0; i < 1000; i++) {
        largeSPUList.push({
          id: i,
          name: `华为 Mate ${i} Pro 12GB+512GB 雅川青`,
          brand: '华为',
          skuIDs: [
            { id: i * 10, skuID: `SKU${i}`, color: '雅川青', spec: '12+512', combo: '' },
          ],
        });
      }
      
      // 测量预处理时间
      const preprocessStart = Date.now();
      const enhancedSPUs = service.preprocessSPUs(largeSPUList);
      const preprocessTime = Date.now() - preprocessStart;
      
      // 验证预处理成功
      expect(enhancedSPUs).toHaveLength(1000);
      
      // 测量索引构建时间
      const indexStart = Date.now();
      service.buildBrandIndex(enhancedSPUs);
      service.buildModelIndex(enhancedSPUs);
      service.buildSpecIndex(enhancedSPUs);
      const indexTime = Date.now() - indexStart;
      
      // 验证性能（1000个SPU应该在合理时间内完成）
      expect(preprocessTime).toBeLessThan(5000); // 预处理应该在5秒内完成
      expect(indexTime).toBeLessThan(5000); // 索引构建应该在5秒内完成
      
      // 输出性能信息（用于调试）
      console.log(`预处理1000个SPU耗时: ${preprocessTime}ms`);
      console.log(`构建索引耗时: ${indexTime}ms`);
      console.log(`总耗时: ${preprocessTime + indexTime}ms`);
    });
  });
  
  describe('错误处理', () => {
    it('应该能够处理空SPU列表', () => {
      // 1. 预处理空列表
      const enhancedSPUs = service.preprocessSPUs([]);
      
      // 验证返回空数组
      expect(enhancedSPUs).toHaveLength(0);
      
      // 2. 使用空列表构建索引
      service.buildBrandIndex(enhancedSPUs);
      service.buildModelIndex(enhancedSPUs);
      service.buildSpecIndex(enhancedSPUs);
      
      // 3. 验证索引为空
      expect(service.getBrandIndex().size).toBe(0);
      expect(service.getModelIndex().size).toBe(0);
      expect(service.getSpecIndex().colorIndex.size).toBe(0);
    });
    
    it('应该能够处理缺少字段的SPU', () => {
      const incompleteSPUList: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [],
        },
        {
          id: 2,
          name: '',
          brand: '小米',
          skuIDs: [],
        },
      ];
      
      // 1. 预处理（应该跳过无效SPU）
      const enhancedSPUs = service.preprocessSPUs(incompleteSPUList);
      
      // 验证只处理了有效的SPU
      expect(enhancedSPUs.length).toBeLessThanOrEqual(incompleteSPUList.length);
      
      // 2. 构建索引（不应该抛出错误）
      expect(() => {
        service.buildBrandIndex(enhancedSPUs);
        service.buildModelIndex(enhancedSPUs);
        service.buildSpecIndex(enhancedSPUs);
      }).not.toThrow();
    });
  });
});
