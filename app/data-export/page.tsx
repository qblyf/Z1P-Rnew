'use client';

import { Button, Tabs, TabsProps, Card, Progress, Tag } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { SKU, SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSKUList } from '@zsqk/z1-sdk/es/z1p/product';
import { GetSKUListOrderByKey } from '@zsqk/z1-sdk/es/z1p/product-types';
import { OrderBySort } from '@zsqk/z1-sdk/es/types/basetypes';
import { postAwait } from '../../error';
import Head from 'next/head';
import { usePageTab } from '../../datahooks/usePageTab';
import PageWrap from '../../components/PageWrap';
import {
  FileText,
  Download,
  CheckCircle,
  Database,
} from 'lucide-react';
import './data-export.css';

interface ExportTask {
  status: 'idle' | 'loading' | 'done' | 'error';
  total: number;
  fetched: number;
  data: Pick<SKU, 'name' | 'gtins' | 'id'>[];
  error?: string;
}

function ExportCard({
  icon,
  title,
  description,
  columns,
  format,
  encoding,
  onExport,
  task,
  downloadUrl,
  downloadName,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  columns: string[];
  format: string;
  encoding: string;
  onExport: () => void;
  task: ExportTask;
  downloadUrl?: string;
  downloadName?: string;
}) {
  const isLoading = task.status === 'loading';
  const isDone = task.status === 'done';

  const progress = task.total > 0 ? Math.round((task.fetched / task.total) * 100) : 0;

  return (
    <Card className="export-card" bordered={false}>
      <div className="export-card-header">
        <div className="export-card-icon">{icon}</div>
        <div className="export-card-title-wrap">
          <h3 className="export-card-title">{title}</h3>
          <p className="export-card-desc">{description}</p>
        </div>
      </div>

      <div className="export-card-info">
        <div className="export-info-row">
          <span className="export-info-label">数据列</span>
          <span className="export-info-value">{columns.join(', ')}</span>
        </div>
        <div className="export-info-row">
          <span className="export-info-label">文件格式</span>
          <Tag className="export-info-tag" color="blue">{format}</Tag>
        </div>
        <div className="export-info-row">
          <span className="export-info-label">编码</span>
          <Tag className="export-info-tag">{encoding}</Tag>
        </div>
      </div>

      {isLoading && (
        <div className="export-progress">
          <Progress percent={progress} status="active" size="small" />
          <span className="export-progress-text">
            已获取 {task.fetched} / {task.total > 0 ? task.total : '?'} 条
          </span>
        </div>
      )}

      {isDone && (
        <div className="export-done">
          <CheckCircle size={16} className="export-done-icon" />
          <span>已就绪，共 {task.data.length} 条数据</span>
        </div>
      )}

      <div className="export-card-actions">
        {isDone && downloadUrl ? (
          <a href={downloadUrl} download={downloadName} className="export-download-btn">
            <Download size={16} />
            下载 CSV
          </a>
        ) : (
          <Button
            type="primary"
            icon={<Download size={16} />}
            onClick={onExport}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '导出中...' : '开始导出'}
          </Button>
        )}
      </div>
    </Card>
  );
}

function SKUDataExport() {
  const [task, setTask] = useState<ExportTask>({
    status: 'idle',
    total: 0,
    fetched: 0,
    data: [],
  });

  const dataURL = useMemo(() => {
    if (task.data.length === 0) return '';
    const csvContent = task.data.reduce((pre, v, i) => {
      const name = (v.name || '').replace(/,/g, '-');
      const gtins = v.gtins?.join(',') || '';
      const line = i === 0
        ? `SKU 名称,SKU GTINs\n${name},${gtins}`
        : `${pre}\n${name},${gtins}`;
      return line;
    }, '');
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  }, [task.data]);

  const handleExport = () => {
    setTask((prev) => ({ ...prev, status: 'loading', fetched: 0, total: 0, data: [], error: undefined }));

    postAwait(async () => {
      let done = false;
      let offset = 0;
      const limit = 1000;
      const allData: Pick<SKU, 'name' | 'gtins' | 'id'>[] = [];

      // 先取总数
      const firstBatch = await getSKUList(
        {
          states: [SKUState.在用],
          limit: 1,
          offset: 0,
          orderBy: [{ key: GetSKUListOrderByKey.skuID, sort: OrderBySort.升序 }],
        },
        ['id', 'name', 'gtins']
      );

      const totalEstimate = 10000; // 估算总量用于进度显示
      setTask((prev) => ({ ...prev, total: totalEstimate, fetched: 0 }));

      while (!done) {
        const res = await getSKUList(
          {
            states: [SKUState.在用],
            limit,
            offset,
            orderBy: [{ key: GetSKUListOrderByKey.skuID, sort: OrderBySort.升序 }],
          },
          ['id', 'name', 'gtins']
        );
        allData.push(...res);
        setTask((prev) => ({ ...prev, fetched: prev.fetched + res.length }));
        if (res.length === limit) {
          offset += limit;
        } else {
          done = true;
        }
      }

      setTask({
        status: 'done',
        total: allData.length,
        fetched: allData.length,
        data: allData,
      });
    })();
  };

  return (
    <ExportCard
      icon={<Database size={28} />}
      title="SKU 数据导出"
      description="导出所有在用 SKU 的名称和 GTIN 编码"
      columns={['SKU 名称', 'SKU GTINs']}
      format="CSV"
      encoding="UTF-8"
      onExport={handleExport}
      task={task}
      downloadUrl={dataURL}
      downloadName={`sku-data-${new Date().toISOString().slice(0, 10)}.csv`}
    />
  );
}

export default function () {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}

function ClientPage() {
  usePageTab('数据导出');

  const items: TabsProps['items'] = [
    {
      label: (
        <span className="export-tab-label">
          <Database size={14} />
          SKU 数据
        </span>
      ),
      key: 'sku',
      children: <SKUDataExport />,
    },
  ];

  return (
    <PageWrap ppKey="product-manage">
      <Head>
        <title>数据导出 - Z1 商品平台</title>
      </Head>

      {/* 英雄区 */}
      <div className="export-hero">
        <div className="export-hero-inner">
          <div className="export-hero-icon">
            <FileText size={40} />
          </div>
          <div className="export-hero-text">
            <h1 className="export-hero-title">数据导出</h1>
            <p className="export-hero-subtitle">将基础数据导出为 CSV 表格，方便离线分析与管理</p>
          </div>
        </div>
      </div>

      {/* 导出卡片区域 */}
      <div className="export-content">
        <Tabs items={items} />
      </div>
    </PageWrap>
  );
}
