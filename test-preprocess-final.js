/**
 * 最终预处理测试
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  // 1. 先移除括号内的容量信息
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 3. 处理空格变体（改进版）
  // 3.1 处理连写的型号+修饰词（如 K13Turbo → K13 Turbo）
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
  
  // 3.2 处理数字+连续大写字母+小写字母（如 Reno15Pro → Reno15 Pro）
  processed = processed.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
  
  // 3.3 处理连写的品牌+型号（如 OppoK13 → Oppo K13）
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // 4. 处理大小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
}

console.log('========================================');
console.log('最终预处理测试');
console.log('========================================\n');

const testCases = [
  {
    input: 'OPPO K13Turbo 5G(12+512)骑士白',
    expected: 'OPPO K13 Turbo 5G骑士白',
  },
  {
    input: 'vivo S30Promini 5G(12+512)可可黑',
    expected: 'Vivo S30 Promini 5G可可黑',
  },
  {
    input: 'OPPO Reno15Pro 全网通5G版',
    expected: 'OPPO Reno15 Pro 全网通5G版',
  },
  {
    input: 'vivo Y300i 4G全网通',
    expected: 'Vivo Y300i 4G全网通',
  },
  {
    input: 'OPPO A5活力版(12+512)琥珀黑',
    expected: 'OPPO A5活力版琥珀黑',
  },
  {
    input: 'VIVO WatchGT2 软胶蓝牙版空白格',
    expected: 'VIVO Watch GT2 软胶蓝牙版空白格',
  },
  {
    input: 'iPhone15ProMax 256GB',
    expected: 'I Phone15 Pro Max 256GB',
  },
  {
    input: 'OPPO FindX9Pro 5G',
    expected: 'OPPO Find X9 Pro 5G',
  },
];

let passedCount = 0;

testCases.forEach((testCase, index) => {
  const result = preprocessInputAdvanced(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`测试 ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  输入: ${testCase.input}`);
  console.log(`  期望: ${testCase.expected}`);
  console.log(`  实际: ${result}`);
  
  if (passed) {
    passedCount++;
  }
  
  console.log('');
});

console.log('========================================');
console.log(`通过率: ${passedCount}/${testCases.length} (${((passedCount / testCases.length) * 100).toFixed(1)}%)`);
console.log('========================================');

// 重点测试：K13Turbo 和 5G 问题
console.log('\n重点验证：K13Turbo 和 5G 问题');
console.log('========================================');
const criticalTest = 'OPPO K13Turbo 5G(12+512)骑士白';
const criticalResult = preprocessInputAdvanced(criticalTest);
console.log('输入:', criticalTest);
console.log('输出:', criticalResult);
console.log('');
console.log('检查项:');
console.log('  - K13 保持完整:', criticalResult.includes('K13 ') ? '✅' : '❌');
console.log('  - 5G 保持完整:', criticalResult.includes('5G') && !criticalResult.includes('5 G') ? '✅' : '❌');
console.log('  - Turbo 正确分离:', criticalResult.includes(' Turbo ') ? '✅' : '❌');
console.log('  - 括号内容已移除:', !criticalResult.includes('(') && !criticalResult.includes(')') ? '✅' : '❌');
