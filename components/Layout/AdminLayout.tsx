'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, memo, Suspense } from 'react';
import { Sidebar } from '../Navigation/Sidebar';
import { TopNavbar } from '../Navigation/TopNavbar';
import { TabBar } from '../Navigation/TabBar';
import { useTokenContext } from '../../datahooks/auth';
import { AdminLayoutSkeleton } from '../Skeleton/AdminLayoutSkeleton';
import { PageSkeleton } from '../Skeleton/PageSkeleton';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 不需要认证的页面列表
const PUBLIC_PAGES = ['/qr-login-desk', '/qr-login-mobile'];

export const AdminLayout = memo(function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isTokenExpired } = useTokenContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    // 如果是公开页面，不需要检查认证
    if (PUBLIC_PAGES.includes(pathname)) {
      return;
    }

    // 如果还在加载中，不做任何操作
    if (token === undefined) {
      return;
    }

    // 如果 token 已过期，重定向到登录页面
    if (isTokenExpired) {
      router.replace('/qr-login-desk');
      return;
    }

    // 如果没有 token，重定向到 qr-login-desk 登录页面
    if (!token) {
      router.replace('/qr-login-desk');
    }
  }, [token, pathname, router, isTokenExpired]);

  // 如果是公开页面，直接渲染
  if (PUBLIC_PAGES.includes(pathname)) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  // 如果 token 还在加载中，显示骨架屏
  if (token === undefined) {
    return <AdminLayoutSkeleton />;
  }

  // 如果没有 token 或 token 已过期，不渲染任何内容（会立即重定向）
  if (!token || isTokenExpired) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 - 一级菜单 */}
      <TopNavbar />
      
      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 - 二级菜单 */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        
        {/* 内容区域 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 固定区域：标签页 */}
          <div className="flex-shrink-0 bg-white">
            <TabBar />
          </div>
          
          {/* 可滚动的内容区域 */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Suspense fallback={<PageSkeleton rows={6} />}>
                {children}
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
});
