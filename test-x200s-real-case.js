/**
 * 测试真实的 X200S 输入情况
 * 根据截图，输入是：Vivo X200S 5G(12+512)简黑
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  console.log('=== 开始处理 ===');
  console.log('原始输入:', JSON.stringify(input));
  console.log('');
  
  // 1. 先移除括号内的容量信息
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  console.log('步骤1 (移除括号):', JSON.stringify(processed));
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  console.log('步骤2 (处理特殊字符):', JSON.stringify(processed));
  
  // 3. 处理空格变体
  console.log('\n--- 步骤3: 处理空格变体 ---');
  
  // 3.1 处理连写的型号+修饰词
  let before = processed;
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, (match, p1, p2, p3) => {
    console.log(`  规则3.1匹配: "${match}" → "${p1}${p2} ${p3}"`);
    return `${p1}${p2} ${p3}`;
  });
  if (before !== processed) {
    console.log('步骤3.1 结果:', JSON.stringify(processed));
  } else {
    console.log('步骤3.1: 无匹配');
  }
  
  // 3.2 处理数字+连续大写字母+小写字母
  before = processed;
  processed = processed.replace(/(\d)([A-Z][a-z]+)/g, (match, p1, p2) => {
    console.log(`  规则3.2匹配: "${match}" → "${p1} ${p2}"`);
    return `${p1} ${p2}`;
  });
  if (before !== processed) {
    console.log('步骤3.2 结果:', JSON.stringify(processed));
  } else {
    console.log('步骤3.2: 无匹配');
  }
  
  // 3.3 处理连写的品牌+型号
  before = processed;
  processed = processed.replace(/([a-z])([A-Z])/g, (match, p1, p2) => {
    console.log(`  规则3.3匹配: "${match}" → "${p1} ${p2}"`);
    return `${p1} ${p2}`;
  });
  if (before !== processed) {
    console.log('步骤3.3 结果:', JSON.stringify(processed));
  } else {
    console.log('步骤3.3: 无匹配');
  }
  
  console.log('');
  
  // 4. 处理大小写
  before = processed;
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  console.log('步骤4 (处理大小写):', JSON.stringify(processed));
  if (before !== processed) {
    console.log('  变化:', JSON.stringify(before), '→', JSON.stringify(processed));
  }
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  console.log('步骤5 (清理空格):', JSON.stringify(processed));
  
  return processed;
}

console.log('========================================');
console.log('测试真实输入');
console.log('========================================\n');

// 测试各种可能的输入格式
const testCases = [
  'Vivo X200S 5G(12+512)简黑',
  'vivo X200S 5G(12+512)简黑',
  'VIVO X200S 5G(12+512)简黑',
  'Vivo X200s 5G(12+512)简黑',  // 小写s
];

testCases.forEach((input, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试 ${index + 1}: ${input}`);
  console.log('='.repeat(60));
  const result = preprocessInputAdvanced(input);
  console.log('\n最终结果:', result);
  console.log('');
});
