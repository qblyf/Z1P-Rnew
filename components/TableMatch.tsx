'use client';

import { useState } from 'react';
import { Card, Button, message } from 'antd';
import { Upload } from 'lucide-react';

/**
 * TableMatch 组件
 * 用于批量匹配商品信息
 */
export function TableMatchComponent() {
  const [loading, setLoading] = useState(false);

  return (
    <Card title="表格匹配" className="w-full">
      <div className="space-y-4">
        <div className="text-gray-600">
          <p>表格匹配功能正在开发中...</p>
        </div>
        <Button 
          type="primary" 
          icon={<Upload size={16} />}
          disabled
        >
          上传文件
        </Button>
      </div>
    </Card>
  );
}
