/**
 * 测试 smartMatcher 中的 preprocessInputAdvanced 修复
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function testPreprocessing() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  console.log('=== 测试预处理顺序修复 ===');
  console.log('');
  
  const testCases = [
    {
      input: 'OPPO A5活力版(12+256)玉石绿',
      expected: 'OPPO A5活力版 12+256 玉石绿',
    },
    {
      input: 'Xiaomi 14 Pro标准版(8+256)黑色',
      expected: 'Xiaomi 14 Pro标准版 8+256 黑色',
    },
    {
      input: 'vivo Y50(8+128)白金',
      expected: 'vivo Y50 8+128 白金',
    },
    {
      input: 'iPhone 14 Pro Max(256GB)深空黑',
      expected: 'iPhone 14 Pro Max 256GB 深空黑',
    },
  ];
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    const result = matcher.preprocessInputAdvanced(testCase.input);
    const passed = result === testCase.expected;
    
    if (passed) {
      passCount++;
      console.log(`✅ "${testCase.input}"`);
      console.log(`   结果: "${result}"`);
    } else {
      failCount++;
      console.log(`❌ "${testCase.input}"`);
      console.log(`   结果: "${result}"`);
      console.log(`   期望: "${testCase.expected}"`);
    }
    console.log('');
  }
  
  console.log(`=== 测试结果: ${passCount} 通过, ${failCount} 失败 ===`);
}

testPreprocessing().catch(console.error);
