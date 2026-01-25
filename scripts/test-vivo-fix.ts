/**
 * 测试 Vivo Y50 匹配问题的修复
 */

// 模拟修复后的 isBrandMatch 函数
function isBrandMatchFixed(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false;
  
  // 完全匹配（精确）
  if (brand1 === brand2) return true;
  
  // 大小写不敏感匹配（修复 Vivo vs vivo 问题）
  if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
  
  return false;
}

// 模拟修复后的 shouldFilterSPU 函数
function shouldFilterSPUFixed(inputName: string, spuName: string): boolean {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  // 配件过滤
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', 
    '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
    '原装', '配件', '套餐'
  ];
  
  const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  if (!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU) {
    return true;
  }
  
  return false;
}

console.log('=== 测试修复 1: 品牌大小写匹配 ===');
console.log('');

const testCases = [
  { brand1: 'Vivo', brand2: 'vivo', expected: true },
  { brand1: 'vivo', brand2: 'Vivo', expected: true },
  { brand1: 'VIVO', brand2: 'vivo', expected: true },
  { brand1: 'vivo', brand2: 'vivo', expected: true },
  { brand1: 'Vivo', brand2: 'Vivo', expected: true },
  { brand1: 'vivo', brand2: 'oppo', expected: false },
];

testCases.forEach(({ brand1, brand2, expected }) => {
  const result = isBrandMatchFixed(brand1, brand2);
  const status = result === expected ? '✓' : '✗';
  console.log(`${status} isBrandMatch("${brand1}", "${brand2}") = ${result} (期望: ${expected})`);
});

console.log('');
console.log('=== 测试修复 2: 配件过滤 ===');
console.log('');

const filterTestCases = [
  {
    input: 'Vivo Y50 5G(8+256)白金',
    spu: 'vivo Y50 全网通5G 8GB+256GB 白金',
    expected: false,
    reason: '手机匹配手机，不过滤'
  },
  {
    input: 'Vivo Y50 5G(8+256)白金',
    spu: 'vivo 原装 50W无线闪充立式充电器（CH2177） 白色',
    expected: true,
    reason: '手机不应匹配充电器，应过滤'
  },
  {
    input: 'vivo 原装充电器',
    spu: 'vivo 原装 50W无线闪充立式充电器（CH2177） 白色',
    expected: false,
    reason: '充电器匹配充电器，不过滤'
  },
];

filterTestCases.forEach(({ input, spu, expected, reason }) => {
  const result = shouldFilterSPUFixed(input, spu);
  const status = result === expected ? '✓' : '✗';
  console.log(`${status} shouldFilterSPU`);
  console.log(`   输入: "${input}"`);
  console.log(`   SPU: "${spu}"`);
  console.log(`   结果: ${result ? '过滤' : '不过滤'} (期望: ${expected ? '过滤' : '不过滤'})`);
  console.log(`   原因: ${reason}`);
  console.log('');
});

console.log('=== 总结 ===');
console.log('修复1: 在 isBrandMatch 中添加大小写不敏感比较');
console.log('修复2: 在 shouldFilterSPU 中添加配件关键词过滤');
console.log('');
console.log('这两个修复应该能解决以下问题：');
console.log('1. "Vivo Y50" 和 "vivo Y50" 现在可以正确匹配');
console.log('2. 手机不会再匹配到充电器等配件');
