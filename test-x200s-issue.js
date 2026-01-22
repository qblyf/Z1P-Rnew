/**
 * 测试 X200S 预处理问题
 * 
 * 输入: Vivo X200S 5G(12+512)简黑
 * 期望: Vivo X200S 5G简黑 或 Vivo X200s 5G简黑
 * 实际: Vivo X 200 S 5 G简黑 ❌
 */

function preprocessInputAdvanced(input) {
  let processed = input;
  
  // 1. 先移除括号内的容量信息
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 2. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 3. 处理空格变体（当前版本）
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
console.log('X200S 预处理问题诊断');
console.log('========================================\n');

const input = 'Vivo X200S 5G(12+512)简黑';
console.log('原始输入:', input);
console.log('');

console.log('--- 逐步处理 ---');
let step1 = input.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
console.log('步骤1 (移除括号):', step1);

let step2 = step1.replace(/[（）]/g, (match) => match === '（' ? '(' : ')');
console.log('步骤2 (处理特殊字符):', step2);

let step3_1 = step2.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
console.log('步骤3.1 (型号+修饰词):', step3_1);

let step3_2 = step3_1.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
console.log('步骤3.2 (数字+大小写混合):', step3_2);

let step3_3 = step3_2.replace(/([a-z])([A-Z])/g, '$1 $2');
console.log('步骤3.3 (小写+大写):', step3_3);
console.log('  ❌ 问题在这里！X200S 被拆分成 X 200 S');

let step4 = step3_3.replace(/\b(\w)/g, (match) => match.toUpperCase());
console.log('步骤4 (处理大小写):', step4);

let step5 = step4.replace(/\s+/g, ' ').trim();
console.log('步骤5 (清理空格):', step5);

console.log('');
console.log('最终结果:', preprocessInputAdvanced(input));
console.log('');

console.log('========================================');
console.log('问题分析');
console.log('========================================');
console.log('');
console.log('规则 3.3: /([a-z])([A-Z])/g');
console.log('  匹配: 小写字母 + 大写字母');
console.log('  在 "vivoX200S" 中:');
console.log('    - "o" + "X" 匹配 → "o X" ✅ (这个是对的)');
console.log('    - 但是 "X200S" 中没有小写字母，不应该被拆分');
console.log('');
console.log('实际问题：');
console.log('  输入是 "Vivo X200S"（X和200之间已经有空格）');
console.log('  步骤3.3 不应该匹配 "X200S"');
console.log('  但是为什么 "X200S" 被拆分了？');
console.log('');

// 详细分析每个规则对 "X200S" 的影响
console.log('详细分析 "X200S":');
const testStr = 'X200S';
console.log('  原始:', testStr);

const test1 = testStr.replace(/([A-Z])(\d+)([A-Z][a-z]{2,})/g, '$1$2 $3');
console.log('  规则3.1:', test1, test1 !== testStr ? '(匹配)' : '(不匹配)');

const test2 = test1.replace(/(\d)([A-Z][a-z]+)/g, '$1 $2');
console.log('  规则3.2:', test2, test2 !== test1 ? '(匹配)' : '(不匹配)');

const test3 = test2.replace(/([a-z])([A-Z])/g, '$1 $2');
console.log('  规则3.3:', test3, test3 !== test2 ? '(匹配)' : '(不匹配)');

console.log('');
console.log('========================================');
console.log('解决方案');
console.log('========================================');
console.log('');
console.log('问题：X200S 是一个完整的型号，不应该被拆分');
console.log('');
console.log('X200S 的特征：');
console.log('  - 字母 + 数字 + 单个大写字母');
console.log('  - 类似的型号：X200S, X200Ultra, Y300i');
console.log('');
console.log('需要区分：');
console.log('  - X200S (型号，不拆分) ✅');
console.log('  - X200Pro (型号+修饰词，拆分为 X200 Pro) ✅');
console.log('  - K13Turbo (型号+修饰词，拆分为 K13 Turbo) ✅');
console.log('');
console.log('关键区别：');
console.log('  - 单个大写字母后缀 (S, i) → 不拆分');
console.log('  - 大小写混合单词 (Pro, Turbo, Max) → 拆分');
