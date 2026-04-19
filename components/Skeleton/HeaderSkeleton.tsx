'use client';

import { Skeleton } from 'antd';
import { memo } from 'react';

export const HeaderSkeleton = memo(function HeaderSkeleton() {
  return (
    // 使用 div 代替 header 避免 hydration mismatch
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Skeleton.Avatar active size={32} shape="square" />
          <Skeleton.Input active size="small" style={{ width: 120, height: 18 }} />
        </div>

        {/* Primary Menu */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton.Button
              key={i}
              active
              size="small"
              style={{ width: 80, height: 32 }}
              shape="round"
            />
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Skeleton.Avatar active size={32} />
        </div>
      </div>
    </div>
  );
});
