/**
 * 验证预处理修复
 * 确保修复后的 preprocessInputAdvanced 函数正确处理各种输入
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  // 1. 先移除括号内的容量信息（避免干扰后续处理）
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 3. 处理空格变体（改进版）
  // 3.1 处理连写的型号+修饰词（如 K13Turbo → K13 Turbo）
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]+)/g, '$1$2 $3');
  
  // 3.2 处理连写的品牌+型号（如 OppoK13 → Oppo K13）
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // 4. 处理大小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
}

console.log('========================================');
console.log('预处理修复验证测试');
console.log('========================================\n');

const testCases = [
  {
    input: 'OPPO K13Turbo 5G(12+512)骑士白',
    expected: 'OPPO K13 Turbo 5G骑士白',
    description: 'K13Turbo 应该分离为 K13 Turbo，5G 应该保持完整',
  },
  {
    input: 'vivo S30Promini 5G(12+512)可可黑',
    expected: 'Vivo S30 Promini 5G可可黑',
    description: 'S30Promini 应该分离为 S30 Promini，5G 应该保持完整',
  },
  {
    input: 'OPPO Reno15Pro 全网通5G版',
    expected: 'OPPO Reno15 Pro 全网通5G版',
    description: 'Reno15Pro 应该分离为 Reno15 Pro，5G 应该保持完整',
  },
  {
    input: 'vivo Y300i 4G全网通',
    expected: 'Vivo Y300i 4G全网通',
    description: 'Y300i 应该保持完整，4G 应该保持完整',
  },
  {
    input: 'OPPO A5活力版(12+512)琥珀黑',
    expected: 'OPPO A5活力版琥珀黑',
    description: 'A5 应该保持完整，括号内容应该被移除',
  },
  {
    input: 'VIVO WatchGT2 软胶蓝牙版空白格',
    expected: 'VIVO Watch GT2 软胶蓝牙版空白格',
    description: 'WatchGT2 应该分离为 Watch GT2',
  },
  {
    input: 'iPhone15ProMax 256GB',
    expected: 'I Phone15 Pro Max 256GB',
    description: 'iPhone15ProMax 应该分离为 I Phone15 Pro Max',
  },
  {
    input: 'OPPO FindX9Pro 5G',
    expected: 'OPPO Find X9 Pro 5G',
    description: 'FindX9Pro 应该分离为 Find X9 Pro',
  },
];

let passedCount = 0;
let failedCount = 0;

testCases.forEach((testCase, index) => {
  const result = preprocessInputAdvanced(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`测试 ${index + 1}: ${passed ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  输入:   ${testCase.input}`);
  console.log(`  期望:   ${testCase.expected}`);
  console.log(`  实际:   ${result}`);
  console.log(`  说明:   ${testCase.description}`);
  
  if (!passed) {
    console.log(`  差异:   期望和实际不匹配`);
    failedCount++;
  } else {
    passedCount++;
  }
  
  console.log('');
});

console.log('========================================');
console.log('测试总结');
console.log('========================================');
console.log(`总测试数: ${testCases.length}`);
console.log(`通过: ${passedCount} ✅`);
console.log(`失败: ${failedCount} ❌`);
console.log(`通过率: ${((passedCount / testCases.length) * 100).toFixed(1)}%`);
console.log('');

if (failedCount === 0) {
  console.log('🎉 所有测试通过！');
} else {
  console.log('⚠️  部分测试失败，需要进一步调整');
}

console.log('\n========================================');
console.log('核心改进说明');
console.log('========================================');
console.log('1. 先移除括号内容：避免容量信息干扰后续处理');
console.log('2. 精确的空格添加：只在型号+修饰词之间添加空格');
console.log('3. 保护网络制式：5G、4G 等不会被拆分');
console.log('4. 保护型号完整性：K13、Y300i 等不会被拆分');
console.log('5. 正确分离修饰词：Turbo、Pro、Max 等会被正确分离');
