/**
 * 测试品牌索引的双向映射
 * 验证中文品牌和拼音品牌都能正确索引
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function testBrandIndexBidirectional() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  // 模拟品牌库
  const mockBrandList = [
    { name: '红米', spell: 'Redmi' },
    { name: '小米', spell: 'Xiaomi' },
    { name: 'vivo', spell: 'vivo' },
    { name: 'OPPO', spell: 'OPPO' },
  ];
  
  matcher.setBrandList(mockBrandList);
  
  // 模拟 SPU 列表（混合中文和拼音品牌）
  const mockSPUList = [
    { id: 1, name: '红米 15R 全网通5G版', brand: '红米' },
    { id: 2, name: 'Redmi Note 13 Pro', brand: 'Redmi' },
    { id: 3, name: '小米14 Pro', brand: '小米' },
    { id: 4, name: 'Xiaomi 14 Ultra', brand: 'Xiaomi' },
    { id: 5, name: 'vivo X100 Pro', brand: 'vivo' },
    { id: 6, name: 'OPPO Find X7', brand: 'OPPO' },
  ];
  
  console.log('=== 测试品牌索引双向映射 ===\n');
  
  // 构建索引
  console.log('构建品牌索引...\n');
  matcher.buildSPUIndex(mockSPUList);
  
  // 测试查找
  console.log('=== 测试查找 ===\n');
  
  const testCases = [
    { query: '红米', expected: [1, 2] },
    { query: 'Redmi', expected: [1, 2] },
    { query: 'redmi', expected: [1, 2] },
    { query: '小米', expected: [3, 4] },
    { query: 'Xiaomi', expected: [3, 4] },
    { query: 'xiaomi', expected: [3, 4] },
    { query: 'vivo', expected: [5] },
    { query: 'OPPO', expected: [6] },
    { query: 'oppo', expected: [6] },
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    // 使用私有属性访问索引（仅用于测试）
    const results = (matcher as any).spuIndexByBrand.get(testCase.query.toLowerCase()) || [];
    const resultIds = results.map((spu: any) => spu.id).sort();
    const expectedIds = testCase.expected.sort();
    
    const pass = JSON.stringify(resultIds) === JSON.stringify(expectedIds);
    
    if (pass) {
      console.log(`✓ "${testCase.query}" → [${resultIds.join(', ')}]`);
      passCount++;
    } else {
      console.log(`✗ "${testCase.query}" → [${resultIds.join(', ')}] (预期: [${expectedIds.join(', ')}])`);
      failCount++;
    }
  }
  
  console.log(`\n=== 测试结果 ===`);
  console.log(`通过: ${passCount}/${testCases.length}`);
  console.log(`失败: ${failCount}/${testCases.length}`);
  
  if (failCount === 0) {
    console.log('\n✅ 所有测试通过！品牌索引双向映射工作正常。');
  } else {
    console.log('\n❌ 部分测试失败！需要检查品牌索引逻辑。');
  }
  
  // 输出索引详情
  console.log('\n=== 索引详情 ===');
  const indexMap = (matcher as any).spuIndexByBrand as Map<string, any[]>;
  for (const [key, spus] of indexMap.entries()) {
    console.log(`"${key}": ${spus.length} 个SPU`);
    spus.forEach(spu => {
      console.log(`  - [${spu.id}] ${spu.name} (品牌: ${spu.brand})`);
    });
  }
}

testBrandIndexBidirectional().catch(console.error);
