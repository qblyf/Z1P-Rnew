/**
 * 测试动态型号索引的匹配逻辑
 */

// 模拟 extractModelFromIndex 的新逻辑
function extractModelFromIndex(
  normalizedStr: string,
  modelsToSearch: Set<string>
): string | null {
  // 标准化输入字符串：移除所有空格和特殊字符
  const normalizedInput = normalizedStr.replace(/[\s\-_]/g, '').toLowerCase();
  
  let bestMatch: string | null = null;
  let bestCompleteness = 0; // 完整性分数（匹配的字符数占输入的比例）
  let bestLength = Infinity; // 在完整性相同的情况下，选择更短的
  
  console.log(`\n输入: "${normalizedStr}" -> 标准化: "${normalizedInput}"`);
  console.log('候选型号:', Array.from(modelsToSearch));
  console.log('\n匹配过程:');
  
  // 遍历所有型号，找到最佳匹配
  for (const model of modelsToSearch) {
    // 标准化型号：移除所有空格和特殊字符
    const normalizedModel = model.replace(/[\s\-_]/g, '').toLowerCase();
    
    // 检查输入是否包含该型号
    if (normalizedInput.includes(normalizedModel)) {
      // 计算完整性分数：型号覆盖了输入的多少内容
      const completeness = normalizedModel.length / normalizedInput.length;
      
      console.log(`  "${model}" (标准化: "${normalizedModel}")`);
      console.log(`    - 完整性: ${(completeness * 100).toFixed(1)}% (${normalizedModel.length}/${normalizedInput.length})`);
      console.log(`    - 是否更好: ${completeness > bestCompleteness ? '是（完整性更高）' : completeness === bestCompleteness && normalizedModel.length < bestLength ? '是（更精简）' : '否'}`);
      
      // 优先选择完整性更高的
      if (completeness > bestCompleteness) {
        bestCompleteness = completeness;
        bestLength = normalizedModel.length;
        bestMatch = model;
      } 
      // 如果完整性相同，选择更精简的（更短的）
      else if (completeness === bestCompleteness && normalizedModel.length < bestLength) {
        bestLength = normalizedModel.length;
        bestMatch = model;
      }
    } else {
      console.log(`  "${model}" - 不匹配`);
    }
  }
  
  console.log(`\n最佳匹配: ${bestMatch ? `"${bestMatch}"` : 'null'} (完整性: ${(bestCompleteness * 100).toFixed(1)}%)`);
  
  // 只有当匹配分数足够高时才返回（至少覆盖50%的输入）
  if (bestCompleteness >= 0.5 && bestMatch) {
    return bestMatch;
  }
  
  return null;
}

console.log('=== 测试动态型号索引匹配逻辑 ===');

// 测试用例1: S50 Pro mini
console.log('\n【测试用例1】S50 Pro mini');
console.log('场景: 输入 "s50 pro mini"，候选 ["s50", "s50promini"]');
const result1 = extractModelFromIndex(
  's50 pro mini',
  new Set(['s50', 's50promini'])
);
console.log(`\n✓ 结果: ${result1}`);
console.log(`✓ 预期: s50promini`);
console.log(`✓ 通过: ${result1 === 's50promini' ? '是' : '否'}`);

// 测试用例2: 连写输入
console.log('\n\n【测试用例2】连写输入');
console.log('场景: 输入 "s50promini"，候选 ["s50", "s50promini"]');
const result2 = extractModelFromIndex(
  's50promini',
  new Set(['s50', 's50promini'])
);
console.log(`\n✓ 结果: ${result2}`);
console.log(`✓ 预期: s50promini`);
console.log(`✓ 通过: ${result2 === 's50promini' ? '是' : '否'}`);

// 测试用例3: 只有基础型号
console.log('\n\n【测试用例3】只有基础型号');
console.log('场景: 输入 "s50"，候选 ["s50", "s50promini"]');
const result3 = extractModelFromIndex(
  's50',
  new Set(['s50', 's50promini'])
);
console.log(`\n✓ 结果: ${result3}`);
console.log(`✓ 预期: s50`);
console.log(`✓ 通过: ${result3 === 's50' ? '是' : '否'}`);

// 测试用例4: 完整性相同，选择更精简的
console.log('\n\n【测试用例4】完整性相同，选择更精简的');
console.log('场景: 输入 "mate60pro"，候选 ["mate60pro", "mate 60 pro"]');
const result4 = extractModelFromIndex(
  'mate60pro',
  new Set(['mate60pro', 'mate 60 pro'])
);
console.log(`\n✓ 结果: ${result4}`);
console.log(`✓ 预期: mate60pro（更精简）`);
console.log(`✓ 通过: ${result4 === 'mate60pro' ? '是' : '否'}`);

console.log('\n\n=== 测试完成 ===');
