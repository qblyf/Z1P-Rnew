/**
 * 商品规格排序设置功能 - 核心类型定义
 * 
 * 本文件定义了规格属性排序功能所需的所有 TypeScript 接口和类型
 */

/**
 * 规格属性类型
 * - version: 版本
 * - config: 配置
 * - color: 颜色
 */
export type SpecAttributeType = 'version' | 'config' | 'color';

/**
 * 规格属性接口
 * 
 * 表示一个 SKU 规格属性，包含其基本信息和排序顺序
 */
export interface SpecAttribute {
  /** 唯一标识符 */
  id: string;
  
  /** 规格名称 */
  name: string;
  
  /** 规格描述（可选） */
  description?: string;
  
  /** 规格类型：版本、配置或颜色 */
  type: SpecAttributeType;
  
  /** 排序序号（数值越大越靠前，降序显示） */
  sortOrder: number;
  
  /** 创建时间（可选） */
  createdAt?: string;
  
  /** 更新时间（可选） */
  updatedAt?: string;
  
  /** SDK 返回的其他可编辑字段 */
  [key: string]: any;
}

/**
 * 排序操作类型
 * - drag: 拖拽操作
 * - moveUp: 上移操作
 * - moveDown: 下移操作
 */
export type SortOperationType = 'drag' | 'moveUp' | 'moveDown';

/**
 * 排序操作接口
 * 
 * 记录一次排序操作的详细信息
 */
export interface SortOperation {
  /** 操作类型 */
  type: SortOperationType;
  
  /** 被操作的规格属性 ID */
  specId: string;
  
  /** 所属类别 */
  category: SpecAttributeType;
  
  /** 起始索引位置 */
  fromIndex: number;
  
  /** 目标索引位置 */
  toIndex: number;
}

/**
 * 验证结果接口
 * 
 * 表示数据验证的结果，包含是否有效和错误信息列表
 */
export interface ValidationResult {
  /** 验证是否通过 */
  valid: boolean;
  
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 分类后的规格属性
 * 
 * 按类型分组后的规格属性集合
 */
export interface CategorizedSpecs {
  /** 版本类规格属性列表 */
  version: SpecAttribute[];
  
  /** 配置类规格属性列表 */
  config: SpecAttribute[];
  
  /** 颜色类规格属性列表 */
  color: SpecAttribute[];
}

/**
 * SDK 接口响应基础结构
 */
export interface SDKResponse<T> {
  /** 响应状态码 */
  code: number;
  
  /** 响应消息 */
  message: string;
  
  /** 响应数据 */
  data: T;
}

/**
 * 获取所有规格属性的请求参数
 */
export interface AllSpuSpecAttributeRequest {
  // 可能的过滤参数（根据实际 SDK 接口定义）
  [key: string]: any;
}

/**
 * 获取所有规格属性的响应
 */
export type AllSpuSpecAttributeResponse = SDKResponse<SpecAttribute[]>;

/**
 * 编辑规格属性的请求参数
 */
export interface EditSpuSpecAttributeRequest {
  /** 规格属性 ID */
  id: string;
  
  /** 规格名称（可选） */
  name?: string;
  
  /** 规格描述（可选） */
  description?: string;
  
  /** 规格类型（可选） */
  type?: SpecAttributeType;
  
  /** 排序序号（可选） */
  sortOrder?: number;
  
  /** 其他可编辑字段 */
  [key: string]: any;
}

/**
 * 编辑规格属性的响应
 */
export type EditSpuSpecAttributeResponse = SDKResponse<SpecAttribute>;

/**
 * 页面状态接口
 * 
 * 管理整个规格排序页面的状态
 */
export interface SpecSortingPageState {
  /** 版本类规格属性列表 */
  versionSpecs: SpecAttribute[];
  
  /** 配置类规格属性列表 */
  configSpecs: SpecAttribute[];
  
  /** 颜色类规格属性列表 */
  colorSpecs: SpecAttribute[];
  
  /** 数据加载状态 */
  loading: boolean;
  
  /** 数据保存状态 */
  saving: boolean;
  
  /** 错误信息 */
  error: string | null;
  
  /** 当前正在编辑的规格属性 */
  editingSpec: SpecAttribute | null;
  
  /** 编辑抽屉是否可见 */
  drawerVisible: boolean;
}
