'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button, Checkbox, Dropdown, message } from 'antd';

interface ColumnSelectorProps {
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
}

const COLUMN_OPTIONS = [
  { key: 'inputName', label: '输入商品名称' },
  { key: 'matchedSPU', label: '匹配的SPU' },
  { key: 'specs', label: '规格标签' },
  { key: 'matchedSKU', label: '匹配的SKU' },
  { key: 'matchedBrand', label: '品牌' },
  { key: 'matchedGtins', label: '69码' },
  { key: 'statusAndSimilarity', label: '状态/相似度' },
];

export function ColumnSelector({ visibleColumns, onVisibleColumnsChange }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState<string[]>(visibleColumns);

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setTempColumns(visibleColumns);
    }
    setOpen(visible);
  };

  const handleConfirm = () => {
    onVisibleColumnsChange(tempColumns);
    setOpen(false);
    message.success('已更新显示列');
  };

  const handleCancel = () => {
    setTempColumns(visibleColumns);
    setOpen(false);
  };

  const handleToggle = (key: string, checked: boolean) => {
    if (checked) {
      setTempColumns([...tempColumns, key]);
    } else {
      setTempColumns(tempColumns.filter(c => c !== key));
    }
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      dropdownRender={() => (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3" style={{ minWidth: '200px' }}>
          <div className="mb-2 pb-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">选择显示列</span>
          </div>
          <div className="space-y-2 mb-3">
            {COLUMN_OPTIONS.map(option => (
              <Checkbox
                key={option.key}
                checked={tempColumns.includes(option.key)}
                onChange={(e) => handleToggle(option.key, e.target.checked)}
              >
                {option.label}
              </Checkbox>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button size="small" onClick={handleCancel} block>
              取消
            </Button>
            <Button type="primary" size="small" onClick={handleConfirm} block>
              确定
            </Button>
          </div>
        </div>
      )}
      trigger={['click']}
    >
      <Button icon={<Settings size={16} />} size="small">
        显示列
      </Button>
    </Dropdown>
  );
}
