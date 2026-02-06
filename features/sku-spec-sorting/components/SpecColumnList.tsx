'use client';

import React, { useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Empty } from 'antd';
import { Package } from 'lucide-react';
import { SpecAttribute, SpecAttributeType } from '../types';
import { DraggableSpecItem } from './DraggableSpecItem';

/**
 * SpecColumnList 组件属性
 * 
 * 需求: 2.1, 2.2, 2.3, 3.2, 3.5
 */
export interface SpecColumnListProps {
  /** 栏标题 */
  title: string;
  
  /** 规格属性列表 */
  specs: SpecAttribute[];
  
  /** 规格类型（用于限制拖拽范围） */
  category: SpecAttributeType;
  
  /** 上移按钮点击回调 */
  onMoveUp: (spec: SpecAttribute) => void;
  
  /** 下移按钮点击回调 */
  onMoveDown: (spec: SpecAttribute) => void;
  
  /** 编辑按钮点击回调 */
  onEdit: (spec: SpecAttribute) => void;
  
  /** 拖拽结束回调 */
  onDragEnd: (draggedSpec: SpecAttribute, targetIndex: number) => void;
  
  /** 数据加载状态 */
  loading?: boolean;
  
  /** 是否禁用所有操作 */
  disabled?: boolean;
}

/**
 * SpecColumnList 组件
 * 
 * 展示单个类型的规格属性列表，支持：
 * - 拖拽排序（仅限同栏内）
 * - 上移/下移按钮操作
 * - 编辑功能
 * - 空状态显示
 * 
 * 需求:
 * - 2.1: 提供独立的列表栏
 * - 2.2: 根据属性类型放置在对应栏中
 * - 2.3: 显示空状态提示
 * - 3.2: 允许在同一栏内拖动
 * - 3.5: 限制拖拽仅在同一类型栏内进行
 */
export const SpecColumnList: React.FC<SpecColumnListProps> = ({
  title,
  specs,
  category,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDragEnd,
  loading = false,
  disabled = false,
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  
  // 设置拖放区域 - 需求 3.2, 3.5
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: `SPEC_ITEM_${category}`, // 只接受同类型的拖拽项
    drop: (item: { spec: SpecAttribute; index: number }, monitor) => {
      // 拖拽结束时不做处理，由 DraggableSpecItem 处理
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Connect the drop ref
  drop(dropRef);

  // 处理拖拽移动
  const handleMove = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (dragIndex === hoverIndex) return;
      
      const draggedSpec = specs[dragIndex];
      onDragEnd(draggedSpec, hoverIndex);
    },
    [specs, onDragEnd]
  );

  // 空状态显示 - 需求 2.3
  if (!loading && specs.length === 0) {
    return (
      <div
        className="spec-column flex flex-col h-full bg-gray-50 rounded-lg border border-gray-200 p-4"
        data-testid={`spec-column-${category}`}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package size={20} />
          {title}
          <span className="text-sm font-normal text-gray-500">(0)</span>
        </h3>
        
        <div className="flex-1 flex items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-gray-500">
                暂无{title}规格
              </span>
            }
            data-testid="empty-state"
          />
        </div>
      </div>
    );
  }

  // 正常列表显示 - 需求 2.1, 2.2
  return (
    <div
      ref={dropRef}
      className={`spec-column flex flex-col h-full bg-gray-50 rounded-lg border border-gray-200 p-4 transition-colors ${
        isOver && canDrop ? 'border-blue-400 bg-blue-50' : ''
      }`}
      data-testid={`spec-column-${category}`}
    >
      {/* 栏标题 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Package size={20} />
        {title}
        <span className="text-sm font-normal text-gray-500">
          ({specs.length})
        </span>
      </h3>

      {/* 规格属性列表 - 需求 2.4: 独立滚动区域 */}
      <div
        className="flex-1 overflow-y-auto space-y-2 pr-1"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        data-testid="spec-list"
      >
        {loading ? (
          // 加载状态
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          // 渲染规格项列表
          specs.map((spec, index) => (
            <DraggableSpecItem
              key={spec.id}
              spec={spec}
              index={index}
              category={category}
              isFirst={index === 0}
              isLast={index === specs.length - 1}
              onMoveUp={() => onMoveUp(spec)}
              onMoveDown={() => onMoveDown(spec)}
              onEdit={() => onEdit(spec)}
              onMove={handleMove}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SpecColumnList;
