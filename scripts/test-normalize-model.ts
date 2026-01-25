/**
 * 测试 normalizeModel 函数对型号的影响
 */

function normalizeModel(model: string): string {
  if (!model) return model;
  
  let normalized = model.toLowerCase();
  
  // 1. 在常见后缀关键词前添加空格
  const suffixKeywords = [
    'pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite',
    'note', 'turbo', 'fold', 'flip', 'find', 'reno'
  ];
  
  suffixKeywords.forEach(keyword => {
    const regex = new RegExp(`(?<!\\s)${keyword}`, 'gi');
    normalized = normalized.replace(regex, ` ${keyword}`);
  });
  
  // 2. 在数字和字母之间添加空格
  normalized = normalized.replace(/(\d)([a-z])/gi, '$1 $2');
  normalized = normalized.replace(/([a-z])(\d)/gi, '$1 $2');
  
  // 3. 清理多余空格
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

console.log('=== 测试 normalizeModel 对 "y50" 的影响 ===');
console.log('');

const testCases = [
  'y50',
  'y50 5g',
  'y50 5g 白金',
  'y 50',
  'y 50 5g',
];

testCases.forEach(testCase => {
  const normalized = normalizeModel(testCase);
  const changed = testCase !== normalized;
  console.log(`输入: "${testCase}"`);
  console.log(`输出: "${normalized}" ${changed ? '⚠️  已改变' : '✅ 未改变'}`);
  console.log('');
});

console.log('=== 问题分析 ===');
console.log('');
console.log('normalizeModel 的第二步：在数字和字母之间添加空格');
console.log('  - 规则1: /(\d)([a-z])/gi → 数字后面的字母前加空格');
console.log('  - 规则2: /([a-z])(\d)/gi → 字母后面的数字前加空格');
console.log('');
console.log('对 "y50" 的影响：');
console.log('  - 规则2 匹配: "y" + "50"');
console.log('  - 结果: "y 50" ⚠️');
console.log('');
console.log('这会导致：');
console.log('  1. "y50" → normalizeModel → "y 50"');
console.log('  2. 简单型号正则匹配 "y 50" 时：');
console.log('     - \\b([a-z]+)(\\d+)([a-z]*)\\b 不匹配（中间有空格）');
console.log('     - (?:^|\\s)(\\d{2,3})(?:\\s|$) 匹配到 "50" ✅');
console.log('  3. 最终提取到 "50" 而不是 "y50" ❌');
