'use client';

import { Download, Search } from 'lucide-react';
import { Button, Card, Space, Tag } from 'antd';
import type { MatchResult } from '../../utils/smartMatcher';
import { ResultTable } from './ResultTable';
import { ColumnSelector } from './ColumnSelector';

interface BrandData {
  name: string;
  color: string;
}

interface ResultPanelProps {
  results: MatchResult[];
  brandList: BrandData[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  onExport: () => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, size: number) => void;
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
}: ResultPanelProps) {
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
