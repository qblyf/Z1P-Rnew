'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Form, Input, Button, message, Space, Select } from 'antd';
import { SpecAttribute, SpecAttributeType } from '../types';

/**
 * SpecEditDrawer 组件属性
 * 
 * 需求: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */
export interface SpecEditDrawerProps {
  /** 抽屉是否可见 */
  visible: boolean;
  
  /** 正在编辑的规格属性（null 表示未选中） */
  spec: SpecAttribute | null;
  
  /** 保存回调函数 */
  onSave: (updatedSpec: SpecAttribute) => Promise<void>;
  
  /** 取消/关闭回调函数 */
  onCancel: () => void;
  
  /** 是否正在保存 */
  saving?: boolean;
}

/**
 * SpecEditDrawer 组件
 * 
 * 编辑规格属性的抽屉组件，功能包括：
 * - 显示所有可编辑字段（动态读取 SDK 返回的字段）
 * - 实现表单验证
 * - 处理保存和取消操作
 * - 显示保存状态和错误信息
 * 
 * 需求:
 * - 8.2: 点击编辑按钮打开抽屉
 * - 8.3: 显示规格属性的所有可编辑字段
 * - 8.4: 从 SDK 接口返回的数据结构中读取所有可编辑字段
 * - 8.5: 调用 editSpuSpecAttribute SDK 接口更新数据
 * - 8.6: 编辑保存成功后关闭抽屉并刷新列表
 * - 8.7: 编辑保存失败时显示错误信息并保持抽屉打开
 * - 8.8: 点击取消或关闭按钮时关闭抽屉并放弃未保存的修改
 */
export const SpecEditDrawer: React.FC<SpecEditDrawerProps> = ({
  visible,
  spec,
  onSave,
  onCancel,
  saving = false,
}) => {
  const [form] = Form.useForm();
  const [localSaving, setLocalSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当 spec 变化时，更新表单值
  useEffect(() => {
    if (spec && visible) {
      // 动态读取所有字段 - 需求 8.4
      form.setFieldsValue({
        name: spec.name,
        description: spec.description || '',
        type: spec.type,
        sortOrder: spec.sortOrder,
        // 动态添加其他可编辑字段
        ...getEditableFields(spec),
      });
      setError(null);
    }
  }, [spec, visible, form]);

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setError(null);
  };

  /**
   * 从规格属性对象中提取所有可编辑字段
   * 排除系统字段和只读字段
   * 
   * 需求 8.4: 动态读取 SDK 返回的字段
   */
  const getEditableFields = (spec: SpecAttribute): Record<string, any> => {
    const systemFields = [
      'id',
      'name',
      'description',
      'type',
      'sortOrder',
      'createdAt',
      'updatedAt',
      'createdBy',
      'updatedBy',
      '_sdkData', // 内部使用的 SDK 原始数据
    ];

    const editableFields: Record<string, any> = {};

    // 遍历所有字段，排除系统字段
    Object.keys(spec).forEach((key) => {
      if (!systemFields.includes(key)) {
        editableFields[key] = spec[key];
      }
    });

    return editableFields;
  };

  /**
   * 渲染动态字段
   * 根据字段类型自动选择合适的表单控件
   * 
   * 需求 8.3, 8.4: 显示所有可编辑字段
   */
  const renderDynamicFields = () => {
    if (!spec) return null;

    const editableFields = getEditableFields(spec);
    const fieldKeys = Object.keys(editableFields);

    if (fieldKeys.length === 0) {
      return null;
    }

    return (
      <>
        <div className="text-sm font-medium text-gray-700 mb-2 mt-4">
          其他字段
        </div>
        {fieldKeys.map((key) => {
          const value = editableFields[key];
          const fieldType = typeof value;

          // 根据字段类型选择合适的表单控件
          if (fieldType === 'boolean') {
            return (
              <Form.Item
                key={key}
                name={key}
                label={formatFieldLabel(key)}
                valuePropName="checked"
              >
                <Select>
                  <Select.Option value={true}>是</Select.Option>
                  <Select.Option value={false}>否</Select.Option>
                </Select>
              </Form.Item>
            );
          } else if (fieldType === 'number') {
            return (
              <Form.Item
                key={key}
                name={key}
                label={formatFieldLabel(key)}
                rules={[
                  {
                    type: 'number',
                    message: '请输入有效的数字',
                  },
                ]}
              >
                <Input type="number" />
              </Form.Item>
            );
          } else if (Array.isArray(value)) {
            return (
              <Form.Item
                key={key}
                name={key}
                label={formatFieldLabel(key)}
                tooltip="多个值用逗号分隔"
              >
                <Input placeholder="多个值用逗号分隔" />
              </Form.Item>
            );
          } else {
            return (
              <Form.Item key={key} name={key} label={formatFieldLabel(key)}>
                <Input />
              </Form.Item>
            );
          }
        })}
      </>
    );
  };

  /**
   * 格式化字段标签
   * 将驼峰命名转换为可读的标签
   */
  const formatFieldLabel = (key: string): string => {
    // 将驼峰命名转换为空格分隔的单词，并确保每个单词首字母大写
    return key
      .replace(/([A-Z])/g, ' $1') // 在大写字母前添加空格
      .replace(/^./, (str) => str.toUpperCase()) // 首字母大写
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // 每个单词首字母大写
      .join(' ')
      .trim();
  };

  /**
   * 处理表单提交
   * 
   * 需求 8.5: 调用 SDK 接口更新数据
   * 需求 8.6: 保存成功后关闭抽屉
   * 需求 8.7: 保存失败时显示错误信息
   */
  const handleSubmit = async () => {
    if (!spec) return;

    try {
      // 验证表单
      const values = await form.validateFields();
      setError(null);
      setLocalSaving(true);

      // 构建更新对象
      const updatedSpec: SpecAttribute = {
        ...spec,
        ...values,
      };

      // 调用保存回调 - 需求 8.5
      await onSave(updatedSpec);

      // 保存成功 - 需求 8.6
      message.success('保存成功');
      handleReset();
    } catch (err: any) {
      // 保存失败 - 需求 8.7
      if (err.errorFields) {
        // 表单验证错误
        setError('请检查表单输入');
      } else {
        // SDK 调用错误
        const errorMessage = err.message || '保存失败，请重试';
        setError(errorMessage);
        message.error(errorMessage);
      }
    } finally {
      setLocalSaving(false);
    }
  };

  /**
   * 处理取消操作
   * 
   * 需求 8.8: 关闭抽屉并放弃未保存的修改
   */
  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const isSaving = saving || localSaving;

  return (
    <Drawer
      title="编辑规格属性"
      placement="right"
      width={480}
      open={visible}
      onClose={handleCancel}
      maskClosable={!isSaving}
      keyboard={!isSaving}
      footer={
        <Space className="flex justify-end">
          <Button onClick={handleCancel} disabled={isSaving}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isSaving}
            disabled={!spec || isSaving}
          >
            保存
          </Button>
        </Space>
      }
    >
      {spec && (
        <Form
          form={form}
          layout="vertical"
          disabled={isSaving}
          data-testid="spec-edit-form"
        >
          {/* 错误提示 - 需求 8.7 */}
          {error && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
              data-testid="error-message"
            >
              {error}
            </div>
          )}

          {/* 基本字段 - 需求 8.3 */}
          <Form.Item
            name="name"
            label="规格名称"
            rules={[
              { required: true, message: '请输入规格名称' },
              { max: 100, message: '规格名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入规格名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="规格描述"
            rules={[{ max: 500, message: '规格描述不能超过500个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入规格描述"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="规格类型"
            rules={[{ required: true, message: '请选择规格类型' }]}
          >
            <Select disabled>
              <Select.Option value="version">版本</Select.Option>
              <Select.Option value="config">配置</Select.Option>
              <Select.Option value="color">颜色</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="排序序号"
            rules={[
              { required: true, message: '请输入排序序号' },
              {
                type: 'number',
                min: 1,
                message: '排序序号必须是正整数',
              },
            ]}
            tooltip="数值越大越靠前"
          >
            <Input type="number" placeholder="请输入排序序号" />
          </Form.Item>

          {/* 动态字段 - 需求 8.4 */}
          {renderDynamicFields()}
        </Form>
      )}

      {!spec && (
        <div className="text-center text-gray-500 py-8">
          未选择规格属性
        </div>
      )}
    </Drawer>
  );
};

export default SpecEditDrawer;
