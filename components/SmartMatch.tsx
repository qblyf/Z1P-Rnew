'use client';

import { useState, useEffect } from 'react';
import { message, Spin } from 'antd';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';
import { SimpleMatcher, type MatchResult } from '../utils/smartMatcher';
import type { SPUData, SKUData, BrandData } from '../utils/types';
import { SPU_MATCH_THRESHOLD } from '../utils/constants';
import { InputPanel } from './SmartMatch/InputPanel';
import { ResultPanel } from './SmartMatch/ResultPanel';

export default function SmartMatch() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSPU, setLoadingSPU] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [spuList, setSPUList] = useState<SPUData[]>([]);
  const [brandList, setBrandList] = useState<BrandData[]>([]);
  const [colorList, setColorList] = useState<string[]>([]);
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
  const [matcher] = useState(() => new SimpleMatcher());
  const [matcherInitialized, setMatcherInitialized] = useState(false);

  // 初始化 matcher（加载配置）
  useEffect(() => {
    const initMatcher = async () => {
      try {
        await matcher.initialize();
        setMatcherInitialized(true);
        console.log('✓ Matcher initialized');
      } catch (error) {
        console.error('Failed to initialize matcher:', error);
        // 即使初始化失败，也允许继续使用（会使用默认值）
        setMatcherInitialized(true);
      }
    };
    initMatcher();
  }, [matcher]);

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
      
      // 性能优化：建立品牌索引
      matcher.buildSPUIndex(allSpuList);
      
      // 统计颜色、规格和组合数据
      // Requirements: 2.4.1, 3.2.1, 3.2.2
      const colorMap = new Map<string, Set<number>>();
      const specMap = new Map<string, Set<number>>();
      const comboMap = new Map<string, Set<number>>();
      
      let processedSKUs = 0;
      
      for (const spu of allSpuList) {
        const { id, skuIDs } = spu;
        
        if (!skuIDs || skuIDs.length === 0) {
          continue;
        }
        
        // 从 skuIDs 中提取颜色、规格和组合信息
        for (const skuInfo of skuIDs) {
          // 提取颜色
          if ('color' in skuInfo && skuInfo.color) {
            const color = skuInfo.color;
            if (!colorMap.has(color)) {
              colorMap.set(color, new Set());
            }
            colorMap.get(color)!.add(id);
          }
          
          // 提取规格
          if ('spec' in skuInfo && skuInfo.spec) {
            const spec = skuInfo.spec;
            if (!specMap.has(spec)) {
              specMap.set(spec, new Set());
            }
            specMap.get(spec)!.add(id);
          }
          
          // 提取组合
          if ('combo' in skuInfo && skuInfo.combo) {
            const combo = skuInfo.combo;
            if (!comboMap.has(combo)) {
              comboMap.set(combo, new Set());
            }
            comboMap.get(combo)!.add(id);
          }
          
          processedSKUs++;
        }
      }
      
      // 转换为数组并按长度降序排序（优先匹配更长的颜色词）
      const colors = Array.from(colorMap.keys()).sort((a, b) => b.length - a.length);
      setColorList(colors);
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('=== 规格数据加载完成 ===');
      console.log(`总SPU数量: ${allSpuList.length}`);
      console.log(`处理SKU: ${processedSKUs} 个`);
      console.log(`提取颜色: ${colors.length} 个`);
      console.log(`提取规格: ${specMap.size} 个`);
      console.log(`提取组合: ${comboMap.size} 个`);
      console.log(`总耗时: ${totalTime}秒`);
      console.log('颜色列表（按长度降序）:', colors.slice(0, 20), colors.length > 20 ? `... 还有 ${colors.length - 20} 个` : '');
      
      message.success(`已加载 ${allSpuList.length} 个SPU，提取 ${colors.length} 个颜色词（耗时${totalTime}秒）`);
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
    
    // 设置动态颜色列表到 matcher
    matcher.setColorList(colorList);
    console.log('使用颜色列表:', colorList.length, '个颜色');
    
    // 设置品牌列表到 matcher
    matcher.setBrandList(brandList);
    console.log('使用品牌列表:', brandList.length, '个品牌');
    
    try {
      // 将输入按行分割
      const lines = inputText.split('\n').filter(line => line.trim());
      
      // 对每一行进行匹配
      for (let i = 0; i < lines.length; i++) {
        let trimmedLine = lines[i].trim();
        
        // 添加：清理演示机标记
        trimmedLine = matcher.cleanDemoMarkers(trimmedLine);
        
        // 改进的输入预处理
        trimmedLine = matcher.preprocessInputAdvanced(trimmedLine);
        
        // 提取版本信息（用于 SKU 匹配）
        const inputVersion = matcher.extractVersion(trimmedLine);
        
        // 第一阶段：匹配SPU
        const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
          trimmedLine,
          spuList,
          SPU_MATCH_THRESHOLD // 使用常量代替魔法数字
        );
        
        if (!matchedSPU) {
          // SPU未匹配，立即显示结果
          setResults(prev => [...prev, {
            inputName: trimmedLine,
            matchedSKU: null,
            matchedSPU: null,
            matchedBrand: null,
            matchedVersion: null,
            matchedMemory: null,
            matchedColor: null,
            matchedGtins: [],
            similarity: 0,
            status: 'unmatched' as const,
          }]);
          continue;
        }
        
        // SPU匹配成功，先显示SPU结果
        const tempResult: MatchResult = {
          inputName: trimmedLine,
          matchedSKU: null,
          matchedSPU: matchedSPU.name,
          matchedBrand: matchedSPU.brand || null,
          matchedVersion: null,
          matchedMemory: null,
          matchedColor: null,
          matchedGtins: [],
          similarity: spuSimilarity,
          status: 'spu-matched' as const,
        };
        
        setResults(prev => [...prev, tempResult]);
        
        console.log('匹配到SPU:', matchedSPU.name, 'ID:', matchedSPU.id);
        
        // 第二阶段：加载该SPU的所有SKU
        try {
          const spuInfo = await getSPUInfo(matchedSPU.id);
          const skuIDs = spuInfo.skuIDs || [];
          
          if (skuIDs.length === 0) {
            // 该SPU没有SKU，更新为未匹配
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? { 
                ...r, 
                status: 'unmatched' as const,
                matchedGtins: [],
              } : r
            ));
            continue;
          }
          
          // 获取SKU详细信息
          const skuDetails = await getSKUsInfo(skuIDs.map(s => s.skuID));
          
          // 转换为 SKUData 格式
          const skuData: SKUData[] = skuDetails
            .filter(sku => !('errInfo' in sku) && sku.state === SKUState.在用)
            .map(sku => {
              // 从 SKU 名称中提取规格信息
              const capacity = matcher.extractCapacity(sku.name);
              const color = matcher.extractColorAdvanced(sku.name);
              
              return {
                id: sku.id,
                name: sku.name,
                spuID: matchedSPU.id,
                spuName: matchedSPU.name,
                brand: matchedSPU.brand,
                version: undefined, // SKU 中没有版本字段，可以从名称提取
                memory: capacity || undefined, // 使用容量作为内存
                color: color || undefined,
                gtins: sku.gtins || [],
              };
            });
          
          console.log(`SPU ${matchedSPU.name} 的在用SKU数量:`, skuData.length);
          
          if (skuData.length === 0) {
            // 该SPU没有在用的SKU，更新为未匹配
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? { 
                ...r, 
                status: 'unmatched' as const,
                matchedGtins: [],
              } : r
            ));
            continue;
          }
          
          // 第三阶段：在SKU中匹配参数（容量、颜色、版本）
          const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKU(
            trimmedLine,
            skuData,
            { inputVersion }
          );
          
          if (matchedSKU) {
            // 计算综合相似度
            // SPU 匹配（品牌+型号）占 50%
            // SKU 参数匹配（容量+颜色+版本）占 50%
            const finalSimilarity = spuSimilarity * 0.5 + skuSimilarity * 0.5;
            
            console.log('最终相似度计算:', {
              spuSimilarity,
              skuSimilarity,
              finalSimilarity,
              skuName: matchedSKU.name
            });
            
            // 更新为完全匹配
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? {
                ...r,
                matchedSKU: matchedSKU.name || null,
                matchedVersion: matchedSKU.version || null,
                matchedMemory: matchedSKU.memory || null,
                matchedColor: matchedSKU.color || null,
                matchedGtins: matchedSKU.gtins || [],
                similarity: finalSimilarity,
                status: 'matched' as const,
              } : r
            ));
          } else {
            // SKU参数未匹配，保持 SPU 已匹配状态
            setResults(prev => prev.map((r, idx) => 
              idx === prev.length - 1 ? { 
                ...r, 
                status: 'unmatched' as const,
                matchedGtins: [],
              } : r
            ));
          }
        } catch (error) {
          console.error('加载SKU失败:', error);
          // 更新为未匹配
          setResults(prev => prev.map((r, idx) => 
            idx === prev.length - 1 ? { 
              ...r, 
              status: 'unmatched' as const,
              matchedGtins: [],
            } : r
          ));
        }
      }

      const finalResults = await new Promise<MatchResult[]>(resolve => {
        setTimeout(() => {
          setResults(current => {
            const matchedCount = current.filter(r => r.status === 'matched').length;
            message.success(`匹配完成，共处理 ${lines.length} 条记录，成功匹配 ${matchedCount} 条`);
            resolve(current);
            return current;
          });
        }, 100);
      });
      
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
