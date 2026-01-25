/**
 * 测试品牌索引问题
 * 
 * 问题：红米 15R 没有匹配到，可能是品牌索引的问题
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

// 模拟品牌库
const brandList: BrandData[] = [
  { name: '红米', spell: 'redmi' },
  { name: 'Redmi', spell: 'redmi' },
  { name: 'REDMI', spell: 'redmi' },
];

// 模拟 SPU 数据
const spuList: SPUData[] = [
  { id: 1, name: 'Redmi 15R 全网通5G 4GB+128GB 星岩黑', brand: 'Redmi' },
  { id: 2, name: 'Redmi 15R 全网通5G 8GB+256GB 星岩黑', brand: 'Redmi' },
  { id: 3, name: '红米 15R 全网通5G 4GB+128GB 星岩黑', brand: '红米' },
  { id: 4, name: 'Redmi Note 14 全网通5G', brand: 'Redmi' },
];

// 模拟 extractBrand
function extractBrand(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  for (const brand of brandList) {
    const brandName = brand.name.toLowerCase();
    const brandSpell = brand.spell?.toLowerCase();
    
    if (lowerStr.includes(brandName)) {
      return brand.name;
    }
    
    if (brandSpell && lowerStr.includes(brandSpell)) {
      return brand.name;
    }
  }
  
  return null;
}

// 模拟 buildSPUIndex（当前实现）
function buildSPUIndexCurrent(spuList: SPUData[]): Map<string, SPUData[]> {
  const index = new Map<string, SPUData[]>();
  
  for (const spu of spuList) {
    const brand = spu.brand || extractBrand(spu.name);
    if (!brand) continue;
    
    const lowerBrand = brand.toLowerCase(); // ❌ 问题：中文不会变化
    if (!index.has(lowerBrand)) {
      index.set(lowerBrand, []);
    }
    index.get(lowerBrand)!.push(spu);
  }
  
  return index;
}

// 修复后的 buildSPUIndex
function buildSPUIndexFixed(spuList: SPUData[], brandList: BrandData[]): Map<string, SPUData[]> {
  const index = new Map<string, SPUData[]>();
  
  for (const spu of spuList) {
    const brand = spu.brand || extractBrand(spu.name);
    if (!brand) continue;
    
    // ✅ 修复：同时使用品牌名和拼音作为索引键
    const keys = [brand.toLowerCase()];
    
    // 查找品牌的拼音
    const brandInfo = brandList.find(b => b.name === brand);
    if (brandInfo && brandInfo.spell) {
      keys.push(brandInfo.spell.toLowerCase());
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

console.log('=== 测试品牌索引问题 ===');
console.log('');

// 测试当前实现
console.log('当前实现（有问题）：');
const indexCurrent = buildSPUIndexCurrent(spuList);
console.log('索引键:', Array.from(indexCurrent.keys()));
console.log('');

const inputBrand1 = '红米';
const lowerBrand1 = inputBrand1.toLowerCase();
const result1 = indexCurrent.get(lowerBrand1) || [];
console.log(`查找 "${inputBrand1}" (键: "${lowerBrand1}"): ${result1.length} 个SPU`);
result1.forEach(spu => console.log(`  - ${spu.name}`));
console.log('');

// 测试修复后的实现
console.log('修复后的实现：');
const indexFixed = buildSPUIndexFixed(spuList, brandList);
console.log('索引键:', Array.from(indexFixed.keys()));
console.log('');

const result2 = indexFixed.get(lowerBrand1) || [];
console.log(`查找 "${inputBrand1}" (键: "${lowerBrand1}"): ${result2.length} 个SPU`);
result2.forEach(spu => console.log(`  - ${spu.name}`));
console.log('');

// 测试拼音查找
const result3 = indexFixed.get('redmi') || [];
console.log(`查找 "redmi" (键: "redmi"): ${result3.length} 个SPU`);
result3.forEach(spu => console.log(`  - ${spu.name}`));
console.log('');

console.log('=== 问题分析 ===');
console.log('');
console.log('当前实现的问题：');
console.log('1. SPU brand="Redmi" → 索引键="redmi"');
console.log('2. 输入品牌="红米" → 查找键="红米"');
console.log('3. "红米" !== "redmi" → 找不到 ❌');
console.log('');
console.log('修复方案：');
console.log('1. 构建索引时，同时使用品牌名和拼音作为键');
console.log('2. SPU brand="Redmi" → 索引键=["redmi", "redmi"]');
console.log('3. SPU brand="红米" → 索引键=["红米", "redmi"]');
console.log('4. 输入品牌="红米" → 可以通过 "红米" 键找到');
console.log('5. 输入品牌="Redmi" → 可以通过 "redmi" 键找到');
