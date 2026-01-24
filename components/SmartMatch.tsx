'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, XCircle, Download, Settings } from 'lucide-react';
import { Card, Input, Button, Table, Tag, Space, message, Spin, Checkbox, Dropdown } from 'antd';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';
import { SimpleMatcher, type MatchResult, type SPUData, type SKUData } from '../utils/smartMatcher';

interface BrandData {
  name: string;
  color: string;
  spell?: string;
  order?: number;
}
export function SmartMatchComponent() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSPU, setLoadingSPU] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [spuList, setSPUList] = useState<SPUData[]>([]);
  const [brandList, setBrandList] = useState<BrandData[]>([]); // 品牌列表
  const [colorList, setColorList] = useState<string[]>([]); // 动态颜色列表
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
  const [columnDropdownVisible, setColumnDropdownVisible] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>(visibleColumns);
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
        
        // PHASE2-4: 改进的输入预处理
        trimmedLine = matcher.preprocessInputAdvanced(trimmedLine);
        
        // PHASE2-1: 检测产品类型
        const productType = matcher.detectProductType(trimmedLine);
        console.log('产品类型:', productType);
        
        // PHASE2-2: 提取版本信息
        const inputVersion = matcher.extractVersion(trimmedLine);
        console.log('版本信息:', inputVersion?.name || '无');
        
        // 第一阶段：匹配SPU
        const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
          trimmedLine,
          spuList,
          0.5 // SPU匹配阈值降低到50%
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
          // PHASE2-2: 使用改进的 SKU 匹配，考虑版本信息
          const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKUWithVersion(
            trimmedLine,
            skuData,
            inputVersion
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

  // 定义所有可用的列
  const allColumns = [
    {
      title: '输入商品名称',
      dataIndex: 'inputName',
      key: 'inputName',
      width: 250,
      fixed: 'left' as const,
    },
    {
      title: '匹配的SPU',
      dataIndex: 'matchedSPU',
      key: 'matchedSPU',
      width: 200,
      render: (text: string | null) => text || '-',
    },
    {
      title: '规格标签',
      key: 'specs',
      width: 250,
      render: (_: unknown, record: MatchResult) => {
        if (record.status === 'spu-matched') {
          return <span className="text-gray-400">正在匹配...</span>;
        }
        const specs = [];
        if (record.matchedVersion) specs.push(<Tag key="version" color="blue">{record.matchedVersion}</Tag>);
        if (record.matchedMemory) specs.push(<Tag key="memory" color="green">{record.matchedMemory}</Tag>);
        if (record.matchedColor) specs.push(<Tag key="color" color="purple">{record.matchedColor}</Tag>);
        return specs.length > 0 ? <Space size={4}>{specs}</Space> : '-';
      },
    },
    {
      title: '匹配的SKU',
      dataIndex: 'matchedSKU',
      key: 'matchedSKU',
      width: 250,
      render: (text: string | null, record: MatchResult) => {
        if (record.status === 'spu-matched') {
          return <span className="text-gray-400">正在匹配SKU...</span>;
        }
        return text || '-';
      },
    },
    {
      title: '品牌',
      dataIndex: 'matchedBrand',
      key: 'matchedBrand',
      width: 120,
      render: (text: string | null) => {
        if (!text) return '-';
        const brand = brandList.find(b => b.name === text);
        return brand ? <Tag color={brand.color}>{brand.name}</Tag> : <Tag color="orange">{text}</Tag>;
      },
    },
    {
      title: '69码',
      dataIndex: 'matchedGtins',
      key: 'matchedGtins',
      width: 200,
      render: (gtins: string[]) => {
        if (!gtins || gtins.length === 0) return '-';
        return (
          <div className="flex flex-col gap-1">
            {gtins.map((gtin, idx) => (
              <span key={idx} className="text-xs font-mono">{gtin}</span>
            ))}
          </div>
        );
      },
    },
    {
      title: '状态/相似度',
      key: 'statusAndSimilarity',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: MatchResult) => {
        if (record.status === 'matched') {
          return (
            <Space direction="vertical" size={4}>
              <Tag icon={<CheckCircle size={14} />} color="success">
                已匹配
              </Tag>
              <Tag color={record.similarity >= 0.8 ? 'green' : record.similarity >= 0.6 ? 'orange' : 'red'}>
                {(record.similarity * 100).toFixed(0)}%
              </Tag>
            </Space>
          );
        } else if (record.status === 'spu-matched') {
          return (
            <Tag icon={<Loader2 size={14} className="animate-spin" />} color="processing">
              匹配中...
            </Tag>
          );
        } else {
          return (
            <Tag icon={<XCircle size={14} />} color="error">
              未匹配
            </Tag>
          );
        }
      },
    },
  ];

  // 根据 visibleColumns 过滤列
  const columns = allColumns.filter(col => visibleColumns.includes(col.key));

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
        <Card className="flex-1 flex flex-col" bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex flex-col h-full">
            <div className="mb-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  输入商品名称（每行一个）
                </label>
                <div className="text-sm text-slate-500">
                  已加载 {spuList.length} 个SPU
                </div>
              </div>
              <Input.TextArea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入商品名称，每行一个&#10;例如：&#10;华为 Mate 60 Pro 12+256 雅川青&#10;苹果 iPhone 15 Pro Max 256GB 钛金色&#10;小米14 Ultra 16GB+512GB 黑色"
                className="flex-1"
                style={{ height: '100%', minHeight: '400px', resize: 'none' }}
                disabled={loading}
              />
            </div>

            <div className="mt-auto space-y-3">
              <div className="text-sm text-slate-500">
                支持批量输入，系统将先匹配SPU，再匹配对应的SKU参数（容量、颜色）
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setInputText('');
                    setResults([]);
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                  block
                >
                  清空
                </Button>
                <Button
                  type="primary"
                  icon={loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  onClick={handleMatch}
                  disabled={loading || !inputText.trim()}
                  block
                >
                  {loading ? '匹配中...' : '开始匹配'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 右侧：结果区域 */}
      <div className="w-2/3 flex flex-col">
        {results.length > 0 ? (
          <Card 
            className="flex-1 flex flex-col"
            bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
            title={
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <span>匹配结果</span>
                  <div className="flex gap-2">
                    <Tag color="blue">
                      总计：{results.length} 条
                    </Tag>
                    <Tag color="success">
                      已匹配：{results.filter(r => r.status === 'matched').length} 条
                    </Tag>
                    <Tag color="error">
                      未匹配：{results.filter(r => r.status === 'unmatched').length} 条
                    </Tag>
                  </div>
                </div>
                <Space>
                  <Dropdown
                    open={columnDropdownVisible}
                    onOpenChange={(visible) => {
                      if (visible) {
                        setTempVisibleColumns(visibleColumns);
                      }
                      setColumnDropdownVisible(visible);
                    }}
                    dropdownRender={() => (
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3" style={{ minWidth: '200px' }}>
                        <div className="mb-2 pb-2 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">选择显示列</span>
                        </div>
                        <div className="space-y-2 mb-3">
                          <Checkbox
                            checked={tempVisibleColumns.includes('inputName')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'inputName']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'inputName'));
                              }
                            }}
                          >
                            输入商品名称
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedSPU')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedSPU']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedSPU'));
                              }
                            }}
                          >
                            匹配的SPU
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('specs')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'specs']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'specs'));
                              }
                            }}
                          >
                            规格标签
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedSKU')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedSKU']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedSKU'));
                              }
                            }}
                          >
                            匹配的SKU
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedBrand')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedBrand']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedBrand'));
                              }
                            }}
                          >
                            品牌
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('matchedGtins')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'matchedGtins']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'matchedGtins'));
                              }
                            }}
                          >
                            69码
                          </Checkbox>
                          <Checkbox
                            checked={tempVisibleColumns.includes('statusAndSimilarity')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempVisibleColumns([...tempVisibleColumns, 'statusAndSimilarity']);
                              } else {
                                setTempVisibleColumns(tempVisibleColumns.filter(c => c !== 'statusAndSimilarity'));
                              }
                            }}
                          >
                            状态/相似度
                          </Checkbox>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <Button
                            size="small"
                            onClick={() => {
                              setTempVisibleColumns(visibleColumns);
                              setColumnDropdownVisible(false);
                            }}
                            block
                          >
                            取消
                          </Button>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                              setVisibleColumns(tempVisibleColumns);
                              setColumnDropdownVisible(false);
                              message.success('已更新显示列');
                            }}
                            block
                          >
                            确定
                          </Button>
                        </div>
                      </div>
                    )}
                    trigger={['click']}
                  >
                    <Button icon={<Settings size={16} />} size="small">
                      显示列
                    </Button>
                  </Dropdown>
                  <Button
                    icon={<Download size={16} />}
                    onClick={exportResults}
                    size="small"
                  >
                    导出CSV
                  </Button>
                </Space>
              </div>
            }
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">
                <Table
                  columns={columns}
                  dataSource={results}
                  rowKey={(record, index) => `${record.inputName}-${index}`}
                  scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: results.length,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                    },
                    onShowSizeChange: (current, size) => {
                      setCurrentPage(1);
                      setPageSize(size);
                    },
                  }}
                />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center" bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="text-center text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">请在左侧输入商品名称并点击"开始匹配"</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

