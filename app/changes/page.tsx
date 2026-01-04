'use client';

import PageWrap from '../../components/PageWrap';
import { PageHeader } from '@ant-design/pro-components';
import Head from 'next/head';
import { ChangeTable } from '../../components/ChangeTable';
import { Suspense } from 'react';

function ClientPage() {
  return (
    <PageWrap ppKey="product-manage">
      <Head>
        <title>操作审计</title>
      </Head>
      <PageHeader
        title="操作审计"
        subTitle="查看所有变动日志, 以审计操作."
      ></PageHeader>
      <ChangeTable />
    </PageWrap>
  );
}

export default function () {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}
