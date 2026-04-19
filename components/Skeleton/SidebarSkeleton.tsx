'use client';

import { Skeleton } from 'antd';
import { memo } from 'react';

interface SidebarSkeletonProps {
  collapsed?: boolean;
}

export const SidebarSkeleton = memo(function SidebarSkeleton({
  collapsed = false,
}: SidebarSkeletonProps) {
  const menuItems = collapsed ? 5 : 6;

  return (
    <aside
      className={`bg-white border-r border-gray-200 h-full overflow-y-auto transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 折叠按钮区域 */}
      <div className={`flex items-center justify-between p-2 border-b border-gray-200 ${
        collapsed ? 'justify-center' : ''
      }`}>
        {!collapsed && (
          <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
        )}
        <div className="w-6 h-6 rounded">
          <Skeleton.Avatar active size={24} />
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="p-2 space-y-1">
        {Array.from({ length: menuItems }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Skeleton.Avatar active size={18} />
            {!collapsed && (
              <Skeleton.Input active size="small" style={{ width: 100, height: 14 }} />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
});
