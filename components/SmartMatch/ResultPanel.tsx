'use client';

import { Download, Search } from 'lucide-react';
import { Button, Card, Space, Tag, Progress, Drawer } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { ResultTable } from './ResultTable';
import { ColumnSelector } from './ColumnSelector';

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

interface MatchProgress {
  current: number;
  total: number;
  currentItem: string;
  logs: string[];
  results: UIMatchResult[] | null;
}

interface ResultPanelProps {
  results: UIMatchResult[];
  brandList: BrandData[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  onExport: () => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, size: number) => void;
  matchProgress?: MatchProgress | null;
}

export function ResultPanel({
  results,
  brandList,
  visibleColumns,
  onVisibleColumnsChange,
  onExport,
  currentPage,
  pageSize,
  onPageChange,
  matchProgress,
}: ResultPanelProps) {
  // 匹配中状态 - 用侧边抽屉显示
  if (matchProgress) {
    return (
      <>
        {/* 空状态占位 */}
        <Card
          className="flex-1 flex items-center justify-center"
          styles={{ body: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } }}
        >
          <div className="text-center text-slate-400">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">匹配进度在侧边栏显示</p>
          </div>
        </Card>
        {/* 侧边抽屉显示进度 */}
        <MatchingProgressDrawer total={matchProgress.total} logs={matchProgress.logs} />
      </>
    );
  }

  if (results.length === 0) {
    return (
      <Card
        className="flex-1 flex items-center justify-center"
        styles={{ body: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } }}
      >
        <div className="text-center text-slate-400">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">请在左侧输入商品名称并点击"开始匹配"</p>
        </div>
      </Card>
    );
  }

  const matchedCount = results.filter(r => r.status === 'matched').length;
  const unmatchedCount = results.filter(r => r.status === 'unmatched').length;

  return (
    <Card
      className="flex-1 flex flex-col"
      styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }}
      title={
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <span>匹配结果</span>
            <div className="flex gap-2">
              <Tag color="blue">
                总计：{results.length} 条
              </Tag>
              <Tag color="success">
                已匹配：{matchedCount} 条
              </Tag>
              <Tag color="error">
                未匹配：{unmatchedCount} 条
              </Tag>
            </div>
          </div>
          <Space>
            <ColumnSelector
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={onVisibleColumnsChange}
            />
            <Button
              icon={<Download size={16} />}
              onClick={onExport}
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
          <ResultTable
            results={results}
            brandList={brandList}
            visibleColumns={visibleColumns}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </Card>
  );
}

// 匹配进度侧边抽屉组件
function MatchingProgressDrawer({ total, logs }: { total: number; logs: string[] }) {
  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <SyncOutlined className="animate-spin text-blue-500" />
          <span>正在匹配中...</span>
        </div>
      }
      placement="right"
      width={400}
      open={true}
      closable={false}
      styles={{ body: { padding: '16px' } }}
    >
      <div className="flex flex-col h-full">
        <Progress
          percent={Math.round((logs.length / total) * 100)}
          status="active"
          format={() => `${logs.length} / ${total}`}
          className="mb-4"
        />

        {/* 日志显示区域 */}
        <div className="flex-1 bg-slate-900 rounded-lg p-3 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="font-mono text-xs text-green-400 space-y-1">
            {logs.slice(-30).map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
