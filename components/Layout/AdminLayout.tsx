'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '../Navigation/Sidebar';
import { TopNavbar } from '../Navigation/TopNavbar';
import { useTokenContext } from '../../datahooks/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 不需要认证的页面列表
const PUBLIC_PAGES = ['/qr-login-desk', '/qr-login-mobile'];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isTokenExpired } = useTokenContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
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
      <div className="flex flex-col min-h-screen bg-slate-50">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  // 如果没有 token 或 token 已过期，不渲染任何内容（会立即重定向）
  if (!token || isTokenExpired) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
      
      {/* Mobile Sidebar */}
      <Sidebar 
        isMobile={true}
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => {
            if (window.innerWidth >= 1024) {
              toggleSidebar();
            } else {
              toggleMobileMenu();
            }
          }} 
        />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
