#!/usr/bin/env node
/**
 * Excel SKU 匹配 CLI 工具
 *
 * 用于测试 Excel 商品名称与系统 SPU 的匹配效果
 * 支持通过 69码 验证匹配结果
 *
 * 用法:
 *   node scripts/excel-matcher-cli.js <excel文件路径> [选项]
 *
 * 选项:
 *   --limit N       只处理前 N 条数据（默认: 全部）
 *   --show-all      显示所有结果，包括未匹配的
 *   --verify-gtin   通过 69码 查找正确答案并验证匹配结果
 *   --debug         显示调试信息
 *   --help, -h      显示帮助信息
 *
 * 示例:
 *   node scripts/excel-matcher-cli.js /path/to/太原纬图sku映射表.xls
 *   node scripts/excel-matcher-cli.js /path/to/太原纬图sku映射表.xls --limit 10 --verify-gtin
 */

import XLSX from 'xlsx';
import { getSPUListNew, getSKUListJoinSPU, getSKUList, getSKUInfo } from '@zsqk/z1-sdk/es/z1p/product.js';
import { SPUState, SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes.js';
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

// 第三方品牌前缀列表（这些前缀后面跟"荣耀"或"荣耀亲选"的不是荣耀官方产品）
const THIRD_PARTY_PREFIXES = [
  '极选 JOESKY', '乔威', '乐坞', '联创', 'WHIZKID', 'REEPRO', 'IOTAPK', '万魔', '极选',
  '荣耀亲选',  // 荣耀亲选是第三方品牌，不是荣耀官方
];

function extractBrand(skuName) {
  // 先检查是否是第三方品牌（包含荣耀但不是荣耀官方）
  for (const prefix of THIRD_PARTY_PREFIXES) {
    if (skuName.includes(prefix + '荣耀') || skuName.includes(prefix + '荣耀亲选') || skuName.includes(prefix)) {
      return null; // 第三方品牌，不提取荣耀
    }
  }
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(skuName)) {
      return brand;
    }
  }
  return null;
}

/**
 * 去除第三方品牌前缀
 * 例如："荣耀亲选荣耀MAGIC8PRO磁吸保护壳专供" -> "荣耀MAGIC8PRO磁吸保护壳专供"
 */
function removeThirdPartyPrefix(skuName) {
  for (const prefix of THIRD_PARTY_PREFIXES) {
    if (skuName.includes(prefix)) {
      return skuName.replace(new RegExp(prefix, 'g'), '').trim();
    }
  }
  return skuName;
}

/**
 * 将 Excel 格式转换为系统格式
 */
function convertToSystemFormat(skuName) {
  if (!skuName) return '';

  let normalized = skuName;

  // 1. 去除括号内的型号代码
  normalized = normalized.replace(/\([^)]*\)/g, ' ');

  // 2. 去除方括号和书名号
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ');
  normalized = normalized.replace(/《[^》]*》/g, ' ');

  // 3. 提取品牌
  const brand = extractBrand(normalized);
  let remaining = normalized;

  // 去除第三方品牌前缀（如"荣耀亲选"）
  remaining = removeThirdPartyPrefix(remaining);

  if (brand) {
    remaining = remaining.replace(new RegExp(`^${brand}`), '').trim();
  }

  // 4. 容量标准化 - 处理顺序很重要！
  // 先处理 SSD 作为分隔符的情况（要把 SSD 前后的容量分开）
  // 注意：必须在 TB/GB 替换之前处理，否则 1TB 会变成 1T 导致模式不匹配
  remaining = remaining.replace(/(\d+)\s*GB\s*SSD\s*(\d+)\s*TB/gi, '$1GB+$2TB');
  remaining = remaining.replace(/(\d+)\s*G\s*SSD\s*(\d+)\s*T/gi, '$1G+$2T');
  remaining = remaining.replace(/(\d+)\s*GB\s*SSD\s*(\d+)\s*GB/gi, '$1GB+$2GB');
  remaining = remaining.replace(/(\d+)\s*G\s*SSD\s*(\d+)\s*G/gi, '$1G+$2G');
  remaining = remaining.replace(/(\d+)\s*GB\s*SSD\s*(\d+)/gi, '$1GB+$2');
  remaining = remaining.replace(/(\d+)\s*G\s*SSD\s*(\d+)/gi, '$1G+$2');
  // 处理 SSD 直接作为分隔符的情况（如 512GBSSD1TB）
  remaining = remaining.replace(/(\d+)\s*SSD\s*(\d+)\s*TB/gi, '$1+$2TB');
  remaining = remaining.replace(/(\d+)\s*SSD\s*(\d+)\s*T/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)\s*SSD\s*(\d+)\s*GB/gi, '$1+$2GB');
  remaining = remaining.replace(/(\d+)\s*SSD\s*(\d+)\s*G/gi, '$1+$2G');
  remaining = remaining.replace(/(\d+)\s*SSD\s*(\d+)/gi, '$1+$2');

  // 再处理 TB 和 GB+GB 格式
  remaining = remaining.replace(/(\d+)\s*GBRAM\s*\+\s*(\d+)\s*TB/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)\s*GBRAM\s*\+\s*(\d+)\s*T/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*TB/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*T/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)\s*TB\s*\+\s*(\d+)\s*TB/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)\s*TB\s*\+\s*(\d+)\s*T/gi, '$1+$2T');
  // 先处理 TB（但要在 SSD 处理之后，否则 1TB 会变成 1T 导致 SSD 模式不匹配）
  remaining = remaining.replace(/(\d+)\s*TB/gi, '$1T');
  // 再处理 GB+GB 格式（如 12GB+256GB -> 12+256）
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*GB/gi, '$1+$2');
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*G/gi, '$1+$2');
  remaining = remaining.replace(/(\d+)\s*G\s*\+\s*(\d+)\s*GB/gi, '$1+$2');
  remaining = remaining.replace(/(\d+)\s*G\s*\+\s*(\d+)\s*G/gi, '$1+$2');
  // 处理纯GB或纯G（不带加号的）- 但要保留 FLIP2 后面的数字
  // FLIP2 后面如果紧跟数字，可能是容量不是型号的一部分
  // 例如：MAGICVFLIP212GB+1TB -> MAGICVFLIP2 12+1T
  remaining = remaining.replace(/(FLIP2)(\d+)GB/gi, '$1 $2');
  remaining = remaining.replace(/(FLIP2)(\d+)G/gi, '$1 $2');
  remaining = remaining.replace(/(FLIP2)(\d+)TB/gi, '$1 $2T');
  remaining = remaining.replace(/(FLIP2)(\d+)T/gi, '$1 $2T');
  remaining = remaining.replace(/(FLIP3)(\d+)GB/gi, '$1 $2');
  remaining = remaining.replace(/(FLIP3)(\d+)G/gi, '$1 $2');
  remaining = remaining.replace(/(FLIP3)(\d+)TB/gi, '$1 $2T');
  remaining = remaining.replace(/(FLIP3)(\d+)T/gi, '$1 $2T');
  // 再处理普通的 GB/G
  remaining = remaining.replace(/(\d+)\s*GB/gi, '$1');
  remaining = remaining.replace(/(\d+)\s*G/gi, '$1');

  // MagicBook 系列标准化 - 提取尺寸数字
  // 输入格式：MAGICBOOKPRO16202516吋 -> MagicBookPro16
  // 格式：MagicBookPro + 尺寸(2位) + 年份(4位) + 英寸(2位) + 吋
  // 例如：MAGICBOOKPRO16202516吋 = MagicBookPro + 16 + 2025 + 16 + 吋
  remaining = remaining.replace(/(MagicBookPro)(\d{2})(\d{4})(\d{1,2})吋/gi, '$1$2');
  remaining = remaining.replace(/(MagicBookArt)(\d{2})(\d{4})(\d{1,2})吋/gi, '$1$2');
  // 如果没有吋但有英寸
  remaining = remaining.replace(/(MagicBookPro)(\d{2})(\d{4})(\d{1,2})英寸/gi, '$1$2');
  remaining = remaining.replace(/(MagicBookArt)(\d{2})(\d{4})(\d{1,2})英寸/gi, '$1$2');
  // 去除年份但保留尺寸
  remaining = remaining.replace(/(MagicBookPro)(\d{2})(\d{4})/gi, '$1$2');
  remaining = remaining.replace(/(MagicBookArt)(\d{2})(\d{4})/gi, '$1$2');
  // 统一大小写
  remaining = remaining.replace(/MagicBookPro/i, 'MagicBookPro');
  remaining = remaining.replace(/MagicBookArt/i, 'MagicBookArt');
  remaining = remaining.replace(/MagicBook/i, 'MagicBook');

  // 5. 去除后缀（注意：保留版本后缀，因为系统 SPU 名称中也包含这些）
  // 先标准化 MAGIC 系列（去除空格）
  remaining = remaining.replace(/MAGIC\s*8\s*RSR\s*保时捷设计/gi, 'MAGIC8RSR保时捷设计');
  remaining = remaining.replace(/MAGIC\s*8\s*PROAIR/gi, 'MAGIC8PROAIR');
  remaining = remaining.replace(/MAGIC\s*8\s*PRO/gi, 'MAGIC8PRO');
  remaining = remaining.replace(/MAGIC\s*8/gi, 'MAGIC8');
  remaining = remaining.replace(/MAGIC\s*V\s*FLIP(\d*)/gi, 'MAGICVFLIP$1');
  remaining = remaining.replace(/MAGIC\s*V\s*(\d)/gi, 'MAGICV$1');
  remaining = remaining.replace(/MAGIC\s*Book/gi, 'MAGICBook');
  const suffixPatterns = [
    /零售样机/gi, /样机/gi,
    /双卡全网通版/gi, /双卡全网通/gi, /全网通版/gi, /全网通/gi, /双卡版/gi, /单卡版/gi,
    /WIFI版/gi, /WIFI6/gi,
    /ARLULTRA\d+/gi, /RTX\d+/gi, /SSD\d+TB/gi, /SSD\d+GB/gi, /SSD\d+G/gi,
    /RAM\d+GB/gi, /RAM\d+G/gi,
    /16吋/gi, /14\.6吋/gi, /14吋/gi,
  ];

  for (const pattern of suffixPatterns) {
    remaining = remaining.replace(pattern, ' ');
  }

  // 6. 英寸标准化
  remaining = remaining.replace(/(\d+\.?\d*)\s*吋/gi, '$1吋');
  remaining = remaining.replace(/(\d+\.?\d*)\s*寸/gi, '$1寸');

  // 7. 清理空格
  remaining = remaining.replace(/\s+/g, ' ').trim();

  return brand ? `${brand} ${remaining}` : remaining;
}

/**
 * 解析 Excel 文件
 */
function parseExcelFile(filePath) {
  const workbook = XLSX.read(filePath, { type: 'file' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 2) {
    throw new Error('Excel 文件数据少于2行');
  }

  const header = jsonData[0];
  const skuNameIndex = header.findIndex(h => String(h).includes('纬图sku名称') || String(h).includes('sku名称'));
  const gtinIndex = header.findIndex(h => String(h).includes('69码') || String(h).includes('GTIN') || String(h).includes('条码'));

  if (skuNameIndex === -1) {
    throw new Error('未找到"纬图sku名称"列');
  }

  const results = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const skuName = String(row[skuNameIndex] || '').trim();
    const gtin = String(row[gtinIndex] || '').trim();

    if (!skuName) continue;

    results.push({ skuName, gtin });
  }

  return results;
}

/**
 * 简单的模糊匹配函数
 */
function fuzzyMatch(input, spu) {
  const spuName = spu.name || '';
  const spuBrand = spu.brand || '';

  if (!spuName) {
    return { matched: false, score: 0, reason: 'SPU名称为空' };
  }

  const spuLower = spuName.toLowerCase();

  // 过滤配件类商品（如果输入不是配件，但SPU是配件，降低优先级）
  const accessoryKeywords = [
    '保护壳', '手机壳', '保护套', '手机套', '壳',
    '钢化膜', '膜', '贴膜', '屏幕保护',
    '充电器', '充电线', '数据线', '充电头',
    '耳机', '耳塞', '音频线',
    '支架', '车载', '车充',
    '电池', '移动电源', '充电宝',
    '表带', '腕带',
    '机模', '模型', '高清膜', '柔光膜', '磨砂膜', '防窥膜',
    '智能视窗', '保护套', '肤感', '磁吸'
  ];

  const isInputAccessory = accessoryKeywords.some(k => input.toLowerCase().includes(k));
  const isSpuAccessory = accessoryKeywords.some(k => spuLower.includes(k));

  // 如果输入是配件（保护壳、膜、充电器等），但 SPU 是手机/平板等主产品（不是配件），跳过
  // 这处理了 "荣耀MAGIC8PRO磁吸保护壳" 不应匹配 "荣耀Magic3 Pro" 的情况
  if (isInputAccessory) {
    // 判断 SPU 是否是配件（看 SPU 名称中是否包含配件关键词）
    const accessoryInSpu = accessoryKeywords.some(k => spuLower.includes(k));
    // 如果 SPU 是主产品（不是配件），跳过
    if (!accessoryInSpu) {
      return { matched: false, score: 0, reason: 'SPU是主产品（非配件）' };
    }
  }

  // 如果输入是配件，优先匹配配件 SPU
  // 配件 SPU 通常名称中包含：保护壳、保护膜、肤感磁吸、磁吸保护壳等
  let accessoryBoost = 0;
  if (isInputAccessory) {
    const hasAccessoryWordInSpu = accessoryKeywords.some(k => spuLower.includes(k));
    if (hasAccessoryWordInSpu) {
      accessoryBoost = 0.2; // 配件匹配配件，给一定加分
    }
  }

  const inputLower = input.toLowerCase();

  // 检查是否产品类型不匹配（手机 vs 手表 vs 平板 vs 笔记本 vs 配件）
  // 注意：magicv6 包含 magicv（Magic V系列手机）
  // 注意：不要用 'pro' 作为手机关键词，因为它太通用，会错误匹配配件（如"60 Pro原装保护壳"）
  const phoneKeywords = ['magicv', 'vflip', 'flip2', 'flip3', 'magic8', 'magic7', 'magic6', 'magic5', 'magic4', 'magic3', 'x70', 'x80', 'x90', 'p70', 'p60', 'mate60', 'nova', '500'];
  const watchKeywords = ['watch', '手表', '手环'];
  const laptopKeywords = ['book', '笔记本', 'magicpad'];
  const tabletKeywords = ['平板', 'pad', 'tab'];
  // 配件关键词（单独出现时表示纯配件）
  const accessoryOnlyKeywords = ['保护壳', '手机壳', '保护套', '手机套',
    '钢化膜', '膜', '贴膜', '屏幕保护',
    '充电器', '充电线', '数据线', '充电头',
    '耳机', '耳塞', '音频线',
    '支架', '车载', '车充',
    '电池', '移动电源', '充电宝',
    '机模', '模型', '高清膜', '柔光膜', '磨砂膜', '防窥膜',
    '智能视窗', '肤感', '磁吸'];
  // 手表配件关键词（手表+配件还是手表，不是纯配件）
  const watchAccessoryKeywords = ['表带', '腕带'];

  const isInputPhone = phoneKeywords.some(k => inputLower.includes(k));
  const isInputWatch = watchKeywords.some(k => inputLower.includes(k));
  const isInputLaptop = laptopKeywords.some(k => inputLower.includes(k));
  const isInputTablet = tabletKeywords.some(k => inputLower.includes(k));

  // 检查输入是否是纯配件（不包含手表、平板等主产品关键词）
  const isInputAccessoryOnly = !isInputWatch && !isInputTablet && !isInputLaptop && !isInputPhone &&
    accessoryOnlyKeywords.some(k => inputLower.includes(k));
  // 检查输入是否是手表+配件（应该被视为手表而不是配件）
  const isInputWatchWithAccessory = isInputWatch && watchAccessoryKeywords.some(k => inputLower.includes(k));

  const isSpuWatch = watchKeywords.some(k => spuLower.includes(k));
  const isSpuLaptop = laptopKeywords.some(k => spuLower.includes(k));
  const isSpuTablet = tabletKeywords.some(k => spuLower.includes(k));

  // 如果输入是手表但SPU是耳机/配件，跳过
  // 注意：如果输入是手表+配件（如手表+表带），仍然不应该匹配耳机
  if (isInputWatch) {
    // SPU是耳机或配件
    const spuIsEarphone = ['耳机', '耳塞', 'earbud', 'earbuds'].some(k => spuLower.includes(k));
    if (spuIsEarphone) {
      return { matched: false, score: 0, reason: '产品类型不匹配(手表vs耳机)' };
    }
  }

  // 如果输入是手机但SPU是手表，跳过
  if (isInputPhone && isSpuWatch) {
    return { matched: false, score: 0, reason: '产品类型不匹配(手机vs手表)' };
  }
  // 如果输入是手机但SPU是笔记本，跳过
  if (isInputPhone && isSpuLaptop) {
    return { matched: false, score: 0, reason: '产品类型不匹配(手机vs笔记本)' };
  }
  // 如果输入是手机但SPU是平板，跳过
  if (isInputPhone && isSpuTablet) {
    return { matched: false, score: 0, reason: '产品类型不匹配(手机vs平板)' };
  }
  // 如果输入是平板但SPU是手表，跳过
  if (isInputTablet && isSpuWatch) {
    return { matched: false, score: 0, reason: '产品类型不匹配(平板vs手表)' };
  }

  // 如果输入包含配件关键词但SPU不包含（或反过来），跳过
  // 这处理了 "荣耀MAGIC8PRO磁吸保护壳" 不应匹配 "荣耀60 Pro原装保护壳" 的情况
  const accessoryCheckKeywords = ['保护壳', '膜', '肤感', '磁吸', '钢化膜', '充电器', '耳机', '智能视窗'];
  const inputHasAccessory = accessoryCheckKeywords.some(k => inputLower.includes(k));
  const spuHasAccessory = accessoryCheckKeywords.some(k => spuLower.includes(k));
  if (inputHasAccessory !== spuHasAccessory) {
    // 一个有配件关键词，一个没有，类型不匹配
    return { matched: false, score: 0, reason: '产品类型不匹配(配件vs主产品)' };
  }

  // 提取输入的品牌
  const inputBrand = extractBrand(input);

  // 如果系统SPU有品牌，必须匹配
  if (spuBrand && inputBrand) {
    if (inputBrand.toLowerCase() !== spuBrand.toLowerCase()) {
      // 如果SPU名称中包含检测到的品牌（如"荣耀" in "荣耀思派力..."），仍然允许匹配
      // 这处理了子品牌的情况，如"荣耀思派力"应该匹配品牌"其他"的SPU
      if (!spuLower.includes(inputBrand.toLowerCase())) {
        return { matched: false, score: 0, reason: '品牌不匹配' };
      }
    }
  } else if (inputBrand && !spuBrand) {
    if (!spuLower.includes(inputBrand.toLowerCase())) {
      return { matched: false, score: 0, reason: '品牌不匹配' };
    }
  }

  // 移除品牌后比较
  let inputPart = inputLower;
  let spuPart = spuLower;

  if (inputBrand) {
    inputPart = inputLower.replace(inputBrand.toLowerCase(), '').trim();
  }
  if (spuBrand) {
    spuPart = spuLower.replace(spuBrand.toLowerCase(), '').trim();
  }

  // 去除所有空格以便模式匹配（如 "magicv6" vs "magic v6"）
  const inputPartNoSpace = inputPart.replace(/\s+/g, '');
  const spuPartNoSpace = spuPart.replace(/\s+/g, '');

  // MagicBook 系列标准化 - 提取 MagicBookPro/Art + 尺寸数字
  // 输入格式：magicbookpro16202516吋... -> MagicBookPro16
  // SPU 格式：magicbookpro162025款2代... -> MagicBookPro16
  // 注意：需要匹配到分隔符（款、吋等）并将其替换掉
  const normalizeModelName = (str) => {
    return str
      // 输入格式：magicbookpro16202516吋 -> MagicBookPro16
      // 匹配 magicbookpro + 2位尺寸 + 4位年份 + 吋/英寸/款 并替换为 MagicBookProXX
      .replace(/magicbookpro(\d{2})\d{4}.*?(?=吋|英寸|款)/gi, 'MagicBookPro$1')
      .replace(/magicbookart(\d{2})\d{4}.*?(?=吋|英寸|款)/gi, 'MagicBookArt$1')
      // 去除剩余的英寸标识
      .replace(/英寸/gi, '')
      .replace(/吋/gi, '')
      // 统一大小写（处理没有被上面规则匹配到的情况）
      .replace(/magicbookpro/gi, 'MagicBookPro')
      .replace(/magicbookart/gi, 'MagicBookArt')
      .replace(/magicbook/gi, 'MagicBook');
  };
  const normalizedInput = normalizeModelName(inputPartNoSpace);
  const normalizedSpu = normalizeModelName(spuPartNoSpace);

  // 按优先级排序的模式（更具体的在前）
  // 注意：MagicBook 必须放在 MAGIC 系列模式之前，因为 MAGIC 模式会匹配 "magic" 前缀
  const modelPatterns = [
    // MagicBook 系列 - 必须放在 MAGIC 通用模式之前
    /MagicBook\s*(?:Pro|Art)\s*\d*/i,
    /MagicBook\s*(?:Pro|Art)/i,
    /MagicBook/i,
    // MAGIC8 RSR 保时捷设计（特殊型号，需要优先匹配）
    /MAGIC8?RSR保时捷设计/i,
    // MAGIC 系列 - V系列：MAGICVFLIP2, MAGICVS3, MAGICV3PRO 等
    /MAGIC\s*V\s*(?:Flip\d*|Pro\d*|Air\d*|Max\d*|Ultra\d*|S\d*|\d+)*/i,
    // MAGIC 系列 - 非V系列：MAGIC8PROAIR, MAGIC8PRO, MAGIC8 等
    // 注意：这个模式使用 + 而不是 *，确保至少匹配一个字符
    /MAGIC\s*(?:\d+)?\s*(?:ProAir|Pro\d*|Air\d*|Max\d*|Ultra\d*)+/i,
    /MAGIC/i,
    // 手机型号 - 修复: X\d{1,} 允许1位数字如X5
    // 但要排除 X5LINK 这种情况（X5后面直接跟LINK是型号的一部分）
    /X(?!\d+LINK)\d{1,}/i,
    /X5LINK/i,  // 单独处理 X5LINK 型号
    /V\d{1,}/i,
    /Mate\s*\d+/i,
    /P\d{2,}/i,
    /nova\s*\d*/i,
    /iPhone\s*\d+/i,
    // 平板、笔记本
    /平板/i,
    /Book/i,
    /WIN/i,
    // 英寸
    /\d+\.?\d*吋/i,
    /\d+\.?\d*寸/i,
  ];

  // 使用第一个匹配（已按优先级排序）
  let inputModel = null;
  let spuModel = null;

  for (const pattern of modelPatterns) {
    // 找到输入的第一个匹配就停止（按优先级）
    if (!inputModel) {
      const inputMatch = normalizedInput.match(pattern);  // 使用标准化后的字符串
      if (inputMatch) {
        inputModel = inputMatch[0];
        // 如果输入匹配到了 MAGIC 系列，SPU 也必须匹配到才能继续
        if (/^MAGIC/i.test(inputModel)) {
          const spuMagicMatch = normalizedSpu.match(/^MAGIC/i);
          if (!spuMagicMatch) {
            // SPU 不是 MAGIC 开头，可能不是同类产品
            inputModel = null;
            break;
          }
        }
        // 如果输入匹配到了 V 系列（如 V9、V10），SPU 也必须匹配 V 系列
        // 而不是通用的"平板"，否则认为是产品类型不匹配
        if (/^V\d+$/i.test(inputModel)) {
          const spuVMatch = normalizedSpu.match(/V\d+/i);
          if (!spuVMatch) {
            // SPU 没有匹配 V 系列（如只有"平板"），继续寻找更合适的匹配
            inputModel = null;
            continue; // 继续寻找下一个模式
          }
        }
      }
    }
    // SPU 同样处理
    if (!spuModel) {
      const spuMatch = normalizedSpu.match(pattern);
      if (spuMatch) {
        spuModel = spuMatch[0];
      }
    }
    // 两个都找到了，可以停止
    if (inputModel && spuModel) break;
  }

  // 如果没有匹配到完整模型，检查是否有部分匹配（用于模糊匹配）
  if (!inputModel || !spuModel) {
    // 检查 MAGIC 是否作为完整词出现
    const magicInputMatch = inputPart.match(/\bmagic\b/i);
    const magicSpuMatch = spuPart.match(/\bmagic\b/i);
    if (magicInputMatch && magicSpuMatch) {
      inputModel = 'MAGIC';
      spuModel = 'MAGIC';
    }
  }

  if (inputModel && spuModel) {
    // 检查模型是否完整匹配（不能只是一个前缀）
    const inputModelLower = inputModel.toLowerCase();
    const spuModelLower = spuModel.toLowerCase();

    // 如果匹配到的是通用类别（如"平板"），继续模糊匹配以找到具体型号
    // 只有当匹配到具体型号时才给分
    // 修复: 只检查 inputModel 是否等于通用类别，而不是包含
    // 注意：MagicBookPro16 包含 "book" 但有具体型号，不应视为通用匹配
    const genericModels = ['平板', 'book', 'magic'];
    const isGenericMatch = genericModels.some(g => inputModelLower === g.toLowerCase());

    // 如果匹配到 V 系列但后面跟了3+数字（如V911），可能是匹配到了"11.5"等尺寸
    // V系列只有V9(1位数字)、V10+(2位数字)，不应该有3位数字
    const isInvalidVModel = /^v\d{3,}$/i.test(inputModelLower);

    // 如果 input 有更长的模型名但只匹配到了前缀，不应该得分
    // 例如：输入 "MAGICVFLIP2" 只匹配到 "MAGIC"，应该继续模糊匹配
    // 注意：如果匹配到的模型包含数字（如V9、X70），通常已经是完整型号，不应视为前缀
    const inputHasLongerModel = /magic\w{3,}|x70\w+|v9\w+|平板\w+|平板/i.test(inputPart);
    const matchedIsPrefix = inputModelLower.length < 5 && inputHasLongerModel && !/\d/.test(inputModelLower);

    // 如果是无效V型号（V后面跟了3+数字），说明匹配到了"11.5"等尺寸
    // 尝试提取正确的V型号（如V9），并使用它进行精确匹配
    if (isInvalidVModel) {
      const correctVMatch = inputPartNoSpace.match(/V(\d{1,2})(?!\d)/i);
      if (correctVMatch) {
        const correctedInputModel = correctVMatch[0]; // e.g., "V9"
        console.log(`[精确匹配] 检测到无效V型号 "${inputModel}"，尝试使用正确型号 "${correctedInputModel}"`);
        // 使用正确的V型号进行后续匹配
        inputModel = correctedInputModel;
        inputModelLower = inputModel.toLowerCase();
        // 不再视为无效
        isInvalidVModel = false;
      }
    }

    // 尝试缩短 MAGIC 系列型号，去除可能的容量数字
    // 例如：MAGICVFLIP212 -> MAGICVFLIP2 (去掉"12"可能是容量)
    //       MAGICVFLIP216 -> MAGICVFLIP2 (去掉"16"可能是容量)
    if (/^magicvflip\d+$/i.test(inputModelLower) && inputModelLower !== spuModelLower) {
      const shortenedModel = inputModelLower.replace(/(\d+)$/, (match, digits) => {
        // 如果数字是 12, 16, 32, 64, 128, 256, 512 等常见容量，尝试去除
        if (['12', '16', '32', '64', '128', '256', '512'].includes(digits)) {
          return inputModelLower.slice(0, -digits.length);
        }
        // 如果原模型只有2位数字，去掉最后一位
        if (/\d{2}$/.test(inputModelLower) && inputModelLower.replace(/^magicvflip/i, '').length <= 2) {
          return inputModelLower.slice(0, -1);
        }
        return match;
      });
      if (shortenedModel !== inputModelLower) {
        console.log(`[精确匹配] 尝试缩短型号 "${inputModelLower}" -> "${shortenedModel}"`);
        inputModel = shortenedModel;
        inputModelLower = inputModel.toLowerCase();
      }
    }

    // 如果精确匹配失败（modelScore = 0），检查是否是明显的型号不匹配
    // 这些情况不应该进入模糊匹配，应该直接拒绝
    // 例如：输入 "500" 但 SPU 是 "Magic3"，这是产品类型不匹配
    if (!inputModel || !spuModel || inputModelLower !== spuModelLower) {
      // 检查是否有明显的产品系列冲突
      // 500 系列 vs 其他系列（如 Magic3、V9 等）
      const has500Input = /(^|[\s\-])500[\s\-]?/i.test(inputModelLower) || /(^|[\s\-])500pro/i.test(inputModelLower);
      const has500Spu = /(^|[\s\-])500[\s\-]?/i.test(spuModelLower) || /(^|[\s\-])500pro/i.test(spuModelLower);

      // 如果一个有 500，另一个没有 500（且不是平板或配件），可能是不匹配的
      if (has500Input && !has500Spu) {
        // 检查 SPU 是否是其他手机系列（Magic、V、X 等）
        const otherPhonePatterns = [/magicv/i, /magic\s*[3-9]/i, /v\d+/i, /x\d+/i, /mate/i, /nova/i, /p\d+/i];
        const isOtherPhone = otherPhonePatterns.some(p => p.test(spuModelLower));
        if (isOtherPhone) {
          return { matched: false, score: 0, reason: '500系列 vs 其他手机系列' };
        }
      }

      // 类似地检查 Magic3 vs 500 的情况
      const hasMagic3Input = /magic\s*3/i.test(inputModelLower);
      const hasMagic3Spu = /magic\s*3/i.test(spuModelLower);
      if (hasMagic3Input && !hasMagic3Spu) {
        const has500SpuOther = /500/i.test(spuModelLower);
        if (has500SpuOther) {
          return { matched: false, score: 0, reason: 'Magic3 vs 500系列' };
        }
      }
    }

    // 尝试缩短 MAGICV 系列型号，去除可能的容量数字
    // 例如：MAGICV616 -> MAGICV6 (去掉"16"可能是容量)
    if (/^magicv\d{3,}$/i.test(inputModelLower) && inputModelLower !== spuModelLower) {
      const shortenedModel = inputModelLower.replace(/(\d+)$/, (match, digits) => {
        // 如果数字是 16, 32, 64 等常见容量，尝试去除
        if (['16', '32', '64'].includes(digits)) {
          return inputModelLower.slice(0, -digits.length);
        }
        return match;
      });
      if (shortenedModel !== inputModelLower) {
        console.log(`[精确匹配] 尝试缩短 MAGICV 型号 "${inputModelLower}" -> "${shortenedModel}"`);
        inputModel = shortenedModel;
        inputModelLower = inputModel.toLowerCase();
      }
    }

    // 如果是通用匹配或前缀匹配，继续模糊匹配
    if (isGenericMatch || matchedIsPrefix) {
      inputModel = null;
      spuModel = null;
    } else {
      const modelScore = inputModelLower === spuModelLower ? 0.9 : 0;
      if (modelScore > 0) {
        // 检查版本后缀：如果输入有版本后缀但SPU没有，降低分数
        // 版本同义词：高定款=高定版
        const versionKeywords = ['焕新版', '标准版', '公开版', '定制版', '高配版', '尊享版', '典藏版'];
        const versionSynonyms = { '高定款': '高定版', '高定版': '高定款' };
        let hasVersionSuffix = false;
        let versionMatched = false;

        for (const version of versionKeywords) {
          if (inputPartNoSpace.includes(version)) {
            hasVersionSuffix = true;
            // 输入有版本后缀，SPU也必须有
            if (!spuPartNoSpace.includes(version)) {
              // SPU没有版本后缀，降低分数
              return { matched: true, score: 0.5, reason: '型号匹配(版本不匹配)' };
            }
            versionMatched = true;
          }
        }

        // 检查同义词版本（如高定款和高定版）
        for (const [inputVer, spuVer] of Object.entries(versionSynonyms)) {
          if (inputPartNoSpace.includes(inputVer) && spuPartNoSpace.includes(spuVer)) {
            versionMatched = true;
          } else if (inputPartNoSpace.includes(inputVer) && !spuPartNoSpace.includes(spuVer)) {
            // 输入有版本但SPU没有对应的同义词
            return { matched: true, score: 0.5, reason: '型号匹配(版本不匹配)' };
          }
        }

        return { matched: true, score: modelScore, reason: '型号匹配' };
      }

      // 如果精确匹配失败（modelScore = 0），检查是否是V系列型号不匹配
      // 例如输入V9但SPU是V8，这种情况下不应使用模糊匹配（会错误匹配）
      if (inputModelLower && spuModelLower) {
        // 检查精确的 V+digit 模式
        const inputVMatch = inputModelLower.match(/^v(\d+)$/i);
        const spuVMatch = spuModelLower.match(/^v(\d+)$/i);
        if (inputVMatch && spuVMatch) {
          const inputVNum = parseInt(inputVMatch[1], 10);
          const spuVNum = parseInt(spuVMatch[1], 10);
          if (inputVNum !== spuVNum) {
            // V系列型号不同，不应模糊匹配
            return { matched: false, score: 0, reason: 'V型号不匹配' };
          }
        }

        // 检查 MAGICV 系列：提取 MAGICV 后面的数字进行比较
        // 例如: MAGICV616 vs MAGICV6 - 数字不同，不应匹配
        const inputMagicVMatch = inputModelLower.match(/magicv(\d+)/i);
        const spuMagicVMatch = spuModelLower.match(/magicv(\d+)/i);
        if (inputMagicVMatch && spuMagicVMatch) {
          const inputVNum = parseInt(inputMagicVMatch[1], 10);
          const spuVNum = parseInt(spuMagicVMatch[1], 10);
          if (inputVNum !== spuVNum) {
            // MAGICV系列型号不同，不应模糊匹配
            return { matched: false, score: 0, reason: 'MAGICV型号不匹配' };
          }
        }

        // 检查 MAGIC8 系列：提取 MAGIC8 后面的后缀进行比较
        // 例如: MAGIC8PRO vs MAGIC8 - 如果输入是 MAGIC8PRO，SPU 是 MAGIC8 但没有 PRO 后缀，不应模糊匹配
        // 注意：Magic3 Pro 包含 magic3，不是 magic8，所以即使有 MAGIC 前缀，也不应匹配 MAGIC8
        const inputMagic8Match = inputModelLower.match(/^magic(8|8pro|8proair|8rsr保时捷设计)/i);
        const spuMagic8Match = spuModelLower.match(/^magic(8|8pro|8proair|8rsr保时捷设计)/i);
        if (inputMagic8Match && spuMagic8Match) {
          // 两者都有 MAGIC8 前缀，检查具体型号是否匹配
          const inputSuffix = inputMagic8Match[1].toLowerCase();
          const spuSuffix = spuMagic8Match[1].toLowerCase();
          if (inputSuffix !== spuSuffix) {
            // 具体型号不同（如 MAGIC8PRO vs MAGIC8），不应模糊匹配
            return { matched: false, score: 0, reason: 'MAGIC8型号不匹配' };
          }
        }

        // 如果输入有 MAGIC8 前缀但 SPU 不是 MAGIC8 系列，拒绝匹配
        if (/^magic8/i.test(inputModelLower)) {
          if (!/^magic8/i.test(spuModelLower)) {
            return { matched: false, score: 0, reason: 'MAGIC8 vs 非MAGIC8产品' };
          }
        }

        // 检查配件关键词冲突：如果输入包含配件关键词（如保护壳、膜），但 SPU 不包含
        // 这处理了 "MAGIC8PRO肤感磁吸保护壳" 不应匹配 "60 Pro原装保护壳" 的情况
        const accessoryPatterns = ['保护壳', '膜', '肤感', '磁吸', '钢化膜', '充电器', '耳机'];
        const hasAccessoryInInput = accessoryPatterns.some(k => inputModelLower.includes(k));
        const hasAccessoryInSpu = accessoryPatterns.some(k => spuModelLower.includes(k));
        if (hasAccessoryInInput && !hasAccessoryInSpu) {
          // 输入有配件关键词但 SPU 没有，说明是产品类型不匹配
          return { matched: false, score: 0, reason: '产品类型不匹配(主产品vs配件)' };
        }
        if (!hasAccessoryInInput && hasAccessoryInSpu) {
          // SPU 有配件关键词但输入没有，说明是配件匹配主产品
          return { matched: false, score: 0, reason: '产品类型不匹配(配件vs主产品)' };
        }

        // 如果两个都是配件（都包含配件关键词），检查它们是否属于同一个产品系列
        // 例如：MAGIC8PRO保护壳 vs 60Pro保护壳 - 应该拒绝匹配
        if (hasAccessoryInInput && hasAccessoryInSpu) {
          // 提取输入中包含的产品系列标识
          const productSeriesPatterns = [
            /magic\s*8\s*(?:pro|proair|rsr保时捷设计)?/i,
            /magic\s*v\s*\d*/i,
            /magic\s*\d+/i,
            /500\s*pro/i,
            /60\s*pro/i,
            /平板/i,
            /手表/i,
          ];
          let inputSeries = null;
          let spuSeries = null;
          for (const p of productSeriesPatterns) {
            if (!inputSeries && p.test(inputModelLower)) {
              inputSeries = p.exec(inputModelLower)?.[0];
            }
            if (!spuSeries && p.test(spuModelLower)) {
              spuSeries = p.exec(spuModelLower)?.[0];
            }
            if (inputSeries && spuSeries) break;
          }
          // 如果都找到了产品系列但不相同，拒绝匹配
          if (inputSeries && spuSeries && inputSeries.toLowerCase() !== spuSeries.toLowerCase()) {
            // 检查是否是包含关系（如 "magic8pro" 包含 "magic8"）
            const normalizedInput = inputSeries.toLowerCase().replace(/\s+/g, '');
            const normalizedSpu = spuSeries.toLowerCase().replace(/\s+/g, '');
            if (!normalizedInput.includes(normalizedSpu) && !normalizedSpu.includes(normalizedInput)) {
              return { matched: false, score: 0, reason: '配件产品系列不匹配' };
            }
          }
        }

        // 检查其他 V+digit 在中间的情况: 如 "xv616" vs "xv6"
        const inputMidVMatch = inputModelLower.match(/[a-z]+v(\d+)/i);
        const spuMidVMatch = spuModelLower.match(/[a-z]+v(\d+)/i);
        if (inputMidVMatch && spuMidVMatch && inputMidVMatch[0] === spuMidVMatch[0]) {
          // 前缀相同（如都是 "magicv"），但数字不同
          const inputVNum = parseInt(inputMidVMatch[1], 10);
          const spuVNum = parseInt(spuMidVMatch[1], 10);
          if (inputVNum !== spuVNum) {
            return { matched: false, score: 0, reason: 'V系列型号不匹配' };
          }
        }

        // 检查 X+digit 系列: 如 X70 vs X80, X60Pro vs X70Pro
        const inputXMatch = inputModelLower.match(/x(\d+)/i);
        const spuXMatch = spuModelLower.match(/x(\d+)/i);
        if (inputXMatch && spuXMatch) {
          // 如果两者的 X 前面都有相同的前缀(如 "matex" vs "matex")，说明是同系列
          // 但如果 X 前面是不同前缀，可能是不同系列
          const inputXPrefix = inputModelLower.substring(0, inputXMatch.index);
          const spuXPrefix = spuModelLower.substring(0, spuXMatch.index);
          if (inputXPrefix === spuXPrefix || inputXPrefix.length === 0 || spuXPrefix.length === 0) {
            // 同系列或任一是纯 X+digit
            const inputXNum = parseInt(inputXMatch[1], 10);
            const spuXNum = parseInt(spuXMatch[1], 10);
            if (inputXNum !== spuXNum) {
              return { matched: false, score: 0, reason: 'X系列型号不匹配' };
            }
          }
        }
      }
    }
  }

  // 计算相似度 - 使用更智能的匹配
  // 将输入和SPU都提取关键词，然后计算重叠

  // 提取关键子串（长度>=2的连续字符段）
  const extractKeyParts = (str) => {
    const parts = [];
    // 按空格、标点分割
    const words = str.split(/[\s\-_\.,，、。]+/);
    for (const word of words) {
      if (word.length >= 2) {
        parts.push(word.toLowerCase());
      }
    }
    // 添加数字+字母组合
    // 规则：
    // 1. 容量格式：12G+256G, 8GB+256GB, 12+256 -> 优先匹配整体
    // 2. 字母开头+数字结尾：MAGIC8, X70, V9, PROAIR -> 作为整体
    // 3. 数字开头+字母：512GB -> 只取长度>=4的（避免 "2" 匹配 "Watch 2"）
    // 先匹配容量格式
    const capacityMatches = str.match(/\d+G\s*\+\s*\d+G|\d+GB\s*\+\s*\d+GB|\d+\+\d+/gi);
    if (capacityMatches) {
      for (const m of capacityMatches) {
        // 去除空格后添加到列表
        const normalized = m.replace(/\s+/g, '').toLowerCase();
        parts.push(normalized);
      }
    }
    // 再匹配字母+数字组合（排除已匹配的容量格式部分）
    let remaining = str;
    if (capacityMatches) {
      for (const m of capacityMatches) {
        remaining = remaining.replace(m, ' ');
      }
    }
    const mixedMatches = remaining.match(/[a-zA-Z]+\d+[a-zA-Z\d]*/gi);
    if (mixedMatches) {
      for (const m of mixedMatches) {
        if (m.length >= 3) {
          parts.push(m.toLowerCase());
        }
      }
    }
    // 最后匹配数字+字母（长度>=4，避免单独数字）
    const digitAlphaMatches = remaining.match(/\d+[a-zA-Z]{2,}/gi);
    if (digitAlphaMatches) {
      for (const m of digitAlphaMatches) {
        if (m.length >= 4) {
          parts.push(m.toLowerCase());
        }
      }
    }
    return parts;
  };

  // 提取型号模式（如 magicv6, v9, x70 等）用于特殊校验
  // 用于防止 "magicv616" 错误匹配 "magicv6" 等情况
  const extractModelPatterns = (str) => {
    const patterns = [];
    // 匹配 字母+数字 组合，如 magicv6, v9, x70, magicbook
    const matches = str.match(/[a-zA-Z]+\d*[a-zA-Z]*\d+[a-zA-Z]*|[a-zA-Z]+\d+/gi);
    if (matches) {
      for (const m of matches) {
        if (m.length >= 3) {
          patterns.push(m.toLowerCase());
        }
      }
    }
    return patterns;
  };

  const inputParts = extractKeyParts(inputPart);
  const spuParts = extractKeyParts(spuPart);

  let matchCount = 0;
  let matchedParts = [];

  for (const inputP of inputParts) {
    for (const spuP of spuParts) {
      // 检查是否包含或被包含
      let isMatch = spuP.includes(inputP) || inputP.includes(spuP) ||
          spuP.startsWith(inputP) || inputP.startsWith(spuP);

      // 防止 "616gb" 匹配 "16" 等错误匹配
      // 如果 inputP 包含字母+数字混合（如 "616gb"），但 spuP 是纯数字
      // 这种情况下不能认为匹配（因为 616gb 不是 16）
      if (isMatch) {
        const inputHasLetterDigitMix = /[a-zA-Z]+\d+/i.test(inputP);
        const spuIsPureNumber = /^\d+$/.test(spuP);
        if (inputHasLetterDigitMix && spuIsPureNumber) {
          isMatch = false;
        }
      }

      // 特殊处理：防止型号部分重叠但实际不同的错误匹配
      // 核心问题: "magicv616" 不应匹配 "magicv6"，"magicvflip2" 不应匹配 "magicv6"
      if (isMatch) {
        const inputLower = inputP.toLowerCase();
        const spuLower = spuP.toLowerCase();

        // 提取更完整的字母+数字模型模式
        // 匹配字母、数字、以及中间的混合部分
        // 例如: "magicvflip2", "v6", "x70", "magicv6"
        const fullModelPattern = /[a-z]+\d*[a-z]*\d+[a-z]*|[a-z]+\d+/gi;
        const inputModels = inputP.match(fullModelPattern) || [];
        const spuModels = spuP.match(fullModelPattern) || [];

        // 合并所有匹配的模型部分进行比较
        const allInputParts = inputModels.join('|');
        const allSpuParts = spuModels.join('|');

        // 如果任一方有提取到模型
        if (allInputParts || allSpuParts) {
          // 检查是否完全不匹配（用于决定是否拒绝）
          const hasMismatch = (allInputParts && allSpuParts && allInputParts !== allSpuParts);

          if (hasMismatch) {
            // 检查是否真的是不同型号，还是只是包含关系
            // 如果 input 包含 spu，且 spu 是一个有效的结尾（字母或数字结尾），则可能是不同型号
            if (inputLower.includes(spuLower) && inputLower !== spuLower) {
              const spuEndsWithLetterDigit = /[a-z\d]$/i.test(spuP);
              if (spuEndsWithLetterDigit) {
                isMatch = false;
              }
            }
            // 如果 spu 包含 input，且 input 是一个有效的结尾
            if (spuLower.includes(inputLower) && spuLower !== inputLower) {
              const inputEndsWithLetterDigit = /[a-z\d]$/i.test(inputP);
              if (inputEndsWithLetterDigit) {
                isMatch = false;
              }
            }
          }
        }

        // 额外检查：如果两个字符串有相同的字母+数字基础但数字部分不同
        // 例如: "v616" vs "v6" 或 "magicvflip2" vs "magicv6"
        if (isMatch) {
          const inputHasDigitSequence = inputP.match(/\d+/);
          const spuHasDigitSequence = spuP.match(/\d+/);

          if (inputHasDigitSequence && spuHasDigitSequence) {
            // 提取字母前缀（字母序列 + 可选的 V）
            const inputAlphaPrefix = inputP.match(/[a-zA-Z]+V?/i)?.[0]?.toLowerCase();
            const spuAlphaPrefix = spuP.match(/[a-zA-Z]+V?/i)?.[0]?.toLowerCase();

            // 如果字母前缀相同，但数字部分不同，认为是不同型号
            if (inputAlphaPrefix && spuAlphaPrefix &&
                inputAlphaPrefix === spuAlphaPrefix &&
                inputHasDigitSequence[0] !== spuHasDigitSequence[0]) {
              // 进一步检查：数字是否是包含关系（如 6 是 616 的一部分）
              // 如果不是包含关系，则拒绝匹配
              const inputNum = inputHasDigitSequence[0];
              const spuNum = spuHasDigitSequence[0];
              const isInputStartsWithSpuNum = inputNum.startsWith(spuNum);
              const isSpuStartsWithInputNum = spuNum.startsWith(inputNum);

              if (!isInputStartsWithSpuNum && !isSpuStartsWithInputNum) {
                isMatch = false;
              }
            }
          }
        }
      }

      if (isMatch) {
        matchCount++;
        matchedParts.push(inputP);
        break;
      }
    }
  }

  // 计算基础分数
  const baseScore = inputParts.length > 0 ? matchCount / inputParts.length : 0;

  // 精确度奖励：如果关键型号匹配，给予更高分数
  let exactBonus = 0;
  const exactPatterns = [
    /X70/i, /X80/i, /X90/i, /V9/i, /V8/i, /V10/i, /平板/i, /BOOK/i,
    /MAGIC/i, /Mate/i, /P\d+/i, /nova/i, /iPhone/i
  ];

  for (const part of matchedParts) {
    for (const pattern of exactPatterns) {
      if (pattern.test(part)) {
        exactBonus += 0.15;
        break;
      }
    }
  }

  // 如果版本后缀匹配（如焕新版、标准版），给予奖励
  const versionKeywords = ['焕新版', '标准版', '公开版', '定制版', '高配版', '尊享版', '典藏版'];
  for (const version of versionKeywords) {
    if (inputPart.includes(version) && spuPart.includes(version)) {
      exactBonus += 0.2;
      break;
    }
  }

  // 如果所有关键词都匹配，给予额外奖励
  if (matchCount === inputParts.length && inputParts.length > 0) {
    exactBonus += 0.2;
  }

  const finalScore = Math.min(baseScore + exactBonus + accessoryBoost, 1.0);

  if (finalScore > 0.6) {
    return { matched: true, score: finalScore, reason: '模糊匹配' };
  }

  return { matched: false, score: 0, reason: '相似度不足' };
}

/**
 * 在 SPU 列表中搜索匹配项
 */
function findBestMatch(inputName, spuList) {
  let bestMatch = null;
  let bestScore = 0;
  let bestReason = '';

  const convertedInput = convertToSystemFormat(inputName);

  for (const spu of spuList) {
    const result = fuzzyMatch(convertedInput, spu);

    if (result.matched && result.score > bestScore) {
      bestScore = result.score;
      bestMatch = spu;
      bestReason = result.reason;
    }
  }

  return { match: bestMatch, score: bestScore, reason: bestReason, convertedInput };
}

/**
 * 通过 GTIN 查找 SKU 和 SPU 信息
 */
async function findSpuByGtin(gtin, skuCache) {
  if (!gtin || gtin.length < 8) {
    return null;
  }

  // 先检查缓存
  if (skuCache.has(gtin)) {
    return skuCache.get(gtin);
  }

  try {
    // 只搜索"在用"状态的 SKU
    const skuList = await getSKUListJoinSPU(
      {
        states: [SKUState.在用],
        gtinKeyword: gtin,
        limit: 10,
      },
      {
        sku: ['id', 'name', 'gtins', 'spuID'],
        spu: ['id', 'name', 'brand'],
      }
    );

    if (skuList && skuList.length > 0) {
      // 优先找没有 "-弃用-" 的 SKU
      let validSku = skuList.find(sku => !sku.name.includes('-弃用-'));

      // 如果没找到，用 getSKUInfo 验证每个 SKU
      if (!validSku) {
        for (const sku of skuList) {
          try {
            const skuInfo = await getSKUInfo(sku.id);
            if (skuInfo && !skuInfo.name.includes('-弃用-')) {
              validSku = sku;
              break;
            }
          } catch (e) {
            // getSKUInfo 失败说明是幽灵数据，尝试用 spuID 找同 SPU 下的其他真实 SKU
            console.log(`[GTIN ${gtin}] SKU ${sku.id} 是幽灵数据，尝试通过 SPU ID ${sku.spuID} 查找其他真实 SKU`);
            try {
              // 查找同 SPU 下的其他 SKU，看是否有真实存在的
              const otherSkuList = await getSKUList(
                { states: [SKUState.在用], spuIDs: [sku.spuID], limit: 50 },
                ['id', 'name', 'gtins', 'spuID']
              );
              for (const otherSku of otherSkuList) {
                try {
                  const otherSkuInfo = await getSKUInfo(otherSku.id);
                  if (otherSkuInfo && otherSkuInfo.gtins && otherSkuInfo.gtins.includes(gtin)) {
                    console.log(`[GTIN ${gtin}] 通过 SPU ID ${sku.spuID} 找到真实 SKU: ${otherSkuInfo.id}`);
                    validSku = {
                      id: otherSkuInfo.id,
                      name: otherSkuInfo.name,
                      gtins: otherSkuInfo.gtins,
                      spuID: otherSkuInfo.spuID,
                    };
                    break;
                  }
                } catch (e2) {
                  // 继续找下一个
                }
              }
            } catch (e2) {
              console.log(`[GTIN ${gtin}] 通过 SPU 查找也失败`);
            }
            if (validSku) break;
          }
        }
      }

      if (!validSku) {
        return null;
      }
      const result = {
        skuId: validSku.id,
        skuName: validSku.name, // SKU 名称
        spuId: validSku.spuID,
        spuName: validSku.name, // SPU 名称（使用 SKU 名称，因为可能没有 spu 信息）
        spuBrand: '', // 通过 SPU 查找时没有品牌信息，后续可以优化
        gtins: validSku.gtins,
        // SKU 规格信息
        colorValue: validSku.colorValue,
        specValue: validSku.specValue,
        comboValue: validSku.comboValue,
      };
      skuCache.set(gtin, result);
      return result;
    }
  } catch (error) {
    // 忽略错误，继续
  }

  return null;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Excel SKU 匹配 CLI 工具

用法:
  node scripts/excel-matcher-cli.js <excel文件路径> [选项]

选项:
  --limit N       只处理前 N 条数据（默认: 全部）
  --show-all      显示所有结果，包括未匹配的
  --verify-gtin   通过 69码 查找正确答案并验证匹配结果
  --debug         显示调试信息
  --help, -h      显示帮助信息

示例:
  node scripts/excel-matcher-cli.js /path/to/太原纬图sku映射表.xls
  node scripts/excel-matcher-cli.js /path/to/太原纬图sku映射表.xls --limit 10 --verify-gtin
`);
    process.exit(0);
  }

  const filePath = args.find(arg => !arg.startsWith('--'));
  const options = {
    limit: null,
    showAll: false,
    verifyGtin: false,
    debug: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--show-all') {
      options.showAll = true;
    } else if (args[i] === '--verify-gtin') {
      options.verifyGtin = true;
    } else if (args[i] === '--debug') {
      options.debug = true;
    }
  }

  if (!filePath) {
    console.error('错误: 请提供 Excel 文件路径');
    process.exit(1);
  }

  console.log('========================================');
  console.log('Excel SKU 匹配 CLI 工具');
  console.log('========================================\n');
  console.log(`Excel 文件: ${filePath}`);
  console.log(`选项: limit=${options.limit || '全部'}, showAll=${options.showAll}, verifyGtin=${options.verifyGtin}, debug=${options.debug}\n`);

  // 1. 解析 Excel 文件
  console.log('正在解析 Excel 文件...');
  const excelData = parseExcelFile(filePath);
  console.log(`解析完成: ${excelData.length} 条数据\n`);

  // 2. 初始化 SDK
  const endpoint = process.env.Z1P_ENDPOINT || 'https://p-api.z1.pub';
  init({ endpoint });
  console.log(`SDK 初始化完成, endpoint: ${endpoint}\n`);

  // 3. 加载 SPU 数据
  console.log('正在加载 SPU 数据...');
  const allSpuList = [];
  const batchSize = 10000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const spuList = await getSPUListNew(
      {
        states: [SPUState.在用],
        limit: batchSize,
        offset,
        orderBy: [{ key: 'p."id"', sort: 'ASC' }],
      },
      ['id', 'name', 'brand', 'skuIDs']
    );

    // 过滤有品牌的 SPU
    const validSpus = spuList.filter(spu => spu.brand && spu.brand.trim() !== '');
    allSpuList.push(...validSpus);

    if (spuList.length < batchSize) {
      hasMore = false;
    } else {
      offset += batchSize;
    }

    console.log(`  已加载 ${allSpuList.length} 个有效 SPU...`);
  }

  console.log(`SPU 数据加载完成: ${allSpuList.length} 个有效 SPU\n`);

  // 调试：搜索荣耀 X70 相关的 SPU
  const x70Spus = allSpuList.filter(spu => spu.name && (
    spu.name.includes('X70') || spu.name.includes('x70')
  ));
  console.log(`调试: 找到 ${x70Spus.length} 个 X70 相关的 SPU`);
  if (x70Spus.length > 0) {
    console.log('X70 SPU 列表:');
    x70Spus.slice(0, 10).forEach((spu, i) => {
      console.log(`  ${i + 1}. ID=${spu.id}, name="${spu.name}", brand="${spu.brand}"`);
    });
  }
  console.log('');

  // 调试：搜索荣耀 Magic V 相关的 SPU
  const magicVSpus = allSpuList.filter(spu => spu.name && (
    (spu.name.includes('Magic V') || spu.name.includes('MAGIC V') || spu.name.includes('magic v')) &&
    !spu.name.includes('Book')
  ));
  console.log(`调试: 找到 ${magicVSpus.length} 个 Magic V 相关的 SPU (排除Book)`);
  if (magicVSpus.length > 0) {
    console.log('Magic V SPU 列表:');
    magicVSpus.slice(0, 20).forEach((spu, i) => {
      console.log(`  ${i + 1}. ID=${spu.id}, name="${spu.name}", brand="${spu.brand}"`);
    });
  }
  console.log('');

  // 4. 加载品牌数据
  console.log('正在加载品牌数据...');
  const brandList = await getBrandBaseList();
  console.log(`品牌数据加载完成: ${brandList.length} 个品牌\n`);

  // 5. SKU 缓存（用于 GTIN 查询）
  const skuCache = new Map();

  // 6. 执行匹配
  console.log('开始匹配...\n');
  console.log('========================================');

  const dataToProcess = options.limit ? excelData.slice(0, options.limit) : excelData;

  let matched = 0;
  let unmatched = 0;
  let correctMatch = 0;
  let incorrectMatch = 0;

  const results = [];

  for (let i = 0; i < dataToProcess.length; i++) {
    const row = dataToProcess[i];
    const matchResult = findBestMatch(row.skuName, allSpuList);

    let gtinResult = null;
    if (options.verifyGtin && row.gtin) {
      gtinResult = await findSpuByGtin(row.gtin, skuCache);
    }

    const status = matchResult.match ? 'matched' : 'unmatched';
    if (status === 'matched') matched++;
    else unmatched++;

    // 检查匹配是否正确
    let isCorrect = false;
    let verificationStatus = '';
    if (gtinResult && matchResult.match) {
      if (matchResult.match.id === gtinResult.spuId) {
        isCorrect = true;
        correctMatch++;
        verificationStatus = '✓ 正确';
      } else {
        incorrectMatch++;
        verificationStatus = '✗ 错误';
      }
    } else if (gtinResult && !matchResult.match) {
      verificationStatus = '✗ 未匹配';
    } else if (!gtinResult) {
      verificationStatus = '-';
    }

    results.push({
      index: i + 1,
      originalName: row.skuName,
      convertedName: matchResult.convertedInput,
      matchedSPU: matchResult.match?.name || null,
      matchedBrand: matchResult.match?.brand || null,
      matchedSpuId: matchResult.match?.id || null,
      score: matchResult.score,
      reason: matchResult.reason,
      gtin: row.gtin,
      status,
      // GTIN 验证结果
      correctSpuId: gtinResult?.spuId || null,
      correctSpuName: gtinResult?.spuName || null,
      correctSpuBrand: gtinResult?.spuBrand || null,
      correctSkuName: gtinResult?.skuName || null,
      isCorrect,
      verificationStatus,
    });

    if (options.debug || options.showAll) {
      console.log(`[${i + 1}] ${status === 'matched' ? '✓' : '✗'} ${row.skuName}`);
      console.log(`    转换: ${matchResult.convertedInput}`);
      if (matchResult.match) {
        console.log(`    匹配: ${matchResult.match.name} (${matchResult.match.brand}) ID=${matchResult.match.id}`);
      } else {
        console.log(`    未匹配: ${matchResult.reason}`);
      }

      if (options.verifyGtin && gtinResult) {
        console.log(`    GTIN验证: ${verificationStatus}`);
        console.log(`    正确答案: ${gtinResult.spuName} (${gtinResult.spuBrand}) ID=${gtinResult.spuId}`);
        if (matchResult.match && matchResult.match.id !== gtinResult.spuId) {
          console.log(`    差异分析:`);
          console.log(`      - 输入转换: ${matchResult.convertedInput}`);
          console.log(`      - 匹配SPU: ${matchResult.match.name}`);
          console.log(`      - 正确SPU: ${gtinResult.spuName}`);
        }
      } else if (options.verifyGtin && !gtinResult) {
        console.log(`    GTIN验证: 未找到对应SKU (gtin=${row.gtin})`);
      }

      console.log('');
    } else if (status === 'matched' || (options.verifyGtin && verificationStatus !== '-' && verificationStatus !== '-')) {
      process.stdout.write(`\r进度: ${i + 1}/${dataToProcess.length}`);
    } else {
      process.stdout.write(`\r进度: ${i + 1}/${dataToProcess.length} (匹配: ${matched}, 未匹配: ${unmatched})`);
    }
  }

  console.log('\n========================================');
  console.log('\n匹配结果统计:');
  console.log(`  总数: ${dataToProcess.length}`);
  console.log(`  匹配: ${matched} (${((matched / dataToProcess.length) * 100).toFixed(1)}%)`);
  console.log(`  未匹配: ${unmatched} (${((unmatched / dataToProcess.length) * 100).toFixed(1)}%)`);

  if (options.verifyGtin) {
    console.log('\nGTIN 验证结果:');
    console.log(`  验证样本数: ${results.filter(r => r.correctSpuId).length}`);
    console.log(`  正确匹配: ${correctMatch}`);
    console.log(`  错误匹配: ${incorrectMatch}`);
    if (results.filter(r => r.correctSpuId).length > 0) {
      console.log(`  准确率: ${((correctMatch / results.filter(r => r.correctSpuId).length) * 100).toFixed(1)}%`);
    }

    // 显示错误匹配
    const wrongMatches = results.filter(r => r.isCorrect === false && r.matchedSPU);
    if (wrongMatches.length > 0) {
      console.log('\n错误匹配详情:');
      wrongMatches.forEach(r => {
        console.log(`  ${r.originalName}`);
        console.log(`    转换: ${r.convertedName}`);
        console.log(`    匹配到: ${r.matchedSPU} (${r.matchedBrand}) ID=${r.matchedSpuId}`);
        console.log(`    正确答案: ${r.correctSpuName} (${r.correctSpuBrand}) ID=${r.correctSpuId}`);
      });
    }
  }

  // 显示未匹配的前 10 条
  if (!options.showAll && !options.verifyGtin) {
    const unmatchedResults = results.filter(r => r.status === 'unmatched').slice(0, 10);
    if (unmatchedResults.length > 0) {
      console.log('\n未匹配的前 10 条:');
      for (const r of unmatchedResults) {
        console.log(`  ${r.originalName}`);
        console.log(`    -> ${r.convertedName}`);
      }
    }
  }
}

main().catch(console.error);
