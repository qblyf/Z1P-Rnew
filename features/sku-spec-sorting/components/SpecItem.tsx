'use client';

import React from 'react';
import { Button } from 'antd';
import { GripVertical, ChevronUp, ChevronDown, Edit } from 'lucide-react';
import { SpecAttribute } from '../types';

/**
 * SpecItem 组件属性
 * 
 * 需求: 3.1, 4.1, 4.4, 4.5, 8.1
 */
export interface SpecItemProps {
  /** 规格属性数据 */
  spec: SpecAttribute;
  
  /** 在列表中的索引位置 */
  index: number;
  
  /** 是否为列表首项 */
  isFirst: boolean;
  
  /** 是否为列表末项 */
  isLast: boolean;
  
  /** 上移按钮点击回调 */
  onMoveUp: () => void;
  
  /** 下移按钮点击回调 */
  onMoveDown: () => void;
  
  /** 编辑按钮点击回调 */
  onEdit: () => void;
  
  /** 是否禁用所有操作（保存中） */
  disabled?: boolean;
  
  /** 显示的排序号（从1开始） */
  displaySortNumber?: number;
}

/**
 * SpecItem 组件
 * 
 * 展示单个规格属性项，包含：
 * - 拖动图标（左侧）
 * - 规格属性信息（名称、类型、排序号）
 * - 上移/下移按钮（根据位置禁用）
 * - 编辑按钮（右侧）
 * 
 * 需求:
 * - 3.1: 显示拖动图标
 * - 4.1: 提供上移和下移按钮
 * - 4.4: 首项禁用上移按钮
 * - 4.5: 末项禁用下移按钮
 * - 8.1: 显示编辑按钮
 */
export const SpecItem: React.FC<SpecItemProps> = ({
  spec,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  disabled = false,
  displaySortNumber,
}) => {
  return (
    <div
      className="spec-item flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
      data-testid={`spec-item-${spec.id}`}
    >
      {/* 拖动图标 - 需求 3.1 */}
      <div
        className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        data-testid="drag-handle"
        aria-label="拖动"
      >
        <GripVertical size={20} />
      </div>

      {/* 规格属性信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate" title={spec.name}>
            {spec.name}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {spec.type === 'version' ? '版本' : spec.type === 'config' ? '配置' : '颜色'}
          </span>
        </div>
        {spec.description && (
          <div className="text-sm text-gray-500 truncate mt-1" title={spec.description}>
            {spec.description}
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1">
          排序号: {displaySortNumber !== undefined ? displaySortNumber : spec.sortOrder}
        </div>
      </div>

      {/* 操作按钮组 */}
      <div className="flex items-center gap-1">
        {/* 上移按钮 - 需求 4.1, 4.4 */}
        <Button
          type="text"
          size="small"
          icon={<ChevronUp size={16} />}
          onClick={onMoveUp}
          disabled={isFirst || disabled}
          aria-label="上移"
          title={isFirst ? '已是第一项' : '上移'}
          data-testid="move-up-button"
        />

        {/* 下移按钮 - 需求 4.1, 4.5 */}
        <Button
          type="text"
          size="small"
          icon={<ChevronDown size={16} />}
          onClick={onMoveDown}
          disabled={isLast || disabled}
          aria-label="下移"
          title={isLast ? '已是最后一项' : '下移'}
          data-testid="move-down-button"
        />

        {/* 编辑按钮 - 需求 8.1 */}
        <Button
          type="text"
          size="small"
          icon={<Edit size={16} />}
          onClick={onEdit}
          disabled={disabled}
          aria-label="编辑"
          title="编辑规格属性"
          data-testid="edit-button"
        />
      </div>
    </div>
  );
};

export default SpecItem;
