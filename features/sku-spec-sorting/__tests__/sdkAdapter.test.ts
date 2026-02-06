/**
 * SDK 适配器单元测试
 * 
 * 测试 SDK 接口封装的功能，包括：
 * - 成功场景
 * - 错误处理
 * - 重试逻辑
 * - 数据转换
 */

import {
  getAllSpuSpecAttributes,
  editSpuSpecAttribute,
  batchUpdateSortOrders,
  SDKError,
} from '../sdkAdapter';
import type { SpuSpecAttribute } from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute-types';

// Mock SDK 模块
jest.mock('@zsqk/z1-sdk/es/z1p/spu-spec-attribute', () => ({
  allSpuSpecAttribute: jest.fn(),
  editSpuSpecAttribute: jest.fn(),
}));

import {
  allSpuSpecAttribute as allSpuSpecAttributeAPI,
  editSpuSpecAttribute as editSpuSpecAttributeAPI,
} from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute';

describe('SDK Adapter', () => {
  const mockAuth = 'mock-jwt-token';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getAllSpuSpecAttributes', () => {
    it('应该成功获取规格属性列表', async () => {
      // 准备 mock 数据
      const mockSDKData: SpuSpecAttribute[] = [
        {
          zid: '1',
          name: 'color' as any,
          value: '红色',
          label: ['标签1', '标签2'],
          sortWeight: 100,
          createdAt: 1640000000,
          createdBy: 'user1',
          updatedAt: 1640000000,
          updatedBy: 'user1',
        },
        {
          zid: '2',
          name: 'spec' as any,
          value: '8GB+256GB',
          label: ['内存', '存储'],
          sortWeight: 90,
          createdAt: 1640000000,
          createdBy: 'user1',
          updatedAt: 1640000000,
          updatedBy: 'user1',
        },
      ];
      
      (allSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(mockSDKData);
      
      // 执行
      const result = await getAllSpuSpecAttributes({ auth: mockAuth });
      
      // 验证
      expect(result.code).toBe(200);
      expect(result.message).toBe('获取成功');
      expect(result.data).toHaveLength(2);
      
      // 验证数据转换
      expect(result.data[0]).toMatchObject({
        id: '1',
        name: '红色',
        type: 'color',
        sortOrder: 100,
        description: '标签1, 标签2',
      });
      
      expect(result.data[1]).toMatchObject({
        id: '2',
        name: '8GB+256GB',
        type: 'config',
        sortOrder: 90,
        description: '内存, 存储',
      });
      
      // 验证 SDK 调用
      expect(allSpuSpecAttributeAPI).toHaveBeenCalledWith({ auth: mockAuth });
      expect(allSpuSpecAttributeAPI).toHaveBeenCalledTimes(1);
    });
    
    it('应该正确映射 combo 类型为 version', async () => {
      const mockSDKData: SpuSpecAttribute[] = [
        {
          zid: '3',
          name: 'combo' as any,
          value: '套装版',
          label: [],
          sortWeight: 80,
          createdAt: 1640000000,
          createdBy: 'user1',
          updatedAt: 1640000000,
          updatedBy: 'user1',
        },
      ];
      
      (allSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(mockSDKData);
      
      const result = await getAllSpuSpecAttributes({ auth: mockAuth });
      
      expect(result.data[0].type).toBe('version');
    });
    
    it('应该处理空列表', async () => {
      (allSpuSpecAttributeAPI as jest.Mock).mockResolvedValue([]);
      
      const result = await getAllSpuSpecAttributes({ auth: mockAuth });
      
      expect(result.code).toBe(200);
      expect(result.data).toEqual([]);
    });
    
    it('应该在 SDK 调用失败时抛出 SDKError', async () => {
      const mockError = new Error('Network error');
      (allSpuSpecAttributeAPI as jest.Mock).mockRejectedValue(mockError);
      
      await expect(
        getAllSpuSpecAttributes(
          { auth: mockAuth },
          { maxRetries: 0, retryDelay: 10, exponentialBackoff: false }
        )
      ).rejects.toThrow(SDKError);
      
      await expect(
        getAllSpuSpecAttributes(
          { auth: mockAuth },
          { maxRetries: 0, retryDelay: 10, exponentialBackoff: false }
        )
      ).rejects.toThrow('Network error');
    });
    
    it('应该在失败时进行重试', async () => {
      // 前两次失败，第三次成功
      (allSpuSpecAttributeAPI as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce([]);
      
      const result = await getAllSpuSpecAttributes(
        { auth: mockAuth },
        { maxRetries: 3, retryDelay: 10, exponentialBackoff: false }
      );
      
      expect(result.code).toBe(200);
      expect(allSpuSpecAttributeAPI).toHaveBeenCalledTimes(3);
    });
    
    it('应该在达到最大重试次数后抛出错误', async () => {
      (allSpuSpecAttributeAPI as jest.Mock).mockRejectedValue(
        new Error('Persistent error')
      );
      
      await expect(
        getAllSpuSpecAttributes(
          { auth: mockAuth },
          { maxRetries: 2, retryDelay: 10, exponentialBackoff: false }
        )
      ).rejects.toThrow('Persistent error');
      
      // 初始调用 + 2 次重试 = 3 次调用
      expect(allSpuSpecAttributeAPI).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('editSpuSpecAttribute', () => {
    it('应该成功编辑规格属性', async () => {
      (editSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(true);
      
      const request = {
        id: '1',
        name: '新名称',
        sortOrder: 150,
        auth: mockAuth,
      };
      
      const result = await editSpuSpecAttribute(request);
      
      expect(result.code).toBe(200);
      expect(result.message).toBe('编辑成功');
      expect(result.data).toMatchObject({
        id: '1',
        name: '新名称',
        sortOrder: 150,
      });
      
      // 验证 SDK 调用参数
      expect(editSpuSpecAttributeAPI).toHaveBeenCalledWith(
        {
          zid: '1',
          value: '新名称',
          sortWeight: 150,
        },
        { auth: mockAuth }
      );
    });
    
    it('应该正确转换 description 为 label 数组', async () => {
      (editSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(true);
      
      const request = {
        id: '1',
        description: '标签A, 标签B, 标签C',
        auth: mockAuth,
      };
      
      await editSpuSpecAttribute(request);
      
      expect(editSpuSpecAttributeAPI).toHaveBeenCalledWith(
        {
          zid: '1',
          label: ['标签A', '标签B', '标签C'],
        },
        { auth: mockAuth }
      );
    });
    
    it('应该只更新提供的字段', async () => {
      (editSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(true);
      
      const request = {
        id: '1',
        sortOrder: 200,
        auth: mockAuth,
      };
      
      await editSpuSpecAttribute(request);
      
      expect(editSpuSpecAttributeAPI).toHaveBeenCalledWith(
        {
          zid: '1',
          sortWeight: 200,
        },
        { auth: mockAuth }
      );
    });
    
    it('应该在 SDK 返回 false 时抛出错误', async () => {
      (editSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(false);
      
      await expect(
        editSpuSpecAttribute({
          id: '1',
          name: '测试',
          auth: mockAuth,
        })
      ).rejects.toThrow(SDKError);
    });
    
    it('应该在 SDK 调用失败时抛出 SDKError', async () => {
      (editSpuSpecAttributeAPI as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );
      
      await expect(
        editSpuSpecAttribute(
          {
            id: '1',
            name: '测试',
            auth: mockAuth,
          },
          { maxRetries: 0, retryDelay: 10, exponentialBackoff: false }
        )
      ).rejects.toThrow(SDKError);
    });
    
    it('应该在失败时进行重试', async () => {
      (editSpuSpecAttributeAPI as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(true);
      
      const result = await editSpuSpecAttribute(
        {
          id: '1',
          name: '测试',
          auth: mockAuth,
        },
        { maxRetries: 2, retryDelay: 10, exponentialBackoff: false }
      );
      
      expect(result.code).toBe(200);
      expect(editSpuSpecAttributeAPI).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('batchUpdateSortOrders', () => {
    it('应该成功批量更新排序', async () => {
      (editSpuSpecAttributeAPI as jest.Mock).mockResolvedValue(true);
      
      const specs = [
        { id: '1', sortOrder: 100 },
        { id: '2', sortOrder: 90 },
        { id: '3', sortOrder: 80 },
      ];
      
      const result = await batchUpdateSortOrders(specs, mockAuth);
      
      expect(result.success).toBe(true);
      expect(result.failedIds).toEqual([]);
      expect(editSpuSpecAttributeAPI).toHaveBeenCalledTimes(3);
    });
    
    it('应该记录失败的更新', async () => {
      // 使用 mockImplementation 来为每次调用返回不同的结果
      let callCount = 0;
      (editSpuSpecAttributeAPI as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Update failed'));
        }
        return Promise.resolve(true);
      });
      
      const specs = [
        { id: '1', sortOrder: 100 },
        { id: '2', sortOrder: 90 },
        { id: '3', sortOrder: 80 },
      ];
      
      const result = await batchUpdateSortOrders(
        specs,
        mockAuth,
        { maxRetries: 0, retryDelay: 10, exponentialBackoff: false }
      );
      
      expect(result.success).toBe(false);
      expect(result.failedIds).toEqual(['2']);
      expect(editSpuSpecAttributeAPI).toHaveBeenCalledTimes(3);
    });
    
    it('应该处理空列表', async () => {
      const result = await batchUpdateSortOrders([], mockAuth);
      
      expect(result.success).toBe(true);
      expect(result.failedIds).toEqual([]);
      expect(editSpuSpecAttributeAPI).not.toHaveBeenCalled();
    });
    
    it('应该并行执行所有更新', async () => {
      const startTime = Date.now();
      
      // 模拟每个更新需要 50ms
      (editSpuSpecAttributeAPI as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 50))
      );
      
      const specs = [
        { id: '1', sortOrder: 100 },
        { id: '2', sortOrder: 90 },
        { id: '3', sortOrder: 80 },
      ];
      
      await batchUpdateSortOrders(specs, mockAuth);
      
      const duration = Date.now() - startTime;
      
      // 如果是并行执行，总时间应该接近 50ms 而不是 150ms
      // 给一些余量，检查是否小于 100ms
      expect(duration).toBeLessThan(100);
    });
  });
  
  describe('SDKError', () => {
    it('应该创建带有消息的错误', () => {
      const error = new SDKError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SDKError');
      expect(error.code).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });
    
    it('应该创建带有代码和原始错误的错误', () => {
      const originalError = new Error('Original');
      const error = new SDKError('Test error', 500, originalError);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.originalError).toBe(originalError);
    });
  });
});
