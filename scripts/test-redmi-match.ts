/**
 * 测试红米15R匹配问题
 * 
 * 输入: 红米15R 4+128星岩黑
 * 预期: 应该匹配到 红米 15R 全网通5G版 4GB+128GB 星岩黑
 * 实际: 没有匹配到商品
 */

import { SimpleMatcher } from '../utils/smartMatcher';

async function testRedmiMatch() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  const input = '红米15R 4+128星岩黑';
  
  console.log('=== 测试红米15R匹配 ===\n');
  
  // 1. 测试预处理
  console.log('1. 输入预处理:');
  console.log(`  原始输入: "${input}"`);
  
  const cleaned = matcher.cleanDemoMarkers(input);
  console.log(`  清理后: "${cleaned}"`);
  
  const processed = matcher.preprocessInputAdvanced(cleaned);
  console.log(`  预处理后: "${processed}"`);
  console.log('');
  
  // 2. 测试 SPU 部分提取
  console.log('2. SPU 部分提取:');
  const spuPart = matcher.extractSPUPart(processed);
  console.log(`  SPU部分: "${spuPart}"`);
  console.log('');
  
  // 3. 测试品牌提取
  console.log('3. 品牌提取:');
  const brand = matcher.extractBrand(spuPart);
  console.log(`  提取品牌: "${brand}"`);
  
  if (!brand) {
    console.log('  ❌ 品牌提取失败！');
    console.log('  可能原因:');
    console.log('    - 品牌库未加载');
    console.log('    - 品牌库中没有"红米"');
    console.log('    - 品牌提取逻辑有问题');
  }
  console.log('');
  
  // 4. 测试型号提取
  console.log('4. 型号提取:');
  const model = matcher.extractModel(spuPart);
  console.log(`  提取型号: "${model}"`);
  
  if (!model) {
    console.log('  ❌ 型号提取失败！');
  } else if (model !== '15r') {
    console.log(`  ⚠️  型号不匹配！预期 "15r"，实际 "${model}"`);
  }
  console.log('');
  
  // 5. 测试型号标准化
  console.log('5. 型号标准化测试:');
  const testModels = [
    '15r',
    '15 r',
    '15R',
    '15 R',
  ];
  
  console.log('  测试不同格式的型号是否会被标准化为相同格式:');
  testModels.forEach(testModel => {
    // 使用私有方法的变通方案：通过 extractModel 来测试标准化
    const normalized = matcher.extractModel(testModel);
    console.log(`    "${testModel}" -> "${normalized}"`);
  });
  console.log('');
  
  // 6. 测试 SPU 名称的型号提取
  console.log('6. 测试 SPU 名称的型号提取:');
  const testSPUNames = [
    '红米 15R',
    '红米15R',
    '红米 15 R',
    'Redmi 15R',
    'Redmi 15 R',
  ];
  
  console.log('  测试不同格式的 SPU 名称:');
  testSPUNames.forEach(spuName => {
    const spuModel = matcher.extractModel(spuName);
    console.log(`    "${spuName}" -> 型号: "${spuModel}"`);
  });
  console.log('');
  
  // 7. 测试型号匹配逻辑
  console.log('7. 型号匹配逻辑测试:');
  const inputModel = model || '15r';
  console.log(`  输入型号: "${inputModel}"`);
  console.log(`  测试与不同 SPU 型号的匹配:`);
  
  const testSPUModels = ['15r', '15 r', '15R', '15 R'];
  testSPUModels.forEach(spuModel => {
    const inputNormalized = inputModel.replace(/\s+/g, '');
    const spuNormalized = spuModel.replace(/\s+/g, '');
    const match = inputNormalized === spuNormalized;
    console.log(`    "${inputModel}" vs "${spuModel}": ${match ? '✓ 匹配' : '✗ 不匹配'} (标准化后: "${inputNormalized}" vs "${spuNormalized}")`);
  });
  console.log('');
  
  // 8. 测试容量提取
  console.log('8. 容量提取:');
  const capacity = matcher.extractCapacity(processed);
  console.log(`  提取容量: "${capacity}"`);
  
  if (!capacity) {
    console.log('  ⚠️  容量提取失败！');
  } else if (capacity !== '4+128') {
    console.log(`  ⚠️  容量不匹配！预期 "4+128"，实际 "${capacity}"`);
  }
  console.log('');
  
  // 9. 测试颜色提取
  console.log('9. 颜色提取:');
  const color = matcher.extractColorAdvanced(processed);
  console.log(`  提取颜色: "${color}"`);
  
  if (!color) {
    console.log('  ⚠️  颜色提取失败！');
  } else if (color !== '星岩黑') {
    console.log(`  ⚠️  颜色不匹配！预期 "星岩黑"，实际 "${color}"`);
  }
  console.log('');
  
  // 10. 分析可能的问题
  console.log('10. 问题分析:');
  
  if (!brand) {
    console.log('  ❌ 严重问题: 品牌提取失败');
    console.log('     这会导致无法使用品牌索引');
    console.log('     需要检查品牌库是否正确加载');
  }
  
  if (!model) {
    console.log('  ❌ 严重问题: 型号提取失败');
    console.log('     这会导致无法匹配 SPU');
    console.log('     需要检查型号提取逻辑');
  }
  
  if (brand && model) {
    console.log('  ✓ 品牌和型号都提取成功');
    console.log('  可能的问题:');
    console.log('    1. SPU 数据库中的型号格式与输入不一致（如 "15 R" vs "15r"）');
    console.log('    2. 型号标准化逻辑有问题，导致相同型号被标准化为不同格式');
    console.log('    3. SPU 名称中品牌是 "Redmi" 而不是 "红米"');
    console.log('    4. 精确匹配阶段的型号比较逻辑太严格');
  }
  
  console.log('\n=== 关键发现 ===');
  console.log('根据代码分析，精确匹配使用以下逻辑:');
  console.log('  inputModel.replace(/\\s+/g, \'\') === spuModel.replace(/\\s+/g, \'\')');
  console.log('');
  console.log('这意味着:');
  console.log('  - "15r" 和 "15R" 不会匹配（大小写敏感）');
  console.log('  - "15r" 和 "15 r" 会匹配（移除空格后）');
  console.log('');
  console.log('问题可能是:');
  console.log('  1. extractModel() 对输入返回 "15r"（小写）');
  console.log('  2. extractModel() 对 SPU 返回 "15R"（大写）或其他格式');
  console.log('  3. 导致精确匹配失败');
  console.log('');
  console.log('解决方案:');
  console.log('  在型号比较时应该统一转换为小写:');
  console.log('  inputModel.toLowerCase().replace(/\\s+/g, \'\') === spuModel.toLowerCase().replace(/\\s+/g, \'\')');
  
  console.log('\n=== 建议检查 ===');
  console.log('1. 在浏览器控制台查看 SPU 数据中 "红米 15R" 的完整名称');
  console.log('2. 检查 SPU 的 brand 字段是 "红米" 还是 "Redmi"');
  console.log('3. 查看精确匹配阶段的调试日志，确认是否进入了匹配逻辑');
  console.log('4. 修复型号比较逻辑，添加 toLowerCase()');
}

// 运行测试
testRedmiMatch().catch(console.error);
