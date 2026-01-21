/**
 * Manual test for SpaceHandler
 * Run with: npx ts-node .kiro/test-spaceHandler.ts
 */

import { spaceHandler } from './spaceHandler.js';

console.log('=== SpaceHandler Manual Tests ===\n');

// Test cases from requirements
const testCases = [
  // 品牌后添加空格
  { input: 'IQOOZ10', expected: 'IQOO Z10', description: 'IQOO brand spacing' },
  { input: 'OPPOA5', expected: 'OPPO A5', description: 'OPPO brand spacing' },
  { input: 'VIVOS30', expected: 'VIVO S30', description: 'VIVO brand spacing' },
  { input: 'HiNova14', expected: 'Hi Nova14', description: 'Hi brand spacing' },
  
  // 型号后缀前添加空格
  { input: 'X200Pro', expected: 'X200 Pro', description: 'Pro suffix spacing' },
  { input: 'iPhone16Max', expected: 'iPhone16 Max', description: 'Max suffix spacing' },
  { input: 'X200ProMini', expected: 'X200 Pro Mini', description: 'Mini suffix spacing' },
  { input: 'iPhone16Plus', expected: 'iPhone16 Plus', description: 'Plus suffix spacing' },
  { input: 'S24Ultra', expected: 'S24 Ultra', description: 'Ultra suffix spacing' },
  { input: 'iPhoneSE', expected: 'iPhone SE', description: 'SE suffix spacing' },
  { input: 'MacBookAir', expected: 'MacBook Air', description: 'Air suffix spacing' },
  { input: 'Z10Turbo', expected: 'Z10 Turbo', description: 'Turbo suffix spacing' },
  { input: 'Z10Turbo+', expected: 'Z10 Turbo+', description: 'Turbo+ suffix spacing' },
  
  // 中文版本后缀
  { input: 'A5活力版', expected: 'A5 活力版', description: 'Chinese version suffix' },
  { input: 'Nova14竞速版', expected: 'Nova14 竞速版', description: 'Chinese racing version' },
  
  // 特殊情况：Ace系列
  { input: 'ACE5', expected: 'Ace 5', description: 'Ace series uppercase' },
  { input: 'ace5', expected: 'Ace 5', description: 'Ace series lowercase' },
  
  // 特殊情况：MateBook系列
  { input: 'MateBookD16', expected: 'MateBook D 16', description: 'MateBook D16' },
  { input: 'MateBook16S', expected: 'MateBook 16 S', description: 'MateBook 16S' },
  
  // 大小写标准化
  { input: 'A5x', expected: 'A5X', description: 'Lowercase x to uppercase X' },
  { input: 'S30pro', expected: 'S30 Pro', description: 'Lowercase pro to Pro' },
  
  // 复杂案例
  { input: 'Vivo S30Promini', expected: 'Vivo S30 Pro Mini', description: 'Complex case from requirements' },
  { input: 'OPPOA5X活力版', expected: 'OPPO A5X 活力版', description: 'Complex case with Chinese' },
  
  // 幂等性测试
  { input: 'IQOO Z10', expected: 'IQOO Z10', description: 'Already normalized (idempotent)' },
  { input: 'iPhone 16 Pro', expected: 'iPhone 16 Pro', description: 'Already normalized (idempotent)' },
  
  // 清理多余空格
  { input: 'iPhone  16   Pro', expected: 'iPhone 16 Pro', description: 'Multiple spaces cleanup' },
  { input: '  OPPO  A5  ', expected: 'OPPO A5', description: 'Leading/trailing spaces' },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = spaceHandler.normalizeSpaces(testCase.input);
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

console.log('=== Test Summary ===');
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${(passed / testCases.length * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failed} test(s) failed!`);
  process.exit(1);
}
