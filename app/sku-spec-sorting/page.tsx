'use client';

import React from 'react';
import { SpecSortingPage } from '@/features/sku-spec-sorting';
import { useAuth } from '@/datahooks/auth';

/**
 * SKU 规格排序设置页面
 * 
 * 路由: /sku-spec-sorting
 */
export default function SkuSpecSortingPage() {
  const { auth } = useAuth();

  if (!auth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">请先登录</p>
        </div>
      </div>
    );
  }

  return <SpecSortingPage auth={auth} />;
}
