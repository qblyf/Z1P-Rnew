'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error('Application error:', error);

    // 如果是ChunkLoadError，自动刷新页面
    if (
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module')
    ) {
      console.log('检测到资源加载错误，3秒后自动刷新页面...');
      const timer = setTimeout(() => {
        window.location.reload();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  // 判断是否是资源加载错误
  const isChunkError =
    error.message.includes('ChunkLoadError') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module');

  if (isChunkError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Result
          status="warning"
          title="页面资源加载失败"
          subTitle="检测到新版本，正在自动刷新页面..."
          extra={[
            <Button
              type="primary"
              key="reload"
              onClick={() => window.location.reload()}
            >
              立即刷新
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Result
        status="error"
        title="页面加载出错"
        subTitle={error.message || '抱歉，页面加载时发生了错误'}
        extra={[
          <Button type="primary" key="reload" onClick={() => window.location.reload()}>
            刷新页面
          </Button>,
          <Button key="reset" onClick={reset}>
            重试
          </Button>,
        ]}
      />
    </div>
  );
}
