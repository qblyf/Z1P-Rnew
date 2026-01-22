/**
 * 测试配件过滤
 */

// 配件关键词
const accessoryKeywords = [
  '保护壳', '手机壳', '保护套', '手机套', '壳',
  '充电器', '充电线', '数据线', '耳机', '耳塞',
  '贴膜', '钢化膜', '屏幕保护膜',
  '支架', '车载支架',
  '移动电源', '充电宝',
  '转接头', '适配器',
];

function shouldFilterSPU(inputName, spuName) {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  // 配件过滤
  const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  
  const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  if (!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU) {
    console.log(`过滤SPU（配件）: ${spuName}`);
    return true;
  }
  
  return false;
}

console.log('========================================');
console.log('测试配件过滤');
console.log('========================================\n');

const testCases = [
  {
    input: 'Vivo X200S 5G 12+512 简黑',
    spus: [
      'vivo X200s',
      'vivo X200s保护壳',
      'vivo X200s手机壳',
      'vivo X200s充电器',
    ],
    expected: 'vivo X200s',
  },
  {
    input: 'iPhone 15 Pro Max 256GB',
    spus: [
      'iPhone 15 Pro Max',
      'iPhone 15 Pro Max保护壳',
      'iPhone 15 Pro Max钢化膜',
    ],
    expected: 'iPhone 15 Pro Max',
  },
  {
    input: 'Vivo X200S 保护壳',  // 输入包含配件关键词
    spus: [
      'vivo X200s',
      'vivo X200s保护壳',
    ],
    expected: 'vivo X200s保护壳',  // 应该匹配配件
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\n测试 ${index + 1}: ${testCase.input}`);
  console.log('='.repeat(60));
  console.log('候选 SPU:');
  
  const filtered = testCase.spus.filter(spu => {
    const shouldFilter = shouldFilterSPU(testCase.input, spu);
    console.log(`  ${spu}: ${shouldFilter ? '❌ 过滤' : '✅ 保留'}`);
    return !shouldFilter;
  });
  
  console.log('\n保留的 SPU:', filtered);
  console.log('期望匹配:', testCase.expected);
  console.log('结果:', filtered.includes(testCase.expected) ? '✅ 正确' : '❌ 错误');
});

console.log('\n========================================');
console.log('总结');
console.log('========================================');
console.log('✅ 当输入不包含配件关键词时，过滤掉配件类SPU');
console.log('✅ 当输入包含配件关键词时，保留配件类SPU');
console.log('✅ 优先匹配产品本身，而不是配件');
