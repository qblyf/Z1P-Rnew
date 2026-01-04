'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  ShoppingCart,
  Package,
  Database,
  Download,
  FileText,
  Clock,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { getUpdateLogList } from '@zsqk/z1-sdk/es/z1p/update-log';
import moment from 'moment';
import { useTokenContext } from '../datahooks/auth';

interface MenuItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

function UpdateLog(): JSX.Element {
  const [lastUpdateLogDate, setLastUpdateLogDate] = useState<string>('2025-12-30');

  useEffect(() => {
    (async () => {
      try {
        const res = await getUpdateLogList({});
        if (res.length) {
          const dateStr = moment(Number(res[0].date) * 1000).format('YYYY-MM-DD');
          setLastUpdateLogDate(dateStr);
        }
      } catch (error) {
        console.error('Failed to fetch update log:', error);
      }
    })();
  }, []);

  return (
    <div className="text-center">
      <p className="text-slate-600 text-sm font-medium mb-2">最新更新日期</p>
      <p className="text-2xl font-bold text-slate-800">{lastUpdateLogDate}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}

function ClientPage() {
  const router = useRouter();
  const { token, errMsg } = useTokenContext();

  // 如果没有 token，重定向到登录页面
  useEffect(() => {
    if (token === undefined) {
      // 还在加载中
      return;
    }

    if (!token) {
      // 没有 token，重定向到登录页面
      router.push('/token-login');
    }
  }, [token, router]);

  // 如果没有 token，显示加载状态
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-lg">正在检查登录状态...</p>
        </div>
      </div>
    );
  }

  const menuItems: MenuItem[] = [
    {
      id: 'product-manage',
      title: '商品管理',
      description: '进行 SPU 分类、SPU、SKU 的综合管理',
      href: '/product-manage',
      icon: <ShoppingCart size={24} />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'spu-list',
      title: 'SPU 列表',
      description: '可查询 SPU 基础信息',
      href: '/spu-list',
      icon: <Package size={24} />,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'sku-list',
      title: 'SKU 列表',
      description: '可查询 SKU 基础信息',
      href: '/sku-list',
      icon: <Database size={24} />,
      color: 'from-amber-500 to-amber-600',
    },
    {
      id: 'basedata-manage',
      title: '基础数据管理',
      description: '可进行多种基础数据的管理',
      href: '/basedata-manage',
      icon: <Database size={24} />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'data-export',
      title: '数据导出',
      description: '基础数据可导出为 CSV 表格',
      href: '/data-export',
      icon: <Download size={24} />,
      color: 'from-pink-500 to-pink-600',
    },
    {
      id: 'log',
      title: '更新日志',
      description: '查看系统更新日志',
      href: '/log',
      icon: <FileText size={24} />,
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      id: 'changes',
      title: '操作审计',
      description: '查看所有变动日志，以审计操作',
      href: '/changes',
      icon: <LogOut size={24} />,
      color: 'from-rose-500 to-rose-600',
    },
    {
      id: 'system-maintenance-time',
      title: '账套维护时间',
      description: '修改各账套的维护时间',
      href: '/system-maintenance-time',
      icon: <Clock size={24} />,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Z1 平台数据管理系统</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* 页面头部 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            Z1 平台数据管理系统
          </h1>
          <p className="text-slate-600 mt-1">企业级数据管理和分析平台</p>
        </div>
      </div>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 功能卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.href}>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all cursor-pointer h-full group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${item.color}`}>
                    <div className="text-white">{item.icon}</div>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="text-slate-400 group-hover:text-emerald-500 transition-colors"
                  />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* 更新日志卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">最新更新</h2>
            <Link href="/log">
              <span className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                查看全部 →
              </span>
            </Link>
          </div>
          <div className="flex justify-center py-8">
            <UpdateLog />
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-sm">
              © 2025 Z1 平台数据管理系统. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/test?gen=1">
                <span className="text-slate-600 hover:text-slate-800 text-sm transition-colors">
                  创建调试模式
                </span>
              </Link>
              <Link href="/test?clear=1">
                <span className="text-slate-600 hover:text-slate-800 text-sm transition-colors">
                  离开调试模式
                </span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}