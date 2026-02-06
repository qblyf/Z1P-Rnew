/**
 * 商品规格排序设置功能 - 验证工具函数
 * 
 * 本文件包含数据验证相关的函数
 */

import { SpecAttribute, ValidationResult } from './types';

/**
 * 验证排序序号的有效性
 * 
 * 检查规格属性列表中的排序序号是否满足以下条件：
 * 1. 每个排序序号都是正整数（大于 0）
 * 2. 同一列表中的排序序号不重复
 * 
 * @param specs - 规格属性列表
 * @returns 验证结果，包含是否有效和错误信息列表
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'A', type: 'version', sortOrder: 10 },
 *   { id: '2', name: 'B', type: 'version', sortOrder: 10 } // 重复
 * ];
 * const result = validateSortOrders(specs);
 * // result.valid = false
 * // result.errors = ['排序序号 10 重复']
 */
export function validateSortOrders(specs: SpecAttribute[]): ValidationResult {
  const errors: string[] = [];
  const sortOrders = new Set<number>();
  
  for (const spec of specs) {
    // 验证排序序号是正整数
    if (!Number.isInteger(spec.sortOrder) || spec.sortOrder <= 0) {
      errors.push(`规格 ${spec.name} 的排序序号必须是正整数`);
    }
    
    // 验证排序序号唯一性
    if (sortOrders.has(spec.sortOrder)) {
      errors.push(`排序序号 ${spec.sortOrder} 重复`);
    }
    sortOrders.add(spec.sortOrder);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证规格属性数据格式
 * 
 * 检查规格属性对象是否包含所有必需字段且类型正确
 * 必需字段：id, name, type, sortOrder
 * 
 * @param spec - 规格属性对象
 * @returns 验证结果，包含是否有效和错误信息列表
 * 
 * @example
 * const spec = { id: '1', name: 'A', type: 'version', sortOrder: 10 };
 * const result = validateSpecAttribute(spec);
 * // result.valid = true
 */
export function validateSpecAttribute(spec: any): ValidationResult {
  const errors: string[] = [];
  
  // 验证必需字段存在
  if (!spec.id || typeof spec.id !== 'string') {
    errors.push('规格属性必须包含有效的 id 字段（字符串类型）');
  }
  
  if (!spec.name || typeof spec.name !== 'string') {
    errors.push('规格属性必须包含有效的 name 字段（字符串类型）');
  }
  
  if (!spec.type || !['version', 'config', 'color'].includes(spec.type)) {
    errors.push('规格属性必须包含有效的 type 字段（version、config 或 color）');
  }
  
  if (typeof spec.sortOrder !== 'number') {
    errors.push('规格属性必须包含有效的 sortOrder 字段（数值类型）');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 批量验证规格属性列表
 * 
 * 验证规格属性列表中的每一项是否符合数据格式要求
 * 
 * @param specs - 规格属性列表
 * @returns 验证结果，包含是否有效和错误信息列表
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'A', type: 'version', sortOrder: 10 },
 *   { id: '2', name: 'B', type: 'invalid', sortOrder: 20 }
 * ];
 * const result = validateSpecAttributeList(specs);
 * // result.valid = false
 */
export function validateSpecAttributeList(specs: any[]): ValidationResult {
  const allErrors: string[] = [];
  
  specs.forEach((spec, index) => {
    const result = validateSpecAttribute(spec);
    if (!result.valid) {
      allErrors.push(`第 ${index + 1} 项：${result.errors.join(', ')}`);
    }
  });
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}
