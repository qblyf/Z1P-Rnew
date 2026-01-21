/**
 * Manual Test Runner for VersionExtractor
 * 版本提取器手动测试
 */

import { versionExtractor } from './versionExtractor.ts';

console.log('=== VersionExtractor Manual Tests ===\n');

// Test 1: Extract common version identifiers
console.log('Test 1: Extract common version identifiers');
console.log('OPPO A5 活力版 ->', versionExtractor.extractVersion('OPPO A5 活力版'));
console.log('VIVO X200 Pro 标准版 ->', versionExtractor.extractVersion('VIVO X200 Pro 标准版'));
console.log('小米14 青春版 ->', versionExtractor.extractVersion('小米14 青春版'));
console.log('华为Mate60 至尊版 ->', versionExtractor.extractVersion('华为Mate60 至尊版'));
console.log('IQOO Z10 竞速版 ->', versionExtractor.extractVersion('IQOO Z10 竞速版'));
console.log('Redmi K70 极速版 ->', versionExtractor.extractVersion('Redmi K70 极速版'));
console.log('');

// Test 2: Extract network version identifiers
console.log('Test 2: Extract network version identifiers');
console.log('华为P60 全网通5G版 ->', versionExtractor.extractVersion('华为P60 全网通5G版'));
console.log('小米13 5G版 ->', versionExtractor.extractVersion('小米13 5G版'));
console.log('OPPO Reno 4G版 ->', versionExtractor.extractVersion('OPPO Reno 4G版'));
console.log('');

// Test 3: Extract carrier version identifiers
console.log('Test 3: Extract carrier version identifiers');
console.log('iPhone 15 移动版 ->', versionExtractor.extractVersion('iPhone 15 移动版'));
console.log('华为Nova 联通版 ->', versionExtractor.extractVersion('华为Nova 联通版'));
console.log('小米12 电信版 ->', versionExtractor.extractVersion('小米12 电信版'));
console.log('');

// Test 4: Extract regional version identifiers
console.log('Test 4: Extract regional version identifiers');
console.log('iPhone 15 Pro 国行版 ->', versionExtractor.extractVersion('iPhone 15 Pro 国行版'));
console.log('三星S24 港版 ->', versionExtractor.extractVersion('三星S24 港版'));
console.log('iPhone 14 美版 ->', versionExtractor.extractVersion('iPhone 14 美版'));
console.log('');

// Test 5: Extract generation version patterns
console.log('Test 5: Extract generation version patterns');
console.log('Apple Watch V2 ->', versionExtractor.extractVersion('Apple Watch V2'));
console.log('iPad Gen 3 ->', versionExtractor.extractVersion('iPad Gen 3'));
console.log('AirPods 第二代 ->', versionExtractor.extractVersion('AirPods 第二代'));
console.log('小米手环 3代 ->', versionExtractor.extractVersion('小米手环 3代'));
console.log('');

// Test 6: No version found
console.log('Test 6: No version found');
console.log('OPPO A5 ->', versionExtractor.extractVersion('OPPO A5'));
console.log('VIVO X200 Pro ->', versionExtractor.extractVersion('VIVO X200 Pro'));
console.log('小米14 ->', versionExtractor.extractVersion('小米14'));
console.log('');

// Test 7: Complex product names
console.log('Test 7: Complex product names');
console.log('VIVO X200 Pro 活力版 12GB+256GB 玉石绿 ->', versionExtractor.extractVersion('VIVO X200 Pro 活力版 12GB+256GB 玉石绿'));
console.log('华为Mate60 Pro 至尊版 16GB+512GB 雅川青 ->', versionExtractor.extractVersion('华为Mate60 Pro 至尊版 16GB+512GB 雅川青'));
console.log('');

// Test 8: versionsMatch - identical versions
console.log('Test 8: versionsMatch - identical versions');
console.log('活力版 vs 活力版 ->', versionExtractor.versionsMatch('活力版', '活力版'));
console.log('标准版 vs 标准版 ->', versionExtractor.versionsMatch('标准版', '标准版'));
console.log('5G版 vs 5G版 ->', versionExtractor.versionsMatch('5G版', '5G版'));
console.log('');

// Test 9: versionsMatch - both null
console.log('Test 9: versionsMatch - both null');
console.log('null vs null ->', versionExtractor.versionsMatch(null, null));
console.log('');

// Test 10: versionsMatch - one null
console.log('Test 10: versionsMatch - one null');
console.log('活力版 vs null ->', versionExtractor.versionsMatch('活力版', null));
console.log('null vs 活力版 ->', versionExtractor.versionsMatch(null, '活力版'));
console.log('');

// Test 11: versionsMatch - case insensitive
console.log('Test 11: versionsMatch - case insensitive');
console.log('5G版 vs 5g版 ->', versionExtractor.versionsMatch('5G版', '5g版'));
console.log('');

// Test 12: versionsMatch - different spacing
console.log('Test 12: versionsMatch - different spacing');
console.log('5G版 vs 5G 版 ->', versionExtractor.versionsMatch('5G版', '5G 版'));
console.log('全网通5G版 vs 全网通 5G 版 ->', versionExtractor.versionsMatch('全网通5G版', '全网通 5G 版'));
console.log('');

// Test 13: versionsMatch - synonyms
console.log('Test 13: versionsMatch - synonyms');
console.log('5G版 vs 全网通5G版 ->', versionExtractor.versionsMatch('5G版', '全网通5G版'));
console.log('标准版 vs 基础版 ->', versionExtractor.versionsMatch('标准版', '基础版'));
console.log('旗舰版 vs 至尊版 ->', versionExtractor.versionsMatch('旗舰版', '至尊版'));
console.log('');

// Test 14: versionsMatch - different versions
console.log('Test 14: versionsMatch - different versions');
console.log('活力版 vs 标准版 ->', versionExtractor.versionsMatch('活力版', '标准版'));
console.log('5G版 vs 4G版 ->', versionExtractor.versionsMatch('5G版', '4G版'));
console.log('国行版 vs 港版 ->', versionExtractor.versionsMatch('国行版', '港版'));
console.log('');

// Test 15: removeVersion
console.log('Test 15: removeVersion');
console.log('OPPO A5 活力版 ->', versionExtractor.removeVersion('OPPO A5 活力版'));
console.log('VIVO X200 Pro 标准版 ->', versionExtractor.removeVersion('VIVO X200 Pro 标准版'));
console.log('小米14 青春版 ->', versionExtractor.removeVersion('小米14 青春版'));
console.log('OPPO A5 (no version) ->', versionExtractor.removeVersion('OPPO A5'));
console.log('VIVO X200 Pro 活力版 12GB+256GB 玉石绿 ->', versionExtractor.removeVersion('VIVO X200 Pro 活力版 12GB+256GB 玉石绿'));
console.log('');

// Test 16: getSupportedVersions
console.log('Test 16: getSupportedVersions');
const versions = versionExtractor.getSupportedVersions();
console.log('Total supported versions:', versions.length);
console.log('First 10 versions:', versions.slice(0, 10).join(', '));
console.log('');

console.log('=== All Tests Completed ===');
