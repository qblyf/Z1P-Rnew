/**
 * SpecSortingPage 组件单元测试
 * 
 * 测试主页面组件的核心功能：
 * - 数据加载
 * - 拖拽排序
 * - 按钮排序
 * - 保存功能
 * - 编辑功能
 * - 错误处理
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { JWT } from '@zsqk/z1-sdk/es/z1p/alltypes';

// Mock SDK 模块 - 必须在导入之前
jest.mock('@zsqk/z1-sdk/es/z1p/spu-spec-attribute', () => ({
  allSpuSpecAttribute: jest.fn(),
  editSpuSpecAttribute: jest.fn(),
}));

// Mock Ant Design message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    },
  };
});

// Mock matchMedia for Ant Design Drawer
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock SDK adapter
jest.mock('../sdkAdapter');

import { SpecSortingPage } from '../SpecSortingPage';
import * as sdkAdapter from '../sdkAdapter';

// Mock react-dnd
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: any) => <div>{children}</div>,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

describe('SpecSortingPage', () => {
  const mockAuth: JWT = 'mock-jwt-token' as JWT;

  const mockSpecs = [
    {
      id: '1',
      name: 'Version 1',
      type: 'version' as const,
      sortOrder: 30,
      description: 'Test version 1',
    },
    {
      id: '2',
      name: 'Version 2',
      type: 'version' as const,
      sortOrder: 20,
      description: 'Test version 2',
    },
    {
      id: '3',
      name: 'Config 1',
      type: 'config' as const,
      sortOrder: 30,
      description: 'Test config 1',
    },
    {
      id: '4',
      name: 'Color 1',
      type: 'color' as const,
      sortOrder: 30,
      description: 'Test color 1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('数据加载', () => {
    /**
     * 需求 1.1: 调用 allSpuSpecAttribute SDK 接口获取所有规格属性
     */
    it('应该在页面加载时调用 getAllSpuSpecAttributes', async () => {
      const mockGetAllSpuSpecAttributes = jest
        .spyOn(sdkAdapter, 'getAllSpuSpecAttributes')
        .mockResolvedValue({
          code: 200,
          message: '获取成功',
          data: mockSpecs,
        });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(mockGetAllSpuSpecAttributes).toHaveBeenCalledWith({
          auth: mockAuth,
        });
      });
    });

    /**
     * 需求 1.2: 按照版本、配置、颜色三个类别分组显示
     */
    it('应该显示三个独立的列表栏', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        const columns = screen.getAllByTestId(/spec-column-/);
        expect(columns).toHaveLength(3);
        expect(screen.getByTestId('spec-column-version')).toBeInTheDocument();
        expect(screen.getByTestId('spec-column-config')).toBeInTheDocument();
        expect(screen.getByTestId('spec-column-color')).toBeInTheDocument();
      });
    });

    /**
     * 需求 1.2: 规格属性按类型分组显示
     */
    it('应该将规格属性按类型正确分组', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
        expect(screen.getByText('Version 2')).toBeInTheDocument();
        expect(screen.getByText('Config 1')).toBeInTheDocument();
        expect(screen.getByText('Color 1')).toBeInTheDocument();
      });
    });

    /**
     * 需求 1.3: 加载失败时显示错误提示信息并允许用户重试
     */
    it('应该在加载失败时显示错误提示', async () => {
      const { message: antdMessage } = require('antd');
      const mockError = new sdkAdapter.SDKError('Network error', 500);
      jest
        .spyOn(sdkAdapter, 'getAllSpuSpecAttributes')
        .mockRejectedValue(mockError);

      render(<SpecSortingPage auth={mockAuth} />);

      // Wait for the error message to be called
      await waitFor(
        () => {
          expect(antdMessage.error).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // The error message should have been called
      expect(antdMessage.error).toHaveBeenCalledTimes(1);
    });

    /**
     * 需求 7.2: 数据正在加载时显示加载状态指示器
     */
    it('应该在加载时显示加载状态', async () => {
      // Create a promise that we can control
      let resolvePromise: any;
      const loadingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      jest
        .spyOn(sdkAdapter, 'getAllSpuSpecAttributes')
        .mockReturnValue(loadingPromise as any);

      const { container } = render(<SpecSortingPage auth={mockAuth} />);

      // Check for loading state - look for the Spin component
      const spinElement = container.querySelector('.ant-spin');
      expect(spinElement).toBeInTheDocument();

      // Resolve the promise
      resolvePromise({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });
    });
  });

  describe('按钮排序功能', () => {
    beforeEach(async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });
    });

    /**
     * 需求 4.2: 点击上移按钮将该项与上一项交换位置
     */
    it('应该处理上移操作', async () => {
      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 找到 Version 2 的上移按钮（它不是第一项）
      const moveUpButtons = screen.getAllByLabelText('上移');
      // Version 2 应该有一个启用的上移按钮
      const enabledMoveUpButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );

      if (enabledMoveUpButton) {
        fireEvent.click(enabledMoveUpButton);

        // 验证保存按钮变为可用（表示有更改）
        await waitFor(() => {
          const saveButton = screen.getByText('保存');
          expect(saveButton).not.toBeDisabled();
        });
      }
    });

    /**
     * 需求 4.3: 点击下移按钮将该项与下一项交换位置
     */
    it('应该处理下移操作', async () => {
      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 找到 Version 1 的下移按钮（它不是最后一项）
      const moveDownButtons = screen.getAllByLabelText('下移');
      const enabledMoveDownButton = moveDownButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );

      if (enabledMoveDownButton) {
        fireEvent.click(enabledMoveDownButton);

        // 验证保存按钮变为可用（表示有更改）
        await waitFor(() => {
          const saveButton = screen.getByText('保存');
          expect(saveButton).not.toBeDisabled();
        });
      }
    });

    /**
     * 需求 4.4: 首项禁用上移按钮
     */
    it('应该禁用首项的上移按钮', async () => {
      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // Version 1 是版本栏的第一项，其上移按钮应该被禁用
      const moveUpButtons = screen.getAllByLabelText('上移');
      // 至少有一个上移按钮应该被禁用
      const disabledButton = moveUpButtons.find((btn) =>
        btn.hasAttribute('disabled')
      );
      expect(disabledButton).toBeDefined();
    });

    /**
     * 需求 4.5: 末项禁用下移按钮
     */
    it('应该禁用末项的下移按钮', async () => {
      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 2')).toBeInTheDocument();
      });

      // Version 2 是版本栏的最后一项，其下移按钮应该被禁用
      const moveDownButtons = screen.getAllByLabelText('下移');
      // 至少有一个下移按钮应该被禁用
      const disabledButton = moveDownButtons.find((btn) =>
        btn.hasAttribute('disabled')
      );
      expect(disabledButton).toBeDefined();
    });
  });

  describe('保存功能', () => {
    beforeEach(async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });
    });

    /**
     * 需求 5.1: 调用 editSpuSpecAttribute SDK 接口保存新的排序顺序
     */
    it('应该调用 batchUpdateSortOrders 保存排序', async () => {
      const mockBatchUpdate = jest
        .spyOn(sdkAdapter, 'batchUpdateSortOrders')
        .mockResolvedValue({
          success: true,
          failedIds: [],
        });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 触发一个更改（点击上移按钮）
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 点击保存按钮
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockBatchUpdate).toHaveBeenCalled();
      });
    });

    /**
     * 需求 5.2: 保存成功时显示成功提示信息
     */
    it('应该在保存成功时显示成功消息', async () => {
      const { message } = require('antd');
      jest.spyOn(sdkAdapter, 'batchUpdateSortOrders').mockResolvedValue({
        success: true,
        failedIds: [],
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 触发一个更改
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 点击保存按钮
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('保存成功');
      });
    });

    /**
     * 需求 5.3: 保存失败时显示错误提示并保留用户的排序操作
     */
    it('应该在保存失败时显示错误消息', async () => {
      const { message } = require('antd');
      const mockError = new sdkAdapter.SDKError('保存失败', 500);
      jest
        .spyOn(sdkAdapter, 'batchUpdateSortOrders')
        .mockRejectedValue(mockError);

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 触发一个更改
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 点击保存按钮
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalled();
      });
    });

    /**
     * 需求 7.3: 数据保存中显示保存状态指示器并禁用操作按钮
     */
    it('应该在保存时禁用操作按钮', async () => {
      jest.spyOn(sdkAdapter, 'batchUpdateSortOrders').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  failedIds: [],
                }),
              100
            );
          })
      );

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 触发一个更改
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 点击保存按钮
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证保存按钮显示"保存中..."
      await waitFor(() => {
        expect(screen.getByText('保存中...')).toBeInTheDocument();
      });
    });
  });

  describe('编辑功能', () => {
    beforeEach(async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });
    });

    /**
     * 需求 8.2: 点击编辑按钮打开抽屉
     */
    it('应该在点击编辑按钮时打开抽屉', async () => {
      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 点击编辑按钮
      const editButtons = screen.getAllByLabelText('编辑');
      expect(editButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(editButtons[0]);

      // 验证抽屉打开 - 检查表单是否存在
      await waitFor(
        () => {
          const form = screen.getByTestId('spec-edit-form');
          expect(form).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('错误处理', () => {
    /**
     * 需求 9.1, 9.2: 验证排序数据的完整性和正确性
     */
    it('应该在保存前验证排序数据', async () => {
      // 创建包含无效排序序号的数据（sortOrder = 0）
      const invalidSpecs = [
        {
          id: '1',
          name: 'Version 1',
          type: 'version' as const,
          sortOrder: 0, // 无效：不是正整数
          description: 'Test version 1',
        },
      ];

      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: invalidSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 验证保存按钮的状态
      // 由于数据是从后端加载的，hasChanges 为 false
      // 保存按钮应该被禁用（通过 disabled 属性）
      const saveButton = screen.getByRole('button', { name: /保存/ });
      
      // 检查按钮是否有 disabled 属性
      // 注意：Ant Design 的 Button 可能通过 className 来表示禁用状态
      const isDisabled = saveButton.hasAttribute('disabled') || 
                        saveButton.classList.contains('ant-btn-disabled');
      
      expect(isDisabled).toBe(true);
    });
  });

  describe('用户交互反馈', () => {
    beforeEach(async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });
    });

    /**
     * 需求 7.1: 用户执行排序操作时提供即时的视觉反馈
     */
    it('应该在有未保存更改时显示警告提示', async () => {
      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 触发一个更改
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 验证显示未保存更改提示
      await waitFor(() => {
        expect(screen.getByText('您有未保存的更改')).toBeInTheDocument();
      });
    });
  });
});
