/**
 * 测试版本提取问题
 * 
 * 问题：Vivo S30 Pro mini 5G 中的 "Pro" 被识别为版本，而不是型号的一部分
 */

interface VersionInfo {
  id: string;
  name: string;
  keywords: string[];
  priority: number;
}

const versionKeywords: VersionInfo[] = [
  { id: "standard", name: "标准版", keywords: ["标准版", "基础版"], priority: 1 },
  { id: "lite", name: "活力版", keywords: ["活力版", "轻享版"], priority: 2 },
  { id: "enjoy", name: "优享版", keywords: ["优享版", "享受版"], priority: 3 },
  { id: "premium", name: "尊享版", keywords: ["尊享版", "高端版"], priority: 4 },
  { id: "pro", name: "Pro 版", keywords: ["pro", "pro版"], priority: 5 }
];

const networkVersions = [
  "蓝牙版", "eSIM版", "esim版", "5G版", "4G版", "3G版", "全网通版", "5G", "4G", "3G"
];

function extractVersionOld(input: string): VersionInfo | null {
  const lowerInput = input.toLowerCase();
  
  for (const versionInfo of versionKeywords) {
    for (const keyword of versionInfo.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return versionInfo;
      }
    }
  }
  
  return null;
}

function extractNetworkVersion(input: string): string | null {
  const lowerInput = input.toLowerCase();
  
  // 按长度降序排序，优先匹配更长的版本（如 "全网通5G" 优先于 "5G"）
  const sorted = [...networkVersions].sort((a, b) => b.length - a.length);
  
  for (const version of sorted) {
    if (lowerInput.includes(version.toLowerCase())) {
      return version;
    }
  }
  
  return null;
}

function extractVersionFixed(input: string): { type: 'product' | 'network' | null, value: string | null } {
  const lowerInput = input.toLowerCase();
  
  // 优先检查网络制式版本
  const networkVersion = extractNetworkVersion(input);
  if (networkVersion) {
    return { type: 'network', value: networkVersion };
  }
  
  // 检查产品版本（标准版、活力版等）
  // 但要排除型号中的 "pro"（如 "Pro mini", "Pro Max"）
  for (const versionInfo of versionKeywords) {
    for (const keyword of versionInfo.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      
      // 特殊处理：如果是 "pro"，检查是否是型号的一部分
      if (lowerKeyword === 'pro' || lowerKeyword === 'pro版') {
        // 检查 "pro" 后面是否跟着型号后缀（mini, max, plus, ultra 等）
        const proPattern = /\bpro\s*(mini|max|plus|ultra|air|lite|se)\b/i;
        if (proPattern.test(input)) {
          // "pro" 是型号的一部分，跳过
          continue;
        }
      }
      
      if (lowerInput.includes(lowerKeyword)) {
        return { type: 'product', value: versionInfo.name };
      }
    }
  }
  
  return { type: null, value: null };
}

console.log('=== 测试版本提取问题 ===');
console.log('');

const testCases = [
  {
    input: 'Vivo S30 Pro mini 5G 12+512 可可黑',
    sku: 'vivo S30 Pro mini 全网通5G 12GB+512GB 可可黑',
    expectedInput: { type: 'network', value: '5G' },
    expectedSKU: { type: 'network', value: '全网通5G' },
  },
  {
    input: 'iPhone 14 Pro Max',
    sku: 'iPhone 14 Pro Max 全网通5G',
    expectedInput: { type: null, value: null },
    expectedSKU: { type: 'network', value: '全网通5G' },
  },
  {
    input: 'Xiaomi 14 Pro 标准版',
    sku: 'Xiaomi 14 Pro 标准版 5G',
    expectedInput: { type: 'product', value: '标准版' },
    expectedSKU: { type: 'network', value: '5G' },
  },
  {
    input: 'Huawei Watch GT Pro 蓝牙版',
    sku: 'Huawei Watch GT Pro 蓝牙版',
    expectedInput: { type: 'network', value: '蓝牙版' },
    expectedSKU: { type: 'network', value: '蓝牙版' },
  },
];

console.log('修复前（旧逻辑）：');
testCases.forEach(({ input, sku, expectedInput, expectedSKU }) => {
  const inputVersion = extractVersionOld(input);
  const skuVersion = extractVersionOld(sku);
  
  console.log(`输入: "${input}"`);
  console.log(`  提取版本: ${inputVersion ? `"${inputVersion.name}"` : 'null'} ${inputVersion?.name === expectedInput.value ? '✅' : '❌'}`);
  console.log(`SKU: "${sku}"`);
  console.log(`  提取版本: ${skuVersion ? `"${skuVersion.name}"` : 'null'} ${skuVersion?.name === expectedSKU.value ? '✅' : '❌'}`);
  console.log('');
});

console.log('修复后（新逻辑）：');
testCases.forEach(({ input, sku, expectedInput, expectedSKU }) => {
  const inputVersion = extractVersionFixed(input);
  const skuVersion = extractVersionFixed(sku);
  
  console.log(`输入: "${input}"`);
  console.log(`  提取版本: ${inputVersion.value ? `"${inputVersion.value}" (${inputVersion.type})` : 'null'} ${inputVersion.value === expectedInput.value ? '✅' : '❌'}`);
  console.log(`SKU: "${sku}"`);
  console.log(`  提取版本: ${skuVersion.value ? `"${skuVersion.value}" (${skuVersion.type})` : 'null'} ${skuVersion.value === expectedSKU.value ? '✅' : '❌'}`);
  console.log('');
});

console.log('=== 问题分析 ===');
console.log('');
console.log('问题1: "Pro" 被误识别为版本');
console.log('  - "S30 Pro mini" 中的 "Pro" 是型号的一部分，不是版本');
console.log('  - 但版本关键词配置中包含 "pro"，导致误匹配');
console.log('');
console.log('问题2: 网络制式版本优先级低');
console.log('  - "5G" 和 "全网通5G" 是网络制式版本');
console.log('  - 应该优先识别网络制式版本，而不是产品版本');
console.log('');
console.log('解决方案：');
console.log('1. 优先提取网络制式版本（5G、4G、蓝牙版等）');
console.log('2. 对于 "pro" 关键词，检查是否是型号的一部分');
console.log('   - 如果 "pro" 后面跟着 mini/max/plus/ultra 等，则是型号');
console.log('   - 否则才是版本');
console.log('3. 区分产品版本（标准版、活力版）和网络制式版本（5G、蓝牙版）');
