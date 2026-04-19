'use client';

import Head from 'next/head';
import dynamic from 'next/dynamic';
import { PageSkeleton } from '../../components/Skeleton';

const SmartMatchV2 = dynamic(
  () => import('../../components/SmartMatchV2').then((mod) => mod.SmartMatchV2),
  {
    ssr: false,
    loading: () => <PageSkeleton rows={8} />
  }
);

export default function SmartMatchV2Page() {
  return (
    <>
      <Head>
        <title>在线匹配 V2 - Z1 数据管理平台</title>
      </Head>
      <SmartMatchV2 />
    </>
  );
}
