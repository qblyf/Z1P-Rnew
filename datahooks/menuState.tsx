'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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

  // 根据当前路径自动设置选中的一级菜单
  useEffect(() => {
    const findParentMenuByPath = (path: string): MenuItem | null => {
      for (const parent of MENU_CONFIG) {
        if (parent.children?.some((child) => child.href === path)) {
          return parent;
        }
      }
      return null;
    };

    const parentMenu = findParentMenuByPath(pathname);
    if (parentMenu) {
      setSelectedParentMenuId(parentMenu.id);
    }
  }, [pathname]);

  return (
    <MenuStateContext.Provider
      value={{
        selectedParentMenuId,
        setSelectedParentMenuId,
      }}
    >
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
