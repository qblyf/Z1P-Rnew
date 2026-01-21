/**
 * Requirements-based test for ModelDisambiguator
 * Tests specific requirements from the design document
 * Run with: npx tsx .kiro/test-modelDisambiguator-requirements.ts
 */

import { modelDisambiguator } from './modelDisambiguator.js';

console.log('=== ModelDisambiguator Requirements Tests ===\n');

// 需求 3.1: WHEN 输入包含完整型号名称（如"X200 Pro"），
// THE Model_Disambiguator SHALL 排除相似但不同的型号（如"X200 Pro mini"）
console.log('--- 需求 3.1: 排除相似但不同的型号 ---\n');

const req31Tests = [
  {
    input: 'X200 Pro',
    candidate: 'X200 Pro mini',
    shouldExclude: true,
    description: 'X200 Pro 应该排除 X200 Pro mini',
  },
  {
    input: 'S30 Pro',
    candidate: 'S30 Pro mini',
    shouldExclude: true,
    description: 'S30 Pro 应该排除 S30 Pro mini',
  },
  {
    input: 'A5',
    candidate: 'A5 Pro',
    shouldExclude: true,
    description: 'A5 应该排除 A5 Pro',
  },
];

let req31Passed = 0;
req31Tests.forEach((test, index) => {
  const result = modelDisambiguator.shouldExcludeCandidate(test.input, test.candidate);
  const success = result === test.shouldExclude;
  
  if (success) {
    req31Passed++;
    console.log(`✓ Test ${index + 1}: ${test.description}`);
  } else {
    console.log(`✗ Test ${index + 1}: ${test.description}`);
    console.log(`  Expected: ${test.shouldExclude}, Got: ${result}`);
  }
});

console.log(`\n需求 3.1 通过率: ${req31Passed}/${req31Tests.length}\n`);

// 需求 3.2: WHEN 比较型号时，THE Model_Disambiguator SHALL 识别型号后缀的完整性（Pro vs Pro mini）
console.log('--- 需求 3.2: 识别型号后缀的完整性 ---\n');

const req32Tests = [
  {
    model1: 'X200 Pro',
    model2: 'X200 Pro mini',
    shouldMatch: false,
    description: 'X200 Pro 和 X200 Pro mini 不应该匹配',
  },
  {
    model1: 'X200 Pro',
    model2: 'X200 Pro',
    shouldMatch: true,
    description: 'X200 Pro 和 X200 Pro 应该匹配',
  },
  {
    model1: 'S30 Pro',
    model2: 'S30 Pro mini',
    shouldMatch: false,
    description: 'S30 Pro 和 S30 Pro mini 不应该匹配',
  },
];

let req32Passed = 0;
req32Tests.forEach((test, index) => {
  const result = modelDisambiguator.modelsExactMatch(test.model1, test.model2);
  const success = result === test.shouldMatch;
  
  if (success) {
    req32Passed++;
    console.log(`✓ Test ${index + 1}: ${test.description}`);
  } else {
    console.log(`✗ Test ${index + 1}: ${test.description}`);
    console.log(`  Expected: ${test.shouldMatch}, Got: ${result}`);
  }
});

console.log(`\n需求 3.2 通过率: ${req32Passed}/${req32Tests.length}\n`);

// 需求 3.3: THE Model_Disambiguator SHALL 为完全匹配的型号分配更高的相似度分数
console.log('--- 需求 3.3: 完全匹配分配更高的相似度分数 ---\n');

const req33Tests = [
  {
    model1: 'X200 Pro',
    model2: 'X200 Pro',
    expectedScore: 1.0,
    description: '完全匹配应该得分 1.0',
  },
  {
    model1: 'X200 Pro',
    model2: 'X200 Pro mini',
    expectedScore: 0.0,
    description: '不同型号应该得分 0.0',
  },
  {
    model1: 'X200 Pro',
    model2: 'X200 Max',
    expectedScore: 0.3,
    description: '相同基础型号但不同后缀应该得分 0.3',
  },
];

let req33Passed = 0;
req33Tests.forEach((test, index) => {
  const result = modelDisambiguator.calculateModelMatchScore(test.model1, test.model2);
  const success = result === test.expectedScore;
  
  if (success) {
    req33Passed++;
    console.log(`✓ Test ${index + 1}: ${test.description}`);
    console.log(`  Score: ${result}`);
  } else {
    console.log(`✗ Test ${index + 1}: ${test.description}`);
    console.log(`  Expected: ${test.expectedScore}, Got: ${result}`);
  }
});

console.log(`\n需求 3.3 通过率: ${req33Passed}/${req33Tests.length}\n`);

// 需求 3.4: WHEN 型号名称包含"mini"、"Plus"等后缀时，
// THE Model_Disambiguator SHALL 将其视为型号的一部分而非可选属性
console.log('--- 需求 3.4: 后缀视为型号的一部分 ---\n');

const req34Tests = [
  {
    productName: 'VIVO X200 Pro mini',
    expectedModel: 'X200 Pro Mini',
    description: 'mini 应该被视为型号的一部分',
  },
  {
    productName: 'OPPO A5 Plus',
    expectedModel: 'A5 Plus',
    description: 'Plus 应该被视为型号的一部分',
  },
  {
    productName: 'IQOO Z10 Turbo',
    expectedModel: 'Z10 Turbo',
    description: 'Turbo 应该被视为型号的一部分',
  },
];

let req34Passed = 0;
req34Tests.forEach((test, index) => {
  const result = modelDisambiguator.extractFullModel(test.productName);
  const success = result === test.expectedModel;
  
  if (success) {
    req34Passed++;
    console.log(`✓ Test ${index + 1}: ${test.description}`);
    console.log(`  Extracted: ${result}`);
  } else {
    console.log(`✗ Test ${index + 1}: ${test.description}`);
    console.log(`  Expected: ${test.expectedModel}, Got: ${result}`);
  }
});

console.log(`\n需求 3.4 通过率: ${req34Passed}/${req34Tests.length}\n`);

// 需求 3.5: THE Matching_Algorithm SHALL 在型号不完全匹配时降低相似度分数至阈值以下
console.log('--- 需求 3.5: 型号不完全匹配时降低相似度分数 ---\n');

const req35Tests = [
  {
    model1: 'X200 Pro',
    model2: 'X200 Pro mini',
    description: 'X200 Pro vs X200 Pro mini 应该得分 0.0（低于阈值）',
    threshold: 0.65,
  },
  {
    model1: 'S30 Pro',
    model2: 'S30 Pro mini',
    description: 'S30 Pro vs S30 Pro mini 应该得分 0.0（低于阈值）',
    threshold: 0.65,
  },
  {
    model1: 'A5',
    model2: 'A5 Pro',
    description: 'A5 vs A5 Pro 应该得分 0.0（低于阈值）',
    threshold: 0.65,
  },
];

let req35Passed = 0;
req35Tests.forEach((test, index) => {
  const score = modelDisambiguator.calculateModelMatchScore(test.model1, test.model2);
  const success = score < test.threshold;
  
  if (success) {
    req35Passed++;
    console.log(`✓ Test ${index + 1}: ${test.description}`);
    console.log(`  Score: ${score} (< ${test.threshold})`);
  } else {
    console.log(`✗ Test ${index + 1}: ${test.description}`);
    console.log(`  Score: ${score} (应该 < ${test.threshold})`);
  }
});

console.log(`\n需求 3.5 通过率: ${req35Passed}/${req35Tests.length}\n`);

// 真实案例测试：从需求文档中的错误案例
console.log('--- 真实案例测试 ---\n');

const realWorldTests = [
  {
    description: '案例1: Vivo S30Promini 应该被识别为 S30 Pro Mini',
    input: 'Vivo S30Promini',
    expected: 'S30 Pro Mini',
  },
  {
    description: '案例2: VIVO X200 Pro 不应该匹配 X200 Pro mini',
    input1: 'VIVO X200 Pro',
    input2: 'VIVO X200 Pro mini',
    shouldMatch: false,
  },
];

let realWorldPassed = 0;

// 测试案例1
const case1Result = modelDisambiguator.extractFullModel(realWorldTests[0].input);
if (case1Result === realWorldTests[0].expected) {
  realWorldPassed++;
  console.log(`✓ ${realWorldTests[0].description}`);
  console.log(`  Extracted: ${case1Result}`);
} else {
  console.log(`✗ ${realWorldTests[0].description}`);
  console.log(`  Expected: ${realWorldTests[0].expected}, Got: ${case1Result}`);
}
console.log();

// 测试案例2
const case2Model1 = modelDisambiguator.extractFullModel(realWorldTests[1].input1);
const case2Model2 = modelDisambiguator.extractFullModel(realWorldTests[1].input2);
const case2Match = modelDisambiguator.modelsExactMatch(case2Model1, case2Model2);
if (case2Match === realWorldTests[1].shouldMatch) {
  realWorldPassed++;
  console.log(`✓ ${realWorldTests[1].description}`);
  console.log(`  Model1: ${case2Model1}, Model2: ${case2Model2}, Match: ${case2Match}`);
} else {
  console.log(`✗ ${realWorldTests[1].description}`);
  console.log(`  Model1: ${case2Model1}, Model2: ${case2Model2}`);
  console.log(`  Expected Match: ${realWorldTests[1].shouldMatch}, Got: ${case2Match}`);
}
console.log();

console.log(`真实案例通过率: ${realWorldPassed}/${realWorldTests.length}\n`);

// 总结
console.log('=== 总结 ===');
const totalTests = req31Tests.length + req32Tests.length + req33Tests.length + req34Tests.length + req35Tests.length + realWorldTests.length;
const totalPassed = req31Passed + req32Passed + req33Passed + req34Passed + req35Passed + realWorldPassed;

console.log(`需求 3.1 (排除相似型号): ${req31Passed}/${req31Tests.length}`);
console.log(`需求 3.2 (识别后缀完整性): ${req32Passed}/${req32Tests.length}`);
console.log(`需求 3.3 (完全匹配高分): ${req33Passed}/${req33Tests.length}`);
console.log(`需求 3.4 (后缀视为型号): ${req34Passed}/${req34Tests.length}`);
console.log(`需求 3.5 (不匹配降低分数): ${req35Passed}/${req35Tests.length}`);
console.log(`真实案例: ${realWorldPassed}/${realWorldTests.length}`);
console.log(`\n总计: ${totalPassed}/${totalTests}`);
console.log(`成功率: ${(totalPassed / totalTests * 100).toFixed(1)}%`);

if (totalPassed === totalTests) {
  console.log('\n✓ 所有需求测试通过！');
  process.exit(0);
} else {
  console.log(`\n✗ ${totalTests - totalPassed} 个测试失败！`);
  process.exit(1);
}
