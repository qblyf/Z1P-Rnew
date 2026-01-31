'use client';

import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Space, Table, Tag } from 'antd';

interface BrandData {
  name: string;
  color: string;
}

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

interface ResultTableProps {
  results: UIMatchResult[];
  brandList: BrandData[];
  visibleColumns: string[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, size: number) => void;
}

export function ResultTable({
  results,
  brandList,
  visibleColumns,
  currentPage,
  pageSize,
  onPageChange,
}: ResultTableProps) {
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
      render: (_: unknown, record: UIMatchResult) => {
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
      render: (text: string | null, record: UIMatchResult) => {
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
      render: (_: unknown, record: UIMatchResult) => {
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

  return (
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
          onPageChange(page, size);
        },
        onShowSizeChange: (current, size) => {
          onPageChange(1, size);
        },
      }}
    />
  );
}
