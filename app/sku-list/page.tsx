'use client';

import { SKU } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Col, Form, Input, Row, Select, Table } from 'antd';
import Head from 'next/head';
import { Suspense, useState } from 'react';
import { PageHeader } from '@ant-design/pro-components';

import { SelectBrands } from '../../components/SelectBrands';
import { Content } from '../../components/style/Content';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider } from '../../datahooks/brand';
import { usePermission } from '../../datahooks/permission';
import { getAwait } from '../../error';
import PageWrap from '../../components/PageWrap';

function QueryForm(props: {
  onQuery: (q: {
    gtinKeyword?: string;
    nameKeyword?: string;
    brands?: string[];
    skuState?: SKU['state'];
  }) => void;
}) {
  const { onQuery } = props;

  const [gtinKeyword, setGTINKeyword] = useState('');
  const [nameKeyword, setNameKeyword] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>();
  const [skuState, setSKUState] = useState<SKU['state']>();

  return (
    <Form {...formColProps}>
      <Row gutter={14}>
        <Col {...formItemCol}>
          <Form.Item
            label="GTIN 关键词"
            tooltip="输入 GTIN 的部分值, 支持模糊搜索"
          >
            <Input
              onBlur={e => {
                setGTINKeyword(e.target.value);
              }}
            />
          </Form.Item>
        </Col>
        <Col {...formItemCol}>
          <Form.Item
            label="名称 关键词"
            tooltip="输入 SKU 名称的部分值, 支持模糊搜索"
          >
            <Input
              onBlur={e => {
                setNameKeyword(e.target.value);
              }}
            />
          </Form.Item>
        </Col>
        <Col {...formItemCol}>
          <Form.Item label="品牌" tooltip="选择要筛选的品牌">
            <BrandListProvider>
              <SelectBrands onSelected={setSelectedBrands} />
            </BrandListProvider>
          </Form.Item>
        </Col>
        <Col {...formItemCol}>
          <Form.Item label="状态" tooltip="选择要筛选的状态">
            <Select
              value={skuState}
              style={{ width: '100%' }}
              onChange={v => {
                setSKUState(v);
              }}
            >
              <Select.Option value="valid">有效</Select.Option>
              <Select.Option value="invalid">无效</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row justify="end">
        <Col>
          <Button
            type="primary"
            onClick={() => {
              let k1: string | undefined = gtinKeyword.trim();
              if (!k1) {
                k1 = undefined;
              }

              let k2: string | undefined = nameKeyword.trim();
              if (!k2) {
                k2 = undefined;
              }

              let k3: string[] | undefined = selectedBrands;
              if (k3?.length === 0) {
                k3 = undefined;
              }

              onQuery({
                gtinKeyword: k1,
                nameKeyword: k2,
                brands: k3,
                skuState,
              });
            }}
          >
            查找
          </Button>
        </Col>
      </Row>
    </Form>
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
 * [页面] SKU 列表
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  const [list, setList] = useState<any[]>();
  const [loading, setLoading] = useState(false);

  return (
    <PageWrap ppKey="product-manage">
      <Head>
        <title>SKU 列表</title>
      </Head>
      <PageHeader
        title="SKU 列表"
        subTitle="查询, 过滤, 筛选 SKU. 如有多个过滤项目, 取其交集."
      ></PageHeader>
      <Content>
        <QueryForm
          onQuery={v => {
            const fn = getAwait(async () => {
              setLoading(true);
              try {
                console.log('onQuery', v);
                const { brands, gtinKeyword, nameKeyword, skuState } = v;
                // 从服务器获取数据
                const res = await getSKUListJoinSPU(
                  {
                    gtinKeyword,
                    nameKeyword,
                    brands,
                    states: skuState ? [skuState] : undefined,
                    limit: 1000,
                    orderBy: { key: 'p.id', sort: 'DESC' },
                    offset: 0,
                  },
                  { sku: ['id', 'name', 'gtins', 'state'], spu: ['brand'] }
                );
                console.log('res', res);
                // 使用 setList 设置 state 数据
                setList(res);
              } finally {
                setLoading(false);
              }
            });
            fn();
          }}
        />
        <Row>
          <Col flex="auto">
            <Table
              size="small"
              rowKey="id"
              dataSource={list}
              loading={loading}
              columns={[
                { dataIndex: 'name', title: '名称' },
                { dataIndex: 'brand', title: '品牌' },
                {
                  dataIndex: 'gtins',
                  title: 'GTINs',
                  render: v => v.join(', '),
                },
                {
                  dataIndex: 'state',
                  title: '状态',
                  render: v => {
                    if (v === 'invalid') {
                      return '无效';
                    }
                    if (v === 'valid') {
                      return '有效';
                    }
                    return '未知';
                  },
                },
              ]}
              pagination={{
                defaultPageSize: 1000,
                pageSizeOptions: [20, 100, 1000],
              }}
            />
          </Col>
          {/* <Col span={8}>TODO: 查看 SKU 详情</Col> */}
        </Row>
      </Content>
    </PageWrap>
  );
}
