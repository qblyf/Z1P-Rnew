'use client';

import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { MatchProvider, useMatch } from './MatchContext';
import { StatsCards } from './StatsCards';
import { InputArea } from './InputArea';
import { ResultTable } from './ResultTable';

function SmartMatchContent() {
  const { state } = useMatch();

  if (state.status === 'idle' || state.status === 'initializing') {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="初始化中..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsCards />
      <InputArea />
      {state.results.length > 0 && <ResultTable />}
    </div>
  );
}

export function SmartMatchV2() {
  return (
    <MatchProvider>
      <SmartMatchContent />
    </MatchProvider>
  );
}
