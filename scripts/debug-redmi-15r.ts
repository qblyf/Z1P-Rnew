/**
 * 调试红米 15R 匹配问题
 * 
 * 问题：红米 15R 5g 4+128星岩黑 没有匹配到任何 SPU
 */

// 模拟品牌匹配
function isBrandMatch(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false;
  if (brand1 === brand2) return true;
  if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
  
  // 模拟品牌库中的拼音匹配
  const brandMap: Record<string, string> = {
    '红米': 'redmi',
    'Redmi': 'redmi',
    'REDMI': 'redmi',
  };
  
  const spell1 = brandMap[brand1]?.toLowerCase();
  const spell2 = brandMap[brand2]?.toLowerCase();
  
  if (spell1 && spell2 && spell1 === spell2) return true;
  
  return false;
}

// 模拟型号提取
function extractModel(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  // 移除品牌
  let normalized = lowerStr.replace(/红米|redmi/gi, ' ').trim();
  
  // 简单型号提取
  const simplePattern = /\b([a-z]*)(\d+)([a-z]*)\b/gi;
  const matches = normalized.match(simplePattern);
  
  if (matches) {
    const filtered = matches.filter(m => {
      const lower = m.toLowerCase().trim();
      return !/^[345]g$/i.test(lower) && !lower.includes('gb');
    });
    
    if (filtered.length > 0) {
      return filtered[0].toLowerCase().replace(/\s+/g, '');
    }
  }
  
  return null;
}

console.log('=== 调试红米 15R 匹配问题 ===');
console.log('');

const input = '红米 15R 5g 4+128星岩黑';
const inputBrand = '红米';
const inputModel = extractModel(input);

console.log(`输入: "${input}"`);
console.log(`提取品牌: "${inputBrand}"`);
console.log(`提取型号: "${inputModel}"`);
console.log('');

// 模拟可能的 SPU 名称
const possibleSPUs = [
  'Redmi 15R 全网通5G 4GB+128GB 星岩黑',
  'Redmi 15 R 全网通5G 4GB+128GB 星岩黑',
  'Redmi Note 15R 全网通5G 4GB+128GB 星岩黑',
  'Redmi K80 全网通5G 4GB+128GB 星岩黑',
  'Redmi Note 14 全网通5G 4GB+128GB 星岩黑',
  '红米 15R 全网通5G 4GB+128GB 星岩黑',
  '红米15R 全网通5G 4GB+128GB 星岩黑',
];

console.log('=== 测试可能的 SPU 名称 ===');
console.log('');

possibleSPUs.forEach(spuName => {
  const spuBrand = spuName.includes('红米') ? '红米' : 'Redmi';
  const spuModel = extractModel(spuName);
  
  const brandMatch = isBrandMatch(inputBrand, spuBrand);
  const modelMatch = inputModel && spuModel && inputModel === spuModel;
  
  console.log(`SPU: "${spuName}"`);
  console.log(`  品牌: "${spuBrand}" - 匹配: ${brandMatch ? '✅' : '❌'}`);
  console.log(`  型号: "${spuModel}" - 匹配: ${modelMatch ? '✅' : '❌'}`);
  console.log(`  最终: ${brandMatch && modelMatch ? '✅ 应该匹配' : '❌ 不匹配'}`);
  console.log('');
});

console.log('=== 可能的原因 ===');
console.log('');
console.log('1. 数据库中没有 "红米 15R" 或 "Redmi 15R" 这个 SPU');
console.log('   - 检查：查询数据库中是否存在包含 "15R" 的红米产品');
console.log('   - 可能是：15 Pro、Note 15、K80 等其他型号');
console.log('');
console.log('2. SPU 名称格式不同');
console.log('   - 可能是："Redmi Note 15R"（带 Note）');
console.log('   - 可能是："Redmi 15 R"（有空格）');
console.log('   - 可能是："红米15R"（无空格）');
console.log('');
console.log('3. 型号提取问题');
console.log('   - 输入提取到："15r"');
console.log('   - SPU 可能是："note15r"、"15"、"k80" 等');
console.log('');
console.log('=== 建议 ===');
console.log('');
console.log('1. 检查数据库中红米品牌的所有 SPU 名称');
console.log('2. 确认 "红米 15R" 的正确产品名称');
console.log('3. 如果是 "Redmi Note 15R"，需要调整型号提取逻辑');
console.log('4. 如果数据库中没有这个产品，需要先添加 SPU');
