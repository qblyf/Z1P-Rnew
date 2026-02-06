/**
 * 商品规格排序设置功能 - 分类工具函数
 * 
 * 本文件包含规格属性分类和分组相关的函数
 */

import { SpecAttribute, CategorizedSpecs } from './types';
import { sortByOrderDescending } from './sortUtils';

/**
 * 按类型分组并排序规格属性
 * 
 * 将规格属性列表按照 type 字段分为版本、配置、颜色三个类别
 * 每个类别内按 sortOrder 降序排序（值越大越靠前）
 * 
 * @param specs - 规格属性列表
 * @returns 分类后的规格属性对象，包含 version、config、color 三个数组
 * 
 * @example
 * const specs = [
 *   { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
 *   { id: '2', name: 'C1', type: 'color', sortOrder: 20 },
 *   { id: '3', name: 'V2', type: 'version', sortOrder: 10 }
 * ];
 * const result = categorizeAndSortSpecs(specs);
 * // result.version = [V1(30), V2(10)]
 * // result.config = []
 * // result.color = [C1(20)]
 */
export function categorizeAndSortSpecs(specs: SpecAttribute[]): CategorizedSpecs {
  // 按类型分组
  const categorized: CategorizedSpecs = {
    version: specs.filter(s => s.type === 'version'),
    config: specs.filter(s => s.type === 'config'),
    color: specs.filter(s => s.type === 'color')
  };
  
  // 每个类别内按 sortOrder 降序排序（大到小）
  return {
    version: sortByOrderDescending(categorized.version),
    config: sortByOrderDescending(categorized.config),
    color: sortByOrderDescending(categorized.color)
  };
}

/**
 * 合并分类后的规格属性为单一列表
 * 
 * 将分类后的规格属性对象合并为一个列表
 * 顺序为：版本 -> 配置 -> 颜色
 * 
 * @param categorized - 分类后的规格属性对象
 * @returns 合并后的规格属性列表
 * 
 * @example
 * const categorized = {
 *   version: [{ id: '1', name: 'V1', type: 'version', sortOrder: 30 }],
 *   config: [{ id: '2', name: 'C1', type: 'config', sortOrder: 20 }],
 *   color: [{ id: '3', name: 'Col1', type: 'color', sortOrder: 10 }]
 * };
 * const result = mergeCategorizedSpecs(categorized);
 * // result = [V1, C1, Col1]
 */
export function mergeCategorizedSpecs(categorized: CategorizedSpecs): SpecAttribute[] {
  return [
    ...categorized.version,
    ...categorized.config,
    ...categorized.color
  ];
}

/**
 * 获取规格属性在其类别中的索引
 * 
 * 在分类后的规格属性中查找指定 ID 的规格属性，并返回其在所属类别中的索引
 * 
 * @param categorized - 分类后的规格属性对象
 * @param specId - 规格属性 ID
 * @returns 包含类别和索引的对象，如果未找到则返回 null
 * 
 * @example
 * const categorized = {
 *   version: [
 *     { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
 *     { id: '2', name: 'V2', type: 'version', sortOrder: 20 }
 *   ],
 *   config: [],
 *   color: []
 * };
 * const result = findSpecIndexInCategory(categorized, '2');
 * // result = { category: 'version', index: 1 }
 */
export function findSpecIndexInCategory(
  categorized: CategorizedSpecs,
  specId: string
): { category: keyof CategorizedSpecs; index: number } | null {
  // 在版本类别中查找
  const versionIndex = categorized.version.findIndex(s => s.id === specId);
  if (versionIndex !== -1) {
    return { category: 'version', index: versionIndex };
  }
  
  // 在配置类别中查找
  const configIndex = categorized.config.findIndex(s => s.id === specId);
  if (configIndex !== -1) {
    return { category: 'config', index: configIndex };
  }
  
  // 在颜色类别中查找
  const colorIndex = categorized.color.findIndex(s => s.id === specId);
  if (colorIndex !== -1) {
    return { category: 'color', index: colorIndex };
  }
  
  return null;
}
