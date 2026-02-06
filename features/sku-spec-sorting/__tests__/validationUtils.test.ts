/**
 * 验证工具函数单元测试
 * 
 * 测试 validationUtils.ts 中的验证相关函数
 */

import {
  validateSortOrders,
  validateSpecAttribute,
  validateSpecAttributeList
} from '../validationUtils';
import { SpecAttribute } from '../types';

describe('validationUtils', () => {
  describe('validateSortOrders', () => {
    it('应该通过有效的排序序号验证', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 },
        { id: '3', name: 'C', type: 'version', sortOrder: 30 }
      ];
      
      const result = validateSortOrders(specs);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝重复的排序序号', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', name: 'B', type: 'version', sortOrder: 10 }
      ];
      
      const result = validateSortOrders(specs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('重复'))).toBe(true);
    });

    it('应该拒绝非正整数的排序序号', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 0 }
      ];
      
      const result = validateSortOrders(specs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('正整数'))).toBe(true);
    });

    it('应该拒绝负数排序序号', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: -5 }
      ];
      
      const result = validateSortOrders(specs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝小数排序序号', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10.5 }
      ];
      
      const result = validateSortOrders(specs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该正确处理空列表', () => {
      const result = validateSortOrders([]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测多个错误', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 0 },
        { id: '2', name: 'B', type: 'version', sortOrder: 10 },
        { id: '3', name: 'C', type: 'version', sortOrder: 10 }
      ];
      
      const result = validateSortOrders(specs);
      
      expect(result.valid).toBe(false);
      // 应该有至少 2 个错误：一个是 0 不是正整数，一个是 10 重复
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateSpecAttribute', () => {
    it('应该通过有效的规格属性验证', () => {
      const spec: SpecAttribute = {
        id: '1',
        name: 'Test Spec',
        type: 'version',
        sortOrder: 10
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少 id 的规格属性', () => {
      const spec: any = {
        name: 'Test Spec',
        type: 'version',
        sortOrder: 10
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('应该拒绝缺少 name 的规格属性', () => {
      const spec: any = {
        id: '1',
        type: 'version',
        sortOrder: 10
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('应该拒绝无效的 type', () => {
      const spec: any = {
        id: '1',
        name: 'Test Spec',
        type: 'invalid',
        sortOrder: 10
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });

    it('应该拒绝非数值的 sortOrder', () => {
      const spec: any = {
        id: '1',
        name: 'Test Spec',
        type: 'version',
        sortOrder: '10'
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('sortOrder'))).toBe(true);
    });

    it('应该接受包含可选字段的规格属性', () => {
      const spec: SpecAttribute = {
        id: '1',
        name: 'Test Spec',
        type: 'version',
        sortOrder: 10,
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测多个错误', () => {
      const spec: any = {
        // 缺少 id
        // 缺少 name
        type: 'invalid',
        sortOrder: '10'
      };
      
      const result = validateSpecAttribute(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateSpecAttributeList', () => {
    it('应该通过有效的规格属性列表验证', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', name: 'B', type: 'config', sortOrder: 20 },
        { id: '3', name: 'C', type: 'color', sortOrder: 30 }
      ];
      
      const result = validateSpecAttributeList(specs);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝包含无效项的列表', () => {
      const specs: any[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', type: 'config', sortOrder: 20 }, // 缺少 name
        { id: '3', name: 'C', type: 'invalid', sortOrder: 30 } // 无效 type
      ];
      
      const result = validateSpecAttributeList(specs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('应该正确处理空列表', () => {
      const result = validateSpecAttributeList([]);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该在错误信息中包含项的索引', () => {
      const specs: any[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', type: 'config', sortOrder: 20 } // 第 2 项缺少 name
      ];
      
      const result = validateSpecAttributeList(specs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('第 2 项'))).toBe(true);
    });
  });
});
