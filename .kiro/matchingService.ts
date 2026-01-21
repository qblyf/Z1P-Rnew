import { GyCsvRow, MatchingResult, MatchMode, ErrorCode } from '../types';
import { dbLoaderService } from './dbLoader';
import { AppError } from '../middleware/errorHandler';
import { smartMatcher } from './smartMatcher';
import { progressTracker } from './progressTracker';

// Configuration for batch processing
const BATCH_SIZE = 500; // Process 500 rows at a time
const MEMORY_CHECK_INTERVAL = 100; // Check memory every 100 rows
const MAX_MEMORY_USAGE_MB = 512; // Maximum memory usage in MB

export class MatchingService {
  private processedRows = 0;
  private startTime = 0;
  /**
   * Perform exact matching between Excel rows and gy.csv data
   * @param excelRows Array of Excel row data
   * @param selectedColumns Columns to use for matching
   * @param useDatabase Whether to use database instead of CSV (default true)
   * @returns Array of matching results
   */
  async exactMatch(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[]
  ): Promise<MatchingResult[]> {
    // Load data from database only
    const gyCsvData = await dbLoaderService.loadGyCsvData();

    // Create a Set of SKU names for efficient lookup - O(1) instead of O(n)
    const skuSet = new Set<string>();
    const skuMap = new Map<string, GyCsvRow>();

    // Build the lookup structures
    for (const row of gyCsvData) {
      const skuName = row.z1_SKU名称;
      if (skuName) {
        skuSet.add(skuName);
        // Store the first occurrence if there are duplicates
        if (!skuMap.has(skuName)) {
          skuMap.set(skuName, row);
        }
      }
    }

    // Process each Excel row
    const results: MatchingResult[] = [];

    for (let i = 0; i < excelRows.length; i++) {
      const excelRow = excelRows[i];
      const result = this.matchSingleRow(
        excelRow,
        i,
        selectedColumns,
        skuSet,
        skuMap
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Match a single Excel row against the SKU data
   * @param excelRow Single row from Excel file
   * @param rowIndex Index of the row
   * @param selectedColumns Columns to check for matching
   * @param skuSet Set of SKU names for quick lookup
   * @param skuMap Map from SKU name to full GyCsvRow
   * @returns MatchingResult for this row
   */
  private matchSingleRow(
    excelRow: Record<string, any>,
    rowIndex: number,
    selectedColumns: string[],
    skuSet: Set<string>,
    skuMap: Map<string, GyCsvRow>
  ): MatchingResult {
    // Try to match against each selected column
    for (const column of selectedColumns) {
      const value = excelRow[column];

      // Handle edge cases: skip null, undefined, empty strings
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Convert to string for comparison
      const stringValue = String(value);

      // Check if this value exists in the SKU set
      if (skuSet.has(stringValue)) {
        const matchedRow = skuMap.get(stringValue);

        // This should always be defined, but check for safety
        if (matchedRow) {
          return {
            rowIndex,
            originalData: excelRow,
            matchStatus: 'matched',
            matchedRow,
            matchedColumn: column,
          };
        }
      }
    }

    // No match found in any column
    return {
      rowIndex,
      originalData: excelRow,
      matchStatus: 'unmatched',
    };
  }

  /**
   * Normalize a string for fuzzy matching
   * - Trims leading and trailing whitespace
   * - Converts to lowercase
   * @param value The value to normalize
   * @returns Normalized string
   */
  private normalizeString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  /**
   * Calculate Levenshtein distance (edit distance) between two strings
   * @param str1 First string
   * @param str2 Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate edit distance
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Extract year from product name
   * @param str Input string
   * @returns Year string (e.g., "2024") or null
   */
  private extractYear(str: string): string | null {
    if (!str) return null;

    const yearPattern = /\b(202[0-9])\b/;
    const match = str.match(yearPattern);

    return match ? match[1] : null;
  }

  /**
   * Calculate similarity score between two strings
   * For now, returns 1.0 for exact match after normalization, 0.0 otherwise
   * This can be extended to use Levenshtein distance or other algorithms
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = this.normalizeString(str1);
    const normalized2 = this.normalizeString(str2);
    
    // Exact match after normalization
    if (normalized1 === normalized2) {
      return 1.0;
    }
    
    // No match
    return 0.0;
  }

  /**
   * Perform fuzzy matching between Excel rows and gy.csv data
   * Fuzzy matching ignores:
   * - Leading and trailing whitespace
   * - Case differences (uppercase vs lowercase)
   * @param excelRows Array of Excel row data
   * @param selectedColumns Columns to use for matching
   * @param useDatabase Whether to use database instead of CSV (default true)
   * @returns Array of matching results with similarity scores
   */
  async fuzzyMatch(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[]
  ): Promise<MatchingResult[]> {
    // Load data from database only
    const gyCsvData = await dbLoaderService.loadGyCsvData();

    // Create a Map with normalized SKU names as keys for efficient lookup
    // This allows O(1) lookup time instead of O(n)
    const normalizedSkuMap = new Map<string, GyCsvRow>();

    // Build the lookup structure with normalized keys
    for (const row of gyCsvData) {
      const skuName = row.z1_SKU名称;
      if (skuName) {
        const normalized = this.normalizeString(skuName);
        // Store the first occurrence if there are duplicates
        if (!normalizedSkuMap.has(normalized)) {
          normalizedSkuMap.set(normalized, row);
        }
      }
    }

    // Process each Excel row
    const results: MatchingResult[] = [];

    for (let i = 0; i < excelRows.length; i++) {
      const excelRow = excelRows[i];
      const result = this.fuzzyMatchSingleRow(
        excelRow,
        i,
        selectedColumns,
        normalizedSkuMap
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Perform fuzzy matching for a single Excel row
   * @param excelRow Single row from Excel file
   * @param rowIndex Index of the row
   * @param selectedColumns Columns to check for matching
   * @param normalizedSkuMap Map from normalized SKU name to full GyCsvRow
   * @returns MatchingResult for this row with similarity score
   */
  private fuzzyMatchSingleRow(
    excelRow: Record<string, any>,
    rowIndex: number,
    selectedColumns: string[],
    normalizedSkuMap: Map<string, GyCsvRow>
  ): MatchingResult {
    // Try to match against each selected column
    for (const column of selectedColumns) {
      const value = excelRow[column];

      // Handle edge cases: skip null, undefined, empty strings
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Normalize the value for fuzzy matching
      const normalizedValue = this.normalizeString(value);

      // Skip empty normalized values
      if (normalizedValue === '') {
        continue;
      }

      // Check if this normalized value exists in the map
      if (normalizedSkuMap.has(normalizedValue)) {
        const matchedRow = normalizedSkuMap.get(normalizedValue);

        // This should always be defined, but check for safety
        if (matchedRow) {
          // Calculate similarity score
          const similarity = this.calculateSimilarity(value, matchedRow.z1_SKU名称);

          return {
            rowIndex,
            originalData: excelRow,
            matchStatus: 'matched',
            matchedRow,
            matchedColumn: column,
            similarity,
          };
        }
      }
    }

    // No match found in any column
    return {
      rowIndex,
      originalData: excelRow,
      matchStatus: 'unmatched',
    };
  }

  /**
   * 获取动态阈值 - 根据产品类型和匹配字段调整
   * 改进方案 1: 动态阈值调整
   */
  private getThreshold(
    productType: string | null,
    matchField: string
  ): number {
    // 基础阈值
    let baseThreshold = 0.65;
    
    // 根据产品类型调整
    if (productType) {
      const typeThresholds: Record<string, number> = {
        '智能手机': 0.70,
        '平板电脑': 0.65,
        '笔记本': 0.68,
        '笔记本电脑': 0.68,
        '智能手表': 0.72,
        '配件': 0.60,
        'iPhone': 0.70,
        'iPad': 0.65,
        'MacBook': 0.68,
        'Apple Watch': 0.72,
      };
      baseThreshold = typeThresholds[productType] || 0.65;
    }
    
    // 根据匹配字段调整
    if (matchField.includes('SKU名称')) {
      baseThreshold += 0.05;  // SKU 名称更可靠
    } else if (matchField.includes('SPU名称')) {
      baseThreshold -= 0.05;  // SPU 名称更通用
    }
    
    return baseThreshold;
  }

  /**
   * 获取关键词权重 - 改进方案 3: 改进候选项排序
   */
  private getKeywordWeight(keyword: string): number {
    // 品牌关键词权重最高
    const brandKeywords = ['apple', 'huawei', 'samsung', 'oppo', 'vivo', 'xiaomi', 'oneplus', 'honor', 'motorola', 'nokia', 'sony'];
    if (brandKeywords.includes(keyword.toLowerCase())) {
      return 10;
    }
    
    // 系列关键词权重高
    const seriesKeywords = ['iphone', 'ipad', 'mate', 'nova', 'galaxy', 'reno', 'find', 'ace', 'z10', 'z9', 'neo', 'watch', 'matebook'];
    if (seriesKeywords.includes(keyword.toLowerCase())) {
      return 8;
    }
    
    // 规格关键词权重中等
    const specKeywords = ['pro', 'max', 'plus', 'ultra', 'air', 'mini', 'turbo', 'se'];
    if (specKeywords.includes(keyword.toLowerCase())) {
      return 5;
    }
    
    // 其他关键词权重低
    return 1;
  }

  /**
   * 计算加权匹配分数 - 改进方案 4: 改进相似度计算
   */
  private calculateWeightedMatchScore(
    input: string,
    candidate: string
  ): number {
    // 1. 精确匹配检查 (100%)
    if (this.normalizeString(input) === this.normalizeString(candidate)) {
      return 1.0;
    }
    
    // 改进: 添加产品型号严格匹配检查
    // 如果产品型号不同，大幅降低分数
    const inputModel = smartMatcher.extractPrefixedModel(input);
    const candidateModel = smartMatcher.extractPrefixedModel(candidate);
    
    if (inputModel && candidateModel && inputModel !== candidateModel) {
      // 产品型号不同，返回较低的分数
      // 例如: Nova14 vs 畅享70X，应该被拒绝
      return 0.3; // 最多 30% 的分数
    }
    
    // 2. 品牌匹配检查 (权重 30%)
    const inputBrand = smartMatcher.extractBrand(input);
    const candidateBrand = smartMatcher.extractBrand(candidate);
    let brandScore = 0;
    
    if (inputBrand && candidateBrand) {
      if (smartMatcher.normalizeBrand(inputBrand) === 
          smartMatcher.normalizeBrand(candidateBrand)) {
        brandScore = 1.0;
      }
    } else if (!inputBrand && !candidateBrand) {
      brandScore = 1.0;  // 都没有品牌信息
    }
    
    // 3. 关键词匹配检查 (权重 40%)
    const inputKeywords = new Set(smartMatcher.extractKeywords(input));
    const candidateKeywords = new Set(smartMatcher.extractKeywords(candidate));
    
    let keywordScore = 0;
    if (inputKeywords.size > 0 && candidateKeywords.size > 0) {
      const intersection = new Set([...inputKeywords].filter(k => candidateKeywords.has(k)));
      const union = new Set([...inputKeywords, ...candidateKeywords]);
      keywordScore = intersection.size / union.size;  // Jaccard 相似度
    }
    
    // 4. 编辑距离检查 (权重 20%)
    const normalizedInput = this.normalizeString(input);
    const normalizedCandidate = this.normalizeString(candidate);
    const distance = this.levenshteinDistance(normalizedInput, normalizedCandidate);
    const maxLen = Math.max(normalizedInput.length, normalizedCandidate.length);
    const editScore = maxLen > 0 ? 1 - (distance / maxLen) : 0;
    
    // 5. 特殊规则检查 (权重 10%)
    let specialScore = 0;
    
    // 如果候选项包含输入的所有关键词，加分
    if ([...inputKeywords].every(k => candidateKeywords.has(k))) {
      specialScore += 0.5;
    }
    
    // 如果长度相近，加分
    if (Math.abs(normalizedInput.length - normalizedCandidate.length) < 5) {
      specialScore += 0.5;
    }
    
    // 综合分数
    const finalScore = 
      brandScore * 0.30 +
      keywordScore * 0.40 +
      editScore * 0.20 +
      specialScore * 0.10;
    
    return Math.min(1.0, finalScore);
  }

  /**
   * 是否应该提前退出 - 改进方案 5: 改进早期退出
   */
  private shouldEarlyExit(
    currentScore: number,
    validation: { isValid: boolean; reasons: string[] },
    candidatesRemaining: number
  ): boolean {
    // 只有在以下条件都满足时才退出:
    // 1. 分数 > 98% (从 95% 提升)
    // 2. 通过验证
    // 3. 候选项不多
    
    if (currentScore < 0.98) {
      return false;
    }
    
    if (!validation.isValid) {
      return false;
    }
    
    // 如果还有很多候选项，继续搜索
    if (candidatesRemaining > 10) {
      return false;
    }
    
    return true;
  }

  /**
   * Perform smart matching using advanced algorithms
   * Smart matching includes:
   * - Brand name mapping (苹果 -> Apple)
   * - Keyword extraction and matching
   * - Similarity score calculation
   * - Multi-field matching (SPU, SKU, specs)
   * @param excelRows Array of Excel row data
   * @param selectedColumns Columns to use for matching
   * @param threshold Similarity threshold (0-1, default 0.6)
   * @param useDatabase Whether to use database instead of CSV (default true)
   * @returns Array of matching results with similarity scores
   */
  async smartMatch(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[],
    threshold: number = 0.65  // 改进: 从 0.45 提升到 0.65
  ): Promise<MatchingResult[]> {
    console.log('\n=== 开始智能匹配 ===');
    console.log(`总行数: ${excelRows.length}`);
    console.log(`选择的列: ${selectedColumns.join(', ')}`);
    console.log(`匹配阈值: ${(threshold * 100).toFixed(0)}%`);
    
    // Load data from database only
    console.log('从数据库加载数据...');
    const gyCsvData = await dbLoaderService.loadGyCsvData();
    console.log(`数据行数: ${gyCsvData.length}`);
    
    // Detect if brand+SKU matching is possible
    const brandColumn = selectedColumns.find(col => 
      col.includes('品牌') || col.toLowerCase().includes('brand')
    );
    const skuColumn = selectedColumns.find(col => 
      col.includes('商品') || col.includes('名称') || col.includes('SKU') || 
      col.toLowerCase().includes('product') || col.toLowerCase().includes('name')
    );
    
    const useBrandFiltering = brandColumn && skuColumn && selectedColumns.length >= 2;
    
    if (useBrandFiltering) {
      console.log(`匹配策略: 品牌过滤匹配（品牌列: ${brandColumn}, SKU列: ${skuColumn}）`);
    } else {
      console.log(`匹配策略: ${selectedColumns.length > 1 ? '多列合并匹配' : '单列匹配'}`);
    }
    
    // Build index for faster lookup
    console.log('正在构建索引以加速匹配...');
    const indexStartTime = Date.now();
    
    let gyIndex: Map<string, GyCsvRow[]> | undefined;
    let brandIndex: Map<string, GyCsvRow[]> | undefined;
    
    if (useBrandFiltering) {
      const combined = this.buildCombinedIndex(gyCsvData);
      gyIndex = combined.keywordIndex;
      brandIndex = combined.brandIndex;
      console.log(`索引构建完成，耗时: ${Date.now() - indexStartTime}ms`);
      console.log(`品牌索引数量: ${brandIndex.size}, 关键词索引数量: ${gyIndex.size}\n`);
    } else {
      gyIndex = this.buildSmartMatchIndex(gyCsvData);
      console.log(`索引构建完成，耗时: ${Date.now() - indexStartTime}ms\n`);
    }

    const startTime = Date.now();
    
    // Process each Excel row
    const results: MatchingResult[] = [];
    let matchedCount = 0;

    for (let i = 0; i < excelRows.length; i++) {
      const excelRow = excelRows[i];
      let result: MatchingResult;
      
      // Use brand filtering if available
      if (useBrandFiltering && brandIndex) {
        const showDetailLog = i < 3;
        if (showDetailLog) {
          console.log(`\n--- 第${i + 1}行 (品牌过滤匹配) ---`);
        }
        result = this.smartMatchWithBrandFilter(
          excelRow,
          i,
          brandColumn!,
          skuColumn!,
          brandIndex,
          threshold,
          showDetailLog
        );
      } else {
        result = this.smartMatchSingleRowWithIndex(
          excelRow,
          i,
          selectedColumns,
          gyIndex!,
          threshold
        );
      }
      
      results.push(result);
      
      if (result.matchStatus === 'matched') {
        matchedCount++;
      }
      
      // 每处理100行显示一次进度
      if ((i + 1) % 100 === 0 || i === excelRows.length - 1) {
        const progress = ((i + 1) / excelRows.length * 100).toFixed(1);
        const matchRate = (matchedCount / (i + 1) * 100).toFixed(1);
        const elapsed = Date.now() - startTime;
        const rowsPerSec = ((i + 1) / elapsed * 1000).toFixed(0);
        console.log(`进度: ${i + 1}/${excelRows.length} (${progress}%) | 已匹配: ${matchedCount} (${matchRate}%) | 速度: ${rowsPerSec}行/秒`);
      }
    }

    const elapsedTime = Date.now() - startTime;
    const matchRate = (matchedCount / excelRows.length * 100).toFixed(1);
    
    console.log('\n=== 匹配完成 ===');
    console.log(`总耗时: ${elapsedTime}ms`);
    console.log(`匹配成功: ${matchedCount}/${excelRows.length} (${matchRate}%)`);
    console.log(`未匹配: ${excelRows.length - matchedCount}/${excelRows.length} (${(100 - parseFloat(matchRate)).toFixed(1)}%)\n`);

    return results;
  }

  /**
   * Build an index for smart matching to speed up lookups
   * Creates keyword-based index for faster matching
   */
  private buildSmartMatchIndex(gyCsvData: GyCsvRow[]): Map<string, GyCsvRow[]> {
    const index = new Map<string, GyCsvRow[]>();
    
    for (const row of gyCsvData) {
      // Extract keywords from SKU name, SPU name, and specs
      const texts = [
        row.z1_SKU名称,
        row.z1_SPU名称,
        `${row.z1_SPU名称} ${row.z1_SKU规格}`,
      ].filter(Boolean);
      
      const keywords = new Set<string>();
      
      for (const text of texts) {
        if (!text) continue;
        
        // Extract keywords (words with 2+ characters)
        const words = smartMatcher.extractKeywords(text);
        words.forEach(word => keywords.add(word));
      }
      
      // Add row to index for each keyword
      keywords.forEach(keyword => {
        if (!index.has(keyword)) {
          index.set(keyword, []);
        }
        index.get(keyword)!.push(row);
      });
    }
    
    return index;
  }

  /**
   * Build a brand-based index for faster brand filtering
   * Groups rows by brand for efficient brand-first matching
   * Uses smartMatcher to extract and normalize brand information
   */
  private buildBrandIndex(gyCsvData: GyCsvRow[]): Map<string, GyCsvRow[]> {
    const brandIndex = new Map<string, GyCsvRow[]>();
    
    for (const row of gyCsvData) {
      // Try to extract brand from SKU name first, then fall back to SPU brand field
      let brand = smartMatcher.extractBrand(row.z1_SKU名称);
      
      if (!brand) {
        brand = smartMatcher.extractBrand(row.z1_SPU名称);
      }
      
      if (!brand && row.z1_SPU品牌) {
        // Fall back to SPU brand field if extraction fails
        brand = smartMatcher.extractBrand(row.z1_SPU品牌);
      }
      
      if (!brand) continue;
      
      // Normalize brand name using smartMatcher
      const normalizedBrand = smartMatcher.normalizeBrand(brand);
      
      if (!normalizedBrand) continue;
      
      if (!brandIndex.has(normalizedBrand)) {
        brandIndex.set(normalizedBrand, []);
      }
      brandIndex.get(normalizedBrand)!.push(row);
    }
    
    return brandIndex;
  }

  /**
   * Select candidate products from the same brand as the input
   * @param inputBrand Normalized brand identifier from input product
   * @param brandIndex Brand index mapping brands to products
   * @returns Array of products from the same brand, or empty array if brand not found
   */
  private selectCandidatesByBrand(
    inputBrand: string,
    brandIndex: Map<string, GyCsvRow[]>
  ): GyCsvRow[] {
    if (!inputBrand) {
      return [];
    }

    // Normalize the input brand for lookup
    const normalizedBrand = smartMatcher.normalizeBrand(inputBrand);
    
    // Look up in brand index
    const candidates = brandIndex.get(normalizedBrand);
    
    // Return candidates or empty array if not found
    return candidates || [];
  }

  /**
   * Validate that matched product shares critical attributes with input product
   * 改进方案 2: 增强属性验证 - 从 3 个属性扩展到 7 个
   * @param inputProduct Input product name/value
   * @param candidateProduct Candidate product from database
   * @returns Validation result with isValid flag and reasons for any failures
   */
  private validateMatchAttributes(
    inputProduct: string,
    candidateProduct: GyCsvRow
  ): { isValid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // 1. 品牌验证 (必须匹配)
    const inputBrand = smartMatcher.extractBrand(inputProduct);
    const candidateBrand = smartMatcher.extractBrand(candidateProduct.z1_SKU名称) ||
                          smartMatcher.extractBrand(candidateProduct.z1_SPU名称) ||
                          smartMatcher.extractBrand(candidateProduct.z1_SPU品牌);
    
    if (inputBrand && candidateBrand) {
      const normalizedInputBrand = smartMatcher.normalizeBrand(inputBrand);
      const normalizedCandidateBrand = smartMatcher.normalizeBrand(candidateBrand);
      
      if (normalizedInputBrand !== normalizedCandidateBrand) {
        reasons.push(`品牌不匹配: ${inputBrand} vs ${candidateBrand}`);
      }
    }

    // 2. 产品类型验证 (必须匹配)
    const inputType = smartMatcher.extractProductType(inputProduct);
    const candidateType = smartMatcher.extractProductType(candidateProduct.z1_SKU名称) ||
                         smartMatcher.extractProductType(candidateProduct.z1_SKU规格);
    
    if (inputType && candidateType && inputType !== candidateType) {
      reasons.push(`产品类型不匹配: ${inputType} vs ${candidateType}`);
    }

    // 3. 容量验证 (如果都有则必须匹配)
    const inputCapacity = smartMatcher.extractCapacity(inputProduct);
    const candidateCapacity = smartMatcher.extractCapacity(candidateProduct.z1_SKU名称) ||
                             smartMatcher.extractCapacity(candidateProduct.z1_SKU规格);
    
    if (inputCapacity && candidateCapacity) {
      // 改进: 处理 "12gb+256gb" 与 "256gb" 的匹配
      // 华为手机常见格式: 输入为 "12+256" (RAM+ROM), 数据库为 "256GB" (仅ROM)
      let inputRom = inputCapacity;
      
      // 如果输入是 "12gb+256gb" 格式，提取 ROM 部分 (256gb)
      if (inputCapacity.includes('+')) {
        const parts = inputCapacity.split('+');
        if (parts.length === 2) {
          inputRom = parts[1]; // 取第二部分作为 ROM
        }
      }
      
      // 比较 ROM 容量
      if (inputRom !== candidateCapacity) {
        reasons.push(`容量不匹配: ${inputCapacity} vs ${candidateCapacity}`);
      }
    }

    // 4. 颜色验证 (如果都有则必须匹配) - 改进: 颜色是关键属性，必须严格匹配
    const inputColors = smartMatcher.extractColors(inputProduct);
    const candidateColors = smartMatcher.extractColors(candidateProduct.z1_SKU名称) ||
                           smartMatcher.extractColors(candidateProduct.z1_SKU规格);
    
    if (inputColors.length > 0 && candidateColors.length > 0) {
      // 改进: 检查是否有完全相同的颜色
      const hasExactColorMatch = inputColors.some(c => candidateColors.includes(c));
      
      if (!hasExactColorMatch) {
        reasons.push(`颜色不匹配: ${inputColors.join(',')} vs ${candidateColors.join(',')}`);
      }
    }

    // 5. 屏幕尺寸验证 (如果都有则必须匹配)
    const inputSize = smartMatcher.extractScreenSize(inputProduct);
    const candidateSize = smartMatcher.extractScreenSize(candidateProduct.z1_SKU名称) ||
                         smartMatcher.extractScreenSize(candidateProduct.z1_SKU规格);
    
    if (inputSize && candidateSize) {
      // 允许小的尺寸差异 (< 0.5 英寸)
      const inputSizeNum = parseFloat(inputSize);
      const candidateSizeNum = parseFloat(candidateSize);
      
      if (!isNaN(inputSizeNum) && !isNaN(candidateSizeNum)) {
        if (Math.abs(inputSizeNum - candidateSizeNum) >= 0.5) {
          reasons.push(`屏幕尺寸不匹配: ${inputSize} vs ${candidateSize}`);
        }
      }
    }

    // 6. 处理器验证 (如果都有则必须匹配)
    const inputProcessor = smartMatcher.extractProcessor(inputProduct);
    const candidateProcessor = smartMatcher.extractProcessor(candidateProduct.z1_SKU名称) ||
                              smartMatcher.extractProcessor(candidateProduct.z1_SKU规格);
    
    if (inputProcessor && candidateProcessor && inputProcessor !== candidateProcessor) {
      reasons.push(`处理器不匹配: ${inputProcessor} vs ${candidateProcessor}`);
    }

    // 7. 年份验证 (如果都有则必须匹配)
    const inputYear = this.extractYear(inputProduct);
    const candidateYear = this.extractYear(candidateProduct.z1_SKU名称) ||
                         this.extractYear(candidateProduct.z1_SKU规格);
    
    if (inputYear && candidateYear && inputYear !== candidateYear) {
      reasons.push(`年份不匹配: ${inputYear} vs ${candidateYear}`);
    }

    return {
      isValid: reasons.length === 0,
      reasons
    };
  }

  /**
   * Build a combined index with brand filtering support
   * Returns both keyword index and brand index
   */
  private buildCombinedIndex(gyCsvData: GyCsvRow[]): {
    keywordIndex: Map<string, GyCsvRow[]>;
    brandIndex: Map<string, GyCsvRow[]>;
  } {
    const keywordIndex = new Map<string, GyCsvRow[]>();
    const brandIndex = new Map<string, GyCsvRow[]>();
    
    for (const row of gyCsvData) {
      // Build brand index using smartMatcher
      let brand = smartMatcher.extractBrand(row.z1_SKU名称);
      
      if (!brand) {
        brand = smartMatcher.extractBrand(row.z1_SPU名称);
      }
      
      if (!brand && row.z1_SPU品牌) {
        brand = smartMatcher.extractBrand(row.z1_SPU品牌);
      }
      
      if (brand) {
        const normalizedBrand = smartMatcher.normalizeBrand(brand);
        if (normalizedBrand && !brandIndex.has(normalizedBrand)) {
          brandIndex.set(normalizedBrand, []);
        }
        if (normalizedBrand) {
          brandIndex.get(normalizedBrand)!.push(row);
        }
      }
      
      // Build keyword index
      const texts = [
        row.z1_SKU名称,
        row.z1_SPU名称,
        `${row.z1_SPU名称} ${row.z1_SKU规格}`,
      ].filter(Boolean);
      
      const keywords = new Set<string>();
      
      for (const text of texts) {
        if (!text) continue;
        const words = smartMatcher.extractKeywords(text);
        words.forEach(word => keywords.add(word));
      }
      
      keywords.forEach(keyword => {
        if (!keywordIndex.has(keyword)) {
          keywordIndex.set(keyword, []);
        }
        keywordIndex.get(keyword)!.push(row);
      });
    }
    
    return { keywordIndex, brandIndex };
  }

  /**
   * Perform smart matching with brand filtering for faster and more accurate matching
   * Uses brand column to filter candidates first, then matches SKU name
   */
  private smartMatchWithBrandFilter(
    excelRow: Record<string, any>,
    rowIndex: number,
    brandColumn: string,
    skuColumn: string,
    brandIndex: Map<string, GyCsvRow[]>,
    threshold: number,
    showDetailLog: boolean = false
  ): MatchingResult {
    // Step 1: Extract brand from input product
    const brandValue = excelRow[brandColumn];
    let inputBrand: string | null = null;
    
    if (brandValue && brandValue !== '') {
      inputBrand = smartMatcher.extractBrand(String(brandValue));
    }
    
    if (showDetailLog) {
      console.log(`  品牌值: "${brandValue}"`);
      console.log(`  提取的品牌: ${inputBrand || '未找到'}`);
    }
    
    // Step 2: Filter candidates by brand
    let candidates: GyCsvRow[] = [];
    
    if (inputBrand) {
      candidates = this.selectCandidatesByBrand(inputBrand, brandIndex);
      
      if (showDetailLog) {
        console.log(`  通过品牌"${inputBrand}"筛选，候选数量: ${candidates.length}`);
      }
    }
    
    // If no candidates found, return unmatched
    if (candidates.length === 0) {
      if (showDetailLog) {
        console.log(`  ❌ 无法通过品牌筛选候选项`);
      }
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'unmatched',
      };
    }
    
    // Step 3: Get SKU value for matching
    const skuValue = excelRow[skuColumn];
    if (!skuValue || skuValue === '') {
      if (showDetailLog) {
        console.log(`  ❌ SKU值为空`);
      }
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'unmatched',
      };
    }
    
    const skuString = String(skuValue);
    if (showDetailLog) {
      console.log(`  SKU值: "${skuString}"`);
    }
    
    // Step 4: Find best match within brand-filtered candidates
    let bestMatch: {
      row: GyCsvRow;
      score: number;
      validationReasons: string[];
    } | null = null;
    
    for (const candidate of candidates) {
      const fieldsToMatch = [
        candidate.z1_SKU名称,
        candidate.z1_SPU名称,
        `${candidate.z1_SPU名称} ${candidate.z1_SKU规格}`,
      ];
      
      for (let fieldIndex = 0; fieldIndex < fieldsToMatch.length; fieldIndex++) {
        const field = fieldsToMatch[fieldIndex];
        if (!field) continue;
        
        // Skip SPU-only field (index 1) if Excel has color but CSV field doesn't
        if (fieldIndex === 1) {
          const excelColors = smartMatcher.extractColors(skuString);
          const csvColors = smartMatcher.extractColors(field);
          if (excelColors.length > 0 && csvColors.length === 0) {
            continue;
          }
        }
        
        // 改进: 使用加权匹配分数而不是原始分数
        const score = this.calculateWeightedMatchScore(skuString, field);
        
        if (score >= threshold) {
          // Validate critical attributes before accepting match
          const validation = this.validateMatchAttributes(skuString, candidate);
          
          if (validation.isValid) {
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { 
                row: candidate, 
                score,
                validationReasons: validation.reasons
              };
              
              // 改进: 从 > 0.95 改为 > 0.98 且通过验证
              if (this.shouldEarlyExit(score, validation, candidates.length - fieldIndex)) {
                break;
              }
            }
          } else {
            // 改进: 即使属性验证失败，如果相似度足够高也可以接受
            // 特别是对于容量这样的属性，允许 RAM+ROM 与 ROM 的匹配
            const failureCount = validation.reasons.length;
            
            // 只有容量不匹配时，允许降级匹配
            const isOnlyCapacityMismatch = validation.reasons.length === 1 && 
                                          validation.reasons[0].includes('容量不匹配');
            
            if (isOnlyCapacityMismatch && score >= threshold * 0.95) {
              // 容量不匹配但相似度足够高，仍然接受
              const penalizedScore = score * 0.95; // 降低 5% 的分数
              
              if (!bestMatch || penalizedScore > bestMatch.score) {
                bestMatch = { 
                  row: candidate, 
                  score: penalizedScore,
                  validationReasons: validation.reasons
                };
              }
            } else if (showDetailLog) {
              console.log(`    候选被拒绝: ${validation.reasons.join(', ')}`);
            }
          }
        }
      }
      
      // 改进: 使用改进的早期退出条件
      if (bestMatch && this.shouldEarlyExit(bestMatch.score, { isValid: true, reasons: [] }, candidates.length)) {
        break;
      }
    }
    
    // Step 5: Return result
    if (bestMatch) {
      if (showDetailLog) {
        console.log(`  ✅ 匹配成功!`);
        console.log(`    匹配到: ${bestMatch.row.z1_SKU名称}`);
        console.log(`    品牌: ${bestMatch.row.z1_SPU品牌}`);
        console.log(`    匹配分数: ${(bestMatch.score * 100).toFixed(1)}%`);
      }
      
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'matched',
        matchedRow: bestMatch.row,
        matchedColumn: `${brandColumn} + ${skuColumn}`,
        similarity: bestMatch.score,
      };
    }
    
    if (showDetailLog) {
      console.log(`  ❌ 未找到匹配（品牌筛选后候选数: ${candidates.length}）`);
    }
    
    return {
      rowIndex,
      originalData: excelRow,
      matchStatus: 'unmatched',
    };
  }

  /**
   * Perform smart matching for a single row using index
   */
  private smartMatchSingleRowWithIndex(
    excelRow: Record<string, any>,
    rowIndex: number,
    selectedColumns: string[],
    gyIndex: Map<string, GyCsvRow[]>,
    threshold: number
  ): MatchingResult {
    let bestMatch: {
      row: GyCsvRow;
      column: string;
      score: number;
    } | null = null;

    // Only show detailed logs for first 3 rows
    const showDetailLog = rowIndex < 3;

    // Get search text from selected columns
    let searchText = '';
    if (selectedColumns.length > 1) {
      // Combine multiple columns
      const combinedValues: string[] = [];
      for (const column of selectedColumns) {
        const value = excelRow[column];
        if (value !== null && value !== undefined && value !== '') {
          combinedValues.push(String(value));
        }
      }
      searchText = combinedValues.join(' ');
      
      if (showDetailLog && searchText) {
        console.log(`\n--- 第${rowIndex + 1}行 (多列合并) ---`);
        console.log(`合并值: "${searchText}"`);
      }
    } else {
      // Single column
      const column = selectedColumns[0];
      const value = excelRow[column];
      if (value !== null && value !== undefined && value !== '') {
        searchText = String(value);
        
        if (showDetailLog) {
          console.log(`\n--- 第${rowIndex + 1}行 (单列) ---`);
          console.log(`列: ${column}`);
          console.log(`值: "${searchText}"`);
        }
      }
    }

    if (!searchText) {
      if (showDetailLog) {
        console.log(`❌ 空值，跳过匹配`);
      }
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'unmatched',
      };
    }

    // Extract keywords from search text
    const keywords = smartMatcher.extractKeywords(searchText);
    
    if (showDetailLog) {
      console.log(`  提取的关键词: ${keywords.join(', ')}`);
    }
    
    // Get candidate rows from index with scoring
    // Score candidates by number of matching keywords with weights
    const candidateScores = new Map<GyCsvRow, number>();
    
    for (const keyword of keywords) {
      const weight = this.getKeywordWeight(keyword);  // 改进: 使用加权
      const candidates = gyIndex.get(keyword);
      if (candidates) {
        for (const row of candidates) {
          const currentScore = candidateScores.get(row) || 0;
          candidateScores.set(row, currentScore + weight);
        }
      }
    }

    // If no candidates found, return unmatched
    if (candidateScores.size === 0) {
      if (showDetailLog) {
        console.log(`❌ 未找到候选项`);
      }
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'unmatched',
      };
    }

    // Sort candidates by keyword match count and limit to top 100
    const sortedCandidates = Array.from(candidateScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(entry => entry[0]);

    if (showDetailLog) {
      console.log(`  候选数量: ${candidateScores.size} -> 筛选后: ${sortedCandidates.length}`);
    }

    // Match against top candidates only
    for (const csvRow of sortedCandidates) {
      const fieldsToMatch = [
        csvRow.z1_SKU名称,
        csvRow.z1_SPU名称,
        `${csvRow.z1_SPU名称} ${csvRow.z1_SKU规格}`,
      ];

      for (let fieldIndex = 0; fieldIndex < fieldsToMatch.length; fieldIndex++) {
        const field = fieldsToMatch[fieldIndex];
        if (!field) continue;

        // Skip SPU-only field (index 1) if Excel has color but CSV field doesn't
        // This prevents matching to generic SPU names when specific color is requested
        if (fieldIndex === 1) {
          const excelColors = smartMatcher.extractColors(searchText);
          const csvColors = smartMatcher.extractColors(field);
          if (excelColors.length > 0 && csvColors.length === 0) {
            // Excel has color, but SPU name doesn't - skip this field
            continue;
          }
        }

        // 改进: 使用加权匹配分数
        const score = this.calculateWeightedMatchScore(searchText, field);

        if (score >= threshold) {
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = {
              row: csvRow,
              column: selectedColumns.length > 1 ? selectedColumns.join(' + ') : selectedColumns[0],
              score,
            };
            
            // 改进: 从 > 0.95 改为 > 0.98 且通过验证
            const validation = this.validateMatchAttributes(searchText, csvRow);
            if (this.shouldEarlyExit(score, validation, sortedCandidates.length - fieldIndex)) {
              if (showDetailLog) {
                console.log(`  找到高分匹配，提前退出`);
              }
              break;
            }
          }
        }
      }
      
      // 改进: 使用改进的早期退出条件
      if (bestMatch) {
        const validation = this.validateMatchAttributes(searchText, bestMatch.row);
        if (this.shouldEarlyExit(bestMatch.score, validation, sortedCandidates.length)) {
          break;
        }
      }
    }

    // Return best match if found
    if (bestMatch) {
      if (showDetailLog) {
        console.log(`✅ 匹配成功!`);
        console.log(`  匹配到: ${bestMatch.row.z1_SKU名称}`);
        console.log(`  匹配分数: ${(bestMatch.score * 100).toFixed(1)}%`);
        console.log(`  匹配列: ${bestMatch.column}`);
      }
      
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'matched',
        matchedRow: bestMatch.row,
        matchedColumn: bestMatch.column,
        similarity: bestMatch.score,
      };
    }

    // No match found
    if (showDetailLog) {
      console.log(`❌ 未找到匹配`);
    }
    
    return {
      rowIndex,
      originalData: excelRow,
      matchStatus: 'unmatched',
    };
  }

  /**
   * Perform smart matching for a single Excel row
   * @param excelRow Single row from Excel file
   * @param rowIndex Index of the row
   * @param selectedColumns Columns to check for matching
   * @param gyCsvData All gy.csv data
   * @param threshold Similarity threshold
   * @returns MatchingResult for this row with similarity score
   */
  private smartMatchSingleRow(
    excelRow: Record<string, any>,
    rowIndex: number,
    selectedColumns: string[],
    gyCsvData: GyCsvRow[],
    threshold: number
  ): MatchingResult {
    let bestMatch: {
      row: GyCsvRow;
      column: string;
      score: number;
    } | null = null;

    // 只在前3行显示详细日志
    const showDetailLog = rowIndex < 3;

    // Strategy 1: If multiple columns selected, combine them for matching
    if (selectedColumns.length > 1) {
      // Combine all selected column values into one string
      const combinedValues: string[] = [];
      for (const column of selectedColumns) {
        const value = excelRow[column];
        if (value !== null && value !== undefined && value !== '') {
          combinedValues.push(String(value));
        }
      }

      if (combinedValues.length > 0) {
        const combinedString = combinedValues.join(' ');
        
        if (showDetailLog) {
          console.log(`\n--- 第${rowIndex + 1}行 (多列合并) ---`);
          console.log(`合并值: "${combinedString}"`);
        }

        // Try to find best match in gy.csv data using combined string
        for (const csvRow of gyCsvData) {
          // Match against multiple fields: SKU名称, SPU名称, SKU规格
          const fieldsToMatch = [
            csvRow.z1_SKU名称,
            csvRow.z1_SPU名称,
            `${csvRow.z1_SPU名称} ${csvRow.z1_SKU规格}`,
          ];

          for (const field of fieldsToMatch) {
            if (!field) continue;

            const score = smartMatcher.calculateMatchScore(combinedString, field);

            if (score >= threshold) {
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = {
                  row: csvRow,
                  column: selectedColumns.join(' + '), // Show combined columns
                  score,
                };
              }
            }
          }
        }
      }
    } else {
      // Strategy 2: Single column - match individually
      for (const column of selectedColumns) {
        const value = excelRow[column];

        // Handle edge cases: skip null, undefined, empty strings
        if (value === null || value === undefined || value === '') {
          continue;
        }

        const stringValue = String(value);
        
        if (showDetailLog) {
          console.log(`\n--- 第${rowIndex + 1}行 (单列) ---`);
          console.log(`列: ${column}`);
          console.log(`值: "${stringValue}"`);
        }

        // Try to find best match in gy.csv data
        for (const csvRow of gyCsvData) {
          // Match against multiple fields: SKU名称, SPU名称, SKU规格
          const fieldsToMatch = [
            csvRow.z1_SKU名称,
            csvRow.z1_SPU名称,
            `${csvRow.z1_SPU名称} ${csvRow.z1_SKU规格}`,
          ];

          for (const field of fieldsToMatch) {
            if (!field) continue;

            const score = smartMatcher.calculateMatchScore(stringValue, field);

            if (score >= threshold) {
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = {
                  row: csvRow,
                  column,
                  score,
                };
              }
            }
          }
        }
      }
    }

    // Return best match if found
    if (bestMatch) {
      if (showDetailLog) {
        console.log(`✅ 匹配成功!`);
        console.log(`  匹配到: ${bestMatch.row.z1_SKU名称}`);
        console.log(`  匹配分数: ${(bestMatch.score * 100).toFixed(1)}%`);
        console.log(`  匹配列: ${bestMatch.column}`);
      }
      
      return {
        rowIndex,
        originalData: excelRow,
        matchStatus: 'matched',
        matchedRow: bestMatch.row,
        matchedColumn: bestMatch.column,
        similarity: bestMatch.score,
      };
    }

    // No match found
    if (showDetailLog) {
      console.log(`❌ 未找到匹配`);
    }
    
    return {
      rowIndex,
      originalData: excelRow,
      matchStatus: 'unmatched',
    };
  }

  /**
   * Main matching function that delegates to exact, fuzzy, or smart matching
   * @param excelRows Array of Excel row data
   * @param selectedColumns Columns to use for matching
   * @param matchMode Matching mode ('exact' or 'fuzzy')
   * @param useDatabase Whether to use database instead of CSV (default true)
   * @returns Array of matching results
   */
  async match(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[],
    matchMode: MatchMode
  ): Promise<MatchingResult[]> {
    if (matchMode === 'exact') {
      return this.exactMatch(excelRows, selectedColumns);
    } else {
      // 改进: 使用改进的默认阈值 0.65 而不是 0.45
      return this.smartMatch(excelRows, selectedColumns, 0.65);
    }
  }

  /**
   * Check current memory usage
   * @returns Memory usage in MB
   */
  private checkMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    return heapUsedMB;
  }

  /**
   * Monitor memory usage and throw error if exceeds limit
   */
  private monitorMemory(): void {
    const memoryUsedMB = this.checkMemoryUsage();
    
    if (memoryUsedMB > MAX_MEMORY_USAGE_MB) {
      throw new AppError(
        ErrorCode.INSUFFICIENT_MEMORY,
        `内存使用超过限制（当前: ${Math.round(memoryUsedMB)}MB，限制: ${MAX_MEMORY_USAGE_MB}MB），请尝试减少数据量`,
        507
      );
    }
  }

  /**
   * Process data in batches to handle large datasets efficiently
   * @param excelRows Array of Excel row data
   * @param selectedColumns Columns to use for matching
   * @param matchMode Matching mode ('exact' or 'fuzzy')
   * @param useDatabase Whether to use database instead of CSV (default true)
   * @returns Array of matching results
   */
  async matchWithBatching(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[],
    matchMode: MatchMode
  ): Promise<MatchingResult[]> {
    // Initialize tracking variables
    this.processedRows = 0;
    this.startTime = Date.now();
    
    const totalRows = excelRows.length;
    const results: MatchingResult[] = [];
    
    // Load and prepare data once from database only
    const gyCsvData = await dbLoaderService.loadGyCsvData();
    
    // Prepare lookup structures based on match mode
    let skuSet: Set<string> | undefined;
    let skuMap: Map<string, GyCsvRow> | undefined;
    let gyIndex: Map<string, GyCsvRow[]> | undefined;
    
    if (matchMode === 'exact') {
      // Build exact match lookup structures
      skuSet = new Set<string>();
      skuMap = new Map<string, GyCsvRow>();
      
      for (const row of gyCsvData) {
        const skuName = row.z1_SKU名称;
        if (skuName) {
          skuSet.add(skuName);
          if (!skuMap.has(skuName)) {
            skuMap.set(skuName, row);
          }
        }
      }
    } else {
      // Build index for fuzzy/smart matching
      console.log('正在构建索引以加速匹配...');
      const indexStartTime = Date.now();
      gyIndex = this.buildSmartMatchIndex(gyCsvData);
      const indexTime = Date.now() - indexStartTime;
      console.log(`索引构建完成，耗时: ${indexTime}ms`);
    }
    
    // Process data in batches
    for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
      const batch = excelRows.slice(batchStart, batchEnd);
      
      // Process each row in the batch
      for (let i = 0; i < batch.length; i++) {
        const rowIndex = batchStart + i;
        const excelRow = batch[i];
        
        let result: MatchingResult;
        
        if (matchMode === 'exact') {
          result = this.matchSingleRow(
            excelRow,
            rowIndex,
            selectedColumns,
            skuSet!,
            skuMap!
          );
        } else {
          // Use smart matching with index for fuzzy mode
          result = this.smartMatchSingleRowWithIndex(
            excelRow,
            rowIndex,
            selectedColumns,
            gyIndex!,
            0.45
          );
        }
        
        results.push(result);
        this.processedRows++;
        
        // Check memory usage periodically
        if (this.processedRows % MEMORY_CHECK_INTERVAL === 0) {
          this.monitorMemory();
        }
      }
      
      // Log progress for large datasets
      if (totalRows > 1000) {
        const progress = Math.round((batchEnd / totalRows) * 100);
        console.log(`Matching progress: ${progress}% (${batchEnd}/${totalRows} rows)`);
      }
    }
    
    const elapsedTime = Date.now() - this.startTime;
    console.log(`Matching completed: ${totalRows} rows in ${elapsedTime}ms`);
    
    return results;
  }

  /**
   * Optimized matching function that automatically chooses between
   * regular and batch processing based on data size
   * @param excelRows Array of Excel row data
   * @param selectedColumns Columns to use for matching
   * @param matchMode Matching mode ('exact' or 'fuzzy')
   * @param sessionId Optional session ID for progress tracking
   * @param useDatabase Whether to use database instead of CSV (default true)
   * @returns Array of matching results
   */
  async matchOptimized(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[],
    matchMode: MatchMode,
    sessionId?: string
  ): Promise<MatchingResult[]> {
    // Create progress tracking session if sessionId provided
    if (sessionId) {
      progressTracker.createSession(sessionId, excelRows.length);
    }

    try {
      let results: MatchingResult[];

      // Use batch processing for datasets larger than 1000 rows
      if (excelRows.length > 1000) {
        results = await this.matchWithBatchingAndProgress(
          excelRows,
          selectedColumns,
          matchMode,
          sessionId
        );
      } else {
        results = await this.matchWithProgress(
          excelRows,
          selectedColumns,
          matchMode,
          sessionId
        );
      }

      // Mark session as completed
      if (sessionId) {
        progressTracker.completeSession(sessionId);
      }

      return results;
    } catch (error) {
      // Mark session as error
      if (sessionId) {
        const errorMessage =
          error instanceof Error ? error.message : '匹配过程中发生错误';
        progressTracker.errorSession(sessionId, errorMessage);
      }
      throw error;
    }
  }

  /**
   * Match with progress tracking for regular-sized datasets
   */
  private async matchWithProgress(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[],
    matchMode: MatchMode,
    sessionId?: string
  ): Promise<MatchingResult[]> {
    const results: MatchingResult[] = [];
    let matchedCount = 0;
    const updateInterval = Math.max(1, Math.floor(excelRows.length / 20)); // Update 20 times

    // Load and prepare data from database only
    const gyCsvData = await dbLoaderService.loadGyCsvData();

    let skuSet: Set<string> | undefined;
    let skuMap: Map<string, GyCsvRow> | undefined;
    let gyIndex: Map<string, GyCsvRow[]> | undefined;

    if (matchMode === 'exact') {
      skuSet = new Set<string>();
      skuMap = new Map<string, GyCsvRow>();

      for (const row of gyCsvData) {
        const skuName = row.z1_SKU名称;
        if (skuName) {
          skuSet.add(skuName);
          if (!skuMap.has(skuName)) {
            skuMap.set(skuName, row);
          }
        }
      }
    } else {
      // Build index for fuzzy/smart matching
      console.log('正在构建索引以加速匹配...');
      const indexStartTime = Date.now();
      gyIndex = this.buildSmartMatchIndex(gyCsvData);
      const indexTime = Date.now() - indexStartTime;
      console.log(`索引构建完成，耗时: ${indexTime}ms`);
    }

    // Process each row
    for (let i = 0; i < excelRows.length; i++) {
      const excelRow = excelRows[i];
      let result: MatchingResult;

      if (matchMode === 'exact') {
        result = this.matchSingleRow(excelRow, i, selectedColumns, skuSet!, skuMap!);
      } else {
        result = this.smartMatchSingleRowWithIndex(excelRow, i, selectedColumns, gyIndex!, 0.45);
      }

      results.push(result);

      if (result.matchStatus === 'matched') {
        matchedCount++;
      }

      // Update progress periodically with current row information
      if (sessionId && (i % updateInterval === 0 || i === excelRows.length - 1)) {
        // Create a summary of current row data for display
        const currentRowData = this.formatCurrentRowData(excelRow, selectedColumns);
        progressTracker.updateProgress(sessionId, i + 1, matchedCount, i, currentRowData);
      }
    }

    return results;
  }

  /**
   * Format current row data for progress display
   * Creates a concise string representation of the row being processed
   */
  private formatCurrentRowData(
    row: Record<string, any>,
    selectedColumns: string[]
  ): string {
    const values: string[] = [];
    
    // Include values from selected columns
    for (const column of selectedColumns) {
      const value = row[column];
      if (value !== null && value !== undefined && value !== '') {
        values.push(`${column}: ${String(value).substring(0, 50)}`);
      }
    }
    
    // If no values from selected columns, show first available value
    if (values.length === 0) {
      const firstKey = Object.keys(row)[0];
      if (firstKey && row[firstKey]) {
        values.push(`${firstKey}: ${String(row[firstKey]).substring(0, 50)}`);
      }
    }
    
    return values.join(', ') || '空行';
  }

  /**
   * Match with progress tracking for large datasets using batching
   */
  private async matchWithBatchingAndProgress(
    excelRows: Array<Record<string, any>>,
    selectedColumns: string[],
    matchMode: MatchMode,
    sessionId?: string
  ): Promise<MatchingResult[]> {
    this.processedRows = 0;
    this.startTime = Date.now();

    const totalRows = excelRows.length;
    const results: MatchingResult[] = [];
    let matchedCount = 0;

    // Load and prepare data once from database only
    const gyCsvData = await dbLoaderService.loadGyCsvData();

    let skuSet: Set<string> | undefined;
    let skuMap: Map<string, GyCsvRow> | undefined;
    let gyIndex: Map<string, GyCsvRow[]> | undefined;

    if (matchMode === 'exact') {
      skuSet = new Set<string>();
      skuMap = new Map<string, GyCsvRow>();

      for (const row of gyCsvData) {
        const skuName = row.z1_SKU名称;
        if (skuName) {
          skuSet.add(skuName);
          if (!skuMap.has(skuName)) {
            skuMap.set(skuName, row);
          }
        }
      }
    } else {
      // Build index for fuzzy/smart matching
      console.log('正在构建索引以加速匹配...');
      const indexStartTime = Date.now();
      gyIndex = this.buildSmartMatchIndex(gyCsvData);
      const indexTime = Date.now() - indexStartTime;
      console.log(`索引构建完成，耗时: ${indexTime}ms`);
    }

    // Calculate update frequency - update every 10 rows or at batch boundaries
    const updateFrequency = 10;

    // Process data in batches
    for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
      const batch = excelRows.slice(batchStart, batchEnd);

      // Process each row in the batch
      for (let i = 0; i < batch.length; i++) {
        const rowIndex = batchStart + i;
        const excelRow = batch[i];

        let result: MatchingResult;

        if (matchMode === 'exact') {
          result = this.matchSingleRow(
            excelRow,
            rowIndex,
            selectedColumns,
            skuSet!,
            skuMap!
          );
        } else {
          result = this.smartMatchSingleRowWithIndex(
            excelRow,
            rowIndex,
            selectedColumns,
            gyIndex!,
            0.45
          );
        }

        results.push(result);
        this.processedRows++;

        if (result.matchStatus === 'matched') {
          matchedCount++;
        }

        // Update progress periodically with current row information
        if (sessionId && (this.processedRows % updateFrequency === 0 || this.processedRows === totalRows)) {
          const currentRowData = this.formatCurrentRowData(excelRow, selectedColumns);
          progressTracker.updateProgress(
            sessionId,
            this.processedRows,
            matchedCount,
            rowIndex,
            currentRowData
          );
        }

        // Check memory usage periodically
        if (this.processedRows % MEMORY_CHECK_INTERVAL === 0) {
          this.monitorMemory();
        }
      }

      // Log progress for large datasets
      if (totalRows > 1000) {
        const progress = Math.round((batchEnd / totalRows) * 100);
        console.log(`Matching progress: ${progress}% (${batchEnd}/${totalRows} rows)`);
      }
    }

    const elapsedTime = Date.now() - this.startTime;
    console.log(`Matching completed: ${totalRows} rows in ${elapsedTime}ms`);

    return results;
  }
}

export const matchingService = new MatchingService();
