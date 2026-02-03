/**
 * Type Definitions for Smart Matching System
 * 
 * This module contains all TypeScript interfaces and types used throughout
 * the SKU smart matching system. These types ensure type safety and provide
 * clear contracts for data structures.
 * 
 * @module types
 */

/**
 * SKU ID Information
 * 
 * Represents structured information about a SKU extracted from the SPU's skuIDs field.
 * This information is used for building specification indexes and matching SKUs.
 * 
 * @interface SKUIDInfo
 * @property {number} skuID - Unique identifier for the SKU
 * @property {string} [color] - Color specification (e.g., "雅川青", "曜石黑")
 * @property {string} [spec] - Specification string (e.g., "12GB+512GB", "16GB+1TB")
 * @property {string} [combo] - Combo/bundle information (e.g., "标准版", "典藏版")
 */
export interface SKUIDInfo {
  skuID: number;
  color?: string;
  spec?: string;
  combo?: string;
}

/**
 * SPU (Standard Product Unit) Data
 * 
 * Represents a product model/series that can have multiple SKU variants.
 * For example, "华为 Mate 60 Pro" is an SPU that has multiple SKUs
 * with different colors, storage capacities, etc.
 * 
 * @interface SPUData
 * @property {number} id - Unique identifier for the SPU
 * @property {string} name - Full name of the SPU (e.g., "华为 Mate 60 Pro")
 * @property {string} [brand] - Brand name (e.g., "华为", "小米")
 * @property {SKUIDInfo[]} [skuIDs] - Array of SKU information for this SPU
 */
export interface SPUData {
  id: number;
  name: string;
  brand?: string;
  skuIDs?: SKUIDInfo[];
}

/**
 * Enhanced SPU Data with Pre-extracted Information
 * 
 * Extends SPUData with pre-extracted and normalized information for efficient matching.
 * This data is generated during the preprocessing phase to avoid repeated extraction
 * during matching operations.
 * 
 * The preprocessing extracts:
 * - Brand information (from brand field or name)
 * - Model information (core product model after removing brand and specs)
 * - Normalized model (standardized format for exact matching)
 * - Simplicity score (measure of name conciseness for prioritization)
 * 
 * @interface EnhancedSPUData
 * @extends SPUData
 * @property {string | null} extractedBrand - Pre-extracted brand name from SPU
 *   - Prioritizes the `brand` field if available
 *   - Otherwise extracts from `name` using brand recognition
 *   - null if extraction fails
 * @property {string | null} extractedModel - Pre-extracted model name
 *   - Core model identifier after removing brand, color, capacity, etc.
 *   - Example: "Mate 60 Pro" from "华为 Mate 60 Pro 12GB+512GB 雅川青"
 *   - null if extraction fails
 * @property {string | null} normalizedModel - Normalized model for matching
 *   - Standardized format: lowercase + no spaces + no special characters
 *   - Example: "mate60pro" from "Mate 60 Pro"
 *   - Used for exact model comparison during matching
 *   - null if model extraction fails
 * @property {number} simplicity - Simplicity score (lower = more concise)
 *   - Formula: name.length - brand.length - model.length - specs.length
 *   - Used for prioritization when match scores are equal
 *   - Lower values indicate more concise/standard product names
 *   - Example: "华为 Mate 60 Pro" has lower simplicity than "华为 Mate 60 Pro 典藏版"
 * @property {number} [preprocessedAt] - Timestamp when preprocessing occurred
 *   - Unix timestamp in milliseconds
 *   - Optional field for debugging and cache validation
 * 
 * @example
 * // Original SPU
 * const spu: SPUData = {
 *   id: 1,
 *   name: "华为 Mate 60 Pro 12GB+512GB 雅川青",
 *   brand: "华为",
 *   skuIDs: [...]
 * };
 * 
 * // Enhanced SPU after preprocessing
 * const enhanced: EnhancedSPUData = {
 *   ...spu,
 *   extractedBrand: "华为",
 *   extractedModel: "Mate 60 Pro",
 *   normalizedModel: "mate60pro",
 *   simplicity: 6,
 *   preprocessedAt: 1704067200000
 * };
 * 
 * @see SPUData - Base interface
 * @see Requirements 2.1.1, 2.1.2, 2.1.4 - Preprocessing requirements
 */
export interface EnhancedSPUData extends SPUData {
  extractedBrand: string | null;
  extractedModel: string | null;
  normalizedModel: string | null;
  simplicity: number;
  preprocessedAt?: number;
}

/**
 * SKU (Stock Keeping Unit) Data
 * 
 * Represents a specific product variant with exact specifications.
 * For example, "华为 Mate 60 Pro 雅川青 12GB+512GB" is a specific SKU.
 * 
 * @interface SKUData
 * @property {number} id - Unique identifier for the SKU
 * @property {string} name - Full name of the SKU including all specifications
 * @property {number} [spuID] - ID of the parent SPU
 * @property {string} [spuName] - Name of the parent SPU
 * @property {string} [brand] - Brand name
 * @property {string} [version] - Version information (e.g., "Pro版", "标准版")
 * @property {string} [memory] - Memory/storage specification (e.g., "12GB+512GB")
 * @property {string} [color] - Color specification
 * @property {string[]} [gtins] - Global Trade Item Numbers (barcodes)
 */
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

/**
 * Match Result
 * 
 * Represents the result of matching an input string to products in the database.
 * Contains both the matched products and extracted information from the input.
 * 
 * @interface MatchResult
 * @property {string} inputName - Original input string from the user
 * @property {string | null} matchedSKU - Name of the matched SKU, or null if no match
 * @property {string | null} matchedSPU - Name of the matched SPU, or null if no match
 * @property {string | null} matchedBrand - Extracted/matched brand name
 * @property {string | null} matchedVersion - Extracted/matched version information
 * @property {string | null} matchedMemory - Extracted/matched memory specification
 * @property {string | null} matchedColor - Extracted/matched color
 * @property {string[]} matchedGtins - Array of GTINs for the matched SKU
 * @property {number} similarity - Similarity score (0-1) indicating match confidence
 * @property {'matched' | 'unmatched' | 'spu-matched'} status - Match status:
 *   - 'matched': Both SPU and SKU matched
 *   - 'spu-matched': Only SPU matched, no specific SKU
 *   - 'unmatched': No match found
 */
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

/**
 * Product Type
 * 
 * Enumeration of supported product types. Different product types may have
 * different matching strategies and specification priorities.
 * 
 * @typedef {'phone' | 'watch' | 'tablet' | 'laptop' | 'earbuds' | 'band' | 'unknown'} ProductType
 * 
 * - 'phone': Smartphones
 * - 'watch': Smartwatches
 * - 'tablet': Tablets/iPads
 * - 'laptop': Laptops/notebooks
 * - 'earbuds': Wireless earbuds/headphones
 * - 'band': Fitness bands
 * - 'unknown': Product type could not be determined
 */
export type ProductType = 'phone' | 'watch' | 'tablet' | 'laptop' | 'earbuds' | 'band' | 'unknown';

/**
 * Version Information
 * 
 * Represents a product version type with its identifying keywords and priority.
 * Used for extracting and matching version information from product names.
 * 
 * @interface VersionInfo
 * @property {string} name - Display name of the version (e.g., "Pro版", "标准版")
 * @property {string[]} keywords - Keywords that identify this version in text
 * @property {number} priority - Priority for matching (higher = more important)
 */
export interface VersionInfo {
  name: string;
  keywords: string[];
  priority: number;
}

/**
 * Brand Data
 * 
 * Represents a brand with its display information and metadata.
 * Used for brand recognition and matching.
 * 
 * @interface BrandData
 * @property {string} name - Brand name (e.g., "华为", "小米")
 * @property {string} color - Brand color for UI display (hex code)
 * @property {string} [spell] - Pinyin or English spelling of the brand name
 * @property {number} [order] - Display order/priority
 */
export interface BrandData {
  name: string;
  color: string;
  spell?: string;
  order?: number;
}

/**
 * Product Type Feature
 * 
 * Defines characteristics and patterns for identifying a specific product type.
 * Used internally for product type detection and parameter extraction.
 * 
 * @interface ProductTypeFeature
 * @property {string[]} keywords - Keywords that identify this product type
 * @property {RegExp} modelPattern - Regular expression for matching model names
 * @property {string[]} specialParams - Special parameters specific to this product type
 * @property {RegExp} paramPattern - Regular expression for extracting parameters
 * 
 * @internal
 */
export interface ProductTypeFeature {
  keywords: string[];
  modelPattern: RegExp;
  specialParams: string[];
  paramPattern: RegExp;
}

