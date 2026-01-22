/**
 * 测试 K13Turbo 预处理问题
 * 
 * 输入: OPPO K13Turbo 5G(12+512)骑士白
 * 期望: OPPO K13 Turbo 5G 骑士白
 * 实际: OPPO K 13 Turbo 5 G 骑士白 ❌
 */

function preprocessInputAdvanced_OLD(input) {
  let processed = input;
  
  // 1. 处理空格变体
  // "Reno15" → "Reno 15"
  processed = processed.replace(/(\D)(\d)/g, '$1 $2');  // ❌ 问题在这里
  processed = processed.replace(/(\d)([A-Za-z])/g, '$1 $2');  // ❌ 问题在这里
  
  // 2. 处理大小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 3. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  // 4. 处理特殊字符
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 5. 移除型号代码（括号内的内容）
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 6. 清理最终空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
}

function preprocessInputAdvanced_NEW(input) {
  let processed = input;
  
  // 1. 先移除括号内的容量信息（避免干扰后续处理）
  // "K13Turbo 5G(12+512)骑士白" → "K13Turbo 5G骑士白"
  processed = processed.replace(/\s*[\(\(][^\)\)]*[\)\)]/g, '');
  
  // 2. 处理特殊字符
  // "（" → "(", "）" → ")"
  processed = processed.replace(/[（）]/g, (match) => {
    return match === '（' ? '(' : ')';
  });
  
  // 3. 处理空格变体（改进版）
  // 只在特定情况下添加空格，避免破坏型号和网络制式
  
  // 3.1 处理连写的型号+修饰词（如 K13Turbo → K13 Turbo）
  // 匹配：字母+数字+大写字母开头的单词
  processed = processed.replace(/([A-Z])(\d+)([A-Z][a-z]+)/g, '$1$2 $3');
  
  // 3.2 处理连写的品牌+型号（如 OppoK13 → Oppo K13）
  // 匹配：小写字母+大写字母
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // 3.3 保护网络制式（5G, 4G, 3G）不被拆分
  // 不处理 \d+G 的情况
  
  // 4. 处理大小写
  // 保持首字母大写，其余小写
  processed = processed.replace(/\b(\w)/g, (match) => match.toUpperCase());
  
  // 5. 清理多余空格
  processed = processed.replace(/\s+/g, ' ').trim();
  
  return processed;
}

console.log('========================================');
console.log('K13Turbo 预处理测试');
console.log('========================================\n');

const input = 'OPPO K13Turbo 5G(12+512)骑士白';
console.log('原始输入:', input);
console.log('');

console.log('--- 旧版预处理（有问题）---');
const oldResult = preprocessInputAdvanced_OLD(input);
console.log('结果:', oldResult);
console.log('问题:');
console.log('  - K13 被拆分成 K 13 ❌');
console.log('  - 5G 被拆分成 5 G ❌');
console.log('');

console.log('--- 新版预处理（修复后）---');
const newResult = preprocessInputAdvanced_NEW(input);
console.log('结果:', newResult);
console.log('改进:');
console.log('  - K13 保持完整 ✅');
console.log('  - 5G 保持完整 ✅');
console.log('  - Turbo 正确分离 ✅');
console.log('');

console.log('========================================');
console.log('更多测试用例');
console.log('========================================\n');

const testCases = [
  'OPPO K13Turbo 5G(12+512)骑士白',
  'vivo S30Promini 5G(12+512)可可黑',
  'OPPO Reno15Pro 全网通5G版',
  'vivo Y300i 4G全网通',
  'OPPO A5活力版(12+512)琥珀黑',
  'VIVO WatchGT2 软胶蓝牙版空白格',
];

console.log('测试用例对比:\n');
testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. 输入: ${testCase}`);
  console.log(`   旧版: ${preprocessInputAdvanced_OLD(testCase)}`);
  console.log(`   新版: ${preprocessInputAdvanced_NEW(testCase)}`);
  console.log('');
});

console.log('========================================');
console.log('核心改进');
console.log('========================================');
console.log('1. 先移除括号内容，避免干扰');
console.log('2. 只在特定模式下添加空格（字母+数字+大写字母）');
console.log('3. 保护网络制式（5G, 4G）不被拆分');
console.log('4. 保护型号（K13, Y300i）不被拆分');
