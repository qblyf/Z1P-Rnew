/**
 * 检查型号提取失败的红米SPU
 * 查看是否有"15R"相关的产品
 */

import { getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';

// 简化的型号提取函数（与smartMatcher中的逻辑一致）
function extractModelFromSPU(spuName: string, brand: string): string | null {
  let normalized = spuName.toLowerCase();
  normalized = normalized.replace(brand.toLowerCase(), '').trim();
  
  const descriptors = [
    '智能手机', '手机', '智能手表', '手表', '平板电脑', '平板', '笔记本电脑', '笔记本',
    '无线耳机', '耳机', '手环', '智能', '款', '版', '英寸', 'mm', 'gb', 'tb',
    '钛合金', '陶瓷', '素皮', '皮革', '玻璃', '金属', '塑料',
    '蓝牙', 'wifi', '5g', '4g', '3g', '全网通', 'esim',
    '年', '月', '日', '新品', '上市', '发布',
    '全',
  ];
  
  for (const desc of descriptors) {
    normalized = normalized.replace(new RegExp(desc, 'gi'), ' ');
  }
  
  normalized = normalized.replace(/\d+\s*\+\s*\d+/g, ' ');
  normalized = normalized.replace(/\d+\s*(gb|tb)/gi, ' ');
  
  const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
  for (const color of colors) {
    normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
  }
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  if (normalized.length < 2 || normalized.length > 50) {
    return null;
  }
  
  const result = normalized.replace(/\s+/g, '');
  return result;
}

async function checkFailedExtractions() {
  console.log('=== 检查型号提取失败的红米SPU ===\n');
  
  try {
    const spuList = await getSPUListNew();
    console.log(`✓ 获取到 ${spuList.length} 个 SPU\n`);
    
    // 筛选红米品牌的SPU
    const redmiSPUs = spuList.filter(spu => {
      const brand = (spu.brand || '').toLowerCase();
      const name = spu.name.toLowerCase();
      return brand.includes('红米') || brand.includes('redmi') || 
             name.startsWith('红米') || name.startsWith('redmi');
    });
    
    console.log(`找到 ${redmiSPUs.length} 个红米SPU\n`);
    
    // 检查型号提取
    const failedExtractions: Array<{ spu: any; reason: string }> = [];
    const successExtractions: Array<{ spu: any; model: string }> = [];
    const contains15R: Array<{ spu: any; model: string | null }> = [];
    
    for (const spu of redmiSPUs) {
      const brand = spu.brand || '红米';
      const model = extractModelFromSPU(spu.name, brand);
      
      // 检查是否包含"15"和"R"
      if (spu.name.toLowerCase().includes('15') && spu.name.toLowerCase().includes('r')) {
        contains15R.push({ spu, model });
      }
      
      if (model) {
        successExtractions.push({ spu, model });
      } else {
        failedExtractions.push({ spu, reason: '型号提取失败' });
      }
    }
    
    console.log('=== 包含"15"和"R"的SPU ===\n');
    if (contains15R.length > 0) {
      console.log(`找到 ${contains15R.length} 个包含"15"和"R"的SPU:\n`);
      contains15R.forEach(({ spu, model }) => {
        console.log(`  - [${spu.id}] ${spu.name}`);
        console.log(`    品牌: ${spu.brand || '未设置'}`);
        console.log(`    提取型号: ${model || '提取失败'}\n`);
      });
    } else {
      console.log('❌ 没有找到包含"15"和"R"的红米SPU\n');
    }
    
    console.log('=== 型号提取失败的SPU（前20个）===\n');
    console.log(`共 ${failedExtractions.length} 个型号提取失败\n`);
    failedExtractions.slice(0, 20).forEach(({ spu }) => {
      console.log(`  - [${spu.id}] ${spu.name} (品牌: ${spu.brand || '未设置'})`);
    });
    
    if (failedExtractions.length > 20) {
      console.log(`  ... 还有 ${failedExtractions.length - 20} 个\n`);
    }
    
    console.log('\n=== 统计 ===');
    console.log(`总计: ${redmiSPUs.length} 个红米SPU`);
    console.log(`成功提取: ${successExtractions.length} 个`);
    console.log(`提取失败: ${failedExtractions.length} 个`);
    console.log(`包含"15R": ${contains15R.length} 个`);
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

checkFailedExtractions();
