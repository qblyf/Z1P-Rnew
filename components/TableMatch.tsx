'use client';

import { useState } from 'react';
import { Card, Button, Table, Tag, message, Spin, Select, Empty, Progress } from 'antd';
import { Upload, Play, Download, AlertCircle } from 'lucide-react';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import * as XLSX from 'xlsx';
import { SimpleMatcher, type SPUData, type SKUData } from '../utils/smartMatcher';

/**
 * 表格数据接口
 */
interface TableData {
  headers: string[];
  rows: string[][];
}

/**
 * 匹配结果接口
 */
interface MatchResult {
  originalName: string;
  status: 'matched' | 'spu-matched' | 'unmatched';
  brand?: string;
  spu?: string;
  sku?: string;
  version?: string;
  capacity?: string;
  color?: string;
  gtin?: string;
  similarity: number;
  // 原表格的所有列数据
  originalRow: string[];
}

/**
 * TableMatch 组件
 * 用于批量匹配商品信息
 */
export function TableMatchComponent() {
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);
  const [colorList, setColorList] = useState<string[]>([]);
  
  // 进度相关状态
  const [matchProgress, setMatchProgress] = useState(0);
  const [currentMatching, setCurrentMatching] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);
  
  const matcher = new SimpleMatcher();

  /**
   * 处理文件上传
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // 处理 Excel 文件
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // 读取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为 JSON 数组
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          
          if (jsonData.length === 0) {
            message.error('文件为空');
            return;
          }

          const headers = jsonData[0].map(h => String(h || ''));
          const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

          setTableData({ headers, rows: rows.map(row => row.map(cell => String(cell || ''))) });
          setSelectedColumn(null);
          setMatchResults([]);
          message.success(`文件上传成功，共 ${rows.length} 行数据`);
        } catch (error) {
          message.error('Excel 文件解析失败');
          console.error(error);
        }
      };
      reader.readAsBinaryString(file);
      return;
    }

    // 处理 CSV/TXT 文件
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          message.error('文件为空');
          return;
        }

        // 自动识别分隔符
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        
        const headers = lines[0].split(delimiter);
        const rows = lines.slice(1).map(line => line.split(delimiter));

        setTableData({ headers, rows });
        setSelectedColumn(null);
        setMatchResults([]);
        message.success(`文件上传成功，共 ${rows.length} 行数据`);
      } catch (error) {
        message.error('文件解析失败');
        console.error(error);
      }
    };

    reader.readAsText(file);
  };

  /**
   * 开始匹配
   */
  const handleMatch = async () => {
    if (!tableData || selectedColumn === null) {
      message.warning('请先上传文件并选择商品列');
      return;
    }

    setMatching(true);
    setMatchResults([]);
    setMatchProgress(0);
    setCurrentMatching('');
    setTotalCount(tableData.rows.length);

    try {
      // 获取 SPU 列表
      const spuList = await getSPUListNew(
        {
          states: [SPUState.在用],
          limit: 10000,
          offset: 0,
          orderBy: [{ key: 'p."id"', sort: 'DESC' }],
        },
        ['id', 'name', 'brand', 'skuIDs']
      );
      
      // 提取颜色列表
      const colorMap = new Map<string, Set<number>>();
      for (const spu of spuList) {
        const { id, skuIDs } = spu;
        if (!skuIDs || skuIDs.length === 0) continue;
        
        for (const skuInfo of skuIDs) {
          if ('color' in skuInfo && skuInfo.color) {
            const color = skuInfo.color;
            if (!colorMap.has(color)) {
              colorMap.set(color, new Set());
            }
            colorMap.get(color)!.add(id);
          }
        }
      }
      
      const colors = Array.from(colorMap.keys()).sort((a, b) => b.length - a.length);
      setColorList(colors);
      matcher.setColorList(colors);

      const results: MatchResult[] = [];

      // 遍历每一行进行匹配
      for (let i = 0; i < tableData.rows.length; i++) {
        const row = tableData.rows[i];
        const productName = row[selectedColumn]?.trim();
        
        // 更新进度
        setMatchProgress(Math.round(((i + 1) / tableData.rows.length) * 100));
        setCurrentMatching(productName || '(空)');
        
        if (!productName) {
          results.push({
            originalName: '',
            status: 'unmatched',
            similarity: 0,
            originalRow: row,
          });
          continue;
        }
        
        // 清理和预处理输入
        let trimmedLine = matcher.cleanDemoMarkers(productName);
        trimmedLine = matcher.preprocessInputAdvanced(trimmedLine);
        
        // 提取版本信息
        const inputVersion = matcher.extractVersion(trimmedLine);

        // 第一阶段：SPU 匹配
        const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
          trimmedLine,
          spuList,
          0.5
        );

        if (!matchedSPU) {
          results.push({
            originalName: productName,
            status: 'unmatched',
            similarity: 0,
            originalRow: row,
          });
          continue;
        }

        // 第二阶段：获取 SKU 列表
        try {
          const spuInfo = await getSPUInfo(matchedSPU.id);
          const skuIDs = (spuInfo as any).skuIDs || [];
          
          if (skuIDs.length === 0) {
            results.push({
              originalName: productName,
              status: 'spu-matched',
              brand: matcher.extractBrand(productName) || undefined,
              spu: matchedSPU.name,
              similarity: spuSimilarity * 100,
              originalRow: row,
            });
            continue;
          }

          // 获取 SKU 详细信息
          const skuDetails = await getSKUsInfo(skuIDs.map((s: any) => s.skuID));
          const skuData: SKUData[] = skuDetails
            .filter((sku: any) => !('errInfo' in sku) && sku.state === SKUState.在用)
            .map((sku: any) => ({
              id: sku.id,
              name: sku.name,
              spuID: matchedSPU.id,
              spuName: matchedSPU.name,
              brand: matchedSPU.brand,
              version: undefined,
              memory: matcher.extractCapacity(sku.name) || undefined,
              color: matcher.extractColorAdvanced(sku.name) || undefined,
              gtins: sku.gtins || [],
            }));

          if (skuData.length === 0) {
            results.push({
              originalName: productName,
              status: 'unmatched',
              similarity: 0,
              originalRow: row,
            });
            continue;
          }

          // 第三阶段：SKU 匹配
          const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKU(
            trimmedLine,
            skuData,
            { inputVersion }
          );

          if (matchedSKU) {
            const finalSimilarity = spuSimilarity * 0.5 + skuSimilarity * 0.5;
            
            results.push({
              originalName: productName,
              status: 'matched',
              brand: matcher.extractBrand(productName) || undefined,
              spu: matchedSPU.name,
              sku: matchedSKU.name,
              capacity: matchedSKU.memory,
              color: matchedSKU.color,
              gtin: matchedSKU.gtins?.[0],
              similarity: finalSimilarity * 100,
              originalRow: row,
            });
          } else {
            results.push({
              originalName: productName,
              status: 'spu-matched',
              brand: matcher.extractBrand(productName) || undefined,
              spu: matchedSPU.name,
              similarity: spuSimilarity * 100,
              originalRow: row,
            });
          }
        } catch (error) {
          console.error('SKU 匹配失败:', error);
          results.push({
            originalName: productName,
            status: 'spu-matched',
            brand: matcher.extractBrand(productName) || undefined,
            spu: matchedSPU.name,
            similarity: spuSimilarity * 100,
            originalRow: row,
          });
        }
        
        // 实时更新结果（每10条更新一次，避免频繁渲染）
        if ((i + 1) % 10 === 0 || i === tableData.rows.length - 1) {
          setMatchResults([...results]);
        }
      }

      setMatchResults(results);
      setMatchProgress(100);
      setCurrentMatching('');
      message.success(`匹配完成！共 ${results.length} 条记录`);
    } catch (error) {
      message.error('匹配失败');
      console.error(error);
    } finally {
      setMatching(false);
    }
  };

  /**
   * 导出结果
   */
  const handleExport = () => {
    if (matchResults.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    // 生成 CSV 内容 - 包含原表格的所有列
    const matchHeaders = ['匹配状态', '品牌', 'SPU', 'SKU', '版本', '容量', '颜色', '69码', '相似度'];
    const headers = [...(tableData?.headers || []), ...matchHeaders];
    
    const rows = matchResults.map(result => {
      const matchData = [
        result.status === 'matched' ? '完全匹配' : result.status === 'spu-matched' ? 'SPU匹配' : '未匹配',
        result.brand || '-',
        result.spu || '-',
        result.sku || '-',
        result.version || '-',
        result.capacity || '-',
        result.color || '-',
        result.gtin || '-',
        `${result.similarity.toFixed(1)}%`,
      ];
      return [...result.originalRow, ...matchData];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `表格匹配结果_${new Date().getTime()}.csv`;
    link.click();

    message.success('导出成功');
  };

  // 统计信息
  const stats = {
    total: matchResults.length,
    matched: matchResults.filter(r => r.status === 'matched').length,
    spuMatched: matchResults.filter(r => r.status === 'spu-matched').length,
    unmatched: matchResults.filter(r => r.status === 'unmatched').length,
  };

  // 表格列定义 - 动态生成，包含原表格的所有列
  const columns = [
    // 原表格的列
    ...(tableData?.headers.map((header, index) => ({
      title: header,
      dataIndex: `col_${index}`,
      key: `col_${index}`,
      width: 120,
      render: (_: any, record: any) => record.originalRow[index] || '-',
    })) || []),
    // 匹配结果列
    {
      title: '匹配状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      fixed: 'right' as const,
      render: (status: string) => {
        const colorMap = {
          matched: 'success',
          'spu-matched': 'warning',
          unmatched: 'error',
        };
        const textMap = {
          matched: '完全匹配',
          'spu-matched': 'SPU匹配',
          unmatched: '未匹配',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{textMap[status as keyof typeof textMap]}</Tag>;
      },
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
      fixed: 'right' as const,
      render: (text: string) => text || '-',
    },
    {
      title: 'SPU',
      dataIndex: 'spu',
      key: 'spu',
      width: 150,
      fixed: 'right' as const,
      render: (text: string) => text || '-',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 150,
      fixed: 'right' as const,
      render: (text: string) => text || '-',
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      fixed: 'right' as const,
      render: (text: string) => text || '-',
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      fixed: 'right' as const,
      render: (text: string) => text || '-',
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      width: 100,
      fixed: 'right' as const,
      render: (value: number) => `${value.toFixed(1)}%`,
    },
  ];

  return (
    <Card title="表格匹配" className="w-full">
      <div className="space-y-4">
        {/* 文件上传区域 */}
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <Button icon={<Upload size={16} />} onClick={() => document.getElementById('file-upload')?.click()}>
            选择文件
          </Button>
          
          {tableData && (
            <span className="text-sm text-gray-600">
              已上传：{tableData.rows.length} 行数据
            </span>
          )}
          
          <span className="text-xs text-gray-500">
            支持格式：CSV、TXT、Excel (xlsx/xls)
          </span>
        </div>

        {/* 列选择 */}
        {tableData && (
          <div className="flex items-center gap-4">
            <span className="text-sm">选择商品列：</span>
            <Select
              style={{ width: 200 }}
              placeholder="请选择列"
              value={selectedColumn}
              onChange={setSelectedColumn}
              options={tableData.headers.map((header, index) => ({
                label: `${header} (列${index + 1})`,
                value: index,
              }))}
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-4">
          <Button
            type="primary"
            icon={<Play size={16} />}
            onClick={handleMatch}
            loading={matching}
            disabled={!tableData || selectedColumn === null}
          >
            开始匹配
          </Button>
          
          <Button
            icon={<Download size={16} />}
            onClick={handleExport}
            disabled={matchResults.length === 0}
          >
            导出结果
          </Button>
        </div>

        {/* 统计信息 */}
        {matchResults.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-600">总计</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
                <div className="text-sm text-gray-600">完全匹配</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.spuMatched}</div>
                <div className="text-sm text-gray-600">SPU匹配</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.unmatched}</div>
                <div className="text-sm text-gray-600">未匹配</div>
              </div>
            </div>
          </div>
        )}

        {/* 结果表格 */}
        {matchResults.length > 0 ? (
          <Table
            columns={columns}
            dataSource={matchResults.map((result, index) => ({
              ...result,
              key: index,
            }))}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1200 + (tableData?.headers.length || 0) * 120 }}
          />
        ) : (
          !matching && (
            <Empty description="暂无匹配结果" />
          )
        )}

        {/* 加载状态 */}
        {matching && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">匹配进度</span>
                <span className="text-sm font-medium text-blue-900">{matchProgress}%</span>
              </div>
              
              <Progress 
                percent={matchProgress} 
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">总数：</span>
                  <span className="font-medium text-gray-900">{totalCount} 条</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">已完成：</span>
                  <span className="font-medium text-gray-900">{matchResults.length} 条</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">剩余：</span>
                  <span className="font-medium text-gray-900">{totalCount - matchResults.length} 条</span>
                </div>
              </div>
              
              {currentMatching && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">正在匹配：</div>
                  <div className="text-sm font-medium text-blue-900 bg-white px-3 py-2 rounded border border-blue-100">
                    {currentMatching}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
