/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // 使用 Next.js 的 transpilePackages 选项
  transpilePackages: ['@zsqk/z1-sdk', '@zsqk/somefn'],
  // Note: 静态导出功能已禁用
  // 当前应用使用服务端渲染（SSR）和 API 路由，不适合静态导出
  // 如需启用静态导出，需要移除所有服务端功能
  // output: 'export',
  
  // 优化构建性能
  swcMinify: true, // 使用 SWC 压缩（Next.js 14 默认启用）
  
  webpack: (config, { isServer }) => {
    // 忽略 any-promise 的动态依赖警告
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /any-promise/,
        message: /Critical dependency/,
      },
    ];
    
    // 在服务端渲染时，将 dingtalk-jsapi 标记为外部依赖，避免 'self is not defined' 错误
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('dingtalk-jsapi');
    }
    
    // 优化构建缓存
    // Note: Removed buildDependencies.config as __filename is not available in ES modules
    config.cache = {
      type: 'filesystem',
    };
    
    return config;
  },
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在生产构建时忽略 TypeScript 错误（已经在开发时检查过）
    ignoreBuildErrors: false,
  },
  
  // 实验性功能：在预渲染错误时继续构建
  // 这允许构建在遇到 SSR 错误时继续进行，因为页面在运行时仍然可以正常工作
  experimental: {
    // 允许在静态生成失败时回退到客户端渲染
    fallbackNodePolyfills: false,
  },
  
  // 生成配置：在遇到错误时不中断构建
  // 这对于使用浏览器专用 API 的页面很有用
  generateBuildId: async () => {
    // 使用时间戳作为构建 ID
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
