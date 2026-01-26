/**
 * 测试：当输入本身就是配件时，是否会被错误过滤
 */

// 模拟 shouldFilterSPU 函数
function shouldFilterSPU(inputName: string, spuName: string): boolean {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  // 规则1: 礼盒版过滤
  const giftBoxKeywords = ['礼盒', '套装', '系列', '礼品', '礼包'];
  const hasGiftBoxKeywordInInput = giftBoxKeywords.some(keyword => 
    lowerInput.includes(keyword.toLowerCase())
  );
  const hasGiftBoxKeywordInSPU = giftBoxKeywords.some(keyword => 
    lowerSPU.includes(keyword.toLowerCase())
  );
  
  if (!hasGiftBoxKeywordInInput && hasGiftBoxKeywordInSPU) {
    return true;
  }
  
  // 规则2: 赠品/定制/限定过滤
  const giftKeywords = ['赠品', '定制', '限定', '立牌', '周边', '手办', '摆件'];
  const hasGiftKeywordInInput = giftKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  const hasGiftKeywordInSPU = giftKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  if (!hasGiftKeywordInInput && hasGiftKeywordInSPU) {
    return true;
  }
  
  // 规则3: 版本互斥过滤
  const hasBluetooth = lowerInput.includes('蓝牙版');
  const hasESIM = lowerInput.includes('esim版') || lowerInput.includes('esim版');
  
  if (hasBluetooth && (lowerSPU.includes('esim版') || lowerSPU.includes('esim版'))) {
    return true;
  }
  
  if (hasESIM && lowerSPU.includes('蓝牙版')) {
    return true;
  }
  
  // 规则4: 配件过滤
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
    '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
    '原装', '配件', '套餐', '底座', '充电底座', '无线充电'
  ];
  
  // 特殊处理：对于包含 "底座" 的 SPU，需要更严格的判断
  if ((lowerSPU.includes('底座') || lowerSPU.includes('充电底座')) && 
      !lowerInput.includes('底座') && !lowerInput.includes('充电底座')) {
    return true;
  }
  
  const hasAccessoryKeywordInInput = accessoryKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  const hasAccessoryKeywordInSPU = accessoryKeywords.some(keyword => 
    lowerSPU.includes(keyword)
  );
  
  if (!hasAccessoryKeywordInInput && hasAccessoryKeywordInSPU) {
    return true;
  }
  
  return false;
}

console.log('=== 测试配件输入场景 ===\n');

const testCases = [
  {
    name: '场景1: 输入是手表，SPU是充电底座',
    input: 'OPPO WatchX2mini 42mm 4G皓月银',
    spu: 'OPPO Watch 一体式充电底座',
    expected: true, // 应该过滤
  },
  {
    name: '场景2: 输入是充电底座，SPU也是充电底座',
    input: 'OPPO Watch 充电底座',
    spu: 'OPPO Watch 一体式充电底座',
    expected: false, // 不应该过滤
  },
  {
    name: '场景3: 输入是充电底座，SPU是手表',
    input: 'OPPO Watch 充电底座',
    spu: 'OPPO Watch X2 Mini 全智能手表',
    expected: false, // 不应该过滤（虽然不匹配，但不是因为过滤）
  },
  {
    name: '场景4: 输入是充电器，SPU是充电器',
    input: 'OPPO 65W 充电器',
    spu: 'OPPO 65W SuperVOOC 充电器',
    expected: false, // 不应该过滤
  },
  {
    name: '场景5: 输入是手机，SPU是充电器',
    input: 'OPPO Reno15 Pro 12+256 星夜黑',
    spu: 'OPPO 65W SuperVOOC 充电器',
    expected: true, // 应该过滤
  },
  {
    name: '场景6: 输入是保护壳，SPU是保护壳',
    input: 'OPPO Reno15 Pro 保护壳',
    spu: 'OPPO Reno15 Pro 透明保护壳',
    expected: false, // 不应该过滤
  },
];

testCases.forEach(({ name, input, spu, expected }) => {
  const result = shouldFilterSPU(input, spu);
  const status = result === expected ? '✓' : '✗';
  
  console.log(`${status} ${name}`);
  console.log(`  输入: "${input}"`);
  console.log(`  SPU: "${spu}"`);
  console.log(`  预期: ${expected ? '过滤' : '不过滤'}`);
  console.log(`  实际: ${result ? '过滤' : '不过滤'}`);
  
  if (result !== expected) {
    console.log(`  ❌ 测试失败！`);
  }
  console.log();
});
