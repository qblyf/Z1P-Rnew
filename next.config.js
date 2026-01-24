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
  webpack: (config, { isServer }) => {
    // 忽略 any-promise 的动态依赖警告
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /any-promise/,
        message: /Critical dependency/,
      },
    ];
    return config;
  },
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
