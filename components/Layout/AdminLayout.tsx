'use client';

import { Navbar } from '../Navigation/Navbar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
