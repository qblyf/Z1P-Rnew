'use client';

import { Breadcrumb } from '../Navigation/Breadcrumb';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function PageContainer({
  children,
  title,
  description,
}: PageContainerProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* 页面头部 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="mb-3">
          <Breadcrumb />
        </div>
        {title && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {description && (
              <p className="text-slate-600 text-sm mt-1">{description}</p>
            )}
          </div>
        )}
      </div>

      {/* 页面内容 */}
      <div className="flex-1 bg-slate-50 px-6 py-6">
        {children}
      </div>
    </div>
  );
}
