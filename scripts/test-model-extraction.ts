/**
 * 测试型号提取问题
 * 
 * 问题：从 "Vivo Y50 5G(8+256)白金" 提取到 "50" 而不是 "y50"
 */

// 模拟型号提取的各个阶段

function preprocessModelString(lowerStr: string, brands: string[]): string {
  // 移除括号内容
  let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
  
  // 移除品牌
  for (const brand of brands) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
    const brandRegex = hasChinese 
      ? new RegExp(brand, 'gi')
      : new RegExp(`\\b${brand}\\b`, 'gi');
    
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
  }
  
  return normalizedStr.replace(/\s+/g, ' ').trim();
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

console.log('=== 测试型号提取：Vivo Y50 5G(8+256)白金 ===');
console.log('');

const input = 'Vivo Y50 5G(8+256)白金';
const lowerInput = input.toLowerCase();
const brands = ['vivo'];

console.log('步骤 1: 原始输入');
console.log(`  "${input}"`);
console.log('');

console.log('步骤 2: 转小写');
console.log(`  "${lowerInput}"`);
console.log('');

console.log('步骤 3: 预处理（移除括号和品牌）');
const preprocessed = preprocessModelString(lowerInput, brands);
console.log(`  "${preprocessed}"`);
console.log('');

console.log('步骤 4: 尝试提取复杂型号');
const complexModel = extractComplexModel(preprocessed);
console.log(`  结果: ${complexModel || 'null'}`);
console.log('');

console.log('步骤 5: 尝试提取简单型号');
const simpleModel = extractSimpleModel(preprocessed);
console.log(`  结果: ${simpleModel || 'null'}`);
console.log('');

console.log('=== 问题分析 ===');
console.log('');
console.log('问题：预处理后的字符串是 "y50 5g 白金"');
console.log('');
console.log('复杂型号正则：/\\b([a-z]*)\\s*(\\d+)\\s*(pro|max|plus|...)\\b/gi');
console.log('  - 需要匹配 "字母 + 数字 + 关键词(pro/max/...)"');
console.log('  - "y50" 后面没有 pro/max 等关键词，所以不匹配 ❌');
console.log('');
console.log('简单型号正则：/(?:\\b([a-z]+)(\\d+)([a-z]*)\\b|...)/gi');
console.log('  - 第一部分：\\b([a-z]+)(\\d+)([a-z]*)\\b');
console.log('  - 应该能匹配 "y50"');
console.log('  - 让我们测试一下...');
console.log('');

// 详细测试简单型号正则
const testStr = 'y50 5g 白金';
const simplePattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
const matches = testStr.match(simplePattern);

console.log(`测试字符串: "${testStr}"`);
console.log(`匹配结果: ${JSON.stringify(matches)}`);
console.log('');

if (matches) {
  console.log('匹配详情：');
  matches.forEach((match, index) => {
    console.log(`  [${index}] "${match}"`);
  });
  console.log('');
  
  // 过滤
  const filtered = matches.filter(m => {
    const lower = m.toLowerCase().trim();
    return !/^[345]g$/i.test(lower) && 
           !lower.includes('gb') && 
           !/^\d+g$/i.test(lower) &&
           !/^\d+\+\d+$/i.test(lower);
  });
  
  console.log('过滤后（移除 5g）：');
  filtered.forEach((match, index) => {
    console.log(`  [${index}] "${match}"`);
  });
  console.log('');
  
  // 排序
  const sorted = filtered.sort((a, b) => {
    const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
    const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
    if (aHasSuffix && !bHasSuffix) return -1;
    if (!aHasSuffix && bHasSuffix) return 1;
    return b.length - a.length;
  });
  
  console.log('排序后（按长度降序）：');
  sorted.forEach((match, index) => {
    console.log(`  [${index}] "${match}" (长度: ${match.length})`);
  });
  console.log('');
  
  console.log(`最终选择: "${sorted[0]}"`);
}

console.log('');
console.log('=== 根本原因 ===');
console.log('');
console.log('简单型号正则的第三部分：(?:^|\\s)(\\d{2,3})(?:\\s|$)');
console.log('  - 这部分匹配 "空格或开头 + 2-3位数字 + 空格或结尾"');
console.log('  - 在 "y50 5g" 中，"50" 被这部分匹配到了！');
console.log('  - 而且 "50" 的长度是 2，"y50" 的长度是 3');
console.log('  - 排序时按长度降序，"y50" 应该排在前面');
console.log('');
console.log('⚠️  可能的问题：');
console.log('1. 正则匹配时，"50" 和 "y50" 都被匹配到');
console.log('2. 但是 "50" 可能因为某种原因被优先选择');
console.log('3. 或者 "y50" 没有被正确匹配');
