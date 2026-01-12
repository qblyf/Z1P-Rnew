/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // 使用 Next.js 的 transpilePackages 选项
  transpilePackages: ['@zsqk/z1-sdk', '@zsqk/somefn'],
  // TODO: 启用静态导出
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
