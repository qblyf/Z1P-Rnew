/**
 * 测试 Fold 型号提取修复
 */

function normalizeModel(model: string): string {
  if (!model) return model;
  
  let normalized = model.toLowerCase();
  
  const suffixKeywords = [
    'pro', 'max', 'plus', 'ultra', 'mini', 'se', 'air', 'lite',
    'note', 'turbo', 'fold', 'flip', 'find', 'reno'
  ];
  
  suffixKeywords.forEach(keyword => {
    const regex = new RegExp(`(?<!\\s)${keyword}`, 'gi');
    normalized = normalized.replace(regex, ` ${keyword}`);
  });
  
  normalized = normalized.replace(/(\d)([a-z])/gi, '$1 $2');
  normalized = normalized.replace(/([a-z])(\d)/gi, '$1 $2');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

function preprocessModelString(lowerStr: string, brands: string[]): string {
  let normalizedStr = lowerStr.replace(/[（(][^)）]*[)）]/g, ' ');
  
  for (const brand of brands) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
    const brandRegex = hasChinese 
      ? new RegExp(brand, 'gi')
      : new RegExp(`\\b${brand}\\b`, 'gi');
    
    normalizedStr = normalizedStr.replace(brandRegex, ' ');
  }
  
  return normalizedStr.replace(/\s+/g, ' ').trim();
}

function extractWordModelFixed(normalizedStr: string): string | null {
  // ✅ 修复：添加可选的数字部分
  const wordModelPattern2 = /\b([a-z])\s+(note|fold|flip|pad)(?:\s+(\d+))?\b/gi;
  const wordModelPattern1 = /\b(watch|band|buds|pad|fold|flip)\s+(gt|se|pro|max|plus|ultra|air|lite|x2|x3|x4|x5|s|\d+|[a-z]+\d*)(?:\s+(?:mini|pro|plus|ultra|air|lite|\d+))?\b/gi;
  
  const wordMatches2 = normalizedStr.match(wordModelPattern2);
  const wordMatches1 = normalizedStr.match(wordModelPattern1);
  const wordMatches = [...(wordMatches2 || []), ...(wordMatches1 || [])];
  
  if (wordMatches && wordMatches.length > 0) {
    return wordMatches[0].toLowerCase().replace(/\s+/g, '');
  }
  
  return null;
}

function shouldFilterSPUFixed(inputName: string, spuName: string): boolean {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
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

console.log('=== 测试 Fold 型号提取修复 ===');
console.log('');

const testCases = [
  {
    name: '问题案例：X FOLD5',
    input: 'Vivo X FOLD5 5G 16+1T 青松',
    expected: 'xfold5',
  },
  {
    name: 'X Fold 3',
    input: 'vivo X Fold 3 保护膜',
    expected: 'xfold3',
  },
  {
    name: 'X Fold3 Pro',
    input: 'vivo X Fold3 Pro',
    expected: 'xfold3',
  },
  {
    name: 'Z Fold5',
    input: 'Samsung Galaxy Z Fold5',
    expected: 'zfold5',
  },
  {
    name: 'Z Flip3',
    input: 'Samsung Galaxy Z Flip3',
    expected: 'zflip3',
  },
];

const brands = ['vivo', 'samsung', 'galaxy'];

testCases.forEach(({ name, input, expected }) => {
  console.log(`测试: ${name}`);
  console.log(`  输入: "${input}"`);
  
  const lowerStr = input.toLowerCase();
  const preprocessed = preprocessModelString(lowerStr, brands);
  const normalized = normalizeModel(preprocessed);
  const model = extractWordModelFixed(normalized);
  
  const status = model === expected ? '✅' : '❌';
  console.log(`  提取型号: "${model}" (期望: "${expected}") ${status}`);
  console.log('');
});

console.log('=== 测试配件过滤 ===');
console.log('');

const filterTests = [
  {
    input: 'Vivo X FOLD5 5G 16+1T 青松',
    spu: 'vivo X Fold 3 保护膜',
    expected: true,
    reason: '手机不应匹配保护膜'
  },
  {
    input: 'Vivo X FOLD5 5G 16+1T 青松',
    spu: 'vivo X Fold5 全网通5G 16GB+1TB 青松',
    expected: false,
    reason: '手机应匹配手机'
  },
];

filterTests.forEach(({ input, spu, expected, reason }) => {
  const result = shouldFilterSPUFixed(input, spu);
  const status = result === expected ? '✅' : '❌';
  
  console.log(`${status} shouldFilterSPU`);
  console.log(`  输入: "${input}"`);
  console.log(`  SPU: "${spu}"`);
  console.log(`  结果: ${result ? '过滤' : '不过滤'} (期望: ${expected ? '过滤' : '不过滤'})`);
  console.log(`  原因: ${reason}`);
  console.log('');
});

console.log('=== 修复说明 ===');
console.log('');
console.log('修复1: 字母+字母型号正则添加可选数字');
console.log('  - 修复前: /\\b([a-z])\\s+(note|fold|flip|pad)\\b/gi');
console.log('  - 修复后: /\\b([a-z])\\s+(note|fold|flip|pad)(?:\\s+(\\d+))?\\b/gi');
console.log('  - 效果: "x fold 5" → "xfold5" ✅');
console.log('');
console.log('修复2: 配件关键词添加"保护膜"');
console.log('  - 添加 "保护膜" 到配件关键词列表');
console.log('  - 效果: 手机不会匹配到保护膜 ✅');
