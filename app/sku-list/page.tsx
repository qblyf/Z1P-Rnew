'use client';

import { SKU } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Card, Col, Form, Input, Row, Select, Table, Tag, Space, Divider } from 'antd';
import Head from 'next/head';
import { Suspense, useState } from 'react';
import { Search } from 'lucide-react';

import { SelectBrands } from '../../components/SelectBrands';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider } from '../../datahooks/brand';
import { getAwait } from '../../error';
import PageWrap from '../../components/PageWrap';

function QueryForm(props: {
  onQuery: (q: {
    gtinKeyword?: string;
    nameKeyword?: string;
    brands?: string[];
    skuState?: SKU['state'];
  }) => void;
  loading?: boolean;
}) {
  const { onQuery, loading } = props;

  const [gtinKeyword, setGTINKeyword] = useState('');
  const [nameKeyword, setNameKeyword] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>();
  const [skuState, setSKUState] = useState<SKU['state']>();

  const handleSearch = () => {
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
  };

  return (
    <Card 
      style={{ marginBottom: 16 }}
      styles={{ body: { paddingBottom: 0 } }}
    >
      <Form {...formColProps}>
        <Row gutter={16}>
          <Col {...formItemCol}>
            <Form.Item
              label="GTIN 关键词"
              tooltip="输入 GTIN 的部分值, 支持模糊搜索"
            >
              <Input
                placeholder="请输入 GTIN"
                value={gtinKeyword}
                onChange={e => setGTINKeyword(e.target.value)}
                onPressEnter={handleSearch}
                size="large"
                prefix={<Search size={16} style={{ color: '#999' }} />}
              />
            </Form.Item>
          </Col>
          <Col {...formItemCol}>
            <Form.Item
              label="名称 关键词"
              tooltip="输入 SKU 名称的部分值, 支持模糊搜索"
            >
              <Input
                placeholder="请输入 SKU 名称"
                value={nameKeyword}
                onChange={e => setNameKeyword(e.target.value)}
                onPressEnter={handleSearch}
                size="large"
                prefix={<Search size={16} style={{ color: '#999' }} />}
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
                placeholder="请选择状态"
                style={{ width: '100%' }}
                onChange={v => {
                  setSKUState(v);
                }}
                size="large"
                allowClear
              >
                <Select.Option value="valid">有效</Select.Option>
                <Select.Option value="invalid">无效</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end" style={{ marginBottom: 16 }}>
          <Space>
            <Button
              onClick={() => {
                setGTINKeyword('');
                setNameKeyword('');
                setSelectedBrands(undefined);
                setSKUState(undefined);
              }}
              disabled={loading}
            >
              重置
            </Button>
            <Button
              type="primary"
              onClick={handleSearch}
              loading={loading}
              icon={<Search size={16} />}
            >
              查找
            </Button>
          </Space>
        </Row>
      </Form>
    </Card>
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
      
      <div style={{ padding: '24px' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 600, 
            margin: 0,
            marginBottom: '8px'
          }}>
            SKU 列表
          </h1>
          <p style={{ 
            color: '#666', 
            margin: 0,
            fontSize: '14px'
          }}>
            查询、过滤、筛选 SKU，如有多个过滤项目，取其交集
          </p>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* 查询表单 */}
        <QueryForm
          loading={loading}
          onQuery={v => {
            const fn = getAwait(async () => {
              setLoading(true);
              try {
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
                // 使用 setList 设置 state 数据
                setList(res);
              } finally {
                setLoading(false);
              }
            });
            fn();
          }}
        />

        {/* 结果表格 */}
        <Card>
          {list && (
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color="blue">总计: {list.length}</Tag>
                <Tag color="green">
                  有效: {list.filter(item => item.state === 'valid').length}
                </Tag>
                <Tag color="red">
                  无效: {list.filter(item => item.state === 'invalid').length}
                </Tag>
              </Space>
            </div>
          )}

          <Table
            size="middle"
            rowKey="id"
            dataSource={list}
            loading={loading}
            columns={[
              { 
                dataIndex: 'id', 
                title: 'SKU ID',
                width: 100,
                fixed: 'left',
              },
              { 
                dataIndex: 'name', 
                title: 'SKU 名称',
                width: 300,
                ellipsis: true,
              },
              { 
                dataIndex: 'brand', 
                title: '品牌',
                width: 120,
              },
              {
                dataIndex: 'gtins',
                title: 'GTINs (69码)',
                width: 200,
                render: (gtins: string[]) => {
                  if (!gtins || gtins.length === 0) {
                    return <span style={{ color: '#999' }}>-</span>;
                  }
                  return (
                    <Space direction="vertical" size={4}>
                      {gtins.map((gtin, index) => (
                        <Tag key={index} color="blue">
                          {gtin}
                        </Tag>
                      ))}
                    </Space>
                  );
                },
              },
              {
                dataIndex: 'state',
                title: '状态',
                width: 100,
                fixed: 'right',
                render: (state: string) => {
                  if (state === 'invalid') {
                    return <Tag color="red">无效</Tag>;
                  }
                  if (state === 'valid') {
                    return <Tag color="green">有效</Tag>;
                  }
                  return <Tag>未知</Tag>;
                },
              },
            ]}
            pagination={{
              defaultPageSize: 50,
              pageSizeOptions: [20, 50, 100, 200, 500, 1000],
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </PageWrap>
  );
}
