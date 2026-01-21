# 部署后缓存问题解决方案

## 问题描述

部署新版本后，用户可能遇到以下错误：

```
ChunkLoadError: Loading chunk 3185 failed.
Uncaught Error: Minified React error #423
```

## 原因

这是因为：
1. 浏览器缓存了旧版本的JavaScript文件
2. 服务器上已经是新版本，旧的chunk文件已被删除
3. 浏览器尝试加载旧的chunk文件时失败

## 解决方案

### 用户端解决方案

**方法1：硬刷新（推荐）**
- Windows/Linux: `Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**方法2：清除缓存**
1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

**方法3：清除站点数据**
1. 打开浏览器设置
2. 找到"隐私和安全"
3. 清除 `p.z1.pub` 的站点数据

### 开发端预防方案

#### 1. 添加版本号到构建输出

修改 `next.config.js`：

```javascript
const nextConfig = {
  // ... 其他配置
  
  // 添加构建ID，确保每次构建都有唯一标识
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // 或者使用git commit hash
  generateBuildId: async () => {
    const { execSync } = require('child_process');
    return execSync('git rev-parse HEAD').toString().trim();
  },
};
```

#### 2. 配置缓存策略

在 `vercel.json` 或服务器配置中设置合适的缓存头：

```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

#### 3. 添加错误边界处理

创建 `app/error.tsx`：

```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 如果是ChunkLoadError，自动刷新页面
    if (error.message.includes('ChunkLoadError') || 
        error.message.includes('Loading chunk')) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4">出错了</h2>
      <p className="text-gray-600 mb-4">
        {error.message.includes('ChunkLoadError') 
          ? '正在重新加载页面...' 
          : '页面加载失败，请刷新重试'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        刷新页面
      </button>
    </div>
  );
}
```

#### 4. 添加Service Worker清理

在部署脚本中添加版本检查：

```javascript
// public/sw.js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
```

## 最佳实践

1. **通知用户更新**
   - 在部署后显示"新版本可用"提示
   - 提供"刷新"按钮

2. **优雅降级**
   - 捕获ChunkLoadError并自动刷新
   - 显示友好的错误提示

3. **版本管理**
   - 使用语义化版本号
   - 在页面底部显示版本信息

4. **监控告警**
   - 监控ChunkLoadError发生频率
   - 及时发现部署问题

## 当前状态

目前项目已经配置了基本的错误处理（`error.tsx`），但可以进一步优化：
- 添加自动刷新逻辑
- 添加版本检查机制
- 优化缓存策略

## 参考链接

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Vercel Caching](https://vercel.com/docs/concepts/edge-network/caching)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
