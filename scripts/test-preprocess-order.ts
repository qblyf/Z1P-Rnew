/**
 * 测试预处理顺序问题
 * 
 * 正确顺序：品牌 + 型号 + 版本 + 容量 + 颜色
 */

function preprocessInputAdvancedFixed(input: string): string {
  let processed = input;
  
  // 1. 提取容量信息
  const capacityPattern = /\((\d+(?:GB)?\s*\+\s*\d+(?:GB|T)?)\)/gi;
  const capacities: string[] = [];
  let match;
  while ((match = capacityPattern.exec(processed)) !== null) {
    capacities.push(match[1]);
  }
  
  // 2. 移除所有括号内容
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 3. 重新添加容量信息
  if (capacities.length > 0) {
    // ✅ 修复：在版本后、颜色前添加容量
    const versionKeywords = ['活力版', '标准版', '优享版', '尊享版', 'Pro版', 'pro版', '轻享版', '基础版'];
    let versionEndIndex = -1;
    
    for (const keyword of versionKeywords) {
      const index = processed.indexOf(keyword);
      if (index !== -1) {
        versionEndIndex = index + keyword.length;
        break;
      }
    }
    
    if (versionEndIndex !== -1) {
      // 在版本后插入容量
      processed = processed.slice(0, versionEndIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(versionEndIndex).trim();
    } else {
      // 如果没有版本，在第一个中文字符（通常是颜色）前插入容量
      const chinesePattern = /[\u4e00-\u9fa5]/;
      const chineseIndex = processed.search(chinesePattern);
      
      if (chineseIndex !== -1) {
        processed = processed.slice(0, chineseIndex).trim() + ' ' + capacities[0] + ' ' + processed.slice(chineseIndex).trim();
      } else {
        processed = processed.trim() + ' ' + capacities[0];
      }
    }
  }
  
  processed = processed.replace(/\s+/g, ' ').trim();
  return processed;
}

console.log('=== 测试预处理顺序（正确顺序：版本 + 容量 + 颜色）===');
console.log('');

const testCases = [
  {
    input: 'OPPO A5活力版(12+256)玉石绿',
    expected: 'OPPO A5活力版 12+256 玉石绿',
    reason: '版本 + 容量 + 颜色'
  },
  {
    input: 'Xiaomi 14 Pro标准版(8+256)黑色',
    expected: 'Xiaomi 14 Pro标准版 8+256 黑色',
    reason: '版本 + 容量 + 颜色'
  },
  {
    input: 'vivo Y50(8+128)白金',
    expected: 'vivo Y50 8+128 白金',
    reason: '没有版本，容量 + 颜色'
  },
  {
    input: 'iPhone 14 Pro Max(256GB)深空黑',
    expected: 'iPhone 14 Pro Max 256GB 深空黑',
    reason: '没有版本，容量 + 颜色'
  },
  {
    input: 'OPPO A5 活力版 (12+256) 玉石绿',
    expected: 'OPPO A5 活力版 12+256 玉石绿',
    reason: '已有空格，保持顺序'
  },
];

console.log('修复后的实现：');
testCases.forEach(({ input, expected, reason }) => {
  const result = preprocessInputAdvancedFixed(input);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} 输入: "${input}"`);
  console.log(`   结果: "${result}"`);
  console.log(`   期望: "${expected}"`);
  console.log(`   说明: ${reason}`);
  console.log('');
});

console.log('=== 正确顺序说明 ===');
console.log('');
console.log('标准格式：品牌 + 型号 + 版本 + 容量 + 颜色');
console.log('');
console.log('示例：');
console.log('  OPPO A5活力版(12+256)玉石绿');
console.log('  ↓ 预处理');
console.log('  OPPO A5活力版 12+256 玉石绿');
console.log('  ↓ 解析');
console.log('  品牌: OPPO');
console.log('  型号: A5');
console.log('  版本: 活力版');
console.log('  容量: 12+256');
console.log('  颜色: 玉石绿');
console.log('');
console.log('优点：');
console.log('1. 保持 "A5活力版" 的连续性');
console.log('2. 版本信息不会被容量打断');
console.log('3. 符合自然的阅读顺序');
console.log('4. 与 SPU 名称格式一致');
