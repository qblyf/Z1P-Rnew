/**
 * Information Extraction Service
 * 
 * This service centralizes all information extraction logic for the SKU matching system.
 * It extracts various product attributes (brand, model, color, capacity, version) from
 * input strings with confidence scoring.
 * 
 * Features:
 * - Confidence scoring (0-1) for each extraction
 * - Source tracking (exact, fuzzy, inferred)
 * - Centralized extraction logic to eliminate duplication
 * - Support for brand aliases and variations
 * 
 * @module InfoExtractor
 */

import type { BrandData, VersionInfo, ProductType } from '../types';

/**
 * Extraction result with confidence and source information
 * 
 * @template T - The type of the extracted value
 */
export interface ExtractionResult<T> {
  /** The extracted value, or null if extraction failed */
  value: T | null;
  /** Confidence score from 0 to 1 (0 = no confidence, 1 = certain) */
  confidence: number;
  /** How the value was extracted */
  source: 'exact' | 'fuzzy' | 'inferred';
}

/**
 * Color variant configuration
 */
export interface ColorVariant {
  group: string;
  colors: string[];
  primary: string;
}

/**
 * Color family configuration for basic color matching
 */
export interface ColorFamily {
  family: string;
  name: string;
  keywords: string[];
}

/**
 * Complete extracted information from input string
 * 
 * Contains all extracted product attributes with confidence scores,
 * along with the original and preprocessed input strings.
 */
export interface ExtractedInfo {
  /** Original input string */
  originalInput: string;
  
  /** Preprocessed input string (cleaned and normalized) */
  preprocessedInput: string;
  
  /** Extracted brand information */
  brand: ExtractionResult<string>;
  
  /** Extracted model information */
  model: ExtractionResult<string>;
  
  /** Extracted color information */
  color: ExtractionResult<string>;
  
  /** Extracted capacity information */
  capacity: ExtractionResult<string>;
  
  /** Extracted version information */
  version: ExtractionResult<VersionInfo>;
  
  /** Detected product type */
  productType: ProductType;
}

/**
 * Information Extractor Class
 * 
 * Centralizes all information extraction logic with confidence scoring.
 * This class is designed to be used by the matching orchestrator to extract
 * product information from user input strings.
 * 
 * Usage:
 * ```typescript
 * const extractor = new InfoExtractor();
 * extractor.setBrandList(brands);
 * 
 * const result = extractor.extractBrand("华为 Mate 60 Pro");
 * console.log(result.value); // "华为"
 * console.log(result.confidence); // 1.0
 * console.log(result.source); // "exact"
 * ```
 */
export class InfoExtractor {
  /** Brand list loaded from brand database */
  private brandList: BrandData[] = [];
  
  /** Dynamic color list extracted from actual SKU data */
  private dynamicColors: string[] = [];
  
  /** Color variants map for variant matching */
  private colorVariantsMap: Map<string, string[]> = new Map();
  
  /** Basic color map for fuzzy color matching */
  private basicColorMap: Map<string, string[]> = new Map();
  
  /**
   * Set the brand list for brand extraction
   * 
   * The brand list should be loaded from the brand database and contain
   * brand names with their spellings (pinyin/English) for matching.
   * 
   * @param brands - Array of brand data from the brand database
   */
  setBrandList(brands: BrandData[]): void {
    this.brandList = brands;
  }
  
  /**
   * Set dynamic color list extracted from SKU data
   * 
   * This list contains actual color names found in the product database,
   * sorted by frequency. It's used for high-confidence color extraction.
   * 
   * @param colors - Array of color names from SKU data
   */
  setColorList(colors: string[]): void {
    this.dynamicColors = colors;
  }
  
  /**
   * Set color variants for variant matching
   * 
   * Color variants are different spellings or names for the same color
   * (e.g., "雾凇蓝" and "雾松蓝" are variants of the same color).
   * 
   * @param variants - Array of color variant configurations
   */
  setColorVariants(variants: ColorVariant[]): void {
    this.colorVariantsMap.clear();
    variants.forEach(variant => {
      variant.colors.forEach(color => {
        this.colorVariantsMap.set(color, variant.colors);
      });
    });
  }
  
  /**
   * Set basic color map for fuzzy matching
   * 
   * Basic color map groups colors into families (e.g., all black-related colors).
   * This is used for lower-confidence fuzzy matching.
   * 
   * @param colorFamilies - Array of color family configurations
   */
  setBasicColorMap(colorFamilies: ColorFamily[]): void {
    this.basicColorMap.clear();
    colorFamilies.forEach(family => {
      family.keywords.forEach(keyword => {
        this.basicColorMap.set(keyword, family.keywords);
      });
    });
  }
  
  /**
   * Extract brand from input string with confidence scoring
   * 
   * This method identifies the brand name in the input string using the brand database.
   * It supports both Chinese brand names and their pinyin/English spellings.
   * 
   * Matching Strategy:
   * 1. Exact match: Brand name appears in input (confidence: 1.0, source: exact)
   * 2. Spelling match: Brand spelling (pinyin/English) appears in input (confidence: 0.95, source: exact)
   * 3. No match: Brand not found (confidence: 0, source: inferred)
   * 
   * The method prioritizes longer brand names to avoid false matches
   * (e.g., "小米" should match before "米" if both are in the brand list).
   * 
   * @param input - Input string to extract brand from
   * @returns Extraction result with brand name, confidence, and source
   * 
   * @example
   * ```typescript
   * // Exact match - Chinese brand name
   * extractor.extractBrand("华为 Mate 60 Pro")
   * // => { value: "华为", confidence: 1.0, source: "exact" }
   * 
   * // Exact match - English spelling
   * extractor.extractBrand("HUAWEI Mate 60 Pro")
   * // => { value: "华为", confidence: 0.95, source: "exact" }
   * 
   * // No match
   * extractor.extractBrand("Unknown Brand Phone")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractBrand(input: string): ExtractionResult<string> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    const lowerInput = input.toLowerCase().trim();
    
    // If brand list is not loaded, return no match
    if (this.brandList.length === 0) {
      console.warn('Brand list not loaded in InfoExtractor');
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Sort brands by name length (descending) to match longer names first
    // This prevents false matches (e.g., "小米" matching before "米")
    const sortedBrands = [...this.brandList].sort((a, b) => 
      b.name.length - a.name.length
    );
    
    // Try to match brand name or spelling
    for (const brand of sortedBrands) {
      const brandNameLower = brand.name.toLowerCase();
      const brandSpellLower = brand.spell?.toLowerCase();
      
      // Priority 1: Exact match on brand name (Chinese)
      if (lowerInput.includes(brandNameLower)) {
        return {
          value: brand.name, // Return original brand name (preserve case)
          confidence: 1.0,
          source: 'exact'
        };
      }
      
      // Priority 2: Exact match on brand spelling (pinyin/English)
      if (brandSpellLower && lowerInput.includes(brandSpellLower)) {
        return {
          value: brand.name, // Return Chinese brand name
          confidence: 0.95, // Slightly lower confidence for spelling match
          source: 'exact'
        };
      }
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Extract model from input string with confidence scoring
   * 
   * This method identifies the product model in the input string using multiple
   * extraction strategies with different priorities.
   * 
   * Matching Strategy (Priority Order):
   * 1. Complex model (after normalization): Letter+Number+Suffix (e.g., "Mate 60 Pro")
   *    - Confidence: 1.0 (exact), Source: exact
   *    - Requires normalization to separate suffixes
   * 2. Word model: Letter+Letter (e.g., "Watch GT", "Band 5")
   *    - Confidence: 0.85 (exact), Source: exact
   * 3. Simple model (before normalization): Letter+Number (e.g., "P50", "Y50")
   *    - Confidence: 0.9 (exact), Source: exact
   *    - Extracted BEFORE normalization to prevent "y50" → "y 50" breakage
   *    - Only returned if it starts with a letter (not pure numbers)
   * 4. Simple model (after normalization): Pure numbers or letter+number
   *    - Confidence: 0.85 (exact), Source: exact
   *    - Fallback for models like "14" from "小米 14"
   * 5. No match: Model not found
   *    - Confidence: 0, Source: inferred
   * 
   * The method preprocesses the input by:
   * - Removing brand names (if provided)
   * - Removing common descriptors (手机, 手表, etc.)
   * - Removing capacity information (8+256, 256GB, etc.)
   * - Removing color information
   * - Normalizing spaces
   * 
   * OPTIMIZATION (Task 10.2):
   * - Complex models are extracted first (highest priority)
   * - Simple models with letter prefix are extracted before normalization
   * - This prevents patterns like "y50" from being broken into "y 50"
   * - Pure number models are extracted after normalization as fallback
   * 
   * @param input - Input string to extract model from
   * @param brand - Optional brand name to help with extraction (removes brand from input)
   * @returns Extraction result with model name, confidence, and source
   * 
   * @example
   * ```typescript
   * // Complex model (highest priority)
   * extractor.extractModel("华为 Mate 60 Pro 12GB+512GB", "华为")
   * // => { value: "mate60pro", confidence: 1.0, source: "exact" }
   * 
   * // Simple model with letter prefix (optimized to extract before normalization)
   * extractor.extractModel("vivo Y50 5G", "vivo")
   * // => { value: "y50", confidence: 0.9, source: "exact" }
   * 
   * // Pure number model (fallback)
   * extractor.extractModel("小米 14 Pro", "小米")
   * // => { value: "14pro", confidence: 1.0, source: "exact" } // Complex model wins
   * 
   * extractor.extractModel("小米 14", "小米")
   * // => { value: "14", confidence: 0.85, source: "exact" } // Simple model fallback
   * 
   * // Word model
   * extractor.extractModel("华为 Watch GT 5", "华为")
   * // => { value: "watchgt5", confidence: 0.85, source: "exact" }
   * 
   * // No match
   * extractor.extractModel("Unknown Product")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractModel(input: string, brand?: string): ExtractionResult<string> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Preprocess the input string (without normalization that adds spaces)
    const preprocessed = this.preprocessModelString(input, brand);
    
    if (!preprocessed || preprocessed.length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Apply normalization for complex pattern matching
    // This adds spaces between letters/numbers and before suffixes
    const normalized = this.normalizeModelString(preprocessed);
    
    // Priority 1: Complex model (highest confidence)
    // Requires normalization to separate suffixes like "pro", "max"
    const complexModel = this.extractComplexModel(normalized);
    if (complexModel) {
      return {
        value: complexModel,
        confidence: 1.0,
        source: 'exact'
      };
    }
    
    // Priority 2: Word model (letter + letter patterns)
    const wordModel = this.extractWordModel(normalized);
    if (wordModel) {
      return {
        value: wordModel,
        confidence: 0.85,
        source: 'exact'
      };
    }
    
    // OPTIMIZATION (Task 10.2): Try simple model extraction on non-normalized string
    // This prevents "y50" from becoming "y 50" and failing to match
    // Only use this if it has a letter (prefix or suffix), not pure numbers like "60"
    const simpleModelBeforeNorm = this.extractSimpleModel(preprocessed);
    if (simpleModelBeforeNorm && /[a-z]/.test(simpleModelBeforeNorm)) {
      // Only return simple models that contain at least one letter
      // This prevents extracting "60" from "Mate 60 Pro" (which should be "mate60pro")
      return {
        value: simpleModelBeforeNorm,
        confidence: 0.9,
        source: 'exact'
      };
    }
    
    // Priority 3: Try simple model on normalized string as fallback
    // This includes pure number models like "14" from "小米 14"
    const simpleModelAfterNorm = this.extractSimpleModel(normalized);
    if (simpleModelAfterNorm) {
      return {
        value: simpleModelAfterNorm,
        confidence: 0.85, // Lower confidence for normalized extraction
        source: 'exact'
      };
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Preprocess model string by removing brand, descriptors, capacity, and color
   * 
   * @param input - Input string
   * @param brand - Optional brand name to remove
   * @returns Preprocessed string ready for model extraction
   */
  private preprocessModelString(input: string, brand?: string): string {
    let normalized = input.toLowerCase().trim();
    
    // Remove brand name if provided
    if (brand) {
      const brandLower = brand.toLowerCase();
      normalized = normalized.replace(brandLower, ' ');
      
      // Also try to remove brand spelling if available
      const brandInfo = this.brandList.find(b => 
        b.name.toLowerCase() === brandLower || 
        b.spell?.toLowerCase() === brandLower
      );
      if (brandInfo) {
        if (brandInfo.spell) {
          normalized = normalized.replace(brandInfo.spell.toLowerCase(), ' ');
        }
        normalized = normalized.replace(brandInfo.name.toLowerCase(), ' ');
      }
    }
    
    // Remove common descriptors
    // NOTE: "find" and "reno" are NOT included here as they are part of model names
    // (e.g., "OPPO Find X5 Pro", "OPPO Reno 11 Pro")
    const descriptors = [
      '智能手机', '手机', '智能手表', '手表', '平板电脑', '平板', '笔记本电脑', '笔记本',
      '无线耳机', '耳机', '手环', '智能', '款', '版', '英寸', 'mm', 'gb', 'tb',
      '钛合金', '陶瓷', '素皮', '皮革', '玻璃', '金属', '塑料',
      '蓝牙', 'wifi', '5g', '4g', '3g', '全网通', 'esim',
      '年', '月', '日', '新品', '上市', '发布', '全'
    ];
    
    for (const desc of descriptors) {
      normalized = normalized.replace(new RegExp(desc, 'gi'), ' ');
    }
    
    // Remove capacity information
    normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' '); // 8+256
    normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' '); // 256GB
    
    // Remove color information (Chinese color words with surrounding characters)
    const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
    for (const color of colors) {
      // Match: Chinese characters before color + color + Chinese characters after color
      normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
    }
    
    // Clean up spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  /**
   * Normalize model string for complex pattern matching
   * 
   * This method adds spaces between letters/numbers and before suffixes
   * to help with complex model extraction (e.g., "mate60pro" → "mate 60 pro")
   * 
   * IMPORTANT: This should only be called AFTER simple model extraction,
   * as it breaks patterns like "y50" into "y 50"
   * 
   * @param str - Preprocessed model string
   * @returns Normalized string with spaces added
   */
  private normalizeModelString(str: string): string {
    if (!str) return str;
    
    let normalized = str.toLowerCase();
    
    // 1. Add space before common suffix keywords
    // NOTE: "find" and "reno" are NOT included here as they are part of model names
    // (e.g., "OPPO Find X5 Pro", "OPPO Reno 11 Pro"), not suffixes
    const suffixKeywords = [
      'pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite',
      'note', 'turbo', 'fold', 'flip'
    ];
    
    suffixKeywords.forEach(keyword => {
      // Add space before keyword if not already present
      const regex = new RegExp(`(?<!\\s)${keyword}`, 'gi');
      normalized = normalized.replace(regex, ` ${keyword}`);
    });
    
    // 2. Add space between digits and letters
    normalized = normalized.replace(/(\d)([a-z])/gi, '$1 $2'); // "60pro" → "60 pro"
    normalized = normalized.replace(/([a-z])(\d)/gi, '$1 $2'); // "mate60" → "mate 60"
    
    // 3. Clean up multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  /**
   * Extract complex model: Letter+Number+Suffix or Number+Suffix
   * Examples: "Mate 60 Pro", "iPhone 15 Pro Max", "14 Pro", "6 Pro", "Find X5 Pro"
   * 
   * Pattern: ([a-z]+\s+)*([a-z]*\d+[a-z]*)\s+(pro|max|plus|ultra|mini|se|air|lite|note|turbo)+
   */
  private extractComplexModel(str: string): string | null {
    const suffixes = ['pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite', 'note', 'turbo', 'fold', 'flip'];
    const suffixPattern = suffixes.join('|');
    
    // Pattern: optional words (with spaces) + model core (letters+numbers) + one or more suffixes
    // This handles cases like "Find X5 Pro" where "Find" is part of the model name
    const pattern = new RegExp(
      `((?:[a-z]+\\s+)*)([a-z]*\\d+[a-z]*)\\s+((?:(?:${suffixPattern})\\s*)+)`,
      'i'
    );
    
    const match = str.match(pattern);
    if (match) {
      // Combine all parts and remove spaces
      const model = ((match[1] || '') + match[2] + match[3]).replace(/\s+/g, '');
      return model.toLowerCase();
    }
    
    return null;
  }
  
  /**
   * Extract word model: Letter+Letter patterns or Letter+Number
   * Examples: "Watch GT", "Band 8", "Pad Pro"
   * 
   * Pattern: [a-z]+\s+([a-z]+|\d+)
   */
  private extractWordModel(str: string): string | null {
    // Pattern 1: word + word + optional number (e.g., "Watch GT 5", "Pad Pro")
    const wordWordPattern = /([a-z]+)\s+([a-z]{2,})\s*(\d*)/i;
    let match = str.match(wordWordPattern);
    
    if (match && match[1] && match[2]) {
      const model = (match[1] + match[2] + (match[3] || '')).replace(/\s+/g, '');
      return model.toLowerCase();
    }
    
    // Pattern 2: word + number (e.g., "Band 8", "Watch 5")
    // Only match if the word is a known product type
    const knownTypes = ['band', 'watch', 'pad', 'book', 'buds', 'fit'];
    const wordNumPattern = /([a-z]+)\s+(\d+)/i;
    match = str.match(wordNumPattern);
    
    if (match && match[1] && match[2]) {
      const word = match[1].toLowerCase();
      if (knownTypes.includes(word)) {
        const model = (match[1] + match[2]).replace(/\s+/g, '');
        return model.toLowerCase();
      }
    }
    
    return null;
  }
  
  /**
   * Extract simple model: Letter+Number or just Number
   * Examples: "P50", "14", "Y50", "15R"
   * 
   * Pattern: [a-z]*\d+[a-z]*
   */
  private extractSimpleModel(str: string): string | null {
    // Pattern: optional letters + numbers + optional letters (one or more)
    // Use word boundaries to avoid matching parts of words
    const pattern = /\b([a-z]*)(\d+)([a-z]*)\b/i;
    
    const match = str.match(pattern);
    if (match && match[2]) {
      // Must have at least a number
      const model = (match[1] + match[2] + match[3]).replace(/\s+/g, '');
      
      // Filter out models that are too short (just 1 digit) unless they have letters
      if (model.length < 2 && !match[1] && !match[3]) {
        return null;
      }
      
      // Filter out common non-model numbers (like capacity, year, etc.)
      const num = parseInt(match[2]);
      if (!match[1] && !match[3]) {
        // Pure numbers: filter out common non-model values
        if (num < 10 || num > 999) {
          return null;
        }
      }
      
      return model.toLowerCase();
    }
    
    return null;
  }
  
  /**
   * Extract color from input string with confidence scoring
   * 
   * This method identifies the color name in the input string using multiple
   * extraction strategies with different confidence levels.
   * 
   * Matching Strategy (Priority Order):
   * 1. Color variant match: Matches against configured color variants
   *    - Confidence: 1.0 (exact), Source: exact
   * 2. Dynamic color list match: Matches against actual SKU colors
   *    - Confidence: 0.95 (exact), Source: exact
   * 3. Pattern-based extraction: Extracts color from end of string
   *    - Confidence: 0.85 (fuzzy), Source: fuzzy
   * 4. Basic color match: Matches single color character
   *    - Confidence: 0.7 (fuzzy), Source: fuzzy
   * 5. No match: Color not found
   *    - Confidence: 0, Source: inferred
   * 
   * The method preprocesses the input by:
   * - Removing material keywords (真皮, 素皮, 陶瓷, etc.)
   * - Removing accessory keywords (表带, 耳机, etc.)
   * - Removing technical keywords (蓝牙, 5G, etc.)
   * 
   * @param input - Input string to extract color from
   * @returns Extraction result with color name, confidence, and source
   * 
   * @example
   * ```typescript
   * // Variant match
   * extractor.extractColor("华为 Mate 60 Pro 雾凇蓝")
   * // => { value: "雾凇蓝", confidence: 1.0, source: "exact" }
   * 
   * // Dynamic color match
   * extractor.extractColor("小米 14 Pro 星岩黑")
   * // => { value: "星岩黑", confidence: 0.95, source: "exact" }
   * 
   * // Pattern extraction
   * extractor.extractColor("vivo Y50 12GB+256GB 龙晶紫")
   * // => { value: "龙晶紫", confidence: 0.85, source: "fuzzy" }
   * 
   * // Basic color
   * extractor.extractColor("手机 黑")
   * // => { value: "黑", confidence: 0.7, source: "fuzzy" }
   * 
   * // No match
   * extractor.extractColor("华为 Mate 60 Pro 12GB+256GB")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractColor(input: string): ExtractionResult<string> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Preprocess: remove material, accessory, and technical keywords
    const cleanedInput = this.preprocessColorString(input);
    
    if (!cleanedInput || cleanedInput.length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Priority 1: Color variant match (highest confidence)
    if (this.colorVariantsMap.size > 0) {
      const entries = Array.from(this.colorVariantsMap.entries());
      for (const [colorName, variants] of entries) {
        // Check if the main color name is in the input
        if (cleanedInput.includes(colorName)) {
          return {
            value: colorName,
            confidence: 1.0,
            source: 'exact'
          };
        }
        // Check if any variant is in the input
        for (const variant of variants) {
          if (cleanedInput.includes(variant)) {
            // Return the main color name (primary)
            return {
              value: colorName,
              confidence: 1.0,
              source: 'exact'
            };
          }
        }
      }
    }
    
    // Priority 2: Dynamic color list match
    // Sort by length (descending) to match longer colors first
    const sortedColors = [...this.dynamicColors].sort((a, b) => b.length - a.length);
    for (const color of sortedColors) {
      if (cleanedInput.includes(color)) {
        return {
          value: color,
          confidence: 0.95,
          source: 'exact'
        };
      }
    }
    
    // Priority 3: Pattern-based extraction from end of string
    const extractedColor = this.extractColorFromPattern(cleanedInput);
    if (extractedColor) {
      return {
        value: extractedColor,
        confidence: 0.85,
        source: 'fuzzy'
      };
    }
    
    // Priority 4: Basic color match (single character)
    const basicColor = this.extractBasicColor(cleanedInput);
    if (basicColor) {
      return {
        value: basicColor,
        confidence: 0.7,
        source: 'fuzzy'
      };
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Preprocess color string by removing material, accessory, and technical keywords
   * 
   * This prevents false color matches like "真皮" (leather) being confused with color.
   * 
   * @param input - Input string
   * @returns Preprocessed string ready for color extraction
   */
  private preprocessColorString(input: string): string {
    let cleaned = input;
    
    // Material keywords that should be removed
    const materialKeywords = [
      '真皮', '素皮', '皮革', '陶瓷', '玻璃', '金属', '塑料', '硅胶', '软胶',
      '钛合金', '不锈钢', '铝合金', '碳纤维'
    ];
    
    // Accessory keywords
    const accessoryKeywords = [
      '表带', '表盘', '手环', '耳机', '耳塞', '充电器', '数据线', 
      '保护壳', '保护套', '手机壳', '手机套'
    ];
    
    // Technical keywords
    const technicalKeywords = [
      '蓝牙', '无线', '有线', '充电', '快充', '超级快充',
      '5G', '4G', '3G', '全网通', 'WiFi', 'NFC', 'eSIM'
    ];
    
    // Product type keywords
    const productKeywords = [
      '智能', '手表', '手机', '平板', '笔记本', '电脑', '耳机'
    ];
    
    // Combine all keywords
    const allKeywords = [
      ...materialKeywords,
      ...accessoryKeywords,
      ...technicalKeywords,
      ...productKeywords
    ];
    
    // Remove all keywords
    for (const keyword of allKeywords) {
      cleaned = cleaned.replace(new RegExp(keyword, 'g'), ' ');
    }
    
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
  
  /**
   * Extract color from pattern at end of string
   * 
   * Looks for 2-5 Chinese characters at the end of the string,
   * excluding common non-color words.
   * 
   * @param str - Preprocessed string
   * @returns Extracted color or null
   */
  private extractColorFromPattern(str: string): string | null {
    // Match 2-5 Chinese characters at the end
    const match = str.match(/[\u4e00-\u9fa5]{2,5}$/);
    
    if (!match) {
      return null;
    }
    
    const word = match[0];
    
    // Exclude common non-color words
    const excludeWords = [
      '全网通', '网通', '版本', '标准', '套餐', '蓝牙版',
      '活力版', '优享版', '尊享版', '标准版', '基础版',
      '青春版', '旗舰版', '至尊版', '典藏版', '限定版',
      '纪念版', '特别版', '定制版'
    ];
    
    if (excludeWords.includes(word)) {
      return null;
    }
    
    return word;
  }
  
  /**
   * Extract basic color (single character)
   * 
   * Matches single Chinese color characters like 黑, 白, 蓝, etc.
   * This is the lowest confidence extraction method.
   * 
   * @param str - Preprocessed string
   * @returns Basic color character or null
   */
  private extractBasicColor(str: string): string | null {
    // Basic color characters
    const basicColors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
    
    // Check if any basic color appears in the string
    for (const color of basicColors) {
      if (str.includes(color)) {
        return color;
      }
    }
    
    return null;
  }
  
  /**
   * Extract version from input string with confidence scoring
   * 
   * This method identifies product version information in the input string using multiple
   * extraction strategies with different confidence levels.
   * 
   * Matching Strategy (Priority Order):
   * 1. Network/Technology versions: "5G", "全网通5G", "蓝牙版", "eSIM版", etc.
   *    - Confidence: 1.0 (exact), Source: exact
   *    - These are prioritized because they are more specific and less ambiguous
   * 2. Standard and special edition versions: "活力版", "标准版", "Pro版", etc.
   *    - Confidence: 0.95 (exact), Source: exact
   * 3. Premium and special editions: "典藏版", "限定版", "纪念版", etc.
   *    - Confidence: 0.9 (exact), Source: exact
   * 4. No match: Version not found
   *    - Confidence: 0, Source: inferred
   * 
   * The method recognizes common version types:
   * - Network versions: 5G, 4G, 3G, 全网通5G, 全网通版, 蓝牙版, eSIM版, WiFi版
   * - Standard versions: 标准版, 基础版, 普通版
   * - Special editions: 活力版, 优享版, 尊享版, 青春版, 轻享版
   * - Premium editions: Pro版, 旗舰版, 至尊版, 典藏版, 限定版
   * - Gift editions: 礼盒版, 套装版
   * 
   * Special Handling:
   * - "Pro" is checked to avoid matching when it's part of a model name (e.g., "Pro Max", "Pro mini")
   * - Network versions are sorted by length (descending) to match longer versions first
   * 
   * @param input - Input string to extract version from
   * @returns Extraction result with VersionInfo object, confidence, and source
   * 
   * @example
   * ```typescript
   * // Network version (highest priority)
   * extractor.extractVersion("vivo S30 Pro mini 全网通5G")
   * // => { value: { name: "全网通5G", keywords: ["全网通5g"], priority: 10 }, confidence: 1.0, source: "exact" }
   * 
   * // Standard version
   * extractor.extractVersion("OPPO A5 活力版 8+256")
   * // => { value: { name: "活力版", keywords: ["活力版"], priority: 5 }, confidence: 0.95, source: "exact" }
   * 
   * // Premium edition
   * extractor.extractVersion("小米 14 Pro 典藏版")
   * // => { value: { name: "典藏版", keywords: ["典藏版"], priority: 5 }, confidence: 0.9, source: "exact" }
   * 
   * // Model with "Pro" (not a version)
   * extractor.extractVersion("iPhone 14 Pro Max")
   * // => { value: null, confidence: 0, source: "inferred" }
   * 
   * // No match
   * extractor.extractVersion("华为 Mate 60 Pro 12GB+512GB")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractVersion(input: string): ExtractionResult<VersionInfo> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    const normalized = input.toLowerCase().trim();
    
    // Priority 1: Network/Technology versions (highest priority and confidence)
    // These are more specific and less ambiguous than product versions
    // Sort by length (descending) to match longer versions first (e.g., "全网通5G" before "5G")
    const networkVersions = [
      { name: '全网通5G', keywords: ['全网通5g'], priority: 10 },
      { name: '全网通版', keywords: ['全网通版'], priority: 9 },
      { name: '卫星通信版', keywords: ['卫星通信版'], priority: 10 },
      { name: '蓝牙版', keywords: ['蓝牙版'], priority: 9 },
      { name: 'eSIM版', keywords: ['esim版'], priority: 9 },
      { name: 'WiFi版', keywords: ['wifi版'], priority: 9 },
      { name: '5G版', keywords: ['5g版'], priority: 9 },
      { name: '4G版', keywords: ['4g版'], priority: 8 },
      { name: '3G版', keywords: ['3g版'], priority: 7 },
      { name: '5G', keywords: ['5g'], priority: 9 },
      { name: '4G', keywords: ['4g'], priority: 8 },
      { name: '3G', keywords: ['3g'], priority: 7 },
    ];
    
    for (const version of networkVersions) {
      for (const keyword of version.keywords) {
        if (normalized.includes(keyword)) {
          return {
            value: {
              name: version.name,
              keywords: version.keywords,
              priority: version.priority
            },
            confidence: 1.0,
            source: 'exact'
          };
        }
      }
    }
    
    // Priority 2: Standard and special edition versions
    const standardVersions = [
      { name: '活力版', keywords: ['活力版'], priority: 5 },
      { name: '优享版', keywords: ['优享版'], priority: 5 },
      { name: '尊享版', keywords: ['尊享版'], priority: 5 },
      { name: '青春版', keywords: ['青春版'], priority: 5 },
      { name: '轻享版', keywords: ['轻享版'], priority: 5 },
      { name: '标准版', keywords: ['标准版'], priority: 4 },
      { name: '基础版', keywords: ['基础版'], priority: 4 },
      { name: '普通版', keywords: ['普通版'], priority: 4 },
      { name: 'Pro版', keywords: ['pro版'], priority: 6 },
    ];
    
    for (const version of standardVersions) {
      for (const keyword of version.keywords) {
        // Special handling for "pro" to avoid matching when it's part of a model name
        if (keyword === 'pro版' || keyword === 'pro') {
          // Check if "pro" is followed by model suffixes (mini, max, plus, ultra, air, lite, se)
          // If so, it's part of the model name, not a version
          const proPattern = /\bpro\s*(mini|max|plus|ultra|air|lite|se)\b/i;
          if (proPattern.test(input)) {
            // "pro" is part of the model name (e.g., "Pro Max", "Pro mini"), skip it
            continue;
          }
        }
        
        if (normalized.includes(keyword)) {
          return {
            value: {
              name: version.name,
              keywords: version.keywords,
              priority: version.priority
            },
            confidence: 0.95,
            source: 'exact'
          };
        }
      }
    }
    
    // Priority 3: Premium and special editions
    const premiumVersions = [
      { name: '旗舰版', keywords: ['旗舰版'], priority: 6 },
      { name: '至尊版', keywords: ['至尊版'], priority: 6 },
      { name: '典藏版', keywords: ['典藏版'], priority: 5 },
      { name: '限定版', keywords: ['限定版'], priority: 5 },
      { name: '纪念版', keywords: ['纪念版'], priority: 5 },
      { name: '特别版', keywords: ['特别版'], priority: 5 },
      { name: '定制版', keywords: ['定制版'], priority: 5 },
      { name: '礼盒版', keywords: ['礼盒版', '礼盒'], priority: 3 },
      { name: '套装版', keywords: ['套装版', '套装'], priority: 3 },
    ];
    
    for (const version of premiumVersions) {
      for (const keyword of version.keywords) {
        if (normalized.includes(keyword)) {
          return {
            value: {
              name: version.name,
              keywords: version.keywords,
              priority: version.priority
            },
            confidence: 0.9,
            source: 'exact'
          };
        }
      }
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Extract capacity from input string with confidence scoring
   * 
   * This method identifies storage capacity information in the input string using multiple
   * extraction strategies with different confidence levels.
   * 
   * Matching Strategy (Priority Order):
   * 1. RAM+Storage format: "8+256", "12GB+512GB", "8G+256G"
   *    - Confidence: 1.0 (exact), Source: exact
   * 2. Storage only format: "256GB", "512G", "1TB"
   *    - Confidence: 0.9 (exact), Source: exact
   * 3. RAM only format: "8GB", "12G" (when no storage found)
   *    - Confidence: 0.7 (fuzzy), Source: fuzzy
   * 4. No match: Capacity not found
   *    - Confidence: 0, Source: inferred
   * 
   * The method normalizes capacity formats to a standard format:
   * - "8GB+256GB" → "8+256"
   * - "8G+256G" → "8+256"
   * - "256GB" → "256"
   * - "1TB" → "1T"
   * 
   * @param input - Input string to extract capacity from
   * @returns Extraction result with capacity string, confidence, and source
   * 
   * @example
   * ```typescript
   * // RAM+Storage format
   * extractor.extractCapacity("华为 Mate 60 Pro 12GB+512GB")
   * // => { value: "12+512", confidence: 1.0, source: "exact" }
   * 
   * // Normalized format
   * extractor.extractCapacity("小米 14 Pro 8+256")
   * // => { value: "8+256", confidence: 1.0, source: "exact" }
   * 
   * // Storage only
   * extractor.extractCapacity("iPad Pro 256GB")
   * // => { value: "256", confidence: 0.9, source: "exact" }
   * 
   * // RAM only (lower confidence)
   * extractor.extractCapacity("手机 8GB")
   * // => { value: "8", confidence: 0.7, source: "fuzzy" }
   * 
   * // No match
   * extractor.extractCapacity("华为 Mate 60 Pro 雅川青")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractCapacity(input: string): ExtractionResult<string> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    const normalized = input.toLowerCase().trim();
    
    // Priority 1: RAM+Storage format (highest confidence)
    // Patterns: "8+256", "12GB+512GB", "8G+256G", "8 + 256", etc.
    const ramStoragePattern = /(\d+)\s*(?:gb|g)?\s*\+\s*(\d+)\s*(?:gb|g|tb|t)?/i;
    const ramStorageMatch = normalized.match(ramStoragePattern);
    
    if (ramStorageMatch) {
      const ram = ramStorageMatch[1];
      let storage = ramStorageMatch[2];
      
      // Check if storage is in TB
      const storageUnit = normalized.substring(
        ramStorageMatch.index! + ramStorageMatch[0].length - 2,
        ramStorageMatch.index! + ramStorageMatch[0].length
      ).toLowerCase();
      
      if (storageUnit.includes('t')) {
        storage = storage + 'T';
      }
      
      return {
        value: `${ram}+${storage}`,
        confidence: 1.0,
        source: 'exact'
      };
    }
    
    // Priority 2: Storage only format
    // Patterns: "256GB", "512G", "1TB", "2T"
    const storagePattern = /\b(\d+)\s*(?:tb|t|gb|g)\b/i;
    const storageMatch = normalized.match(storagePattern);
    
    if (storageMatch) {
      const value = storageMatch[1];
      const unit = storageMatch[0].toLowerCase();
      
      // Check if it's TB
      if (unit.includes('t')) {
        return {
          value: value + 'T',
          confidence: 0.9,
          source: 'exact'
        };
      }
      
      // Check if this is likely RAM (typically 2-32GB) or storage (typically 64GB+)
      const numValue = parseInt(value);
      
      // If value is small (2-32), it's likely RAM, not storage
      // But we'll still return it with lower confidence
      if (numValue <= 32) {
        // This might be RAM, not storage
        // Check if there's context suggesting it's storage
        const hasStorageContext = /存储|内存|容量|storage/i.test(input);
        
        if (hasStorageContext) {
          return {
            value: value,
            confidence: 0.8,
            source: 'fuzzy'
          };
        }
        
        // Likely RAM, return with low confidence
        return {
          value: value,
          confidence: 0.7,
          source: 'fuzzy'
        };
      }
      
      // Value is large (64+), likely storage
      return {
        value: value,
        confidence: 0.9,
        source: 'exact'
      };
    }
    
    // Priority 3: Pure number format (e.g., "256" without unit)
    // This is risky as it could match other numbers (model, year, etc.)
    // Only match if there's clear context
    const hasCapacityContext = /存储|内存|容量|storage|memory/i.test(input);
    
    if (hasCapacityContext) {
      // Look for common capacity values
      const pureNumberPattern = /\b(64|128|256|512|1024|2048)\b/;
      const pureNumberMatch = normalized.match(pureNumberPattern);
      
      if (pureNumberMatch) {
        const value = pureNumberMatch[1];
        
        // Convert 1024 to 1T, 2048 to 2T
        if (value === '1024') {
          return {
            value: '1T',
            confidence: 0.8,
            source: 'fuzzy'
          };
        }
        if (value === '2048') {
          return {
            value: '2T',
            confidence: 0.8,
            source: 'fuzzy'
          };
        }
        
        return {
          value: value,
          confidence: 0.8,
          source: 'fuzzy'
        };
      }
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Extract all product information from input string
   * 
   * This method performs batch extraction of all product attributes (brand, model,
   * color, capacity, version) in a single call. It also detects the product type
   * and provides both original and preprocessed input strings.
   * 
   * The method follows this extraction order:
   * 1. Extract brand (used to help with model extraction)
   * 2. Extract model (uses brand information)
   * 3. Extract color
   * 4. Extract capacity
   * 5. Extract version
   * 6. Detect product type (based on model and keywords)
   * 
   * The preprocessed input is a cleaned version of the original input with:
   * - Normalized whitespace
   * - Lowercase conversion
   * - Removal of special characters (for analysis purposes)
   * 
   * @param input - Input string to extract all information from
   * @returns ExtractedInfo object containing all extracted attributes
   * 
   * @example
   * ```typescript
   * const extractor = new InfoExtractor();
   * extractor.setBrandList(brands);
   * extractor.setColorList(colors);
   * 
   * const info = extractor.extractAll("华为 Mate 60 Pro 12GB+512GB 雅川青");
   * 
   * console.log(info.brand.value);      // "华为"
   * console.log(info.model.value);      // "mate60pro"
   * console.log(info.capacity.value);   // "12+512"
   * console.log(info.color.value);      // "雅川青"
   * console.log(info.productType);      // "phone"
   * ```
   */
  extractAll(input: string): ExtractedInfo {
    // Store original input
    const originalInput = input;
    
    // Preprocess input: normalize whitespace and trim
    const preprocessedInput = input.replace(/\s+/g, ' ').trim();
    
    // Extract brand first (helps with model extraction)
    const brand = this.extractBrand(preprocessedInput);
    
    // Extract model (pass brand to help with extraction)
    const model = this.extractModel(preprocessedInput, brand.value || undefined);
    
    // Extract color
    const color = this.extractColor(preprocessedInput);
    
    // Extract capacity
    const capacity = this.extractCapacity(preprocessedInput);
    
    // Extract version
    const version = this.extractVersion(preprocessedInput);
    
    // Detect product type based on model and keywords
    const productType = this.detectProductType(preprocessedInput, model.value);
    
    return {
      originalInput,
      preprocessedInput,
      brand,
      model,
      color,
      capacity,
      version,
      productType
    };
  }
  
  /**
   * Extract watch size from input string with confidence scoring
   * 
   * This method identifies watch/band size information in the input string.
   * Watch sizes are typically specified in millimeters (mm) or inches (寸).
   * 
   * Matching Strategy:
   * 1. Millimeter format: "46mm", "42mm", "41mm"
   *    - Confidence: 1.0 (exact), Source: exact
   * 2. Inch format: "1.43寸", "1.96寸"
   *    - Confidence: 1.0 (exact), Source: exact
   * 3. No match: Size not found
   *    - Confidence: 0, Source: inferred
   * 
   * @param input - Input string to extract watch size from
   * @returns Extraction result with size string, confidence, and source
   * 
   * @example
   * ```typescript
   * // Millimeter format
   * extractor.extractWatchSize("华为 Watch GT 5 46mm 复合编织表带")
   * // => { value: "46mm", confidence: 1.0, source: "exact" }
   * 
   * // Inch format
   * extractor.extractWatchSize("小米手环 1.43寸屏幕")
   * // => { value: "1.43寸", confidence: 1.0, source: "exact" }
   * 
   * // No match
   * extractor.extractWatchSize("华为 Watch GT 5 蓝牙版")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractWatchSize(input: string): ExtractionResult<string> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Priority 1: Millimeter format (46mm, 42mm, etc.)
    const mmPattern = /(\d+)\s*mm\b/i;
    const mmMatch = input.match(mmPattern);
    
    if (mmMatch) {
      return {
        value: `${mmMatch[1]}mm`,
        confidence: 1.0,
        source: 'exact'
      };
    }
    
    // Priority 2: Inch format (1.43寸, 1.96寸, etc.)
    // Note: Use Unicode escape for 寸 to ensure proper matching
    const inchPattern = /(\d+\.?\d*)\s*寸/;
    const inchMatch = input.match(inchPattern);
    
    if (inchMatch) {
      return {
        value: `${inchMatch[1]}寸`,
        confidence: 1.0,
        source: 'exact'
      };
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Extract watch band type from input string with confidence scoring
   * 
   * This method identifies watch band material and type information in the input string.
   * Watch bands are typically described with material + type + optional color.
   * 
   * Matching Strategy:
   * 1. Specific band type match: "复合编织表带", "氟橡胶表带", "真皮表带"
   *    - Confidence: 1.0 (exact), Source: exact
   * 2. Generic band keyword match: "表带", "腕带", "表链"
   *    - Confidence: 0.8 (fuzzy), Source: fuzzy
   * 3. No match: Band type not found
   *    - Confidence: 0, Source: inferred
   * 
   * The method extracts the band description from the keyword to the end of the string,
   * which typically includes both material and color information.
   * 
   * @param input - Input string to extract watch band from
   * @returns Extraction result with band description, confidence, and source
   * 
   * @example
   * ```typescript
   * // Specific band type
   * extractor.extractWatchBand("华为 Watch GT 5 46mm 复合编织表带托帕蓝")
   * // => { value: "复合编织表带托帕蓝", confidence: 1.0, source: "exact" }
   * 
   * // Generic band keyword
   * extractor.extractWatchBand("小米手表 黑色表带")
   * // => { value: "表带", confidence: 0.8, source: "fuzzy" }
   * 
   * // No match
   * extractor.extractWatchBand("华为 Watch GT 5 蓝牙版")
   * // => { value: null, confidence: 0, source: "inferred" }
   * ```
   */
  extractWatchBand(input: string): ExtractionResult<string> {
    if (!input || input.trim().length === 0) {
      return {
        value: null,
        confidence: 0,
        source: 'inferred'
      };
    }
    
    // Band keywords sorted by specificity (most specific first)
    const specificBandKeywords = [
      '复合编织表带', '尼龙编织表带', '编织表带',
      '真皮表带', '素皮表带', '皮革表带',
      '不锈钢表带', '钛金属表带', '金属表带',
      '氟橡胶表带', '硅胶表带', '橡胶表带'
    ];
    
    const genericBandKeywords = [
      '表带', '腕带', '表链'
    ];
    
    // Priority 1: Specific band type match (highest confidence)
    for (const keyword of specificBandKeywords) {
      const index = input.indexOf(keyword);
      if (index !== -1) {
        // Extract from keyword to end of string (includes color info)
        const bandInfo = input.substring(index).trim();
        
        // Remove parentheses and model codes
        const cleaned = bandInfo.replace(/\([^)]*\)/g, '').trim();
        
        return {
          value: cleaned,
          confidence: 1.0,
          source: 'exact'
        };
      }
    }
    
    // Priority 2: Generic band keyword match (lower confidence)
    for (const keyword of genericBandKeywords) {
      const index = input.indexOf(keyword);
      if (index !== -1) {
        // Extract from keyword to end of string
        const bandInfo = input.substring(index).trim();
        
        // Remove parentheses and model codes
        const cleaned = bandInfo.replace(/\([^)]*\)/g, '').trim();
        
        return {
          value: cleaned,
          confidence: 0.8,
          source: 'fuzzy'
        };
      }
    }
    
    // No match found
    return {
      value: null,
      confidence: 0,
      source: 'inferred'
    };
  }
  
  /**
   * Detect product type from input string and model
   * 
   * This method analyzes the input string and extracted model to determine
   * the product type (phone, watch, tablet, etc.).
   * 
   * Detection Strategy:
   * 1. Check for product type keywords in input
   * 2. Check for product type patterns in model
   * 3. Default to 'phone' if no specific type detected
   * 
   * @param input - Input string to analyze
   * @param model - Extracted model name (optional)
   * @returns Detected product type
   */
  private detectProductType(input: string, model: string | null): ProductType {
    const lowerInput = input.toLowerCase();
    const lowerModel = model?.toLowerCase() || '';
    
    // Watch detection
    if (
      lowerInput.includes('watch') ||
      lowerInput.includes('手表') ||
      lowerModel.includes('watch') ||
      lowerModel.includes('gt')
    ) {
      return 'watch';
    }
    
    // Band detection
    if (
      lowerInput.includes('band') ||
      lowerInput.includes('手环') ||
      lowerModel.includes('band')
    ) {
      return 'band';
    }
    
    // Tablet detection
    if (
      lowerInput.includes('pad') ||
      lowerInput.includes('平板') ||
      lowerInput.includes('tablet') ||
      lowerModel.includes('pad')
    ) {
      return 'tablet';
    }
    
    // Laptop detection
    if (
      lowerInput.includes('book') ||
      lowerInput.includes('笔记本') ||
      lowerInput.includes('laptop') ||
      lowerModel.includes('book')
    ) {
      return 'laptop';
    }
    
    // Earbuds detection
    if (
      lowerInput.includes('buds') ||
      lowerInput.includes('耳机') ||
      lowerInput.includes('earbuds') ||
      lowerInput.includes('freebuds') ||
      lowerModel.includes('buds')
    ) {
      return 'earbuds';
    }
    
    // Default to phone
    // Most products without specific keywords are phones
    return 'phone';
  }
}
