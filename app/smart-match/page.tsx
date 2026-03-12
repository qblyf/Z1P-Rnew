'use client';

import PageWrap from '../../components/PageWrap';
import { usePageTab } from '../../datahooks/usePageTab';
import SmartMatch from '../../components/SmartMatch';

export default function SmartMatchPage() {
  // 注册页面标签页
  usePageTab('在线匹配');
  
  return (
    <PageWrap ppKey="product-manage">
      <SmartMatch />
    </PageWrap>
  );
}
