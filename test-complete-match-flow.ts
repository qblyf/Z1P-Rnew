// 完整模拟匹配流程

// 模拟动态型号索引
const modelIndex = new Set(['15r', 'k80pro', 'note13']);

function extractModelFromIndex(normalizedStr: string): string | null {
  const normalizedInput = normalizedStr.replace(/[\s\-_]/g, '').toLowerCase();
  
  for (const model of modelIndex) {
    const normalizedModel = model.replace(/[\s\-_]/g, '').toLowerCase();
    if (normalizedInput.includes(normalizedModel)) {
      console.log(`  [动态匹配] 从型号索引中找到: "${model}"`);
      return model;
    }
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

function extractModel(str: string): string | null {
  console.log(`extractModel 输入: "${str}"`);
  
  let lowerStr = str.toLowerCase();
  
  // 移除品牌
  let normalizedStr = lowerStr.replace(/红米/gi, ' ').replace(/redmi/gi, ' ').trim();
  console.log(`  移除品牌后: "${normalizedStr}"`);
  
  // 优先级0: 使用动态型号索引
  const dynamicModel = extractModelFromIndex(normalizedStr);
  if (dynamicModel) {
    return dynamicModel;
  }
  
  // 优先级4: 简单型号
  const simpleModel = extractSimpleModel(normalizedStr);
  if (simpleModel) {
    console.log(`  [简单匹配] 提取型号: "${simpleModel}"`);
    return simpleModel;
  }
  
  console.log(`  ✗ 型号提取失败`);
  return null;
}

function extractSPUPart(str: string): string {
  const memoryPattern = /(.+?)\s*\(?\d+\s*(?:gb)?\s*\+\s*\d+\s*(?:gb)?\)?/i;
  const memoryMatch = str.match(memoryPattern);
  if (memoryMatch) {
    return memoryMatch[1].trim();
  }
  return str;
}

console.log('=== 测试输入型号提取 ===\n');
const input = '红米15R 4+128星岩黑';
const inputSPUPart = extractSPUPart(input);
console.log(`输入SPU部分: "${inputSPUPart}"`);
const inputModel = extractModel(inputSPUPart);
console.log(`输入型号: ${inputModel ? `"${inputModel}"` : 'null'}\n`);

console.log('=== 测试SPU型号提取 ===\n');
const spuName = '红米 15R';
const spuSPUPart = extractSPUPart(spuName);
console.log(`SPU部分: "${spuSPUPart}"`);
const spuModel = extractModel(spuSPUPart);
console.log(`SPU型号: ${spuModel ? `"${spuModel}"` : 'null'}\n`);

console.log('=== 比较结果 ===');
console.log(`输入型号: "${inputModel}"`);
console.log(`SPU型号: "${spuModel}"`);
console.log(`是否匹配: ${inputModel === spuModel ? '✓ 是' : '✗ 否'}`);
