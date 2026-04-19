'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MENU_CONFIG, MenuItem } from '../constant/navigation';

export interface TabItem {
  key: string;
  label: string;
  path: string;
  closable?: boolean;
}

interface TabsContextValue {
  tabs: TabItem[];
  activeKey: string;
  isPageLoading: boolean;
  addTab: (tab: TabItem) => void;
  removeTab: (key: string) => void;
  setActiveTab: (key: string) => void;
  clearOtherTabs: (key: string) => void;
  clearAllTabs: () => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const SESSION_KEY = 'z1_tabs_v1';
const MAX_TABS = 20;

function findMenuLabel(href: string, items: MenuItem[] = MENU_CONFIG): string | null {
  for (const item of items) {
    if (item.href === href) return item.label;
    if (item.children) {
      const found = findMenuLabel(href, item.children);
      if (found) return found;
    }
  }
  return null;
}

function loadTabs(): TabItem[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveTabs(tabs: TabItem[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tabs));
  } catch {
    // ignore
  }
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>(() => loadTabs());
  const [activeKey, setActiveKey] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isFirstMount = useRef(true);
  const isTabAdding = useRef(false);

  // 持久化 tabs 变化
  useEffect(() => {
    if (!isFirstMount.current) {
      saveTabs(tabs);
    }
    isFirstMount.current = false;
  }, [tabs]);

  // 监听路由变化，显示页面加载状态
  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => setIsPageLoading(false), 50);
    return () => clearTimeout(timer);
  }, [pathname]);

  // 自动添加 tab（ pathname 变化时触发）
  useEffect(() => {
    if (isTabAdding.current) return;
    isTabAdding.current = true;

    const label = findMenuLabel(pathname) || pathname.replace('/', '') || '页面';
    const key = pathname;

    setTabs((prev) => {
      const exists = prev.some((t) => t.key === key);
      if (exists) return prev;
      // 防止超过上限，移除最早的不可关闭 tab
      let next = prev;
      if (next.length >= MAX_TABS) {
        const firstClosable = next.findIndex((t) => t.closable !== false);
        if (firstClosable !== -1) {
          next = next.filter((_, i) => i !== firstClosable);
        }
      }
      const newTab: TabItem = {
        key,
        label,
        path: key,
        closable: true,
      };
      return [...next, newTab];
    });

    setActiveKey(key);

    // 重置标记
    requestAnimationFrame(() => {
      isTabAdding.current = false;
    });
  }, [pathname]);

  // 添加标签页（仅做兜顶，正常已由 useEffect 自动处理）
  const addTab = useCallback((tab: TabItem) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.key === tab.key);
      if (exists) return prev;
      const next = [...prev, { ...tab, closable: tab.closable !== false }];
      saveTabs(next);
      return next;
    });
    setActiveKey(tab.key);
  }, []);

  // 移除标签页
  const removeTab = useCallback((key: string) => {
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((t) => t.key !== key);
      saveTabs(newTabs);

      if (key === activeKey && newTabs.length > 0) {
        const idx = prevTabs.findIndex((t) => t.key === key);
        const next = newTabs[idx] || newTabs[idx - 1] || newTabs[0];
        setActiveKey(next.key);
        router.push(next.path);
      }
      return newTabs;
    });
  }, [activeKey, router]);

  // 设置激活的标签页
  const setActiveTab = useCallback((key: string) => {
    setActiveKey(key);
    const tab = tabs.find((t) => t.key === key);
    if (tab) {
      router.push(tab.path);
    }
  }, [tabs, router]);

  // 关闭其他标签页
  const clearOtherTabs = useCallback((key: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.key === key || t.closable === false);
      saveTabs(next);
      return next;
    });
    setActiveKey(key);
  }, []);

  // 关闭所有标签页
  const clearAllTabs = useCallback(() => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.closable === false);
      saveTabs(next);
      if (next.length > 0) {
        setActiveKey(next[0].key);
        router.push(next[0].path);
      }
      return next;
    });
  }, [router]);

  const contextValue = useMemo(
    () => ({
      tabs,
      activeKey,
      isPageLoading,
      addTab,
      removeTab,
      setActiveTab,
      clearOtherTabs,
      clearAllTabs,
    }),
    [tabs, activeKey, isPageLoading, addTab, removeTab, setActiveTab, clearOtherTabs, clearAllTabs]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within TabsProvider');
  }
  return context;
}
