/**
 * 测试 Fold 型号提取问题
 * 
 * 问题：X FOLD5 被提取为 xfold 而不是 xfold5
 */

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

function extractWordModel(normalizedStr: string): string | null {
  const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)\b/gi;
  const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
  
  const wordMatches2 = normalizedStr.match(wordModelPattern2);
  const wordMatches1 = normalizedStr.match(wordModelPattern1);
  const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
  
  if (wordMatches && wordMatches.length > 0) {
    return wordMatches[0].toLowerCase().replace(/\s+/g, '');
  }
  
  return null;
}

function extractComplexModel(normalizedStr: string): string | null {
  const complexModelPattern = /\b([a-z]*)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note|turbo|r)(\+)?(\s+(mini|max|plus|ultra|pro))?\b/gi;
  const complexMatches = normalizedStr.match(complexModelPattern);
  
  if (!complexMatches || complexMatches.length === 0) {
    return null;
  }
  
  const filtered = complexMatches.filter(m => {
    const lower = m.toLowerCase();
    return !lower.includes('gb') && !/\d+g$/i.test(lower);
  });
  
  if (filtered.length > 0) {
    return filtered.sort((a, b) => b.length - a.length)[0].toLowerCase().replace(/\s+/g, '');
  }
  
  return null;
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

console.log('=== 测试 Fold 型号提取 ===');
console.log('');

const testCases = [
  { input: 'Vivo X FOLD5 5G 16+1T 青松', expected: 'xfold5' },
  { input: 'vivo X Fold 3 保护膜', expected: 'xfold3' },
  { input: 'vivo X Fold3 Pro', expected: 'xfold3' },
  { input: 'Samsung Galaxy Z Fold5', expected: 'zfold5' },
];

const brands = ['vivo', 'samsung', 'galaxy'];

testCases.forEach(({ input, expected }) => {
  console.log(`输入: "${input}"`);
  
  const lowerStr = input.toLowerCase();
  const preprocessed = preprocessModelString(lowerStr, brands);
  console.log(`  预处理: "${preprocessed}"`);
  
  // 在标准化前提取简单型号
  const simpleBeforeNormalize = extractSimpleModel(preprocessed);
  console.log(`  简单型号（标准化前）: ${simpleBeforeNormalize || 'null'}`);
  
  const normalized = normalizeModel(preprocessed);
  console.log(`  标准化: "${normalized}"`);
  
  const wordModel = extractWordModel(normalized);
  console.log(`  字母+字母: ${wordModel || 'null'}`);
  
  const complexModel = extractComplexModel(normalized);
  console.log(`  复杂型号: ${complexModel || 'null'}`);
  
  const simpleAfterNormalize = extractSimpleModel(normalized);
  console.log(`  简单型号（标准化后）: ${simpleAfterNormalize || 'null'}`);
  
  // 按优先级选择
  let finalModel = wordModel || complexModel || simpleBeforeNormalize || simpleAfterNormalize;
  
  const status = finalModel === expected ? '✅' : '❌';
  console.log(`  最终结果: "${finalModel}" (期望: "${expected}") ${status}`);
  console.log('');
});

console.log('=== 问题分析 ===');
console.log('');
console.log('问题：X FOLD5 被提取为 xfold 而不是 xfold5');
console.log('');
console.log('原因分析：');
console.log('1. 预处理后：x fold5 5g 青松');
console.log('2. 标准化：x fold 5 5 g 青松');
console.log('   - "fold" 是关键词，前面加空格：x fold');
console.log('   - 字母数字间加空格：fold5 → fold 5');
console.log('3. 字母+字母匹配：');
console.log('   - wordModelPattern2: /\\b([a-z])\\s+(note|fold|flip|pad)\\b/gi');
console.log('   - 匹配到 "x fold"，返回 "xfold" ❌');
console.log('   - 丢失了数字 "5"');
console.log('');
console.log('解决方案：');
console.log('1. 在 wordModelPattern2 中添加可选的数字部分');
console.log('2. 或者在标准化时，特殊处理 fold/flip 等关键词');
console.log('3. 或者调整匹配优先级，优先使用简单型号提取');
