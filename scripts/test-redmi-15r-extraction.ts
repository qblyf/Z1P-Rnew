/**
 * 测试红米 15R 的型号提取
 */

// 模拟动态型号索引
const modelIndex = new Set(['15r', 'k80pro']);

// 模拟 extractModelFromIndex
function extractModelFromIndex(normalizedStr: string, brand?: string | null): string | null {
  const normalizedInput = normalizedStr.replace(/[\s\-_]/g, '').toLowerCase();
  
  for (const model of modelIndex) {
    const normalizedModel = model.replace(/[\s\-_]/g, '').toLowerCase();
    
    if (normalizedInput.includes(normalizedModel)) {
      const completeness = normalizedModel.length / normalizedInput.length;
      if (completeness >= 0.5) {
        return model;
      }
    }
  }
  
  return null;
}

// 模拟 extractSimpleModel
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

// 模拟 extractModel 函数
function extractModel(str: string, brand?: string | null): string | null {
  let lowerStr = str.toLowerCase();
  
  // 预处理：移除品牌
  let normalizedStr = lowerStr;
  if (brand) {
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
    const brandRegex = hasChinese 
      ? new RegExp(escapedBrand, 'gi')
      : new RegExp(`\\b${escapedBrand}\\b`, 'gi');
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
  }
  normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
  
  console.log(`  移除品牌后: "${normalizedStr}"`);
  
  // 优先级0: 动态型号索引
  const dynamicModel = extractModelFromIndex(normalizedStr, brand);
  if (dynamicModel) {
    console.log(`  [动态匹配] 找到: "${dynamicModel}"`);
    return dynamicModel;
  }
  
  // 优先级4: 简单型号（标准化前）
  const simpleModelBefore = extractSimpleModel(normalizedStr);
  console.log(`  简单型号（标准化前）: ${simpleModelBefore || 'null'}`);
  
  // 应用标准化
  normalizedStr = normalizeModel(normalizedStr);
  console.log(`  标准化后: "${normalizedStr}"`);
  
  // 简单型号（标准化后）
  const simpleModelAfter = extractSimpleModel(normalizedStr);
  console.log(`  简单型号（标准化后）: ${simpleModelAfter || 'null'}`);
  
  if (simpleModelBefore) return simpleModelBefore;
  if (simpleModelAfter) return simpleModelAfter;
  
  return null;
}

function normalizeModel(model: string): string {
  if (!model) return model;
  
  let normalized = model.toLowerCase();
  
  // 在常见后缀关键词前添加空格
  const suffixKeywords = [
    'pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite',
    'note', 'turbo', 'fold', 'flip', 'find', 'reno'
  ];
  
  suffixKeywords.forEach(keyword => {
    const regex = new RegExp(`(?<!\\s)${keyword}`, 'gi');
    normalized = normalized.replace(regex, ` ${keyword}`);
  });
  
  // 在数字和字母之间添加空格
  normalized = normalized.replace(/(\d)([a-z])/gi, '$1 $2');
  normalized = normalized.replace(/([a-z])(\d)/gi, '$1 $2');
  
  // 清理多余空格
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

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

console.log('=== 测试红米 15R 型号提取 ===\n');

const testCases = [
  {
    name: '输入',
    input: '红米15R 4+128星岩黑',
    brand: '红米',
  },
  {
    name: 'SPU名称',
    input: '红米 15R 全网通5G版 4GB+128GB 星岩黑',
    brand: '红米',
  },
];

testCases.forEach(({ name, input, brand }) => {
  console.log(`${name}: "${input}"`);
  console.log(`品牌: "${brand}"`);
  
  const spuPart = extractSPUPart(input);
  console.log(`SPU部分: "${spuPart}"`);
  
  const model = extractModel(spuPart, brand);
  console.log(`最终型号: "${model}"`);
  console.log();
});
