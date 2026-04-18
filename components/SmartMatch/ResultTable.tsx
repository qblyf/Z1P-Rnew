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
  // 定义所有可用的列 - 针对SKU直接匹配优化
  const allColumns = [
    {
      title: '输入商品',
      dataIndex: 'inputName',
      key: 'inputName',
      width: 200,
      fixed: 'left' as const,
      render: (text: string) => (
        <span className="text-sm" title={text}>
          {text.length > 25 ? text.substring(0, 25) + '...' : text}
        </span>
      ),
    },
    {
      title: '匹配SKU',
      dataIndex: 'matchedSKU',
      key: 'matchedSKU',
      width: 300,
      render: (text: string | null, record: UIMatchResult) => {
        if (record.status === 'spu-matched') {
          return <span className="text-gray-400">正在匹配...</span>;
        }
        if (!text) return '-';
        return (
          <span className="text-sm font-medium text-green-700" title={text}>
            {text.length > 35 ? text.substring(0, 35) + '...' : text}
          </span>
        );
      },
    },
    {
      title: '品牌',
      dataIndex: 'matchedBrand',
      key: 'matchedBrand',
      width: 100,
      render: (text: string | null) => {
        if (!text) return '-';
        const brand = brandList.find(b => b.name === text);
        return brand ? (
          <Tag color={brand.color} className="font-medium">
            {brand.name}
          </Tag>
        ) : (
          <Tag color="orange">{text}</Tag>
        );
      },
    },
    {
      title: '规格',
      key: 'specs',
      width: 220,
      render: (_: unknown, record: UIMatchResult) => {
        if (record.status === 'spu-matched') {
          return <span className="text-gray-400">正在匹配...</span>;
        }
        const specs = [];
        if (record.matchedVersion) specs.push(<Tag key="version" color="blue">{record.matchedVersion}</Tag>);
        if (record.matchedMemory) specs.push(<Tag key="memory" color="green">{record.matchedMemory}</Tag>);
        if (record.matchedColor) specs.push(<Tag key="color" color="purple">{record.matchedColor}</Tag>);
        return specs.length > 0 ? <Space size={4} wrap>{specs}</Space> : '-';
      },
    },
    {
      title: '69码',
      dataIndex: 'matchedGtins',
      key: 'matchedGtins',
      width: 150,
      render: (gtins: string[]) => {
        if (!gtins || gtins.length === 0) return '-';
        return (
          <div className="flex flex-col gap-0.5">
            {gtins.slice(0, 2).map((gtin, idx) => (
              <span key={idx} className="text-xs font-mono text-slate-600">{gtin}</span>
            ))}
            {gtins.length > 2 && (
              <span className="text-xs text-slate-400">+{gtins.length - 2} 更多</span>
            )}
          </div>
        );
      },
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      width: 90,
      render: (similarity: number, record: UIMatchResult) => {
        if (record.status !== 'matched') return '-';
        const percent = (similarity * 100).toFixed(0);
        const color = similarity >= 0.8 ? 'success' : similarity >= 0.6 ? 'warning' : 'error';
        return <Tag color={color}>{percent}%</Tag>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: UIMatchResult) => {
        if (record.status === 'matched') {
          return (
            <Tag icon={<CheckCircle size={12} />} color="success" className="font-medium">
              已匹配
            </Tag>
          );
        } else if (record.status === 'spu-matched') {
          return (
            <Tag icon={<Loader2 size={12} className="animate-spin" />} color="processing">
              SPU匹配
            </Tag>
          );
        } else {
          return (
            <Tag icon={<XCircle size={12} />} color="error" className="font-medium">
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
