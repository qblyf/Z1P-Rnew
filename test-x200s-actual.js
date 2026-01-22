/**
 * 测试实际的 X200S 输入
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  console.log('原始输入:', JSON.stringify(input));
  console.log('字符分析:', input.split('').map((c, i) => `[${i}]${c}`).join(' '));
  console.log('');
  
  // 1. 先移除括号内的容量信息
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  console.log('步骤1 (移除括号):', processed);
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  console.log('步骤2 (处理特殊字符):', processed);
  
  // 3. 处理空格变体
  // 3.1 处理连写的型号+修饰词
  let before3_1 = processed;
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, (match, p1, p2, p3) => {
    console.log(`  规则3.1匹配: "${match}" → "${p1}${p2} ${p3}"`);
    return `${p1}${p2} ${p3}`;
  });
  console.log('步骤3.1 (型号+修饰词):', processed, before3_1 !== processed ? '(有变化)' : '(无变化)');
  
  // 3.2 处理数字+连续大写字母+小写字母
  let before3_2 = processed;
  processed = processed.replace(/(\d)([A-Z][a-z]+)/g, (match, p1, p2) => {
    console.log(`  规则3.2匹配: "${match}" → "${p1} ${p2}"`);
    return `${p1} ${p2}`;
  });
  console.log('步骤3.2 (数字+大小写混合):', processed, before3_2 !== processed ? '(有变化)' : '(无变化)');
  
  // 3.3 处理连写的品牌+型号
  let before3_3 = processed;
  processed = processed.replace(/([a-z])([A-Z])/g, (match, p1, p2) => {
    console.log(`  规则3.3匹配: "${match}" → "${p1} ${p2}"`);
    return `${p1} ${p2}`;
  });
  console.log('步骤3.3 (小写+大写):', processed, before3_3 !== processed ? '(有变化)' : '(无变化)');
  
  // 4. 处理大小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  console.log('步骤4 (处理大小写):', processed);
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  console.log('步骤5 (清理空格):', processed);
  
  return processed;
}

console.log('========================================');
console.log('测试 1: Vivo X200S (已有空格)');
console.log('========================================\n');
const result1 = preprocessInputAdvanced('Vivo X200S 5G(12+512)简黑');
console.log('\n最终结果:', result1);
console.log('');

console.log('\n========================================');
console.log('测试 2: VivoX200S (无空格)');
console.log('========================================\n');
const result2 = preprocessInputAdvanced('VivoX200S 5G(12+512)简黑');
console.log('\n最终结果:', result2);
console.log('');

console.log('\n========================================');
console.log('测试 3: vivo X200S (小写vivo)');
console.log('========================================\n');
const result3 = preprocessInputAdvanced('vivo X200S 5G(12+512)简黑');
console.log('\n最终结果:', result3);
console.log('');

console.log('\n========================================');
console.log('测试 4: VIVO X200S (全大写)');
console.log('========================================\n');
const result4 = preprocessInputAdvanced('VIVO X200S 5G(12+512)简黑');
console.log('\n最终结果:', result4);
