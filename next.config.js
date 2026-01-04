/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // 使用 Next.js 的 transpilePackages 选项
  transpilePackages: ['@zsqk/z1-sdk', '@zsqk/somefn'],
  // TODO: 启用静态导出
  // output: 'export',
};

export default nextConfig;
