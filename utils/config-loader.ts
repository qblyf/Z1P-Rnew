/**
 * Configuration Loader Module
 * 
 * This module provides a centralized configuration loading system for the SKU matching system.
 * It handles loading, caching, and providing default fallbacks for all configuration files.
 * 
 * Features:
 * - Lazy loading with caching
 * - Concurrent request deduplication
 * - Automatic fallback to defaults on error
 * - Type-safe configuration interfaces
 * - Preloading support for performance optimization
 * 
 * @module ConfigLoader
 */

/**
 * Version keyword configuration interface
 * 
 * Defines version types and network versions for product matching.
 * Used to identify and match product versions like "Pro版", "标准版", etc.
 */
export interface VersionKeywordConfig {
  /** Array of version definitions with keywords and priorities */
  versions: Array<{
    /** Unique identifier for the version type */
    id: string;
    /** Display name of the version */
    name: string;
    /** Keywords that identify this version in product names */
    keywords: string[];
    /** Priority for matching (higher = more important) */
    priority: number;
  }>;
  /** Network version keywords (e.g., "5G", "全网通") */
  networkVersions: string[];
}

/**
 * Color variant configuration interface
 * 
 * Groups similar colors together for fuzzy matching.
 * Example: "雅川青", "川青", "青色" might be in the same group.
 */
export interface ColorVariantConfig {
  /** Array of color variant groups */
  variants: Array<{
    /** Group identifier */
    group: string;
    /** List of color names in this group */
    colors: string[];
    /** Primary/canonical color name for this group */
    primary: string;
  }>;
  /** Optional note about the configuration */
  note?: string;
}

/**
 * Filter keyword configuration interface
 * 
 * Defines keywords for filtering out non-product items like gift boxes,
 * demo units, and accessories.
 */
export interface FilterKeywordConfig {
  /** Keywords that indicate gift box/bundle items */
  giftBox: string[];
  /** Keywords that indicate demo/display units */
  demo: string[];
  /** Brand names that indicate accessory products */
  accessoryBrands: string[];
  /** Keywords that indicate accessory products (e.g., "充电器", "保护壳") */
  accessoryKeywords?: string[];
}

/**
 * Model normalization configuration interface
 * 
 * Defines rules for normalizing model names to standard forms.
 * Example: "xfold5" → "x fold5", "watchgt" → "watch gt"
 */
export interface ModelNormalizationConfig {
  /** Optional note about the configuration */
  note?: string;
  /** Mapping of non-standard model names to normalized forms */
  normalizations: Record<string, string>;
}

/**
 * Basic color map configuration interface
 * 
 * Defines color families and their associated keywords for color matching.
 * Used to group colors into families like "黑色系", "白色系", etc.
 */
export interface BasicColorMapConfig {
  /** Optional note about the configuration */
  note?: string;
  /** Array of color family definitions */
  colorFamilies: Array<{
    /** Family identifier (e.g., "black", "white") */
    family: string;
    /** Display name of the color family */
    name: string;
    /** Keywords that identify colors in this family */
    keywords: string[];
  }>;
}

/**
 * Text mappings configuration interface
 * 
 * Defines various text transformations for preprocessing input:
 * - Typo corrections
 * - Abbreviation expansions
 * - Brand aliases
 * - Capacity normalizations
 */
export interface TextMappingsConfig {
  /** Optional note about the configuration */
  note?: string;
  /** Mapping of common typos to correct spellings */
  typoCorrections: Record<string, string>;
  /** Mapping of abbreviations to full forms */
  abbreviations: Record<string, string>;
  /** Mapping of brand names to their various aliases */
  brandAliases: Record<string, string[]>;
  /** Mapping of capacity formats to normalized forms */
  capacityNormalizations: Record<string, string>;
}

/**
 * Product types configuration interface
 * 
 * Defines product types and their specification matching weights.
 * Different product types may prioritize different specifications
 * (e.g., phones prioritize capacity, watches prioritize size).
 */
export interface ProductTypesConfig {
  /** Optional note about the configuration */
  note?: string;
  /** Array of product type definitions */
  types: Array<{
    /** Unique identifier for the product type */
    id: string;
    /** Display name of the product type */
    name: string;
    /** Keywords that identify this product type */
    keywords: string[];
    /** Weights for different specifications (must sum to ~1.0) */
    specWeights: Record<string, number>;
  }>;
}

/**
 * Configuration Loader Class
 * 
 * Centralized configuration loading system with caching and fallback support.
 * 
 * Features:
 * - Singleton pattern with static methods
 * - Automatic caching to avoid redundant loads
 * - Concurrent request deduplication
 * - Graceful fallback to defaults on error
 * - Type-safe configuration access
 * 
 * Usage:
 * ```typescript
 * // Load a configuration
 * const config = await ConfigLoader.load<TextMappingsConfig>('text-mappings');
 * 
 * // Get cached configuration (synchronous)
 * const cached = ConfigLoader.getConfig<TextMappingsConfig>('text-mappings');
 * 
 * // Preload all configurations
 * await ConfigLoader.preloadAll();
 * ```
 */
export class ConfigLoader {
  /** Cache of loaded configurations */
  private static configs: Map<string, any> = new Map();
  
  /** Map of in-progress loading promises to prevent duplicate requests */
  private static loading: Map<string, Promise<any>> = new Map();
  
  /**
   * Load a configuration file
   * 
   * This method loads a configuration file from the server and caches it.
   * If the configuration is already loaded, it returns the cached version.
   * If the configuration is currently being loaded, it waits for the existing
   * load operation to complete instead of starting a new one.
   * 
   * On error, it falls back to default configuration values.
   * 
   * @template T - The type of the configuration object
   * @param name - The name of the configuration file (without .json extension)
   * @returns Promise that resolves to the loaded configuration
   * 
   * @example
   * ```typescript
   * const textMappings = await ConfigLoader.load<TextMappingsConfig>('text-mappings');
   * const productTypes = await ConfigLoader.load<ProductTypesConfig>('product-types');
   * ```
   */
  static async load<T = any>(name: string): Promise<T> {
    // 如果已经加载，直接返回
    if (this.configs.has(name)) {
      return this.configs.get(name);
    }
    
    // 如果正在加载，等待加载完成
    if (this.loading.has(name)) {
      return this.loading.get(name)!;
    }
    
    // 开始加载
    const loadPromise = this.loadConfig<T>(name);
    this.loading.set(name, loadPromise);
    
    try {
      const config = await loadPromise;
      this.configs.set(name, config);
      return config;
    } finally {
      this.loading.delete(name);
    }
  }
  
  /**
   * Internal method to actually load a configuration file from the server
   * 
   * Fetches the configuration file from /.kiro/config/{name}.json.
   * If the fetch fails or the file doesn't exist, falls back to default configuration.
   * 
   * @template T - The type of the configuration object
   * @param name - The name of the configuration file (without .json extension)
   * @returns Promise that resolves to the loaded configuration
   * @private
   */
  private static async loadConfig<T>(name: string): Promise<T> {
    try {
      const response = await fetch(`/.kiro/config/${name}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${name}, status: ${response.status}`);
      }
      const config = await response.json();
      console.log(`✓ Config loaded: ${name}`, config);
      return config;
    } catch (error) {
      console.warn(`⚠️ Failed to load config: ${name}, using defaults`, error);
      return this.getDefaults<T>(name);
    }
  }
  
  /**
   * Get default configuration values
   * 
   * Provides fallback configuration values when the actual configuration
   * file cannot be loaded. This ensures the system can still function
   * with reasonable defaults even if configuration files are missing.
   * 
   * @template T - The type of the configuration object
   * @param name - The name of the configuration
   * @returns Default configuration object
   * 
   * @internal - Primarily used for testing and fallback scenarios
   * 
   * @remarks
   * Default configurations are minimal and may not include all features.
   * It's recommended to ensure configuration files are properly deployed.
   */
  static getDefaults<T>(name: string): T {
    const defaults: Record<string, any> = {
      'version-keywords': {
        versions: [
          { id: 'standard', name: '标准版', keywords: ['标准版', '基础版'], priority: 1 },
          { id: 'lite', name: '活力版', keywords: ['活力版', '轻享版'], priority: 2 },
          { id: 'enjoy', name: '优享版', keywords: ['优享版', '享受版'], priority: 3 },
          { id: 'premium', name: '尊享版', keywords: ['尊享版', '高端版'], priority: 4 },
          { id: 'pro', name: 'Pro 版', keywords: ['pro', 'pro版'], priority: 5 }
        ],
        networkVersions: ['全网通5G', '全网通版', '蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '5G', '4G', '3G']
      },
      'color-variants': {
        variants: []
      },
      'filter-keywords': {
        giftBox: ['礼盒', '套装', '系列', '礼品', '礼包'],
        demo: ['演示机', '样机', '展示机', '体验机', '试用机', '测试机'],
        accessoryBrands: ['优诺严选', '品牌', '赠品', '严选', '檀木'],
        accessoryKeywords: ['充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜', '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源', '原装', '配件', '套餐']
      },
      'model-normalizations': {
        normalizations: {
          'xfold5': 'x fold5',
          'watchgt': 'watch gt',
          'watchse': 'watch se'
        }
      },
      'basic-color-map': {
        colorFamilies: [
          { family: 'black', name: '黑色系', keywords: ['黑', '深', '曜', '玄'] },
          { family: 'white', name: '白色系', keywords: ['白', '零', '雪', '空', '格', '告'] },
          { family: 'blue', name: '蓝色系', keywords: ['蓝', '天', '星', '冰'] },
          { family: 'purple', name: '紫色系', keywords: ['紫', '灵', '龙', '流'] },
        ]
      },
      'text-mappings': {
        typoCorrections: {
          '雾松蓝': '雾凇蓝'
        },
        abbreviations: {
          'GT5': 'Watch GT 5',
          'NFC': 'NFC',
          'eSIM': 'eSIM'
        },
        brandAliases: {
          '华为': ['HUAWEI', 'huawei', 'Huawei'],
          '小米': ['XIAOMI', 'xiaomi', 'Xiaomi', 'MI', 'mi']
        },
        capacityNormalizations: {
          '8GB+256GB': '8+256',
          '256GB': '256'
        }
      },
      'product-types': {
        types: [
          {
            id: 'phone',
            name: '手机',
            keywords: ['手机', 'phone'],
            specWeights: {
              capacity: 0.4,
              color: 0.3,
              version: 0.3
            }
          },
          {
            id: 'watch',
            name: '手表',
            keywords: ['watch', '手表', '手环', 'band'],
            specWeights: {
              size: 0.3,
              band: 0.2,
              color: 0.3,
              version: 0.2
            }
          },
          {
            id: 'tablet',
            name: '平板',
            keywords: ['pad', '平板', 'tablet'],
            specWeights: {
              capacity: 0.4,
              color: 0.3,
              version: 0.3
            }
          }
        ]
      }
    };
    
    return (defaults[name] || {}) as T;
  }
  
  /**
   * Get a previously loaded configuration (synchronous)
   * 
   * Returns a configuration from the cache if it has been loaded.
   * Returns null if the configuration hasn't been loaded yet.
   * 
   * This is useful when you know a configuration has already been loaded
   * and you want to access it synchronously without awaiting.
   * 
   * @template T - The type of the configuration object
   * @param name - The name of the configuration
   * @returns The cached configuration or null if not loaded
   * 
   * @example
   * ```typescript
   * // After loading
   * await ConfigLoader.load('text-mappings');
   * 
   * // Later, get synchronously
   * const config = ConfigLoader.getConfig<TextMappingsConfig>('text-mappings');
   * if (config) {
   *   // Use config
   * }
   * ```
   */
  static getConfig<T = any>(name: string): T | null {
    return this.configs.get(name) || null;
  }
  
  /**
   * Clear configuration cache
   * 
   * Removes configurations from the cache, forcing them to be reloaded
   * on the next access. Useful for testing or when configurations have
   * been updated and need to be refreshed.
   * 
   * @param name - Optional name of specific configuration to clear.
   *               If omitted, clears all cached configurations.
   * 
   * @example
   * ```typescript
   * // Clear specific configuration
   * ConfigLoader.clearCache('text-mappings');
   * 
   * // Clear all configurations
   * ConfigLoader.clearCache();
   * ```
   */
  static clearCache(name?: string) {
    if (name) {
      this.configs.delete(name);
    } else {
      this.configs.clear();
    }
  }
  
  /**
   * Preload all configuration files
   * 
   * Loads all known configuration files in parallel and caches them.
   * This is useful for improving performance by loading configurations
   * upfront rather than on-demand.
   * 
   * Recommended to call this during application initialization.
   * 
   * @returns Promise that resolves when all configurations are loaded
   * 
   * @example
   * ```typescript
   * // During app initialization
   * await ConfigLoader.preloadAll();
   * 
   * // Now all configs are cached and can be accessed quickly
   * const config = ConfigLoader.getConfig('text-mappings');
   * ```
   */
  static async preloadAll(): Promise<void> {
    const configNames = [
      'version-keywords',
      'color-variants',
      'filter-keywords',
      'model-normalizations',
      'basic-color-map',
      'text-mappings',
      'product-types'
    ];
    
    await Promise.all(configNames.map(name => this.load(name)));
    console.log('✓ All configs preloaded');
  }
}
