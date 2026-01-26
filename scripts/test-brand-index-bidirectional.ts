/**
 * 测试品牌索引的双向映射
 * 
 * 验证：
 * 1. 中文品牌 SPU 可以通过中文和拼音查找
 * 2. 英文品牌 SPU 可以通过中文和拼音查找
 * 3. 大小写不敏感
 */

// 模拟品牌列表
const brandList = [
  { name: '红米', spell: 'redmi' },
  { name: 'vivo', spell: 'vivo' },
  { name: '华为', spell: 'huawei' },
];

// 模拟 SPU 数据（混合中英文品牌）
const testSPUs = [
  { id: 1, name: '红米 15R 全网通5G版 4GB+128GB 星岩黑', brand: '红米' },
  { id: 2, name: 'Redmi K80 Pro', brand: 'Redmi' }, // 英文品牌名
  { id: 3, name: 'redmi Note 13', brand: 'redmi' }, // 小写英文品牌名
  { id: 4, name: 'vivo X100 Pro', brand: 'vivo' },
  { id: 5, name: 'vivo Y50', brand: 'Vivo' }, // 大小写混合
];

// 模拟 buildSPUIndex 函数
function buildSPUIndex(spuList: any[], brandList: any[]) {
  const spuIndexByBrand = new Map<string, any[]>();
  
  for (const spu of spuList) {
    const brand = spu.brand;
    if (!brand) continue;
    
    // 同时使用品牌名和拼音作为索引键
    const keys = [brand.toLowerCase()];
    
    // 正向查找：如果品牌是中文，添加其拼音
    // 使用大小写不敏感的匹配
    const brandInfo = brandList.find(b => 
      b.name.toLowerCase() === brand.toLowerCase()
    );
    if (brandInfo && brandInfo.spell) {
      const spellKey = brandInfo.spell.toLowerCase();
      if (!keys.includes(spellKey)) {
        keys.push(spellKey);
      }
      // 同时添加中文品牌名（标准化后的）
      const chineseKey = brandInfo.name.toLowerCase();
      if (!keys.includes(chineseKey)) {
        keys.push(chineseKey);
      }
    }
    
    // 反向查找：如果品牌是拼音，添加对应的中文品牌名
    const brandInfoBySpell = brandList.find(b => 
      b.spell?.toLowerCase() === brand.toLowerCase()
    );
    if (brandInfoBySpell && brandInfoBySpell.name) {
      const chineseKey = brandInfoBySpell.name.toLowerCase();
      if (!keys.includes(chineseKey)) {
        keys.push(chineseKey);
      }
      // 同时添加拼音（标准化后的）
      if (brandInfoBySpell.spell) {
        const spellKey = brandInfoBySpell.spell.toLowerCase();
        if (!keys.includes(spellKey)) {
          keys.push(spellKey);
        }
      }
    }
    
    console.log(`SPU "${spu.name}" (brand: "${brand}")`);
    console.log(`  索引键: [${keys.join(', ')}]`);
    
    // 为每个键添加品牌索引
    for (const key of keys) {
      if (!spuIndexByBrand.has(key)) {
        spuIndexByBrand.set(key, []);
      }
      spuIndexByBrand.get(key)!.push(spu);
    }
  }
  
  return spuIndexByBrand;
}

console.log('=== 测试品牌索引的双向映射 ===\n');

console.log('步骤1: 建立品牌索引\n');
const spuIndexByBrand = buildSPUIndex(testSPUs, brandList);

console.log('\n步骤2: 查看索引结构\n');
for (const [key, spus] of spuIndexByBrand.entries()) {
  console.log(`索引键 "${key}": ${spus.length} 个SPU`);
  spus.forEach(spu => {
    console.log(`  - ${spu.name}`);
  });
}

console.log('\n步骤3: 测试查找\n');

// 测试用例
const testCases = [
  { query: '红米', expected: 3, description: '使用中文品牌名查找' },
  { query: 'redmi', expected: 3, description: '使用拼音查找' },
  { query: 'Redmi', expected: 3, description: '使用大写拼音查找（应该转小写）' },
  { query: 'vivo', expected: 2, description: '使用小写品牌名查找' },
  { query: 'Vivo', expected: 2, description: '使用大写品牌名查找（应该转小写）' },
];

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  const lowerQuery = testCase.query.toLowerCase();
  const result = spuIndexByBrand.get(lowerQuery) || [];
  const pass = result.length === testCase.expected;
  
  console.log(`测试: ${testCase.description}`);
  console.log(`  查询: "${testCase.query}" -> "${lowerQuery}"`);
  console.log(`  期望: ${testCase.expected} 个SPU`);
  console.log(`  实际: ${result.length} 个SPU`);
  console.log(`  结果: ${pass ? '✅ 通过' : '❌ 失败'}`);
  
  if (pass) {
    passCount++;
  } else {
    failCount++;
    console.log(`  找到的SPU:`);
    result.forEach(spu => {
      console.log(`    - ${spu.name}`);
    });
  }
  console.log();
}

console.log('=== 测试总结 ===');
console.log(`通过: ${passCount}/${testCases.length}`);
console.log(`失败: ${failCount}/${testCases.length}`);

if (failCount === 0) {
  console.log('\n✅ 所有测试通过！品牌索引双向映射工作正常。');
} else {
  console.log('\n❌ 部分测试失败，需要修复。');
}
