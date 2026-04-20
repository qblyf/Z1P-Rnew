'use client';

import { useState, useMemo } from 'react';
import { Table, Tag, Card, Space, Select, Typography, Button, notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ExclamationCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useMatch, MatchResult } from './MatchContext';

const { Text } = Typography;

export function ResultTable() {
  const { state } = useMatch();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // 根据状态筛选
  const filteredResults = statusFilter
    ? state.results.filter((r) => r.status === statusFilter)
    : state.results;

  // 导出 Excel
  const handleExport = async () => {
    if (state.results.length === 0) {
      notification.warning({ message: '没有可导出的数据' });
      return;
    }

    const xlsx = await import('xlsx');

    // 准备导出数据
    const exportData = filteredResults.map((item, index) => ({
      '序号': index + 1,
      '原始名称': item.inputName,
      '匹配SKU': item.matchedSKU || '-',
      '品牌': item.matchedBrand || '-',
      '版本': item.matchedVersion || '-',
      '内存': item.matchedMemory || '-',
      '颜色': item.matchedColor || '-',
      '相似度': item.similarity ? `${(item.similarity * 100).toFixed(0)}%` : '-',
      '状态': item.status === 'matched' ? '已匹配' : item.status === 'spu-matched' ? 'SPU匹配' : item.status === 'unmatched' ? '未匹配' : '匹配中',
    }));

    // 创建工作簿
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 30 },  // 原始名称
      { wch: 30 },  // 匹配SKU
      { wch: 10 },  // 品牌
      { wch: 10 },  // 版本
      { wch: 10 },  // 内存
      { wch: 10 },  // 颜色
      { wch: 10 },  // 相似度
      { wch: 10 },  // 状态
    ];

    xlsx.utils.book_append_sheet(wb, ws, '匹配结果');

    // 下载文件
    const fileName = `匹配结果_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    xlsx.writeFile(wb, fileName);
    notification.success({ message: `已导出 ${exportData.length} 条数据` });
  };

  // 状态标签
  const getStatusTag = (status: MatchResult['status']) => {
    switch (status) {
      case 'matched':
        return <Tag color="green" icon={<CheckCircleOutlined />}>已匹配</Tag>;
      case 'spu-matched':
        return <Tag color="orange" icon={<ExclamationCircleOutlined />}>SPU匹配</Tag>;
      case 'unmatched':
        return <Tag color="red" icon={<CloseCircleOutlined />}>未匹配</Tag>;
      case 'pending':
        return <Tag color="default" icon={<LoadingOutlined />}>匹配中</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const columns = useMemo<ColumnsType<MatchResult>>(() => [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: '原始名称',
      dataIndex: 'inputName',
      key: 'inputName',
      width: 250,
      ellipsis: true,
    },
    {
      title: '匹配结果',
      key: 'matchedResult',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        if (record.status === 'pending') {
          return <Text type="secondary">匹配中...</Text>;
        }
        if (record.matchedSKU) {
          return (
            <div>
              <div className="font-medium">{record.matchedSKU}</div>
              {record.matchedBrand && <Text type="secondary" className="text-xs">{record.matchedBrand}</Text>}
            </div>
          );
        }
        if (record.matchedSPU) {
          return <Text type="secondary">{record.matchedSPU} (SPU)</Text>;
        }
        return '-';
      },
    },
    {
      title: '品牌',
      dataIndex: 'matchedBrand',
      key: 'matchedBrand',
      width: 100,
      ellipsis: true,
    },
    {
      title: '版本',
      dataIndex: 'matchedVersion',
      key: 'matchedVersion',
      width: 80,
    },
    {
      title: '内存',
      dataIndex: 'matchedMemory',
      key: 'matchedMemory',
      width: 80,
    },
    {
      title: '颜色',
      dataIndex: 'matchedColor',
      key: 'matchedColor',
      width: 80,
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      width: 80,
      render: (value: number) => {
        if (!value) return '-';
        return `${(value * 100).toFixed(0)}%`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MatchResult['status']) => getStatusTag(status),
    },
  ], []);

  return (
    <Card title="匹配结果">
      <Space className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <Text>筛选：</Text>
          <Select
            allowClear
            placeholder="全部"
            style={{ width: 120 }}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { label: '已匹配', value: 'matched' },
              { label: '未匹配', value: 'unmatched' },
            ]}
          />
          <Text type="secondary">
            共 {filteredResults.length} 条（总计 {state.results.length} 条）
          </Text>
        </Space>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExport}
          disabled={state.results.length === 0}
        >
          导出 Excel
        </Button>
      </Space>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={filteredResults}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1200 }}
        size="small"
      />
    </Card>
  );
}
