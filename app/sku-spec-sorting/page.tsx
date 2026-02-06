'use client';

import React from 'react';
import { SpecSortingPage } from '../../features/sku-spec-sorting';
import { useTokenContext } from '../../datahooks/auth';
import PageWrap from '../../components/PageWrap';

/**
 * SKU 规格排序设置页面
 * 
 * 路由: /sku-spec-sorting
 */
export default function SkuSpecSortingPage() {
  const { token } = useTokenContext();

  if (!token) {
    return (
      <PageWrap>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">请先登录</p>
          </div>
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <SpecSortingPage auth={token as any} />
    </PageWrap>
  );
}
