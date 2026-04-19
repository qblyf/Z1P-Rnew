'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeKey, setActiveKey] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 监听路由变化，显示页面加载状态
  useEffect(() => {
    // 路由变化时显示加载状态
    setIsPageLoading(true);
    // 模拟一个短暂延迟后隐藏加载状态
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  // 添加标签页
  const addTab = useCallback((tab: TabItem) => {
    setTabs((prevTabs) => {
      const exists = prevTabs.find((t) => t.key === tab.key);
      if (exists) {
        return prevTabs;
      }
      return [...prevTabs, tab];
    });
    setActiveKey(tab.key);
  }, []);

  // 移除标签页
  const removeTab = useCallback((key: string) => {
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((t) => t.key !== key);
      
      // 如果删除的是当前激活的标签页，需要切换到其他标签页
      if (key === activeKey && newTabs.length > 0) {
        const index = prevTabs.findIndex((t) => t.key === key);
        const nextTab = newTabs[index] || newTabs[index - 1] || newTabs[0];
        setActiveKey(nextTab.key);
        router.push(nextTab.path);
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
    setTabs((prevTabs) => prevTabs.filter((t) => t.key === key || !t.closable));
    setActiveKey(key);
  }, []);

  // 关闭所有标签页
  const clearAllTabs = useCallback(() => {
    setTabs((prevTabs) => prevTabs.filter((t) => !t.closable));
    if (tabs.length > 0) {
      const firstTab = tabs.find((t) => !t.closable);
      if (firstTab) {
        setActiveKey(firstTab.key);
        router.push(firstTab.path);
      }
    }
  }, [tabs, router]);

  // 监听路由变化，自动更新激活的标签页
  useEffect(() => {
    const currentTab = tabs.find((t) => t.path === pathname);
    if (currentTab && currentTab.key !== activeKey) {
      setActiveKey(currentTab.key);
    }
  }, [pathname, tabs, activeKey]);

  // 使用 useMemo 缓存 context 值，避免不必要的重新渲染
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
