'use client';

import { syncProductData } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Descriptions, Table } from 'antd';
import { PageHeader } from '@ant-design/pro-components';
import { Suspense, useMemo, useState } from 'react';
import { Content } from '../../components/style/Content';
import { Z1P_ENDPOINT } from '../../constants';
import { usePermission } from '../../datahooks/permission';
import { postAwait } from '../../error';
import PageWrap from '../../components/PageWrap';

export default function () {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}

/**
 * [页面] 数据同步
 *
 * 功能点:
 *
 * 1. 商品数据同步. (包括 SPU 分类, SPU, SKU)
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  const [msg, setMsg] = useState('');
  const [productSyncInfo, setProductSyncInfo] = useState<
    Array<{
      name: string;
      errMsg?: string;
      resCode: string;
      status: string;
    }>
  >();
  // 分步获取的时候才需要
  const [disabled, setDisabled] = useState(false);

  const fn = useMemo(() => {
    console.log('SyncButton init');
    return () => {
      postAwait(
        async () => {
          const res = await syncProductData();
          const productSyncInfo = res.map(r => {
            const defaultResult = {
              name: '某些账套',
              resCode: '失败',
              status: '已完成',
              errMsg: '',
            };
            if (r.status === 'fulfilled') {
              defaultResult.name = r.value.name;
              if (r.value.resCode === 'complete') {
                defaultResult.resCode = '已成功';
              } else if (r.value.resCode === 'failed') {
                defaultResult.resCode = '失败';
                defaultResult.errMsg = r.value.errMsg ?? '';
              } else {
                defaultResult.resCode = '未知';
                defaultResult.errMsg = r.value.errMsg ?? '';
              }
            }
            return defaultResult;
          });
          setProductSyncInfo(productSyncInfo);
          setMsg('已完成同步请求');
        },
        { timeoutThreshold: 60000 }
      )();
    };
  }, []);

  return (
    <PageWrap ppKey="product-manage">
      <PageHeader
        title="数据同步"
        subTitle="将数据同步到各个账套中. "
      ></PageHeader>
      <Content>
        <Descriptions>
          <Descriptions.Item label="可被同步的数据">
            目前支持同步的数据有: SPU 分类, SPU, SKU.
          </Descriptions.Item>
          <Descriptions.Item label="同步时间">
            因为同步的时候会锁表, 所以尽量在平台数据修改完成之后再进行同步.
          </Descriptions.Item>
        </Descriptions>
        <Button disabled={disabled} onClick={fn}>
          商品数据同步 (包括 SPU 分类, SPU, SKU)
        </Button>
        {msg}
        {productSyncInfo && (
          <Table
            dataSource={productSyncInfo}
            size="small"
            pagination={false}
            columns={[
              {
                title: '账套名称',
                dataIndex: 'name',
              },
              {
                title: '同步进程',
                dataIndex: 'status',
              },
              {
                title: '同步结果',
                dataIndex: 'resCode',
              },
              {
                title: '提示信息',
                dataIndex: 'errMsg',
              },
            ]}
          />
        )}
      </Content>
    </PageWrap>
  );
}
