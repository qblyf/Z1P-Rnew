// 测试完整SPU名称的型号提取

function extractModelFromSPU(spuName: string, brand: string): string | null {
  let normalized = spuName.toLowerCase();
  console.log(`原始: "${spuName}"`);
  
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
  console.log(`5. 清理空格后: "${normalized}" (长度: ${normalized.length})`);
  
  if (normalized.length < 2 || normalized.length > 50) {
    console.log(`   ✗ 长度不符合要求`);
    return null;
  }
  
  const result = normalized.replace(/\s+/g, '');
  console.log(`6. 最终型号: "${result}"`);
  return result;
}

const testCases = [
  '红米 15R',
  '红米 15R 全网通5G版',
  '红米 15R 全网通5G版 8GB+256GB',
  '红米 15R 全网通5G版 8GB+256GB 星岩黑',
  '红米 15R 5G',
  '红米 15R 5G 8+256',
  '红米 15R 8+256 星岩黑',
];

testCases.forEach((testCase, index) => {
  console.log(`\n=== 测试${index + 1}: "${testCase}" ===`);
  const result = extractModelFromSPU(testCase, '红米');
  console.log(`✓ 结果: ${result ? `"${result}"` : 'null'}`);
});
