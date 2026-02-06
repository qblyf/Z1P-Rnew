/**
 * SpecColumnList 组件单元测试
 * 
 * 测试需求: 2.1, 2.2, 2.3, 3.2, 3.5
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpecAttribute } from '../../types';

// Mock react-dnd to avoid ESM issues in Jest
jest.mock('react-dnd', () => ({
  useDrop: jest.fn(() => [{ isOver: false, canDrop: true }, jest.fn()]),
  useDrag: jest.fn(() => [{ isDragging: false }, jest.fn()]),
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

// Import after mocking
import { SpecColumnList, SpecColumnListProps } from '../SpecColumnList';

describe('SpecColumnList Component', () => {
  // 测试数据
  const mockSpecs: SpecAttribute[] = [
    {
      id: 'spec-1',
      name: '规格 A',
      description: '描述 A',
      type: 'version',
      sortOrder: 30,
    },
    {
      id: 'spec-2',
      name: '规格 B',
      description: '描述 B',
      type: 'version',
      sortOrder: 20,
    },
    {
      id: 'spec-3',
      name: '规格 C',
      description: '描述 C',
      type: 'version',
      sortOrder: 10,
    },
  ];

  const defaultProps: SpecColumnListProps = {
    title: '版本',
    specs: mockSpecs,
    category: 'version',
    onMoveUp: jest.fn(),
    onMoveDown: jest.fn(),
    onEdit: jest.fn(),
    onDragEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本渲染 - 需求 2.1, 2.2', () => {
    it('应该渲染栏标题和规格数量', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      // Use more specific query to find the title (in h3 element)
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('版本');
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('应该渲染所有规格属性项', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      expect(screen.getByText('规格 A')).toBeInTheDocument();
      expect(screen.getByText('规格 B')).toBeInTheDocument();
      expect(screen.getByText('规格 C')).toBeInTheDocument();
    });

    it('应该有正确的 data-testid', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      expect(screen.getByTestId('spec-column-version')).toBeInTheDocument();
      expect(screen.getByTestId('spec-list')).toBeInTheDocument();
    });

    it('应该为不同类型显示正确的标题', () => {
      const { rerender } = render(
        
          <SpecColumnList {...defaultProps} title="版本" category="version" />
        
      );
      let heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('版本');

      rerender(
        
          <SpecColumnList {...defaultProps} title="配置" category="config" />
        
      );
      heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('配置');

      rerender(
        
          <SpecColumnList {...defaultProps} title="颜色" category="color" />
        
      );
      heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('颜色');
    });
  });

  describe('空状态显示 - 需求 2.3', () => {
    it('当列表为空时应该显示空状态提示', () => {
      render(
        
          <SpecColumnList {...defaultProps} specs={[]} />
        
      );

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('暂无版本规格')).toBeInTheDocument();
    });

    it('空状态应该显示正确的类型提示', () => {
      const { rerender } = render(
        
          <SpecColumnList {...defaultProps} title="版本" specs={[]} />
        
      );
      expect(screen.getByText('暂无版本规格')).toBeInTheDocument();

      rerender(
        
          <SpecColumnList {...defaultProps} title="配置" specs={[]} />
        
      );
      expect(screen.getByText('暂无配置规格')).toBeInTheDocument();

      rerender(
        
          <SpecColumnList {...defaultProps} title="颜色" specs={[]} />
        
      );
      expect(screen.getByText('暂无颜色规格')).toBeInTheDocument();
    });

    it('空状态时应该显示数量为 0', () => {
      render(
        
          <SpecColumnList {...defaultProps} specs={[]} />
        
      );

      expect(screen.getByText('(0)')).toBeInTheDocument();
    });

    it('空状态时不应该显示规格列表', () => {
      render(
        
          <SpecColumnList {...defaultProps} specs={[]} />
        
      );

      expect(screen.queryByTestId('spec-list')).not.toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('当 loading=true 时应该显示加载指示器', () => {
      render(
        
          <SpecColumnList {...defaultProps} loading={true} />
        
      );

      // 查找加载动画元素
      const loader = screen.getByTestId('spec-list').querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('当 loading=false 时应该显示规格列表', () => {
      render(
        
          <SpecColumnList {...defaultProps} loading={false} />
        
      );

      expect(screen.getByText('规格 A')).toBeInTheDocument();
    });

    it('加载时不应该显示空状态', () => {
      render(
        
          <SpecColumnList {...defaultProps} specs={[]} loading={true} />
        
      );

      // 应该显示列表容器（带加载器），而不是空状态
      expect(screen.getByTestId('spec-list')).toBeInTheDocument();
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  describe('按钮事件处理', () => {
    it('应该正确传递 onMoveUp 回调', () => {
      const onMoveUp = jest.fn();
      render(
        
          <SpecColumnList {...defaultProps} onMoveUp={onMoveUp} />
        
      );

      // 点击第二项的上移按钮（第一项的上移按钮被禁用）
      const upButtons = screen.getAllByTestId('move-up-button');
      fireEvent.click(upButtons[1]);

      expect(onMoveUp).toHaveBeenCalledTimes(1);
      expect(onMoveUp).toHaveBeenCalledWith(mockSpecs[1]);
    });

    it('应该正确传递 onMoveDown 回调', () => {
      const onMoveDown = jest.fn();
      render(
        
          <SpecColumnList {...defaultProps} onMoveDown={onMoveDown} />
        
      );

      // 点击第一项的下移按钮
      const downButtons = screen.getAllByTestId('move-down-button');
      fireEvent.click(downButtons[0]);

      expect(onMoveDown).toHaveBeenCalledTimes(1);
      expect(onMoveDown).toHaveBeenCalledWith(mockSpecs[0]);
    });

    it('应该正确传递 onEdit 回调', () => {
      const onEdit = jest.fn();
      render(
        
          <SpecColumnList {...defaultProps} onEdit={onEdit} />
        
      );

      // 点击第一项的编辑按钮
      const editButtons = screen.getAllByTestId('edit-button');
      fireEvent.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(mockSpecs[0]);
    });
  });

  describe('禁用状态', () => {
    it('当 disabled=true 时应该禁用所有操作按钮', () => {
      render(
        
          <SpecColumnList {...defaultProps} disabled={true} />
        
      );

      const upButtons = screen.getAllByTestId('move-up-button');
      const downButtons = screen.getAllByTestId('move-down-button');
      const editButtons = screen.getAllByTestId('edit-button');

      // 所有按钮都应该被禁用
      upButtons.forEach((button) => expect(button).toBeDisabled());
      downButtons.forEach((button) => expect(button).toBeDisabled());
      editButtons.forEach((button) => expect(button).toBeDisabled());
    });

    it('当 disabled=false 时应该启用适当的按钮', () => {
      render(
        
          <SpecColumnList {...defaultProps} disabled={false} />
        
      );

      // 第二项的上移和下移按钮都应该启用
      const upButtons = screen.getAllByTestId('move-up-button');
      const downButtons = screen.getAllByTestId('move-down-button');

      expect(upButtons[1]).not.toBeDisabled();
      expect(downButtons[1]).not.toBeDisabled();
    });
  });

  describe('列表项位置状态', () => {
    it('第一项应该禁用上移按钮', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      const upButtons = screen.getAllByTestId('move-up-button');
      expect(upButtons[0]).toBeDisabled();
    });

    it('最后一项应该禁用下移按钮', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      const downButtons = screen.getAllByTestId('move-down-button');
      expect(downButtons[2]).toBeDisabled(); // 第三项（索引 2）是最后一项
    });

    it('中间项的上移和下移按钮都应该启用', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      const upButtons = screen.getAllByTestId('move-up-button');
      const downButtons = screen.getAllByTestId('move-down-button');

      // 第二项（索引 1）是中间项
      expect(upButtons[1]).not.toBeDisabled();
      expect(downButtons[1]).not.toBeDisabled();
    });
  });

  describe('单项列表', () => {
    it('单项列表应该禁用上移和下移按钮', () => {
      const singleSpec = [mockSpecs[0]];
      render(
        
          <SpecColumnList {...defaultProps} specs={singleSpec} />
        
      );

      const upButton = screen.getByTestId('move-up-button');
      const downButton = screen.getByTestId('move-down-button');

      expect(upButton).toBeDisabled();
      expect(downButton).toBeDisabled();
    });

    it('单项列表应该显示数量为 1', () => {
      const singleSpec = [mockSpecs[0]];
      render(
        
          <SpecColumnList {...defaultProps} specs={singleSpec} />
        
      );

      expect(screen.getByText('(1)')).toBeInTheDocument();
    });
  });

  describe('滚动区域 - 需求 2.4', () => {
    it('列表容器应该有滚动样式', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      const listContainer = screen.getByTestId('spec-list');
      expect(listContainer).toHaveClass('overflow-y-auto');
    });

    it('列表容器应该有最大高度限制', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      const listContainer = screen.getByTestId('spec-list');
      expect(listContainer).toHaveStyle({ maxHeight: 'calc(100vh - 200px)' });
    });
  });

  describe('拖拽视觉反馈 - 需求 3.4', () => {
    it('栏容器应该有过渡动画类', () => {
      render(
        
          <SpecColumnList {...defaultProps} />
        
      );

      const column = screen.getByTestId('spec-column-version');
      expect(column).toHaveClass('transition-colors');
    });
  });

  describe('边缘情况', () => {
    it('应该正确处理大量规格项', () => {
      const manySpecs = Array.from({ length: 50 }, (_, i) => ({
        id: `spec-${i}`,
        name: `规格 ${i}`,
        type: 'version' as const,
        sortOrder: (50 - i) * 10,
      }));

      render(
        
          <SpecColumnList {...defaultProps} specs={manySpecs} />
        
      );

      expect(screen.getByText('(50)')).toBeInTheDocument();
      expect(screen.getByText('规格 0')).toBeInTheDocument();
      expect(screen.getByText('规格 49')).toBeInTheDocument();
    });

    it('应该正确处理没有描述的规格项', () => {
      const specsWithoutDesc = mockSpecs.map((spec) => ({
        ...spec,
        description: undefined,
      }));

      render(
        
          <SpecColumnList {...defaultProps} specs={specsWithoutDesc} />
        
      );

      expect(screen.getByText('规格 A')).toBeInTheDocument();
      expect(screen.queryByText('描述 A')).not.toBeInTheDocument();
    });

    it('应该正确处理空字符串标题', () => {
      render(
        
          <SpecColumnList {...defaultProps} title="" />
        
      );

      // 组件应该正常渲染
      expect(screen.getByTestId('spec-column-version')).toBeInTheDocument();
    });
  });

  describe('类型特定行为 - 需求 3.5', () => {
    it('不同类型的栏应该有不同的 data-testid', () => {
      const { rerender } = render(
        
          <SpecColumnList {...defaultProps} category="version" />
        
      );
      expect(screen.getByTestId('spec-column-version')).toBeInTheDocument();

      rerender(
        
          <SpecColumnList {...defaultProps} category="config" />
        
      );
      expect(screen.getByTestId('spec-column-config')).toBeInTheDocument();

      rerender(
        
          <SpecColumnList {...defaultProps} category="color" />
        
      );
      expect(screen.getByTestId('spec-column-color')).toBeInTheDocument();
    });
  });
});
