/**
 * 测试容量信息保留
 */

function preprocessInputAdvanced(input) {
  console.log('[preprocessInputAdvanced] 输入:', JSON.stringify(input));
  let processed = input;
  
  // 1. 移除括号，但保留容量信息
  // 1.1 提取容量信息
  const capacityPattern = /\((\d+(?:GB)?\s*\+\s*\d+(?:GB)?)\)/g;
  const capacities = [];
  let match;
  while ((match = capacityPattern.exec(processed)) !== null) {
    capacities.push(match[1]);
  }
  
  console.log('  提取的容量:', capacities);
  
  // 1.2 移除所有括号内容
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  console.log('  移除括号后:', JSON.stringify(processed));
  
  // 1.3 重新添加容量信息（不带括号）
  if (capacities.length > 0) {
    processed = processed.replace(/(\d+G)\s*/, `$1 ${capacities[0]} `);
  }
  
  console.log('[preprocessInputAdvanced] 步骤1 (处理括号和容量):', JSON.stringify(processed));
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 3. 处理空格变体
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
  processed = processed.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // 4. 处理大小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  console.log('[preprocessInputAdvanced] 输出:', JSON.stringify(processed));
  return processed;
}

console.log('========================================');
console.log('测试容量信息保留');
console.log('========================================\n');

const testCases = [
  'Vivo X200S 5G(12+512)简黑',
  'OPPO K13Turbo 5G(12+512)骑士白',
  'vivo S30Promini 5G(12+512)可可黑',
  'OPPO Reno15Pro 全网通5G版(8+256)龙晶紫',
  'vivo Y300i 4G全网通(6+128)简黑',
  'VIVO WatchGT2 软胶蓝牙版空白格',  // 没有容量
];

testCases.forEach((input, index) => {
  console.log(`\n测试 ${index + 1}: ${input}`);
  console.log('='.repeat(60));
  const result = preprocessInputAdvanced(input);
  console.log('最终结果:', result);
  console.log('');
});

console.log('\n========================================');
console.log('验证');
console.log('========================================');
console.log('✅ 容量信息应该被保留');
console.log('✅ 型号不应该被拆分（X200S, K13Turbo）');
console.log('✅ 网络制式不应该被拆分（5G, 4G）');
