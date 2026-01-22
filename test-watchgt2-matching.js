/**
 * 测试 VIVO WatchGT2 匹配问题
 * 
 * 输入: VIVO WatchGT2 软胶蓝牙版空白格
 * 期望匹配: vivo WATCH GT 2 蓝牙版 空格白
 * 
 * 问题分析：
 * 1. 型号提取是否正确？
 * 2. SPU 部分提取是否正确？
 * 3. 颜色提取是否正确？
 * 4. 版本过滤是否正确？
 */

// 模拟 SimpleMatcher 的关键方法
const MODEL_NORMALIZATIONS = {
  'watchgt2': 'watch gt 2',
  'watchgt': 'watch gt',
};

const MATERIAL_KEYWORDS = ['软胶', '硅胶', '皮革', '陶瓷', '玻璃', '金属', '塑料', '尼龙'];

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/vivo/g, 'vivo');
}

function extractBrand(str) {
  const lowerStr = str.toLowerCase();
  const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus'];
  
  for (const brand of brands) {
    if (lowerStr.includes(brand)) {
      return brand;
    }
  }
  
  return null;
}

function extractModel(str) {
  const lowerStr = str.toLowerCase();
  
  // 步骤1: 移除括号内的型号代码
  let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
  
  // 步骤1.5: 提取并移除品牌
  const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus'];
  for (const brand of brands) {
    const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
  }
  
  // 清理多余空格
  normalizedStr = normalizedStr.replace(/\s+/g, ' ').trim();
  
  console.log('步骤1.5后:', normalizedStr);
  
  // 步骤2: 应用 MODEL_NORMALIZATIONS 映射
  Object.entries(MODEL_NORMALIZATIONS).forEach(([from, to]) => {
    const regex = new RegExp(`\\b${from}\\b`, 'gi');
    normalizedStr = normalizedStr.replace(regex, to);
  });
  
  console.log('步骤2后（应用映射）:', normalizedStr);
  
  // 优先级1: 字母+字母格式
  const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
  const wordMatches1 = normalizedStr.match(wordModelPattern1);
  
  if (wordMatches1 && wordMatches1.length > 0) {
    let model = wordMatches1[0].toLowerCase().replace(/\s+/g, ' ');
    console.log('优先级1匹配:', model);
    return model;
  }
  
  // 优先级2: 复杂型号格式
  const complexModelPattern = /\b([a-z]+)\s*(\d+)\s*(pro|max|plus|ultra|mini|se|air|lite|note|turbo)(\s+(mini|max|plus|ultra|pro))?\b/gi;
  const complexMatches = normalizedStr.match(complexModelPattern);
  
  if (complexMatches && complexMatches.length > 0) {
    const filtered = complexMatches.filter(m => {
      const lower = m.toLowerCase();
      if (lower.includes('gb')) return false;
      if (/\d+g$/i.test(lower)) return false;
      return true;
    });
    
    if (filtered.length > 0) {
      const model = filtered.sort((a, b) => b.length - a.length)[0]
        .toLowerCase()
        .replace(/\s+/g, '');
      console.log('优先级2匹配:', model);
      return model;
    }
  }
  
  // 优先级3: 简单型号格式
  const simpleModelPattern = /\b([a-z]+)(\d+)([a-z]*)\b/gi;
  const simpleMatches = normalizedStr.match(simpleModelPattern);
  
  if (simpleMatches && simpleMatches.length > 0) {
    const filtered = simpleMatches.filter(m => {
      const lower = m.toLowerCase();
      if (/^[345]g$/i.test(lower)) return false;
      if (lower.includes('gb')) return false;
      if (/^\d+g$/i.test(lower)) return false;
      return true;
    });
    
    if (filtered.length > 0) {
      const model = filtered[0].toLowerCase().replace(/\s+/g, '');
      console.log('优先级3匹配:', model);
      return model;
    }
  }
  
  console.log('未能提取型号');
  return null;
}

function extractColor(str) {
  // 方法1: 从"版"字后提取颜色
  const afterVersion = str.match(/版([\u4e00-\u9fa5]{2,5})$/);
  if (afterVersion && afterVersion[1]) {
    const word = afterVersion[1];
    console.log(`提取颜色（方法1-版字后提取）: ${word}`);
    return word;
  }
  
  // 方法2: 从字符串末尾提取颜色
  let lastWords = str.match(/[\u4e00-\u9fa5]{2,3}$/);
  if (lastWords) {
    const word = lastWords[0];
    const excludeWords = ['全网通', '网通', '版本', '标准', '套餐', '蓝牙版'];
    if (!excludeWords.includes(word)) {
      console.log(`提取颜色（方法2-末尾提取2-3字）: ${word}`);
      return word;
    }
  }
  
  console.log('未能提取颜色');
  return null;
}

function extractSPUPart(str) {
  console.log('=== 提取SPU部分 ===');
  console.log('原始输入:', str);
  
  // 规则1: 优先检查 "全网通5G"
  const fullNetworkFiveGPattern = /(.+?)\s*全网通\s*5g(?:版)?\b/i;
  const fullNetworkFiveGMatch = str.match(fullNetworkFiveGPattern);
  if (fullNetworkFiveGMatch) {
    const spuPart = fullNetworkFiveGMatch[1].trim();
    console.log('规则1匹配（全网通5G左边）:', spuPart);
    return spuPart;
  }
  
  // 规则2: 检查单独的 "5G"
  const fiveGPattern = /(.+?)\s*5g(?:版)?\b/i;
  const fiveGMatch = str.match(fiveGPattern);
  if (fiveGMatch) {
    const spuPart = fiveGMatch[1].trim();
    console.log('规则2匹配（5G左边）:', spuPart);
    return spuPart;
  }
  
  // 规则3: 如果找到内存
  const memoryPattern = /(.+?)\s*\(?\d+\s*gb\s*\+\s*\d+\s*(?:gb)?\)?/i;
  const memoryMatch = str.match(memoryPattern);
  if (memoryMatch) {
    const spuPart = memoryMatch[1].trim();
    console.log('规则3匹配（内存）:', spuPart);
    return spuPart;
  }
  
  // 规则4: 按照品牌+型号方法确定SPU
  let spuPart = str;
  
  // 移除颜色部分
  const color = extractColor(str);
  if (color) {
    const colorIndex = spuPart.lastIndexOf(color);
    if (colorIndex !== -1) {
      spuPart = spuPart.substring(0, colorIndex);
    }
  }
  
  // 移除材质关键词
  for (const material of MATERIAL_KEYWORDS) {
    spuPart = spuPart.replace(new RegExp(material, 'gi'), '');
  }
  
  spuPart = spuPart.trim().replace(/\s+/g, ' ');
  
  console.log('规则4匹配（品牌+型号）:', spuPart);
  
  return spuPart;
}

// 测试用例
console.log('========================================');
console.log('测试用例 1: VIVO WatchGT2 软胶蓝牙版空白格');
console.log('========================================\n');

const input1 = 'VIVO WatchGT2 软胶蓝牙版空白格';
console.log('原始输入:', input1);
console.log('');

console.log('--- 步骤1: 提取品牌 ---');
const brand1 = extractBrand(input1);
console.log('品牌:', brand1);
console.log('');

console.log('--- 步骤2: 提取型号 ---');
const model1 = extractModel(input1);
console.log('型号:', model1);
console.log('');

console.log('--- 步骤3: 提取颜色 ---');
const color1 = extractColor(input1);
console.log('颜色:', color1);
console.log('');

console.log('--- 步骤4: 提取SPU部分 ---');
const spuPart1 = extractSPUPart(input1);
console.log('SPU部分:', spuPart1);
console.log('');

console.log('\n========================================');
console.log('测试用例 2: vivo WATCH GT 2 蓝牙版 空格白');
console.log('========================================\n');

const input2 = 'vivo WATCH GT 2 蓝牙版 空格白';
console.log('原始输入:', input2);
console.log('');

console.log('--- 步骤1: 提取品牌 ---');
const brand2 = extractBrand(input2);
console.log('品牌:', brand2);
console.log('');

console.log('--- 步骤2: 提取型号 ---');
const model2 = extractModel(input2);
console.log('型号:', model2);
console.log('');

console.log('--- 步骤3: 提取颜色 ---');
const color2 = extractColor(input2);
console.log('颜色:', color2);
console.log('');

console.log('--- 步骤4: 提取SPU部分 ---');
const spuPart2 = extractSPUPart(input2);
console.log('SPU部分:', spuPart2);
console.log('');

console.log('\n========================================');
console.log('匹配分析');
console.log('========================================\n');

console.log('品牌匹配:', brand1 === brand2 ? '✅' : '❌', `(${brand1} vs ${brand2})`);
console.log('型号匹配:', model1 === model2 ? '✅' : '❌', `(${model1} vs ${model2})`);
console.log('颜色匹配:', color1 === color2 ? '✅' : '❌', `(${color1} vs ${color2})`);
console.log('');

console.log('问题诊断:');
if (brand1 !== brand2) {
  console.log('❌ 品牌不匹配');
}
if (model1 !== model2) {
  console.log('❌ 型号不匹配');
}
if (color1 !== color2) {
  console.log('❌ 颜色不匹配 - "空白格" vs "空格白"');
  console.log('   原因: 颜色词不同，需要添加颜色变体映射');
}
