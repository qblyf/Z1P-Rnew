/**
 * Regression Test - 40 Real Error Cases
 * 回归测试 - 验证40个真实错误案例
 * 
 * 根据需求文档，这40个案例分为四类：
 * 1. 型号名称空格处理问题（8个案例）
 * 2. 手表产品型号识别问题（4个案例）
 * 3. 同型号多SKU混淆问题（2个案例）
 * 4. 产品系列版本识别问题（6个案例）
 * 5. 其他混合问题（20个案例）
 * 
 * 目标：至少95%的匹配准确率（38/40）
 */

import { smartMatcher } from './smartMatcher.js';

console.log('=== 回归测试 - 40个真实错误案例 ===\n');

interface TestCase {
  category: string;
  input: string;
  expected: string;
  description: string;
}

const testCases: TestCase[] = [
  // 类别1: 型号名称空格处理问题（8个案例）
  {
    category: '空格处理',
    input: 'Vivo S30Promini',
    expected: 'Vivo S30 Pro mini',
    description: '缺少空格的型号名称'
  },
  {
    category: '空格处理',
    input: 'IQOOZ10Turbo+',
    expected: 'IQOO Z10 Turbo+',
    description: '品牌和型号之间缺少空格'
  },
  {
    category: '空格处理',
    input: 'OPPOA5X活力版',
    expected: 'OPPO A5X 活力版',
    description: '品牌、型号、版本之间缺少空格'
  },
  {
    category: '空格处理',
    input: 'HiNova14Pro',
    expected: 'Hi Nova14 Pro',
    description: 'Hi品牌后缺少空格'
  },
  {
    category: '空格处理',
    input: 'iPhone16Plus',
    expected: 'iPhone16 Plus',
    description: 'Plus后缀前缺少空格'
  },
  {
    category: '空格处理',
    input: 'X200ProMax',
    expected: 'X200 Pro Max',
    description: '多个后缀之间缺少空格'
  },
  {
    category: '空格处理',
    input: 'MacBookAir',
    expected: 'MacBook Air',
    description: 'Air后缀前缺少空格'
  },
  {
    category: '空格处理',
    input: 'S24Ultra',
    expected: 'S24 Ultra',
    description: 'Ultra后缀前缺少空格'
  },

  // 类别2: 手表产品型号识别问题（4个案例）
  {
    category: '手表识别',
    input: 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶',
    expected: 'VIVO Watch GT WA2456C 软胶 夏夜黑 蓝牙版',
    description: '手表属性顺序不同但应匹配'
  },
  {
    category: '手表识别',
    input: 'VIVO Watch GT WA2456C 软胶 夏夜黑 蓝牙版',
    expected: 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶',
    description: '手表型号代码格式不同但应匹配'
  },
  {
    category: '手表识别',
    input: '华为手表 WA1234D eSIM版 46mm 黑色 金属',
    expected: '华为手表（WA1234D）金属 黑色 eSIM版 46mm',
    description: '手表属性顺序完全不同'
  },
  {
    category: '手表识别',
    input: 'VIVO Watch FIT4 蓝牙版 黑色 软胶',
    expected: 'VIVO Watch Fit 4 软胶 黑色 蓝牙版',
    description: 'Watch Fit系列识别'
  },

  // 类别3: 同型号多SKU混淆问题（2个案例）
  {
    category: '型号消歧',
    input: 'VIVO X200 Pro 12GB+256GB 玉石绿',
    expected: 'VIVO X200 Pro mini 12GB+256GB 玉石绿',
    description: 'X200 Pro 不应匹配 X200 Pro mini'
  },
  {
    category: '型号消歧',
    input: 'VIVO S30 Pro 12GB+256GB 黑色',
    expected: 'VIVO S30 Pro mini 12GB+256GB 黑色',
    description: 'S30 Pro 不应匹配 S30 Pro mini'
  },

  // 类别4: 产品系列版本识别问题（6个案例）
  {
    category: '版本识别',
    input: 'VIVO X200 Pro 活力版 12GB+256GB 玉石绿',
    expected: 'VIVO X200 Pro 标准版 12GB+256GB 玉石绿',
    description: '活力版不应匹配标准版'
  },
  {
    category: '版本识别',
    input: 'OPPO A5 活力版 8GB+128GB 黑色',
    expected: 'OPPO A5 青春版 8GB+128GB 黑色',
    description: '活力版不应匹配青春版'
  },
  {
    category: '版本识别',
    input: '小米14 至尊版 16GB+512GB 白色',
    expected: '小米14 标准版 16GB+512GB 白色',
    description: '至尊版不应匹配标准版'
  },
  {
    category: '版本识别',
    input: 'IQOO Z10 竞速版 12GB+256GB 黑色',
    expected: 'IQOO Z10 极速版 12GB+256GB 黑色',
    description: '竞速版不应匹配极速版'
  },
  {
    category: '版本识别',
    input: '华为Mate60 全网通5G版 12GB+256GB 黑色',
    expected: '华为Mate60 4G版 12GB+256GB 黑色',
    description: '5G版不应匹配4G版'
  },
  {
    category: '版本识别',
    input: 'iPhone 15 Pro 国行版 256GB 黑色',
    expected: 'iPhone 15 Pro 港版 256GB 黑色',
    description: '国行版不应匹配港版'
  },

  // 类别5: 其他混合问题（20个案例）
  {
    category: '混合',
    input: '华为Nova14 12GB+256GB 雾凇',
    expected: '华为畅享70X 12GB+256GB 雾凇',
    description: 'Nova14不应匹配畅享70X（不同系列）'
  },
  {
    category: '混合',
    input: '华为智慧屏V75 黑色',
    expected: '华为智慧屏V65 黑色',
    description: 'V75不应匹配V65（不同型号）'
  },
  {
    category: '混合',
    input: 'OPPO Pad 4 Pro 12GB+256GB 灰色',
    expected: 'OPPO Pad 3 Pro 12GB+256GB 灰色',
    description: 'Pad 4不应匹配Pad 3（不同代数）'
  },
  {
    category: '混合',
    input: 'VIVO Y50i 8GB+128GB 蓝色',
    expected: 'VIVO Y50m 8GB+128GB 蓝色',
    description: 'Y50i不应匹配Y50m（不同变体）'
  },
  {
    category: '混合',
    input: 'IQOO Neo10 12GB+256GB 黑色',
    expected: 'IQOO 12 12GB+256GB 黑色',
    description: 'Neo10不应匹配12（不同系列）'
  },
  {
    category: '混合',
    input: '华为MateBook 16S i7 16GB+512GB',
    expected: '华为MateBook E i7 16GB+512GB',
    description: 'MateBook 16S不应匹配MateBook E（不同系列）'
  },
  {
    category: '混合',
    input: '华为MateBook D 16 i7 16GB+512GB',
    expected: '华为MateBook D 14 i7 16GB+512GB',
    description: 'D 16不应匹配D 14（不同尺寸）'
  },
  {
    category: '混合',
    input: 'MacBook Air M2 13英寸 8GB+256GB',
    expected: 'MacBook Air M1 13英寸 8GB+256GB',
    description: 'M2不应匹配M1（不同芯片）'
  },
  {
    category: '混合',
    input: 'iPad Air 2024款 64GB 蓝色',
    expected: 'iPad Air 2022款 64GB 蓝色',
    description: '2024款不应匹配2022款（不同年份）'
  },
  {
    category: '混合',
    input: 'iPhone 15 Pro 256GB 深空黑',
    expected: 'iPhone 15 Pro 128GB 深空黑',
    description: '256GB不应匹配128GB（不同容量）'
  },
  {
    category: '混合',
    input: 'VIVO X200 Pro 12GB+256GB 玉石绿',
    expected: 'VIVO X200 Pro 12GB+256GB 黑色',
    description: '玉石绿不应匹配黑色（不同颜色）'
  },
  {
    category: '混合',
    input: '华为Mate60 Pro 12GB+256GB 雅川青',
    expected: '华为Mate60 12GB+256GB 雅川青',
    description: 'Mate60 Pro不应匹配Mate60（不同型号）'
  },
  {
    category: '混合',
    input: 'OPPO Reno12 Pro 12GB+256GB 黑色',
    expected: 'OPPO Reno12 12GB+256GB 黑色',
    description: 'Reno12 Pro不应匹配Reno12（不同型号）'
  },
  {
    category: '混合',
    input: '小米14 Ultra 16GB+512GB 黑色',
    expected: '小米14 Pro 16GB+512GB 黑色',
    description: '14 Ultra不应匹配14 Pro（不同型号）'
  },
  {
    category: '混合',
    input: '一加Ace 5 12GB+256GB 黑色',
    expected: '一加Ace 3 12GB+256GB 黑色',
    description: 'Ace 5不应匹配Ace 3（不同代数）'
  },
  {
    category: '混合',
    input: '荣耀Magic6 Pro 12GB+256GB 黑色',
    expected: '荣耀Magic6 12GB+256GB 黑色',
    description: 'Magic6 Pro不应匹配Magic6（不同型号）'
  },
  {
    category: '混合',
    input: '三星Galaxy S24 Ultra 12GB+256GB 黑色',
    expected: '三星Galaxy S24 Plus 12GB+256GB 黑色',
    description: 'S24 Ultra不应匹配S24 Plus（不同型号）'
  },
  {
    category: '混合',
    input: 'IQOO Z10 Turbo+ 12GB+256GB 黑色',
    expected: 'IQOO Z10 Turbo 12GB+256GB 黑色',
    description: 'Z10 Turbo+不应匹配Z10 Turbo（不同变体）'
  },
  {
    category: '混合',
    input: 'VIVO X100 Pro 16GB+512GB 黑色',
    expected: 'VIVO X200 Pro 16GB+512GB 黑色',
    description: 'X100不应匹配X200（不同代数）'
  },
  {
    category: '混合',
    input: '华为P60 Pro 12GB+256GB 黑色',
    expected: '华为P60 12GB+256GB 黑色',
    description: 'P60 Pro不应匹配P60（不同型号）'
  },
];

// 运行测试
let passedCount = 0;
let failedCount = 0;
const failedCases: Array<{ case: TestCase; score: number }> = [];

console.log('开始测试...\n');

for (let i = 0; i < testCases.length; i++) {
  const testCase = testCases[i];
  const score = smartMatcher.calculateMatchScore(testCase.input, testCase.expected);
  
  // 对于"不应匹配"的案例，分数应该低于阈值（< 0.65）
  // 对于"应该匹配"的案例（如手表、空格处理），分数应该高于阈值（>= 0.65）
  const shouldMatch = testCase.category === '手表识别' || testCase.category === '空格处理';
  const threshold = 0.65;
  
  let passed = false;
  if (shouldMatch) {
    // 应该匹配的案例
    passed = score >= threshold;
  } else {
    // 不应该匹配的案例
    passed = score < threshold;
  }
  
  if (passed) {
    passedCount++;
    console.log(`✅ 案例 ${i + 1} [${testCase.category}]: ${testCase.description}`);
    console.log(`   输入: ${testCase.input}`);
    console.log(`   期望: ${shouldMatch ? '匹配' : '不匹配'} ${testCase.expected}`);
    console.log(`   分数: ${(score * 100).toFixed(1)}% ${shouldMatch ? '>=' : '<'} ${threshold * 100}%`);
  } else {
    failedCount++;
    failedCases.push({ case: testCase, score });
    console.log(`❌ 案例 ${i + 1} [${testCase.category}]: ${testCase.description}`);
    console.log(`   输入: ${testCase.input}`);
    console.log(`   期望: ${shouldMatch ? '匹配' : '不匹配'} ${testCase.expected}`);
    console.log(`   分数: ${(score * 100).toFixed(1)}% ${shouldMatch ? '<' : '>='} ${threshold * 100}%`);
  }
  console.log();
}

// 统计结果
console.log('=== 测试结果 ===');
console.log(`总案例数: ${testCases.length}`);
console.log(`通过: ${passedCount}`);
console.log(`失败: ${failedCount}`);
console.log(`准确率: ${(passedCount / testCases.length * 100).toFixed(1)}%`);
console.log(`目标准确率: 95% (38/40)`);

if (passedCount >= 38) {
  console.log('\n✅ 达到目标准确率！');
} else {
  console.log(`\n❌ 未达到目标准确率，还需通过 ${38 - passedCount} 个案例`);
  
  if (failedCases.length > 0) {
    console.log('\n失败案例详情:');
    failedCases.forEach(({ case: tc, score }, index) => {
      console.log(`\n${index + 1}. [${tc.category}] ${tc.description}`);
      console.log(`   输入: ${tc.input}`);
      console.log(`   期望: ${tc.expected}`);
      console.log(`   分数: ${(score * 100).toFixed(1)}%`);
    });
  }
}

console.log('\n=== 测试完成 ===');
