import Head from 'next/head';
import { Suspense } from 'react';
import { SmartMatchV2 } from '../../components/SmartMatchV2';
import { PageSkeleton } from '../../components/Skeleton';

export default function SmartMatchV2Page() {
  return (
    <>
      <Head>
        <title>在线匹配 V2 - Z1 数据管理平台</title>
      </Head>
      <Suspense fallback={<PageSkeleton rows={8} />}>
        <SmartMatchV2 />
      </Suspense>
    </>
  );
}
