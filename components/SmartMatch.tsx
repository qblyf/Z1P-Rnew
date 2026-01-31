'use client';

import { useState, useEffect } from 'react';
import { message, Spin } from 'antd';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';
import { MatchingOrchestrator, type MatchResult } from '../utils/services/MatchingOrchestrator';
import type { SPUData, SKUData, BrandData } from '../utils/types';
import { InputPanel } from './SmartMatch/InputPanel';
import { ResultPanel } from './SmartMatch/ResultPanel';

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

  // 兼容的匹配结果类型（用于UI显示）
  interface UIMatchResult {
    inputName: string;
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

  const [results, setResults] = useState<UIMatchResult[]>([]);

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

  // 加载所有SPU数据并从SKU规格中提取颜色、规格、组合
  // 注意：不再自动加载，改为手动触发，避免在预加载时触发
  const loadSPUData = async () => {
    try {
      setLoadingSPU(true);
      
      console.log('=== 开始加载SPU和SKU规格数据 ===');
      const startTime = Date.now();
      
      // 分批加载所有SPU数据（包含skuIDs）
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
            orderBy: [{ key: 'p."id"', sort: 'DESC' }],
          },
          ['id', 'name', 'brand', 'skuIDs']
        );
        
        allSpuList.push(...spuList);
        console.log(`已加载 ${spuList.length} 个SPU，总计: ${allSpuList.length}`);
        
        if (spuList.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      }
      
      setSPUList(allSpuList);
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('=== SPU数据加载完成 ===');
      console.log(`总SPU数量: ${allSpuList.length}`);
      console.log(`总耗时: ${totalTime}秒`);
      
      message.success(`已加载 ${allSpuList.length} 个SPU（耗时${totalTime}秒）`);
    } catch (error) {
      message.error('加载SPU数据失败');
      console.error(error);
    } finally {
      setLoadingSPU(false);
    }
  };

  // 只在首次真正需要时加载数据
  useEffect(() => {
    // 检查是否真正在智能匹配页面（而不是预加载）
    if (typeof window !== 'undefined' && window.location.pathname === '/smart-match') {
      // 延迟加载，确保页面已完全渲染
      const timer = setTimeout(() => {
        if (spuList.length === 0) {
          loadSPUData();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

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
    setResults([]); // 清空之前的结果
    setCurrentPage(1); // 重置到第一页
    
    try {
      // 将输入按行分割
      const lines = inputText.split('\n').filter(line => line.trim());
      
      // 使用 MatchingOrchestrator 进行批量匹配
      const batchResult = await orchestrator.batchMatch(lines);
      
      // 转换结果格式以适配UI（保持与旧格式兼容）
      const uiResults = batchResult.results.map(result => ({
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
      
      setResults(uiResults as any);
      
      message.success(`匹配完成，共处理 ${lines.length} 条记录，成功匹配 ${batchResult.summary.matched} 条`);
    } catch (error) {
      message.error('匹配失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (results.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    const csvContent = [
      ['输入商品名称', '匹配状态', '匹配的SPU', '版本', '内存', '颜色', '匹配的SKU', '品牌', '69码', '相似度'],
      ...results.map(r => [
        r.inputName,
        r.status === 'matched' ? '已匹配' : '未匹配',
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
    link.download = `智能匹配结果_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    message.success('导出成功');
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
        <InputPanel
          inputText={inputText}
          onInputChange={setInputText}
          onMatch={handleMatch}
          onClear={handleClear}
          loading={loading}
          spuCount={spuList.length}
          disabled={!matcherInitialized}
        />
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
