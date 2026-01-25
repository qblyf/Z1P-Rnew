/**
 * 检查品牌库中的 vivo 数据
 */

import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';

async function checkBrandLibrary() {
  console.log('正在加载品牌库...');
  const brands = await getBrandBaseList();
  
  console.log(`品牌库总数: ${brands.length}`);
  console.log('');
  
  // 查找所有包含 vivo 的品牌
  const vivoBrands = brands.filter(b => 
    b.name.toLowerCase().includes('vivo') || 
    (b.spell && b.spell.toLowerCase().includes('vivo'))
  );
  
  console.log('=== 品牌库中的 vivo 相关品牌 ===');
  vivoBrands.forEach(brand => {
    console.log(`名称: "${brand.name}", 拼音: "${brand.spell || 'N/A'}"`);
  });
  console.log('');
  
  // 检查是否有重复
  const vivoNames = vivoBrands.map(b => b.name);
  const uniqueNames = new Set(vivoNames);
  
  if (vivoNames.length !== uniqueNames.size) {
    console.log('⚠️  发现重复的品牌名称！');
    const duplicates = vivoNames.filter((name, index) => vivoNames.indexOf(name) !== index);
    console.log('重复的品牌:', [...new Set(duplicates)]);
  } else {
    console.log('✓ 没有重复的品牌名称');
  }
  console.log('');
  
  // 测试品牌提取
  console.log('=== 测试品牌提取 ===');
  const testCases = [
    'Vivo Y50 5G(8+256)白金',
    'vivo Y50 全网通5G 8GB+256GB 白金',
    'vivo 原装 50W无线闪充立式充电器（CH2177） 白色',
  ];
  
  for (const testCase of testCases) {
    const lowerStr = testCase.toLowerCase();
    const sortedBrands = [...brands].sort((a, b) => b.name.length - a.name.length);
    
    let matchedBrand = null;
    for (const brand of sortedBrands) {
      const brandName = brand.name.toLowerCase();
      const brandSpell = brand.spell?.toLowerCase();
      
      if (lowerStr.includes(brandName)) {
        matchedBrand = brand;
        break;
      }
      
      if (brandSpell && lowerStr.includes(brandSpell)) {
        matchedBrand = brand;
        break;
      }
    }
    
    console.log(`输入: "${testCase}"`);
    console.log(`匹配品牌: ${matchedBrand ? `"${matchedBrand.name}" (拼音: ${matchedBrand.spell || 'N/A'})` : 'null'}`);
    console.log('');
  }
}

checkBrandLibrary().catch(console.error);
