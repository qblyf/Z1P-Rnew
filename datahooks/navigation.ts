import { usePathname } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import { MENU_CONFIG, MenuItem } from '../constant/navigation';

export function useNavigation() {
  const pathname = usePathname();

  // 使用 useCallback 缓存查找函数
  const findMenuByPath = useCallback((items: MenuItem[], path: string): MenuItem | null => {
    for (const item of items) {
      if (item.href === path) return item;
      if (item.children) {
        const found = findMenuByPath(item.children, path);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const findParentMenu = useCallback((items: MenuItem[], targetId: string): MenuItem | null => {
    for (const item of items) {
      if (item.children?.some((child) => child.id === targetId)) {
        return item;
      }
      if (item.children) {
        const found = findParentMenu(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const currentMenu = useMemo(() => {
    return findMenuByPath(MENU_CONFIG, pathname);
  }, [pathname, findMenuByPath]);

  const parentMenu = useMemo(() => {
    if (!currentMenu) return null;
    return findParentMenu(MENU_CONFIG, currentMenu.id);
  }, [currentMenu, findParentMenu]);

  const breadcrumbs = useMemo(() => {
    const crumbs: MenuItem[] = [];
    if (parentMenu) crumbs.push(parentMenu);
    if (currentMenu) crumbs.push(currentMenu);
    return crumbs;
  }, [parentMenu, currentMenu]);

  // 使用 useMemo 缓存返回值
  return useMemo(() => ({
    currentMenu,
    parentMenu,
    breadcrumbs,
    pathname,
    menuConfig: MENU_CONFIG,
  }), [currentMenu, parentMenu, breadcrumbs, pathname]);
}
