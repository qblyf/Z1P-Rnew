import { useCallback, useReducer } from 'react';
import { SPUCateID, SkuID } from '@zsqk/z1-sdk/es/z1p/alltypes';

export type EditMode = 'spucate' | 'spu' | 'sku' | 'none';

export interface EditModeState {
  mode: EditMode;
  preSPUCateID?: SPUCateID;
  selectedSkuID?: SkuID;
}

export type EditModeAction =
  | { type: 'SET_MODE'; payload: EditMode }
  | { type: 'SET_PRE_SPU_CATE_ID'; payload?: SPUCateID }
  | { type: 'SET_SELECTED_SKU_ID'; payload?: SkuID }
  | { type: 'RESET' };

/**
 * 编辑模式状态管理 Hook
 * 
 * 用于管理商品管理页面的编辑模式状态
 * 支持: spucate (SPU 分类), spu (SPU), sku (SKU), none (非编辑)
 */
export function useEditMode(initialMode: EditMode = 'none') {
  const [state, dispatch] = useReducer(
    (state: EditModeState, action: EditModeAction): EditModeState => {
      switch (action.type) {
        case 'SET_MODE':
          return { ...state, mode: action.payload };
        case 'SET_PRE_SPU_CATE_ID':
          return { ...state, preSPUCateID: action.payload };
        case 'SET_SELECTED_SKU_ID':
          return { ...state, selectedSkuID: action.payload };
        case 'RESET':
          return { mode: 'none' };
        default:
          return state;
      }
    },
    { mode: initialMode }
  );

  const setMode = useCallback((mode: EditMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const setPreSPUCateID = useCallback((id?: SPUCateID) => {
    dispatch({ type: 'SET_PRE_SPU_CATE_ID', payload: id });
  }, []);

  const setSelectedSkuID = useCallback((id?: SkuID) => {
    dispatch({ type: 'SET_SELECTED_SKU_ID', payload: id });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    mode: state.mode,
    preSPUCateID: state.preSPUCateID,
    selectedSkuID: state.selectedSkuID,
    setMode,
    setPreSPUCateID,
    setSelectedSkuID,
    reset,
    isEditing: state.mode !== 'none',
  };
}
