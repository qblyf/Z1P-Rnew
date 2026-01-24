/**
 * 测试15R型号提取的一致性
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function testModelExtraction() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  console.log('=== 测试15R型号提取一致性 ===\n');
  
  const testCases = [
    '红米15R',
    '红米 15R',
    '红米 15 R',
    'Redmi 15R',
    'Redmi 15 R',
    'Redmi 15 r',
    '15R',
    '15 R',
    '15r',
    '15 r',
  ];
  
  console.log('测试不同格式的型号提取:\n');
  
  const results = new Map<string, string[]>();
  
  for (const testCase of testCases) {
    const model = matcher.extractModel(testCase);
    console.log(`"${testCase}" -> "${model}"`);
    
    if (model) {
      if (!results.has(model)) {
        results.set(model, []);
      }
      results.get(model)!.push(testCase);
    }
  }
  
  console.log('\n=== 提取结果分组 ===\n');
  
  for (const [model, inputs] of results.entries()) {
    console.log(`型号 "${model}":`);
    inputs.forEach(input => {
      console.log(`  - "${input}"`);
    });
    console.log('');
  }
  
  console.log('=== 一致性检查 ===\n');
  
  if (results.size === 1) {
    console.log('✓ 所有格式都提取为相同的型号');
  } else {
    console.log(`❌ 提取结果不一致！有 ${results.size} 种不同的结果`);
    console.log('这会导致匹配失败！');
  }
  
  // 测试SPU名称的型号提取
  console.log('\n=== 测试SPU名称的型号提取 ===\n');
  
  const spuNames = [
    '红米 15R 全网通5G版 4GB+128GB 星岩黑',
    '红米15R 全网通5G版 4GB+128GB 星岩黑',
    'Redmi 15R 全网通5G版 4GB+128GB 星岩黑',
  ];
  
  for (const spuName of spuNames) {
    const spuPart = matcher.extractSPUPart(spuName);
    const model = matcher.extractModel(spuPart);
    console.log(`SPU: "${spuName}"`);
    console.log(`  SPU部分: "${spuPart}"`);
    console.log(`  提取型号: "${model}"`);
    console.log('');
  }
}

testModelExtraction().catch(console.error);
