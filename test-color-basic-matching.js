/**
 * 测试基础颜色匹配
 * 验证通过基础颜色（如"白"）进行模糊匹配
 */

const COLOR_VARIANTS = {
  '雾凇蓝': ['雾松蓝'],
  '雾松蓝': ['雾凇蓝'],
  '空白格': ['空格白'],
  '空格白': ['空白格'],
};

function isColorVariant(color1, color2) {
  if (!color1 || !color2) return false;
  
  const variants1 = COLOR_VARIANTS[color1];
  if (variants1 && variants1.includes(color2)) {
    return true;
  }
  
  const variants2 = COLOR_VARIANTS[color2];
  if (variants2 && variants2.includes(color1)) {
    return true;
  }
  
  return false;
}

function isColorMatch(color1, color2) {
  if (!color1 || !color2) return false;
  
  // 完全匹配
  if (color1 === color2) return true;
  
  // 变体匹配
  if (isColorVariant(color1, color2)) return true;
  
  // 基础颜色匹配（改进版）
  // 当两个颜色都包含同一个基础颜色时，应该匹配
  // 例如："空白格" 和 "空格白" 都包含 "白"，应该匹配
  
  const basicColorMap = {
    '黑': ['黑', '深', '曜', '玄', '纯', '简', '辰'],
    '白': ['白', '零', '雪', '空', '格'],  // 新增：空、格
    '蓝': ['蓝', '天', '星', '冰', '悠', '自', '薄'],
    '红': ['红', '深'],
    '绿': ['绿', '原', '玉'],
    '紫': ['紫', '灵', '龙', '流', '极', '惬'],
    '粉': ['粉', '玛', '晶', '梦', '桃', '酷', '告'],
    '金': ['金', '流', '祥', '柠'],
    '银': ['银'],
    '灰': ['灰'],
    '棕': ['棕', '琥', '马', '旷'],
    '青': ['青', '薄'],
  };
  
  // 检查是否属于同一基础颜色族
  for (const [basicColor, variants] of Object.entries(basicColorMap)) {
    const color1HasBasic = variants.some(v => color1.includes(v));
    const color2HasBasic = variants.some(v => color2.includes(v));
    
    if (color1HasBasic && color2HasBasic) {
      // 两个颜色都属于同一基础颜色族，匹配成功
      return true;
    }
  }
  
  return false;
}

console.log('========================================');
console.log('基础颜色匹配测试');
console.log('========================================\n');

// 测试用例 1: 空白格 vs 空格白（通过基础颜色"白"匹配）
console.log('测试 1: "空白格" vs "空格白" (基础颜色: 白)');
const result1 = isColorMatch('空白格', '空格白');
console.log('结果:', result1 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 两个颜色都包含"白"/"空"/"格"，应该匹配');
console.log('');

// 测试用例 2: 深空黑 vs 曜石黑（通过基础颜色"黑"匹配）
console.log('测试 2: "深空黑" vs "曜石黑" (基础颜色: 黑)');
const result2 = isColorMatch('深空黑', '曜石黑');
console.log('结果:', result2 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 两个颜色都包含"黑"相关字符，应该匹配');
console.log('');

// 测试用例 3: 龙晶紫 vs 极光紫（通过基础颜色"紫"匹配）
console.log('测试 3: "龙晶紫" vs "极光紫" (基础颜色: 紫)');
const result3 = isColorMatch('龙晶紫', '极光紫');
console.log('结果:', result3 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 两个颜色都包含"紫"，应该匹配');
console.log('');

// 测试用例 4: 冰川蓝 vs 天青蓝（通过基础颜色"蓝"匹配）
console.log('测试 4: "冰川蓝" vs "天青蓝" (基础颜色: 蓝)');
const result4 = isColorMatch('冰川蓝', '天青蓝');
console.log('结果:', result4 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 两个颜色都包含"蓝"相关字符，应该匹配');
console.log('');

// 测试用例 5: 不同基础颜色（应该不匹配）
console.log('测试 5: "空白格" vs "曜石黑" (不同基础颜色)');
const result5 = isColorMatch('空白格', '曜石黑');
console.log('结果:', result5 ? '❌ 错误匹配' : '✅ 正确不匹配');
console.log('说明: 一个是白色系，一个是黑色系，不应该匹配');
console.log('');

// 测试用例 6: 完全相同的颜色
console.log('测试 6: "空白格" vs "空白格" (完全相同)');
const result6 = isColorMatch('空白格', '空白格');
console.log('结果:', result6 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 完全相同的颜色，应该匹配');
console.log('');

// 测试用例 7: 零度白 vs 雪域白（通过基础颜色"白"匹配）
console.log('测试 7: "零度白" vs "雪域白" (基础颜色: 白)');
const result7 = isColorMatch('零度白', '雪域白');
console.log('结果:', result7 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 两个颜色都包含"白"相关字符，应该匹配');
console.log('');

// 测试用例 8: 白月光 vs 空格白（通过基础颜色"白"匹配）
console.log('测试 8: "白月光" vs "空格白" (基础颜色: 白)');
const result8 = isColorMatch('白月光', '空格白');
console.log('结果:', result8 ? '✅ 匹配' : '❌ 不匹配');
console.log('说明: 两个颜色都包含"白"相关字符，应该匹配');
console.log('');

console.log('========================================');
console.log('总结');
console.log('========================================');

const allPassed = result1 && result2 && result3 && result4 && !result5 && result6 && result7 && result8;
console.log('所有测试通过:', allPassed ? '✅' : '❌');
console.log('');

if (!allPassed) {
  console.log('失败的测试:');
  if (!result1) console.log('  - 测试 1: 空白格 vs 空格白');
  if (!result2) console.log('  - 测试 2: 深空黑 vs 曜石黑');
  if (!result3) console.log('  - 测试 3: 龙晶紫 vs 极光紫');
  if (!result4) console.log('  - 测试 4: 冰川蓝 vs 天青蓝');
  if (result5) console.log('  - 测试 5: 空白格 vs 曜石黑（不应该匹配）');
  if (!result6) console.log('  - 测试 6: 空白格 vs 空白格');
  if (!result7) console.log('  - 测试 7: 零度白 vs 雪域白');
  if (!result8) console.log('  - 测试 8: 白月光 vs 空格白');
}

console.log('\n核心改进:');
console.log('1. 基础颜色匹配：通过基础颜色（如"白"）进行模糊匹配');
console.log('2. 扩展白色系关键字：新增"空"、"格"用于匹配"空白格"、"空格白"');
console.log('3. 简化逻辑：只要两个颜色属于同一基础颜色族，就匹配');
console.log('4. 无需显式定义变体：不需要在 COLOR_VARIANTS 中逐一定义所有变体');
