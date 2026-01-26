// 测试 preprocessModelString 对"红米 15R"的处理

// 模拟品牌列表
const brandList = [
  { name: '红米', spell: 'Redmi' },
  { name: 'Redmi', spell: 'Redmi' },
];

function getBrandsToRemove(): string[] {
  const brandsToRemove: string[] = [];
  
  for (const brand of brandList) {
    brandsToRemove.push(brand.name.toLowerCase());
    if (brand.spell) {
      brandsToRemove.push(brand.spell.toLowerCase());
    }
  }
  
  return brandsToRemove.sort((a, b) => b.length - a.length);
}

function preprocessModelString(lowerStr: string): string {
  console.log(`输入: "${lowerStr}"`);
  
  // 移除括号内容
  let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
  console.log(`1. 移除括号后: "${normalizedStr}"`);
  
  // 移除品牌
  const brandsToRemove = getBrandsToRemove();
  console.log(`2. 要移除的品牌: ${brandsToRemove.join(', ')}`);
  
  for (const brand of brandsToRemove) {
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
    const brandRegex = hasChinese 
      ? new RegExp(escapedBrand, 'gi')
      : new RegExp(`\\b${escapedBrand}\\b`, 'gi');
    
    const before = normalizedStr;
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
    if (before !== normalizedStr) {
      console.log(`   移除品牌 "${brand}": "${before}" -> "${normalizedStr}"`);
    }
  }
  
  normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
  console.log(`3. 最终结果: "${normalizedStr}"`);
  
  return normalizedStr;
}

console.log('=== 测试1: "红米 15r" ===');
const result1 = preprocessModelString('红米 15r');
console.log();

console.log('=== 测试2: "15r" ===');
const result2 = preprocessModelString('15r');
console.log();

console.log('=== 测试3: "redmi 15r" ===');
const result3 = preprocessModelString('redmi 15r');
