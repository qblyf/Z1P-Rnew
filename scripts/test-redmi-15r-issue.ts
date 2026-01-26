/**
 * 测试红米 15R 匹配问题
 * 
 * 问题：输入 "红米15R 4+128星岩黑" 匹配失败
 * 应该匹配：红米 15R 全网通5G版 4GB+128GB 星岩黑
 */

// 模拟 extractModelFromSPU 函数
function extractModelFromSPU(spuName: string, brand: string): string | null {
  // 移除品牌名
  let normalized = spuName.toLowerCase();
  normalized = normalized.replace(brand.toLowerCase(), '').trim();
  
  console.log(`  移除品牌后: "${normalized}"`);
  
  // 移除常见的描述词
  const descriptors = [
    '智能手机', '手机', '智能手表', '手表', '平板电脑', '平板', '笔记本电脑', '笔记本',
    '无线耳机', '耳机', '手环', '智能', '款', '版', '英寸', 'mm', 'gb', 'tb',
    '钛合金', '陶瓷', '素皮', '皮革', '玻璃', '金属', '塑料',
    '蓝牙', 'wifi', '5g', '4g', '3g', '全网通', 'esim',
    '年', '月', '日', '新品', '上市', '发布',
    '全', // 移除 "全" 字（如 "全智能手表" 中的 "全"）
  ];
  
  for (const desc of descriptors) {
    normalized = normalized.replace(new RegExp(desc, 'gi'), ' ');
  }
  
  console.log(`  移除描述词后: "${normalized}"`);
  
  // 移除容量信息
  normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' ');
  normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' ');
  
  console.log(`  移除容量后: "${normalized}"`);
  
  // 移除颜色信息（改进：移除颜色词及其前后的中文字符）
  // 例如："星岩黑" -> 全部移除，而不是只移除 "黑"
  const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
  for (const color of colors) {
    // 匹配：颜色词前面的中文字符 + 颜色词 + 颜色词后面的中文字符
    normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
  }
  
  console.log(`  移除颜色后: "${normalized}"`);
  
  // 清理空格
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  console.log(`  清理空格后: "${normalized}"`);
  
  // 如果剩余内容太短或太长，返回 null
  if (normalized.length < 2 || normalized.length > 50) {
    console.log(`  ✗ 长度不符合要求 (${normalized.length})`);
    return null;
  }
  
  // 移除所有空格，返回标准化的型号
  const result = normalized.replace(/\s+/g, '');
  console.log(`  ✓ 最终型号: "${result}"`);
  return result;
}

// 模拟 extractModel 函数（简化版）
function extractModel(str: string, brand?: string | null): string | null {
  let lowerStr = str.toLowerCase();
  
  // 移除品牌
  if (brand) {
    lowerStr = lowerStr.replace(brand.toLowerCase(), '').trim();
  }
  
  console.log(`  移除品牌后: "${lowerStr}"`);
  
  // 提取简单型号
  const simpleModelPattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
  const simpleMatches = lowerStr.match(simpleModelPattern);
  
  console.log(`  匹配结果: ${simpleMatches ? JSON.stringify(simpleMatches) : 'null'}`);
  
  if (!simpleMatches || simpleMatches.length === 0) {
    return null;
  }
  
  const filtered = simpleMatches.filter(m => {
    const lower = m.toLowerCase().trim();
    return !/^[345]g$/i.test(lower) && 
           !lower.includes('gb') && 
           !/^\d+g$/i.test(lower) &&
           !/^\d+\+\d+$/i.test(lower);
  });
  
  console.log(`  过滤后: ${filtered.length > 0 ? JSON.stringify(filtered) : 'null'}`);
  
  if (filtered.length === 0) {
    return null;
  }
  
  const sorted = filtered.sort((a, b) => {
    const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
    const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
    if (aHasSuffix && !bHasSuffix) return -1;
    if (!aHasSuffix && bHasSuffix) return 1;
    return b.length - a.length;
  });
  
  const result = sorted[0].toLowerCase().trim().replace(/\s+/g, '');
  console.log(`  ✓ 最终型号: "${result}"`);
  return result;
}

console.log('=== 测试红米 15R 型号提取 ===\n');

// 测试用例1: 输入
console.log('1. 输入: "红米15R 4+128星岩黑"');
const inputModel = extractModel('红米15R 4+128星岩黑', '红米');
console.log();

// 测试用例2: SPU（完整名称）
console.log('2. SPU: "红米 15R 全网通5G版 4GB+128GB 星岩黑"');
const spuModel1 = extractModelFromSPU('红米 15R 全网通5G版 4GB+128GB 星岩黑', '红米');
console.log();

// 测试用例3: SPU（简化名称）
console.log('3. SPU: "红米 15R"');
const spuModel2 = extractModelFromSPU('红米 15R', '红米');
console.log();

// 比较结果
console.log('=== 比较结果 ===');
console.log(`输入型号: "${inputModel}"`);
console.log(`SPU型号1: "${spuModel1}"`);
console.log(`SPU型号2: "${spuModel2}"`);
console.log();

if (inputModel && spuModel1) {
  const match1 = inputModel === spuModel1;
  console.log(`输入 vs SPU1: ${match1 ? '✓ 匹配' : '✗ 不匹配'}`);
}

if (inputModel && spuModel2) {
  const match2 = inputModel === spuModel2;
  console.log(`输入 vs SPU2: ${match2 ? '✓ 匹配' : '✗ 不匹配'}`);
}
