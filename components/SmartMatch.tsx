'use client';

import { useState, useEffect } from 'react';
import { message, Spin, Upload, Button } from 'antd';
import { UploadOutlined, FileExcelOutlined, ClearOutlined } from '@ant-design/icons';
import { getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';
import { SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';
import { MatchingOrchestrator } from '../utils/services/MatchingOrchestrator';
import { parseExcelAndConvert, createInputToRowMap, type ExcelRowData } from '../utils/excelParser';
import type { SPUData, BrandData } from '../utils/types';
import { InputPanel } from './SmartMatch/InputPanel';
import { ResultPanel } from './SmartMatch/ResultPanel';

// 兼容的匹配结果类型（用于UI显示）
interface UIMatchResult {
  inputName: string;
  originalSkuName?: string; // Excel原始sku名称
  matchedSKU: string | null;
  matchedSPU: string | null;
  matchedBrand: string | null;
  matchedVersion: string | null;
  matchedMemory: string | null;
  matchedColor: string | null;
  matchedGtins: string[];
  similarity: number;
  status: 'matched' | 'unmatched' | 'spu-matched';
}

export default function SmartMatch() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSPU, setLoadingSPU] = useState(true);
  const [spuList, setSPUList] = useState<SPUData[]>([]);
  const [brandList, setBrandList] = useState<BrandData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'inputName',
    'matchedSPU',
    'specs',
    'matchedSKU',
    'matchedBrand',
    'matchedGtins',
    'statusAndSimilarity',
  ]);
  const [orchestrator] = useState(() => new MatchingOrchestrator());
  const [matcherInitialized, setMatcherInitialized] = useState(false);

  const [results, setResults] = useState<UIMatchResult[]>([]);

  // Excel 导入相关状态
  const [excelData, setExcelData] = useState<ExcelRowData[]>([]);
  const [isExcelMode, setIsExcelMode] = useState(false);

  // 初始化 orchestrator（加载配置）
  useEffect(() => {
    const initOrchestrator = async () => {
      try {
        // 等待品牌列表加载完成
        if (brandList.length === 0) {
          console.log('等待品牌列表加载...');
          return;
        }

        // 等待SPU列表加载完成
        if (spuList.length === 0) {
          console.log('等待SPU列表加载...');
          return;
        }

        await orchestrator.initialize(brandList, spuList);
        setMatcherInitialized(true);
        console.log('✓ MatchingOrchestrator initialized');
      } catch (error) {
        console.error('Failed to initialize orchestrator:', error);
        message.error('匹配器初始化失败');
      }
    };

    if (brandList.length > 0 && spuList.length > 0) {
      initOrchestrator();
    }
  }, [orchestrator, brandList, spuList]);

  // 加载品牌数据
  useEffect(() => {
    const loadBrandData = async () => {
      try {
        const brands = await getBrandBaseList();
        setBrandList(brands);
        console.log('已加载品牌数据:', brands.length, '个品牌');
      } catch (error) {
        console.error('加载品牌数据失败:', error);
      }
    };
    loadBrandData();
  }, []);

  // 加载所有SPU数据
  const loadSPUData = async () => {
    try {
      setLoadingSPU(true);

      console.log('=== 开始加载SPU和SKU规格数据 ===');
      const startTime = Date.now();

      // 分批加载所有SPU数据（包含skuIDs）
      const allSpuList: SPUData[] = [];
      const batchSize = 10000;
      let offset = 0;
      let hasMore = true;
      let totalLoaded = 0;
      let filteredCount = 0;

      while (hasMore) {
        const spuListBatch = await getSPUListNew(
          {
            states: [SPUState.在用],
            limit: batchSize,
            offset,
            orderBy: [{ key: 'p."id"', sort: 'ASC' }],
          },
          ['id', 'name', 'brand', 'skuIDs']
        );

        totalLoaded += spuListBatch.length;

        // 过滤掉没有品牌的SPU
        const validSpuList = spuListBatch.filter(spu => {
          if (!spu.brand || spu.brand.trim() === '') {
            filteredCount++;
            return false;
          }
          return true;
        });

        allSpuList.push(...validSpuList);
        console.log(`已加载 ${spuListBatch.length} 个SPU，过滤 ${spuListBatch.length - validSpuList.length} 个无品牌SPU，有效: ${validSpuList.length}，总计: ${allSpuList.length}`);

        if (spuListBatch.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      }

      setSPUList(allSpuList);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log('=== SPU数据加载完成 ===');
      console.log(`总加载: ${totalLoaded} 个SPU`);
      console.log(`过滤无品牌: ${filteredCount} 个SPU`);
      console.log(`有效SPU: ${allSpuList.length} 个`);
      console.log(`总耗时: ${totalTime}秒`);

      message.success(`已加载 ${allSpuList.length} 个有效SPU（过滤${filteredCount}个无品牌，耗时${totalTime}秒）`);
    } catch (error) {
      message.error('加载SPU数据失败');
      console.error(error);
    } finally {
      setLoadingSPU(false);
    }
  };

  // 只在首次真正需要时加载数据
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/smart-match') {
      const timer = setTimeout(() => {
        if (spuList.length === 0) {
          loadSPUData();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // 处理 Excel 数据的匹配
  const handleExcelMatch = async (rows: ExcelRowData[]) => {
    if (spuList.length === 0) {
      message.warning('SPU数据未加载完成，请稍候');
      return;
    }

    if (!matcherInitialized) {
      message.warning('匹配器初始化中，请稍候');
      return;
    }

    setLoading(true);
    setResults([]);
    setCurrentPage(1);

    try {
      // 创建输入到原始数据的映射
      const inputToRowMap = createInputToRowMap(rows);

      // 提取需要匹配的输入数组
      const inputs = Array.from(inputToRowMap.keys());

      console.log(`[Excel匹配] 开始匹配 ${inputs.length} 条数据`);

      // 使用 MatchingOrchestrator 进行批量匹配
      const batchResult = await orchestrator.batchMatch(inputs);

      // 转换结果格式，关联 GTIN
      const uiResults: UIMatchResult[] = batchResult.results.map(result => {
        const originalRow = inputToRowMap.get(result.inputName);
        return {
          inputName: result.inputName,
          originalSkuName: originalRow?.skuName,
          matchedSKU: result.matchedInfo.sku || null,
          matchedSPU: result.matchedInfo.spu || null,
          matchedBrand: result.extractedInfo.brand || null,
          matchedVersion: result.extractedInfo.version || null,
          matchedMemory: result.extractedInfo.memory || null,
          matchedColor: result.extractedInfo.color || null,
          matchedGtins: originalRow?.gtin ? [originalRow.gtin] : result.matchedInfo.gtins || [],
          similarity: result.similarity,
          status: result.status as 'matched' | 'unmatched' | 'spu-matched',
        };
      });

      setResults(uiResults);

      // 统计匹配结果
      const matchedCount = batchResult.summary.matched;
      const spuMatchedCount = batchResult.summary.spuMatched;
      const unmatchedCount = batchResult.summary.unmatched;

      message.success(
        `匹配完成，共处理 ${inputs.length} 条记录。` +
        `完全匹配: ${matchedCount}，SPU匹配: ${spuMatchedCount}，未匹配: ${unmatchedCount}`
      );
    } catch (error) {
      message.error('匹配失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 处理 Excel 文件上传
  const handleExcelUpload = async (file: File) => {
    try {
      setLoading(true);
      console.log('[Excel导入] 开始解析文件:', file.name);

      const rows = await parseExcelAndConvert(file);
      setExcelData(rows);
      setIsExcelMode(true);

      message.success(`成功解析 ${rows.length} 条数据`);

      // 自动执行匹配
      await handleExcelMatch(rows);

    } catch (error) {
      console.error('[Excel导入] 解析失败:', error);
      message.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }

    // 返回 false 阻止默认上传行为
    return false;
  };

  // 处理手动输入匹配
  const handleMatch = async () => {
    if (!inputText.trim()) {
      message.warning('请输入商品名称');
      return;
    }

    if (spuList.length === 0) {
      message.warning('SPU数据未加载完成，请稍候');
      return;
    }

    if (!matcherInitialized) {
      message.warning('匹配器初始化中，请稍候');
      return;
    }

    setLoading(true);
    setResults([]);
    setCurrentPage(1);

    try {
      // 将输入按行分割
      const lines = inputText.split('\n').filter(line => line.trim());

      // 使用 MatchingOrchestrator 进行批量匹配
      const batchResult = await orchestrator.batchMatch(lines);

      // 转换结果格式以适配UI（保持与旧格式兼容）
      const uiResults: UIMatchResult[] = batchResult.results.map(result => ({
        inputName: result.inputName,
        matchedSKU: result.matchedInfo.sku || null,
        matchedSPU: result.matchedInfo.spu || null,
        matchedBrand: result.extractedInfo.brand || null,
        matchedVersion: result.extractedInfo.version || null,
        matchedMemory: result.extractedInfo.memory || null,
        matchedColor: result.extractedInfo.color || null,
        matchedGtins: result.matchedInfo.gtins || [],
        similarity: result.similarity,
        status: result.status as 'matched' | 'unmatched' | 'spu-matched',
      }));

      setResults(uiResults);

      message.success(`匹配完成，共处理 ${lines.length} 条记录，成功匹配 ${batchResult.summary.matched} 条`);
    } catch (error) {
      message.error('匹配失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 导出结果（支持 Excel 模式）
  const exportResults = () => {
    if (results.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    const csvContent = [
      ['原始商品名称', '输入名称', '匹配状态', '匹配的SPU', '版本', '内存', '颜色', '匹配的SKU', '品牌', '69码', '相似度'],
      ...results.map(r => [
        r.originalSkuName || r.inputName,
        r.inputName,
        r.status === 'matched' ? '已匹配' : r.status === 'spu-matched' ? 'SPU已匹配' : '未匹配',
        r.matchedSPU || '-',
        r.matchedVersion || '-',
        r.matchedMemory || '-',
        r.matchedColor || '-',
        r.matchedSKU || '-',
        r.matchedBrand || '-',
        r.matchedGtins.join('; ') || '-',
        r.status === 'matched' ? `${(r.similarity * 100).toFixed(0)}%` : '-',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const prefix = isExcelMode ? 'Excel匹配结果' : '智能匹配结果';
    link.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    message.success('导出成功');
  };

  // 清除 Excel 数据
  const handleClearExcel = () => {
    setExcelData([]);
    setIsExcelMode(false);
    setInputText('');
    setResults([]);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  if (loadingSPU) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="正在加载SPU数据..." />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* 左侧：输入区域 */}
      <div className="w-1/3 flex flex-col">
        {/* Excel 导入区域 */}
        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileExcelOutlined className="text-green-600 text-lg" />
              <span className="font-medium text-gray-700">Excel导入模式</span>
              {isExcelMode && excelData.length > 0 && (
                <span className="text-sm text-gray-500">（{excelData.length} 条数据）</span>
              )}
            </div>
            {isExcelMode && (
              <Button
                type="text"
                danger
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearExcel}
              >
                清除
              </Button>
            )}
          </div>

          <Upload
            accept=".xls,.xlsx"
            showUploadList={false}
            beforeUpload={handleExcelUpload}
            disabled={loading || !matcherInitialized}
          >
            <Button
              type="default"
              icon={<UploadOutlined />}
              loading={loading && isExcelMode}
              disabled={loading || !matcherInitialized}
            >
              选择Excel文件导入
            </Button>
          </Upload>

          <div className="mt-2 text-xs text-gray-400">
            支持 .xls/.xlsx 格式，列名需包含&quot;纬图sku名称&quot;和&quot;69码&quot;
          </div>
        </div>

        {/* 手动输入区域 */}
        <div className="flex-1">
          <InputPanel
            inputText={inputText}
            onInputChange={setInputText}
            onMatch={handleMatch}
            onClear={handleClear}
            loading={loading}
            spuCount={spuList.length}
            disabled={!matcherInitialized || isExcelMode}
          />
        </div>
      </div>

      {/* 右侧：结果区域 */}
      <div className="w-2/3 flex flex-col">
        <ResultPanel
          results={results}
          brandList={brandList}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onExport={exportResults}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
