'use client';

import { useEffect } from 'react';
import { useTabs, TabItem } from './tabs';
import { usePathname } from 'next/navigation';

/**
 * 自动注册页面标签页的 Hook
 * @param label 标签页显示的标题
 * @param closable 是否可关闭，默认为 true
 */
export function usePageTab(label: string, closable: boolean = true) {
  const { addTab } = useTabs();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && label) {
      addTab({
        key: pathname,
        label,
        path: pathname,
        closable,
      });
    }
  }, [pathname, label, closable, addTab]);
}
