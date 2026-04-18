'use client';

import { Download, Search } from 'lucide-react';
import { Button, Card, Space, Tag, Progress } from 'antd';
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
  results: UIMatchResult[];
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
  // 显示匹配进度状态
  if (matchProgress && matchProgress.total > 0) {
    const percent = Math.round((matchProgress.current / matchProgress.total) * 100);
    const matchedCount = matchProgress.results.filter(r => r.status === 'matched').length;
    const unmatchedCount = matchProgress.results.filter(r => r.status === 'unmatched').length;

    return (
      <Card
        className="flex-1 flex flex-col"
        styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }}
        title={
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <SyncOutlined className="animate-spin" />
              <span>匹配中...</span>
              <div className="flex gap-2">
                <Tag color="blue">
                  总计：{matchProgress.total} 条
                </Tag>
                <Tag color="success">
                  已匹配：{matchedCount} 条
                </Tag>
                <Tag color="error">
                  未匹配：{unmatchedCount} 条
                </Tag>
              </div>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 进度条 */}
          <div className="mb-4 bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">
                正在匹配：{matchProgress.currentItem}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {matchProgress.current} / {matchProgress.total}
              </span>
            </div>
            <Progress
              percent={percent}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>

          {/* 实时结果表格 */}
          <div className="flex-1 overflow-auto">
            <ResultTable
              results={matchProgress.results}
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
