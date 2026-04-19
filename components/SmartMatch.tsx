'use client';

import { useState, useEffect } from 'react';
import { Spin, Upload, Button, Select, Modal, Progress, Tag, Space } from 'antd';
import { UploadOutlined, FileExcelOutlined, ClearOutlined } from '@ant-design/icons';
import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';
import { MatchingOrchestrator, MatchResult } from '../utils/services/MatchingOrchestrator';
import { parseExcelWithColumnSelection, createInputToRowMapGeneric, previewExcel, type ExcelRowData } from '../utils/excelParser';
import type { BrandData } from '../utils/types';
import { InputPanel } from './SmartMatch/InputPanel';
import { ResultPanel } from './SmartMatch/ResultPanel';
import { message } from 'antd';

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
  const [loadingData, setLoadingData] = useState(true);
  const [brandList, setBrandList] = useState<BrandData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'inputName',
    'matchedResult',
    'matchedBrand',
    'matchedGtins',
    'status',
  ]);
  const [orchestrator] = useState(() => new MatchingOrchestrator());
  const [matcherInitialized, setMatcherInitialized] = useState(false);

  const [results, setResults] = useState<UIMatchResult[]>([]);

  // 匹配进度状态
  const [matchProgress, setMatchProgress] = useState<{
    current: number;
    total: number;
    currentItem: string;
    logs: string[];
    results: UIMatchResult[] | null;
  } | null>(null);

  // Excel 导入相关状态
  const [excelData, setExcelData] = useState<ExcelRowData[]>([]);
  const [isExcelMode, setIsExcelMode] = useState(false);
  // Excel 列选择相关状态
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelFirstRow, setExcelFirstRow] = useState<string[]>([]);
  const [selectedProductColumn, setSelectedProductColumn] = useState<number | null>(null);
  const [selectedGtinColumn, setSelectedGtinColumn] = useState<number | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // 初始化 orchestrator（加载配置）
  useEffect(() => {
    const initOrchestrator = async () => {
      try {
        // 等待品牌列表加载完成
        if (brandList.length === 0) {
          console.log('等待品牌列表加载...');
          return;
        }

        // 不再需要等待SPU列表，MatchingOrchestrator内部会加载SKU数据
        await orchestrator.initialize(brandList, []);
        setMatcherInitialized(true);
        setLoadingData(false);
        console.log('✓ MatchingOrchestrator initialized');
      } catch (error) {
        console.error('Failed to initialize orchestrator:', error);
        message.error('匹配器初始化失败');
        setLoadingData(false);
      }
    };

    if (brandList.length > 0) {
      initOrchestrator();
    }
  }, [orchestrator, brandList]);

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

  // 处理 Excel 数据的匹配
  const handleExcelMatch = async (rows: ExcelRowData[]) => {
    if (!matcherInitialized) {
      message.warning('匹配器初始化中，请稍候');
      return;
    }

    setLoading(true);
    setResults([]);
    setCurrentPage(1);

    // 创建输入到原始数据的映射
    const inputToRowMap = createInputToRowMapGeneric(rows);
    const inputs = Array.from(inputToRowMap.keys());

    console.log(`[Excel匹配] 开始匹配 ${inputs.length} 条数据`);

    setMatchProgress({
      current: 0,
      total: inputs.length,
      currentItem: '正在匹配...',
      logs: [],
      results: null
    });

    // 使用 setTimeout 延迟开始匹配，让 React 先渲染遮罩层
    setTimeout(async () => {
      try {
        // 使用 MatchingOrchestrator 进行批量匹配
        let lastUpdateTime = 0;
        const updateInterval = 150; // 降低到150ms，减少用户感知延迟
        const totalCount = inputs.length;
        // 小数据集每5条日志，大数据集按比例但更频繁
        const logInterval = totalCount > 100 ? Math.max(5, Math.floor(totalCount / 50)) : 5;

        const batchResult = await orchestrator.batchMatch(inputs, (index, total, input, result) => {
          const now = Date.now();
          // 每条都尝试更新（时间和数量条件满足时）
          if (now - lastUpdateTime > updateInterval || index === 1 || index === total) {
            lastUpdateTime = now;
            const newLog = `[${index}/${total}] ${result ? '✓ ' + (result.matchedInfo.sku || '...') : '匹配中...'}`;
            setMatchProgress(prev => prev ? {
              ...prev,
              current: index,
              currentItem: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
              logs: [...prev.logs.slice(-29), newLog]
            } : null);
          }
        });

        // 转换结果格式，关联 GTIN
        const uiResults: UIMatchResult[] = batchResult.results
          .filter((result): result is NonNullable<typeof result> => result !== null)
          .map(result => {
            const originalRow = inputToRowMap.get(result.inputName);
          return {
            inputName: result.inputName,
            originalSkuName: originalRow?.productName,
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
        setMatchProgress(null);

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
        setMatchProgress(null);
        setLoading(false);
      }
    }, 0);
  };

  // 处理 Excel 文件上传（先预览表头）
  const handleExcelUpload = async (file: File) => {
    try {
      console.log('[Excel导入] 预览文件:', file.name);

      // 预览 Excel 文件
      const { headers, firstRow } = await previewExcel(file);
      setExcelHeaders(headers);
      setExcelFirstRow(firstRow);
      setPendingFile(file);
      setShowColumnSelector(true);

    } catch (error) {
      console.error('[Excel导入] 预览失败:', error);
      message.error(`预览失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 返回 false 阻止默认上传行为
    return false;
  };

  // 处理列选择确认
  const handleColumnConfirm = async () => {
    if (selectedProductColumn === null) {
      message.warning('请选择商品名称列');
      return;
    }

    if (!pendingFile) {
      message.warning('文件信息丢失，请重新上传');
      return;
    }

    try {
      setShowColumnSelector(false);
      console.log('[Excel导入] 开始解析文件:', pendingFile.name);

      const rows = await parseExcelWithColumnSelection(
        pendingFile,
        selectedProductColumn,
        selectedGtinColumn ?? undefined
      );
      setExcelData(rows);
      setIsExcelMode(true);

      // 将解析的数据填入输入框（按行分隔显示）
      const inputText = rows.map(r => r.productName).join('\n');
      setInputText(inputText);

      message.success(`成功解析 ${rows.length} 条数据，请点击"开始匹配"`);

    } catch (error) {
      console.error('[Excel导入] 解析失败:', error);
      message.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setPendingFile(null);
    }
  };

  // 取消列选择
  const handleColumnCancel = () => {
    setShowColumnSelector(false);
    setExcelHeaders([]);
    setExcelFirstRow([]);
    setSelectedProductColumn(null);
    setSelectedGtinColumn(null);
    setPendingFile(null);
  };

  // 处理匹配（手动输入或Excel模式）
  const handleMatch = async () => {
    // Excel模式优先
    if (isExcelMode && excelData.length > 0) {
      await handleExcelMatch(excelData);
      return;
    }

    if (!inputText.trim()) {
      message.warning('请输入商品名称');
      return;
    }

    if (!matcherInitialized) {
      message.warning('匹配器初始化中，请稍候');
      return;
    }

    setLoading(true);
    setResults([]);
    setCurrentPage(1);

    const lines = inputText.split('\n').filter(line => line.trim());

    setMatchProgress({
      current: 0,
      total: lines.length,
      currentItem: '',
      logs: [],
      results: null
    });

    // 使用 setTimeout 延迟开始匹配，让 React 先渲染遮罩层
    setTimeout(async () => {
      try {
        // 使用 MatchingOrchestrator 进行批量匹配
        let lastUpdateTime = 0;
        const updateInterval = 150; // 每150ms更新一次UI

        const batchResult = await orchestrator.batchMatch(lines, (index, total, input, result) => {
          const now = Date.now();
          // 每条都尝试更新（时间和数量条件满足时）
          if (now - lastUpdateTime > updateInterval || index === 1 || index === total) {
            lastUpdateTime = now;
            const newLog = `[${index}/${total}] ${result ? '✓ ' + (result.matchedInfo.sku || '...') : '匹配中...'}`;
            setMatchProgress(prev => prev ? {
              ...prev,
              current: index,
              currentItem: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
              logs: [...prev.logs.slice(-29), newLog]
            } : null);
          }
        });

        // 匹配完成，一次性设置结果
        const uiResults: UIMatchResult[] = batchResult.results
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .map(result => ({
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
        setMatchProgress(null);

        message.success(`匹配完成，共处理 ${lines.length} 条记录，成功匹配 ${batchResult.summary.matched} 条`);
      } catch (error) {
        console.error('匹配失败:', error);
        console.error('error type:', typeof error);
        console.error('error.constructor:', error?.constructor?.name);
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(`匹配失败: ${errorMessage}`);
        setMatchProgress(null);
      } finally {
        setLoading(false);
      }
    }, 0);
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
    setExcelHeaders([]);
    setExcelFirstRow([]);
    setSelectedProductColumn(null);
    setSelectedGtinColumn(null);
    setPendingFile(null);
    setInputText('');
    setResults([]);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
    setCurrentPage(1);
    // 如果是Excel模式，也重置Excel相关状态
    if (isExcelMode) {
      setExcelData([]);
      setIsExcelMode(false);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="正在加载数据..." />
      </div>
    );
  }

  return (
    <>
      {/* 匹配中遮罩层 - 阻止用户操作其他区域 */}
      {loading && matchProgress && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center w-96">
            <Spin size="large" className="mb-4" />
            <p className="text-lg font-medium text-gray-700">正在匹配中...</p>

            {/* 进度条 */}
            <div className="w-full mt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>{matchProgress.current} / {matchProgress.total}</span>
                <span>{Math.round((matchProgress.current / matchProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(matchProgress.current / matchProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* 当前处理项 */}
            {matchProgress.currentItem && (
              <p className="text-sm text-gray-400 mt-3 truncate w-full text-center">
                {matchProgress.currentItem}
              </p>
            )}

            {/* 最近日志 */}
            {matchProgress.logs.length > 0 && (
              <div className="mt-3 w-full bg-slate-900 rounded-lg p-2 max-h-20 overflow-auto">
                <div className="font-mono text-xs text-green-400">
                  {matchProgress.logs.slice(-5).join('\n')}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-400 mt-4">陛下莫急，请耐心等待</p>
          </div>
        </div>
      )}

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
            支持 .xls/.xlsx 格式
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
            textareaDisabled={!matcherInitialized || isExcelMode}
            buttonDisabled={!matcherInitialized || (isExcelMode && !inputText.trim())}
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
          matchProgress={matchProgress}
        />
      </div>

      {/* 列选择弹窗 */}
      <Modal
        title="选择Excel列"
        open={showColumnSelector}
        onOk={handleColumnConfirm}
        onCancel={handleColumnCancel}
        okText="确认"
        cancelText="取消"
        width={600}
      >
        <div className="space-y-4 py-4">
          <p className="text-gray-600">请选择商品名称列和69码列（可选）：</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品名称列 <span className="text-red-500">*</span>
            </label>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择商品名称列"
              value={selectedProductColumn}
              onChange={setSelectedProductColumn}
              options={excelHeaders.map((header, index) => ({
                label: `${header || `列${index + 1}`} → ${excelFirstRow[index] || '(空)'}`,
                value: index,
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              69码列（可选）
            </label>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择69码列（可选）"
              value={selectedGtinColumn}
              onChange={setSelectedGtinColumn}
              allowClear
              options={excelHeaders.map((header, index) => ({
                label: `${header || `列${index + 1}`} → ${excelFirstRow[index] || '(空)'}`,
                value: index,
              }))}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded text-xs text-gray-500">
            <p>提示：选择商品名称列后，系统将对该列的数据进行匹配。</p>
            <p>如果选择69码列，匹配结果将关联对应的69码信息。</p>
          </div>
        </div>
      </Modal>
    </div>
    </>
  );
}
