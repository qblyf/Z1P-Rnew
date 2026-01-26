/**
 * 检查数据库中是否存在红米 15R 的 SPU
 */

import { getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';

async function checkRedmi15RSPU() {
  console.log('=== 检查红米 15R SPU ===\n');
  
  try {
    // 获取所有 SPU
    const spuList = await getSPUListNew();
    console.log(`✓ 获取到 ${spuList.length} 个 SPU\n`);
    
    // 搜索包含 "15" 和 "R" 的红米/Redmi SPU
    console.log('搜索包含 "15" 和 "R" 的红米/Redmi SPU:\n');
    
    const redmiSPUs = spuList.filter(spu => {
      const name = spu.name.toLowerCase();
      const brand = (spu.brand || '').toLowerCase();
      
      // 品牌是红米或Redmi
      const isRedmi = brand.includes('红米') || brand.includes('redmi') || 
                      name.includes('红米') || name.includes('redmi');
      
      // 包含 15 和 R
      const has15 = name.includes('15');
      const hasR = name.includes('r');
      
      return isRedmi && has15 && hasR;
    });
    
    if (redmiSPUs.length === 0) {
      console.log('❌ 没有找到包含 "15" 和 "R" 的红米/Redmi SPU\n');
      
      // 搜索所有包含 "15" 的红米 SPU
      console.log('搜索所有包含 "15" 的红米/Redmi SPU:\n');
      const redmi15SPUs = spuList.filter(spu => {
        const name = spu.name.toLowerCase();
        const brand = (spu.brand || '').toLowerCase();
        
        const isRedmi = brand.includes('红米') || brand.includes('redmi') || 
                        name.includes('红米') || name.includes('redmi');
        const has15 = name.includes('15');
        
        return isRedmi && has15;
      });
      
      if (redmi15SPUs.length > 0) {
        console.log(`找到 ${redmi15SPUs.length} 个包含 "15" 的红米 SPU:\n`);
        redmi15SPUs.slice(0, 20).forEach(spu => {
          console.log(`  - [${spu.id}] ${spu.name} (品牌: ${spu.brand || '未设置'})`);
        });
        if (redmi15SPUs.length > 20) {
          console.log(`  ... 还有 ${redmi15SPUs.length - 20} 个\n`);
        }
      } else {
        console.log('也没有找到包含 "15" 的红米 SPU\n');
      }
    } else {
      console.log(`✓ 找到 ${redmiSPUs.length} 个匹配的 SPU:\n`);
      redmiSPUs.forEach(spu => {
        console.log(`  - [${spu.id}] ${spu.name} (品牌: ${spu.brand || '未设置'})`);
      });
      console.log();
    }
    
    // 搜索所有红米品牌的 SPU（前20个）
    console.log('所有红米品牌的 SPU（前20个）:\n');
    const allRedmiSPUs = spuList.filter(spu => {
      const brand = (spu.brand || '').toLowerCase();
      const name = spu.name.toLowerCase();
      return brand.includes('红米') || brand.includes('redmi') || 
             name.startsWith('红米') || name.startsWith('redmi');
    });
    
    console.log(`共 ${allRedmiSPUs.length} 个红米 SPU，显示前20个:\n`);
    allRedmiSPUs.slice(0, 20).forEach(spu => {
      console.log(`  - [${spu.id}] ${spu.name} (品牌: ${spu.brand || '未设置'})`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

checkRedmi15RSPU();
