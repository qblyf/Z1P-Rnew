// 测试品牌不匹配导致的型号提取失败

function extractModelFromSPU(spuName: string, brand: string): string | null {
  let normalized = spuName.toLowerCase();
  console.log(`SPU名称: "${spuName}"`);
  console.log(`品牌参数: "${brand}"`);
  
  normalized = normalized.replace(brand.toLowerCase(), '').trim();
  console.log(`移除品牌后: "${normalized}"`);
  
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
  
  normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' ');
  normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' ');
  
  const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
  for (const color of colors) {
    normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
  }
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  console.log(`清理后: "${normalized}" (长度: ${normalized.length})`);
  
  if (normalized.length < 2 || normalized.length > 50) {
    console.log(`✗ 长度不符合要求\n`);
    return null;
  }
  
  const result = normalized.replace(/\s+/g, '');
  console.log(`✓ 最终型号: "${result}"\n`);
  return result;
}

console.log('=== 场景1: 品牌字段正确 ===');
extractModelFromSPU('红米 15R', '红米');

console.log('=== 场景2: 品牌字段是Redmi（拼音） ===');
extractModelFromSPU('红米 15R', 'Redmi');

console.log('=== 场景3: 品牌字段为空或null ===');
// 如果品牌字段为空，extractBrand会从名称中提取
// 但如果提取失败，就会传入空字符串
extractModelFromSPU('红米 15R', '');

console.log('=== 场景4: 品牌字段错误 ===');
extractModelFromSPU('红米 15R', '小米');
