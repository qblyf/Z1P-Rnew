import { useCallback, useReducer } from 'react';

export interface ParamFilterState {
  selectedFilters: Record<number, string>;
}

export type ParamFilterAction =
  | { type: 'TOGGLE_FILTER'; payload: { definitionID: number; value: string } }
  | { type: 'CLEAR_FILTERS' };

/**
 * 参数过滤状态管理 Hook
 * 
 * 用于管理 SPU/SKU 参数配置页面的参数值过滤功能
 * 支持多个参数维度同时过滤（取交集）
 */
export function useParamFilter() {
  const [state, dispatch] = useReducer(
    (state: ParamFilterState, action: ParamFilterAction): ParamFilterState => {
      switch (action.type) {
        case 'TOGGLE_FILTER': {
          const { definitionID, value } = action.payload;
          const currentValue = state.selectedFilters[definitionID];
          
          // 如果已选中相同值，则取消选中
          if (currentValue === value) {
            const newFilters = { ...state.selectedFilters };
            delete newFilters[definitionID];
            return { selectedFilters: newFilters };
          }
          
          // 否则选中新值
          return {
            selectedFilters: {
              ...state.selectedFilters,
              [definitionID]: value,
            },
          };
        }
        case 'CLEAR_FILTERS':
          return { selectedFilters: {} };
        default:
          return state;
      }
    },
    { selectedFilters: {} }
  );

  const toggleFilter = useCallback(
    (definitionID: number, value: string) => {
      dispatch({
        type: 'TOGGLE_FILTER',
        payload: { definitionID, value },
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const hasActiveFilters = Object.keys(state.selectedFilters).length > 0;

  return {
    selectedFilters: state.selectedFilters,
    toggleFilter,
    clearFilters,
    hasActiveFilters,
  };
}
