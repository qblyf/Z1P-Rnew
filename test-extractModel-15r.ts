// 测试 extractModel 对"15R"的处理

function extractSimpleModel(normalizedStr: string): string | null {
  console.log(`  extractSimpleModel 输入: "${normalizedStr}"`);
  
  const simpleModelPattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
  const simpleMatches = normalizedStr.match(simpleModelPattern);
  
  console.log(`  匹配结果: ${simpleMatches ? JSON.stringify(simpleMatches) : 'null'}`);
  
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
  
  console.log(`  过滤后: ${filtered.length > 0 ? JSON.stringify(filtered) : 'null'}`);
  
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
  
  const result = sorted[0].toLowerCase().trim().replace(/\s+/g, '');
  console.log(`  最终结果: "${result}"`);
  return result;
}

function preprocessModelString(lowerStr: string): string {
  // 简化版：只移除品牌
  let normalizedStr = lowerStr.replace(/红米/gi, ' ').replace(/redmi/gi, ' ');
  return normalizedStr.replace(/\s+/g, ' ').trim();
}

function extractModel(str: string): string | null {
  console.log(`extractModel 输入: "${str}"`);
  
  let lowerStr = str.toLowerCase();
  console.log(`  转小写: "${lowerStr}"`);
  
  let normalizedStr = preprocessModelString(lowerStr);
  console.log(`  预处理后: "${normalizedStr}"`);
  
  // 尝试提取简单型号
  const simpleModel = extractSimpleModel(normalizedStr);
  
  return simpleModel;
}

console.log('=== 测试1: "红米 15R" ===');
const result1 = extractModel('红米 15R');
console.log(`结果: ${result1 ? `"${result1}"` : 'null'}\n`);

console.log('=== 测试2: "15R" ===');
const result2 = extractModel('15R');
console.log(`结果: ${result2 ? `"${result2}"` : 'null'}\n`);

console.log('=== 测试3: " 15R" (前面有空格) ===');
const result3 = extractModel(' 15R');
console.log(`结果: ${result3 ? `"${result3}"` : 'null'}\n`);
