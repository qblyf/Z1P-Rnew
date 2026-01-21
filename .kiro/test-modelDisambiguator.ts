/**
 * Manual test for ModelDisambiguator
 * Run with: npx ts-node .kiro/test-modelDisambiguator.ts
 */

import { modelDisambiguator } from './modelDisambiguator.js';

console.log('=== ModelDisambiguator Manual Tests ===\n');

// Test cases from requirements
const testCases = [
  // extractFullModel tests
  {
    method: 'extractFullModel',
    input: 'VIVO X200',
    expected: 'X200',
    description: 'Extract basic model code',
  },
  {
    method: 'extractFullModel',
    input: 'VIVO X200 Pro',
    expected: 'X200 Pro',
    description: 'Extract model with single suffix',
  },
  {
    method: 'extractFullModel',
    input: 'VIVO X200 Pro mini',
    expected: 'X200 Pro Mini',
    description: 'Extract model with multiple suffixes',
  },
  {
    method: 'extractFullModel',
    input: 'vivo x200 pro',
    expected: 'X200 Pro',
    description: 'Handle case insensitivity',
  },
  {
    method: 'extractFullModel',
    input: 'VIVOX200Pro',
    expected: 'X200 Pro',
    description: 'Handle models without spaces',
  },
  {
    method: 'extractFullModel',
    input: 'VIVO X200 Pro 活力版',
    expected: 'X200 Pro',
    description: 'Extract model ignoring version suffix',
  },
  {
    method: 'extractFullModel',
    input: 'Vivo S30 Pro',
    expected: 'S30 Pro',
    description: 'Extract S30 Pro model',
  },
  {
    method: 'extractFullModel',
    input: 'Vivo S30 Pro mini',
    expected: 'S30 Pro Mini',
    description: 'Extract S30 Pro mini model',
  },
  {
    method: 'extractFullModel',
    input: 'VivoS30Promini',
    expected: 'S30 Pro Mini',
    description: 'Extract S30 Pro mini without spaces',
  },
  {
    method: 'extractFullModel',
    input: 'OPPO A5',
    expected: 'A5',
    description: 'Extract OPPO A5 model',
  },
  {
    method: 'extractFullModel',
    input: 'IQOO Z10 Turbo',
    expected: 'Z10 Turbo',
    description: 'Extract Z10 Turbo model',
  },
];

// modelsExactMatch tests
const matchTests = [
  {
    method: 'modelsExactMatch',
    input1: 'X200 Pro',
    input2: 'X200 Pro',
    expected: true,
    description: 'Match identical models',
  },
  {
    method: 'modelsExactMatch',
    input1: 'X200 Pro',
    input2: 'X200Pro',
    expected: true,
    description: 'Match models with different spacing',
  },
  {
    method: 'modelsExactMatch',
    input1: 'X200 Pro',
    input2: 'x200 pro',
    expected: true,
    description: 'Match models with different casing',
  },
  {
    method: 'modelsExactMatch',
    input1: 'X200 Pro',
    input2: 'X200 Pro mini',
    expected: false,
    description: 'Do not match different models (Pro vs Pro mini)',
  },
  {
    method: 'modelsExactMatch',
    input1: 'X200 Pro',
    input2: 'X200 Max',
    expected: false,
    description: 'Do not match different suffixes',
  },
  {
    method: 'modelsExactMatch',
    input1: 'X200',
    input2: 'X200 Pro',
    expected: false,
    description: 'Do not match base model with suffixed model',
  },
  {
    method: 'modelsExactMatch',
    input1: 'S30 Pro',
    input2: 'S30 Pro mini',
    expected: false,
    description: 'Do not match S30 Pro with S30 Pro mini',
  },
];

// calculateModelMatchScore tests
const scoreTests = [
  {
    method: 'calculateModelMatchScore',
    input1: 'X200 Pro',
    input2: 'X200 Pro',
    expected: 1.0,
    description: 'Score 1.0 for exact matches',
  },
  {
    method: 'calculateModelMatchScore',
    input1: 'X200 Pro',
    input2: 'X200Pro',
    expected: 1.0,
    description: 'Score 1.0 for matches with different spacing',
  },
  {
    method: 'calculateModelMatchScore',
    input1: 'X200 Pro',
    input2: 'X200 Pro mini',
    expected: 0.0,
    description: 'Score 0.0 for models with different suffixes (Pro vs Pro mini)',
  },
  {
    method: 'calculateModelMatchScore',
    input1: 'X200',
    input2: 'X200 Pro',
    expected: 0.0,
    description: 'Score 0.0 for base model vs suffixed model',
  },
  {
    method: 'calculateModelMatchScore',
    input1: 'X200 Pro',
    input2: 'X200 Max',
    expected: 0.3,
    description: 'Score 0.3 for same base model with different suffixes',
  },
  {
    method: 'calculateModelMatchScore',
    input1: 'X200 Pro',
    input2: 'X100 Pro',
    expected: 0.0,
    description: 'Score 0.0 for completely different models',
  },
  {
    method: 'calculateModelMatchScore',
    input1: 'S30 Pro',
    input2: 'S30 Pro mini',
    expected: 0.0,
    description: 'Score 0.0 for S30 Pro vs S30 Pro mini',
  },
];

// shouldExcludeCandidate tests
const excludeTests = [
  {
    method: 'shouldExcludeCandidate',
    input1: 'X200 Pro',
    input2: 'X200 Pro mini',
    expected: true,
    description: 'Exclude candidates with extra suffixes',
  },
  {
    method: 'shouldExcludeCandidate',
    input1: 'A5',
    input2: 'A5 Pro',
    expected: true,
    description: 'Exclude A5 Pro when input is A5',
  },
  {
    method: 'shouldExcludeCandidate',
    input1: 'X200 Pro',
    input2: 'X200 Pro',
    expected: false,
    description: 'Do not exclude exact matches',
  },
  {
    method: 'shouldExcludeCandidate',
    input1: 'X200 Pro mini',
    input2: 'X200 Pro',
    expected: false,
    description: 'Do not exclude more general candidates',
  },
  {
    method: 'shouldExcludeCandidate',
    input1: 'X200 Pro',
    input2: 'X100 Pro',
    expected: false,
    description: 'Do not exclude completely different models',
  },
  {
    method: 'shouldExcludeCandidate',
    input1: 'S30 Pro',
    input2: 'S30 Pro mini',
    expected: true,
    description: 'Exclude S30 Pro mini when input is S30 Pro',
  },
];

let passed = 0;
let failed = 0;

// Run extractFullModel tests
console.log('--- extractFullModel Tests ---\n');
testCases.forEach((testCase, index) => {
  const result = modelDisambiguator.extractFullModel(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input:    "${testCase.input}"`);
    console.log(`  Output:   "${result}"`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input:    "${testCase.input}"`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Got:      "${result}"`);
  }
  console.log();
});

// Run modelsExactMatch tests
console.log('--- modelsExactMatch Tests ---\n');
matchTests.forEach((testCase, index) => {
  const result = modelDisambiguator.modelsExactMatch(testCase.input1, testCase.input2);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input1:   "${testCase.input1}"`);
    console.log(`  Input2:   "${testCase.input2}"`);
    console.log(`  Output:   ${result}`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input1:   "${testCase.input1}"`);
    console.log(`  Input2:   "${testCase.input2}"`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got:      ${result}`);
  }
  console.log();
});

// Run calculateModelMatchScore tests
console.log('--- calculateModelMatchScore Tests ---\n');
scoreTests.forEach((testCase, index) => {
  const result = modelDisambiguator.calculateModelMatchScore(testCase.input1, testCase.input2);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input1:   "${testCase.input1}"`);
    console.log(`  Input2:   "${testCase.input2}"`);
    console.log(`  Output:   ${result}`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input1:   "${testCase.input1}"`);
    console.log(`  Input2:   "${testCase.input2}"`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got:      ${result}`);
  }
  console.log();
});

// Run shouldExcludeCandidate tests
console.log('--- shouldExcludeCandidate Tests ---\n');
excludeTests.forEach((testCase, index) => {
  const result = modelDisambiguator.shouldExcludeCandidate(testCase.input1, testCase.input2);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input1:   "${testCase.input1}"`);
    console.log(`  Input2:   "${testCase.input2}"`);
    console.log(`  Output:   ${result}`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input1:   "${testCase.input1}"`);
    console.log(`  Input2:   "${testCase.input2}"`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got:      ${result}`);
  }
  console.log();
});

const totalTests = testCases.length + matchTests.length + scoreTests.length + excludeTests.length;

console.log('=== Test Summary ===');
console.log(`Total: ${totalTests}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${(passed / totalTests * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failed} test(s) failed!`);
  process.exit(1);
}
