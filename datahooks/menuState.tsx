'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MENU_CONFIG, MenuItem } from '../constant/navigation';

interface MenuStateContextValue {
  selectedParentMenuId: string | null;
  setSelectedParentMenuId: (id: string) => void;
}

const MenuStateContext = createContext<MenuStateContextValue | undefined>(undefined);

export function MenuStateProvider({ children }: { children: ReactNode }) {
  const [selectedParentMenuId, setSelectedParentMenuId] = useState<string | null>(null);
  const pathname = usePathname();

  // 缓存查找函数
  const findParentMenuByPath = useCallback((path: string): MenuItem | null => {
    for (const parent of MENU_CONFIG) {
      if (parent.children?.some((child) => child.href === path)) {
        return parent;
      }
    }
    return null;
  }, []);

  // 根据当前路径自动设置选中的一级菜单
  // 只在初始化或路径变化时设置，不覆盖用户的手动选择
  useEffect(() => {
    const parentMenu = findParentMenuByPath(pathname);
    if (parentMenu) {
      // 只在以下情况更新：
      // 1. 还没有选中任何菜单（初始化）
      // 2. 当前选中的菜单不包含当前路径（用户导航到了其他菜单的页面）
      if (!selectedParentMenuId) {
        setSelectedParentMenuId(parentMenu.id);
      } else {
        // 检查当前选中的菜单是否包含当前路径
        const currentSelectedMenu = MENU_CONFIG.find(m => m.id === selectedParentMenuId);
        const currentMenuHasPath = currentSelectedMenu?.children?.some(
          child => child.href === pathname
        );
        
        // 如果当前选中的菜单不包含当前路径，则切换到正确的菜单
        if (!currentMenuHasPath && parentMenu.id !== selectedParentMenuId) {
          setSelectedParentMenuId(parentMenu.id);
        }
      }
    }
  }, [pathname, findParentMenuByPath, selectedParentMenuId]);

  // 使用 useMemo 缓存 context 值
  const contextValue = useMemo(
    () => ({
      selectedParentMenuId,
      setSelectedParentMenuId,
    }),
    [selectedParentMenuId]
  );

  return (
    <MenuStateContext.Provider value={contextValue}>
      {children}
    </MenuStateContext.Provider>
  );
}

export function useMenuState() {
  const context = useContext(MenuStateContext);
  if (!context) {
    throw new Error('useMenuState must be used within MenuStateProvider');
  }
  return context;
}
