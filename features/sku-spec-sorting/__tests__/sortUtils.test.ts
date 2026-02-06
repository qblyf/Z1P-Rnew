/**
 * 排序工具函数单元测试
 * 
 * 测试 sortUtils.ts 中的排序相关函数
 */

import {
  initializeSortOrders,
  recalculateSortOrders,
  swapSortOrders,
  sortByOrderDescending
} from '../sortUtils';
import { SpecAttribute } from '../types';

describe('sortUtils', () => {
  describe('initializeSortOrders', () => {
    it('应该为空列表返回空数组', () => {
      const result = initializeSortOrders([]);
      expect(result).toEqual([]);
    });

    it('应该为单项列表分配排序序号', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'Spec 1', type: 'version', sortOrder: 0 }
      ];
      
      const result = initializeSortOrders(specs);
      
      expect(result).toHaveLength(1);
      expect(result[0].sortOrder).toBe(10);
    });

    it('应该为多项列表分配降序排序序号', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'Spec 1', type: 'version', sortOrder: 0 },
        { id: '2', name: 'Spec 2', type: 'version', sortOrder: 0 },
        { id: '3', name: 'Spec 3', type: 'version', sortOrder: 0 }
      ];
      
      const result = initializeSortOrders(specs);
      
      expect(result).toHaveLength(3);
      expect(result[0].sortOrder).toBe(30); // 第一项最大
      expect(result[1].sortOrder).toBe(20);
      expect(result[2].sortOrder).toBe(10); // 最后一项最小
    });

    it('应该保持原始数据的其他字段不变', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'Spec 1', type: 'version', sortOrder: 0, description: 'Test' }
      ];
      
      const result = initializeSortOrders(specs);
      
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('Spec 1');
      expect(result[0].type).toBe('version');
      expect(result[0].description).toBe('Test');
    });
  });

  describe('recalculateSortOrders', () => {
    it('应该正确处理空列表', () => {
      const result = recalculateSortOrders([], 0, 0);
      expect(result).toEqual([]);
    });

    it('应该拒绝无效的索引', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 }
      ];
      
      // 负索引
      let result = recalculateSortOrders(specs, -1, 0);
      expect(result).toEqual(specs);
      
      // 超出范围的索引
      result = recalculateSortOrders(specs, 0, 5);
      expect(result).toEqual(specs);
    });

    it('应该将项从前面移到后面', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 },
        { id: '3', name: 'C', type: 'version', sortOrder: 10 }
      ];
      
      const result = recalculateSortOrders(specs, 0, 2);
      
      // 验证顺序：B, C, A
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
      
      // 验证排序序号是降序
      expect(result[0].sortOrder).toBeGreaterThan(result[1].sortOrder);
      expect(result[1].sortOrder).toBeGreaterThan(result[2].sortOrder);
    });

    it('应该将项从后面移到前面', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 },
        { id: '3', name: 'C', type: 'version', sortOrder: 10 }
      ];
      
      const result = recalculateSortOrders(specs, 2, 0);
      
      // 验证顺序：C, A, B
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('1');
      expect(result[2].id).toBe('2');
      
      // 验证排序序号是降序
      expect(result[0].sortOrder).toBeGreaterThan(result[1].sortOrder);
      expect(result[1].sortOrder).toBeGreaterThan(result[2].sortOrder);
    });

    it('应该保持列表长度不变', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 },
        { id: '3', name: 'C', type: 'version', sortOrder: 10 }
      ];
      
      const result = recalculateSortOrders(specs, 0, 2);
      
      expect(result).toHaveLength(specs.length);
    });
  });

  describe('swapSortOrders', () => {
    it('应该正确处理空列表', () => {
      const result = swapSortOrders([], 0, 'up');
      expect(result).toEqual([]);
    });

    it('应该拒绝首项上移', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 }
      ];
      
      const result = swapSortOrders(specs, 0, 'up');
      
      // 应该保持不变
      expect(result).toEqual(specs);
    });

    it('应该拒绝末项下移', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 }
      ];
      
      const result = swapSortOrders(specs, 1, 'down');
      
      // 应该保持不变
      expect(result).toEqual(specs);
    });

    it('应该正确执行上移操作', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 }
      ];
      
      const result = swapSortOrders(specs, 1, 'up');
      
      // 验证 B 和 A 交换了位置
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
      
      // 验证排序序号是降序
      expect(result[0].sortOrder).toBeGreaterThan(result[1].sortOrder);
    });

    it('应该正确执行下移操作', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 30 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 }
      ];
      
      const result = swapSortOrders(specs, 0, 'down');
      
      // 验证 A 和 B 交换了位置
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
      
      // 验证排序序号是降序
      expect(result[0].sortOrder).toBeGreaterThan(result[1].sortOrder);
    });
  });

  describe('sortByOrderDescending', () => {
    it('应该正确处理空列表', () => {
      const result = sortByOrderDescending([]);
      expect(result).toEqual([]);
    });

    it('应该按 sortOrder 降序排列', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', name: 'B', type: 'version', sortOrder: 30 },
        { id: '3', name: 'C', type: 'version', sortOrder: 20 }
      ];
      
      const result = sortByOrderDescending(specs);
      
      // 验证顺序：B(30), C(20), A(10)
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
      
      // 验证是降序
      expect(result[0].sortOrder).toBe(30);
      expect(result[1].sortOrder).toBe(20);
      expect(result[2].sortOrder).toBe(10);
    });

    it('应该不修改原始数组', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 10 },
        { id: '2', name: 'B', type: 'version', sortOrder: 30 }
      ];
      
      const original = [...specs];
      sortByOrderDescending(specs);
      
      // 原始数组应该保持不变
      expect(specs).toEqual(original);
    });

    it('应该正确处理相同 sortOrder 的项', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'A', type: 'version', sortOrder: 20 },
        { id: '2', name: 'B', type: 'version', sortOrder: 20 },
        { id: '3', name: 'C', type: 'version', sortOrder: 10 }
      ];
      
      const result = sortByOrderDescending(specs);
      
      // 前两项应该都是 sortOrder 20
      expect(result[0].sortOrder).toBe(20);
      expect(result[1].sortOrder).toBe(20);
      expect(result[2].sortOrder).toBe(10);
    });
  });
});
