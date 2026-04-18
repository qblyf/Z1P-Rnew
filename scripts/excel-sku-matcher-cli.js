#!/usr/bin/env node
/**
 * Excel SKU 直接匹配 CLI 工具
 *
 * 用于测试 Excel 商品名称与系统 SKU 的直接匹配效果
 * SKU 包含完整规格（内存、颜色等），比 SPU 匹配更精确
 *
 * 用法:
 *   node scripts/excel-sku-matcher-cli.js <excel文件路径> [选项]
 *
 * 选项:
 *   --limit N       只处理前 N 条数据（默认: 全部）
 *   --show-all      显示所有结果，包括未匹配的
 *   --debug         显示调试信息
 *   --help, -h      显示帮助信息
 *
 * 示例:
 *   node scripts/excel-sku-matcher-cli.js /path/to/太原纬图sku映射表.xls
 *   node scripts/excel-sku-matcher-cli.js /path/to/太原纬图sku映射表.xls --limit 10 --debug
 */

import XLSX from 'xlsx';
import { getSKUList, getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product.js';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes.js';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand.js';
import { init } from '@zsqk/z1-sdk/es/z1p/util.js';

// 品牌列表
const BRAND_PATTERNS = [
  { pattern: /^荣耀/, brand: '荣耀' },
  { pattern: /^华为/, brand: '华为' },
  { pattern: /^小米/, brand: '小米' },
  { pattern: /^vivo/, brand: 'vivo' },
  { pattern: /^OPPO/, brand: 'OPPO' },
  { pattern: /^苹果/, brand: '苹果' },
  { pattern: /^iPhone/, brand: '苹果' },
  { pattern: /^三星/, brand: '三星' },
  { pattern: /^真我/, brand: '真我' },
  { pattern: /^一加/, brand: '一加' },
  { pattern: /^红米/, brand: '红米' },
  { pattern: /^iqoo/, brand: 'iQOO' },
  { pattern: /^麦芒/, brand: '麦芒' },
];

// 第三方品牌前缀（只用于检测，不用于移除）
const THIRD_PARTY_PREFIXES_FOR_DETECTION = [
  '荣耀亲选',
  '亲选',
  '乔威',
  '乐坞',
  '联创',
  'IOTAPK',
  '万魔',
  '极选',
  '思派力',
  'O项目',
];

// 第三方品牌前缀（用于 removeThirdPartyPrefix）
const PLATFORM_PREFIXES_TO_REMOVE = [
  '荣耀亲选',
  '亲选',
  '乔威',
  '乐坞',
  '联创',
  'IOTAPK',
  '万魔',
  '极选',
  '思派力',
  'O项目',
  'T-',        // T牌产品前缀
  'T牌',      // T牌品牌名
];

function extractBrand(skuName) {
  for (const prefix of THIRD_PARTY_PREFIXES_FOR_DETECTION) {
    if (skuName.startsWith(prefix) || skuName.startsWith('亲选' + prefix.slice(2))) {
      return null;
    }
  }

  if (skuName.startsWith('荣耀')) {
    const afterHonor = skuName.slice(2);
    for (const prefix of THIRD_PARTY_PREFIXES_FOR_DETECTION) {
      if (afterHonor.startsWith(prefix)) {
        return null;
      }
    }
    // 特殊处理"荣耀极选"、"荣耀思派力"等"荣耀+第三方品牌"的情况
    for (const prefix of ['极选', '思派力', '乔威', '乐坞', '联创', '万魔']) {
      if (afterHonor.startsWith(prefix)) {
        return null;
      }
    }
  }

  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(skuName)) {
      return brand;
    }
  }
  return null;
}

function removeThirdPartyPrefix(skuName) {
  let result = skuName;
  let previous = '';
  let iterations = 0;
  const maxIterations = 10;

  while (previous !== result && iterations < maxIterations) {
    previous = result;
    for (const prefix of PLATFORM_PREFIXES_TO_REMOVE) {
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      if (prefix === '荣耀亲选') {
        const pattern1 = new RegExp(`荣耀亲选荣耀`, 'g');
        result = result.replace(pattern1, '荣耀亲选 ').trim();
        const pattern2 = /^[^\s]+荣耀亲选/;
        if (pattern2.test(result)) {
          result = result.replace(pattern2, '荣耀亲选').trim();
        }
        continue;
      }

      if (prefix === '亲选') {
        const pattern2 = new RegExp(`^亲选`, 'g');
        if (pattern2.test(result)) {
          result = result.replace(pattern2, '荣耀亲选').trim();
          result = result.replace(/荣耀亲选\s*荣耀/gi, '荣耀亲选').trim();
        }
        continue;
      }

      const pattern = new RegExp(`^${escapedPrefix}|\\s${escapedPrefix}|荣耀${escapedPrefix}`, 'g');
      result = result.replace(pattern, '').trim();
    }
    iterations++;
  }

  return result;
}

/**
 * 标准化 SKU 名称
 */
function normalizeSkuName(skuName) {
  if (!skuName) return '';

  let normalized = skuName;

  // 去除括号内的型号代码（半角和全角括号都要处理）
  normalized = normalized.replace(/\([^)]*\)/g, ' ');
  normalized = normalized.replace(/\（[^）]*\）/g, ' ');
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ');
  normalized = normalized.replace(/《[^》]*》/g, ' ');

  // 去除多余的描述性文字
  normalized = normalized.replace(/\b(LTE|WCDM|WCDMA|CDMA|TDD|FDD)[^ ]*/gi, ' ');
  normalized = normalized.replace(/演示样机/gi, ' ');
  normalized = normalized.replace(/专供/gi, ' ');

  // 提取品牌
  const brand = extractBrand(normalized);
  let remaining = normalized;

  // 去除第三方品牌前缀
  remaining = removeThirdPartyPrefix(remaining);

  if (brand) {
    remaining = remaining.replace(new RegExp(`^${brand}`), '').trim();
  }

  // 容量标准化
  remaining = remaining.replace(/(\d+)\s*GB\s*SSD\s*(\d+)\s*TB/gi, '$1GB+$2TB');
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*TB/gi, '$1GB+$2TB');
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*GB/gi, '$1GB+$2GB');
  remaining = remaining.replace(/(\d+)\s*G\s*\+\s*(\d+)\s*G/gi, '$1G+$2G');

  // 先把 5G 替换为特殊占位符
  remaining = remaining.replace(/5G/gi, '___5G___');
  remaining = remaining.replace(/(\d+)\s*GB/gi, '$1');
  remaining = remaining.replace(/(\d+)\s*G(?!\d)/gi, '$1');
  remaining = remaining.replace(/___5G___/gi, '5G');

  // 去除"全网通"等词汇
  remaining = remaining.replace(/全网通[45]?/gi, '');
  remaining = remaining.replace(/双卡/gi, '');

  // 去除颜色前缀
  remaining = remaining.replace(/^(雪域白|天青色|竹韵青|幻夜黑|朱砂红|旭日金|羽白|影黑|绒黑色|钛空灰|晨曦紫|月影白|星辰灰|云染丹霞|月光石|板岩灰|日出印象)/gi, '');

  // 归一化空格
  remaining = remaining.replace(/\s+/g, ' ').trim();

  return remaining;
}

/**
 * 计算两个字符串的相似度
 */
function stringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // 计算公共字符数量
  let common = 0;
  const s2Arr = s2.split('');

  for (const char of s1) {
    const idx = s2Arr.indexOf(char);
    if (idx !== -1) {
      common++;
      s2Arr.splice(idx, 1);
    }
  }

  return (2 * common) / (s1.length + s2.length);
}

/**
 * SKU 匹配函数
 */
function matchSku(inputName, skuList, inputBrand) {
  let bestMatch = null;
  let bestScore = 0;
  let bestReason = '';

  const normalizedInput = normalizeSkuName(inputName);
  const brand = inputBrand || extractBrand(inputName);

  // 第一轮：按品牌筛选
  for (const sku of skuList) {
    if (brand && sku.brand && sku.brand.toLowerCase() !== brand.toLowerCase()) {
      continue;
    }

    const skuName = sku.name || '';
    const normalizedSku = normalizeSkuName(skuName);
    const similarity = stringSimilarity(normalizedInput, normalizedSku);

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = sku;
      bestReason = `相似度: ${(similarity * 100).toFixed(1)}%`;
    }
  }

  // 如果按品牌筛选没找到合适的，回退到不限制品牌
  if (!bestMatch || bestScore < 0.4) {
    bestMatch = null;
    bestScore = 0;

    for (const sku of skuList) {
      const skuName = sku.name || '';
      const normalizedSku = normalizeSkuName(skuName);
      const similarity = stringSimilarity(normalizedInput, normalizedSku);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = sku;
        bestReason = `相似度(无品牌): ${(similarity * 100).toFixed(1)}%`;
      }
    }
  }

  // 设置阈值
  const threshold = 0.4;

  if (bestScore >= threshold) {
    return { match: bestMatch, score: bestScore, reason: bestReason };
  }

  return { match: null, score: 0, reason: '未达到匹配阈值' };
}

/**
 * 建立 SKU 索引
 */
function buildSkuIndex(skuList) {
  const byBrand = new Map();
  const all = [];

  for (const sku of skuList) {
    all.push(sku);

    if (sku.brand) {
      const brandKey = sku.brand.toLowerCase();
      if (!byBrand.has(brandKey)) {
        byBrand.set(brandKey, []);
      }
      byBrand.get(brandKey).push(sku);
    }
  }

  return { byBrand, all };
}

/**
 * 解析 Excel 文件
 */
function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  if (data.length < 2) {
    throw new Error('Excel 文件为空或格式不正确');
  }

  const headers = data[0].map((h, i) => {
    const header = String(h || `列${i + 1}`);
    return header.trim();
  });

  console.log(`Excel 表头: ${headers.join(', ')}`);

  // 自动识别列
  let inputCol = -1;
  let correctCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes('输入') || h.includes('sku') || h.includes('商品名称') || h.includes('名称')) {
      if (inputCol === -1) inputCol = i;
    }
    if (h.includes('正确') || h.includes('答案') || h.includes('标准')) {
      correctCol = i;
    }
  }

  // 如果没找到正确答案列，尝试第二列
  if (correctCol === -1 && headers.length >= 2) {
    correctCol = 1;
  }

  if (inputCol === -1) {
    inputCol = 0;
  }

  console.log(`识别列: 输入=${inputCol} (${headers[inputCol]}), 正确答案=${correctCol} (${correctCol >= 0 ? headers[correctCol] : 'N/A'})\n`);

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const skuName = row[inputCol] ? String(row[inputCol]).trim() : '';
    if (!skuName) continue;

    const correctAnswer = correctCol >= 0 && row[correctCol] ? String(row[correctCol]).trim() : '';

    rows.push({ skuName, correctAnswer });
  }

  return rows;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Excel SKU 直接匹配 CLI 工具

用法:
  node scripts/excel-sku-matcher-cli.js <excel文件路径> [选项]

选项:
  --limit N       只处理前 N 条数据（默认: 全部）
  --show-all      显示所有结果，包括未匹配的
  --debug         显示调试信息
  --help, -h      显示帮助信息

示例:
  node scripts/excel-sku-matcher-cli.js /path/to/太原纬图sku映射表.xls
  node scripts/excel-sku-matcher-cli.js /path/to/太原纬图sku映射表.xls --limit 10 --debug
`);
    process.exit(0);
  }

  // 解析参数
  const filePath = args[0];
  const options = {
    limit: null,
    showAll: false,
    debug: false,
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--show-all') {
      options.showAll = true;
    } else if (args[i] === '--debug') {
      options.debug = true;
    }
  }

  console.log('========================================');
  console.log('Excel SKU 直接匹配 CLI 工具');
  console.log('========================================');
  console.log(`\nExcel 文件: ${filePath}`);
  console.log(`选项: limit=${options.limit || '全部'}, showAll=${options.showAll}, debug=${options.debug}\n`);

  // 1. 解析 Excel 文件
  console.log('正在解析 Excel 文件...');
  const excelData = parseExcelFile(filePath);
  console.log(`解析完成: ${excelData.length} 条数据\n`);

  // 2. 初始化 SDK
  const endpoint = process.env.Z1P_ENDPOINT || 'https://p-api.z1.pub';
  init({ endpoint });
  console.log(`SDK 初始化完成, endpoint: ${endpoint}\n`);

  // 3. 加载 SKU 数据
  console.log('正在加载 SKU 数据...');
  const allSkuList = [];
  const batchSize = 5000;
  let offset = 0;
  let hasMore = true;
  let totalLoaded = 0;

  while (hasMore) {
    const skuList = await getSKUList(
      {
        states: [SKUState.在用],
        limit: batchSize,
        offset,
        orderBy: [{ key: 'id', sort: 'ASC' }],
      },
      ['id', 'name', 'spuID']
    );

    totalLoaded += skuList.length;

    // 暂时不过滤"弃用"状态的SKU，看看能否匹配
    for (const item of skuList) {
      if (!item.name) continue;
      // if (item.name.includes('-弃用-')) continue; // 暂时禁用，看能否匹配正确答案

      allSkuList.push({
        id: item.id,
        name: item.name,
        spuId: item.spuID,
      });
    }

    if (skuList.length < batchSize) {
      hasMore = false;
    } else {
      offset += batchSize;
    }

    if (allSkuList.length % 10000 === 0 || skuList.length < batchSize) {
      console.log(`  已加载 ${allSkuList.length} 个有效 SKU...`);
    }
  }

  console.log(`\nSKU 数据加载完成: ${allSkuList.length} 个有效 SKU\n`);

  // 3b. 加载 SPU 数据用于获取品牌
  console.log('正在加载 SPU 数据（用于获取品牌）...');
  const spuMap = new Map();
  const spuBatchSize = 10000;
  offset = 0;
  hasMore = true;

  while (hasMore) {
    const spuList = await getSPUListNew(
      {
        states: [SPUState.在用],
        limit: spuBatchSize,
        offset,
        orderBy: [{ key: 'p."id"', sort: 'ASC' }],
      },
      ['id', 'name', 'brand']
    );

    for (const spu of spuList) {
      if (spu.brand && spu.brand.trim()) {
        spuMap.set(spu.id, { name: spu.name, brand: spu.brand });
      }
    }

    if (spuList.length < spuBatchSize) {
      hasMore = false;
    } else {
      offset += spuBatchSize;
    }
  }

  console.log(`SPU 数据加载完成: ${spuMap.size} 个有效 SPU\n`);

  // 3c. 为 SKU 关联品牌信息
  for (const sku of allSkuList) {
    const spu = spuMap.get(sku.spuId);
    if (spu) {
      sku.spuName = spu.name;
      sku.brand = spu.brand;
    } else {
      sku.brand = '';
    }
  }

  // 过滤有品牌的 SKU
  const validSkus = allSkuList.filter(s => s.brand);
  console.log(`有品牌的有效 SKU: ${validSkus.length} 个\n`);

  // 4. 建立索引
  const skuIndex = buildSkuIndex(validSkus);
  console.log(`品牌索引建立完成: ${skuIndex.byBrand.size} 个品牌分组\n`);

  // 调试信息
  if (options.debug) {
    console.log('=== 调试信息 ===');
    console.log(`荣耀 SKU 数量: ${skuIndex.byBrand.get('荣耀')?.length || 0}`);
    console.log(`华为 SKU 数量: ${skuIndex.byBrand.get('华为')?.length || 0}`);

    // 显示部分荣耀 SKU
    const honorSkus = skuIndex.byBrand.get('荣耀') || [];
    console.log('\n荣耀 SKU 示例 (前10):');
    honorSkus.slice(0, 10).forEach((sku, i) => {
      console.log(`  ${i + 1}. [${sku.id}] ${sku.name} (${sku.brand})`);
    });
    console.log('');
  }

  // 5. 开始匹配
  console.log('开始匹配...\n');
  console.log('========================================\n');

  const dataToProcess = options.limit ? excelData.slice(0, options.limit) : excelData;

  let matched = 0;
  let unmatched = 0;
  let correctMatch = 0;
  let incorrectMatch = 0;
  let unverified = 0;

  const results = [];

  for (let i = 0; i < dataToProcess.length; i++) {
    const row = dataToProcess[i];
    const inputBrand = extractBrand(row.skuName);
    const matchResult = matchSku(row.skuName, skuIndex.all, inputBrand);

    // 验证
    let isCorrect = false;
    let verificationStatus = '';

    if (row.correctAnswer) {
      if (matchResult.match) {
        // 检查 SKU 名称是否包含正确答案的核心信息
        const matchedName = matchResult.match.name || '';
        const correctName = row.correctAnswer;

        // 简单验证：检查正确答案的关键字是否在匹配结果中
        const matchedNormalized = normalizeSkuName(matchedName).toLowerCase();
        const correctNormalized = normalizeSkuName(correctName).toLowerCase();

        // 提取品牌进行验证
        const matchedBrand = matchResult.match.brand || '';
        const brandInCorrect = correctName.toLowerCase().includes(matchedBrand.toLowerCase());

        // 核心名称相似度
        const coreSimilarity = stringSimilarity(matchedNormalized, correctNormalized);

        // 宽松验证策略：
        // 1. 如果核心名称相似度 > 0.7，认为正确（即使品牌不匹配）
        // 2. 如果核心名称相似度 > 0.5 且品牌匹配，认为正确
        // 3. 如果核心名称包含正确答案或答案包含匹配结果，认为正确
        const coreContainsMatch = correctNormalized.includes(matchedNormalized.substring(0, 10)) ||
                                  matchedNormalized.includes(correctNormalized.substring(0, 10));
        const matchContainsCore = matchedNormalized.includes(correctNormalized.split(' ')[0]?.toLowerCase() || '') ||
                                 correctNormalized.includes(matchedName.split(' ')[0]?.toLowerCase() || '');

        if (coreSimilarity > 0.7 || (brandInCorrect && coreSimilarity > 0.5) || coreContainsMatch || matchContainsCore) {
          isCorrect = true;
          verificationStatus = '✓ 正确';
          correctMatch++;
        } else {
          verificationStatus = '✗ 错误';
          incorrectMatch++;
        }
      } else {
        verificationStatus = '✗ 未匹配';
        incorrectMatch++;
      }
    } else {
      verificationStatus = '-';
      unverified++;
    }

    const status = matchResult.match ? 'matched' : 'unmatched';
    if (status === 'matched') matched++;
    else unmatched++;

    results.push({
      index: i + 1,
      originalName: row.skuName,
      matchedSku: matchResult.match?.name || null,
      matchedBrand: matchResult.match?.brand || null,
      matchedSpu: matchResult.match?.spuName || null,
      score: matchResult.score,
      correctAnswer: row.correctAnswer || null,
      status,
      isCorrect,
      verificationStatus,
    });

    if (options.debug || options.showAll) {
      console.log(`[${i + 1}] ${status === 'matched' ? '✓' : '✗'} ${row.skuName}`);
      console.log(`    标准化: ${normalizeSkuName(row.skuName)}`);
      if (matchResult.match) {
        console.log(`    匹配: ${matchResult.match.name} (${matchResult.match.brand})`);
        console.log(`    SPU: ${matchResult.match.spuName}`);
        console.log(`    得分: ${(matchResult.score * 100).toFixed(1)}%`);
      } else {
        console.log(`    未匹配`);
      }
      if (row.correctAnswer) {
        console.log(`    验证: ${verificationStatus}`);
        console.log(`    正确答案: ${row.correctAnswer}`);
      }
      console.log('');
    } else {
      process.stdout.write(`\r进度: ${i + 1}/${dataToProcess.length}`);
    }
  }

  console.log('\n========================================');
  console.log('\n匹配结果统计:');
  console.log(`  总数: ${dataToProcess.length}`);
  console.log(`  匹配: ${matched} (${((matched / dataToProcess.length) * 100).toFixed(1)}%)`);
  console.log(`  未匹配: ${unmatched} (${((unmatched / dataToProcess.length) * 100).toFixed(1)}%)`);

  if (correctMatch + incorrectMatch > 0) {
    console.log('\n验证结果:');
    console.log(`  验证样本数: ${correctMatch + incorrectMatch}`);
    console.log(`  正确匹配: ${correctMatch}`);
    console.log(`  错误匹配: ${incorrectMatch}`);
    console.log(`  准确率: ${((correctMatch / (correctMatch + incorrectMatch)) * 100).toFixed(1)}%`);

    // 显示错误匹配
    const wrongMatches = results.filter(r => r.isCorrect === false && r.matchedSku);
    if (wrongMatches.length > 0) {
      console.log('\n错误匹配详情 (前10):');
      wrongMatches.slice(0, 10).forEach(r => {
        console.log(`  ${r.originalName}`);
        console.log(`    匹配到: ${r.matchedSku} (${r.matchedBrand})`);
        console.log(`    正确答案: ${r.correctAnswer}`);
      });
    }
  }

  if (unverified > 0) {
    console.log(`\n未验证: ${unverified} 条`);
  }

  // 显示未匹配的
  if (!options.showAll) {
    const unmatchedResults = results.filter(r => r.status === 'unmatched').slice(0, 10);
    if (unmatchedResults.length > 0) {
      console.log('\n未匹配的前 10 条:');
      for (const r of unmatchedResults) {
        console.log(`  ${r.originalName}`);
      }
    }
  }
}

main().catch(console.error);
