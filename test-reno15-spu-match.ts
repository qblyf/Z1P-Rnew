/**
 * 测试 OPPO Reno 15 的 SPU 匹配
 */

import { SimpleMatcher } from './utils/smartMatcher';

const matcher = new SimpleMatcher();

const input = 'OPPO Reno15 16+256极光蓝';
const spuList = [
  { id: 1, name: 'OPPO Reno 15', brand: 'oppo' },
  { id: 2, name: 'OPPO Reno 15 Pro', brand: 'oppo' },
];

console.log('=== SPU 匹配测试 ===\n');

console.log('输入:', input);
console.log('');

// 提取输入信息
const inputSPUPart = matcher['extractSPUPart'](input);
const inputBrand = matcher['extractBrand'](inputSPUPart);
const inputModel = matcher['extractModel'](inputSPUPart);

console.log('输入信息:');
console.log('  SPU部分:', inputSPUPart);
console.log('  品牌:', inputBrand);
console.log('  型号:', inputModel);
console.log('');

// 检查每个 SPU
for (const spu of spuList) {
  console.log(`检查 SPU: ${spu.name}`);
  
  const spuSPUPart = matcher['extractSPUPart'](spu.name);
  const spuBrand = matcher['extractBrand'](spuSPUPart);
  const spuModel = matcher['extractModel'](spuSPUPart);
  
  console.log('  SPU部分:', spuSPUPart);
  console.log('  品牌:', spuBrand);
  console.log('  型号:', spuModel);
  
  // 检查匹配条件
  console.log('  匹配检查:');
  console.log('    品牌匹配:', inputBrand === spuBrand);
  console.log('    型号匹配:', inputModel === spuModel);
  
  // 计算分词相似度
  const inputTokens = matcher['tokenize'](inputModel || '');
  const spuTokens = matcher['tokenize'](spuModel || '');
  const modelScore = matcher['calculateTokenSimilarity'](inputTokens, spuTokens);
  console.log('    分词相似度:', modelScore);
  
  console.log('');
}

// 测试 SPU 匹配
console.log('=== 最终匹配结果 ===');
const { spu: matchedSPU, similarity } = matcher.findBestSPUMatch(input, spuList, 0.5);
console.log('匹配到:', matchedSPU?.name || '未匹配');
console.log('相似度:', (similarity * 100).toFixed(1) + '%');
