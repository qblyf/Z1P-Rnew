/**
 * 测试 SPU 部分提取
 * 验证是否正确移除 SKU 级别的属性（版本、内存、颜色）
 */

function extractSPUPart(str: string): string {
  // 规则1: 优先检查 "全网通5G"
  const fullNetworkFiveGPattern = /(.+?)\s*全网通\s*5g(?:版)?\b/i;
  const fullNetworkFiveGMatch = str.match(fullNetworkFiveGPattern);
  if (fullNetworkFiveGMatch) {
    return fullNetworkFiveGMatch[1].trim();
  }
  
  // 规则2: 检查网络制式（5G、4G、3G 等）
  // 这些都是 SKU 级别的属性，不属于 SPU
  const networkPattern = /(.+?)\s*(?:5g|4g|3g|2g)(?:版)?\b/i;
  const networkMatch = str.match(networkPattern);
  if (networkMatch) {
    return networkMatch[1].trim();
  }
  
  // 规则3: 如果找到容量（改进：支持 4+128 格式）
  const memoryPattern = /(.+?)\s*\(?\d+\s*(?:gb)?\s*\+\s*\d+\s*(?:gb)?\)?/i;
  const memoryMatch = str.match(memoryPattern);
  if (memoryMatch) {
    return memoryMatch[1].trim();
  }
  
  // 规则4: 移除颜色（简化版）
  let spuPart = str;
  
  // 移除末尾的中文颜色词（2-4个字）
  spuPart = spuPart.replace(/[\u4e00-\u9fa5]{2,4}$/g, '').trim();
  
  return spuPart;
}

console.log('=== 测试 SPU 部分提取 ===\n');

const testCases = [
  {
    name: '手表 - 4G版本',
    input: 'OPPO WatchX2mini 42mm 4G皓月银',
    expected: 'OPPO WatchX2mini 42mm',
    reason: '应该移除 4G（SKU版本）和颜色',
  },
  {
    name: '手机 - 5G版本',
    input: 'vivo S50 Pro mini 5G 12+512 告白',
    expected: 'vivo S50 Pro mini',
    reason: '应该移除 5G、内存、颜色',
  },
  {
    name: '手机 - 全网通5G',
    input: 'OPPO Reno15 Pro 全网通5G 12+256 星夜黑',
    expected: 'OPPO Reno15 Pro',
    reason: '应该移除全网通5G、内存、颜色',
  },
  {
    name: '手机 - 3G版本',
    input: 'Nokia 3310 3G 经典黑',
    expected: 'Nokia 3310',
    reason: '应该移除 3G 和颜色',
  },
  {
    name: '手表 - 蓝牙版',
    input: 'OPPO Watch GT 蓝牙版 夏夜黑',
    expected: 'OPPO Watch GT 蓝牙版',
    reason: '蓝牙版是版本关键词，应该保留',
  },
  {
    name: '手表 - eSIM版',
    input: 'OPPO Watch GT eSIM版 夏夜黑',
    expected: 'OPPO Watch GT eSIM版',
    reason: 'eSIM版是版本关键词，应该保留',
  },
];

testCases.forEach(({ name, input, expected, reason }) => {
  const result = extractSPUPart(input);
  const status = result === expected ? '✓' : '✗';
  
  console.log(`${status} ${name}`);
  console.log(`  输入: "${input}"`);
  console.log(`  预期: "${expected}"`);
  console.log(`  实际: "${result}"`);
  console.log(`  原因: ${reason}`);
  
  if (result !== expected) {
    console.log(`  ❌ 测试失败！`);
  }
  console.log();
});
