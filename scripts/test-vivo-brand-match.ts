/**
 * 测试 Vivo 品牌匹配问题
 * 
 * 问题：Vivo Y50 和 vivo Y50 没有匹配上
 * 原因分析：品牌提取时大小写敏感
 */

// 模拟品牌库数据
const mockBrandList = [
  { name: 'vivo', spell: 'vivo' },
  { name: 'Vivo', spell: 'vivo' }, // 可能品牌库中只有小写的 vivo
  { name: '红米', spell: 'redmi' },
  { name: 'Redmi', spell: 'redmi' },
];

// 模拟 extractBrand 函数
function extractBrand(str: string, brandList: typeof mockBrandList): string | null {
  const lowerStr = str.toLowerCase();
  
  // 按品牌名称长度降序排序
  const sortedBrands = [...brandList].sort((a, b) => b.name.length - a.name.length);
  
  for (const brand of sortedBrands) {
    const brandName = brand.name.toLowerCase();
    const brandSpell = brand.spell?.toLowerCase();
    
    // 匹配中文品牌名
    if (lowerStr.includes(brandName)) {
      return brand.name; // 返回原始品牌名（保持大小写）
    }
    
    // 匹配拼音
    if (brandSpell && lowerStr.includes(brandSpell)) {
      return brand.name;
    }
  }
  
  return null;
}

// 模拟 isBrandMatch 函数
function isBrandMatch(brand1: string | null, brand2: string | null, brandList: typeof mockBrandList): boolean {
  if (!brand1 || !brand2) return false;
  
  // 完全匹配
  if (brand1 === brand2) return true;
  
  // 通过拼音匹配
  const brand1Info = brandList.find(b => b.name === brand1);
  const brand2Info = brandList.find(b => b.name === brand2);
  
  // 如果两个品牌有相同的拼音，认为它们匹配
  if (brand1Info && brand2Info && brand1Info.spell && brand2Info.spell) {
    return brand1Info.spell.toLowerCase() === brand2Info.spell.toLowerCase();
  }
  
  return false;
}

console.log('=== 测试场景 1: 品牌库只有小写 vivo ===');
const brandList1 = [
  { name: 'vivo', spell: 'vivo' },
];

const input1 = 'Vivo Y50 5G(8+256)白金';
const spu1 = 'vivo Y50 全网通5G 8GB+256GB 白金';

const inputBrand1 = extractBrand(input1, brandList1);
const spuBrand1 = extractBrand(spu1, brandList1);

console.log(`输入: "${input1}"`);
console.log(`SPU: "${spu1}"`);
console.log(`提取的输入品牌: "${inputBrand1}"`);
console.log(`提取的SPU品牌: "${spuBrand1}"`);
console.log(`品牌是否匹配: ${isBrandMatch(inputBrand1, spuBrand1, brandList1)}`);
console.log('');

console.log('=== 问题分析 ===');
console.log('问题：extractBrand 返回的是品牌库中的原始品牌名（保持大小写）');
console.log('- 输入 "Vivo Y50" 匹配到品牌库中的 "vivo"，返回 "vivo"');
console.log('- SPU "vivo Y50" 匹配到品牌库中的 "vivo"，返回 "vivo"');
console.log('- isBrandMatch("vivo", "vivo") 应该返回 true');
console.log('');

console.log('=== 测试场景 2: 品牌库有大小写不同的 vivo ===');
const brandList2 = [
  { name: 'vivo', spell: 'vivo' },
  { name: 'Vivo', spell: 'vivo' },
];

const inputBrand2 = extractBrand(input1, brandList2);
const spuBrand2 = extractBrand(spu1, brandList2);

console.log(`输入: "${input1}"`);
console.log(`SPU: "${spu1}"`);
console.log(`提取的输入品牌: "${inputBrand2}"`);
console.log(`提取的SPU品牌: "${spuBrand2}"`);
console.log(`品牌是否匹配: ${isBrandMatch(inputBrand2, spuBrand2, brandList2)}`);
console.log('');

console.log('=== 可能的问题 ===');
console.log('1. 品牌库中可能有多个大小写不同的 vivo 条目');
console.log('2. extractBrand 按长度排序，可能先匹配到 "Vivo"，后匹配到 "vivo"');
console.log('3. 导致 inputBrand 和 spuBrand 不一致');
console.log('');

console.log('=== 解决方案 ===');
console.log('方案1: 在 isBrandMatch 中添加大小写不敏感的比较');
console.log('方案2: 在 extractBrand 中统一返回小写或大写');
console.log('方案3: 在品牌库中去重，确保每个品牌只有一个条目');
