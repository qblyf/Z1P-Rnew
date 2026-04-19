'use client';

import { Skeleton } from 'antd';
import { memo } from 'react';

export const TabBarSkeleton = memo(function TabBarSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-1 overflow-x-auto overflow-y-hidden h-10 flex-shrink-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton.Button
          key={i}
          active
          size="small"
          style={{ width: 80, height: 28 }}
          shape="round"
        />
      ))}
    </div>
  );
});
