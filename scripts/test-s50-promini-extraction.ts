/**
 * 测试 S50 Pro mini 型号提取问题
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function testS50ProMiniExtraction() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  console.log('=== 测试 S50 Pro mini 型号提取 ===\n');
  
  // 测试用例
  const testCases = [
    {
      name: '输入（连写）',
      input: 'Vivo S50Promini',
    },
    {
      name: 'SPU（带空格）',
      input: 'vivo S50 Pro mini',
    },
    {
      name: 'SPU完整名称',
      input: 'vivo S50 Pro mini 全网通5G 16GB+512GB 告白',
    },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}: "${testCase.input}"`);
    console.log('---');
    
    // 提取 SPU 部分
    const spuPart = (matcher as any).extractSPUPart(testCase.input);
    console.log(`1. SPU部分: "${spuPart}"`);
    
    // 提取品牌
    const brand = matcher.extractBrand(spuPart);
    console.log(`2. 品牌: "${brand}"`);
    
    // 预处理型号字符串
    const lowerStr = spuPart.toLowerCase();
    const preprocessed = (matcher as any).preprocessModelString(lowerStr);
    console.log(`3. 预处理后: "${preprocessed}"`);
    
    // 尝试从动态索引提取
    console.log(`4. 动态索引提取:`);
    const dynamicModel = (matcher as any).extractModelFromIndex(preprocessed, brand);
    console.log(`   结果: ${dynamicModel ? `"${dynamicModel}"` : 'null'}`);
    
    // 标准化
    const normalized = (matcher as any).normalizeModel(preprocessed);
    console.log(`5. 标准化后: "${normalized}"`);
    
    // 尝试复杂型号提取
    console.log(`6. 复杂型号提取:`);
    const complexModel = (matcher as any).extractComplexModel(normalized);
    console.log(`   结果: ${complexModel ? `"${complexModel}"` : 'null'}`);
    
    // 尝试简单型号提取
    console.log(`7. 简单型号提取:`);
    const simpleModel = (matcher as any).extractSimpleModel(preprocessed);
    console.log(`   结果: ${simpleModel ? `"${simpleModel}"` : 'null'}`);
    
    // 最终提取结果
    const finalModel = matcher.extractModel(spuPart, brand);
    console.log(`\n✓ 最终提取型号: "${finalModel}"`);
  }
}

testS50ProMiniExtraction().catch(console.error);
