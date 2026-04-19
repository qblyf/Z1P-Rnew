'use client';

import { memo } from 'react';
import { HeaderSkeleton } from './HeaderSkeleton';
import { SidebarSkeleton } from './SidebarSkeleton';
import { TabBarSkeleton } from './TabBarSkeleton';

export const AdminLayoutSkeleton = memo(function AdminLayoutSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <HeaderSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <SidebarSkeleton collapsed={false} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TabBarSkeleton />
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-2">
                    {[100, 85, 70, 90, 60].map((w, i) => (
                      <div
                        key={i}
                        className="h-4 bg-gray-100 rounded animate-pulse"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-32 bg-gray-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
});
