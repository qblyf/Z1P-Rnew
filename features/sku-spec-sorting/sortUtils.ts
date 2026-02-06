/**
 * 商品规格排序设置功能 - 排序工具函数
 * 
 * 本文件包含排序序号计算和列表操作的核心算法
 */

import { SpecAttribute } from './types';

/**
 * 初始化排序序号
 * 
 * 为规格属性列表分配初始排序序号
 * 第一项获得最大序号，最后一项获得最小序号（降序显示）
 * 
 * @param specs - 规格属性列表
 * @returns 带有排序序号的规格属性列表
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'Spec 1', type: 'version', sortOrder: 0 },
 *   { id: '2', name: 'Spec 2', type: 'version', sortOrder: 0 }
 * ];
 * const result = initializeSortOrders(specs);
 * // result[0].sortOrder = 20, result[1].sortOrder = 10
 */
export function initializeSortOrders(specs: SpecAttribute[]): SpecAttribute[] {
  if (specs.length === 0) {
    return [];
  }
  
  // 使用 10 的倍数作为间隔，便于后续插入新项
  const maxOrder = specs.length * 10;
  
  return specs.map((spec, index) => ({
    ...spec,
    sortOrder: maxOrder - (index * 10)
  }));
}

/**
 * 拖拽后重新计算排序序号
 * 
 * 当用户拖拽规格属性到新位置后，重新计算所有项的排序序号
 * 保持降序排列（sortOrder 值越大越靠前）
 * 
 * @param specs - 规格属性列表
 * @param fromIndex - 起始索引
 * @param toIndex - 目标索引
 * @returns 重新排序后的规格属性列表
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'A', type: 'version', sortOrder: 30 },
 *   { id: '2', name: 'B', type: 'version', sortOrder: 20 },
 *   { id: '3', name: 'C', type: 'version', sortOrder: 10 }
 * ];
 * const result = recalculateSortOrders(specs, 0, 2);
 * // 将 A 从位置 0 移动到位置 2
 * // 结果顺序: B, C, A
 */
export function recalculateSortOrders(
  specs: SpecAttribute[],
  fromIndex: number,
  toIndex: number
): SpecAttribute[] {
  if (specs.length === 0) {
    return [];
  }
  
  // 验证索引有效性
  if (fromIndex < 0 || fromIndex >= specs.length ||
      toIndex < 0 || toIndex >= specs.length) {
    return specs;
  }
  
  // 1. 移动项到新位置
  const reordered = Array.from(specs);
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  
  // 2. 重新分配排序序号（由大到小）
  const maxOrder = reordered.length * 10;
  return reordered.map((spec, index) => ({
    ...spec,
    sortOrder: maxOrder - (index * 10)
  }));
}

/**
 * 按钮移动后重新计算排序序号
 * 
 * 当用户点击上移或下移按钮时，交换两项的位置并重新计算排序序号
 * 
 * @param specs - 规格属性列表
 * @param index - 当前项的索引
 * @param direction - 移动方向：'up' 或 'down'
 * @returns 重新排序后的规格属性列表
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'A', type: 'version', sortOrder: 30 },
 *   { id: '2', name: 'B', type: 'version', sortOrder: 20 }
 * ];
 * const result = swapSortOrders(specs, 1, 'up');
 * // 将 B 上移，与 A 交换位置
 * // 结果顺序: B, A
 */
export function swapSortOrders(
  specs: SpecAttribute[],
  index: number,
  direction: 'up' | 'down'
): SpecAttribute[] {
  if (specs.length === 0) {
    return [];
  }
  
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  
  // 验证目标索引有效性
  if (targetIndex < 0 || targetIndex >= specs.length) {
    return specs;
  }
  
  // 交换两项的位置
  const reordered = Array.from(specs);
  [reordered[index], reordered[targetIndex]] = 
    [reordered[targetIndex], reordered[index]];
  
  // 重新分配排序序号（由大到小）
  const maxOrder = reordered.length * 10;
  return reordered.map((spec, idx) => ({
    ...spec,
    sortOrder: maxOrder - (idx * 10)
  }));
}

/**
 * 按排序号降序排列规格属性
 * 
 * 根据 sortOrder 字段对规格属性列表进行降序排序
 * sortOrder 值越大的项越靠前
 * 
 * @param specs - 规格属性列表
 * @returns 排序后的规格属性列表
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'A', type: 'version', sortOrder: 10 },
 *   { id: '2', name: 'B', type: 'version', sortOrder: 30 },
 *   { id: '3', name: 'C', type: 'version', sortOrder: 20 }
 * ];
 * const result = sortByOrderDescending(specs);
 * // 结果顺序: B(30), C(20), A(10)
 */
export function sortByOrderDescending(specs: SpecAttribute[]): SpecAttribute[] {
  return [...specs].sort((a, b) => b.sortOrder - a.sortOrder);
}
