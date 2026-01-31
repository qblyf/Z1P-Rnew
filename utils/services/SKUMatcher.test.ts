/**
 * SKUMatcher 单元测试
 * 
 * 测试 SKU 多维度规格匹配功能
 */

import { SKUMatcher } from './SKUMatcher';
import type { SPUData, SKUData, ProductType } from '../types';
import type { ExtractedInfo } from './types';

describe('SKUMatcher', () => {
  let matcher: SKUMatcher;
  
  beforeEach(() => {
    matcher = new SKUMatcher();
    
    // 加载产品类型配置
    matcher.loadProductTypeConfigs([
      {
        id: 'phone',
        name: '手机',
        keywords: ['手机', 'phone'],
        specWeights: {
          capacity: 0.4,
          color: 0.3,
          version: 0.3
        }
      },
      {
        id: 'watch',
        name: '手表',
        keywords: ['watch', '手表'],
        specWeights: {
          size: 0.3,
          band: 0.2,
          color: 0.3,
          version: 0.2
        }
      }
    ]);
  });
  
  describe('手机 SKU 匹配', () => {
    it('应该根据颜色、容量、版本匹配手机 SKU', async () => {
      const spu: SPUData = {
        id: 1,
        name: '华为 Mate 60 Pro',
        brand: '华为',
        skuIDs: [
          { skuID: 101, color: '雅川青', spec: '12GB+512GB', combo: '标准版' },
          { skuID: 102, color: '雅川青', spec: '12GB+1TB', combo: '标准版' },
          { skuID: 103, color: '曜石黑', spec: '12GB+512GB', combo: '标准版' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 101,
          name: '华为 Mate 60 Pro 雅川青 12GB+512GB',
          spuID: 1,
          color: '雅川青',
          memory: '12+512',
          gtins: ['6942103101']
        },
        {
          id: 102,
          name: '华为 Mate 60 Pro 雅川青 12GB+1TB',
          spuID: 1,
          color: '雅川青',
          memory: '12+1024',
          gtins: ['6942103102']
        },
        {
          id: 103,
          name: '华为 Mate 60 Pro 曜石黑 12GB+512GB',
          spuID: 1,
          color: '曜石黑',
          memory: '12+512',
          gtins: ['6942103103']
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro 雅川青 12GB+512GB',
        preprocessedInput: '华为 Mate 60 Pro 雅川青 12GB+512GB',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate 60 Pro', confidence: 1.0, source: 'exact' },
        color: { value: '雅川青', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+512', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.sku?.id).toBe(101);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.specMatches.color?.matched).toBe(true);
      expect(result.specMatches.capacity?.matched).toBe(true);
    });
    
    it('应该在颜色不匹配时选择容量匹配的 SKU', async () => {
      const spu: SPUData = {
        id: 1,
        name: '华为 Mate 60 Pro',
        brand: '华为',
        skuIDs: [
          { skuID: 101, color: '雅川青', spec: '12GB+512GB' },
          { skuID: 102, color: '曜石黑', spec: '12GB+512GB' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 101,
          name: '华为 Mate 60 Pro 雅川青 12GB+512GB',
          spuID: 1,
          color: '雅川青',
          memory: '12+512'
        },
        {
          id: 102,
          name: '华为 Mate 60 Pro 曜石黑 12GB+512GB',
          spuID: 1,
          color: '曜石黑',
          memory: '12+512'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 Pro 白色 12GB+512GB',
        preprocessedInput: '华为 Mate 60 Pro 白色 12GB+512GB',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate 60 Pro', confidence: 1.0, source: 'exact' },
        color: { value: '白色', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+512', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      // 应该匹配到某个 SKU（基于容量）
      expect(result.sku).not.toBeNull();
      expect(result.specMatches.capacity?.matched).toBe(true);
      expect(result.specMatches.color?.matched).toBe(false);
    });
    
    it('应该处理容量格式变体', async () => {
      const spu: SPUData = {
        id: 1,
        name: '小米 14 Pro',
        brand: '小米',
        skuIDs: [
          { skuID: 201, color: '黑色', spec: '16GB+512GB' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 201,
          name: '小米 14 Pro 黑色 16GB+512GB',
          spuID: 1,
          memory: '16GB+512GB'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '小米 14 Pro 黑色 16+512',
        preprocessedInput: '小米 14 Pro 黑色 16+512',
        brand: { value: '小米', confidence: 1.0, source: 'exact' },
        model: { value: '14 Pro', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: '16+512', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.sku?.id).toBe(201);
      expect(result.specMatches.capacity?.matched).toBe(true);
    });
  });
  
  describe('手表 SKU 匹配', () => {
    it('应该根据尺寸、颜色、表带匹配手表 SKU', async () => {
      const spu: SPUData = {
        id: 2,
        name: '华为 Watch GT 5 Pro',
        brand: '华为',
        skuIDs: [
          { skuID: 301, color: '黑色', spec: '46mm 氟橡胶表带' },
          { skuID: 302, color: '黑色', spec: '42mm 氟橡胶表带' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 301,
          name: '华为 Watch GT 5 Pro 46mm 黑色 氟橡胶表带',
          spuID: 2
        },
        {
          id: 302,
          name: '华为 Watch GT 5 Pro 42mm 黑色 氟橡胶表带',
          spuID: 2
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Watch GT 5 Pro 46mm 黑色 氟橡胶',
        preprocessedInput: '华为 Watch GT 5 Pro 46mm 黑色 氟橡胶',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Watch GT 5 Pro', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'watch'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'watch', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.sku?.id).toBe(301);
      expect(result.specMatches.color?.matched).toBe(true);
      expect(result.specMatches.size?.matched).toBe(true);
    });
  });
  
  describe('版本匹配', () => {
    it('应该匹配特定版本的 SKU', async () => {
      const spu: SPUData = {
        id: 3,
        name: '华为 Mate 60',
        brand: '华为',
        skuIDs: [
          { skuID: 401, color: '黑色', spec: '12GB+512GB', combo: '标准版' },
          { skuID: 402, color: '黑色', spec: '12GB+512GB', combo: '典藏版' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 401,
          name: '华为 Mate 60 黑色 12GB+512GB 标准版',
          spuID: 3,
          version: '标准版'
        },
        {
          id: 402,
          name: '华为 Mate 60 黑色 12GB+512GB 典藏版',
          spuID: 3,
          version: '典藏版'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 黑色 12GB+512GB 典藏版',
        preprocessedInput: '华为 Mate 60 黑色 12GB+512GB 典藏版',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate 60', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+512', confidence: 1.0, source: 'exact' },
        version: { value: { name: '典藏版', keywords: ['典藏'], priority: 2 }, confidence: 1.0, source: 'exact' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.sku?.id).toBe(402);
      expect(result.specMatches.version?.matched).toBe(true);
    });
    
    it('应该在没有版本信息时优先匹配标准版', async () => {
      const spu: SPUData = {
        id: 3,
        name: '华为 Mate 60',
        brand: '华为',
        skuIDs: [
          { skuID: 401, color: '黑色', spec: '12GB+512GB', combo: '标准版' },
          { skuID: 402, color: '黑色', spec: '12GB+512GB', combo: '典藏版' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 401,
          name: '华为 Mate 60 黑色 12GB+512GB 标准版',
          spuID: 3,
          version: '标准版'
        },
        {
          id: 402,
          name: '华为 Mate 60 黑色 12GB+512GB 典藏版',
          spuID: 3,
          version: '典藏版'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '华为 Mate 60 黑色 12GB+512GB',
        preprocessedInput: '华为 Mate 60 黑色 12GB+512GB',
        brand: { value: '华为', confidence: 1.0, source: 'exact' },
        model: { value: 'Mate 60', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+512', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(result.sku).not.toBeNull();
      // 应该优先匹配标准版
      expect(result.sku?.id).toBe(401);
    });
  });
  
  describe('颜色匹配', () => {
    it('应该完全匹配颜色', async () => {
      const spu: SPUData = {
        id: 4,
        name: '测试手机',
        skuIDs: [
          { skuID: 501, color: '雅川青', spec: '12GB+256GB' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 501,
          name: '测试手机 雅川青 12GB+256GB',
          spuID: 4,
          color: '雅川青'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '测试手机 雅川青 12GB+256GB',
        preprocessedInput: '测试手机 雅川青 12GB+256GB',
        brand: { value: '测试', confidence: 1.0, source: 'exact' },
        model: { value: '测试手机', confidence: 1.0, source: 'exact' },
        color: { value: '雅川青', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+256', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.specMatches.color?.score).toBe(1.0);
    });
    
    it('应该部分匹配颜色（基础颜色）', async () => {
      const spu: SPUData = {
        id: 4,
        name: '测试手机',
        skuIDs: [
          { skuID: 502, color: '曜石黑', spec: '12GB+256GB' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 502,
          name: '测试手机 曜石黑 12GB+256GB',
          spuID: 4,
          color: '曜石黑'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '测试手机 黑色 12GB+256GB',
        preprocessedInput: '测试手机 黑色 12GB+256GB',
        brand: { value: '测试', confidence: 1.0, source: 'exact' },
        model: { value: '测试手机', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+256', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.specMatches.color?.matched).toBe(true);
      expect(result.specMatches.color?.score).toBeGreaterThan(0);
      expect(result.specMatches.color?.score).toBeLessThan(1.0);
    });
  });
  
  describe('边界情况', () => {
    it('应该处理空 SKU 列表', async () => {
      const spu: SPUData = {
        id: 5,
        name: '测试手机',
        skuIDs: []
      };
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '测试手机',
        preprocessedInput: '测试手机',
        brand: { value: '测试', confidence: 1.0, source: 'exact' },
        model: { value: '测试手机', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', []);
      
      expect(result.sku).toBeNull();
      expect(result.score).toBe(0);
    });
    
    it('应该处理没有提取到任何规格的情况', async () => {
      const spu: SPUData = {
        id: 6,
        name: '测试手机',
        skuIDs: [
          { skuID: 601, color: '黑色', spec: '12GB+256GB' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 601,
          name: '测试手机 黑色 12GB+256GB',
          spuID: 6
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '测试手机',
        preprocessedInput: '测试手机',
        brand: { value: '测试', confidence: 1.0, source: 'exact' },
        model: { value: '测试手机', confidence: 1.0, source: 'exact' },
        color: { value: null, confidence: 0, source: 'inferred' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      // 应该返回某个 SKU（即使分数很低）
      expect(result.sku).not.toBeNull();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
    
    it('应该处理未知产品类型（使用默认权重）', async () => {
      const spu: SPUData = {
        id: 7,
        name: '未知产品',
        skuIDs: [
          { skuID: 701, color: '黑色', spec: '标准版' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 701,
          name: '未知产品 黑色 标准版',
          spuID: 7,
          color: '黑色'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '未知产品 黑色',
        preprocessedInput: '未知产品 黑色',
        brand: { value: '未知', confidence: 1.0, source: 'exact' },
        model: { value: '未知产品', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: null, confidence: 0, source: 'inferred' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'unknown'
      };
      
      const result = await matcher.findBestMatch(spu, extractedInfo, 'unknown', skuList);
      
      expect(result.sku).not.toBeNull();
      expect(result.specMatches.color?.matched).toBe(true);
    });
  });
  
  describe('权重配置', () => {
    it('应该根据产品类型使用不同的权重', async () => {
      const spu: SPUData = {
        id: 8,
        name: '测试产品',
        skuIDs: [
          { skuID: 801, color: '黑色', spec: '12GB+256GB' }
        ]
      };
      
      const skuList: SKUData[] = [
        {
          id: 801,
          name: '测试产品 黑色 12GB+256GB',
          spuID: 8,
          color: '黑色',
          memory: '12+256'
        }
      ];
      
      const extractedInfo: ExtractedInfo = {
        originalInput: '测试产品 黑色 12GB+256GB',
        preprocessedInput: '测试产品 黑色 12GB+256GB',
        brand: { value: '测试', confidence: 1.0, source: 'exact' },
        model: { value: '测试产品', confidence: 1.0, source: 'exact' },
        color: { value: '黑色', confidence: 1.0, source: 'exact' },
        capacity: { value: '12+256', confidence: 1.0, source: 'exact' },
        version: { value: null, confidence: 0, source: 'inferred' },
        productType: 'phone'
      };
      
      // 手机类型：容量权重 0.4，颜色权重 0.3
      const phoneResult = await matcher.findBestMatch(spu, extractedInfo, 'phone', skuList);
      
      expect(phoneResult.sku).not.toBeNull();
      expect(phoneResult.score).toBeGreaterThan(0.9);
    });
  });
});
