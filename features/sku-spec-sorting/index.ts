/**
 * 商品规格排序设置功能 - 主导出文件
 * 
 * 统一导出所有类型定义和工具函数
 */

// 导出类型定义
export type {
  SpecAttribute,
  SpecAttributeType,
  SortOperation,
  SortOperationType,
  ValidationResult,
  CategorizedSpecs,
  SDKResponse,
  AllSpuSpecAttributeRequest,
  AllSpuSpecAttributeResponse,
  EditSpuSpecAttributeRequest,
  EditSpuSpecAttributeResponse,
  SpecSortingPageState
} from './types';

// 导出排序工具函数
export {
  initializeSortOrders,
  recalculateSortOrders,
  swapSortOrders,
  sortByOrderDescending
} from './sortUtils';

// 导出验证工具函数
export {
  validateSortOrders,
  validateSpecAttribute,
  validateSpecAttributeList
} from './validationUtils';

// 导出分类工具函数
export {
  categorizeAndSortSpecs,
  mergeCategorizedSpecs,
  findSpecIndexInCategory
} from './categoryUtils';

// 导出 SDK 适配器
export {
  getAllSpuSpecAttributes,
  editSpuSpecAttribute,
  batchUpdateSortOrders,
  SDKError,
  type RetryConfig
} from './sdkAdapter';

// 导出组件
export { SpecItem, type SpecItemProps } from './components/SpecItem';
export { DraggableSpecItem, type DraggableSpecItemProps } from './components/DraggableSpecItem';
export { SpecColumnList, type SpecColumnListProps } from './components/SpecColumnList';
export { SpecEditDrawer, type SpecEditDrawerProps } from './components/SpecEditDrawer';
export { SpecSortingPage, type SpecSortingPageProps } from './SpecSortingPage';
