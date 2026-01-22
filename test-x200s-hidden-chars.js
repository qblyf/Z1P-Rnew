/**
 * 检查是否有隐藏的空格或特殊字符
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  // 1. 先移除括号内的容量信息
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 3. 处理空格变体
  // 3.1 处理连写的型号+修饰词
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
  
  // 3.2 处理数字+连续大写字母+小写字母
  processed = processed.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
  
  // 3.3 处理连写的品牌+型号
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // 4. 处理大小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
}

console.log('========================================');
console.log('测试可能的隐藏字符情况');
console.log('========================================\n');

// 测试各种可能导致拆分的情况
const testCases = [
  {
    name: '正常输入',
    input: 'Vivo X200S 5G(12+512)简黑',
  },
  {
    name: 'X和200之间有空格',
    input: 'Vivo X 200S 5G(12+512)简黑',
  },
  {
    name: '200和S之间有空格',
    input: 'Vivo X200 S 5G(12+512)简黑',
  },
  {
    name: 'X、200、S之间都有空格',
    input: 'Vivo X 200 S 5G(12+512)简黑',
  },
  {
    name: '5和G之间有空格',
    input: 'Vivo X200S 5 G(12+512)简黑',
  },
  {
    name: '所有地方都有空格',
    input: 'Vivo X 200 S 5 G(12+512)简黑',
  },
];

testCases.forEach((testCase) => {
  console.log(`测试: ${testCase.name}`);
  console.log(`  输入: "${testCase.input}"`);
  
  // 显示字符详情
  const chars = testCase.input.split('').map((c, i) => {
    if (c === ' ') return `[${i}]<空格>`;
    return `[${i}]${c}`;
  }).join(' ');
  console.log(`  字符: ${chars.substring(0, 100)}...`);
  
  const result = preprocessInputAdvanced(testCase.input);
  console.log(`  结果: "${result}"`);
  console.log('');
});

console.log('========================================');
console.log('结论');
console.log('========================================');
console.log('');
console.log('如果输入是 "Vivo X 200 S 5 G(12+512)简黑"（已经有空格）');
console.log('那么 preprocessInputAdvanced 不会改变它');
console.log('因为规则只会"添加"空格，不会"移除"空格');
console.log('');
console.log('所以问题可能是：');
console.log('1. 用户输入时就带有空格');
console.log('2. 复制粘贴时带入了空格');
console.log('3. 其他地方的处理逻辑添加了空格');
