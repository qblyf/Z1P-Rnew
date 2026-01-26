// 测试输入和SPU的型号提取是否一致

// 模拟 extractSPUPart 函数
function extractSPUPart(str: string): string {
  // 规则1: 优先检查 "全网通5G"
  const fullNetworkFiveGPattern = /(.+?)\s*全网通\s*5g(?:版)?\b/i;
  const fullNetworkFiveGMatch = str.match(fullNetworkFiveGPattern);
  if (fullNetworkFiveGMatch) {
    return fullNetworkFiveGMatch[1].trim();
  }
  
  // 规则2: 检查网络制式
  const networkPattern = /(.+?)\s*(?:5g|4g|3g|2g)(?:版)?\b/i;
  const networkMatch = str.match(networkPattern);
  if (networkMatch) {
    return networkMatch[1].trim();
  }
  
  // 规则3: 如果找到容量
  const memoryPattern = /(.+?)\s*\(?\d+\s*(?:gb)?\s*\+\s*\d+\s*(?:gb)?\)?/i;
  const memoryMatch = str.match(memoryPattern);
  if (memoryMatch) {
    return memoryMatch[1].trim();
  }
  
  return str;
}

// 模拟简单的 extractModel
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

console.log('=== 测试输入型号提取 ===\n');

const input = '红米15R 4+128星岩黑';
console.log(`输入: "${input}"`);

const inputSPUPart = extractSPUPart(input);
console.log(`SPU部分: "${inputSPUPart}"`);

// 移除品牌
const inputWithoutBrand = inputSPUPart.replace(/红米/gi, '').trim();
console.log(`移除品牌后: "${inputWithoutBrand}"`);

const inputModel = extractSimpleModel(inputWithoutBrand);
console.log(`提取型号: "${inputModel}"`);

console.log('\n=== 测试SPU型号提取 ===\n');

const spuName = '红米 15R';
console.log(`SPU名称: "${spuName}"`);

const spuSPUPart = extractSPUPart(spuName);
console.log(`SPU部分: "${spuSPUPart}"`);

// 移除品牌
const spuWithoutBrand = spuSPUPart.replace(/红米/gi, '').trim();
console.log(`移除品牌后: "${spuWithoutBrand}"`);

const spuModel = extractSimpleModel(spuWithoutBrand);
console.log(`提取型号: "${spuModel}"`);

console.log('\n=== 比较结果 ===\n');
console.log(`输入型号: "${inputModel}"`);
console.log(`SPU型号: "${spuModel}"`);
console.log(`是否匹配: ${inputModel === spuModel ? '✓ 是' : '✗ 否'}`);
