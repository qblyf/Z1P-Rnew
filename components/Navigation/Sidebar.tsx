'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigation } from '../../datahooks/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { parentMenu, currentMenu } = useNavigation();

  // 如果没有父级菜单（一级菜单），不显示侧边栏
  if (!parentMenu || !parentMenu.children || parentMenu.children.length === 0) {
    return null;
  }

  return (
    <aside 
      className={`bg-white border-r border-gray-200 h-full overflow-y-auto transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-64'
      }`}
    >
      {/* 折叠按钮 */}
      <div className={`flex items-center justify-between p-2 border-b border-gray-200 ${
        collapsed ? 'justify-center' : ''
      }`}>
        {!collapsed && (
          <h2 className="text-sm font-semibold text-gray-900 px-2">{parentMenu.label}</h2>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
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
          {parentMenu.children.map((item) => {
            const isActive = currentMenu?.id === item.id;
            
            return (
              <Link
                key={item.id}
                href={item.href || '#'}
                className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'text-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}