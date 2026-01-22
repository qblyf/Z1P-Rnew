/**
 * 逐步追踪 X200S 的处理过程
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  console.log('原始输入:', JSON.stringify(input));
  console.log('字符详情:', input.split('').map((c, i) => c === ' ' ? `[${i}]<SP>` : `[${i}]${c}`).join(' '));
  console.log('');
  
  // 1. 先移除括号内的容量信息
  let before = processed;
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  console.log('步骤1 (移除括号):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  // 2. 处理特殊字符
  before = processed;
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  console.log('步骤2 (处理特殊字符):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  // 3.1 处理连写的型号+修饰词
  before = processed;
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, (match, p1, p2, p3) => {
    console.log(`  规则3.1匹配: "${match}" → "${p1}${p2} ${p3}"`);
    return `${p1}${p2} ${p3}`;
  });
  console.log('步骤3.1 (型号+修饰词):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  // 3.2 处理数字+连续大写字母+小写字母
  before = processed;
  processed = processed.replace(/(\d)([A-Z][a-z]+)/g, (match, p1, p2) => {
    console.log(`  规则3.2匹配: "${match}" → "${p1} ${p2}"`);
    return `${p1} ${p2}`;
  });
  console.log('步骤3.2 (数字+大小写混合):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  // 3.3 处理连写的品牌+型号
  before = processed;
  processed = processed.replace(/([a-z])([A-Z])/g, (match, p1, p2) => {
    console.log(`  规则3.3匹配: "${match}" → "${p1} ${p2}"`);
    return `${p1} ${p2}`;
  });
  console.log('步骤3.3 (小写+大写):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  // 4. 处理大小写
  before = processed;
  processed = processed.replace(/\b(\w)/g, (match) => {
    console.log(`  大小写匹配: "${match}" → "${match.toUpperCase()}"`);
    return match.toUpperCase();
  });
  console.log('步骤4 (处理大小写):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  // 5. 清理多余空格
  before = processed;
  processed = processed.replace(/\s+/g, ' ').trim();
  console.log('步骤5 (清理空格):');
  console.log('  之前:', JSON.stringify(before));
  console.log('  之后:', JSON.stringify(processed));
  console.log('  变化:', before !== processed ? '是' : '否');
  console.log('');
  
  return processed;
}

console.log('========================================');
console.log('测试: Vivo X200S 5G(12+512)简黑');
console.log('========================================\n');

const result = preprocessInputAdvanced('Vivo X200S 5G(12+512)简黑');

console.log('========================================');
console.log('最终结果:', result);
console.log('========================================');
