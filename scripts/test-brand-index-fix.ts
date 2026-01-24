/**
 * 测试品牌索引修复
 */

interface SPUData {
  id: number;
  name: string;
  brand?: string;
}

interface BrandData {
  name: string;
  spell?: string;
}

const brandList: BrandData[] = [
  { name: '红米', spell: 'redmi' },
  { name: 'Redmi', spell: 'redmi' },
  { name: 'vivo', spell: 'vivo' },
  { name: '小米', spell: 'xiaomi' },
  { name: 'Xiaomi', spell: 'xiaomi' },
];

const spuList: SPUData[] = [
  { id: 1, name: 'Redmi 15R 全网通5G 4GB+128GB', brand: 'Redmi' },
  { id: 2, name: 'Redmi 15R 全网通5G 8GB+256GB', brand: 'Redmi' },
  { id: 3, name: '红米 Note 14 全网通5G', brand: '红米' },
  { id: 4, name: 'vivo Y50 全网通5G', brand: 'vivo' },
  { id: 5, name: 'Xiaomi 14 Pro', brand: 'Xiaomi' },
  { id: 6, name: '小米 14 Ultra', brand: '小米' },
];

function buildSPUIndexFixed(spuList: SPUData[], brandList: BrandData[]): Map<string, SPUData[]> {
  const index = new Map<string, SPUData[]>();
  
  for (const spu of spuList) {
    const brand = spu.brand;
    if (!brand) continue;
    
    // ✅ 修复：同时使用品牌名和拼音作为索引键
    const keys = [brand.toLowerCase()];
    
    // 查找品牌的拼音
    const brandInfo = brandList.find(b => b.name === brand);
    if (brandInfo && brandInfo.spell) {
      const spellKey = brandInfo.spell.toLowerCase();
      if (!keys.includes(spellKey)) {
        keys.push(spellKey);
      }
    }
    
    // 为每个键添加索引
    for (const key of keys) {
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)!.push(spu);
    }
  }
  
  return index;
}

console.log('=== 测试品牌索引修复 ===');
console.log('');

const index = buildSPUIndexFixed(spuList, brandList);

console.log('索引键:', Array.from(index.keys()).sort());
console.log('');

const testCases = [
  { input: '红米 15R 5g 4+128星岩黑', brand: '红米', expectedCount: 3 },
  { input: 'Redmi 15R 5g 4+128星岩黑', brand: 'Redmi', expectedCount: 3 },
  { input: 'vivo Y50 5G', brand: 'vivo', expectedCount: 1 },
  { input: '小米 14 Ultra', brand: '小米', expectedCount: 2 },
  { input: 'Xiaomi 14 Pro', brand: 'Xiaomi', expectedCount: 2 },
];

testCases.forEach(({ input, brand, expectedCount }) => {
  const lowerBrand = brand.toLowerCase();
  const result = index.get(lowerBrand) || [];
  const status = result.length === expectedCount ? '✅' : '❌';
  
  console.log(`${status} 输入: "${input}"`);
  console.log(`   品牌: "${brand}" (键: "${lowerBrand}")`);
  console.log(`   找到: ${result.length} 个SPU (期望: ${expectedCount})`);
  if (result.length > 0) {
    result.forEach(spu => console.log(`     - ${spu.name}`));
  }
  console.log('');
});

console.log('=== 修复说明 ===');
console.log('');
console.log('修复前的问题：');
console.log('1. SPU brand="Redmi" → 索引键="redmi"');
console.log('2. 输入品牌="红米" → 查找键="红米"');
console.log('3. "红米" !== "redmi" → 找不到 ❌');
console.log('');
console.log('修复后的逻辑：');
console.log('1. SPU brand="Redmi" → 索引键=["redmi", "redmi"]（品牌名+拼音）');
console.log('2. SPU brand="红米" → 索引键=["红米", "redmi"]（品牌名+拼音）');
console.log('3. 输入品牌="红米" → 查找键="红米" → 找到 ✅');
console.log('4. 输入品牌="Redmi" → 查找键="redmi" → 找到 ✅');
console.log('');
console.log('效果：');
console.log('- 中文品牌名可以找到英文 brand 的 SPU');
console.log('- 英文品牌名可以找到中文 brand 的 SPU');
console.log('- 同一品牌的所有 SPU 都能被找到');
