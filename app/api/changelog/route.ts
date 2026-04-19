import { NextResponse } from 'next/server';

interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  version?: string;
  humanReadable: string;
}

// 静态更新日志数据 - 每次发布时更新
const CHANGELOG_DATA: CommitInfo[] = [
  {
    hash: '9d83b3d',
    shortHash: '9d83b3d',
    message: '[v1.0.61] chore: 添加 git log 调试日志',
    author: 'Harmony',
    date: '2026-04-19 21:32:00 +0800',
    version: '1.0.61',
    humanReadable: '添加 git log 调试日志',
  },
  {
    hash: '5928282',
    shortHash: '5928282',
    message: '[v1.0.60] chore: 项目名称从"Z1 数据管理平台"改为"Z1 商品平台"',
    author: 'Harmony',
    date: '2026-04-19 21:26:52 +0800',
    version: '1.0.60',
    humanReadable: '项目名称从"Z1 数据管理平台"改为"Z1 商品平台"',
  },
  {
    hash: '421e1ad',
    shortHash: '421e1ad',
    message: '[v1.0.59] fix: 修复更新日志日期格式显示问题',
    author: 'Harmony',
    date: '2026-04-19 21:23:25 +0800',
    version: '1.0.59',
    humanReadable: '修复更新日志日期格式显示问题',
  },
  {
    hash: '85ca51a',
    shortHash: '85ca51a',
    message: '[v1.0.58] fix: 删除遗留的 SmartMatch.tsx 文件',
    author: 'Harmony',
    date: '2026-04-19 21:17:38 +0800',
    version: '1.0.58',
    humanReadable: '删除遗留的 SmartMatch.tsx 文件',
  },
  {
    hash: 'a98bff2',
    shortHash: 'a98bff2',
    message: '[v1.0.57] feat: 商品平台更新日志添加分页功能',
    author: 'Harmony',
    date: '2026-04-19 21:15:43 +0800',
    version: '1.0.57',
    humanReadable: '商品平台更新日志添加分页功能',
  },
  {
    hash: '5683522',
    shortHash: '5683522',
    message: '[v1.0.56] refactor: 删除老版在线匹配功能，仅保留在线匹配V2',
    author: 'Harmony',
    date: '2026-04-19 21:08:00 +0800',
    version: '1.0.56',
    humanReadable: '删除老版在线匹配功能，仅保留在线匹配V2',
  },
  {
    hash: '0636e2e',
    shortHash: '0636e2e',
    message: '[v1.0.55] feat: SmartMatchV2 匹配结果支持导出 Excel',
    author: 'Harmony',
    date: '2026-04-19 20:59:00 +0800',
    version: '1.0.55',
    humanReadable: 'SmartMatchV2 匹配结果支持导出 Excel',
  },
  {
    hash: '4ee65c0',
    shortHash: '4ee65c0',
    message: '[v1.0.54] fix: SmartMatchV2 导入 Excel 后不自动匹配',
    author: 'Harmony',
    date: '2026-04-19 20:53:00 +0800',
    version: '1.0.54',
    humanReadable: 'SmartMatchV2 导入 Excel 后不自动匹配',
  },
  {
    hash: 'fe393e5',
    shortHash: 'fe393e5',
    message: '[v1.0.53] chore: ResultTable 筛选仅保留已匹配和未匹配',
    author: 'Harmony',
    date: '2026-04-19 20:48:00 +0800',
    version: '1.0.53',
    humanReadable: 'ResultTable 筛选仅保留已匹配和未匹配',
  },
  {
    hash: 'e3b1e6f',
    shortHash: 'e3b1e6f',
    message: '[v1.0.52] feat: SmartMatchV2 蒙版增加匹配进度显示',
    author: 'Harmony',
    date: '2026-04-19 20:42:00 +0800',
    version: '1.0.52',
    humanReadable: 'SmartMatchV2 蒙版增加匹配进度显示',
  },
  {
    hash: 'a9c27b5',
    shortHash: 'a9c27b5',
    message: '[v1.0.51] feat: SmartMatchV2 添加全局蒙版避免匹配中用户操作',
    author: 'Harmony',
    date: '2026-04-19 20:38:00 +0800',
    version: '1.0.51',
    humanReadable: 'SmartMatchV2 添加全局蒙版避免匹配中用户操作',
  },
  {
    hash: '233d026',
    shortHash: '233d026',
    message: '[v1.0.50] fix: 禁用版本 API 缓存解决版本号显示滞后',
    author: 'Harmony',
    date: '2026-04-19 20:32:00 +0800',
    version: '1.0.50',
    humanReadable: '禁用版本 API 缓存解决版本号显示滞后',
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedCommits = CHANGELOG_DATA.slice(start, end);

  return NextResponse.json({
    commits: paginatedCommits,
    total: CHANGELOG_DATA.length,
    page,
    limit,
    totalPages: Math.ceil(CHANGELOG_DATA.length / limit),
  });
}
