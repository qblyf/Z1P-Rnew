import { SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { CSSProperties } from 'react';

const m = new Map(Object.entries(SPUState).map(([k, v]) => [v, k]));
/**
 * [组件] 渲染 SPU 状态
 * 
 * 功能点:
 * 
 * 1. 根据 SPU 状态类型进行文字渲染.
 * 2. 根据业务情况进行颜色渲染.
 * 
 * @author Lian Zheren <lzr@go0356.com>
 */
export function RenderSPUState(props: { v: SPUState }) {
  const { v } = props;
  let color: CSSProperties['color'] = undefined;
  if (v === SPUState.在用) {
    color = 'green';
  }
  if (v === SPUState.弃用) {
    color = 'gray';
  }
  const text = m.get(props.v) ?? '未知状态';
  return (
    <span color={color} style={{ color }}>
      {text}
    </span>
  );
}
