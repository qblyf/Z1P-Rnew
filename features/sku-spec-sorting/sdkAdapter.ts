/**
 * 商品规格排序设置功能 - SDK 接口适配器
 * 
 * 本文件封装了与后端交互的 SDK 接口，提供错误处理和重试逻辑
 * 
 * @author Kiro AI Assistant
 */

import {
  allSpuSpecAttribute as allSpuSpecAttributeAPI,
  editSpuSpecAttribute as editSpuSpecAttributeAPI,
} from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute';
import type { SpuSpecAttribute } from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute-types';
import type { JWT } from '@zsqk/z1-sdk/es/z1p/alltypes';
import type {
  SpecAttribute,
  AllSpuSpecAttributeRequest,
  AllSpuSpecAttributeResponse,
  EditSpuSpecAttributeRequest,
  EditSpuSpecAttributeResponse,
} from './types';

/**
 * 重试配置
 */
interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否使用指数退避 */
  exponentialBackoff: boolean;
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

/**
 * SDK 错误类
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public code?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试包装器
 * 
 * @param fn - 要执行的异步函数
 * @param config - 重试配置
 * @returns 函数执行结果
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === config.maxRetries) {
        break;
      }
      
      // 计算延迟时间
      const delayTime = config.exponentialBackoff
        ? config.retryDelay * Math.pow(2, attempt)
        : config.retryDelay;
      
      // 等待后重试
      await delay(delayTime);
    }
  }
  
  // 所有重试都失败，抛出错误
  throw lastError;
}

/**
 * 将 SDK 返回的 SpuSpecAttribute 转换为应用层的 SpecAttribute
 * 
 * @param sdkAttr - SDK 返回的规格属性
 * @returns 应用层的规格属性
 */
function mapSDKToSpecAttribute(sdkAttr: SpuSpecAttribute): SpecAttribute {
  // 映射 name 字段：SDK 使用 'color', 'spec', 'combo'
  // 应用层使用 'color', 'config', 'version'
  let type: 'version' | 'config' | 'color';
  
  switch (sdkAttr.name) {
    case 'color':
      type = 'color';
      break;
    case 'spec':
      type = 'config';
      break;
    case 'combo':
      type = 'version';
      break;
    default:
      // 默认映射到 config
      type = 'config';
  }
  
  return {
    id: sdkAttr.zid,
    name: sdkAttr.value,
    description: sdkAttr.label.join(', '),
    type,
    sortOrder: sdkAttr.sortWeight,
    createdAt: new Date(sdkAttr.createdAt * 1000).toISOString(),
    updatedAt: new Date(sdkAttr.updatedAt * 1000).toISOString(),
    // 保留原始 SDK 数据以便编辑时使用
    _sdkData: sdkAttr,
  };
}

/**
 * 将应用层的 SpecAttribute 转换为 SDK 的更新参数
 * 
 * @param specAttr - 应用层的规格属性
 * @returns SDK 的更新参数
 */
function mapSpecAttributeToSDKUpdate(
  specAttr: Partial<SpecAttribute> & { id: string }
): Pick<SpuSpecAttribute, 'zid'> & Partial<Pick<SpuSpecAttribute, 'value' | 'label' | 'sortWeight'>> {
  const updateParams: any = {
    zid: specAttr.id,
  };
  
  if (specAttr.name !== undefined) {
    updateParams.value = specAttr.name;
  }
  
  if (specAttr.description !== undefined) {
    updateParams.label = specAttr.description.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  if (specAttr.sortOrder !== undefined) {
    updateParams.sortWeight = specAttr.sortOrder;
  }
  
  return updateParams;
}

/**
 * 获取所有规格属性列表
 * 
 * 封装 allSpuSpecAttribute SDK 接口，提供错误处理和重试逻辑
 * 
 * @param request - 请求参数（包含 auth token）
 * @param retryConfig - 可选的重试配置
 * @returns 规格属性列表响应
 * @throws {SDKError} 当请求失败时抛出
 */
export async function getAllSpuSpecAttributes(
  request: AllSpuSpecAttributeRequest & { auth: JWT },
  retryConfig?: Partial<RetryConfig>
): Promise<AllSpuSpecAttributeResponse> {
  try {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    const result = await withRetry(async () => {
      return await allSpuSpecAttributeAPI({ auth: request.auth });
    }, config);
    
    // 转换 SDK 数据为应用层数据
    const specAttributes = result.map(mapSDKToSpecAttribute);
    
    return {
      code: 200,
      message: '获取成功',
      data: specAttributes,
    };
  } catch (error) {
    // 错误处理
    const errorMessage = error instanceof Error ? error.message : '获取规格属性列表失败';
    
    throw new SDKError(
      errorMessage,
      500,
      error
    );
  }
}

/**
 * 编辑规格属性
 * 
 * 封装 editSpuSpecAttribute SDK 接口，提供错误处理和重试逻辑
 * 
 * @param request - 编辑请求参数（包含 auth token）
 * @param retryConfig - 可选的重试配置
 * @returns 编辑结果响应
 * @throws {SDKError} 当请求失败时抛出
 */
export async function editSpuSpecAttribute(
  request: EditSpuSpecAttributeRequest & { auth: JWT },
  retryConfig?: Partial<RetryConfig>
): Promise<EditSpuSpecAttributeResponse> {
  try {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    // 转换应用层数据为 SDK 参数
    const updateParams = mapSpecAttributeToSDKUpdate(request);
    
    const result = await withRetry(async () => {
      return await editSpuSpecAttributeAPI(updateParams, { auth: request.auth });
    }, config);
    
    if (!result) {
      throw new Error('编辑失败');
    }
    
    // 重新获取更新后的数据（如果需要返回完整对象）
    // 这里简化处理，返回更新后的部分数据
    const updatedSpec: SpecAttribute = {
      ...request,
      id: request.id,
      name: request.name || '',
      type: request.type || 'config',
      sortOrder: request.sortOrder || 0,
    };
    
    return {
      code: 200,
      message: '编辑成功',
      data: updatedSpec,
    };
  } catch (error) {
    // 错误处理
    const errorMessage = error instanceof Error ? error.message : '编辑规格属性失败';
    
    throw new SDKError(
      errorMessage,
      500,
      error
    );
  }
}

/**
 * 批量更新规格属性的排序
 * 
 * 这是一个便捷方法，用于批量更新多个规格属性的 sortOrder
 * 
 * @param specs - 要更新的规格属性列表（只需要 id 和 sortOrder）
 * @param auth - JWT 认证 token
 * @param retryConfig - 可选的重试配置
 * @returns 更新结果
 * @throws {SDKError} 当任何更新失败时抛出
 */
export async function batchUpdateSortOrders(
  specs: Array<{ id: string; sortOrder: number }>,
  auth: JWT,
  retryConfig?: Partial<RetryConfig>
): Promise<{ success: boolean; failedIds: string[] }> {
  const failedIds: string[] = [];
  
  // 并行更新所有规格属性
  const updatePromises = specs.map(async (spec) => {
    try {
      await editSpuSpecAttribute(
        {
          id: spec.id,
          sortOrder: spec.sortOrder,
          auth,
        },
        retryConfig
      );
      return { id: spec.id, success: true };
    } catch (error) {
      console.error(`Failed to update spec ${spec.id}:`, error);
      failedIds.push(spec.id);
      return { id: spec.id, success: false };
    }
  });
  
  await Promise.all(updatePromises);
  
  return {
    success: failedIds.length === 0,
    failedIds,
  };
}

/**
 * 导出重试配置类型，供外部使用
 */
export type { RetryConfig };
