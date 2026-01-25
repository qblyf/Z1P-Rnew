/**
 * 智能匹配相关的类型定义
 */

// SKU ID 信息
export interface SKUIDInfo {
  skuID: number;
  color?: string;
  spec?: string;
  combo?: string;
}

// SPU 数据
export interface SPUData {
  id: number;
  name: string;
  brand?: string;
  skuIDs?: SKUIDInfo[];
}

// SKU 数据
export interface SKUData {
  id: number;
  name: string;
  spuID?: number;
  spuName?: string;
  brand?: string;
  version?: string;
  memory?: string;
  color?: string;
  gtins?: string[];
}

// 匹配结果
export interface MatchResult {
  inputName: string;
  matchedSKU: string | null;
  matchedSPU: string | null;
  matchedBrand: string | null;
  matchedVersion: string | null;
  matchedMemory: string | null;
  matchedColor: string | null;
  matchedGtins: string[];
  similarity: number;
  status: 'matched' | 'unmatched' | 'spu-matched';
}

// 产品类型
export type ProductType = 'phone' | 'watch' | 'tablet' | 'laptop' | 'earbuds' | 'band' | 'unknown';

// 版本信息
export interface VersionInfo {
  name: string;
  keywords: string[];
  priority: number;
}

// 品牌数据
export interface BrandData {
  name: string;
  color: string;
  spell?: string;
  order?: number;
}

// 产品类型特征
export interface ProductTypeFeature {
  keywords: string[];
  modelPattern: RegExp;
  specialParams: string[];
  paramPattern: RegExp;
}
