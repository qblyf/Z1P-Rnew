/**
 * 查找数据库中的红米手机型号
 * 
 * 用于确认 "红米 15R" 在数据库中的实际名称
 */

import { getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';
import { SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

async function findRedmiPhones() {
  console.log('=== 查找数据库中的红米手机 ===');
  console.log('');
  console.log('正在加载红米品牌的 SPU...');
  
  try {
    // 加载所有红米品牌的 SPU
    const spuList = await getSPUListNew(
      {
        states: [SPUState.在用],
        brands: ['红米', 'Redmi', 'REDMI'],
        limit: 1000,
        offset: 0,
      },
      ['id', 'name', 'brand']
    );
    
    console.log(`找到 ${spuList.length} 个红米 SPU`);
    console.log('');
    
    // 过滤掉配件
    const accessoryKeywords = [
      '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
      '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源', '配件', '套餐',
      'Pad', 'Buds', 'Watch', 'Band'
    ];
    
    const phones = spuList.filter(spu => {
      const lowerName = spu.name.toLowerCase();
      return !accessoryKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()));
    });
    
    console.log(`过滤后剩余 ${phones.length} 个手机 SPU`);
    console.log('');
    
    // 查找包含 "15" 的型号
    const phones15 = phones.filter(spu => {
      const lowerName = spu.name.toLowerCase();
      return lowerName.includes('15');
    });
    
    console.log('=== 包含 "15" 的红米手机 ===');
    if (phones15.length > 0) {
      phones15.forEach(spu => {
        console.log(`  - ${spu.name} (ID: ${spu.id})`);
      });
    } else {
      console.log('  未找到包含 "15" 的型号');
    }
    console.log('');
    
    // 查找包含 "R" 的型号
    const phonesR = phones.filter(spu => {
      const lowerName = spu.name.toLowerCase();
      return /\b\d+r\b/.test(lowerName) || /\br\d+\b/.test(lowerName);
    });
    
    console.log('=== 包含 "R" 后缀的红米手机 ===');
    if (phonesR.length > 0) {
      phonesR.forEach(spu => {
        console.log(`  - ${spu.name} (ID: ${spu.id})`);
      });
    } else {
      console.log('  未找到包含 "R" 后缀的型号');
    }
    console.log('');
    
    // 显示最新的 20 个手机型号
    console.log('=== 最新的 20 个红米手机型号 ===');
    const recentPhones = phones.slice(0, 20);
    recentPhones.forEach(spu => {
      console.log(`  - ${spu.name} (ID: ${spu.id})`);
    });
    console.log('');
    
    // 搜索建议
    console.log('=== 搜索建议 ===');
    console.log('');
    console.log('如果 "红米 15R" 不在上面的列表中，可能的原因：');
    console.log('1. 产品名称不同：');
    console.log('   - 可能是 "Redmi Note 15R"');
    console.log('   - 可能是 "Redmi 15 Pro"');
    console.log('   - 可能是 "Redmi K80"');
    console.log('2. 产品尚未添加到数据库');
    console.log('3. 产品状态不是"在用"');
    console.log('');
    console.log('请在上面的列表中查找最接近的型号，或者确认产品的正确名称。');
    
  } catch (error) {
    console.error('查询失败:', error);
  }
}

findRedmiPhones();
