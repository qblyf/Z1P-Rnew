/**
 * 测试从 SPU 名称中提取型号的逻辑
 */

function extractModelFromSPU(spuName: string, brand: string): string | null {
  // 移除品牌名
  let normalized = spuName.toLowerCase();
  normalized = normalized.replace(brand.toLowerCase(), '').trim();
  
  console.log(`步骤1 - 移除品牌后: "${normalized}"`);
  
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
    const before = normalized;
    normalized = normalized.replace(new RegExp(desc, 'gi'), ' ');
    if (before !== normalized) {
      console.log(`  移除 "${desc}": "${before}" -> "${normalized}"`);
    }
  }
  
  console.log(`步骤2 - 移除描述词后: "${normalized}"`);
  
  // 移除容量信息
  normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' ');
  normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' ');
  
  console.log(`步骤3 - 移除容量后: "${normalized}"`);
  
  // 移除颜色信息（简单处理，移除常见颜色词）
  const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
  for (const color of colors) {
    normalized = normalized.replace(new RegExp(`${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
  }
  
  console.log(`步骤4 - 移除颜色后: "${normalized}"`);
  
  // 清理空格
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  console.log(`步骤5 - 清理空格后: "${normalized}"`);
  
  // 如果剩余内容太短或太长，返回 null
  if (normalized.length < 2 || normalized.length > 50) {
    console.log(`  ❌ 长度不符合要求: ${normalized.length}`);
    return null;
  }
  
  // 移除所有空格，返回标准化的型号
  const final = normalized.replace(/\s+/g, '');
  console.log(`步骤6 - 最终型号: "${final}"`);
  
  return final;
}

console.log('=== 测试型号提取 ===\n');

const testCases = [
  {
    spuName: 'OPPO Watch X2 Mini 全智能手表',
    brand: 'OPPO',
    expected: 'watchx2mini',
  },
  {
    spuName: 'OPPO Watch X2 智能手表',
    brand: 'OPPO',
    expected: 'watchx2',
  },
  {
    spuName: 'vivo S50 Pro mini',
    brand: 'vivo',
    expected: 's50promini',
  },
  {
    spuName: 'vivo S50',
    brand: 'vivo',
    expected: 's50',
  },
];

testCases.forEach(({ spuName, brand, expected }) => {
  console.log(`\n测试: "${spuName}"`);
  console.log(`品牌: "${brand}"`);
  console.log(`预期: "${expected}"`);
  console.log('---');
  
  const result = extractModelFromSPU(spuName, brand);
  
  console.log(`\n结果: "${result}"`);
  console.log(`状态: ${result === expected ? '✓ 通过' : '✗ 失败'}`);
  console.log('\n' + '='.repeat(60));
});
