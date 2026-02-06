/**
 * 测试设置文件
 * 
 * 配置测试环境和通用的测试工具
 */

import fc from 'fast-check';
import { SpecAttribute, SpecAttributeType } from '../types';

/**
 * fast-check 生成器：生成随机的规格属性类型
 */
export const specAttributeTypeArbitrary = fc.constantFrom<SpecAttributeType>(
  'version',
  'config',
  'color'
);

/**
 * fast-check 生成器：生成随机的规格属性对象
 * 
 * 生成符合 SpecAttribute 接口的随机对象，用于基于属性的测试
 */
export const specAttributeArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: specAttributeTypeArbitrary,
  sortOrder: fc.integer({ min: 1, max: 1000 }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined })
}) as fc.Arbitrary<SpecAttribute>;

/**
 * fast-check 生成器：生成指定类型的规格属性列表
 * 
 * @param type - 规格属性类型
 * @param minLength - 最小列表长度
 * @param maxLength - 最大列表长度
 */
export function specAttributeListOfType(
  type: SpecAttributeType,
  minLength: number = 0,
  maxLength: number = 20
): fc.Arbitrary<SpecAttribute[]> {
  return fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      type: fc.constant(type),
      sortOrder: fc.integer({ min: 1, max: 1000 }),
      description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined })
    }) as fc.Arbitrary<SpecAttribute>,
    { minLength, maxLength }
  );
}

/**
 * fast-check 生成器：生成规格属性列表
 * 
 * @param minLength - 最小列表长度
 * @param maxLength - 最大列表长度
 */
export function specAttributeListArbitrary(
  minLength: number = 0,
  maxLength: number = 50
): fc.Arbitrary<SpecAttribute[]> {
  return fc.array(specAttributeArbitrary, { minLength, maxLength });
}

/**
 * 测试配置：基于属性的测试默认运行次数
 */
export const PBT_NUM_RUNS = 100;

/**
 * 辅助函数：检查列表是否按降序排列
 */
export function isDescending(list: SpecAttribute[]): boolean {
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].sortOrder < list[i + 1].sortOrder) {
      return false;
    }
  }
  return true;
}

/**
 * 辅助函数：检查两个规格属性列表是否包含相同的 ID（忽略顺序）
 */
export function haveSameIds(list1: SpecAttribute[], list2: SpecAttribute[]): boolean {
  if (list1.length !== list2.length) {
    return false;
  }
  
  const ids1 = new Set(list1.map(s => s.id));
  const ids2 = new Set(list2.map(s => s.id));
  
  if (ids1.size !== ids2.size) {
    return false;
  }
  
  for (const id of ids1) {
    if (!ids2.has(id)) {
      return false;
    }
  }
  
  return true;
}
