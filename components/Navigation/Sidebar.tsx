'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigation } from '../../datahooks/navigation';
import { useMenuState } from '../../datahooks/menuState';
import { useMemo, memo } from 'react';
import { getIcon } from '../../utils/getIcon';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = memo(function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentMenu, menuConfig } = useNavigation();
  const { selectedParentMenuId } = useMenuState();

  // 根据选中的一级菜单获取对应的菜单项
  const selectedParentMenu = useMemo(() => {
    return menuConfig.find((item) => item.id === selectedParentMenuId);
  }, [menuConfig, selectedParentMenuId]);

  // 如果没有选中的一级菜单或没有子菜单，不显示侧边栏
  if (!selectedParentMenu || !selectedParentMenu.children || selectedParentMenu.children.length === 0) {
    return null;
  }

  return (
    <aside 
      className={`bg-white border-r border-gray-200 h-full overflow-y-auto transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 折叠按钮 */}
      <div className={`flex items-center justify-between p-2 border-b border-gray-200 ${
        collapsed ? 'justify-center' : ''
      }`}>
        {!collapsed && (
          <h2 className="text-sm font-semibold text-gray-900 px-2">{selectedParentMenu.label}</h2>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? (
            <ChevronRight size={16} className="text-gray-600" />
          ) : (
            <ChevronLeft size={16} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* 二级菜单列表 */}
      <div className="p-2">
        <nav className="space-y-1">
          {selectedParentMenu.children.map((item) => {
            const isActive = currentMenu?.id === item.id;
            
            return (
              <Link
                key={item.id}
                href={item.href || '#'}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {/* 图标 */}
                <div className="flex-shrink-0">
                  {getIcon(item.icon, 18)}
                </div>
                
                {/* 文字标签 - 仅在展开时显示 */}
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
});
