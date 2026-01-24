'use client';

import { Loader2, Search } from 'lucide-react';
import { Button, Card, Input } from 'antd';

interface InputPanelProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onMatch: () => void;
  onClear: () => void;
  loading: boolean;
  spuCount: number;
  disabled?: boolean;
}

export function InputPanel({
  inputText,
  onInputChange,
  onMatch,
  onClear,
  loading,
  spuCount,
  disabled = false,
}: InputPanelProps) {
  return (
    <Card 
      className="flex-1 flex flex-col" 
      styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <div className="flex flex-col h-full">
        <div className="mb-4 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">
              输入商品名称（每行一个）
            </label>
            <div className="text-sm text-slate-500">
              已加载 {spuCount} 个SPU
            </div>
          </div>
          <Input.TextArea
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="请输入商品名称，每行一个&#10;例如：&#10;华为 Mate 60 Pro 12+256 雅川青&#10;苹果 iPhone 15 Pro Max 256GB 钛金色&#10;小米14 Ultra 16GB+512GB 黑色"
            className="flex-1"
            style={{ height: '100%', minHeight: '400px', resize: 'none' }}
            disabled={loading || disabled}
          />
        </div>

        <div className="mt-auto space-y-3">
          <div className="text-sm text-slate-500">
            支持批量输入，系统将先匹配SPU，再匹配对应的SKU参数（容量、颜色）
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClear}
              disabled={loading}
              block
            >
              清空
            </Button>
            <Button
              type="primary"
              icon={loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              onClick={onMatch}
              disabled={loading || !inputText.trim() || disabled}
              block
            >
              {loading ? '匹配中...' : '开始匹配'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
