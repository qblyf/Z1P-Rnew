'use client';

import { Button, Descriptions, Space, Tabs, TabsProps } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { SKU, SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSKUList } from '@zsqk/z1-sdk/es/z1p/product';
import { postAwait } from '../../error';
import { Content } from '../../components/style/Content';
import Head from 'next/head';
import { usePermission } from '../../datahooks/permission';
import PageWrap from '../../components/PageWrap';
import { PageHeader } from '@ant-design/pro-components';

/**
 * [组件] SKU 数据导出 (1)
 * @author Lian Zheren <lzr@go0356.com>
 */
function SKUDataExport1() {
  const [data, setData] = useState<Array<Pick<SKU, 'name' | 'gtins'>>>([]);

  const dataURL = useMemo(() => {
    return data.reduce((pre, v, i) => {
      // 为避免影响 CSV 的分隔符
      const name = v.name.replace(',', '-');
      let next =
        i === 0
          ? pre
          : `${pre}
`;
      if (v.gtins.length === 0) {
        return `${next}${name}`;
      }
      return `${next}${name},${v.gtins.join(',')}`;
    }, 'data:text/csv;charset=utf-8,');
  }, [data]);

  return (
    <>
      <Descriptions>
        <Descriptions.Item label="数据列">
          SKU 名称, SKU GTINs
        </Descriptions.Item>
        <Descriptions.Item label="文件格式">CSV 表格</Descriptions.Item>
        <Descriptions.Item label="文件编码">UTF-8</Descriptions.Item>
        <Descriptions.Item label="文件切割">
          数据获取时每次获取 1000 条数据, 但下载时自动合并为一个.
        </Descriptions.Item>
      </Descriptions>
      <Space>
        <Button
          onClick={postAwait(async () => {
            // TODO: 获取真实数据
            let done = false;
            let offset = 0;
            const limit = 1000;
            const data: Pick<SKU, 'name' | 'gtins' | 'id'>[] = [];
            while (!done) {
              const res = await getSKUList(
                {
                  states: [SKUState.在用],
                  limit,
                  offset,
                  orderBy: { key: 'id', sort: 'ASC' },
                },
                ['id', 'name', 'gtins']
              );
              data.push(...res);
              if (res.length === limit) {
                offset += limit;
              } else {
                done = true;
              }
            }
            setData(data);
          })}
        >
          导出 SKU 数据
        </Button>
        {data.length ? (
          <a href={dataURL} download={`sku-data-export.csv`}>
            下载
          </a>
        ) : (
          <span>请先进行导出</span>
        )}
      </Space>
    </>
  );
}

export default function () {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}

/**
 * [页面] 数据导出
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  const items: TabsProps['items'] = [
    {
      label: 'SKU 数据 (1)',
      key: '1',
      children: <SKUDataExport1 />,
    },
  ];

  return (
    <PageWrap ppKey="product-manage">
      <Head>
        <title>数据导出</title>
      </Head>
      <PageHeader
        title="数据导出"
        subTitle="基础数据可导出为 CSV 表格."
      ></PageHeader>
      <Content>
        <Tabs defaultActiveKey="1" items={items} />
      </Content>
    </PageWrap>
  );
}
