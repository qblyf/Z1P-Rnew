'use client';

import { Spin, Progress, Card } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { MatchProvider, useMatch } from './MatchContext';
import { StatsCards } from './StatsCards';
import { InputArea } from './InputArea';
import { ResultTable } from './ResultTable';
import { useState, useEffect, useMemo } from 'react';

function SmartMatchContent() {
  const { state, initialize, isInitialized, cancelMatch } = useMatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 初始化匹配器
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // 计算当前处理进度
  const processedCount = state.matched + state.spuMatched + state.unmatched;
  const progressPercent = state.total > 0 ? Math.round((processedCount / state.total) * 100) : 0;

  // 获取当前正在处理的项目（如果有）
  const currentItem = useMemo(() => {
    if (state.status !== 'matching' || state.results.length === 0) return null;
    const idx = Math.min(state.currentIndex, state.results.length - 1);
    return state.results[idx]?.inputName || null;
  }, [state.status, state.currentIndex, state.results]);

  // 服务端渲染或未挂载时，显示加载状态
  if (!mounted || state.status === 'idle' || state.status === 'initializing') {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} tip="加载中..." />
      </div>
    );
  }

  return (
    <>
      {/* 全局蒙版 - 匹配中时阻止用户操作 */}
      {state.status === 'matching' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-96 shadow-2xl">
            <div className="text-center">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} className="mb-6" />

              <h3 className="text-lg font-semibold text-gray-800 mb-2">正在匹配商品</h3>

              {/* 进度条 */}
              <Progress
                percent={progressPercent}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                className="mb-4"
              />

              {/* 进度文字 */}
              <p className="text-sm text-gray-500 mb-4">
                已处理 {processedCount} / {state.total} 条
              </p>

              {/* 当前处理项 */}
              {currentItem && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-1">正在处理</p>
                  <p className="text-sm text-gray-700 truncate">{currentItem}</p>
                </div>
              )}

              {/* 实时统计 */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-green-600 font-semibold">{state.matched}</p>
                  <p className="text-xs text-green-500 flex items-center justify-center gap-1">
                    <CheckCircleOutlined /> 已匹配
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2">
                  <p className="text-orange-600 font-semibold">{state.spuMatched}</p>
                  <p className="text-xs text-orange-500 flex items-center justify-center gap-1">
                    <ExclamationCircleOutlined /> SPU
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-red-600 font-semibold">{state.unmatched}</p>
                  <p className="text-xs text-red-500 flex items-center justify-center gap-1">
                    <CloseCircleOutlined /> 未匹配
                  </p>
                </div>
              </div>

              {/* 取消按钮 */}
              <button
                onClick={cancelMatch}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                取消匹配
              </button>
            </div>
          </Card>
        </div>
      )}
      <div className="space-y-4">
        <StatsCards />
        <InputArea />
        {state.results.length > 0 && <ResultTable />}
      </div>
    </>
  );
}

export function SmartMatchV2() {
  return (
    <MatchProvider>
      <SmartMatchContent />
    </MatchProvider>
  );
}
