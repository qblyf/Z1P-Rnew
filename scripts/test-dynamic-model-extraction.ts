/**
 * 测试动态型号提取系统
 * 
 * 验证：
 * 1. 型号索引是否正确构建
 * 2. 动态型号匹配是否工作
 * 3. 回退到正则表达式是否正常
 */

import { SimpleMatcher, SPUData } from '../utils/smartMatcher';

// 模拟 SPU 数据
const mockSPUList: SPUData[] = [
  { id: 1, name: '华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带', brand: '华为' },
  { id: 2, name: 'OPPO Reno 15 智能手机 12GB+256GB 极光蓝', brand: 'OPPO' },
  { id: 3, name: 'OPPO Reno 15 Pro 智能手机 16GB+512GB 蜜糖金', brand: 'OPPO' },
  { id: 4, name: 'OPPO Pad 4 Pro 2025款 13.2英寸 WiFi版 16GB+512GB 深空灰', brand: 'OPPO' },
  { id: 5, name: 'vivo Y50 智能手机 8GB+128GB 黑色', brand: 'vivo' },
  { id: 6, name: '小米 14 Pro 智能手机 12GB+256GB 白色', brand: '小米' },
  { id: 7, name: '红米 K70 Pro 智能手机 16GB+512GB 黑色', brand: '红米' },
];

// 模拟品牌库
const mockBrandList = [
  { name: '华为', spell: 'huawei' },
  { name: 'OPPO', spell: 'oppo' },
  { name: 'vivo', spell: 'vivo' },
  { name: '小米', spell: 'xiaomi' },
  { name: '红米', spell: 'redmi' },
];

async function testDynamicModelExtraction() {
  console.log('='.repeat(80));
  console.log('测试动态型号提取系统');
  console.log('='.repeat(80));
  console.log();
  
  // 初始化 matcher
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  matcher.setBrandList(mockBrandList);
  
  // 构建 SPU 索引（包括型号索引）
  console.log('1. 构建 SPU 索引和型号索引');
  console.log('-'.repeat(80));
  matcher.buildSPUIndex(mockSPUList);
  console.log();
  
  // 测试用例
  const testCases = [
    {
      input: '华为 Watch十周年款 46mm蓝色',
      expectedBrand: '华为',
      expectedModel: 'watch十周年款',
      description: '测试中文型号提取（十周年款）',
    },
    {
      input: 'OPPO Reno15 16+256极光蓝',
      expectedBrand: 'OPPO',
      expectedModel: 'reno15',
      description: '测试连写型号提取（Reno15）',
    },
    {
      input: 'OPPO Pad4Pro 16+512 WiFi版深空灰',
      expectedBrand: 'OPPO',
      expectedModel: 'pad4pro',
      description: '测试平板型号提取（Pad4Pro）',
    },
    {
      input: 'vivo Y50 8+128黑色',
      expectedBrand: 'vivo',
      expectedModel: 'y50',
      description: '测试简单型号提取（Y50）',
    },
    {
      input: '小米 14 Pro 12+256白色',
      expectedBrand: '小米',
      expectedModel: '14pro',
      description: '测试复杂型号提取（14 Pro）',
    },
  ];
  
  console.log('2. 测试型号提取');
  console.log('-'.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.description}`);
    console.log(`输入: "${testCase.input}"`);
    
    const brand = matcher.extractBrand(testCase.input);
    const model = matcher.extractModel(testCase.input, brand);
    
    console.log(`提取品牌: "${brand}" (期望: "${testCase.expectedBrand}")`);
    console.log(`提取型号: "${model}" (期望: "${testCase.expectedModel}")`);
    
    const brandMatch = brand?.toLowerCase() === testCase.expectedBrand.toLowerCase();
    const modelMatch = model?.toLowerCase() === testCase.expectedModel.toLowerCase();
    
    if (brandMatch && modelMatch) {
      console.log('✅ 通过');
      passCount++;
    } else {
      console.log('❌ 失败');
      if (!brandMatch) console.log(`  品牌不匹配: "${brand}" !== "${testCase.expectedBrand}"`);
      if (!modelMatch) console.log(`  型号不匹配: "${model}" !== "${testCase.expectedModel}"`);
      failCount++;
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log(`测试结果: ${passCount} 通过, ${failCount} 失败`);
  console.log('='.repeat(80));
  
  // 测试 SPU 匹配
  console.log();
  console.log('3. 测试 SPU 匹配');
  console.log('-'.repeat(80));
  
  const matchTestCases = [
    {
      input: '华为 Watch十周年款 46mm蓝色',
      expectedSPU: '华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带',
    },
    {
      input: 'OPPO Reno15 16+256极光蓝',
      expectedSPU: 'OPPO Reno 15 智能手机 12GB+256GB 极光蓝',
    },
    {
      input: 'OPPO Pad4Pro 16+512 WiFi版深空灰',
      expectedSPU: 'OPPO Pad 4 Pro 2025款 13.2英寸 WiFi版 16GB+512GB 深空灰',
    },
  ];
  
  for (const testCase of matchTestCases) {
    console.log(`\n输入: "${testCase.input}"`);
    console.log(`期望匹配: "${testCase.expectedSPU}"`);
    
    const result = matcher.findBestSPUMatch(testCase.input, mockSPUList);
    
    if (result.spu) {
      console.log(`实际匹配: "${result.spu.name}"`);
      console.log(`匹配分数: ${result.similarity.toFixed(2)}`);
      
      if (result.spu.name === testCase.expectedSPU) {
        console.log('✅ 匹配正确');
      } else {
        console.log('❌ 匹配错误');
      }
    } else {
      console.log('❌ 未匹配到任何 SPU');
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('测试完成');
  console.log('='.repeat(80));
}

// 运行测试
testDynamicModelExtraction().catch(console.error);
