/**
 * 诊断红米15R匹配问题
 * 
 * 输入: 红米15R 4+128星岩黑
 * 预期: 应该匹配到 红米 15R 全网通5G版 4GB+128GB 星岩黑
 * 实际: 没有匹配到商品
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function diagnoseRedmi15RIssue() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  const input = '红米15R 4+128星岩黑';
  const expectedSPU = '红米 15R 全网通5G版 4GB+128GB 星岩黑';
  
  console.log('=== 红米15R匹配问题诊断 ===\n');
  console.log(`输入: "${input}"`);
  console.log(`预期SPU: "${expectedSPU}"`);
  console.log('');
  
  // 步骤1: 预处理
  console.log('步骤1: 输入预处理');
  const cleaned = matcher.cleanDemoMarkers(input);
  console.log(`  清理后: "${cleaned}"`);
  
  const processed = matcher.preprocessInputAdvanced(cleaned);
  console.log(`  预处理后: "${processed}"`);
  console.log('');
  
  // 步骤2: 提取SPU部分
  console.log('步骤2: 提取SPU部分');
  const inputSPUPart = matcher.extractSPUPart(processed);
  console.log(`  输入SPU部分: "${inputSPUPart}"`);
  
  const expectedSPUPart = matcher.extractSPUPart(expectedSPU);
  console.log(`  预期SPU部分: "${expectedSPUPart}"`);
  console.log('');
  
  // 步骤3: 品牌提取
  console.log('步骤3: 品牌提取');
  const inputBrand = matcher.extractBrand(inputSPUPart);
  console.log(`  输入品牌: "${inputBrand}"`);
  
  const expectedBrand = matcher.extractBrand(expectedSPUPart);
  console.log(`  预期品牌: "${expectedBrand}"`);
  
  if (inputBrand !== expectedBrand) {
    console.log(`  ❌ 品牌不匹配！`);
  } else {
    console.log(`  ✓ 品牌匹配`);
  }
  console.log('');
  
  // 步骤4: 型号提取
  console.log('步骤4: 型号提取');
  const inputModel = matcher.extractModel(inputSPUPart);
  console.log(`  输入型号: "${inputModel}"`);
  
  const expectedModel = matcher.extractModel(expectedSPUPart);
  console.log(`  预期型号: "${expectedModel}"`);
  
  if (inputModel !== expectedModel) {
    console.log(`  ⚠️  型号不完全匹配`);
    
    // 检查标准化后是否匹配
    if (inputModel && expectedModel) {
      const inputNormalized = inputModel.toLowerCase().replace(/\s+/g, '');
      const expectedNormalized = expectedModel.toLowerCase().replace(/\s+/g, '');
      
      console.log(`  标准化后比较:`);
      console.log(`    输入: "${inputNormalized}"`);
      console.log(`    预期: "${expectedNormalized}"`);
      
      if (inputNormalized === expectedNormalized) {
        console.log(`    ✓ 标准化后匹配`);
      } else {
        console.log(`    ❌ 标准化后仍不匹配！`);
      }
    }
  } else {
    console.log(`  ✓ 型号匹配`);
  }
  console.log('');
  
  // 步骤5: 版本提取
  console.log('步骤5: 版本提取');
  const inputVersion = matcher.extractVersion(processed);
  console.log(`  输入版本: ${inputVersion ? `"${inputVersion.name}"` : 'null'}`);
  
  const expectedVersion = matcher.extractVersion(expectedSPU);
  console.log(`  预期版本: ${expectedVersion ? `"${expectedVersion.name}"` : 'null'}`);
  console.log('');
  
  // 步骤6: 容量提取
  console.log('步骤6: 容量提取');
  const inputCapacity = matcher.extractCapacity(processed);
  console.log(`  输入容量: "${inputCapacity}"`);
  
  const expectedCapacity = matcher.extractCapacity(expectedSPU);
  console.log(`  预期容量: "${expectedCapacity}"`);
  
  if (inputCapacity !== expectedCapacity) {
    console.log(`  ⚠️  容量不匹配`);
  } else {
    console.log(`  ✓ 容量匹配`);
  }
  console.log('');
  
  // 步骤7: 颜色提取
  console.log('步骤7: 颜色提取');
  const inputColor = matcher.extractColorAdvanced(processed);
  console.log(`  输入颜色: "${inputColor}"`);
  
  const expectedColor = matcher.extractColorAdvanced(expectedSPU);
  console.log(`  预期颜色: "${expectedColor}"`);
  
  if (inputColor !== expectedColor) {
    console.log(`  ⚠️  颜色不匹配`);
  } else {
    console.log(`  ✓ 颜色匹配`);
  }
  console.log('');
  
  // 步骤8: 问题分析
  console.log('=== 问题分析 ===');
  
  const issues: string[] = [];
  
  if (!inputBrand) {
    issues.push('品牌提取失败');
  } else if (inputBrand !== expectedBrand) {
    issues.push(`品牌不匹配: "${inputBrand}" vs "${expectedBrand}"`);
  }
  
  if (!inputModel) {
    issues.push('型号提取失败');
  } else if (inputModel !== expectedModel) {
    const inputNormalized = inputModel.toLowerCase().replace(/\s+/g, '');
    const expectedNormalized = expectedModel?.toLowerCase().replace(/\s+/g, '') || '';
    
    if (inputNormalized !== expectedNormalized) {
      issues.push(`型号不匹配: "${inputModel}" vs "${expectedModel}" (标准化后: "${inputNormalized}" vs "${expectedNormalized}")`);
    } else {
      issues.push(`型号格式不同但标准化后匹配: "${inputModel}" vs "${expectedModel}"`);
    }
  }
  
  if (inputVersion?.name !== expectedVersion?.name) {
    issues.push(`版本不匹配: ${inputVersion ? `"${inputVersion.name}"` : 'null'} vs ${expectedVersion ? `"${expectedVersion.name}"` : 'null'}`);
  }
  
  if (inputCapacity !== expectedCapacity) {
    issues.push(`容量不匹配: "${inputCapacity}" vs "${expectedCapacity}"`);
  }
  
  if (inputColor !== expectedColor) {
    issues.push(`颜色不匹配: "${inputColor}" vs "${expectedColor}"`);
  }
  
  if (issues.length === 0) {
    console.log('✓ 所有字段都正确提取和匹配');
    console.log('');
    console.log('可能的原因:');
    console.log('1. SPU数据库中没有这个商品');
    console.log('2. 精确匹配阶段的型号比较逻辑有问题（大小写敏感）');
    console.log('3. 品牌索引构建有问题');
  } else {
    console.log('发现以下问题:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  console.log('');
  console.log('=== 关键发现 ===');
  
  // 检查型号比较逻辑
  if (inputModel && expectedModel) {
    console.log('型号比较逻辑测试:');
    console.log(`  当前逻辑: inputModel.toLowerCase().replace(/\\s+/g, '') === spuModel.toLowerCase().replace(/\\s+/g, '')`);
    
    const inputNormalized = inputModel.toLowerCase().replace(/\s+/g, '');
    const expectedNormalized = expectedModel.toLowerCase().replace(/\s+/g, '');
    
    console.log(`  输入型号标准化: "${inputModel}" -> "${inputNormalized}"`);
    console.log(`  预期型号标准化: "${expectedModel}" -> "${expectedNormalized}"`);
    console.log(`  比较结果: ${inputNormalized === expectedNormalized ? '✓ 匹配' : '✗ 不匹配'}`);
    
    if (inputNormalized !== expectedNormalized) {
      console.log('');
      console.log('  ❌ 问题确认: 型号标准化后仍不匹配');
      console.log('  可能原因:');
      console.log('    1. extractModel() 对输入和SPU返回了不同的格式');
      console.log('    2. 型号提取逻辑有bug');
      console.log('');
      console.log('  建议:');
      console.log('    1. 检查 extractModel() 的实现');
      console.log('    2. 确保型号提取的一致性');
      console.log('    3. 添加更多的型号标准化规则');
    }
  }
  
  console.log('');
  console.log('=== 下一步调试建议 ===');
  console.log('1. 在浏览器控制台运行以下代码查看SPU数据:');
  console.log('   window.spuList.filter(spu => spu.name.includes("红米") && spu.name.includes("15R"))');
  console.log('');
  console.log('2. 检查品牌索引是否正确构建:');
  console.log('   console.log(matcher.spuIndexByBrand.get("红米"))');
  console.log('');
  console.log('3. 手动测试型号提取:');
  console.log(`   matcher.extractModel("${inputSPUPart}")`);
  console.log(`   matcher.extractModel("${expectedSPUPart}")`);
}

// 运行诊断
diagnoseRedmi15RIssue().catch(console.error);
