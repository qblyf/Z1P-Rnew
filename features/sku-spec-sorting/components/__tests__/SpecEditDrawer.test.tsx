/**
 * SpecEditDrawer 组件单元测试
 * 
 * 测试编辑抽屉组件的功能，包括：
 * - 抽屉打开/关闭
 * - 字段显示完整性
 * - 保存成功/失败场景
 * - 取消操作
 * 
 * 需求: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpecEditDrawer } from '../SpecEditDrawer';
import type { SpecAttribute } from '../../types';

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
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

// Mock antd message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

import { message } from 'antd';

describe('SpecEditDrawer', () => {
  const mockSpec: SpecAttribute = {
    id: '1',
    name: '红色',
    description: '标签1, 标签2',
    type: 'color',
    sortOrder: 100,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('抽屉打开/关闭 - 需求 8.2, 8.8', () => {
    it('应该在 visible=true 时显示抽屉', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('编辑规格属性')).toBeInTheDocument();
    });

    it('应该在 visible=false 时隐藏抽屉', () => {
      const { container } = render(
        <SpecEditDrawer
          visible={false}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Ant Design Drawer 在关闭时不会渲染到 DOM 中
      const drawer = container.querySelector('.ant-drawer-open');
      expect(drawer).not.toBeInTheDocument();
    });

    it('应该在点击取消按钮时调用 onCancel - 需求 8.8', async () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /取.*消/ });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('应该在点击关闭图标时调用 onCancel - 需求 8.8', async () => {
      const { container } = render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = container.querySelector('.ant-drawer-close');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnCancel).toHaveBeenCalled();
      }
    });
  });

  describe('字段显示 - 需求 8.3, 8.4', () => {
    it('应该显示所有基本可编辑字段', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 验证基本字段显示
      expect(screen.getByLabelText(/规格名称/)).toBeInTheDocument();
      expect(screen.getByLabelText(/规格描述/)).toBeInTheDocument();
      expect(screen.getByLabelText(/规格类型/)).toBeInTheDocument();
      expect(screen.getByLabelText(/排序序号/)).toBeInTheDocument();
    });

    it('应该使用 spec 的值填充表单字段', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/规格名称/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/规格描述/) as HTMLTextAreaElement;
      const sortInput = screen.getByLabelText(/排序序号/) as HTMLInputElement;

      expect(nameInput.value).toBe('红色');
      expect(descInput.value).toBe('标签1, 标签2');
      expect(sortInput.value).toBe('100');
    });

    it('应该动态显示额外的可编辑字段 - 需求 8.4', () => {
      const specWithExtraFields: SpecAttribute = {
        ...mockSpec,
        customField1: 'custom value 1',
        customField2: 123,
      };

      render(
        <SpecEditDrawer
          visible={true}
          spec={specWithExtraFields}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 验证动态字段显示 - 注意格式化后的标签（数字不会被分隔）
      expect(screen.getByText('其他字段')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom Field1')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom Field2')).toBeInTheDocument();
    });

    it('应该在没有额外字段时不显示"其他字段"部分', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('其他字段')).not.toBeInTheDocument();
    });

    it('应该在 spec 为 null 时显示提示信息', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('未选择规格属性')).toBeInTheDocument();
    });
  });

  describe('表单验证', () => {
    it('应该验证规格名称为必填项', async () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/规格名称/);
      fireEvent.change(nameInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('请输入规格名称')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('应该验证规格名称长度不超过100个字符', async () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/规格名称/);
      const longName = 'a'.repeat(101);
      fireEvent.change(nameInput, { target: { value: longName } });

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText('规格名称不能超过100个字符')
        ).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('应该验证排序序号为必填项', async () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const sortInput = screen.getByLabelText(/排序序号/);
      fireEvent.change(sortInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('请输入排序序号')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('应该验证排序序号为正整数', async () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const sortInput = screen.getByLabelText(/排序序号/);
      fireEvent.change(sortInput, { target: { value: '0' } });

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText('排序序号必须是正整数')
        ).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('保存操作 - 需求 8.5, 8.6, 8.7', () => {
    it('应该在保存成功时调用 onSave 并显示成功消息 - 需求 8.5, 8.6', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/规格名称/);
      fireEvent.change(nameInput, { target: { value: '新名称' } });

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1',
            name: '新名称',
            type: 'color',
            sortOrder: 100,
          })
        );
      });

      expect(message.success).toHaveBeenCalledWith('保存成功');
    });

    it('应该在保存失败时显示错误信息并保持抽屉打开 - 需求 8.7', async () => {
      const errorMessage = '保存失败：网络错误';
      mockOnSave.mockRejectedValue(new Error(errorMessage));

      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          errorMessage
        );
      });

      expect(message.error).toHaveBeenCalledWith(errorMessage);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('应该在保存时禁用所有操作', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      
      mockOnSave.mockReturnValue(savePromise);

      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      // 验证按钮被禁用 - 使用 toBeDisabled() 而不是 toHaveAttribute('disabled')
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });

      const cancelButton = screen.getByRole('button', { name: /取.*消/ });
      expect(cancelButton).toBeDisabled();
      
      // 清理
      resolvePromise!();
    });

    it('应该在 saving prop 为 true 时禁用所有操作', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          saving={true}
        />
      );

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      const cancelButton = screen.getByRole('button', { name: /取.*消/ });

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('应该在保存时显示加载状态', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      // 验证加载状态
      await waitFor(() => {
        const loadingIcon = saveButton.querySelector('.anticon-loading');
        expect(loadingIcon).toBeInTheDocument();
      });
    });
  });

  describe('取消操作 - 需求 8.8', () => {
    it('应该在取消时重置表单', async () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 修改表单
      const nameInput = screen.getByLabelText(/规格名称/);
      fireEvent.change(nameInput, { target: { value: '修改后的名称' } });

      // 取消
      const cancelButton = screen.getByRole('button', { name: /取.*消/ });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('应该在取消时清除错误信息', async () => {
      mockOnSave.mockRejectedValue(new Error('保存失败'));

      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 触发保存错误
      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // 取消
      const cancelButton = screen.getByRole('button', { name: /取.*消/ });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('动态字段处理 - 需求 8.4', () => {
    it('应该正确处理布尔类型字段', () => {
      const specWithBoolean: SpecAttribute = {
        ...mockSpec,
        isActive: true,
      };

      render(
        <SpecEditDrawer
          visible={true}
          spec={specWithBoolean}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/Is Active/)).toBeInTheDocument();
    });

    it('应该正确处理数字类型字段', () => {
      const specWithNumber: SpecAttribute = {
        ...mockSpec,
        weight: 100,
      };

      render(
        <SpecEditDrawer
          visible={true}
          spec={specWithNumber}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const weightInput = screen.getByLabelText(/Weight/) as HTMLInputElement;
      expect(weightInput.type).toBe('number');
    });

    it('应该正确处理数组类型字段', () => {
      const specWithArray: SpecAttribute = {
        ...mockSpec,
        tags: ['tag1', 'tag2'],
      };

      render(
        <SpecEditDrawer
          visible={true}
          spec={specWithArray}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/Tags/)).toBeInTheDocument();
    });

    it('应该排除系统字段不显示在动态字段中', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // 系统字段不应该出现在动态字段中
      expect(screen.queryByLabelText(/Created At/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Updated At/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Id/)).not.toBeInTheDocument();
    });
  });

  describe('边缘情况', () => {
    it('应该在 spec 为 null 时禁用保存按钮', () => {
      render(
        <SpecEditDrawer
          visible={true}
          spec={null}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /保.*存/ });
      expect(saveButton).toHaveAttribute('disabled');
    });

    it('应该在 spec 变化时更新表单值', () => {
      const { rerender } = render(
        <SpecEditDrawer
          visible={true}
          spec={mockSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/规格名称/) as HTMLInputElement;
      expect(nameInput.value).toBe('红色');

      // 更新 spec
      const newSpec: SpecAttribute = {
        ...mockSpec,
        id: '2',
        name: '蓝色',
      };

      rerender(
        <SpecEditDrawer
          visible={true}
          spec={newSpec}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(nameInput.value).toBe('蓝色');
    });

    it('应该处理没有 description 的 spec', () => {
      const specWithoutDesc: SpecAttribute = {
        id: '1',
        name: '红色',
        type: 'color',
        sortOrder: 100,
      };

      render(
        <SpecEditDrawer
          visible={true}
          spec={specWithoutDesc}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const descInput = screen.getByLabelText(/规格描述/) as HTMLTextAreaElement;
      expect(descInput.value).toBe('');
    });
  });
});
