/**
 * 测试 OPPO A5活力版 匹配问题
 */

function extractModel(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  // 移除品牌
  let normalized = lowerStr.replace(/oppo/gi, ' ').trim();
  
  // 简单型号提取
  const simplePattern = /\b([a-z]*)(\d+)([a-z]*)\b/gi;
  const matches = normalized.match(simplePattern);
  
  if (matches) {
    const filtered = matches.filter(m => {
      const lower = m.toLowerCase().trim();
      return !/^[345]g$/i.test(lower) && !lower.includes('gb') && !/^\d+\+\d+$/i.test(lower);
    });
    
    if (filtered.length > 0) {
      return filtered[0].toLowerCase().replace(/\s+/g, '');
    }
  }
  
  return null;
}

function extractVersion(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  const versionKeywords = [
    '活力版', '标准版', '优享版', '尊享版', 'pro版', '轻享版'
  ];
  
  for (const keyword of versionKeywords) {
    if (lowerStr.includes(keyword)) {
      return keyword;
    }
  }
  
  return null;
}

console.log('=== 测试 OPPO A5活力版 匹配 ===');
console.log('');

const testCases = [
  {
    name: '原始输入（括号内容量）',
    input: 'OPPO A5活力版(12+256)玉石绿',
    preprocessed: 'OPPO A5 12+256 活力版玉石绿',
  },
  {
    name: '表格输入（空格分隔）',
    input: 'OPPO A5 12+256 活力版玉石绿',
    preprocessed: 'OPPO A5 12+256 活力版玉石绿',
  },
  {
    name: 'SPU 名称',
    input: 'OPPO A5 活力版 全网通4G 4GB+64GB 玉石绿',
    preprocessed: 'OPPO A5 活力版 全网通4G 4GB+64GB 玉石绿',
  },
];

testCases.forEach(({ name, input, preprocessed }) => {
  const model = extractModel(preprocessed);
  const version = extractVersion(preprocessed);
  
  console.log(`${name}:`);
  console.log(`  输入: "${input}"`);
  console.log(`  预处理: "${preprocessed}"`);
  console.log(`  提取型号: "${model}"`);
  console.log(`  提取版本: "${version}"`);
  console.log('');
});

console.log('=== 问题分析 ===');
console.log('');
console.log('情况1：原始输入');
console.log('  - OPPO A5活力版(12+256)玉石绿');
console.log('  - 预处理 → OPPO A5 12+256 活力版玉石绿');
console.log('  - 型号提取 → "a5"');
console.log('  - 版本提取 → "活力版"');
console.log('');
console.log('情况2：SPU 名称');
console.log('  - OPPO A5 活力版 全网通4G 4GB+64GB 玉石绿');
console.log('  - 型号提取 → "a5"');
console.log('  - 版本提取 → "活力版"');
console.log('');
console.log('结论：');
console.log('  - 型号都是 "a5" ✅');
console.log('  - 版本都是 "活力版" ✅');
console.log('  - 应该可以匹配！');
console.log('');
console.log('如果还是无法匹配，可能的原因：');
console.log('1. SPU 名称不是 "OPPO A5 活力版"，而是其他格式');
console.log('2. 版本匹配逻辑有问题');
console.log('3. 其他参数（容量、颜色）不匹配');
