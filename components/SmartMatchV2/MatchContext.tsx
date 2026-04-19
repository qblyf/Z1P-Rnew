'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, useMemo, useState } from 'react';
import { message } from 'antd';
import { MatchingOrchestrator } from '../../utils/services/MatchingOrchestrator';
import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';

// 结果接口
export interface MatchResult {
  key: string;
  inputName: string;
  originalSkuName?: string;
  matchedSKU: string | null;
  matchedSPU: string | null;
  matchedBrand: string | null;
  matchedVersion: string | null;
  matchedMemory: string | null;
  matchedColor: string | null;
  matchedGtins: string[];
  similarity: number;
  status: 'matched' | 'spu-matched' | 'unmatched' | 'pending';
}

// 状态接口
interface MatchState {
  status: 'idle' | 'initializing' | 'ready' | 'matching' | 'completed' | 'error';
  total: number;
  matched: number;
  spuMatched: number;
  unmatched: number;
  results: MatchResult[];
  error: string | null;
}

// Action 类型
type MatchAction =
  | { type: 'SET_STATUS'; payload: MatchState['status'] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'ADD_RESULT'; payload: MatchResult }
  | { type: 'UPDATE_RESULT'; payload: { key: string; result: Partial<MatchResult> } }
  | { type: 'SET_STATS'; payload: { total: number; matched: number; spuMatched: number; unmatched: number } }
  | { type: 'RESET' };

// 初始状态
const initialState: MatchState = {
  status: 'idle',
  total: 0,
  matched: 0,
  spuMatched: 0,
  unmatched: 0,
  results: [],
  error: null,
};

// Reducer
function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'CLEAR_RESULTS':
      return { ...state, results: [] };
    case 'ADD_RESULT':
      return { ...state, results: [...state.results, action.payload] };
    case 'UPDATE_RESULT':
      return {
        ...state,
        results: state.results.map((r) =>
          r.key === action.payload.key ? { ...r, ...action.payload.result } : r
        ),
      };
    case 'SET_STATS':
      return {
        ...state,
        total: action.payload.total,
        matched: action.payload.matched,
        spuMatched: action.payload.spuMatched,
        unmatched: action.payload.unmatched,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context 接口
interface MatchContextValue {
  state: MatchState;
  orchestrator: MatchingOrchestrator | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  startMatch: (inputs: string[]) => void;
  cancelMatch: () => void;
  clearResults: () => void;
}

// 创建 Context
const MatchContext = createContext<MatchContextValue | null>(null);

// Provider 组件
export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(matchReducer, initialState);
  const orchestratorRef = useRef<MatchingOrchestrator | null>(null);
  const [orchestratorInitialized, setOrchestratorInitialized] = useState(false);
  const isCancelledRef = useRef(false);
  const batchCountRef = useRef(0);

  // 初始化匹配器
  const initialize = useCallback(async () => {
    if (orchestratorRef.current) return;

    dispatch({ type: 'SET_STATUS', payload: 'initializing' });

    try {
      // 加载品牌数据
      const brands = await getBrandBaseList();

      // 创建匹配器实例
      const orchestrator = new MatchingOrchestrator();
      await orchestrator.initialize(brands, []);

      orchestratorRef.current = orchestrator;
      setOrchestratorInitialized(true);
      dispatch({ type: 'SET_STATUS', payload: 'ready' });
    } catch (error) {
      console.error('初始化匹配器失败:', error);
      dispatch({ type: 'SET_ERROR', payload: '初始化失败，请刷新重试' });
    }
  }, []);

  // 开始匹配
  const startMatch = useCallback((inputs: string[]) => {
    if (!orchestratorRef.current) {
      message.error('匹配器未初始化');
      return;
    }

    isCancelledRef.current = false;
    batchCountRef.current = 0;
    dispatch({ type: 'SET_STATUS', payload: 'matching' });
    dispatch({ type: 'CLEAR_RESULTS' });
    dispatch({ type: 'SET_STATS', payload: { total: inputs.length, matched: 0, spuMatched: 0, unmatched: 0 } });

    // 初始化所有输入为 pending 状态
    inputs.forEach((input, index) => {
      dispatch({
        type: 'ADD_RESULT',
        payload: {
          key: `temp-${index}`,
          inputName: input,
          matchedSKU: null,
          matchedSPU: null,
          matchedBrand: null,
          matchedVersion: null,
          matchedMemory: null,
          matchedColor: null,
          matchedGtins: [],
          similarity: 0,
          status: 'pending',
        },
      });
    });

    // 开始异步匹配
    const orchestrator = orchestratorRef.current;

    (async () => {
      let matched = 0;
      let spuMatched = 0;
      let unmatched = 0;

      try {
        for (let i = 0; i < inputs.length; i++) {
          if (isCancelledRef.current) break;

          const input = inputs[i];

          try {
            const result = await orchestrator.match(input);

            if (isCancelledRef.current) break;

            const status = result.status as 'matched' | 'spu-matched' | 'unmatched';

            if (status === 'matched') matched++;
            else if (status === 'spu-matched') spuMatched++;
            else unmatched++;

            dispatch({
              type: 'UPDATE_RESULT',
              payload: {
                key: `temp-${i}`,
                result: {
                  matchedSKU: result.matchedInfo.sku || null,
                  matchedSPU: result.matchedInfo.spu || null,
                  matchedBrand: result.extractedInfo.brand || null,
                  matchedVersion: result.extractedInfo.version || null,
                  matchedMemory: result.extractedInfo.memory || null,
                  matchedColor: result.extractedInfo.color || null,
                  matchedGtins: result.matchedInfo.gtins || [],
                  similarity: result.similarity,
                  status,
                },
              },
            });

            // 更新统计
            dispatch({
              type: 'SET_STATS',
              payload: { total: inputs.length, matched, spuMatched, unmatched },
            });
          } catch (err) {
            console.error(`匹配失败 [${input}]:`, err);
            unmatched++;
            dispatch({
              type: 'UPDATE_RESULT',
              payload: {
                key: `temp-${i}`,
                result: { status: 'unmatched' },
              },
            });
          }

          // 每批处理后让 UI 有机会更新
          batchCountRef.current++;
          if (batchCountRef.current % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      } catch (error) {
        console.error('批量匹配失败:', error);
        if (!isCancelledRef.current) {
          message.error('匹配失败');
        }
      }

      if (!isCancelledRef.current) {
        dispatch({ type: 'SET_STATUS', payload: 'completed' });
        message.success(`匹配完成：共 ${inputs.length} 条`);
      }
    })();
  }, []);

  // 取消匹配
  const cancelMatch = useCallback(() => {
    isCancelledRef.current = true;
    dispatch({ type: 'SET_STATUS', payload: 'ready' });
    message.info('已取消匹配');
  }, []);

  // 清空结果
  const clearResults = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULTS' });
    dispatch({ type: 'SET_STATS', payload: { total: 0, matched: 0, spuMatched: 0, unmatched: 0 } });
    dispatch({ type: 'SET_STATUS', payload: 'ready' });
  }, []);

  const value = useMemo<MatchContextValue>(
    () => ({
      state,
      orchestrator: orchestratorRef.current,
      isInitialized: orchestratorInitialized,
      initialize,
      startMatch,
      cancelMatch,
      clearResults,
    }),
    [state, orchestratorInitialized, initialize, startMatch, cancelMatch, clearResults]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

// Hook
export function useMatch() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatch must be used within MatchProvider');
  }
  return context;
}
