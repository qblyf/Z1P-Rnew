'use client';

import { Skeleton } from 'antd';
import { memo } from 'react';

interface PageSkeletonProps {
  showHeader?: boolean;
  rows?: number;
}

export const PageSkeleton = memo(function PageSkeleton({
  showHeader = true,
  rows = 5,
}: PageSkeletonProps) {
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="bg-white rounded-lg p-4">
          <Skeleton.Input active size="small" style={{ width: 200, height: 20 }} />
          <div className="mt-3 space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton.Input
                key={i}
                active
                size="small"
                style={{
                  width: `${100 - i * 15}%`,
                  height: 16,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg p-4 space-y-3">
        <Skeleton.Input active size="small" style={{ width: 150, height: 20 }} />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton.Input
              key={i}
              active
              size="small"
              style={{
                width: `${90 - i * 10}%`,
                height: 16,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
