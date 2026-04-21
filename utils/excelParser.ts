/**
 * Excel 解析工具
 *
 * 职责：
 * - 解析 .xls/.xlsx 文件（太原纬图sku映射表）
 * - 将 Excel 格式转换为系统格式
 * - 提取品牌、型号、容量、颜色等信息
 */

import * as XLSX from 'xlsx';

/**
 * Excel 行数据接口（通用）
 */
export interface ExcelRowData {
  /** 商品名称 */
  productName: string;
  /** 69码（可选） */
  gtin?: string;
  /** 转换为系统格式后的名称 */
  normalizedName?: string;
}

/**
 * 解析后的 Excel 数据（包含表头和所有列）
 */
export interface ParsedExcelData {
  /** 表头 */
  headers: string[];
  /** 数据行 */
  rows: string[][];
  /** 每个商品名称对应的行索引 */
  productNameIndex: number;
  /** 69码对应的列索引（如果有） */
  gtinIndex?: number;
}

/**
 * Excel 文件解析选项
 */
export interface ExcelParseOptions {
  /** 商品名称列索引（从0开始） */
  productNameColumn: number;
  /** 69码列索引（可选，从0开始） */
  gtinColumn?: number;
}

/**
 * 解析 Excel 文件（通用版本，支持选择列）
 * @param file Excel 文件（File 对象）
 * @param options 解析选项
 * @returns 解析后的行数据数组
 */
export async function parseExcelGeneric(
  file: File,
  options: ExcelParseOptions
): Promise<ExcelRowData[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  if (jsonData.length < 2) {
    throw new Error('Excel 文件数据少于2行，请检查文件格式');
  }

  const { productNameColumn, gtinColumn } = options;

  // 解析数据行
  const results: ExcelRowData[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as string[];
    if (!row || row.length === 0) continue;

    const productName = String(row[productNameColumn] || '').trim();
    const gtin = gtinColumn !== undefined ? String(row[gtinColumn] || '').trim() : undefined;

    if (!productName) continue;

    results.push({
      productName,
      gtin: gtin || undefined,
    });
  }

  return results;
}

/**
 * 预览 Excel 文件的表头和第一行数据
 * @param file Excel 文件
 * @returns 表头和第一行数据
 */
export async function previewExcel(file: File): Promise<{ headers: string[]; firstRow: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  if (jsonData.length < 2) {
    throw new Error('Excel 文件数据少于2行，请检查文件格式');
  }

  const headers = (jsonData[0] as string[]).map(h => String(h || ''));
  const firstRow = (jsonData[1] as string[]).map(c => String(c || ''));

  return { headers, firstRow };
}

/**
 * Excel 行数据接口（兼容旧版）
 * @deprecated 使用 ExcelRowData 代替
 */
export interface LegacyExcelRowData {
  /** 纬图sku名称 */
  skuName: string;
  /** 69码 */
  gtin: string;
  /** 转换为系统格式后的名称 */
  normalizedName?: string;
}

/**
 * 品牌映射表（用于品牌和型号分离）
 * key: 品牌名（中文或英文）
 * value: 品牌名
 */
const BRAND_PATTERNS: { pattern: RegExp; brand: string }[] = [
  { pattern: /^荣耀/, brand: '荣耀' },
  { pattern: /^华为/, brand: '华为' },
  { pattern: /^小米/, brand: '小米' },
  { pattern: /^vivo/, brand: 'vivo' },
  { pattern: /^OPPO/, brand: 'OPPO' },
  { pattern: /^苹果/, brand: '苹果' },
  { pattern: /^iPhone/, brand: '苹果' },
  { pattern: /^三星/, brand: '三星' },
  { pattern: /^OPPO/, brand: 'OPPO' },
  { pattern: /^真我/, brand: '真我' },
  { pattern: /^一加/, brand: '一加' },
  { pattern: /^红米/, brand: '红米' },
  { pattern: /^iqoo/, brand: 'iQOO' },
  { pattern: /^iQOO/, brand: 'iQOO' },
  { pattern: /^荣耀/, brand: '荣耀' },
  { pattern: /^麦芒/, brand: '麦芒' },
  { pattern: /^ nova/, brand: '华为' },
  { pattern: /^Mate/, brand: '华为' },
  { pattern: /^P50/, brand: '华为' },
  { pattern: /^P60/, brand: '华为' },
  { pattern: /^P70/, brand: '华为' },
  { pattern: /^P80/, brand: '华为' },
  { pattern: /^畅享/, brand: '华为' },
  { pattern: /^nova/, brand: '华为' },
];

/**
 * 解析 Excel 文件
 * @param file Excel 文件（File 对象或 ArrayBuffer）
 * @returns 解析后的行数据数组
 */
export async function parseExcelFile(file: File | ArrayBuffer): Promise<LegacyExcelRowData[]> {
  let workbook: XLSX.WorkBook;

  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } else {
    workbook = XLSX.read(file, { type: 'array' });
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 转换为 JSON 格式
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  if (jsonData.length < 2) {
    throw new Error('Excel 文件数据少于2行，请检查文件格式');
  }

  // 第一行是标题："纬图sku名称", "69码"
  const header = jsonData[0] as string[];
  const skuNameIndex = header.findIndex((h: string) =>
    String(h).includes('纬图sku名称') || String(h).includes('sku名称')
  );
  const gtinIndex = header.findIndex((h: string) =>
    String(h).includes('69码') || String(h).includes('GTIN') || String(h).includes('条码')
  );

  if (skuNameIndex === -1) {
    throw new Error('未找到"纬图sku名称"列，请检查Excel列名');
  }

  if (gtinIndex === -1) {
    throw new Error('未找到"69码"列，请检查Excel列名');
  }

  // 解析数据行
  const results: LegacyExcelRowData[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as string[];
    if (!row || row.length === 0) continue;

    const skuName = String(row[skuNameIndex] || '').trim();
    const gtin = String(row[gtinIndex] || '').trim();

    if (!skuName) continue;

    results.push({
      skuName,
      gtin,
    });
  }

  return results;
}

/**
 * 从 sku 名称中提取品牌
 * @param skuName sku名称
 * @returns 品牌名或null
 */
function extractBrand(skuName: string): string | null {
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(skuName)) {
      return brand;
    }
  }
  return null;
}

/**
 * 将 Excel 格式转换为系统格式
 *
 * Excel格式示例：
 * - "荣耀平板V9(ROL-W00)11.5吋WIFI12G+256G 玉龙雪"
 * - "荣耀手表X5LINK+皮表带LWS-WB10专供 星光白"
 *
 * 转换为系统格式：
 * - "荣耀 平板V9 12+256 玉龙雪" (品牌 + 型号 + 容量 + 颜色)
 * - "荣耀 手表X5LINK 星光白" (品牌 + 型号 + 颜色)
 *
 * @param skuName Excel中的sku名称
 * @returns 转换后的系统格式字符串
 */
export function convertToSystemFormat(skuName: string): string {
  if (!skuName) return '';

  let normalized = skuName;

  // 1. 去除括号内的型号代码，如 (ROL-W00)
  normalized = normalized.replace(/\([^)]*\)/g, ' ');

  // 2. 去除方括号和书名号内的内容
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ');
  normalized = normalized.replace(/《[^》]*》/g, ' ');

  // 3. 提取品牌
  const brand = extractBrand(normalized);

  // 4. 如果找到品牌，将品牌与后面的内容分开
  let remaining = normalized;
  if (brand) {
    // 去除品牌名，得到剩余部分
    remaining = normalized.replace(new RegExp(`^${brand}`), '').trim();
  }

  // 5. 容量标准化：12G+256G -> 12+256, 12GB+256GB -> 12+256
  // 处理带空格的容量格式
  remaining = remaining.replace(/(\d+)\s*G\s*\+\s*(\d+)\s*G/gi, '$1+$2');
  // 处理不带空格的容量格式
  remaining = remaining.replace(/(\d+)G\+(\d+)G/gi, '$1+$2');
  // 处理GB格式
  remaining = remaining.replace(/(\d+)\s*GB\s*\+\s*(\d+)\s*GB/gi, '$1+$2');
  remaining = remaining.replace(/(\d+)GB\+(\d+)GB/gi, '$1+$2');
  // 处理混合格式如 16GBRAM+1TB -> 16+1T
  remaining = remaining.replace(/(\d+)GBRAM\+(\d+)TB/gi, '$1+$2T');
  remaining = remaining.replace(/(\d+)GBRAM\+(\d+)T/gi, '$1+$2T');
  // 处理TB格式
  remaining = remaining.replace(/(\d+)\s*TB/gi, '$1T');

  // 6. 去除多余的后缀信息（这些会影响匹配）
  // 版本后缀：焕新版、标准版、公开版、定制版、标配版、高配版、尊享版、典藏版、保时捷设计等
  const suffixPatterns = [
    // 零售版标记 - 去除
    /零售样机/gi,
    /样机/gi,
    // 网络制式 - 去除（系统名称中可能没有）
    /双卡全网通版/gi,
    /双卡全网通/gi,
    /全网通版/gi,
    /全网通/gi,
    /双卡版/gi,
    /单卡版/gi,
    /WIFI版/gi,
    /WIFI6/gi,
    // 电脑配置信息 - 去除
    /ARLULTRA\d+/gi,
    /RTX\d+/gi,
    /SSD\d+TB/gi,
    /SSD\d+GB/gi,
    /SSD\d+G/gi,
    /RAM\d+GB/gi,
    /RAM\d+G/gi,
    // 屏幕尺寸标准化 - 保留吋但去除空格
    /16吋/gi,
    /14\.6吋/gi,
    /14吋/gi,
  ];
  // 注意：保留版本后缀（焕新版、标准版、公开版等），因为系统 SPU 名称中也包含这些

  for (const pattern of suffixPatterns) {
    remaining = remaining.replace(pattern, ' ');
  }

  // 7. 标准化英寸标识：11.5吋 -> 11.5吋 (保持一致)
  // 去除吋和寸之间的空格
  remaining = remaining.replace(/(\d+\.?\d*)\s*吋/gi, '$1吋');
  remaining = remaining.replace(/(\d+\.?\d*)\s*寸/gi, '$1寸');

  // 8. 清理多余空格
  remaining = remaining.replace(/\s+/g, ' ').trim();

  // 9. 组合：如果有品牌，加上品牌
  let result: string;
  if (brand) {
    // 在品牌和型号之间加空格
    result = `${brand} ${remaining}`;
  } else {
    result = remaining;
  }

  return result;
}

/**
 * 解析 Excel 并转换为系统格式
 * @param file Excel 文件
 * @returns 包含原始数据和转换后数据的数组
 */
export async function parseExcelAndConvert(file: File): Promise<LegacyExcelRowData[]> {
  const rows = await parseExcelFile(file);

  return rows.map(row => ({
    ...row,
    normalizedName: convertToSystemFormat(row.skuName),
  }));
}

/**
 * 将 Excel 行数据数组转换为匹配输入格式（使用 LegacyExcelRowData）
 * @param rows Excel 行数据数组
 * @returns 用于匹配的输入字符串数组
 */
export function toMatchInputs(rows: LegacyExcelRowData[]): string[] {
  return rows.map(row => row.normalizedName || convertToSystemFormat(row.skuName));
}

/**
 * 创建用于显示的映射表（输入 -> 原始数据）
 * @param rows Excel 行数据数组
 * @returns Map：匹配输入 -> Excel原始数据
 */
export function createInputToRowMap(rows: LegacyExcelRowData[]): Map<string, LegacyExcelRowData> {
  const map = new Map<string, LegacyExcelRowData>();
  for (const row of rows) {
    const key = row.normalizedName || convertToSystemFormat(row.skuName);
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
}

/**
 * 使用列选择解析 Excel 并转换为系统格式
 * @param file Excel 文件
 * @param productNameColumn 商品名称列索引（从0开始）
 * @param gtinColumn 69码列索引（可选，从0开始）
 * @returns 解析后的行数据数组
 */
export async function parseExcelWithColumnSelection(
  file: File,
  productNameColumn: number,
  gtinColumn?: number
): Promise<ExcelRowData[]> {
  const rows = await parseExcelGeneric(file, {
    productNameColumn,
    gtinColumn,
  });

  return rows.map(row => ({
    ...row,
    normalizedName: convertToSystemFormat(row.productName),
  }));
}

/**
 * 将 Excel 行数据数组转换为匹配输入格式（通用版本）
 * @param rows Excel 行数据数组
 * @returns 用于匹配的输入字符串数组
 */
export function toMatchInputsGeneric(rows: ExcelRowData[]): string[] {
  return rows.map(row => row.normalizedName || convertToSystemFormat(row.productName));
}

/**
 * 创建用于显示的映射表（输入 -> 原始数据）（通用版本）
 * @param rows Excel 行数据数组
 * @returns Map：匹配输入 -> Excel原始数据
 */
export function createInputToRowMapGeneric(rows: ExcelRowData[]): Map<string, ExcelRowData> {
  const map = new Map<string, ExcelRowData>();
  for (const row of rows) {
    const key = row.normalizedName || convertToSystemFormat(row.productName);
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
}
