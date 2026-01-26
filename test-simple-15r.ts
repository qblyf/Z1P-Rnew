// 测试简单的"红米 15R"型号提取

function extractModelFromSPU(spuName: string, brand: string): string | null {
  let normalized = spuName.toLowerCase();
  console.log(`原始: "${spuName}"`);
  console.log(`品牌: "${brand}"`);
  
  normalized = normalized.replace(brand.toLowerCase(), '').trim();
  console.log(`1. 移除品牌后: "${normalized}"`);
  
  const descriptors = [
    '智能手机', '手机', '智能手表', '手表', '平板电脑', '平板', '笔记本电脑', '笔记本',
    '无线耳机', '耳机', '手环', '智能', '款', '版', '英寸', 'mm', 'gb', 'tb',
    '钛合金', '陶瓷', '素皮', '皮革', '玻璃', '金属', '塑料',
    '蓝牙', 'wifi', '5g', '4g', '3g', '全网通', 'esim',
    '年', '月', '日', '新品', '上市', '发布',
    '全',
  ];
  
  for (const desc of descriptors) {
    normalized = normalized.replace(new RegExp(desc, 'gi'), ' ');
  }
  console.log(`2. 移除描述词后: "${normalized}"`);
  
  normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' ');
  normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' ');
  console.log(`3. 移除容量后: "${normalized}"`);
  
  const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
  for (const color of colors) {
    normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
  }
  console.log(`4. 移除颜色后: "${normalized}"`);
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  console.log(`5. 清理空格后: "${normalized}"`);
  console.log(`   长度: ${normalized.length}`);
  
  if (normalized.length < 2 || normalized.length > 50) {
    console.log(`   ✗ 长度不符合要求 (${normalized.length} 不在 2-50 之间)`);
    return null;
  }
  
  const result = normalized.replace(/\s+/g, '');
  console.log(`6. 最终型号: "${result}"`);
  return result;
}

console.log('=== 测试1: "红米 15R" ===');
const result1 = extractModelFromSPU('红米 15R', '红米');
console.log(`结果: ${result1 ? `"${result1}"` : 'null'}`);
console.log();

console.log('=== 测试2: "红米 15R" (小写) ===');
const result2 = extractModelFromSPU('红米 15r', '红米');
console.log(`结果: ${result2 ? `"${result2}"` : 'null'}`);
console.log();

console.log('=== 测试3: "红米15R" (无空格) ===');
const result3 = extractModelFromSPU('红米15R', '红米');
console.log(`结果: ${result3 ? `"${result3}"` : 'null'}`);
