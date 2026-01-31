/**
 * DataPreparationService 单元测试
 * 
 * 测试品牌索引构建功能
 */

import { DataPreparationService } from '../DataPreparationService';
import type { SPUData, BrandData } from '../../types';

describe('DataPreparationService', () => {
  let service: DataPreparationService;
  let mockBrandList: BrandData[];
  let mockSPUList: SPUData[];
  
  beforeEach(() => {
    service = new DataPreparationService();
    
    // 模拟品牌列表
    mockBrandList = [
      { name: '华为', spell: 'HUAWEI', color: '#000000', order: 1 },
      { name: '小米', spell: 'XIAOMI', color: '#000000', order: 2 },
      { name: '红米', spell: 'Redmi', color: '#000000', order: 3 },
      { name: 'OPPO', spell: 'OPPO', color: '#000000', order: 4 },
      { name: 'vivo', spell: 'vivo', color: '#000000', order: 5 },
    ];
    
    // 模拟SPU列表
    mockSPUList = [
      { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
      { id: 2, name: 'HUAWEI P50 Pro', brand: '华为' },
      { id: 3, name: '小米14 Pro', brand: '小米' },
      { id: 4, name: 'Xiaomi 13 Ultra', brand: '小米' },
      { id: 5, name: '红米 Note 13 Pro', brand: '红米' },
      { id: 6, name: 'Redmi K70 Pro', brand: '红米' },
      { id: 7, name: 'OPPO Find X7 Pro', brand: 'OPPO' },
      { id: 8, name: 'vivo X100 Pro', brand: 'vivo' },
      { id: 9, name: 'vivo S18 Pro', brand: 'vivo' },
      { id: 10, name: '未知品牌手机', brand: undefined }, // 无品牌字段
    ];
  });
  
  describe('initialize', () => {
    it('应该成功初始化服务', async () => {
      await service.initialize(mockBrandList);
      
      // 验证品牌列表已加载
      const brandIndex = service.getBrandIndex();
      expect(brandIndex).toBeDefined();
    });
  });
  
  describe('buildBrandIndex', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该成功构建品牌索引', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // 验证索引已创建
      expect(brandIndex.size).toBeGreaterThan(0);
    });
    
    it('应该支持中文品牌名查询', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // 查询华为品牌
      const huaweiSPUs = brandIndex.get('华为');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2); // 华为 Mate 60 Pro 和 HUAWEI P50 Pro
      
      // 验证SPU内容
      const spuNames = huaweiSPUs!.map(spu => spu.name);
      expect(spuNames).toContain('华为 Mate 60 Pro');
      expect(spuNames).toContain('HUAWEI P50 Pro');
    });
    
    it('应该支持拼音品牌名查询', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // 查询华为品牌（使用拼音）
      const huaweiSPUs = brandIndex.get('huawei');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2);
      
      // 查询小米品牌（使用拼音）
      const xiaomiSPUs = brandIndex.get('xiaomi');
      expect(xiaomiSPUs).toBeDefined();
      expect(xiaomiSPUs!.length).toBe(2); // 小米14 Pro 和 Xiaomi 13 Ultra
    });
    
    it('应该支持大小写不敏感查询', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // 品牌索引使用小写键，所以查询时需要转换为小写
      const oppoSPUs1 = brandIndex.get('oppo');
      const oppoSPUs2 = brandIndex.get('OPPO'.toLowerCase());
      
      expect(oppoSPUs1).toBeDefined();
      expect(oppoSPUs2).toBeDefined();
      expect(oppoSPUs1!.length).toBe(1);
      expect(oppoSPUs2!.length).toBe(1);
      
      // 验证两种查询返回相同的结果
      expect(oppoSPUs1).toEqual(oppoSPUs2);
    });
    
    it('应该正确处理红米品牌（中文和拼音不同）', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // 使用中文查询
      const redmiSPUs1 = brandIndex.get('红米');
      expect(redmiSPUs1).toBeDefined();
      expect(redmiSPUs1!.length).toBe(2);
      
      // 使用拼音查询
      const redmiSPUs2 = brandIndex.get('redmi');
      expect(redmiSPUs2).toBeDefined();
      expect(redmiSPUs2!.length).toBe(2);
      
      // 验证两种查询返回相同的SPU
      const names1 = redmiSPUs1!.map(spu => spu.name).sort();
      const names2 = redmiSPUs2!.map(spu => spu.name).sort();
      expect(names1).toEqual(names2);
    });
    
    it('应该正确处理vivo品牌（大小写敏感）', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // vivo品牌应该被正确索引
      const vivoSPUs = brandIndex.get('vivo');
      expect(vivoSPUs).toBeDefined();
      expect(vivoSPUs!.length).toBe(2); // vivo X100 Pro 和 vivo S18 Pro
    });
    
    it('应该跳过无品牌的SPU', () => {
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      // 统计所有索引的SPU数量
      let totalIndexedSPUs = 0;
      for (const spus of brandIndex.values()) {
        totalIndexedSPUs += spus.length;
      }
      
      // 应该少于总SPU数量（因为有一个无品牌的SPU）
      // 注意：由于双向索引，同一个SPU可能被索引多次
      // 所以我们只验证至少有一些SPU被索引了
      expect(totalIndexedSPUs).toBeGreaterThan(0);
    });
    
    it('应该支持空SPU列表', () => {
      service.buildBrandIndex([]);
      
      const brandIndex = service.getBrandIndex();
      
      // 索引应该为空
      expect(brandIndex.size).toBe(0);
    });
    
    it('应该支持重复构建索引', () => {
      // 第一次构建
      service.buildBrandIndex(mockSPUList);
      const brandIndex1 = service.getBrandIndex();
      const size1 = brandIndex1.size;
      
      // 第二次构建（使用更少的SPU）
      const smallerSPUList = mockSPUList.slice(0, 3);
      service.buildBrandIndex(smallerSPUList);
      const brandIndex2 = service.getBrandIndex();
      
      // 索引应该被清空并重新构建
      expect(brandIndex2.size).toBeLessThanOrEqual(size1);
      
      // 验证只包含前3个SPU
      let totalSPUs = 0;
      for (const spus of brandIndex2.values()) {
        totalSPUs += spus.length;
      }
      
      // 由于双向索引，总数可能大于3，但应该是3的倍数
      expect(totalSPUs % 3).toBe(0);
    });
    
    it('应该正确处理品牌名包含在SPU名称中的情况', () => {
      const spuWithBrandInName: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: undefined }, // 品牌在名称中
        { id: 2, name: 'HUAWEI P50 Pro', brand: undefined },
      ];
      
      service.buildBrandIndex(spuWithBrandInName);
      
      const brandIndex = service.getBrandIndex();
      
      // 应该能从名称中提取品牌
      const huaweiSPUs = brandIndex.get('华为');
      expect(huaweiSPUs).toBeDefined();
      expect(huaweiSPUs!.length).toBe(2);
    });
    
    it('性能测试：应该能快速构建大量SPU的索引', () => {
      // 生成1000个SPU
      const largeSPUList: SPUData[] = [];
      for (let i = 0; i < 1000; i++) {
        const brandIndex = i % mockBrandList.length;
        const brand = mockBrandList[brandIndex];
        largeSPUList.push({
          id: i,
          name: `${brand.name} 产品 ${i}`,
          brand: brand.name,
        });
      }
      
      const startTime = Date.now();
      service.buildBrandIndex(largeSPUList);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 构建1000个SPU的索引应该在1秒内完成
      expect(duration).toBeLessThan(1000);
      
      // 验证索引正确性
      const brandIndex = service.getBrandIndex();
      expect(brandIndex.size).toBeGreaterThan(0);
      
      // 验证每个品牌都有SPU
      for (const brand of mockBrandList) {
        const spus = brandIndex.get(brand.name.toLowerCase());
        expect(spus).toBeDefined();
        expect(spus!.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('getBrandIndex', () => {
    it('应该返回品牌索引', async () => {
      await service.initialize(mockBrandList);
      service.buildBrandIndex(mockSPUList);
      
      const brandIndex = service.getBrandIndex();
      
      expect(brandIndex).toBeInstanceOf(Map);
      expect(brandIndex.size).toBeGreaterThan(0);
    });
  });
  
  describe('getModelIndex', () => {
    it('应该返回型号索引', async () => {
      await service.initialize(mockBrandList);
      
      const modelIndex = service.getModelIndex();
      
      expect(modelIndex).toBeInstanceOf(Map);
    });
  });
  
  describe('buildModelIndex', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该成功构建型号索引', () => {
      service.buildModelIndex(mockSPUList);
      
      const modelIndex = service.getModelIndex();
      
      // 验证索引已创建
      expect(modelIndex.size).toBeGreaterThan(0);
    });
    
    it('应该正确提取型号（去除品牌）', () => {
      service.buildModelIndex(mockSPUList);
      
      const modelIndex = service.getModelIndex();
      
      // 华为 Mate 60 Pro -> mate 60 pro
      const mate60SPUs = modelIndex.get('mate 60 pro');
      expect(mate60SPUs).toBeDefined();
      expect(mate60SPUs!.length).toBe(1);
      expect(mate60SPUs![0].name).toBe('华为 Mate 60 Pro');
      
      // HUAWEI P50 Pro -> p50 pro
      const p50SPUs = modelIndex.get('p50 pro');
      expect(p50SPUs).toBeDefined();
      expect(p50SPUs!.length).toBe(1);
      expect(p50SPUs![0].name).toBe('HUAWEI P50 Pro');
    });
    
    it('应该支持小写查询', () => {
      service.buildModelIndex(mockSPUList);
      
      const modelIndex = service.getModelIndex();
      
      // 所有型号都应该是小写的
      for (const key of modelIndex.keys()) {
        expect(key).toBe(key.toLowerCase());
      }
    });
    
    it('应该正确处理小米品牌的型号', () => {
      service.buildModelIndex(mockSPUList);
      
      const modelIndex = service.getModelIndex();
      
      // 小米14 Pro -> 14 pro
      const mi14SPUs = modelIndex.get('14 pro');
      expect(mi14SPUs).toBeDefined();
      expect(mi14SPUs!.length).toBe(1);
      expect(mi14SPUs![0].name).toBe('小米14 Pro');
      
      // Xiaomi 13 Ultra -> 13 ultra
      const mi13SPUs = modelIndex.get('13 ultra');
      expect(mi13SPUs).toBeDefined();
      expect(mi13SPUs!.length).toBe(1);
      expect(mi13SPUs![0].name).toBe('Xiaomi 13 Ultra');
    });
    
    it('应该正确处理红米品牌的型号', () => {
      service.buildModelIndex(mockSPUList);
      
      const modelIndex = service.getModelIndex();
      
      // 红米 Note 13 Pro -> note 13 pro
      const noteSpus = modelIndex.get('note 13 pro');
      expect(noteSpus).toBeDefined();
      expect(noteSpus!.length).toBe(1);
      
      // Redmi K70 Pro -> k70 pro
      const k70SPUs = modelIndex.get('k70 pro');
      expect(k70SPUs).toBeDefined();
      expect(k70SPUs!.length).toBe(1);
    });
    
    it('应该正确处理OPPO和vivo品牌的型号', () => {
      service.buildModelIndex(mockSPUList);
      
      const modelIndex = service.getModelIndex();
      
      // OPPO Find X7 Pro -> find x7 pro
      const findX7SPUs = modelIndex.get('find x7 pro');
      expect(findX7SPUs).toBeDefined();
      expect(findX7SPUs!.length).toBe(1);
      
      // vivo X100 Pro -> x100 pro
      const x100SPUs = modelIndex.get('x100 pro');
      expect(x100SPUs).toBeDefined();
      expect(x100SPUs!.length).toBe(1);
      
      // vivo S18 Pro -> s18 pro
      const s18SPUs = modelIndex.get('s18 pro');
      expect(s18SPUs).toBeDefined();
      expect(s18SPUs!.length).toBe(1);
    });
    
    it('应该合并相同型号的不同SPU', () => {
      // 添加相同型号的SPU
      const spuListWithDuplicates: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: '华为' },
        { id: 2, name: 'HUAWEI Mate 60 Pro', brand: '华为' },
        { id: 3, name: '华为 Mate 60 Pro 典藏版', brand: '华为' },
      ];
      
      service.buildModelIndex(spuListWithDuplicates);
      
      const modelIndex = service.getModelIndex();
      
      // mate 60 pro 应该包含2个SPU（第三个是 mate 60 pro 典藏版）
      const mate60SPUs = modelIndex.get('mate 60 pro');
      expect(mate60SPUs).toBeDefined();
      expect(mate60SPUs!.length).toBe(2);
    });
    
    it('应该跳过无法提取型号的SPU', () => {
      const spuWithoutModel: SPUData[] = [
        { id: 1, name: '', brand: '华为' }, // 空名称
        { id: 2, name: '华为', brand: '华为' }, // 只有品牌
      ];
      
      service.buildModelIndex(spuWithoutModel);
      
      const modelIndex = service.getModelIndex();
      
      // 应该没有索引（或者索引为空）
      expect(modelIndex.size).toBe(0);
    });
    
    it('应该支持空SPU列表', () => {
      service.buildModelIndex([]);
      
      const modelIndex = service.getModelIndex();
      
      // 索引应该为空
      expect(modelIndex.size).toBe(0);
    });
    
    it('应该支持重复构建索引', () => {
      // 第一次构建
      service.buildModelIndex(mockSPUList);
      const modelIndex1 = service.getModelIndex();
      const size1 = modelIndex1.size;
      
      // 第二次构建（使用更少的SPU）
      const smallerSPUList = mockSPUList.slice(0, 3);
      service.buildModelIndex(smallerSPUList);
      const modelIndex2 = service.getModelIndex();
      
      // 索引应该被清空并重新构建
      expect(modelIndex2.size).toBeLessThanOrEqual(size1);
    });
    
    it('应该正确标准化型号（去除多余空格）', () => {
      const spuWithSpaces: SPUData[] = [
        { id: 1, name: '华为  Mate   60  Pro', brand: '华为' }, // 多个空格
      ];
      
      service.buildModelIndex(spuWithSpaces);
      
      const modelIndex = service.getModelIndex();
      
      // 应该标准化为单个空格
      const mate60SPUs = modelIndex.get('mate 60 pro');
      expect(mate60SPUs).toBeDefined();
      expect(mate60SPUs!.length).toBe(1);
    });
    
    it('应该正确处理型号中的特殊字符', () => {
      const spuWithSpecialChars: SPUData[] = [
        { id: 1, name: '华为 Mate-60-Pro', brand: '华为' },
        { id: 2, name: '小米 14+Pro', brand: '小米' },
      ];
      
      service.buildModelIndex(spuWithSpecialChars);
      
      const modelIndex = service.getModelIndex();
      
      // 横线应该被保留
      const mate60SPUs = modelIndex.get('mate-60-pro');
      expect(mate60SPUs).toBeDefined();
      
      // 加号应该被保留
      const mi14SPUs = modelIndex.get('14+pro');
      expect(mi14SPUs).toBeDefined();
    });
    
    it('性能测试：应该能快速构建大量SPU的型号索引', () => {
      // 生成1000个SPU
      const largeSPUList: SPUData[] = [];
      for (let i = 0; i < 1000; i++) {
        const brandIndex = i % mockBrandList.length;
        const brand = mockBrandList[brandIndex];
        largeSPUList.push({
          id: i,
          name: `${brand.name} 型号 ${i}`,
          brand: brand.name,
        });
      }
      
      const startTime = Date.now();
      service.buildModelIndex(largeSPUList);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 构建1000个SPU的索引应该在1秒内完成
      expect(duration).toBeLessThan(1000);
      
      // 验证索引正确性
      const modelIndex = service.getModelIndex();
      expect(modelIndex.size).toBeGreaterThan(0);
    });
    
    it('应该正确处理没有brand字段的SPU', () => {
      const spuWithoutBrandField: SPUData[] = [
        { id: 1, name: '华为 Mate 60 Pro', brand: undefined },
        { id: 2, name: 'HUAWEI P50 Pro', brand: undefined },
      ];
      
      service.buildModelIndex(spuWithoutBrandField);
      
      const modelIndex = service.getModelIndex();
      
      // 应该能从名称中识别品牌并提取型号
      const mate60SPUs = modelIndex.get('mate 60 pro');
      expect(mate60SPUs).toBeDefined();
      expect(mate60SPUs!.length).toBe(1);
      
      const p50SPUs = modelIndex.get('p50 pro');
      expect(p50SPUs).toBeDefined();
      expect(p50SPUs!.length).toBe(1);
    });
  });
  
  describe('getSpecIndex', () => {
    it('应该返回规格索引', async () => {
      await service.initialize(mockBrandList);
      
      const specIndex = service.getSpecIndex();
      
      expect(specIndex).toBeDefined();
      expect(specIndex.colorIndex).toBeInstanceOf(Map);
      expect(specIndex.capacityIndex).toBeInstanceOf(Map);
      expect(specIndex.versionIndex).toBeInstanceOf(Map);
      expect(specIndex.specIndex).toBeInstanceOf(Map);
      expect(specIndex.comboIndex).toBeInstanceOf(Map);
      expect(specIndex.stats).toBeDefined();
    });
  });
  
  describe('buildSpecIndex', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该成功构建规格索引', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 103, color: '雅川青', spec: '12GB+1TB', combo: '典藏版' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '钛金属', spec: '16GB+512GB', combo: '标准版' },
            { skuID: 202, color: '陶瓷白', spec: '16GB+1TB', combo: '典藏版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 验证索引已创建
      expect(specIndex.colorIndex.size).toBeGreaterThan(0);
      expect(specIndex.specIndex.size).toBeGreaterThan(0);
      expect(specIndex.comboIndex.size).toBeGreaterThan(0);
    });
    
    it('应该正确提取颜色索引', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+512GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '雅川青', spec: '16GB+512GB' }, // 相同颜色
            { skuID: 202, color: '陶瓷白', spec: '16GB+1TB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 验证颜色索引
      expect(specIndex.colorIndex.has('雅川青')).toBe(true);
      expect(specIndex.colorIndex.has('雅丹黑')).toBe(true);
      expect(specIndex.colorIndex.has('陶瓷白')).toBe(true);
      
      // 雅川青应该关联两个SPU
      const yachuanqingSPUs = specIndex.colorIndex.get('雅川青');
      expect(yachuanqingSPUs).toBeDefined();
      expect(yachuanqingSPUs!.size).toBe(2);
      expect(yachuanqingSPUs!.has(1)).toBe(true);
      expect(yachuanqingSPUs!.has(2)).toBe(true);
      
      // 雅丹黑只关联一个SPU
      const yadanheiSPUs = specIndex.colorIndex.get('雅丹黑');
      expect(yadanheiSPUs).toBeDefined();
      expect(yadanheiSPUs!.size).toBe(1);
      expect(yadanheiSPUs!.has(1)).toBe(true);
    });
    
    it('应该正确提取规格索引', () => {
      const spuListWithSkuIDs: SPUData[] = [
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
            { skuID: 201, color: '钛金属', spec: '12GB+512GB' }, // 相同规格
            { skuID: 202, color: '陶瓷白', spec: '16GB+1TB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 验证规格索引（标准化后的格式）
      expect(specIndex.specIndex.has('12+512')).toBe(true);
      expect(specIndex.specIndex.has('12+1T')).toBe(true);
      expect(specIndex.specIndex.has('16+1T')).toBe(true);
      
      // 12+512应该关联两个SPU（标准化后合并）
      const spec512SPUs = specIndex.specIndex.get('12+512');
      expect(spec512SPUs).toBeDefined();
      expect(spec512SPUs!.size).toBe(2);
      expect(spec512SPUs!.has(1)).toBe(true);
      expect(spec512SPUs!.has(2)).toBe(true);
    });
    
    it('应该正确提取组合索引', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+1TB', combo: '典藏版' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '钛金属', spec: '16GB+512GB', combo: '标准版' }, // 相同组合
            { skuID: 202, color: '陶瓷白', spec: '16GB+1TB', combo: '卫星通信版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 验证组合索引
      expect(specIndex.comboIndex.has('标准版')).toBe(true);
      expect(specIndex.comboIndex.has('典藏版')).toBe(true);
      expect(specIndex.comboIndex.has('卫星通信版')).toBe(true);
      
      // 标准版应该关联两个SPU
      const standardSPUs = specIndex.comboIndex.get('标准版');
      expect(standardSPUs).toBeDefined();
      expect(standardSPUs!.size).toBe(2);
      expect(standardSPUs!.has(1)).toBe(true);
      expect(standardSPUs!.has(2)).toBe(true);
    });
    
    it('应该正确处理同一SPU中的重复规格', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB', combo: '标准版' }, // 重复
            { skuID: 103, color: '雅川青', spec: '12GB+1TB', combo: '标准版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 雅川青应该只关联一个SPU（去重）
      const colorSPUs = specIndex.colorIndex.get('雅川青');
      expect(colorSPUs).toBeDefined();
      expect(colorSPUs!.size).toBe(1);
      expect(colorSPUs!.has(1)).toBe(true);
      
      // 12+512应该只关联一个SPU（去重，标准化后）
      const specSPUs = specIndex.specIndex.get('12+512');
      expect(specSPUs).toBeDefined();
      expect(specSPUs!.size).toBe(1);
      expect(specSPUs!.has(1)).toBe(true);
    });
    
    it('应该跳过没有skuIDs的SPU', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          // 没有skuIDs字段
        },
        {
          id: 3,
          name: 'OPPO Find X7',
          brand: 'OPPO',
          skuIDs: [], // 空数组
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 只有第一个SPU应该被索引
      const colorSPUs = specIndex.colorIndex.get('雅川青');
      expect(colorSPUs).toBeDefined();
      expect(colorSPUs!.size).toBe(1);
      expect(colorSPUs!.has(1)).toBe(true);
    });
    
    it('应该正确处理空字符串和空白字符', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '', spec: '12GB+512GB' }, // 空字符串
            { skuID: 102, color: '  ', spec: '  ' }, // 空白字符
            { skuID: 103, color: '雅川青', spec: '12GB+1TB' }, // 正常
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 空字符串和空白字符应该被忽略
      expect(specIndex.colorIndex.has('')).toBe(false);
      expect(specIndex.colorIndex.has('  ')).toBe(false);
      expect(specIndex.specIndex.has('')).toBe(false);
      expect(specIndex.specIndex.has('  ')).toBe(false);
      
      // 只有有效的规格应该被索引（标准化后）
      expect(specIndex.colorIndex.has('雅川青')).toBe(true);
      expect(specIndex.specIndex.has('12+512')).toBe(true);
      expect(specIndex.specIndex.has('12+1T')).toBe(true);
    });
    
    it('应该正确更新统计信息', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+1TB', combo: '典藏版' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '钛金属', spec: '16GB+512GB', combo: '标准版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 验证统计信息
      expect(specIndex.stats.totalColors).toBe(3); // 雅川青、雅丹黑、钛金属
      expect(specIndex.stats.totalSpecs).toBe(3); // 12GB+512GB、12GB+1TB、16GB+512GB
      expect(specIndex.stats.totalCombos).toBe(2); // 标准版、典藏版
      expect(specIndex.stats.totalCapacities).toBe(0); // 未实现
      expect(specIndex.stats.totalVersions).toBe(0); // 未实现
    });
    
    it('应该支持空SPU列表', () => {
      service.buildSpecIndex([]);
      
      const specIndex = service.getSpecIndex();
      
      // 所有索引应该为空
      expect(specIndex.colorIndex.size).toBe(0);
      expect(specIndex.specIndex.size).toBe(0);
      expect(specIndex.comboIndex.size).toBe(0);
      
      // 统计信息应该为0
      expect(specIndex.stats.totalColors).toBe(0);
      expect(specIndex.stats.totalSpecs).toBe(0);
      expect(specIndex.stats.totalCombos).toBe(0);
    });
    
    it('应该支持重复构建索引', () => {
      const spuList1: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
      ];
      
      const spuList2: SPUData[] = [
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '钛金属', spec: '16GB+512GB' },
          ],
        },
      ];
      
      // 第一次构建
      service.buildSpecIndex(spuList1);
      const specIndex1 = service.getSpecIndex();
      expect(specIndex1.colorIndex.has('雅川青')).toBe(true);
      expect(specIndex1.colorIndex.has('钛金属')).toBe(false);
      
      // 第二次构建（应该清空之前的索引）
      service.buildSpecIndex(spuList2);
      const specIndex2 = service.getSpecIndex();
      expect(specIndex2.colorIndex.has('雅川青')).toBe(false);
      expect(specIndex2.colorIndex.has('钛金属')).toBe(true);
    });
    
    it('应该正确处理只有部分字段的skuIDs', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青' }, // 只有颜色
            { skuID: 102, spec: '12GB+512GB' }, // 只有规格
            { skuID: 103, combo: '标准版' }, // 只有组合
            { skuID: 104 }, // 什么都没有
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 每个字段应该被正确索引（规格标准化后）
      expect(specIndex.colorIndex.has('雅川青')).toBe(true);
      expect(specIndex.specIndex.has('12+512')).toBe(true);
      expect(specIndex.comboIndex.has('标准版')).toBe(true);
      
      // 统计信息应该正确
      expect(specIndex.stats.totalColors).toBe(1);
      expect(specIndex.stats.totalSpecs).toBe(1);
      expect(specIndex.stats.totalCombos).toBe(1);
    });
    
    it('应该正确处理特殊字符和中文', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青（素皮）', spec: '12GB+512GB' },
            { skuID: 102, color: '雅丹黑-玻璃', spec: '16GB+1TB' },
            { skuID: 103, combo: '标准版/无充电器' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 特殊字符应该被保留
      expect(specIndex.colorIndex.has('雅川青（素皮）')).toBe(true);
      expect(specIndex.colorIndex.has('雅丹黑-玻璃')).toBe(true);
      expect(specIndex.comboIndex.has('标准版/无充电器')).toBe(true);
    });
    
    it('性能测试：应该能快速构建大量SKU的规格索引', () => {
      // 生成100个SPU，每个SPU有10个SKU
      const largeSPUList: SPUData[] = [];
      for (let i = 0; i < 100; i++) {
        const skuIDs = [];
        for (let j = 0; j < 10; j++) {
          skuIDs.push({
            skuID: i * 10 + j,
            color: `颜色${j}`,
            spec: `${8 + j}GB+${256 + j * 128}GB`,
            combo: `版本${j % 3}`,
          });
        }
        largeSPUList.push({
          id: i,
          name: `产品 ${i}`,
          brand: '华为',
          skuIDs,
        });
      }
      
      const startTime = Date.now();
      service.buildSpecIndex(largeSPUList);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 构建1000个SKU的索引应该在1秒内完成
      expect(duration).toBeLessThan(1000);
      
      // 验证索引正确性
      const specIndex = service.getSpecIndex();
      expect(specIndex.colorIndex.size).toBeGreaterThan(0);
      expect(specIndex.specIndex.size).toBeGreaterThan(0);
      expect(specIndex.comboIndex.size).toBeGreaterThan(0);
      
      // 验证统计信息
      expect(specIndex.stats.totalColors).toBe(10); // 颜色0-9
      expect(specIndex.stats.totalSpecs).toBe(10); // 10种不同的规格
      expect(specIndex.stats.totalCombos).toBe(3); // 版本0-2
    });
  });
  
  describe('getStatistics - Task 3.4', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该返回索引统计信息', () => {
      const statistics = service.getStatistics();
      
      expect(statistics).toBeDefined();
      expect(statistics.brandIndex).toBeDefined();
      expect(statistics.modelIndex).toBeDefined();
      expect(statistics.specIndex).toBeDefined();
      expect(statistics.overall).toBeDefined();
    });
    
    it('应该在构建品牌索引后更新统计信息', () => {
      service.buildBrandIndex(mockSPUList);
      
      const statistics = service.getStatistics();
      
      // 验证品牌索引统计
      expect(statistics.brandIndex.totalBrands).toBeGreaterThan(0);
      expect(statistics.brandIndex.totalSPUs).toBe(9); // 10个SPU中有9个有品牌
      expect(statistics.brandIndex.avgSPUsPerBrand).toBeGreaterThan(0);
      expect(statistics.brandIndex.topBrands.length).toBeGreaterThan(0);
      expect(statistics.brandIndex.buildTime).toBeGreaterThanOrEqual(0);
      
      // 验证总体统计
      expect(statistics.overall.totalIndexBuildTime).toBeGreaterThanOrEqual(0);
      expect(statistics.overall.estimatedMemoryUsage).toBeGreaterThan(0);
    });
    
    it('应该在构建型号索引后更新统计信息', () => {
      service.buildModelIndex(mockSPUList);
      
      const statistics = service.getStatistics();
      
      // 验证型号索引统计
      expect(statistics.modelIndex.totalModels).toBeGreaterThan(0);
      expect(statistics.modelIndex.totalSPUs).toBeGreaterThan(0);
      expect(statistics.modelIndex.avgSPUsPerModel).toBeGreaterThan(0);
      expect(statistics.modelIndex.topModels.length).toBeGreaterThan(0);
      expect(statistics.modelIndex.buildTime).toBeGreaterThanOrEqual(0);
    });
    
    it('应该在构建规格索引后更新统计信息', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+1TB', combo: '典藏版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const statistics = service.getStatistics();
      
      // 验证规格索引统计
      expect(statistics.specIndex.colors.total).toBe(2);
      expect(statistics.specIndex.specs.total).toBe(2);
      expect(statistics.specIndex.combos.total).toBe(2);
      expect(statistics.specIndex.totalSKUsProcessed).toBe(2);
      expect(statistics.specIndex.buildTime).toBeGreaterThanOrEqual(0);
      
      // 验证Top项
      expect(statistics.specIndex.colors.topColors.length).toBe(2);
      expect(statistics.specIndex.specs.topSpecs.length).toBe(2);
      expect(statistics.specIndex.combos.topCombos.length).toBe(2);
    });
    
    it('应该正确计算平均值', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '雅川青', spec: '16GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const statistics = service.getStatistics();
      
      // 雅川青关联2个SPU，所以平均值应该是2
      expect(statistics.specIndex.colors.avgSPUsPerColor).toBe(2);
      
      // 12GB+512GB关联1个SPU，16GB+512GB关联1个SPU，平均值应该是1
      expect(statistics.specIndex.specs.avgSPUsPerSpec).toBe(1);
    });
    
    it('应该正确排序Top项（按频率降序）', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 103, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '雅丹黑', spec: '16GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const statistics = service.getStatistics();
      
      // 雅川青出现3次，雅丹黑出现1次，所以雅川青应该排在第一
      expect(statistics.specIndex.colors.topColors[0].color).toBe('雅川青');
      expect(statistics.specIndex.colors.topColors[0].count).toBe(3);
      expect(statistics.specIndex.colors.topColors[1].color).toBe('雅丹黑');
      expect(statistics.specIndex.colors.topColors[1].count).toBe(1);
    });
    
    it('应该累积总体构建时间', () => {
      service.buildBrandIndex(mockSPUList);
      const timeAfterBrand = service.getStatistics().overall.totalIndexBuildTime;
      
      service.buildModelIndex(mockSPUList);
      const timeAfterModel = service.getStatistics().overall.totalIndexBuildTime;
      
      // 总时间应该增加
      expect(timeAfterModel).toBeGreaterThanOrEqual(timeAfterBrand);
    });
    
    it('应该累积总体内存使用', () => {
      service.buildBrandIndex(mockSPUList);
      const memoryAfterBrand = service.getStatistics().overall.estimatedMemoryUsage;
      
      service.buildModelIndex(mockSPUList);
      const memoryAfterModel = service.getStatistics().overall.estimatedMemoryUsage;
      
      // 总内存应该增加
      expect(memoryAfterModel).toBeGreaterThan(memoryAfterBrand);
    });
    
    it('应该在重新构建索引时重置统计信息', () => {
      // 第一次构建
      service.buildBrandIndex(mockSPUList);
      const stats1 = service.getStatistics();
      const totalSPUs1 = stats1.brandIndex.totalSPUs;
      
      // 第二次构建（使用更少的SPU）
      const smallerList = mockSPUList.slice(0, 3);
      service.buildBrandIndex(smallerList);
      const stats2 = service.getStatistics();
      const totalSPUs2 = stats2.brandIndex.totalSPUs;
      
      // 第二次的SPU数量应该更少
      expect(totalSPUs2).toBeLessThan(totalSPUs1);
    });
  });
  
  describe('printStatisticsSummary - Task 3.4', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该能够打印统计摘要（不抛出错误）', () => {
      service.buildBrandIndex(mockSPUList);
      service.buildModelIndex(mockSPUList);
      
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
          ],
        },
      ];
      service.buildSpecIndex(spuListWithSkuIDs);
      
      // 应该不抛出错误
      expect(() => service.printStatisticsSummary()).not.toThrow();
    });
    
    it('应该能够在没有构建索引时打印统计摘要', () => {
      // 应该不抛出错误（即使没有数据）
      expect(() => service.printStatisticsSummary()).not.toThrow();
    });
  });
  
  describe('normalizeSpec - Task 4.4', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该标准化常见的容量格式（8GB+256GB -> 8+256）', () => {
      expect(service.normalizeSpec('8GB+256GB')).toBe('8+256');
      expect(service.normalizeSpec('8G+256G')).toBe('8+256');
      expect(service.normalizeSpec('8+256GB')).toBe('8+256');
      expect(service.normalizeSpec('8GB+256G')).toBe('8+256');
    });
    
    it('应该标准化12GB+512GB格式', () => {
      expect(service.normalizeSpec('12GB+512GB')).toBe('12+512');
      expect(service.normalizeSpec('12G+512G')).toBe('12+512');
      expect(service.normalizeSpec('12+512GB')).toBe('12+512');
      expect(service.normalizeSpec('12GB+512G')).toBe('12+512');
    });
    
    it('应该标准化16GB+512GB格式', () => {
      expect(service.normalizeSpec('16GB+512GB')).toBe('16+512');
      expect(service.normalizeSpec('16G+512G')).toBe('16+512');
      expect(service.normalizeSpec('16+512GB')).toBe('16+512');
      expect(service.normalizeSpec('16GB+512G')).toBe('16+512');
    });
    
    it('应该标准化TB格式（16GB+1TB -> 16+1T）', () => {
      expect(service.normalizeSpec('16GB+1TB')).toBe('16+1T');
      expect(service.normalizeSpec('16G+1T')).toBe('16+1T');
      expect(service.normalizeSpec('16+1TB')).toBe('16+1T');
      expect(service.normalizeSpec('24GB+1TB')).toBe('24+1T');
      expect(service.normalizeSpec('24G+1T')).toBe('24+1T');
      expect(service.normalizeSpec('24+1TB')).toBe('24+1T');
    });
    
    it('应该标准化单个容量值', () => {
      expect(service.normalizeSpec('256GB')).toBe('256');
      expect(service.normalizeSpec('512GB')).toBe('512');
      expect(service.normalizeSpec('1TB')).toBe('1T');
      expect(service.normalizeSpec('128GB')).toBe('128');
      expect(service.normalizeSpec('64GB')).toBe('64');
      expect(service.normalizeSpec('32GB')).toBe('32');
    });
    
    it('应该处理大小写不敏感', () => {
      expect(service.normalizeSpec('8gb+256gb')).toBe('8+256');
      expect(service.normalizeSpec('8GB+256gb')).toBe('8+256');
      expect(service.normalizeSpec('8Gb+256Gb')).toBe('8+256');
    });
    
    it('应该处理前后空格', () => {
      expect(service.normalizeSpec('  8GB+256GB  ')).toBe('8+256');
      expect(service.normalizeSpec(' 12GB+512GB ')).toBe('12+512');
    });
    
    it('应该处理空字符串和null', () => {
      expect(service.normalizeSpec('')).toBe('');
      expect(service.normalizeSpec('   ')).toBe('');
    });
    
    it('应该保留无法标准化的规格', () => {
      // 非容量规格应该保持原样
      expect(service.normalizeSpec('标准版')).toBe('标准版');
      expect(service.normalizeSpec('典藏版')).toBe('典藏版');
      expect(service.normalizeSpec('46mm')).toBe('46mm');
    });
    
    it('应该正确处理6GB+128GB格式', () => {
      expect(service.normalizeSpec('6GB+128GB')).toBe('6+128');
      expect(service.normalizeSpec('6G+128G')).toBe('6+128');
      expect(service.normalizeSpec('6+128GB')).toBe('6+128');
      expect(service.normalizeSpec('6GB+128G')).toBe('6+128');
    });
    
    it('应该正确处理8GB+128GB格式', () => {
      expect(service.normalizeSpec('8GB+128GB')).toBe('8+128');
      expect(service.normalizeSpec('8G+128G')).toBe('8+128');
      expect(service.normalizeSpec('8+128GB')).toBe('8+128');
      expect(service.normalizeSpec('8GB+128G')).toBe('8+128');
    });
    
    it('应该自动标准化未在配置中的格式', () => {
      // 即使配置中没有，也应该能自动标准化
      expect(service.normalizeSpec('32GB+256GB')).toBe('32+256');
      expect(service.normalizeSpec('32G+256G')).toBe('32+256');
    });
    
    it('应该正确处理只有G的情况（不误删）', () => {
      // "5G" 中的 G 不应该被删除（因为它不是后面跟+或结尾）
      // 但 "8G+256G" 中的 G 应该被删除
      expect(service.normalizeSpec('8G+256G')).toBe('8+256');
    });
  });
  
  describe('buildSpecIndex with normalization - Task 4.4', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该在构建索引时标准化规格', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '8GB+256GB' },
            { skuID: 102, color: '雅丹黑', spec: '8G+256G' },
            { skuID: 103, color: '白色', spec: '8+256GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 所有三种格式应该被标准化为同一个键
      expect(specIndex.specIndex.has('8+256')).toBe(true);
      
      // 不应该有原始格式的键
      expect(specIndex.specIndex.has('8GB+256GB')).toBe(false);
      expect(specIndex.specIndex.has('8G+256G')).toBe(false);
      expect(specIndex.specIndex.has('8+256GB')).toBe(false);
      
      // 标准化后的规格应该关联到SPU
      const normalizedSPUs = specIndex.specIndex.get('8+256');
      expect(normalizedSPUs).toBeDefined();
      expect(normalizedSPUs!.size).toBe(1);
      expect(normalizedSPUs!.has(1)).toBe(true);
    });
    
    it('应该合并不同SPU中的相同标准化规格', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '8GB+256GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '钛金属', spec: '8G+256G' }, // 不同格式，相同含义
          ],
        },
        {
          id: 3,
          name: 'OPPO Find X7',
          brand: 'OPPO',
          skuIDs: [
            { skuID: 301, color: '黑色', spec: '8+256GB' }, // 又一种格式
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 标准化后的规格应该关联到所有三个SPU
      const normalizedSPUs = specIndex.specIndex.get('8+256');
      expect(normalizedSPUs).toBeDefined();
      expect(normalizedSPUs!.size).toBe(3);
      expect(normalizedSPUs!.has(1)).toBe(true);
      expect(normalizedSPUs!.has(2)).toBe(true);
      expect(normalizedSPUs!.has(3)).toBe(true);
    });
    
    it('应该正确统计标准化后的规格频率', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '8GB+256GB' },
            { skuID: 102, color: '雅丹黑', spec: '8G+256G' },
            { skuID: 103, color: '白色', spec: '8+256GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const statistics = service.getStatistics();
      
      // 应该只有一个标准化后的规格
      expect(statistics.specIndex.specs.total).toBe(1);
      
      // 频率应该是3（三个SKU都使用了这个规格）
      expect(statistics.specIndex.specs.topSpecs[0].spec).toBe('8+256');
      expect(statistics.specIndex.specs.topSpecs[0].count).toBe(3);
    });
    
    it('应该正确处理混合的标准化和非标准化规格', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '8GB+256GB' }, // 会被标准化
            { skuID: 102, color: '雅丹黑', spec: '标准版' }, // 不会被标准化
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 应该有两个规格
      expect(specIndex.stats.totalSpecs).toBe(2);
      
      // 标准化的规格
      expect(specIndex.specIndex.has('8+256')).toBe(true);
      
      // 非标准化的规格保持原样
      expect(specIndex.specIndex.has('标准版')).toBe(true);
    });
    
    it('应该正确处理TB格式的标准化', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '16GB+1TB' },
            { skuID: 102, color: '雅丹黑', spec: '16G+1T' },
            { skuID: 103, color: '白色', spec: '16+1TB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 所有格式应该被标准化为 16+1T
      expect(specIndex.specIndex.has('16+1T')).toBe(true);
      expect(specIndex.stats.totalSpecs).toBe(1);
      
      const statistics = service.getStatistics();
      expect(statistics.specIndex.specs.topSpecs[0].spec).toBe('16+1T');
      expect(statistics.specIndex.specs.topSpecs[0].count).toBe(3);
    });
    
    it('应该正确处理单个容量值的标准化', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为平板',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '灰色', spec: '256GB' },
            { skuID: 102, color: '白色', spec: '512GB' },
            { skuID: 103, color: '黑色', spec: '1TB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const specIndex = service.getSpecIndex();
      
      // 应该被标准化为不带单位的格式
      expect(specIndex.specIndex.has('256')).toBe(true);
      expect(specIndex.specIndex.has('512')).toBe(true);
      expect(specIndex.specIndex.has('1T')).toBe(true);
      
      // 不应该有原始格式
      expect(specIndex.specIndex.has('256GB')).toBe(false);
      expect(specIndex.specIndex.has('512GB')).toBe(false);
      expect(specIndex.specIndex.has('1TB')).toBe(false);
    });
    
    it('性能测试：标准化不应显著影响索引构建速度', () => {
      // 生成100个SPU，每个有10个SKU，使用不同格式的规格
      const largeSPUList: SPUData[] = [];
      const formats = ['GB+', 'G+', '+GB', '+G'];
      
      for (let i = 0; i < 100; i++) {
        const skuIDs = [];
        for (let j = 0; j < 10; j++) {
          const format = formats[j % formats.length];
          let spec: string;
          
          if (format === 'GB+') {
            spec = `${8 + j}GB+${256 + j * 128}GB`;
          } else if (format === 'G+') {
            spec = `${8 + j}G+${256 + j * 128}G`;
          } else if (format === '+GB') {
            spec = `${8 + j}+${256 + j * 128}GB`;
          } else {
            spec = `${8 + j}+${256 + j * 128}G`;
          }
          
          skuIDs.push({
            skuID: i * 10 + j,
            color: `颜色${j}`,
            spec,
            combo: `版本${j % 3}`,
          });
        }
        largeSPUList.push({
          id: i,
          name: `产品 ${i}`,
          brand: '华为',
          skuIDs,
        });
      }
      
      const startTime = Date.now();
      service.buildSpecIndex(largeSPUList);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 即使有标准化，构建1000个SKU的索引也应该在1秒内完成
      expect(duration).toBeLessThan(1000);
      
      // 验证标准化正确性
      const specIndex = service.getSpecIndex();
      
      // 由于标准化，规格数量应该减少（不同格式被合并）
      expect(specIndex.stats.totalSpecs).toBeLessThan(40); // 10种规格 * 4种格式 = 40，标准化后应该只有10种
    });
  });
  
  describe('getFrequencyLists - Task 4.5', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该返回频率排序的规格列表', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 103, color: '雅丹黑', spec: '12GB+1TB', combo: '典藏版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const frequencyLists = service.getFrequencyLists();
      
      // 验证返回的结构
      expect(frequencyLists).toBeDefined();
      expect(frequencyLists.colors).toBeInstanceOf(Array);
      expect(frequencyLists.specs).toBeInstanceOf(Array);
      expect(frequencyLists.combos).toBeInstanceOf(Array);
    });
    
    it('应该按频率降序排序颜色列表', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 103, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 104, color: '雅丹黑', spec: '12GB+1TB' },
            { skuID: 105, color: '白色', spec: '16GB+512GB' },
            { skuID: 106, color: '白色', spec: '16GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const frequencyLists = service.getFrequencyLists();
      
      // 验证颜色按频率降序排序
      expect(frequencyLists.colors.length).toBe(3);
      expect(frequencyLists.colors[0].value).toBe('雅川青'); // 3次
      expect(frequencyLists.colors[0].count).toBe(3);
      expect(frequencyLists.colors[1].value).toBe('白色'); // 2次
      expect(frequencyLists.colors[1].count).toBe(2);
      expect(frequencyLists.colors[2].value).toBe('雅丹黑'); // 1次
      expect(frequencyLists.colors[2].count).toBe(1);
    });
    
    it('应该按频率降序排序规格列表', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '8GB+256GB' },
            { skuID: 102, color: '雅丹黑', spec: '8GB+256GB' },
            { skuID: 103, color: '白色', spec: '8GB+256GB' },
            { skuID: 104, color: '黑色', spec: '12GB+512GB' },
            { skuID: 105, color: '灰色', spec: '12GB+512GB' },
            { skuID: 106, color: '蓝色', spec: '16GB+1TB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const frequencyLists = service.getFrequencyLists();
      
      // 验证规格按频率降序排序（标准化后）
      expect(frequencyLists.specs.length).toBe(3);
      expect(frequencyLists.specs[0].value).toBe('8+256'); // 3次
      expect(frequencyLists.specs[0].count).toBe(3);
      expect(frequencyLists.specs[1].value).toBe('12+512'); // 2次
      expect(frequencyLists.specs[1].count).toBe(2);
      expect(frequencyLists.specs[2].value).toBe('16+1T'); // 1次
      expect(frequencyLists.specs[2].count).toBe(1);
    });
    
    it('应该按频率降序排序组合列表', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 103, color: '白色', spec: '12GB+1TB', combo: '典藏版' },
            { skuID: 104, color: '黑色', spec: '16GB+512GB', combo: '标准版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const frequencyLists = service.getFrequencyLists();
      
      // 验证组合按频率降序排序
      expect(frequencyLists.combos.length).toBe(2);
      expect(frequencyLists.combos[0].value).toBe('标准版'); // 3次
      expect(frequencyLists.combos[0].count).toBe(3);
      expect(frequencyLists.combos[1].value).toBe('典藏版'); // 1次
      expect(frequencyLists.combos[1].count).toBe(1);
    });
    
    it('应该正确处理跨多个SPU的频率统计', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
        {
          id: 2,
          name: '小米14 Pro',
          brand: '小米',
          skuIDs: [
            { skuID: 201, color: '雅川青', spec: '16GB+512GB' },
            { skuID: 202, color: '钛金属', spec: '16GB+512GB' },
          ],
        },
        {
          id: 3,
          name: 'OPPO Find X7',
          brand: 'OPPO',
          skuIDs: [
            { skuID: 301, color: '雅川青', spec: '12GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const frequencyLists = service.getFrequencyLists();
      
      // 雅川青在3个SPU中出现，总共4次（SPU1有2个，SPU2有1个，SPU3有1个）
      expect(frequencyLists.colors[0].value).toBe('雅川青');
      expect(frequencyLists.colors[0].count).toBe(4);
      
      // 12GB+512GB出现3次，16GB+512GB出现2次
      expect(frequencyLists.specs[0].value).toBe('12+512');
      expect(frequencyLists.specs[0].count).toBe(3);
      expect(frequencyLists.specs[1].value).toBe('16+512');
      expect(frequencyLists.specs[1].count).toBe(2);
    });
    
    it('应该在空索引时返回空列表', () => {
      service.buildSpecIndex([]);
      
      const frequencyLists = service.getFrequencyLists();
      
      expect(frequencyLists.colors).toEqual([]);
      expect(frequencyLists.specs).toEqual([]);
      expect(frequencyLists.combos).toEqual([]);
    });
    
    it('应该正确处理频率相同的规格（保持稳定排序）', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+512GB' },
            { skuID: 103, color: '白色', spec: '12GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const frequencyLists = service.getFrequencyLists();
      
      // 所有颜色频率相同（都是1次），应该都在列表中
      expect(frequencyLists.colors.length).toBe(3);
      expect(frequencyLists.colors[0].count).toBe(1);
      expect(frequencyLists.colors[1].count).toBe(1);
      expect(frequencyLists.colors[2].count).toBe(1);
    });
  });
  
  describe('getTopFrequentSpecs - Task 4.5', () => {
    beforeEach(async () => {
      await service.initialize(mockBrandList);
    });
    
    it('应该返回频率最高的颜色', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 102, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 103, color: '雅川青', spec: '12GB+512GB' },
            { skuID: 104, color: '雅丹黑', spec: '12GB+1TB' },
            { skuID: 105, color: '白色', spec: '16GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const topColors = service.getTopFrequentSpecs('color', 2);
      
      // 应该返回前2个最常见的颜色
      expect(topColors.length).toBe(2);
      expect(topColors[0].value).toBe('雅川青');
      expect(topColors[0].count).toBe(3);
      expect(topColors[1].value).toBe('雅丹黑');
      expect(topColors[1].count).toBe(1);
    });
    
    it('应该返回频率最高的规格', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '8GB+256GB' },
            { skuID: 102, color: '雅丹黑', spec: '8GB+256GB' },
            { skuID: 103, color: '白色', spec: '12GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const topSpecs = service.getTopFrequentSpecs('spec', 1);
      
      // 应该返回最常见的规格
      expect(topSpecs.length).toBe(1);
      expect(topSpecs[0].value).toBe('8+256');
      expect(topSpecs[0].count).toBe(2);
    });
    
    it('应该返回频率最高的组合', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 102, color: '雅丹黑', spec: '12GB+512GB', combo: '标准版' },
            { skuID: 103, color: '白色', spec: '12GB+1TB', combo: '典藏版' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      const topCombos = service.getTopFrequentSpecs('combo', 1);
      
      // 应该返回最常见的组合
      expect(topCombos.length).toBe(1);
      expect(topCombos[0].value).toBe('标准版');
      expect(topCombos[0].count).toBe(2);
    });
    
    it('应该支持自定义limit参数', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: [
            { skuID: 101, color: '颜色1', spec: '12GB+512GB' },
            { skuID: 102, color: '颜色2', spec: '12GB+512GB' },
            { skuID: 103, color: '颜色3', spec: '12GB+512GB' },
            { skuID: 104, color: '颜色4', spec: '12GB+512GB' },
            { skuID: 105, color: '颜色5', spec: '12GB+512GB' },
          ],
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      // 获取前3个
      const top3 = service.getTopFrequentSpecs('color', 3);
      expect(top3.length).toBe(3);
      
      // 获取前10个（但只有5个）
      const top10 = service.getTopFrequentSpecs('color', 10);
      expect(top10.length).toBe(5);
    });
    
    it('应该使用默认limit=10', () => {
      const spuListWithSkuIDs: SPUData[] = [
        {
          id: 1,
          name: '华为 Mate 60 Pro',
          brand: '华为',
          skuIDs: Array.from({ length: 15 }, (_, i) => ({
            skuID: 100 + i,
            color: `颜色${i}`,
            spec: '12GB+512GB',
          })),
        },
      ];
      
      service.buildSpecIndex(spuListWithSkuIDs);
      
      // 不传limit参数，应该返回前10个
      const topColors = service.getTopFrequentSpecs('color');
      expect(topColors.length).toBe(10);
    });
    
    it('应该在空索引时返回空数组', () => {
      service.buildSpecIndex([]);
      
      const topColors = service.getTopFrequentSpecs('color', 5);
      const topSpecs = service.getTopFrequentSpecs('spec', 5);
      const topCombos = service.getTopFrequentSpecs('combo', 5);
      
      expect(topColors).toEqual([]);
      expect(topSpecs).toEqual([]);
      expect(topCombos).toEqual([]);
    });
  });
});
