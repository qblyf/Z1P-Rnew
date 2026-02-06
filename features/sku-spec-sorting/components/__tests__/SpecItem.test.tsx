/**
 * SpecItem 组件单元测试
 * 
 * 测试需求: 3.1, 4.1, 4.4, 4.5, 8.1
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpecItem, SpecItemProps } from '../SpecItem';
import { SpecAttribute } from '../../types';

describe('SpecItem Component', () => {
  // 测试数据
  const mockSpec: SpecAttribute = {
    id: 'spec-1',
    name: '测试规格',
    description: '这是一个测试规格描述',
    type: 'version',
    sortOrder: 30,
  };

  const defaultProps: SpecItemProps = {
    spec: mockSpec,
    index: 1,
    isFirst: false,
    isLast: false,
    onMoveUp: jest.fn(),
    onMoveDown: jest.fn(),
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该渲染规格属性的基本信息', () => {
      render(<SpecItem {...defaultProps} />);

      // 验证名称显示
      expect(screen.getByText('测试规格')).toBeInTheDocument();
      
      // 验证类型标签显示
      expect(screen.getByText('版本')).toBeInTheDocument();
      
      // 验证描述显示
      expect(screen.getByText('这是一个测试规格描述')).toBeInTheDocument();
      
      // 验证排序号显示
      expect(screen.getByText(/排序号: 30/)).toBeInTheDocument();
    });

    it('应该正确显示不同类型的标签', () => {
      const { rerender } = render(<SpecItem {...defaultProps} />);
      expect(screen.getByText('版本')).toBeInTheDocument();

      rerender(<SpecItem {...defaultProps} spec={{ ...mockSpec, type: 'config' }} />);
      expect(screen.getByText('配置')).toBeInTheDocument();

      rerender(<SpecItem {...defaultProps} spec={{ ...mockSpec, type: 'color' }} />);
      expect(screen.getByText('颜色')).toBeInTheDocument();
    });

    it('当没有描述时不应该显示描述区域', () => {
      const specWithoutDesc = { ...mockSpec, description: undefined };
      render(<SpecItem {...defaultProps} spec={specWithoutDesc} />);

      expect(screen.queryByText('这是一个测试规格描述')).not.toBeInTheDocument();
    });

    it('应该显示拖动图标 - 需求 3.1', () => {
      render(<SpecItem {...defaultProps} />);

      const dragHandle = screen.getByTestId('drag-handle');
      expect(dragHandle).toBeInTheDocument();
      expect(dragHandle).toHaveAttribute('aria-label', '拖动');
    });
  });

  describe('按钮状态 - 需求 4.4, 4.5', () => {
    it('当 isFirst=true 时应该禁用上移按钮 - 需求 4.4', () => {
      render(<SpecItem {...defaultProps} isFirst={true} isLast={false} />);

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');

      expect(upButton).toBeDisabled();
      expect(downButton).not.toBeDisabled();
    });

    it('当 isLast=true 时应该禁用下移按钮 - 需求 4.5', () => {
      render(<SpecItem {...defaultProps} isFirst={false} isLast={true} />);

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');

      expect(upButton).not.toBeDisabled();
      expect(downButton).toBeDisabled();
    });

    it('当既是首项又是末项时（单项列表）应该禁用两个按钮', () => {
      render(<SpecItem {...defaultProps} isFirst={true} isLast={true} />);

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');

      expect(upButton).toBeDisabled();
      expect(downButton).toBeDisabled();
    });

    it('当既不是首项也不是末项时两个按钮都应该启用', () => {
      render(<SpecItem {...defaultProps} isFirst={false} isLast={false} />);

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');

      expect(upButton).not.toBeDisabled();
      expect(downButton).not.toBeDisabled();
    });

    it('当 disabled=true 时应该禁用所有操作按钮', () => {
      render(<SpecItem {...defaultProps} disabled={true} />);

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');
      const editButton = screen.getByTestId('edit-button');

      expect(upButton).toBeDisabled();
      expect(downButton).toBeDisabled();
      expect(editButton).toBeDisabled();
    });
  });

  describe('按钮点击事件 - 需求 4.1, 8.1', () => {
    it('点击上移按钮应该调用 onMoveUp 回调', () => {
      const onMoveUp = jest.fn();
      render(<SpecItem {...defaultProps} onMoveUp={onMoveUp} isFirst={false} />);

      const upButton = screen.getByTestId('move-up-button');
      fireEvent.click(upButton);

      expect(onMoveUp).toHaveBeenCalledTimes(1);
    });

    it('点击下移按钮应该调用 onMoveDown 回调', () => {
      const onMoveDown = jest.fn();
      render(<SpecItem {...defaultProps} onMoveDown={onMoveDown} isLast={false} />);

      const downButton = screen.getByTestId('move-down-button');
      fireEvent.click(downButton);

      expect(onMoveDown).toHaveBeenCalledTimes(1);
    });

    it('点击编辑按钮应该调用 onEdit 回调 - 需求 8.1', () => {
      const onEdit = jest.fn();
      render(<SpecItem {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('当按钮禁用时点击不应该触发回调', () => {
      const onMoveUp = jest.fn();
      const onMoveDown = jest.fn();
      render(
        <SpecItem
          {...defaultProps}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={true}
          isLast={true}
        />
      );

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');

      fireEvent.click(upButton);
      fireEvent.click(downButton);

      expect(onMoveUp).not.toHaveBeenCalled();
      expect(onMoveDown).not.toHaveBeenCalled();
    });
  });

  describe('可访问性', () => {
    it('所有按钮应该有正确的 aria-label', () => {
      render(<SpecItem {...defaultProps} />);

      expect(screen.getByLabelText('上移')).toBeInTheDocument();
      expect(screen.getByLabelText('下移')).toBeInTheDocument();
      expect(screen.getByLabelText('编辑')).toBeInTheDocument();
      expect(screen.getByLabelText('拖动')).toBeInTheDocument();
    });

    it('按钮应该有正确的 title 提示', () => {
      render(<SpecItem {...defaultProps} isFirst={false} isLast={false} />);

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');
      const editButton = screen.getByTestId('edit-button');

      expect(upButton).toHaveAttribute('title', '上移');
      expect(downButton).toHaveAttribute('title', '下移');
      expect(editButton).toHaveAttribute('title', '编辑规格属性');
    });

    it('首项的上移按钮应该显示禁用提示', () => {
      render(<SpecItem {...defaultProps} isFirst={true} />);

      const upButton = screen.getByTestId('move-up-button');
      expect(upButton).toHaveAttribute('title', '已是第一项');
    });

    it('末项的下移按钮应该显示禁用提示', () => {
      render(<SpecItem {...defaultProps} isLast={true} />);

      const downButton = screen.getByTestId('move-down-button');
      expect(downButton).toHaveAttribute('title', '已是最后一项');
    });
  });

  describe('样式和交互', () => {
    it('应该有正确的 data-testid 用于测试', () => {
      render(<SpecItem {...defaultProps} />);

      expect(screen.getByTestId(`spec-item-${mockSpec.id}`)).toBeInTheDocument();
    });

    it('长文本应该被截断并显示 title 提示', () => {
      const longNameSpec = {
        ...mockSpec,
        name: '这是一个非常非常非常非常非常非常长的规格名称',
        description: '这是一个非常非常非常非常非常非常长的描述文本',
      };
      render(<SpecItem {...defaultProps} spec={longNameSpec} />);

      const nameElement = screen.getByText(longNameSpec.name);
      const descElement = screen.getByText(longNameSpec.description);

      expect(nameElement).toHaveAttribute('title', longNameSpec.name);
      expect(descElement).toHaveAttribute('title', longNameSpec.description);
    });
  });

  describe('边缘情况', () => {
    it('应该正确处理 sortOrder 为 0 的情况', () => {
      const zeroOrderSpec = { ...mockSpec, sortOrder: 0 };
      render(<SpecItem {...defaultProps} spec={zeroOrderSpec} />);

      expect(screen.getByText(/排序号: 0/)).toBeInTheDocument();
    });

    it('应该正确处理非常大的 sortOrder 值', () => {
      const largeOrderSpec = { ...mockSpec, sortOrder: 999999 };
      render(<SpecItem {...defaultProps} spec={largeOrderSpec} />);

      expect(screen.getByText(/排序号: 999999/)).toBeInTheDocument();
    });

    it('应该正确处理空字符串名称', () => {
      const emptyNameSpec = { ...mockSpec, name: '' };
      render(<SpecItem {...defaultProps} spec={emptyNameSpec} />);

      // 组件应该渲染，即使名称为空
      expect(screen.getByTestId(`spec-item-${mockSpec.id}`)).toBeInTheDocument();
    });
  });
});
