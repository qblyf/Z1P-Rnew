'use client';

import { useState } from 'react';
import { Card, Button, Table, Tag, message, Spin, Select, Empty } from 'antd';
import { Upload, Play, Download, AlertCircle } from 'lucide-react';
import { getSPUListNew, getSPUInfo, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

// 导入 SimpleMatcher 类（从 SmartMatch.tsx）
// 注意：这里需要将 SimpleMatcher 从 SmartMatch.tsx 中导出
// 或者在这里重新实现一个简化版本

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
}

/**
 * 简化的匹配器类
 */
class SimpleMatcher {
  /**
   * 提取品牌
   */
  extractBrand(str: string): string | null {
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus', 'redmi'];
    const lowerStr = str.toLowerCase();
    
    for (const brand of brands) {
      if (lowerStr.includes(brand)) {
        return brand;
      }
    }
    
    return null;
  }

  /**
   * 提取型号
   */
  extractModel(str: string): string | null {
    // 简化的型号提取
    const modelMatch = str.match(/[A-Z]\w+\s*\d+\w*/i);
    return modelMatch ? modelMatch[0] : null;
  }

  /**
   * 提取容量
   */
  extractCapacity(str: string): string | null {
    const capacityMatch = str.match(/(\d+)\s*\+\s*(\d+)/);
    if (capacityMatch) {
      return `${capacityMatch[1]}+${capacityMatch[2]}`;
    }
    return null;
  }

  /**
   * 提取颜色
   */
  extractColor(str: string): string | null {
    const colors = ['黑', '白', '蓝', '红', '绿', '紫', '金', '银', '灰', '粉'];
    
    for (const color of colors) {
      if (str.includes(color)) {
        // 尝试提取完整颜色名称
        const colorMatch = str.match(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`));
        if (colorMatch) {
          return colorMatch[0];
        }
      }
    }
    
    return null;
  }

  /**
   * 计算相似度
   */
  calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // 简单的相似度计算
    let matches = 0;
    const len = Math.min(s1.length, s2.length);
    
    for (let i = 0; i < len; i++) {
      if (s1[i] === s2[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(s1.length, s2.length);
  }

  /**
   * 查找最佳 SPU 匹配
   */
  findBestSPUMatch(
    input: string,
    spuList: any[],
    threshold: number = 0.5
  ): { spu: any | null; similarity: number } {
    let bestMatch: any | null = null;
    let bestSimilarity = 0;

    for (const spu of spuList) {
      const similarity = this.calculateSimilarity(input, spu.name || '');
      
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = spu;
      }
    }

    return { spu: bestMatch, similarity: bestSimilarity };
  }

  /**
   * 查找最佳 SKU 匹配
   */
  findBestSKUWithVersion(
    input: string,
    skuList: any[],
    inputVersion: any
  ): { sku: any | null; similarity: number } {
    let bestMatch: any | null = null;
    let bestSimilarity = 0;

    const inputCapacity = this.extractCapacity(input);
    const inputColor = this.extractColor(input);

    for (const sku of skuList) {
      let similarity = this.calculateSimilarity(input, sku.name || '');
      
      // 容量匹配加分
      if (inputCapacity && sku.capacity === inputCapacity) {
        similarity += 0.2;
      }
      
      // 颜色匹配加分
      if (inputColor && sku.color && sku.color.includes(inputColor)) {
        similarity += 0.2;
      }
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = sku;
      }
    }

    return { sku: bestMatch, similarity: bestSimilarity };
  }
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

  /**
   * 处理文件上传
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
        message.success('文件上传成功');
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

      const matcher = new SimpleMatcher();
      const results: MatchResult[] = [];

      // 遍历每一行进行匹配
      for (const row of tableData.rows) {
        const productName = row[selectedColumn]?.trim();
        
        if (!productName) {
          results.push({
            originalName: '',
            status: 'unmatched',
            similarity: 0,
          });
          continue;
        }

        // 第一阶段：SPU 匹配
        const { spu: matchedSPU, similarity: spuSimilarity } = matcher.findBestSPUMatch(
          productName,
          spuList,
          0.3
        );

        if (!matchedSPU) {
          results.push({
            originalName: productName,
            status: 'unmatched',
            similarity: 0,
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
            });
            continue;
          }

          // 获取 SKU 详细信息
          const skuDetails = await getSKUsInfo(skuIDs.map((s: any) => s.skuID));
          const skuData = skuDetails.map((sku: any) => ({
            id: sku.id,
            name: sku.name,
            capacity: sku.capacity,
            color: sku.color,
            gtin: sku.gtin,
          }));

          // 第三阶段：SKU 匹配
          const { sku: matchedSKU, similarity: skuSimilarity } = matcher.findBestSKUWithVersion(
            productName,
            skuData,
            null
          );

          if (matchedSKU) {
            results.push({
              originalName: productName,
              status: 'matched',
              brand: matcher.extractBrand(productName) || undefined,
              spu: matchedSPU.name,
              sku: matchedSKU.name,
              capacity: matchedSKU.capacity,
              color: matchedSKU.color,
              gtin: matchedSKU.gtin,
              similarity: skuSimilarity * 100,
            });
          } else {
            results.push({
              originalName: productName,
              status: 'spu-matched',
              brand: matcher.extractBrand(productName) || undefined,
              spu: matchedSPU.name,
              similarity: spuSimilarity * 100,
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
          });
        }
      }

      setMatchResults(results);
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

    // 生成 CSV 内容
    const headers = ['原商品名', '匹配状态', '品牌', 'SPU', 'SKU', '版本', '容量', '颜色', '69码', '相似度'];
    const rows = matchResults.map(result => [
      result.originalName,
      result.status === 'matched' ? '完全匹配' : result.status === 'spu-matched' ? 'SPU匹配' : '未匹配',
      result.brand || '-',
      result.spu || '-',
      result.sku || '-',
      result.version || '-',
      result.capacity || '-',
      result.color || '-',
      result.gtin || '-',
      `${result.similarity.toFixed(1)}%`,
    ]);

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

  // 表格列定义
  const columns = [
    {
      title: '原商品名',
      dataIndex: 'originalName',
      key: 'originalName',
      width: 200,
    },
    {
      title: '匹配状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
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
      render: (text: string) => text || '-',
    },
    {
      title: 'SPU',
      dataIndex: 'spu',
      key: 'spu',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      width: 100,
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
            accept=".csv,.txt"
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
            scroll={{ x: 1200 }}
          />
        ) : (
          !matching && (
            <Empty description="暂无匹配结果" />
          )
        )}

        {/* 加载状态 */}
        {matching && (
          <div className="text-center py-8">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">正在匹配中，请稍候...</p>
          </div>
        )}
      </div>
    </Card>
  );
}
