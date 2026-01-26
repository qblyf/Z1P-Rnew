/**
 * 测试 OPPO Watch X2 Mini 匹配问题
 */

// 模拟过滤逻辑
function shouldFilterSPU(inputName: string, spuName: string): boolean {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  // 配件过滤
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
    '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
    '原装', '配件', '套餐', '底座', '充电底座', '无线充电'
  ];
  
  const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  console.log(`  输入包含配件关键词: ${hasAccessoryKeywordInInput}`);
  console.log(`  SPU包含配件关键词: ${hasAccessoryKeywordInSPU}`);
  
  if (hasAccessoryKeywordInInput) {
    console.log(`  → 输入包含配件关键词，不过滤`);
  }
  
  if (!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU) {
    console.log(`  → 应该过滤（输入不包含配件关键词，但SPU包含）`);
    return true;
  }
  
  return false;
}

console.log('=== 测试 OPPO Watch X2 Mini 匹配问题 ===\n');

const testCases = [
  {
    input: 'OPPO WatchX2mini 42mm 4G皓月银',
    spus: [
      'OPPO Watch X2 Mini 全智能手表 皓月银',
      'OPPO Watch 一体式充电底座',
      'OPPO Watch X2',
      'OPPO Watch',
    ]
  }
];

for (const testCase of testCases) {
  console.log(`输入: "${testCase.input}"\n`);
  
  for (const spu of testCase.spus) {
    console.log(`检查 SPU: "${spu}"`);
    const shouldFilter = shouldFilterSPU(testCase.input, spu);
    console.log(`  结果: ${shouldFilter ? '✓ 过滤' : '✗ 不过滤'}\n`);
  }
}

console.log('\n=== 分析 ===');
console.log('问题：');
console.log('1. "OPPO Watch 一体式充电底座" 包含 "充电底座" 关键词');
console.log('2. 输入 "OPPO WatchX2mini 42mm 4G皓月银" 不包含配件关键词');
console.log('3. 应该被过滤，但实际没有被过滤');
console.log('');
console.log('可能原因：');
console.log('1. 过滤逻辑在模糊匹配阶段没有被调用？');
console.log('2. 或者 "充电底座" 关键词匹配失败？');
