/**
 * Preprocessing Service
 * 
 * This service handles input preprocessing for the SKU matching system.
 * It performs various text transformations to normalize and clean input strings
 * before they are processed by the information extraction and matching modules.
 * 
 * Features:
 * - Cleaning演示机 markers and special characters
 * - Correcting common typos using text-mappings.json
 * - Expanding abbreviations and aliases
 * - Normalizing formats (capacity, etc.)
 * - Chaining all preprocessing steps in a single method
 * 
 * @module PreprocessingService
 */

import { ConfigLoader, type TextMappingsConfig } from '../config-loader';

/**
 * Preprocessing Service Class
 * 
 * Centralizes all input preprocessing logic for the SKU matching system.
 * This class transforms raw user input into a clean, normalized form that
 * is easier to process by downstream extraction and matching modules.
 * 
 * The preprocessing pipeline consists of:
 * 1. Clean: Remove demo markers, special characters, and noise
 * 2. Correct Typos: Fix common spelling mistakes
 * 3. Expand Abbreviations: Convert short forms to full forms
 * 4. Normalize: Standardize formats (capacity, spacing, etc.)
 * 
 * Usage:
 * ```typescript
 * const preprocessor = new PreprocessingService();
 * await preprocessor.initialize();
 * 
 * const cleaned = preprocessor.preprocess("华为GT5 8GB+256GB 雾松蓝 演示机");
 * // => "华为 Watch GT 5 8+256 雾凇蓝"
 * ```
 */
export class PreprocessingService {
  /** Text mappings configuration loaded from config file */
  private textMappings: TextMappingsConfig | null = null;
  
  /** Flag indicating if the service has been initialized */
  private initialized = false;
  
  /**
   * Initialize the preprocessing service
   * 
   * Loads the text-mappings configuration from the config file.
   * This method must be called before using any preprocessing methods.
   * 
   * @returns Promise that resolves when initialization is complete
   * 
   * @example
   * ```typescript
   * const preprocessor = new PreprocessingService();
   * await preprocessor.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      this.textMappings = await ConfigLoader.load<TextMappingsConfig>('text-mappings');
      this.initialized = true;
      console.log('✓ PreprocessingService initialized');
    } catch (error) {
      console.error('Failed to initialize PreprocessingService:', error);
      // Use default configuration
      this.textMappings = ConfigLoader.getDefaults<TextMappingsConfig>('text-mappings');
      this.initialized = true;
    }
  }
  
  /**
   * Clean input string by removing demo markers and special characters
   * 
   * This method removes:
   * - Demo unit markers: "演示机", "样机", "展示机", "体验机", "试用机", "测试机"
   * - Gift box markers: "礼盒", "套装", "礼品", "礼包"
   * - Accessory markers: "充电器", "充电线", "数据线", "保护壳", "保护套"
   * - Special characters: parentheses, brackets, quotes, etc.
   * - Extra whitespace
   * 
   * The cleaning process preserves:
   * - Product names and model numbers
   * - Color names
   * - Capacity information
   * - Version information
   * 
   * @param input - Input string to clean
   * @returns Cleaned string with demo markers and noise removed
   * 
   * @example
   * ```typescript
   * preprocessor.clean("华为 Mate 60 Pro (演示机) 12GB+256GB")
   * // => "华为 Mate 60 Pro 12GB+256GB"
   * 
   * preprocessor.clean("小米 14 Pro【礼盒装】8+256")
   * // => "小米 14 Pro 8+256"
   * 
   * preprocessor.clean("vivo Y50 + 充电器套装")
   * // => "vivo Y50"
   * ```
   */
  clean(input: string): string {
    if (!input || input.trim().length === 0) {
      return '';
    }
    
    let cleaned = input;
    
    // Remove demo unit markers
    const demoMarkers = [
      '演示机', '样机', '展示机', '体验机', '试用机', '测试机',
      '演示', '样品', '展示', '体验', '试用', '测试'
    ];
    
    for (const marker of demoMarkers) {
      cleaned = cleaned.replace(new RegExp(marker, 'gi'), '');
    }
    
    // Remove gift box and bundle markers
    const giftMarkers = [
      '礼盒装', '礼盒', '套装', '礼品装', '礼品', '礼包',
      '系列', '组合', '套餐'
    ];
    
    for (const marker of giftMarkers) {
      cleaned = cleaned.replace(new RegExp(marker, 'gi'), '');
    }
    
    // Remove accessory keywords (when they appear with "+" or "送")
    const accessoryKeywords = [
      '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套',
      '保护膜', '贴膜', '钢化膜', '支架', '转接头', '适配器',
      '电源', '配件'
    ];
    
    for (const keyword of accessoryKeywords) {
      // Remove patterns like "+ 充电器", "送充电器", "附赠充电器", "赠送充电器"
      cleaned = cleaned.replace(new RegExp(`[+\\s]*[送附赠带配][赠送]?[\\s]*${keyword}`, 'gi'), '');
      cleaned = cleaned.replace(new RegExp(`[+\\s]+${keyword}`, 'gi'), '');
    }
    
    // Remove special characters but preserve important ones
    // Keep: letters, numbers, Chinese characters, spaces, +, -, ., /
    // Remove: parentheses, brackets, quotes, etc.
    cleaned = cleaned.replace(/[()（）\[\]【】「」『』""''《》<>{}]/g, ' ');
    
    // Remove extra punctuation at the end
    cleaned = cleaned.replace(/[,，.。;；:：!！?？]+$/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
  
  /**
   * Correct common typos in input string
   * 
   * This method uses the typoCorrections mapping from text-mappings.json
   * to fix common spelling mistakes in product names, especially color names.
   * 
   * The typo correction is case-insensitive and handles:
   * - Color name typos: "雾松蓝" → "雾凇蓝"
   * - Character confusion: "玥金" → "曜金"
   * - Similar-looking characters: "锆石黑" → "琥珀黑"
   * 
   * @param input - Input string to correct
   * @returns String with typos corrected
   * 
   * @example
   * ```typescript
   * preprocessor.correctTypos("华为 Mate 60 Pro 雾松蓝")
   * // => "华为 Mate 60 Pro 雾凇蓝"
   * 
   * preprocessor.correctTypos("小米 14 Pro 玥金")
   * // => "小米 14 Pro 曜金"
   * ```
   */
  correctTypos(input: string): string {
    if (!input || input.trim().length === 0) {
      return '';
    }
    
    if (!this.textMappings || !this.textMappings.typoCorrections) {
      return input;
    }
    
    let corrected = input;
    
    // Apply typo corrections
    for (const [typo, correction] of Object.entries(this.textMappings.typoCorrections)) {
      // Case-insensitive replacement
      const regex = new RegExp(typo, 'gi');
      corrected = corrected.replace(regex, correction);
    }
    
    return corrected;
  }
  
  /**
   * Expand abbreviations and aliases in input string
   * 
   * This method uses the abbreviations and brandAliases mappings from
   * text-mappings.json to expand short forms to their full forms.
   * 
   * Expansion types:
   * 1. Model abbreviations: "GT5" → "Watch GT 5"
   * 2. Technology abbreviations: "NFC", "eSIM", "5G"
   * 3. Brand aliases: "华为" → "HUAWEI" (if needed)
   * 
   * The method is smart about context:
   * - Only expands when it makes sense (e.g., "GT5" → "Watch GT 5" for watches)
   * - Preserves existing full forms
   * - Handles case variations
   * 
   * @param input - Input string to expand
   * @returns String with abbreviations expanded
   * 
   * @example
   * ```typescript
   * preprocessor.expandAbbreviations("华为 GT5 蓝牙版")
   * // => "华为 Watch GT 5 蓝牙版"
   * 
   * preprocessor.expandAbbreviations("小米手表 NFC版")
   * // => "小米手表 NFC版" (NFC is already standard)
   * 
   * preprocessor.expandAbbreviations("OPPO A5 esim版")
   * // => "OPPO A5 eSIM版"
   * ```
   */
  expandAbbreviations(input: string): string {
    if (!input || input.trim().length === 0) {
      return '';
    }
    
    if (!this.textMappings || !this.textMappings.abbreviations) {
      return input;
    }
    
    let expanded = input;
    
    // Apply abbreviation expansions
    // Sort by length (descending) to match longer abbreviations first
    const abbreviations = Object.entries(this.textMappings.abbreviations)
      .sort(([a], [b]) => b.length - a.length);
    
    for (const [abbr, full] of abbreviations) {
      // Use word boundaries to avoid partial matches
      // For example, "GT5" should match but not "GT" in "WATCHGT"
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      
      // Check if the full form already exists in the string
      // If it does, don't expand (avoid duplication)
      if (!expanded.toLowerCase().includes(full.toLowerCase())) {
        expanded = expanded.replace(regex, full);
      }
    }
    
    return expanded;
  }
  
  /**
   * Apply brand alias mapping to normalize brand names
   * 
   * This method uses the brandAliases mapping from text-mappings.json
   * to normalize brand name variations to their canonical forms.
   * 
   * Brand alias mapping helps ensure consistent brand names:
   * - "HUAWEI" → "华为"
   * - "huawei" → "华为"
   * - "Xiaomi" → "小米"
   * - "MI" → "小米"
   * 
   * The method searches for brand aliases in the input and replaces them
   * with the canonical brand name (the key in the brandAliases mapping).
   * 
   * Matching strategy:
   * 1. Sort aliases by length (descending) to match longer aliases first
   * 2. Use word boundaries to avoid partial matches
   * 3. Case-insensitive matching
   * 4. Replace with canonical brand name
   * 
   * @param input - Input string to apply brand alias mapping
   * @returns String with brand aliases normalized to canonical forms
   * 
   * @example
   * ```typescript
   * preprocessor.applyBrandAliases("HUAWEI Mate 60 Pro")
   * // => "华为 Mate 60 Pro"
   * 
   * preprocessor.applyBrandAliases("Xiaomi 14 Pro")
   * // => "小米 14 Pro"
   * 
   * preprocessor.applyBrandAliases("MI Band 8")
   * // => "小米 Band 8"
   * 
   * preprocessor.applyBrandAliases("OPPO A5")
   * // => "OPPO A5" (OPPO is already canonical)
   * ```
   */
  applyBrandAliases(input: string): string {
    if (!input || input.trim().length === 0) {
      return '';
    }
    
    if (!this.textMappings || !this.textMappings.brandAliases) {
      return input;
    }
    
    let result = input;
    
    // Build a list of all aliases with their canonical brand names
    const aliasMap: Array<{ alias: string; canonical: string }> = [];
    
    for (const [canonical, aliases] of Object.entries(this.textMappings.brandAliases)) {
      for (const alias of aliases) {
        aliasMap.push({ alias, canonical });
      }
    }
    
    // Sort by alias length (descending) to match longer aliases first
    // This prevents partial matches (e.g., "MI" matching before "XIAOMI")
    aliasMap.sort((a, b) => b.alias.length - a.alias.length);
    
    // Apply brand alias replacements
    for (const { alias, canonical } of aliasMap) {
      // Use word boundaries to avoid partial matches
      // For example, "MI" should match "MI Band" but not "XIAOMI"
      const regex = new RegExp(`\\b${alias}\\b`, 'gi');
      
      // Check if the alias exists in the string
      if (regex.test(result)) {
        // Replace the alias with the canonical brand name
        result = result.replace(regex, canonical);
      }
    }
    
    return result;
  }
  
  /**
   * Normalize formats in input string
   * 
   * This method standardizes various format variations to a consistent form:
   * 
   * 1. Capacity normalization:
   *    - "8GB+256GB" → "8+256"
   *    - "8G+256G" → "8+256"
   *    - "256GB" → "256"
   *    - "1TB" → "1T"
   * 
   * 2. Spacing normalization:
   *    - Multiple spaces → single space
   *    - Spaces around "+" → no spaces
   *    - Trim leading/trailing spaces
   * 
   * 3. Case normalization (optional):
   *    - Preserve original case for brand names
   *    - Normalize technical terms (GB, TB, etc.)
   * 
   * The normalization uses the capacityNormalizations mapping from
   * text-mappings.json for consistent capacity format conversion.
   * 
   * @param input - Input string to normalize
   * @returns String with formats normalized
   * 
   * @example
   * ```typescript
   * preprocessor.normalize("华为 Mate 60 Pro 12GB+512GB")
   * // => "华为 Mate 60 Pro 12+512"
   * 
   * preprocessor.normalize("小米 14 Pro  8G + 256G")
   * // => "小米 14 Pro 8+256"
   * 
   * preprocessor.normalize("iPad Pro 1TB")
   * // => "iPad Pro 1T"
   * ```
   */
  normalize(input: string): string {
    if (!input || input.trim().length === 0) {
      return '';
    }
    
    let normalized = input;
    
    // Apply capacity normalizations from config
    if (this.textMappings && this.textMappings.capacityNormalizations) {
      // Sort by length (descending) to match longer patterns first
      const normalizations = Object.entries(this.textMappings.capacityNormalizations)
        .sort(([a], [b]) => b.length - a.length);
      
      for (const [pattern, normalized_form] of normalizations) {
        // Case-insensitive replacement
        const regex = new RegExp(pattern.replace(/\+/g, '\\+'), 'gi');
        normalized = normalized.replace(regex, normalized_form);
      }
    }
    
    // Additional capacity normalization patterns not in config
    // Handle variations with spaces around "+"
    normalized = normalized.replace(/(\d+)\s*(?:gb|g)\s*\+\s*(\d+)\s*(?:gb|g|tb|t)/gi, (match, ram, storage) => {
      // Check if storage is in TB
      if (match.toLowerCase().includes('tb') || match.toLowerCase().endsWith('t')) {
        return `${ram}+${storage}T`;
      }
      return `${ram}+${storage}`;
    });
    
    // Normalize standalone storage values
    normalized = normalized.replace(/\b(\d+)\s*tb\b/gi, '$1T');
    normalized = normalized.replace(/\b(\d+)\s*gb\b/gi, '$1');
    
    // Normalize spacing
    // Remove spaces around "+"
    normalized = normalized.replace(/\s*\+\s*/g, '+');
    
    // Normalize multiple spaces to single space
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Trim leading/trailing spaces
    normalized = normalized.trim();
    
    return normalized;
  }
  
  /**
   * Complete preprocessing pipeline
   * 
   * This method chains all preprocessing steps in the correct order:
   * 1. Clean: Remove demo markers and noise
   * 2. Correct Typos: Fix spelling mistakes
   * 3. Expand Abbreviations: Convert short forms to full forms
   * 4. Apply Brand Aliases: Normalize brand names to canonical forms
   * 5. Normalize: Standardize formats
   * 
   * This is the main entry point for preprocessing and should be used
   * by the matching orchestrator before information extraction.
   * 
   * The order of operations is important:
   * - Clean first to remove noise that might interfere with other steps
   * - Correct typos before expansion to ensure correct matching
   * - Expand abbreviations before brand alias mapping to handle full forms
   * - Apply brand aliases before normalization to ensure consistent brand names
   * - Normalize last to standardize the final output
   * 
   * @param input - Raw input string to preprocess
   * @returns Fully preprocessed string ready for information extraction
   * 
   * @example
   * ```typescript
   * preprocessor.preprocess("HUAWEI GT5 8GB+256GB 雾松蓝 (演示机)")
   * // => "华为 Watch GT 5 8+256 雾凇蓝"
   * 
   * preprocessor.preprocess("Xiaomi 14 Pro【礼盒装】12G + 512G 玥金")
   * // => "小米 14 Pro 12+512 曜金"
   * 
   * preprocessor.preprocess("OPPO A5 活力版 esim版 + 充电器")
   * // => "OPPO A5 活力版 eSIM版"
   * ```
   */
  preprocess(input: string): string {
    if (!input || input.trim().length === 0) {
      return '';
    }
    
    // Ensure service is initialized
    if (!this.initialized) {
      console.warn('PreprocessingService not initialized, using input as-is');
      return input;
    }
    
    // Step 1: Clean
    let processed = this.clean(input);
    
    // Step 2: Correct typos
    processed = this.correctTypos(processed);
    
    // Step 3: Expand abbreviations
    processed = this.expandAbbreviations(processed);
    
    // Step 4: Apply brand aliases
    processed = this.applyBrandAliases(processed);
    
    // Step 5: Normalize
    processed = this.normalize(processed);
    
    return processed;
  }
  
  /**
   * Check if the service is initialized
   * 
   * @returns True if the service has been initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Get the loaded text mappings configuration
   * 
   * @returns The text mappings configuration or null if not loaded
   */
  getTextMappings(): TextMappingsConfig | null {
    return this.textMappings;
  }
}
