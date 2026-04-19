'use client';

import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { MatchProvider, useMatch } from './MatchContext';
import { StatsCards } from './StatsCards';
import { InputArea } from './InputArea';
import { ResultTable } from './ResultTable';
import { useState, useEffect } from 'react';

function SmartMatchContent() {
  const { state, initialize, isInitialized } = useMatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 初始化匹配器
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // 服务端渲染或未挂载时，显示加载状态
  if (!mounted || state.status === 'idle' || state.status === 'initializing') {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="加载中..." />
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
