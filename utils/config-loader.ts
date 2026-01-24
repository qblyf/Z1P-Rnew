/**
 * 配置加载器
 * 用于加载智能匹配的配置文件
 */

export interface VersionKeywordConfig {
  versions: Array<{
    id: string;
    name: string;
    keywords: string[];
    priority: number;
  }>;
  networkVersions: string[];
}

export interface ColorVariantConfig {
  variants: Array<{
    group: string;
    colors: string[];
    primary: string;
  }>;
  note?: string;
}

export interface FilterKeywordConfig {
  giftBox: string[];
  demo: string[];
  accessoryBrands: string[];
}

export interface ModelNormalizationConfig {
  note?: string;
  normalizations: Record<string, string>;
}

export interface BasicColorMapConfig {
  note?: string;
  colorFamilies: Array<{
    family: string;
    name: string;
    keywords: string[];
  }>;
}

export class ConfigLoader {
  private static configs: Map<string, any> = new Map();
  private static loading: Map<string, Promise<any>> = new Map();
  
  /**
   * 加载配置文件
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
   * 实际加载配置文件
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
   * 获取默认配置（降级方案）
   */
  private static getDefaults<T>(name: string): T {
    const defaults: Record<string, any> = {
      'version-keywords': {
        versions: [
          { id: 'standard', name: '标准版', keywords: ['标准版', '基础版'], priority: 1 },
          { id: 'lite', name: '活力版', keywords: ['活力版', '轻享版'], priority: 2 },
          { id: 'enjoy', name: '优享版', keywords: ['优享版', '享受版'], priority: 3 },
          { id: 'premium', name: '尊享版', keywords: ['尊享版', '高端版'], priority: 4 },
          { id: 'pro', name: 'Pro 版', keywords: ['pro', 'pro版'], priority: 5 }
        ],
        networkVersions: ['蓝牙版', 'eSIM版', 'esim版', '5G版', '4G版', '3G版', '全网通版']
      },
      'color-variants': {
        variants: []
      },
      'filter-keywords': {
        giftBox: ['礼盒', '套装', '系列', '礼品', '礼包'],
        demo: ['演示机', '样机', '展示机', '体验机', '试用机', '测试机'],
        accessoryBrands: ['优诺严选', '品牌', '赠品', '严选', '檀木']
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
      }
    };
    
    return (defaults[name] || {}) as T;
  }
  
  /**
   * 获取已加载的配置（同步）
   */
  static getConfig<T = any>(name: string): T | null {
    return this.configs.get(name) || null;
  }
  
  /**
   * 清除缓存
   */
  static clearCache(name?: string) {
    if (name) {
      this.configs.delete(name);
    } else {
      this.configs.clear();
    }
  }
  
  /**
   * 预加载所有配置
   */
  static async preloadAll(): Promise<void> {
    const configNames = [
      'version-keywords',
      'color-variants',
      'filter-keywords',
      'model-normalizations',
      'basic-color-map'
    ];
    
    await Promise.all(configNames.map(name => this.load(name)));
    console.log('✓ All configs preloaded');
  }
}
