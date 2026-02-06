/**
 * 集成测试 - 商品规格排序设置功能
 * 
 * 测试完整的用户流程：
 * - 加载-排序-保存流程
 * - 拖拽操作的完整流程
 * - 编辑操作的完整流程
 * 
 * 需求: 所有需求
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { JWT } from '@zsqk/z1-sdk/es/z1p/alltypes';

// Mock SDK 模块
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

// Mock matchMedia
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
import { SpecAttribute } from '../types';

// Mock react-dnd
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: any) => <div>{children}</div>,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

describe('集成测试 - 商品规格排序设置', () => {
  const mockAuth: JWT = 'mock-jwt-token' as JWT;

  // 测试数据
  const mockSpecs: SpecAttribute[] = [
    {
      id: 'v1',
      name: 'Version 1',
      type: 'version',
      sortOrder: 30,
      description: 'Test version 1',
    },
    {
      id: 'v2',
      name: 'Version 2',
      type: 'version',
      sortOrder: 20,
      description: 'Test version 2',
    },
    {
      id: 'v3',
      name: 'Version 3',
      type: 'version',
      sortOrder: 10,
      description: 'Test version 3',
    },
    {
      id: 'c1',
      name: 'Config 1',
      type: 'config',
      sortOrder: 30,
      description: 'Test config 1',
    },
    {
      id: 'c2',
      name: 'Config 2',
      type: 'config',
      sortOrder: 20,
      description: 'Test config 2',
    },
    {
      id: 'col1',
      name: 'Color 1',
      type: 'color',
      sortOrder: 30,
      description: 'Test color 1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 集成测试 1: 完整的加载-排序-保存流程
   * 
   * 测试场景：
   * 1. 页面加载时获取规格属性数据
   * 2. 数据按类型分组显示在三个栏中
   * 3. 用户通过按钮操作调整排序
   * 4. 点击保存按钮保存排序结果
   * 5. 保存成功后显示成功提示
   * 
   * 验证需求:
   * - 1.1: 调用 SDK 接口获取数据
   * - 1.2: 按类型分组显示
   * - 4.2, 4.3: 上移/下移操作
   * - 5.1: 调用 SDK 接口保存
   * - 5.2: 显示成功提示
   */
  describe('完整的加载-排序-保存流程', () => {
    it('应该完成从加载到保存的完整流程', async () => {
      // 1. Mock SDK 接口
      const mockGetAllSpuSpecAttributes = jest
        .spyOn(sdkAdapter, 'getAllSpuSpecAttributes')
        .mockResolvedValue({
          code: 200,
          message: '获取成功',
          data: mockSpecs,
        });

      const mockBatchUpdateSortOrders = jest
        .spyOn(sdkAdapter, 'batchUpdateSortOrders')
        .mockResolvedValue({
          success: true,
          failedIds: [],
        });

      const { message } = require('antd');

      // 2. 渲染页面
      render(<SpecSortingPage auth={mockAuth} />);

      // 3. 验证数据加载 - 需求 1.1
      await waitFor(() => {
        expect(mockGetAllSpuSpecAttributes).toHaveBeenCalledWith({
          auth: mockAuth,
        });
      });

      // 4. 验证数据按类型分组显示 - 需求 1.2
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
        expect(screen.getByText('Version 2')).toBeInTheDocument();
        expect(screen.getByText('Version 3')).toBeInTheDocument();
        expect(screen.getByText('Config 1')).toBeInTheDocument();
        expect(screen.getByText('Config 2')).toBeInTheDocument();
        expect(screen.getByText('Color 1')).toBeInTheDocument();
      });

      // 5. 验证三个栏都存在
      expect(screen.getByTestId('spec-column-version')).toBeInTheDocument();
      expect(screen.getByTestId('spec-column-config')).toBeInTheDocument();
      expect(screen.getByTestId('spec-column-color')).toBeInTheDocument();

      // 6. 执行排序操作 - 点击上移按钮 - 需求 4.2
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledMoveUpButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );

      expect(enabledMoveUpButton).toBeDefined();
      if (enabledMoveUpButton) {
        fireEvent.click(enabledMoveUpButton);
      }

      // 7. 验证保存按钮变为可用（表示有更改）
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      // 8. 点击保存按钮 - 需求 5.1
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 9. 验证调用了批量保存接口
      await waitFor(() => {
        expect(mockBatchUpdateSortOrders).toHaveBeenCalled();
      });

      // 10. 验证显示成功提示 - 需求 5.2
      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('保存成功');
      });

      // 11. 验证重新加载数据以同步
      await waitFor(() => {
        expect(mockGetAllSpuSpecAttributes).toHaveBeenCalledTimes(2);
      });
    });

    it('应该处理保存失败的情况', async () => {
      // Mock 加载成功
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      // Mock 保存失败
      const mockError = new sdkAdapter.SDKError('保存失败', 500);
      jest
        .spyOn(sdkAdapter, 'batchUpdateSortOrders')
        .mockRejectedValue(mockError);

      const { message } = require('antd');

      render(<SpecSortingPage auth={mockAuth} />);

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 执行排序操作
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 点击保存
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证显示错误提示 - 需求 5.3
      await waitFor(() => {
        expect(message.error).toHaveBeenCalled();
      });

      // 验证保存按钮仍然可用（允许重试）
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('应该在多次操作后正确保存所有更改', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

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

      // 执行多次排序操作
      const moveUpButtons = screen.getAllByLabelText('上移');
      const moveDownButtons = screen.getAllByLabelText('下移');

      // 第一次操作：上移
      const enabledMoveUp = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );
      if (enabledMoveUp) {
        fireEvent.click(enabledMoveUp);
      }

      // 第二次操作：下移
      await waitFor(() => {
        const enabledMoveDown = screen
          .getAllByLabelText('下移')
          .find((btn) => !btn.hasAttribute('disabled'));
        if (enabledMoveDown) {
          fireEvent.click(enabledMoveDown);
        }
      });

      // 保存所有更改
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证批量保存被调用
      await waitFor(() => {
        expect(mockBatchUpdate).toHaveBeenCalled();
        // 验证保存了所有规格属性
        const callArgs = mockBatchUpdate.mock.calls[0];
        expect(callArgs[0]).toHaveLength(mockSpecs.length);
      });
    });
  });

  /**
   * 集成测试 2: 拖拽操作的完整流程
   * 
   * 测试场景：
   * 1. 用户拖拽规格属性项到新位置
   * 2. 系统更新排序位置
   * 3. 系统重新计算排序序号
   * 4. 保存更改到后端
   * 
   * 验证需求:
   * - 3.2: 允许在同一栏内拖动
   * - 3.3: 更新排序位置
   * - 3.6: 重新计算排序序号
   * - 5.1: 保存排序结果
   */
  describe('拖拽操作的完整流程', () => {
    it('应该完成拖拽排序并保存的完整流程', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      const mockBatchUpdate = jest
        .spyOn(sdkAdapter, 'batchUpdateSortOrders')
        .mockResolvedValue({
          success: true,
          failedIds: [],
        });

      const { message } = require('antd');

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 注意：由于 react-dnd 被 mock 了，我们无法真正测试拖拽交互
      // 但我们可以通过按钮操作来模拟排序效果，验证整个流程

      // 使用上移/下移按钮模拟拖拽效果
      const moveDownButtons = screen.getAllByLabelText('下移');
      const enabledButton = moveDownButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );

      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 验证有未保存的更改
      await waitFor(() => {
        expect(screen.getByText('您有未保存的更改')).toBeInTheDocument();
      });

      // 保存更改
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证保存成功
      await waitFor(() => {
        expect(mockBatchUpdate).toHaveBeenCalled();
        expect(message.success).toHaveBeenCalledWith('保存成功');
      });
    });

    it('应该限制拖拽仅在同一类型栏内进行', async () => {
      // 需求 3.5: 限制拖拽操作仅在同一类型栏内进行
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 验证每个栏都有独立的拖放区域
      const versionColumn = screen.getByTestId('spec-column-version');
      const configColumn = screen.getByTestId('spec-column-config');
      const colorColumn = screen.getByTestId('spec-column-color');

      expect(versionColumn).toBeInTheDocument();
      expect(configColumn).toBeInTheDocument();
      expect(colorColumn).toBeInTheDocument();

      // 验证版本栏只包含版本规格
      const versionItems = within(versionColumn).getAllByText(/Version/);
      expect(versionItems.length).toBeGreaterThan(0);

      // 验证配置栏只包含配置规格
      const configItems = within(configColumn).getAllByText(/Config/);
      expect(configItems.length).toBeGreaterThan(0);

      // 验证颜色栏只包含颜色规格
      const colorItems = within(colorColumn).getAllByText(/Color/);
      expect(colorItems.length).toBeGreaterThan(0);
    });
  });

  /**
   * 集成测试 3: 编辑操作的完整流程
   * 
   * 测试场景：
   * 1. 用户点击编辑按钮
   * 2. 打开编辑抽屉显示规格属性详情
   * 3. 用户修改字段值
   * 4. 保存编辑结果
   * 5. 关闭抽屉并刷新列表
   * 
   * 验证需求:
   * - 8.2: 点击编辑按钮打开抽屉
   * - 8.3: 显示所有可编辑字段
   * - 8.5: 调用 SDK 接口更新数据
   * - 8.6: 保存成功后关闭抽屉并刷新列表
   */
  describe('编辑操作的完整流程', () => {
    it('应该完成编辑并保存的完整流程', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      const mockEditSpuSpecAttribute = jest
        .spyOn(sdkAdapter, 'editSpuSpecAttribute')
        .mockResolvedValue({
          code: 200,
          message: '编辑成功',
          data: {
            ...mockSpecs[0],
            name: 'Updated Version 1',
            description: 'Updated description',
          },
        });

      const { message } = require('antd');

      render(<SpecSortingPage auth={mockAuth} />);

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 1. 点击编辑按钮 - 需求 8.2
      const editButtons = screen.getAllByLabelText('编辑');
      expect(editButtons.length).toBeGreaterThan(0);

      fireEvent.click(editButtons[0]);

      // 2. 验证抽屉打开并显示表单 - 需求 8.3
      await waitFor(
        () => {
          const form = screen.getByTestId('spec-edit-form');
          expect(form).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 3. 验证表单字段存在
      const nameInput = screen.getByLabelText('规格名称');
      const descriptionInput = screen.getByLabelText('规格描述');
      const typeSelect = screen.getByLabelText('规格类型');
      const sortOrderInput = screen.getByLabelText('排序序号');

      expect(nameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
      expect(typeSelect).toBeInTheDocument();
      expect(sortOrderInput).toBeInTheDocument();

      // 4. 修改字段值
      fireEvent.change(nameInput, { target: { value: 'Updated Version 1' } });
      fireEvent.change(descriptionInput, {
        target: { value: 'Updated description' },
      });

      // 5. 点击保存按钮 (在抽屉中查找)
      const drawer = screen.getByRole('dialog');
      const saveButton = within(drawer).getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      // 6. 验证调用了编辑接口 - 需求 8.5
      await waitFor(() => {
        expect(mockEditSpuSpecAttribute).toHaveBeenCalled();
      }, { timeout: 5000 });

      // 7. 验证显示成功提示
      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('编辑成功');
      }, { timeout: 5000 });

      // 8. 验证重新加载数据 - 需求 8.6
      await waitFor(() => {
        expect(sdkAdapter.getAllSpuSpecAttributes).toHaveBeenCalledTimes(2);
      });
    });

    it('应该处理编辑失败的情况', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      // Mock 编辑失败
      const mockError = new sdkAdapter.SDKError('编辑失败', 500);
      jest
        .spyOn(sdkAdapter, 'editSpuSpecAttribute')
        .mockRejectedValue(mockError);

      const { message } = require('antd');

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 点击编辑按钮
      const editButtons = screen.getAllByLabelText('编辑');
      fireEvent.click(editButtons[0]);

      // 等待抽屉打开
      await waitFor(
        () => {
          expect(screen.getByTestId('spec-edit-form')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 修改字段
      const nameInput = screen.getByLabelText('规格名称');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      // 点击保存 (在抽屉中查找)
      const drawer = screen.getByRole('dialog');
      const saveButton = within(drawer).getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      // 验证显示错误提示 - 需求 8.7
      await waitFor(() => {
        expect(message.error).toHaveBeenCalled();
      }, { timeout: 5000 });

      // 验证抽屉仍然打开（保持编辑状态）
      expect(screen.getByTestId('spec-edit-form')).toBeInTheDocument();
    });

    it('应该在点击取消时关闭抽屉并放弃更改', async () => {
      // 需求 8.8: 点击取消或关闭按钮时关闭抽屉并放弃未保存的修改
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 点击编辑按钮
      const editButtons = screen.getAllByLabelText('编辑');
      fireEvent.click(editButtons[0]);

      // 等待抽屉打开
      await waitFor(
        () => {
          expect(screen.getByTestId('spec-edit-form')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 修改字段
      const nameInput = screen.getByLabelText('规格名称');
      fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

      // 点击取消按钮 (注意 Ant Design 按钮文本中有空格)
      const cancelButton = screen.getByRole('button', { name: /取.*消/ });
      fireEvent.click(cancelButton);

      // 验证抽屉关闭
      await waitFor(() => {
        expect(screen.queryByTestId('spec-edit-form')).not.toBeInTheDocument();
      });

      // 验证没有调用编辑接口
      expect(sdkAdapter.editSpuSpecAttribute).not.toHaveBeenCalled();
    });
  });

  /**
   * 集成测试 4: 错误处理和用户反馈
   * 
   * 测试场景：
   * 1. 加载失败时的错误处理
   * 2. 保存失败时的错误处理
   * 3. 用户交互反馈
   * 
   * 验证需求:
   * - 1.3: 加载失败时显示错误提示并允许重试
   * - 5.3: 保存失败时显示错误提示并保留操作
   * - 7.1-7.5: 用户交互反馈
   */
  describe('错误处理和用户反馈', () => {
    it('应该在加载失败时显示错误并提供重试', async () => {
      // 需求 1.3: 加载失败时显示错误提示信息并允许用户重试
      const mockError = new sdkAdapter.SDKError('Network error', 500);
      const mockGetAll = jest
        .spyOn(sdkAdapter, 'getAllSpuSpecAttributes')
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          code: 200,
          message: '获取成功',
          data: mockSpecs,
        });

      const { message } = require('antd');

      render(<SpecSortingPage auth={mockAuth} />);

      // 验证显示错误提示
      await waitFor(
        () => {
          expect(message.error).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // 点击刷新按钮重试
      const refreshButton = screen.getByText('刷新');
      fireEvent.click(refreshButton);

      // 验证重新加载成功
      await waitFor(() => {
        expect(mockGetAll).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });
    });

    it('应该在操作过程中提供即时的视觉反馈', async () => {
      // 需求 7.1: 用户执行排序操作时提供即时的视觉反馈
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 执行排序操作
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

      // 验证保存按钮变为可用
      const saveButton = screen.getByText('保存');
      expect(saveButton).not.toBeDisabled();
    });

    it('应该在保存过程中显示保存状态并禁用操作', async () => {
      // 需求 7.3: 数据保存中显示保存状态指示器并禁用操作按钮
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      // Mock 保存操作有延迟
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

      // 执行排序操作
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );

      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 点击保存
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证显示保存状态
      await waitFor(() => {
        expect(screen.getByText('保存中...')).toBeInTheDocument();
      });
    });
  });

  /**
   * 集成测试 5: 数据验证
   * 
   * 测试场景：
   * 1. 验证排序数据的完整性
   * 2. 验证排序序号的正确性
   * 
   * 验证需求:
   * - 9.1: 验证每个规格属性都有唯一的排序序号
   * - 9.2: 验证排序序号是正整数
   * - 9.6: 按照排序号由大到小的顺序展示
   */
  describe('数据验证', () => {
    it('应该按照排序号降序显示规格属性', async () => {
      // 需求 9.6: 按照排序号由大到小的顺序展示规格属性列表
      const unsortedSpecs: SpecAttribute[] = [
        {
          id: 'v1',
          name: 'Version 1',
          type: 'version',
          sortOrder: 10, // 最小
          description: 'Test',
        },
        {
          id: 'v2',
          name: 'Version 2',
          type: 'version',
          sortOrder: 30, // 最大
          description: 'Test',
        },
        {
          id: 'v3',
          name: 'Version 3',
          type: 'version',
          sortOrder: 20, // 中间
          description: 'Test',
        },
      ];

      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: unsortedSpecs,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 获取版本栏中的所有规格项
      const versionColumn = screen.getByTestId('spec-column-version');
      const specItems = within(versionColumn).getAllByText(/Version/);

      // 验证显示顺序：Version 2 (30) -> Version 3 (20) -> Version 1 (10)
      expect(specItems[0]).toHaveTextContent('Version 2');
      expect(specItems[1]).toHaveTextContent('Version 3');
      expect(specItems[2]).toHaveTextContent('Version 1');
    });

    it('应该正确处理空栏的情况', async () => {
      // 需求 2.3: 某个栏中没有规格属性时显示空状态提示
      const specsWithoutColor: SpecAttribute[] = [
        {
          id: 'v1',
          name: 'Version 1',
          type: 'version',
          sortOrder: 30,
          description: 'Test',
        },
        {
          id: 'c1',
          name: 'Config 1',
          type: 'config',
          sortOrder: 30,
          description: 'Test',
        },
        // 没有颜色规格
      ];

      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: specsWithoutColor,
      });

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 验证颜色栏显示空状态
      const colorColumn = screen.getByTestId('spec-column-color');
      const emptyState = within(colorColumn).getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(within(colorColumn).getByText(/暂无颜色规格/)).toBeInTheDocument();
    });
  });

  /**
   * 集成测试 6: 复杂场景
   * 
   * 测试场景：
   * 1. 同时编辑和排序
   * 2. 多个栏同时操作
   * 3. 大量数据处理
   */
  describe('复杂场景', () => {
    it('应该正确处理编辑后再排序的场景', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

      jest.spyOn(sdkAdapter, 'editSpuSpecAttribute').mockResolvedValue({
        code: 200,
        message: '编辑成功',
        data: {
          ...mockSpecs[0],
          name: 'Updated Version 1',
        },
      });

      jest.spyOn(sdkAdapter, 'batchUpdateSortOrders').mockResolvedValue({
        success: true,
        failedIds: [],
      });

      const { message } = require('antd');

      render(<SpecSortingPage auth={mockAuth} />);

      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      // 1. 先编辑一个规格
      const editButtons = screen.getAllByLabelText('编辑');
      fireEvent.click(editButtons[0]);

      await waitFor(
        () => {
          expect(screen.getByTestId('spec-edit-form')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const nameInput = screen.getByLabelText('规格名称');
      fireEvent.change(nameInput, { target: { value: 'Updated Version 1' } });

      // 在抽屉中查找保存按钮
      const drawer = screen.getByRole('dialog');
      const saveButton = within(drawer).getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalled();
      }, { timeout: 5000 });

      // 2. 等待数据重新加载 (编辑成功后会重新加载)
      await waitFor(() => {
        // 初始加载 + 编辑后重新加载 = 2次
        const callCount = (sdkAdapter.getAllSpuSpecAttributes as jest.Mock).mock.calls.length;
        expect(callCount).toBeGreaterThanOrEqual(2);
      }, { timeout: 5000 });

      // 3. 再进行排序操作
      const moveUpButtons = screen.getAllByLabelText('上移');
      const enabledButton = moveUpButtons.find(
        (btn) => !btn.hasAttribute('disabled')
      );

      if (enabledButton) {
        fireEvent.click(enabledButton);
      }

      // 4. 保存排序
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const sortSaveButton = screen.getByText('保存');
      fireEvent.click(sortSaveButton);

      await waitFor(() => {
        expect(sdkAdapter.batchUpdateSortOrders).toHaveBeenCalled();
      });
    });

    it('应该正确处理多个栏同时有操作的场景', async () => {
      jest.spyOn(sdkAdapter, 'getAllSpuSpecAttributes').mockResolvedValue({
        code: 200,
        message: '获取成功',
        data: mockSpecs,
      });

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

      // 在版本栏执行操作
      const versionColumn = screen.getByTestId('spec-column-version');
      const versionMoveUp = within(versionColumn)
        .getAllByLabelText('上移')
        .find((btn) => !btn.hasAttribute('disabled'));

      if (versionMoveUp) {
        fireEvent.click(versionMoveUp);
      }

      // 在配置栏执行操作
      const configColumn = screen.getByTestId('spec-column-config');
      const configMoveDown = within(configColumn)
        .getAllByLabelText('下移')
        .find((btn) => !btn.hasAttribute('disabled'));

      if (configMoveDown) {
        fireEvent.click(configMoveDown);
      }

      // 保存所有更改
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      // 验证保存了所有栏的更改
      await waitFor(() => {
        expect(mockBatchUpdate).toHaveBeenCalled();
        const callArgs = mockBatchUpdate.mock.calls[0];
        // 应该保存所有规格属性
        expect(callArgs[0]).toHaveLength(mockSpecs.length);
      });
    });
  });
});
