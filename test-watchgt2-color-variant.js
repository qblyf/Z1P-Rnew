/**
 * 测试颜色变体匹配
 * 验证 "空白格" 和 "空格白" 是否被识别为同一颜色
 */

const COLOR_VARIANTS = {
  '雾凇蓝': ['雾松蓝'],
  '雾松蓝': ['雾凇蓝'],
  '空白格': ['空格白'],
  '空格白': ['空白格'],
};

function isColorVariant(color1, color2) {
  if (!color1 || !color2) return false;
  
  // 检查 color1 的变体列表中是否包含 color2
  const variants1 = COLOR_VARIANTS[color1];
  if (variants1 && variants1.includes(color2)) {
    return true;
  }
  
  // 检查 color2 的变体列表中是否包含 color1
  const variants2 = COLOR_VARIANTS[color2];
  if (variants2 && variants2.includes(color1)) {
    return true;
  }
  
  return false;
}

console.log('========================================');
console.log('颜色变体匹配测试');
console.log('========================================\n');

// 测试用例 1: 空白格 vs 空格白
console.log('测试 1: "空白格" vs "空格白"');
const result1 = isColorVariant('空白格', '空格白');
console.log('结果:', result1 ? '✅ 匹配' : '❌ 不匹配');
console.log('');

// 测试用例 2: 空格白 vs 空白格（反向）
console.log('测试 2: "空格白" vs "空白格" (反向)');
const result2 = isColorVariant('空格白', '空白格');
console.log('结果:', result2 ? '✅ 匹配' : '❌ 不匹配');
console.log('');

// 测试用例 3: 雾凇蓝 vs 雾松蓝
console.log('测试 3: "雾凇蓝" vs "雾松蓝"');
const result3 = isColorVariant('雾凇蓝', '雾松蓝');
console.log('结果:', result3 ? '✅ 匹配' : '❌ 不匹配');
console.log('');

// 测试用例 4: 不相关的颜色
console.log('测试 4: "空白格" vs "曜石黑" (不相关)');
const result4 = isColorVariant('空白格', '曜石黑');
console.log('结果:', result4 ? '❌ 错误匹配' : '✅ 正确不匹配');
console.log('');

console.log('========================================');
console.log('总结');
console.log('========================================');
console.log('所有测试通过:', result1 && result2 && result3 && !result4 ? '✅' : '❌');
