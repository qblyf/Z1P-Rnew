/**
 * 调试红米 15R 匹配问题
 */

// 模拟一些红米 SPU
const testSPUs = [
  { id: 1, name: '红米 15R 全网通5G版 4GB+128GB 星岩黑', brand: '红米' },
  { id: 2, name: '红米 15R', brand: '红米' },
  { id: 3, name: '红米 K80 Pro', brand: '红米' },
  { id: 4, name: '红米 Note 13', brand: '红米' },
];

const input = '红米15R 4+128星岩黑';
const inputBrand = '红米';
const inputModel = '15r';

console.log('=== 调试红米 15R 匹配 ===\n');
console.log(`输入: "${input}"`);
console.log(`输入品牌: "${inputBrand}"`);
console.log(`输入型号: "${inputModel}"`);
console.log();

// 标准化函数
function normalizeForComparison(model: string): string {
  return model.toLowerCase().replace(/[\s\-_]/g, '');
}

// 品牌匹配函数
function isBrandMatch(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false;
  if (brand1 === brand2) return true;
  if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
  return false;
}

// 模拟型号提取（完整版）
function extractModel(spuName: string, brand: string): string | null {
  let normalized = spuName.toLowerCase();
  normalized = normalized.replace(brand.toLowerCase(), '').trim();
  
  // 移除网络制式
  normalized = normalized.replace(/全网通\s*5g(?:版)?/gi, '').trim();
  normalized = normalized.replace(/(?:5g|4g|3g)(?:版)?/gi, '').trim();
  
  // 移除容量
  normalized = normalized.replace(/\d+gb\s*\+\s*\d+gb/gi, '').trim();
  
  // 移除颜色（简化）
  normalized = normalized.replace(/[\u4e00-\u9fa5]{2,4}$/g, '').trim();
  
  console.log(`    处理后: "${normalized}"`);
  
  // 提取型号（完整正则）
  const simplePattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
  const matches = normalized.match(simplePattern);
  
  console.log(`    匹配结果: ${matches ? JSON.stringify(matches) : 'null'}`);
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // 过滤和排序
  const filtered = matches.filter(m => {
    const lower = m.toLowerCase().trim();
    return !/^[345]g$/i.test(lower) && 
           !lower.includes('gb') && 
           !/^\d+g$/i.test(lower) &&
           !/^\d+\+\d+$/i.test(lower);
  });
  
  if (filtered.length === 0) {
    return null;
  }
  
  const sorted = filtered.sort((a, b) => {
    const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
    const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
    if (aHasSuffix && !bHasSuffix) return -1;
    if (!aHasSuffix && bHasSuffix) return 1;
    return b.length - a.length;
  });
  
  return sorted[0].toLowerCase().trim().replace(/\s+/g, '');
}

console.log('检查每个 SPU:\n');

testSPUs.forEach(spu => {
  console.log(`SPU: "${spu.name}"`);
  console.log(`  品牌: "${spu.brand}"`);
  
  const spuModel = extractModel(spu.name, spu.brand);
  console.log(`  提取型号: ${spuModel ? `"${spuModel}"` : 'null'}`);
  
  const brandMatch = isBrandMatch(inputBrand, spu.brand);
  console.log(`  品牌匹配: ${brandMatch}`);
  
  if (spuModel) {
    const inputModelNorm = normalizeForComparison(inputModel);
    const spuModelNorm = normalizeForComparison(spuModel);
    const modelMatch = inputModelNorm === spuModelNorm;
    
    console.log(`  型号匹配: ${modelMatch} (输入:"${inputModelNorm}" vs SPU:"${spuModelNorm}")`);
    
    if (brandMatch && modelMatch) {
      console.log(`  ✓ 匹配成功！`);
    } else {
      console.log(`  ✗ 匹配失败`);
    }
  } else {
    console.log(`  ✗ 型号提取失败，无法匹配`);
  }
  
  console.log();
});
