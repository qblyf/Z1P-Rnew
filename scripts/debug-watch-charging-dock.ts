/**
 * 调试 OPPO Watch 充电底座过滤问题
 */

const input = 'OPPO WatchX2mini 42mm 4G皓月银';
const spuName = 'OPPO Watch 一体式充电底座';

console.log('=== 调试充电底座过滤问题 ===\n');
console.log(`输入: "${input}"`);
console.log(`SPU: "${spuName}"`);
console.log('');

// 检查关键词匹配
const accessoryKeywords = [
  '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
  '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
  '原装', '配件', '套餐', '底座', '充电底座', '无线充电'
];

console.log('检查每个关键词:');
const lowerSPU = spuName.toLowerCase();
const lowerInput = input.toLowerCase();

for (const keyword of accessoryKeywords) {
  const inSPU = lowerSPU.includes(keyword);
  const inInput = lowerInput.includes(keyword);
  
  if (inSPU || inInput) {
    console.log(`  "${keyword}": SPU=${inSPU}, Input=${inInput}`);
  }
}

console.log('');
console.log('SPU 小写:', lowerSPU);
console.log('');

// 检查 "底座" 关键词
console.log('检查 "底座" 关键词:');
console.log(`  lowerSPU.includes('底座'): ${lowerSPU.includes('底座')}`);
console.log(`  lowerSPU.includes('充电底座'): ${lowerSPU.includes('充电底座')}`);
console.log('');

// 检查字符编码
console.log('字符编码检查:');
console.log(`  "底座" 的字符码:`, Array.from('底座').map(c => c.charCodeAt(0)));
console.log(`  SPU中"底座"的字符码:`, Array.from(spuName.match(/底座/) || ['']).map(c => Array.from(c).map(ch => ch.charCodeAt(0))));
console.log('');

// 最终判断
const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
  lowerInput.includes(keyword)
);
const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
  lowerSPU.includes(keyword)
);

console.log('最终判断:');
console.log(`  输入包含配件关键词: ${hasAccessoryKeywordInInput}`);
console.log(`  SPU包含配件关键词: ${hasAccessoryKeywordInSPU}`);
console.log(`  应该过滤: ${!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU}`);
