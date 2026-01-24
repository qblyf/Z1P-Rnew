/**
 * 测试品牌移除逻辑
 * 
 * 问题：品牌移除时可能把 "y" 也移除了
 */

function testBrandRemoval() {
  const input = 'vivo y50 5g 白金';
  
  // 模拟品牌库可能包含的品牌
  const brandScenarios = [
    {
      name: '场景1: 只有 vivo',
      brands: ['vivo']
    },
    {
      name: '场景2: 有 vivo 和 y（如果品牌库中有单字母品牌）',
      brands: ['vivo', 'y']
    },
    {
      name: '场景3: 有 vivo 和其他品牌',
      brands: ['vivo', 'oppo', 'xiaomi', 'huawei']
    }
  ];
  
  console.log('=== 测试品牌移除对型号提取的影响 ===');
  console.log('');
  console.log(`原始输入: "${input}"`);
  console.log('');
  
  brandScenarios.forEach(scenario => {
    console.log(`${scenario.name}`);
    console.log(`品牌列表: [${scenario.brands.join(', ')}]`);
    
    let result = input;
    
    // 按长度降序排序
    const sortedBrands = [...scenario.brands].sort((a, b) => b.length - a.length);
    
    for (const brand of sortedBrands) {
      const hasChinese = /[\u4e00-\u9fa5]/.test(brand);
      const brandRegex = hasChinese 
        ? new RegExp(brand, 'gi')
        : new RegExp(`\\b${brand}\\b`, 'gi');
      
      const before = result;
      result = result.replace(brandRegex, ' ');
      
      if (before !== result) {
        console.log(`  移除 "${brand}": "${before}" → "${result}"`);
      }
    }
    
    result = result.replace(/\s+/g, ' ').trim();
    console.log(`  最终结果: "${result}"`);
    
    // 测试型号提取
    const simplePattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
    const matches = result.match(simplePattern);
    
    if (matches) {
      const filtered = matches.filter(m => {
        const lower = m.toLowerCase().trim();
        return !/^[345]g$/i.test(lower) && 
               !lower.includes('gb') && 
               !/^\d+g$/i.test(lower) &&
               !/^\d+\+\d+$/i.test(lower);
      });
      
      if (filtered.length > 0) {
        const sorted = filtered.sort((a, b) => {
          const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
          const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
          if (aHasSuffix && !bHasSuffix) return -1;
          if (!aHasSuffix && bHasSuffix) return 1;
          return b.length - a.length;
        });
        
        console.log(`  提取型号: "${sorted[0]}" ${sorted[0] === 'y50' ? '✅' : '❌'}`);
      } else {
        console.log(`  提取型号: null ❌`);
      }
    } else {
      console.log(`  提取型号: null ❌`);
    }
    
    console.log('');
  });
  
  console.log('=== 潜在问题 ===');
  console.log('');
  console.log('如果品牌库中包含单字母品牌（如 "Y"），可能会导致：');
  console.log('1. "vivo y50" → 移除 "vivo" → "y50"');
  console.log('2. "y50" → 移除 "y" → "50" ❌');
  console.log('');
  console.log('解决方案：');
  console.log('1. 品牌移除时，对单字母品牌使用更严格的边界匹配');
  console.log('2. 或者在品牌库中避免单字母品牌');
  console.log('3. 或者在型号提取前，先识别型号模式，避免被品牌移除影响');
}

testBrandRemoval();
