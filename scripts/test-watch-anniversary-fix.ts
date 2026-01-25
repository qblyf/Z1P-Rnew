/**
 * 测试华为 Watch 十周年款匹配修复
 * 
 * 问题：
 * 输入 "华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带蓝色"
 * 错误匹配到 "HUAWEI WATCH 无线超级快充底座（第二代）"
 * 
 * 正确应该匹配：
 * "华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带"
 */

// 模拟 SPU 数据
const testSPUs = [
  {
    id: 105077,
    name: 'HUAWEI WATCH 无线超级快充底座（第二代）',
    brand: '华为'
  },
  {
    id: 100001,
    name: 'HUAWEI WATCH ULTIMATE DESIGN 非凡大师',
    brand: '华为'
  },
  {
    id: 100002,
    name: '华为 WATCH 4 pro 智能手表',
    brand: '华为'
  },
  {
    id: 100003,
    name: '华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带',
    brand: '华为'
  },
  {
    id: 100004,
    name: '华为 WATCH 十周年款 智能手表 46mm 钛合金 黑色素皮复合表带',
    brand: '华为'
  }
];

// 测试用例
const testCases = [
  {
    input: '华为 Watch十周年款 RTS-AL00 46mm蓝色素皮复合表带蓝色',
    expectedSPU: '华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带',
    description: '包含型号代码和特殊标识的完整输入'
  },
  {
    input: '华为 Watch十周年款 46mm蓝色',
    expectedSPU: '华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带',
    description: '简化输入（无型号代码）'
  },
  {
    input: '华为 Watch 十周年款',
    expectedSPU: '华为 WATCH 十周年款 智能手表 46mm 钛合金 蓝色素皮复合表带',
    description: '最简输入（仅品牌+型号+特殊标识）'
  }
];

// 模拟匹配逻辑
function testMatching() {
  console.log('=== 华为 Watch 十周年款匹配测试 ===\n');
  
  for (const testCase of testCases) {
    console.log(`测试: ${testCase.description}`);
    console.log(`输入: "${testCase.input}"`);
    console.log(`期望匹配: "${testCase.expectedSPU}"`);
    
    // 提取信息
    const brand = '华为';
    const model = extractModel(testCase.input);
    console.log(`提取型号: "${model}"`);
    
    // 匹配 SPU
    const matches = [];
    for (const spu of testSPUs) {
      // 过滤配件
      if (shouldFilterSPU(testCase.input, spu.name)) {
        console.log(`  [过滤] "${spu.name}" - 配件`);
        continue;
      }
      
      const spuModel = extractModel(spu.name);
      const modelMatch = model && spuModel && 
                        model.toLowerCase().replace(/\s+/g, '') === spuModel.toLowerCase().replace(/\s+/g, '');
      
      if (modelMatch) {
        const score = calculateScore(testCase.input, spu.name);
        matches.push({ spu, score });
        console.log(`  [匹配] "${spu.name}" - 分数: ${score.toFixed(2)}`);
      }
    }
    
    // 选择最佳匹配
    if (matches.length > 0) {
      const best = matches.reduce((a, b) => a.score > b.score ? a : b);
      const isCorrect = best.spu.name === testCase.expectedSPU;
      console.log(`\n✓ 最佳匹配: "${best.spu.name}"`);
      console.log(`  分数: ${best.score.toFixed(2)}`);
      console.log(`  结果: ${isCorrect ? '✅ 正确' : '❌ 错误'}\n`);
    } else {
      console.log(`\n❌ 未找到匹配\n`);
    }
    
    console.log('---\n');
  }
}

// 提取型号（简化版）
function extractModel(str: string): string | null {
  const lowerStr = str.toLowerCase();
  
  // Pattern 1: watch + 型号代码（如 "RTS-AL00"）
  const codePattern = /(watch)\s*([a-z]{3}-[a-z]{2}\d{2})/i;
  const codeMatch = lowerStr.match(codePattern);
  if (codeMatch) {
    return codeMatch[0].replace(/\s+/g, '');
  }
  
  // Pattern 2: watch + 中文后缀（如 "十周年款"）
  const chinesePattern = /(watch)\s*([\u4e00-\u9fa5]+款?)/i;
  const chineseMatch = lowerStr.match(chinesePattern);
  if (chineseMatch) {
    return chineseMatch[0].replace(/\s+/g, '');
  }
  
  // Pattern 3: 简单的 watch
  if (lowerStr.includes('watch')) {
    return 'watch';
  }
  
  return null;
}

// 配件过滤
function shouldFilterSPU(input: string, spuName: string): boolean {
  const lowerInput = input.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
    '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
    '原装', '配件', '套餐', '底座', '充电底座', '无线充电'
  ];
  
  const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  return !hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU;
}

// 计算匹配分数
function calculateScore(input: string, spuName: string): number {
  let score = 0.8; // 基础分
  
  const lowerInput = input.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  // 型号代码匹配加分
  const modelCodePattern = /[a-z]{3}-[a-z]{2}\d{2}/i;
  const inputCode = lowerInput.match(modelCodePattern)?.[0];
  const spuCode = lowerSPU.match(modelCodePattern)?.[0];
  
  if (inputCode && spuCode && inputCode === spuCode) {
    score += 0.1; // 型号代码匹配，加10分
  }
  
  // 特殊标识匹配加分
  const specialKeywords = ['十周年', '周年', '纪念版', '限量版', '特别版'];
  for (const keyword of specialKeywords) {
    if (lowerInput.includes(keyword) && lowerSPU.includes(keyword)) {
      score += 0.05; // 特殊标识匹配，加5分
    }
  }
  
  // 尺寸匹配加分
  const sizePattern = /\d+mm/i;
  const inputSize = lowerInput.match(sizePattern)?.[0];
  const spuSize = lowerSPU.match(sizePattern)?.[0];
  
  if (inputSize && spuSize && inputSize === spuSize) {
    score += 0.03; // 尺寸匹配，加3分
  }
  
  // 颜色匹配加分
  if (lowerInput.includes('蓝') && lowerSPU.includes('蓝')) {
    score += 0.02; // 颜色匹配，加2分
  }
  
  return Math.min(score, 1.0);
}

// 运行测试
testMatching();
