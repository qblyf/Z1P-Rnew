/**
 * Requirements Validation Test for VersionExtractor
 * 验证版本提取器是否满足需求 4.1 和 4.3
 */

import { versionExtractor } from './versionExtractor.ts';

console.log('=== VersionExtractor Requirements Validation ===\n');

// 需求 4.1: 提取版本标识
console.log('需求 4.1: WHEN 输入包含版本标识（如"活力版"、"标准版"、"青春版"），THE Version_Extractor SHALL 提取该版本标识\n');

const testCases41 = [
  { input: 'VIVO X200 Pro 活力版', expected: '活力版' },
  { input: 'OPPO A5 标准版', expected: '标准版' },
  { input: 'Redmi K70 青春版', expected: '青春版' },
  { input: '华为Mate60 至尊版', expected: '至尊版' },
  { input: 'IQOO Z10 竞速版', expected: '竞速版' },
  { input: 'Redmi K70 极速版', expected: '极速版' },
  { input: '华为P60 全网通5G版', expected: '全网通5G版' },
  { input: '小米13 5G版', expected: '5G版' },
  { input: 'iPhone 15 移动版', expected: '移动版' },
  { input: 'iPhone 15 Pro 国行版', expected: '国行版' },
];

let passed41 = 0;
let failed41 = 0;

testCases41.forEach((testCase, index) => {
  const result = versionExtractor.extractVersion(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed41++;
    console.log(`✓ Test ${index + 1}: "${testCase.input}" -> "${result}"`);
  } else {
    failed41++;
    console.log(`✗ Test ${index + 1}: "${testCase.input}" -> Expected: "${testCase.expected}", Got: "${result}"`);
  }
});

console.log(`\n需求 4.1 结果: ${passed41}/${testCases41.length} 通过\n`);

// 需求 4.3: 识别常见的版本标识词汇
console.log('需求 4.3: THE Version_Extractor SHALL 识别常见的版本标识词汇（活力版、标准版、青春版、至尊版、竞速版、极速版）\n');

const testCases43 = [
  { keyword: '活力版', input: 'VIVO X200 Pro 活力版 12GB+256GB' },
  { keyword: '标准版', input: 'OPPO A5 标准版 8GB+128GB' },
  { keyword: '青春版', input: 'Redmi K70 青春版 玉石绿' },
  { keyword: '至尊版', input: '华为Mate60 Pro 至尊版 16GB+512GB' },
  { keyword: '竞速版', input: 'IQOO Z10 竞速版 黑色' },
  { keyword: '极速版', input: 'Redmi K70 极速版 蓝色' },
  { keyword: '全网通5G版', input: '华为P60 全网通5G版' },
];

let passed43 = 0;
let failed43 = 0;

testCases43.forEach((testCase, index) => {
  const result = versionExtractor.extractVersion(testCase.input);
  const success = result === testCase.keyword;
  
  if (success) {
    passed43++;
    console.log(`✓ Test ${index + 1}: 识别 "${testCase.keyword}" 在 "${testCase.input}"`);
  } else {
    failed43++;
    console.log(`✗ Test ${index + 1}: 识别 "${testCase.keyword}" 在 "${testCase.input}" -> Got: "${result}"`);
  }
});

console.log(`\n需求 4.3 结果: ${passed43}/${testCases43.length} 通过\n`);

// 额外测试：versionsMatch 方法
console.log('额外测试: versionsMatch 方法\n');

const matchTestCases = [
  { v1: '活力版', v2: '活力版', expected: true, description: '相同版本应该匹配' },
  { v1: '活力版', v2: '标准版', expected: false, description: '不同版本不应该匹配' },
  { v1: '5G版', v2: '全网通5G版', expected: true, description: '同义词版本应该匹配' },
  { v1: '标准版', v2: '基础版', expected: true, description: '同义词版本应该匹配' },
  { v1: null, v2: null, expected: true, description: '两个都为空应该匹配' },
  { v1: '活力版', v2: null, expected: false, description: '一个为空不应该匹配' },
];

let passedMatch = 0;
let failedMatch = 0;

matchTestCases.forEach((testCase, index) => {
  const result = versionExtractor.versionsMatch(testCase.v1, testCase.v2);
  const success = result === testCase.expected;
  
  if (success) {
    passedMatch++;
    console.log(`✓ Test ${index + 1}: ${testCase.description} - "${testCase.v1}" vs "${testCase.v2}" -> ${result}`);
  } else {
    failedMatch++;
    console.log(`✗ Test ${index + 1}: ${testCase.description} - "${testCase.v1}" vs "${testCase.v2}" -> Expected: ${testCase.expected}, Got: ${result}`);
  }
});

console.log(`\nversionsMatch 结果: ${passedMatch}/${matchTestCases.length} 通过\n`);

// 总结
console.log('=== 总结 ===');
console.log(`需求 4.1: ${passed41}/${testCases41.length} 通过 (${(passed41 / testCases41.length * 100).toFixed(1)}%)`);
console.log(`需求 4.3: ${passed43}/${testCases43.length} 通过 (${(passed43 / testCases43.length * 100).toFixed(1)}%)`);
console.log(`versionsMatch: ${passedMatch}/${matchTestCases.length} 通过 (${(passedMatch / matchTestCases.length * 100).toFixed(1)}%)`);

const totalPassed = passed41 + passed43 + passedMatch;
const totalTests = testCases41.length + testCases43.length + matchTestCases.length;
console.log(`\n总体: ${totalPassed}/${totalTests} 通过 (${(totalPassed / totalTests * 100).toFixed(1)}%)`);

if (totalPassed === totalTests) {
  console.log('\n✓ 所有测试通过！VersionExtractor 满足需求 4.1 和 4.3');
} else {
  console.log(`\n✗ 有 ${totalTests - totalPassed} 个测试失败`);
}
