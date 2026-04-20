'use client';

import { useState, useEffect } from 'react';
import { Input, Button, Upload, Card, Space, notification, Typography, Modal, Select } from 'antd';
import { UploadOutlined, ClearOutlined, PlayCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useMatch } from './MatchContext';

const { TextArea } = Input;
const { Text } = Typography;

interface InputAreaProps {
  onMatch?: () => void;
}

export function InputArea({ onMatch }: InputAreaProps) {
  const [inputText, setInputText] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [excelData, setExcelData] = useState<Record<string, any>[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const { state, startMatch, clearResults } = useMatch();

  // 监听初始化状态
  useEffect(() => {
    if (state.status === 'ready') {
      setIsReady(true);
    } else if (state.status === 'initializing') {
      setIsReady(false);
    }
  }, [state.status]);

  // 手动开始匹配
  const handleStartMatch = () => {
    const lines = inputText.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      notification.warning({ message: '请输入商品名称' });
      return;
    }
    clearResults();
    startMatch(lines);
    onMatch?.();
  };

  // 清空
  const handleClear = () => {
    setInputText('');
    clearResults();
  };

  // Excel 上传 - 先读取并让用户选择列
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onError } = options;
    const xlsx = await import('xlsx');

    try {
      let arrayBuffer: ArrayBuffer;

      if (typeof file === 'string') {
        // 如果是字符串（base64 或 URL），需要先获取
        const response = await fetch(file);
        arrayBuffer = await response.arrayBuffer();
      } else {
        // File 对象直接转为 ArrayBuffer
        arrayBuffer = await file.arrayBuffer();
      }

      const wb = xlsx.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(ws);

      if (data.length === 0) {
        notification.warning({ message: 'Excel 文件为空' });
        onError?.(new Error('Excel 文件为空'));
        return;
      }

      // 获取所有列名
      const headers = Object.keys(data[0] as object);
      if (headers.length === 0) {
        notification.warning({ message: '未找到有效列' });
        onError?.(new Error('未找到有效列'));
        return;
      }

      // 保存数据用于后续处理
      setExcelData(data as Record<string, any>[]);
      setExcelHeaders(headers);

      // 自动选择最可能的商品名称列
      const defaultColumn = headers.find(
        (h) => h.includes('名称') || h.includes('商品') || h.includes('name') || h.includes('product')
      ) || headers[0];
      setSelectedColumn(defaultColumn);

      // 打开列选择弹窗
      setColumnModalOpen(true);
    } catch (error) {
      console.error('解析 Excel 失败:', error);
      notification.error({ message: '解析 Excel 失败' });
      onError?.(error as Error);
    }
  };

  // 关闭弹窗并清理数据
  const handleModalClose = () => {
    setColumnModalOpen(false);
    setExcelData([]);
    setExcelHeaders([]);
    setSelectedColumn('');
  };

  // 确认选择列并提取数据
  const handleColumnConfirm = () => {
    if (!selectedColumn || excelData.length === 0) {
      notification.warning({ message: '请选择有效列' });
      return;
    }

    // 提取商品名称
    const productNames = excelData
      .map((row) => String(row[selectedColumn] || '').trim())
      .filter(Boolean);

    if (productNames.length === 0) {
      notification.warning({ message: '所选列无有效数据' });
      return;
    }

    // 只更新输入框，不自动开始匹配
    setInputText(productNames.join('\n'));

    notification.success({ message: `已导入 ${productNames.length} 条数据，请点击"开始匹配"` });
    handleModalClose();
  };

  // 计算行数
  const lineCount = inputText.split('\n').filter((line) => line.trim()).length;

  return (
    <>
      <Card
      title="输入商品"
      extra={
        <Space>
          <Text type="secondary">{lineCount > 0 ? `${lineCount} 条` : ''}</Text>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            customRequest={handleUpload}
          >
            <Button icon={<FileExcelOutlined />}>Excel导入</Button>
          </Upload>
          <Button icon={<ClearOutlined />} onClick={handleClear} disabled={!inputText || state.status === 'matching'}>
            清空
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartMatch}
            disabled={!isReady || !inputText.trim() || state.status === 'matching'}
          >
            {state.status === 'matching' ? '匹配中...' : '开始匹配'}
          </Button>
        </Space>
      }
    >
      <TextArea
        placeholder="输入商品名称，每行一条...
或者粘贴多行商品名称"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={6}
        disabled={state.status === 'matching'}
      />

      <div className="mt-2">
        <Text type="secondary" className="text-xs">
          💡 支持直接粘贴多行商品名称，或导入 Excel 后点击「开始匹配」
        </Text>
      </div>
    </Card>

    {/* 列选择弹窗 */}
    <Modal
      title="选择商品名称列"
      open={columnModalOpen}
      onOk={handleColumnConfirm}
      onCancel={handleModalClose}
      okText="确认"
      cancelText="取消"
    >
      <div className="py-4">
        <p className="mb-4">请选择包含商品名称的列：</p>
        <Select
          style={{ width: '100%' }}
          value={selectedColumn}
          onChange={setSelectedColumn}
          options={excelHeaders.map((header) => ({
            label: header,
            value: header,
          }))}
          placeholder="选择列"
        />
        {excelData.length > 0 && (
          <p className="mt-4 text-gray-500 text-sm">
            共 {excelData.length} 行数据
          </p>
        )}
      </div>
    </Modal>
    </>
  );
}
