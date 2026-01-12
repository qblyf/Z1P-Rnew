'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '../Navigation/Navbar';
import { useTokenContext } from '../../datahooks/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 不需要认证的页面列表
const PUBLIC_PAGES = ['/qr-login-desk', '/qr-login-mobile'];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useTokenContext();

  useEffect(() => {
    // 如果是公开页面，不需要检查认证
    if (PUBLIC_PAGES.includes(pathname)) {
      return;
    }

    // 如果还在加载中，不做任何操作
    if (token === undefined) {
      return;
    }

    // 如果没有 token，重定向到 qr-login-desk 登录页面
    if (!token) {
      router.replace('/qr-login-desk');
    }
  }, [token, pathname, router]);

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

  // 如果没有 token，不渲染任何内容（会立即重定向）
  if (!token) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
