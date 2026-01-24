/**
 * 测试版本提取修复
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
  "全网通5G", "全网通版", "蓝牙版", "eSIM版", "esim版", 
  "5G版", "4G版", "3G版", "5G", "4G", "3G"
];

function extractVersionFixed(input: string): VersionInfo | null {
  const lowerInput = input.toLowerCase();
  
  // 优先检查网络制式版本
  const sortedNetworkVersions = [...networkVersions].sort((a, b) => b.length - a.length);
  
  for (const networkVersion of sortedNetworkVersions) {
    if (lowerInput.includes(networkVersion.toLowerCase())) {
      return {
        id: `network-${networkVersion.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        name: networkVersion,
        keywords: [networkVersion],
        priority: 10,
      };
    }
  }
  
  // 检查产品版本
  for (const versionInfo of versionKeywords) {
    for (const keyword of versionInfo.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      
      // 特殊处理：如果是 "pro"，检查是否是型号的一部分
      if (lowerKeyword === 'pro' || lowerKeyword === 'pro版') {
        const proPattern = /\bpro\s*(mini|max|plus|ultra|air|lite|se)\b/i;
        if (proPattern.test(input)) {
          continue;
        }
      }
      
      if (lowerInput.includes(lowerKeyword)) {
        return versionInfo;
      }
    }
  }
  
  return null;
}

console.log('=== 测试版本提取修复 ===');
console.log('');

const testCases = [
  {
    name: '问题案例：S30 Pro mini',
    input: 'Vivo S30 Pro mini 5G 12+512 可可黑',
    sku: 'vivo S30 Pro mini 全网通5G 12GB+512GB 可可黑',
    expectedInput: '5G',
    expectedSKU: '全网通5G',
  },
  {
    name: 'iPhone Pro Max',
    input: 'iPhone 14 Pro Max',
    sku: 'iPhone 14 Pro Max 全网通5G',
    expectedInput: null,
    expectedSKU: '全网通5G',
  },
  {
    name: '标准版 + 5G',
    input: 'Xiaomi 14 Pro 标准版',
    sku: 'Xiaomi 14 Pro 标准版 5G',
    expectedInput: '标准版',
    expectedSKU: '5G',
  },
  {
    name: 'Watch GT Pro 蓝牙版',
    input: 'Huawei Watch GT Pro 蓝牙版',
    sku: 'Huawei Watch GT Pro 蓝牙版',
    expectedInput: '蓝牙版',
    expectedSKU: '蓝牙版',
  },
  {
    name: 'Pro 版（真正的版本）',
    input: 'Xiaomi Pad 6 Pro 版',
    sku: 'Xiaomi Pad 6 Pro 版 5G',
    expectedInput: 'Pro 版',
    expectedSKU: '5G',
  },
];

testCases.forEach(({ name, input, sku, expectedInput, expectedSKU }) => {
  const inputVersion = extractVersionFixed(input);
  const skuVersion = extractVersionFixed(sku);
  
  const inputMatch = inputVersion?.name === expectedInput || (inputVersion === null && expectedInput === null);
  const skuMatch = skuVersion?.name === expectedSKU || (skuVersion === null && expectedSKU === null);
  
  console.log(`测试: ${name}`);
  console.log(`  输入: "${input}"`);
  console.log(`    提取版本: ${inputVersion ? `"${inputVersion.name}"` : 'null'}`);
  console.log(`    期望版本: ${expectedInput ? `"${expectedInput}"` : 'null'}`);
  console.log(`    结果: ${inputMatch ? '✅' : '❌'}`);
  console.log(`  SKU: "${sku}"`);
  console.log(`    提取版本: ${skuVersion ? `"${skuVersion.name}"` : 'null'}`);
  console.log(`    期望版本: ${expectedSKU ? `"${expectedSKU}"` : 'null'}`);
  console.log(`    结果: ${skuMatch ? '✅' : '❌'}`);
  console.log('');
});

console.log('=== 修复说明 ===');
console.log('');
console.log('修复1: 优先识别网络制式版本');
console.log('  - 先检查 5G、4G、蓝牙版等网络制式');
console.log('  - 再检查标准版、活力版等产品版本');
console.log('  - 按长度降序排序，优先匹配 "全网通5G" 而不是 "5G"');
console.log('');
console.log('修复2: 避免将型号中的 Pro 误识别为版本');
console.log('  - 检查 "pro" 后面是否跟着 mini/max/plus/ultra 等');
console.log('  - 如果是，则认为 "pro" 是型号的一部分');
console.log('  - 例如：');
console.log('    * "S30 Pro mini" → Pro 是型号，不是版本');
console.log('    * "Pad 6 Pro 版" → Pro 版是真正的版本');
console.log('');
console.log('修复3: 网络版本配置更新');
console.log('  - 添加单独的 "5G"、"4G"、"3G"');
console.log('  - 添加 "全网通5G"、"全网通版"');
console.log('  - 按长度降序排序，确保优先匹配更具体的版本');
