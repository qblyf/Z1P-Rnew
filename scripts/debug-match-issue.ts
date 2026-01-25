/**
 * 调试匹配问题脚本
 * 
 * 问题：红米15R 4+128星岩黑 匹配到 WIWU 青春手提包电脑包15.6寸
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function debugMatch() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  const input = '红米15R 4+128星岩黑';
  const wrongSPU = 'WIWU 青春手提包电脑包15.6寸';
  
  console.log('=== 调试匹配问题 ===\n');
  
  // 1. 测试品牌提取
  console.log('1. 品牌提取测试:');
  const inputBrand = matcher.extractBrand(input);
  const wrongBrand = matcher.extractBrand(wrongSPU);
  console.log(`  输入品牌: "${inputBrand}"`);
  console.log(`  错误SPU品牌: "${wrongBrand}"`);
  console.log('');
  
  // 2. 测试型号提取
  console.log('2. 型号提取测试:');
  
  // 预处理
  const processedInput = matcher.preprocessInputAdvanced(input);
  const processedWrong = matcher.preprocessInputAdvanced(wrongSPU);
  console.log(`  预处理后输入: "${processedInput}"`);
  console.log(`  预处理后错误SPU: "${processedWrong}"`);
  
  const inputModel = matcher.extractModel(processedInput);
  const wrongModel = matcher.extractModel(processedWrong);
  console.log(`  输入型号: "${inputModel}"`);
  console.log(`  错误SPU型号: "${wrongModel}"`);
  console.log('');
  
  // 3. 测试 SPU 部分提取
  console.log('3. SPU 部分提取测试:');
  const inputSPUPart = matcher.extractSPUPart(processedInput);
  const wrongSPUPart = matcher.extractSPUPart(processedWrong);
  console.log(`  输入SPU部分: "${inputSPUPart}"`);
  console.log(`  错误SPU部分: "${wrongSPUPart}"`);
  console.log('');
  
  // 4. 测试品牌匹配
  console.log('4. 品牌匹配测试:');
  if (inputBrand && wrongBrand) {
    // @ts-ignore - 访问私有方法用于调试
    const brandMatch = matcher.isBrandMatch(inputBrand, wrongBrand);
    console.log(`  "${inputBrand}" 和 "${wrongBrand}" 是否匹配: ${brandMatch}`);
  } else {
    console.log('  无法测试品牌匹配（品牌提取失败）');
  }
  console.log('');
  
  // 5. 分析问题
  console.log('5. 问题分析:');
  if (!inputBrand) {
    console.log('  ❌ 问题1: 输入品牌提取失败！');
    console.log('     原因: 品牌库中可能没有"红米"或品牌提取逻辑有问题');
    console.log('     影响: 会在所有SPU中搜索，导致误匹配');
  }
  
  if (!wrongBrand) {
    console.log('  ❌ 问题2: 错误SPU品牌提取失败！');
    console.log('     原因: 品牌库中可能没有"WIWU"');
  }
  
  if (inputModel && wrongModel) {
    if (inputModel.includes('15') && wrongModel.includes('15')) {
      console.log('  ⚠️  问题3: 型号都包含"15"，可能导致误匹配');
      console.log(`     输入型号: ${inputModel}`);
      console.log(`     错误SPU型号: ${wrongModel}`);
    }
  }
  
  if (!inputBrand && !wrongBrand) {
    console.log('  ❌ 严重问题: 两个品牌都提取失败！');
    console.log('     这会导致系统在没有品牌过滤的情况下进行匹配');
    console.log('     只要型号相似（都包含15），就可能误匹配');
  }
  
  console.log('\n=== 建议修复方案 ===');
  console.log('1. 检查品牌库是否包含"红米"和"WIWU"');
  console.log('2. 如果品牌库缺失，需要添加这些品牌');
  console.log('3. 增强品牌过滤：如果输入品牌识别成功，必须严格过滤SPU品牌');
  console.log('4. 改进型号匹配：避免仅凭数字部分匹配（15 vs 15.6）');
  console.log('5. 添加产品类型过滤：手机和配件不应该匹配');
}

// 运行调试
debugMatch().catch(console.error);
