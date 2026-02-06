'use client';

import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';
import { SpecAttribute, SpecAttributeType } from '../types';
import { SpecItem } from './SpecItem';

/**
 * DraggableSpecItem 组件属性
 * 
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface DraggableSpecItemProps {
  /** 规格属性数据 */
  spec: SpecAttribute;
  
  /** 在列表中的索引位置 */
  index: number;
  
  /** 规格类型（用于限制拖拽范围） */
  category: SpecAttributeType;
  
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
  
  /** 拖拽移动回调 */
  onMove: (dragIndex: number, hoverIndex: number) => void;
  
  /** 是否禁用所有操作 */
  disabled?: boolean;
  
  /** 显示的排序号（从1开始） */
  displaySortNumber?: number;
}

/**
 * 拖拽项数据接口
 */
interface DragItem {
  index: number;
  id: string;
  spec: SpecAttribute;
  type: string;
}

/**
 * DraggableSpecItem 组件
 * 
 * 为 SpecItem 组件添加拖拽功能，支持：
 * - 拖拽排序
 * - 拖拽视觉反馈
 * - 限制同类型栏内拖拽
 * 
 * 需求:
 * - 3.1: 显示拖动图标
 * - 3.2: 允许在同一栏内拖动
 * - 3.3: 更新排序位置
 * - 3.4: 提供视觉反馈
 * - 3.5: 限制拖拽仅在同一类型栏内进行
 */
export const DraggableSpecItem: React.FC<DraggableSpecItemProps> = ({
  spec,
  index,
  category,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onMove,
  disabled = false,
  displaySortNumber,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // 设置拖拽源 - 需求 3.1, 3.2
  const [{ isDragging }, drag] = useDrag({
    type: `SPEC_ITEM_${category}`, // 使用类型特定的标识符，限制跨栏拖拽
    item: (): DragItem => ({
      index,
      id: spec.id,
      spec,
      type: `SPEC_ITEM_${category}`,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !disabled,
  });

  // 设置拖放目标 - 需求 3.3, 3.4, 3.5
  const [{ handlerId, isOver }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: Identifier | null; isOver: boolean }
  >({
    accept: `SPEC_ITEM_${category}`, // 只接受同类型的拖拽项
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId(),
      isOver: monitor.isOver(),
    }),
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // 不替换自己
      if (dragIndex === hoverIndex) {
        return;
      }

      // 确定矩形边界
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // 获取中点
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // 确定鼠标位置
      const clientOffset = monitor.getClientOffset();

      // 获取相对于悬停项顶部的像素
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // 只在鼠标越过项目高度的一半时执行移动
      // 向下拖动时，只在光标低于 50% 时移动
      // 向上拖动时，只在光标高于 50% 时移动

      // 向下拖动
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // 向上拖动
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // 执行移动
      onMove(dragIndex, hoverIndex);

      // 注意：我们在这里改变 monitor item，因为我们实际上在改变索引
      // 通常最好避免突变，但为了性能起见，这里是可以接受的
      item.index = hoverIndex;
    },
  });

  // 连接拖拽和拖放引用
  drag(drop(ref));

  // 拖拽时的样式 - 需求 3.4
  const opacity = isDragging ? 0.4 : 1;
  const cursor = disabled ? 'default' : 'move';

  return (
    <div
      ref={ref}
      style={{ opacity, cursor }}
      data-handler-id={handlerId}
      className={`transition-all ${
        isOver ? 'scale-105 shadow-lg' : ''
      }`}
    >
      <SpecItem
        spec={spec}
        index={index}
        isFirst={isFirst}
        isLast={isLast}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onEdit={onEdit}
        disabled={disabled}
        displaySortNumber={displaySortNumber}
      />
    </div>
  );
};

export default DraggableSpecItem;
