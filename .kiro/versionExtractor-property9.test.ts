/**
 * Property-Based Test: Version Identifier Extraction
 * 属性测试：版本标识提取
 * 
 * Feature: smart-match-optimization
 * Property 9: 版本标识提取
 * 
 * **Validates: Requirements 4.1, 4.3**
 * 
 * Property: For any product name containing version identifier keywords
 * (活力版、标准版、青春版、至尊版、竞速版、极速版, etc.),
 * the version extractor should correctly extract the version identifier.
 */

import * as fc from 'fast-check';
import { versionExtractor } from './versionExtractor';

describe('Property 9: 版本标识提取', () => {
  /**
   * Property Test: Common version identifiers are correctly extracted
   * 
   * For any product name containing common version identifiers,
   * extractVersion should return the correct version identifier
   */
  it('should extract common version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names with common version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung', '华为', '小米', 'IQOO', '荣耀'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'iPhone 15', 'Galaxy S24', 'Nova 12', 'P70'),
          modelSuffix: fc.option(fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE', 'mini'), { nil: '' }),
          version: fc.constantFrom(
            '活力版',
            '标准版',
            '青春版',
            '至尊版',
            '竞速版',
            '极速版',
            '全网通5G版'
          ),
          attributes: fc.option(
            fc.constantFrom('12GB+256GB', '8GB+128GB', '黑色', '白色', '蓝色', '绿色'),
            { nil: '' }
          ),
        }),
        ({ brand, model, modelSuffix, version, attributes }) => {
          // Construct product name with version identifier
          const parts = [brand, model, modelSuffix, version, attributes].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Extended version identifiers are correctly extracted
   * 
   * For any product name containing extended version identifiers,
   * extractVersion should return the correct version identifier
   */
  it('should extract extended version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names with extended version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', '华为', '小米', 'IQOO'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'Nova 12', 'P70', 'K70'),
          version: fc.constantFrom(
            '旗舰版',
            '尊享版',
            '典藏版',
            '纪念版',
            '限定版',
            '特别版',
            '周年版',
            '定制版',
            '专业版',
            '大师版',
            '先锋版',
            '探索版',
            '畅享版',
            '轻享版',
            '潮流版',
            '时尚版',
            '经典版',
            '豪华版',
            '精英版',
            '荣耀版',
            '冠军版',
            '传奇版',
            '超能版',
            '超级版',
            '增强版',
            '升级版',
            '进阶版',
            '高配版',
            '低配版',
            '入门版',
            '基础版',
            '简化版',
            '简约版',
            '纯净版'
          ),
        }),
        ({ brand, model, version }) => {
          // Construct product name with version identifier
          const productName = `${brand} ${model} ${version}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Material version identifiers are correctly extracted
   * 
   * For any product name containing material-based version identifiers,
   * extractVersion should return the correct version identifier
   */
  it('should extract material version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names with material version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', '华为', '小米'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'Nova 12', 'P70'),
          version: fc.constantFrom(
            '素皮版',
            '玻璃版',
            '陶瓷版',
            '钛金版'
          ),
          color: fc.option(fc.constantFrom('黑色', '白色', '蓝色', '绿色', '紫色'), { nil: '' }),
        }),
        ({ brand, model, version, color }) => {
          // Construct product name with material version identifier
          const parts = [brand, model, version, color].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Regional version identifiers are correctly extracted
   * 
   * For any product name containing regional version identifiers,
   * extractVersion should return the correct version identifier
   */
  it('should extract regional version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names with regional version identifiers
        fc.record({
          brand: fc.constantFrom('Apple', 'Samsung', 'VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          model: fc.constantFrom('iPhone 15', 'Galaxy S24', 'X200', 'Mate 60', 'Mi 14', 'Reno 12'),
          version: fc.constantFrom(
            '国行版',
            '港版',
            '美版',
            '欧版',
            '日版',
            '韩版',
            '国际版',
            '中国版'
          ),
        }),
        ({ brand, model, version }) => {
          // Construct product name with regional version identifier
          const productName = `${brand} ${model} ${version}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Network version identifiers are correctly extracted
   * 
   * For any product name containing network version identifiers,
   * extractVersion should return the correct version identifier
   */
  it('should extract network version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names with network version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', '华为', '小米', 'IQOO'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'Nova 12', 'P70', 'K70'),
          version: fc.constantFrom(
            '全网通5G版',
            '全网通版',
            '移动版',
            '联通版',
            '电信版',
            '双卡版',
            '单卡版',
            '5G版',
            '4G版',
            '3G版'
          ),
          capacity: fc.option(fc.constantFrom('12GB+256GB', '8GB+128GB', '16GB+512GB'), { nil: '' }),
        }),
        ({ brand, model, version, capacity }) => {
          // Construct product name with network version identifier
          const parts = [brand, model, version, capacity].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Version identifiers with different positions are extracted
   * 
   * For any product name with version identifier at different positions,
   * extractVersion should return the correct version identifier
   */
  it('should extract version identifiers regardless of position', () => {
    fc.assert(
      fc.property(
        // Generate product names with version at different positions
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', '华为', '小米'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'Nova 12', 'P70'),
          version: fc.constantFrom('活力版', '标准版', '青春版', '至尊版', '竞速版', '极速版'),
          capacity: fc.constantFrom('12GB+256GB', '8GB+128GB', '16GB+512GB'),
          color: fc.constantFrom('黑色', '白色', '蓝色', '绿色', '紫色'),
          // Position: 0 = after model, 1 = after capacity, 2 = at end
          position: fc.integer({ min: 0, max: 2 }),
        }),
        ({ brand, model, version, capacity, color, position }) => {
          // Construct product name with version at different positions
          let productName: string;
          if (position === 0) {
            productName = `${brand} ${model} ${version} ${capacity} ${color}`;
          } else if (position === 1) {
            productName = `${brand} ${model} ${capacity} ${version} ${color}`;
          } else {
            productName = `${brand} ${model} ${capacity} ${color} ${version}`;
          }
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier regardless of position
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Version identifiers with case variations are extracted
   * 
   * For any product name with version identifier in different cases,
   * extractVersion should return the standardized version identifier
   */
  it('should extract version identifiers with case variations', () => {
    fc.assert(
      fc.property(
        // Generate product names with version in different cases
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12'),
          version: fc.constantFrom('活力版', '标准版', '青春版', '至尊版', '竞速版', '极速版'),
        }),
        ({ brand, model, version }) => {
          // Construct product name (version keywords are in Chinese, so case doesn't apply)
          // But we test with mixed case brand/model
          const productName = `${brand.toLowerCase()} ${model.toUpperCase()} ${version}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Version identifiers with extra whitespace are extracted
   * 
   * For any product name with extra whitespace around version identifier,
   * extractVersion should return the correct version identifier
   */
  it('should extract version identifiers with extra whitespace', () => {
    fc.assert(
      fc.property(
        // Generate product names with extra whitespace
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', '华为', '小米'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'Nova 12', 'P70'),
          version: fc.constantFrom('活力版', '标准版', '青春版', '至尊版', '竞速版', '极速版'),
          spacesBefore: fc.integer({ min: 1, max: 5 }),
          spacesAfter: fc.integer({ min: 1, max: 5 }),
        }),
        ({ brand, model, version, spacesBefore, spacesAfter }) => {
          // Construct product name with extra whitespace
          const beforeSpaces = ' '.repeat(spacesBefore);
          const afterSpaces = ' '.repeat(spacesAfter);
          const productName = `${brand} ${model}${beforeSpaces}${version}${afterSpaces}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the correct version identifier
          expect(extractedVersion).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Longer version identifiers are prioritized over shorter ones
   * 
   * For any product name containing both "5G版" and "全网通5G版",
   * extractVersion should return the longer, more specific version
   */
  it('should prioritize longer version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names with overlapping version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', '华为', '小米'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'Nova 12', 'P70'),
          capacity: fc.option(fc.constantFrom('12GB+256GB', '8GB+128GB'), { nil: '' }),
        }),
        ({ brand, model, capacity }) => {
          // Construct product name with "全网通5G版" (which contains "5G版")
          const parts = [brand, model, '全网通5G版', capacity].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the longer version "全网通5G版" not just "5G版"
          expect(extractedVersion).toBe('全网通5G版');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Products without version identifiers return null
   * 
   * For any product name without version identifiers,
   * extractVersion should return null
   */
  it('should return null for products without version identifiers', () => {
    fc.assert(
      fc.property(
        // Generate product names without version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO', 'Apple', 'Samsung', '华为', '小米'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12', 'iPhone 15', 'Galaxy S24', 'Nova 12', 'P70'),
          modelSuffix: fc.option(fc.constantFrom('Pro', 'Max', 'Plus', 'Ultra', 'SE', 'mini'), { nil: '' }),
          capacity: fc.option(fc.constantFrom('12GB+256GB', '8GB+128GB', '16GB+512GB', '256GB', '512GB'), { nil: '' }),
          color: fc.option(fc.constantFrom('黑色', '白色', '蓝色', '绿色', '紫色', '金色', '银色'), { nil: '' }),
        }),
        ({ brand, model, modelSuffix, capacity, color }) => {
          // Construct product name without version identifier
          const parts = [brand, model, modelSuffix, capacity, color].filter(p => p !== '');
          const productName = parts.join(' ');
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should return null (no version identifier found)
          expect(extractedVersion).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Empty or null input returns null
   * 
   * For any empty or null input, extractVersion should return null
   */
  it('should return null for empty or null input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '),
        (input) => {
          // Extract version from empty/whitespace input
          const extractedVersion = versionExtractor.extractVersion(input);
          
          // Should return null
          expect(extractedVersion).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Generation-based version patterns are extracted
   * 
   * For any product name with generation patterns (V1, Gen 2, 第一代, etc.),
   * extractVersion should return the correct version pattern
   */
  it('should extract generation-based version patterns', () => {
    fc.assert(
      fc.property(
        // Generate product names with generation patterns
        fc.record({
          brand: fc.constantFrom('Apple', 'Samsung', 'VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          model: fc.constantFrom('Watch', 'Buds', 'Pad', 'Band', 'AirPods', 'Galaxy Buds'),
          versionType: fc.constantFrom('V', 'Gen', 'Gen '),
          versionNumber: fc.integer({ min: 1, max: 9 }),
        }),
        ({ brand, model, versionType, versionNumber }) => {
          // Construct product name with generation pattern
          const versionPattern = `${versionType}${versionNumber}`;
          const productName = `${brand} ${model} ${versionPattern}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the generation pattern
          expect(extractedVersion).not.toBeNull();
          expect(extractedVersion).toContain(versionNumber.toString());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Chinese generation patterns are extracted
   * 
   * For any product name with Chinese generation patterns (第一代, 第二代, etc.),
   * extractVersion should return the correct version pattern
   */
  it('should extract Chinese generation patterns', () => {
    fc.assert(
      fc.property(
        // Generate product names with Chinese generation patterns
        fc.record({
          brand: fc.constantFrom('华为', '小米', 'VIVO', 'OPPO', '荣耀', '魅族'),
          model: fc.constantFrom('手表', '手环', '耳机', '平板', '笔记本'),
          generation: fc.constantFrom('第一代', '第二代', '第三代', '第四代', '第五代'),
        }),
        ({ brand, model, generation }) => {
          // Construct product name with Chinese generation pattern
          const productName = `${brand} ${model} ${generation}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract the Chinese generation pattern
          expect(extractedVersion).toBe(generation);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Real-world product examples with version identifiers
   * 
   * Test with real-world product names from requirements
   */
  it('should extract version identifiers from real-world product examples', () => {
    const realWorldExamples = [
      { name: 'VIVO X200 Pro 活力版 12GB+256GB 玉石绿', expectedVersion: '活力版' },
      { name: 'Huawei Mate 60 Pro 标准版 12GB+512GB', expectedVersion: '标准版' },
      { name: 'Xiaomi 14 青春版 8GB+128GB 黑色', expectedVersion: '青春版' },
      { name: 'OPPO Reno 12 至尊版 16GB+512GB', expectedVersion: '至尊版' },
      { name: 'IQOO Neo9 竞速版 12GB+256GB', expectedVersion: '竞速版' },
      { name: 'VIVO S19 极速版 8GB+256GB', expectedVersion: '极速版' },
      { name: 'Huawei Nova 12 全网通5G版 12GB+256GB', expectedVersion: '全网通5G版' },
      { name: 'Xiaomi 14 Pro 素皮版 12GB+512GB 黑色', expectedVersion: '素皮版' },
      { name: 'OPPO Find X7 陶瓷版 16GB+512GB', expectedVersion: '陶瓷版' },
      { name: 'Huawei Mate 60 Pro 国行版 12GB+512GB', expectedVersion: '国行版' },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...realWorldExamples),
        ({ name, expectedVersion }) => {
          // Extract version from real-world example
          const extractedVersion = versionExtractor.extractVersion(name);
          
          // Should extract the expected version identifier
          expect(extractedVersion).toBe(expectedVersion);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Multiple version identifiers - first one is extracted
   * 
   * For any product name with multiple version identifiers,
   * extractVersion should return the first (longest) one found
   */
  it('should extract the first version identifier when multiple exist', () => {
    fc.assert(
      fc.property(
        // Generate product names with multiple version identifiers
        fc.record({
          brand: fc.constantFrom('VIVO', 'Huawei', 'Xiaomi', 'OPPO'),
          model: fc.constantFrom('X200', 'Mate 60', 'Mi 14', 'Reno 12'),
          version1: fc.constantFrom('活力版', '标准版', '青春版'),
          version2: fc.constantFrom('5G版', '4G版', '国行版'),
        }),
        ({ brand, model, version1, version2 }) => {
          // Construct product name with two version identifiers
          const productName = `${brand} ${model} ${version1} ${version2}`;
          
          // Extract version
          const extractedVersion = versionExtractor.extractVersion(productName);
          
          // Should extract one of the version identifiers (the first one found)
          expect(extractedVersion).not.toBeNull();
          expect([version1, version2]).toContain(extractedVersion);
        }
      ),
      { numRuns: 100 }
    );
  });
});
