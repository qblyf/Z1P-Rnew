/**
 * 测试型号提取修复
 */

function preprocessModelString(lowerStr: string, brands: string[]): string {
  let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
  
  for (const brand of brands) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
    const brandRegex = hasChinese 
      ? new RegExp(brand, 'gi')
      : new RegExp(`\\b${brand}\\b`, 'gi');
    
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
  }
  
  return normalizedStr.replace(/\s+/g, ' ').trim();
}

function normalizeModel(model: string): string {
  if (!model) return model;
  
  let normalized = model.toLowerCase();
  
  const suffixKeywords = [
    'pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite',
    'note', 'turbo', 'fold', 'flip', 'find', 'reno'
  ];
  
  suffixKeywords.forEach(keyword => {
    const regex = new RegExp(`(?<!\\s)${keyword}`, 'gi');
    normalized = normalized.replace(regex, ` ${keyword}`);
  });
  
  normalized = normalized.replace(/(\d)([a-z])/gi, '$1 $2');
  normalized = normalized.replace(/([a-z])(\d)/gi, '$1 $2');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

function extractSimpleModel(normalizedStr: string): string | null {
  const simpleModelPattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
  const simpleMatches = normalizedStr.match(simpleModelPattern);
  
  if (!simpleMatches || simpleMatches.length === 0) {
    return null;
  }
  
  const filtered = simpleMatches.filter(m => {
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

function extractModelFixed(str: string, brands: string[]): string | null {
  const lowerStr = str.toLowerCase();
  const normalizedStr = preprocessModelString(lowerStr, brands);
  
  // ✅ 修复：先提取简单型号（在 normalizeModel 之前）
  const simpleModelBeforeNormalize = extractSimpleModel(normalizedStr);
  
  // 应用标准化
  const normalizedStrAfter = normalizeModel(normalizedStr);
  
  // 优先使用标准化前的结果
  if (simpleModelBeforeNormalize) return simpleModelBeforeNormalize;
  
  // 降级：尝试从标准化后的字符串提取
  const simpleModel = extractSimpleModel(normalizedStrAfter);
  if (simpleModel) return simpleModel;
  
  return null;
}

function extractModelOld(str: string, brands: string[]): string | null {
  const lowerStr = str.toLowerCase();
  let normalizedStr = preprocessModelString(lowerStr, brands);
  
  // ❌ 问题：先标准化，导致 "y50" 变成 "y 50"
  normalizedStr = normalizeModel(normalizedStr);
  
  const simpleModel = extractSimpleModel(normalizedStr);
  if (simpleModel) return simpleModel;
  
  return null;
}

console.log('=== 测试型号提取修复 ===');
console.log('');

const testCases = [
  { input: 'Vivo Y50 5G(8+256)白金', expected: 'y50' },
  { input: 'vivo Y50 全网通5G 8GB+256GB 白金', expected: 'y50' },
  { input: 'iPhone 14 Pro Max', expected: '14' },
  { input: 'Xiaomi 14 Pro', expected: '14' },
  { input: 'OPPO Find X5 Pro', expected: 'findx5' },
  { input: 'Huawei P50 Pro', expected: 'p50' },
];

const brands = ['vivo', 'iphone', 'xiaomi', 'oppo', 'huawei'];

console.log('修复前（先标准化）：');
testCases.forEach(({ input, expected }) => {
  const result = extractModelOld(input, brands);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} "${input}" → "${result}" (期望: "${expected}")`);
});

console.log('');
console.log('修复后（先提取简单型号）：');
testCases.forEach(({ input, expected }) => {
  const result = extractModelFixed(input, brands);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} "${input}" → "${result}" (期望: "${expected}")`);
});

console.log('');
console.log('=== 修复说明 ===');
console.log('');
console.log('问题：normalizeModel 会在字母和数字之间添加空格');
console.log('  - "y50" → "y 50"');
console.log('  - 导致简单型号正则无法匹配完整的 "y50"');
console.log('');
console.log('解决方案：在 normalizeModel 之前先提取简单型号');
console.log('  1. 预处理（移除括号和品牌）');
console.log('  2. 提取简单型号（此时 "y50" 还是连续的）✅');
console.log('  3. 应用 normalizeModel（用于复杂型号匹配）');
console.log('  4. 如果步骤2成功，直接返回结果');
console.log('  5. 否则，尝试从标准化后的字符串提取');
