/**
 * 完整测试红米 15R 匹配流程
 * 
 * 模拟完整的匹配逻辑，验证修复是否有效
 */

// 模拟 SPU 数据
const testSPUs = [
  { id: 1, name: '红米 15R 全网通5G版 4GB+128GB 星岩黑', brand: '红米' },
  { id: 2, name: '红米 15R 全网通5G版 8GB+256GB 星岩黑', brand: '红米' },
  { id: 3, name: '红米 15R', brand: '红米' },
  { id: 4, name: '红米 K80 Pro', brand: '红米' },
  { id: 5, name: '红米 Note 13', brand: '红米' },
  { id: 6, name: 'Redmi Pad 2 Pro 键盘式双面保护壳', brand: '红米' }, // 配件，应该被过滤
];

// 模拟函数
function extractBrand(str: string): string | null {
  const lowerStr = str.toLowerCase();
  if (lowerStr.includes('红米') || lowerStr.includes('redmi')) {
    return '红米';
  }
  return null;
}

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
  
  // 改进的颜色移除逻辑
  const colors = ['黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰', '棕', '青', '橙', '黄'];
  for (const color of colors) {
    normalized = normalized.replace(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`, 'g'), ' ');
  }
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  if (normalized.length < 2 || normalized.length > 50) {
    return null;
  }
  
  return normalized.replace(/\s+/g, '');
}

function extractModel(str: string, brand?: string | null): string | null {
  let lowerStr = str.toLowerCase();
  
  if (brand) {
    lowerStr = lowerStr.replace(brand.toLowerCase(), '').trim();
  }
  
  const simpleModelPattern = /(?:\b([a-z]+)(\d+)([a-z]*)\b|(?:^|\s)(\d+)([a-z]+)|(?:^|\s)(\d{2,3})(?:\s|$))/gi;
  const simpleMatches = lowerStr.match(simpleModelPattern);
  
  if (!simpleMatches || simpleMatches.length === 0) {
    return null;
  }
  
  const filtered = simpleMatches.filter(m => {
    const lower = m.toLowerCase().trim();
    return !/^[345]g$/i.test(lower) && 
           !lower.includes('gb') && 
           !/^\d+g$/i.test(lower) &&
           !/^\d+\+\d+$/i.test(lower);
  });
  
  if (filtered.length === 0) {
    return null;
  }
  
  const sorted = filtered.sort((a, b) => {
    const aHasSuffix = /[a-z]\d+[a-z]+/i.test(a);
    const bHasSuffix = /[a-z]\d+[a-z]+/i.test(b);
    if (aHasSuffix && !bHasSuffix) return -1;
    if (!aHasSuffix && bHasSuffix) return 1;
    return b.length - a.length;
  });
  
  return sorted[0].toLowerCase().trim().replace(/\s+/g, '');
}

function shouldFilterSPU(inputName: string, spuName: string): boolean {
  const lowerInput = inputName.toLowerCase();
  const lowerSPU = spuName.toLowerCase();
  
  const accessoryKeywords = [
    '充电器', '充电线', '数据线', '耳机', '保护壳', '保护套', '保护膜',
    '贴膜', '钢化膜', '支架', '转接头', '适配器', '电源',
    '原装', '配件', '套餐', '底座', '充电底座', '无线充电', '键盘'
  ];
  
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

function isBrandMatch(brand1: string | null, brand2: string | null): boolean {
  if (!brand1 || !brand2) return false;
  if (brand1 === brand2) return true;
  if (brand1.toLowerCase() === brand2.toLowerCase()) return true;
  return false;
}

function normalizeForComparison(model: string): string {
  return model.toLowerCase().replace(/[\s\-_]/g, '');
}

// 测试
console.log('=== 完整测试：红米 15R 匹配流程 ===\n');

const input = '红米15R 4+128星岩黑';
console.log(`输入: "${input}"\n`);

// 步骤1: 提取输入信息
const inputBrand = extractBrand(input);
const inputModel = extractModel(input, inputBrand);

console.log('步骤1: 提取输入信息');
console.log(`  品牌: "${inputBrand}"`);
console.log(`  型号: "${inputModel}"`);
console.log();

// 步骤2: 构建型号索引
console.log('步骤2: 构建型号索引');
const modelIndex = new Set<string>();
for (const spu of testSPUs) {
  const brand = spu.brand || extractBrand(spu.name);
  if (brand) {
    const model = extractModelFromSPU(spu.name, brand);
    if (model) {
      modelIndex.add(model);
      console.log(`  SPU "${spu.name}" -> 型号 "${model}"`);
    }
  }
}
console.log(`  型号索引: [${Array.from(modelIndex).join(', ')}]`);
console.log();

// 步骤3: 精确匹配
console.log('步骤3: 精确匹配');
console.log(`  候选SPU: ${testSPUs.length} 个\n`);

let matchedSPUs: any[] = [];
let filteredCount = 0;
let brandMismatchCount = 0;
let modelMismatchCount = 0;

for (const spu of testSPUs) {
  console.log(`  检查 SPU: "${spu.name}"`);
  
  // 过滤检查
  if (shouldFilterSPU(input, spu.name)) {
    console.log(`    ✗ 被过滤（包含配件关键词）`);
    filteredCount++;
    continue;
  }
  
  // 品牌匹配
  const spuBrand = spu.brand || extractBrand(spu.name);
  const brandMatch = isBrandMatch(inputBrand, spuBrand);
  console.log(`    品牌: "${spuBrand}", 匹配: ${brandMatch ? '✓' : '✗'}`);
  
  if (!brandMatch) {
    brandMismatchCount++;
    continue;
  }
  
  // 型号匹配
  const spuModel = extractModelFromSPU(spu.name, spuBrand);
  console.log(`    型号: "${spuModel}"`);
  
  if (!spuModel) {
    console.log(`    ✗ 型号提取失败`);
    modelMismatchCount++;
    continue;
  }
  
  const inputModelNorm = normalizeForComparison(inputModel!);
  const spuModelNorm = normalizeForComparison(spuModel);
  const modelMatch = inputModelNorm === spuModelNorm;
  
  console.log(`    型号匹配: ${modelMatch ? '✓' : '✗'} (输入:"${inputModelNorm}" vs SPU:"${spuModelNorm}")`);
  
  if (!modelMatch) {
    modelMismatchCount++;
    continue;
  }
  
  console.log(`    ✓ 精确匹配成功！`);
  matchedSPUs.push(spu);
}

console.log();
console.log('步骤4: 匹配统计');
console.log(`  检查: ${testSPUs.length} 个`);
console.log(`  过滤: ${filteredCount} 个`);
console.log(`  品牌不匹配: ${brandMismatchCount} 个`);
console.log(`  型号不匹配: ${modelMismatchCount} 个`);
console.log(`  匹配成功: ${matchedSPUs.length} 个`);
console.log();

console.log('=== 匹配结果 ===');
if (matchedSPUs.length > 0) {
  console.log('✅ 匹配成功！');
  console.log();
  matchedSPUs.forEach((spu, index) => {
    console.log(`${index + 1}. ${spu.name}`);
  });
} else {
  console.log('❌ 匹配失败');
}
