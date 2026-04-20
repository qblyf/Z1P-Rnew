'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Database,
  Download,
  FileText,
  Clock,
  ArrowUpRight,
  Search,
  Barcode,
  FolderOpen,
  RefreshCw,
  Users,
  History,
  CheckCircle,
  Zap,
  ChevronRight,
  Calendar,
  Tag,
} from 'lucide-react';
import { getUpdateLogList } from '@zsqk/z1-sdk/es/z1p/update-log';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useTokenContext } from '../datahooks/auth';
import { detectDeviceType } from '../utils/deviceDetect';
import './home.css';

interface MenuItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
}

interface RecentUpdate {
  version: string;
  date: number;
  content: string;
}

function HomeContent(): JSX.Element {
  const router = useRouter();
  const { token } = useTokenContext();
  const { payload } = useTokenContext();
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);

  useEffect(() => {
    setDeviceType(detectDeviceType());
  }, []);

  const getLoginPage = useCallback(() => {
    if (deviceType === 'mobile') return '/qr-login-mobile';
    return '/qr-login-desk';
  }, [deviceType]);

  useEffect(() => {
    if (!deviceType) return;
    if (token === null || token === undefined) {
      router.push(getLoginPage());
    }
  }, [token, router, deviceType, getLoginPage]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUpdateLogList({});
        if (res.length > 0) {
          setRecentUpdates(
            res.slice(0, 5).map((item: any) => ({
              version: item.version || 'v?.?',
              date: Number(item.date || 0),
              content: item.content || '',
            }))
          );
        }
      } catch (e) {
        console.error('Failed to fetch update logs:', e);
      }
    })();
  }, []);

  if (!token) {
    return (
      <div className="home-loading">
        <div className="home-loading-spinner" />
        <span>正在检查登录状态...</span>
      </div>
    );
  }

  const menuItems: MenuItem[] = [
    {
      id: 'product-manage',
      title: '商品管理',
      description: 'SPU 分类、SPU、SKU 综合管理',
      href: '/product-manage',
      icon: <ShoppingCart size={24} />,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      id: 'spu-list',
      title: 'SPU 列表',
      description: '查询 SPU 基础信息',
      href: '/spu-list',
      icon: <Package size={24} />,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'sku-list',
      title: 'SKU 列表',
      description: '查询 SKU 基础信息',
      href: '/sku-list',
      icon: <Database size={24} />,
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      id: 'basedata-manage',
      title: '基础数据',
      description: '多种基础数据管理',
      href: '/basedata-manage',
      icon: <FolderOpen size={24} />,
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      id: 'smart-match-v2',
      title: '在线匹配',
      description: '智能商品名称匹配',
      href: '/smart-match-v2',
      icon: <Zap size={24} />,
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {
      id: 'gtin-query',
      title: '69码查询',
      description: '批量查询商品条码',
      href: '/gtin-query',
      icon: <Barcode size={24} />,
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      id: 'data-export',
      title: '数据导出',
      description: '基础数据导出为 CSV',
      href: '/data-export',
      icon: <Download size={24} />,
      gradient: 'from-rose-500 to-rose-600',
    },
    {
      id: 'log',
      title: '帐套日志',
      description: '系统更新记录',
      href: '/log',
      icon: <FileText size={24} />,
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  const quickLinks = [
    { label: '操作审计', href: '/changes', icon: <History size={16} /> },
    { label: '账套管理', href: '/tenant-manage', icon: <Users size={16} /> },
    { label: '数据同步', href: '/sync', icon: <RefreshCw size={16} /> },
    { label: 'SPU 命名检查', href: '/spu-name-check', icon: <CheckCircle size={16} /> },
    { label: '维护时间', href: '/system-maintenance-time', icon: <Clock size={16} /> },
    { label: '平台日志', href: '/product-platform-changelog', icon: <FileText size={16} /> },
  ];

  return (
    <div className="home">
      {/* 顶部英雄区 */}
      <div className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-left">
            <div className="home-greeting">
              <span className="home-greeting-label">欢迎回来</span>
              <h1 className="home-greeting-name">
                {payload?.name || '用户'}
                <span className="home-greeting-wave">👋</span>
              </h1>
            </div>
            <p className="home-greeting-date">
              <Calendar size={14} />
              {dayjs().format('YYYY年MM月DD日 dddd')}
            </p>
          </div>
          <div className="home-hero-right">
            <div className="home-quick-actions">
              {quickLinks.slice(0, 3).map((link) => (
                <Link key={link.href} href={link.href} className="home-quick-action">
                  {link.icon}
                  <span>{link.label}</span>
                  <ChevronRight size={14} className="home-quick-action-arrow" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 功能模块 */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">功能模块</h2>
          <p className="home-section-subtitle">快速访问常用功能</p>
        </div>
        <div className="home-grid">
          {menuItems.map((item) => (
            <Link key={item.id} href={item.href} className="home-card">
              <div className={`home-card-icon-wrap bg-gradient-to-br ${item.gradient}`}>
                <div className="home-card-icon">{item.icon}</div>
              </div>
              <div className="home-card-info">
                <h3 className="home-card-title">{item.title}</h3>
                <p className="home-card-desc">{item.description}</p>
              </div>
              <ArrowUpRight size={16} className="home-card-arrow" />
            </Link>
          ))}
        </div>
      </div>

      {/* 底部两栏 */}
      <div className="home-bottom">
        {/* 最新更新 */}
        <div className="home-updates">
          <div className="home-updates-header">
            <h2 className="home-updates-title">
              <FileText size={18} />
              最新更新
            </h2>
            <Link href="/log" className="home-updates-more">
              查看全部
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="home-updates-list">
            {recentUpdates.map((update, idx) => (
              <Link key={idx} href="/log" className="home-update-item">
                <div className="home-update-left">
                  <Tag className="home-update-tag">
                    {update.version}
                  </Tag>
                  <span className="home-update-date">
                    {dayjs(update.date * 1000).format('MM-DD')}
                  </span>
                </div>
                <p className="home-update-content">{update.content}</p>
                <ArrowUpRight size={14} className="home-update-arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="home-shortcuts">
          <div className="home-shortcuts-header">
            <h2 className="home-shortcuts-title">
              <Search size={18} />
              快捷入口
            </h2>
          </div>
          <div className="home-shortcuts-grid">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="home-shortcut-item">
                <span className="home-shortcut-icon">{link.icon}</span>
                <span className="home-shortcut-label">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="home-footer">
        <p>© {new Date().getFullYear()} Z1 商品平台 · 企业级数据管理与分析</p>
        <div className="home-footer-links">
          <Link href="/test?gen=1">创建调试模式</Link>
          <Link href="/test?clear=1">离开调试模式</Link>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
