'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigation } from '../../datahooks/navigation';

export function Breadcrumb() {
  const { breadcrumbs, currentMenu } = useNavigation();

  if (!currentMenu) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Link href="/" className="flex items-center gap-1 hover:text-slate-800 transition-colors">
        <Home size={16} />
        <span>首页</span>
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-slate-400" />
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-800 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
