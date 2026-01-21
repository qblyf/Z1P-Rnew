'use client';
import { SPU, SPUCateID, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUListNew, getSPUCateBaseList } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Card, Col, Form, Input, Row, Select, Table, Cascader, Tag, Space, Divider } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import update from 'immutability-helper';
import Head from 'next/head';
import { Search } from 'lucide-react';

import { SelectBrands } from '../../components/SelectBrands';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider } from '../../datahooks/brand';
import { getAwait } from '../../error';
import { SPUCateListProvider } from '../../datahooks/product';
import { usePermission } from '../../datahooks/permission';
import PageWrap from '../../components/PageWrap';

type SPUCateData = Awaited<ReturnType<typeof getSPUCateBaseList>>[0];

interface CascaderOption {
  value: number;
  label: string;
  children?: CascaderOption[];
}

/**
 * 将 SPU 分类数据转换为级联选择器的树形结构
 */
function buildCascaderOptions(cates: SPUCateData[]): CascaderOption[] {
  if (!cates.length) {
    return [];
  }

  const cateMap = cates.map((cate) => ({
    value: cate.id,
    label: `${cate.name} (${cate.id})`,
    pid: cate.pid,
    children: [] as CascaderOption[],
  }));

  function buildTree(pid: number, data: typeof cateMap): CascaderOption[] {
    return data.reduce((acc, item) => {
      if (item.pid === pid) {
        const children = buildTree(item.value, data);
        acc.push({
          value: item.value,
          label: item.label,
          ...(children.length > 0 ? { children } : {}),
        });
      }
      return acc;
    }, [] as CascaderOption[]);
  }

  return buildTree(0, cateMap);
}

/**
 * [页面组件] SPU 列表 的搜索过滤框
 * @author Lian Zheren <lzr@go0356.com>
 */
function QueryForm(props: {
  onQuery: (q: {
    spuCateIDs?: SPUCateID[];
    nameKeyword?: string;
    brands?: string[];
    spuState?: SPU['state'];
    lonely?: boolean;
  }) => void;
  loading?: boolean;
}) {
  const { onQuery, loading } = props;

  const [spuCateIDs, setSpuCateIDs] = useState<SPUCateID[]>();
  const [nameKeyword, setNameKeyword] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>();
  const [spuState, setSPUState] = useState<SPU['state']>(SPUState.在用);
  const [isLonely, setIsLonely] = useState<'nofilter' | 'lonely' | 'linked'>(
    'nofilter'
  );
  const [cates, setCates] = useState<SPUCateData[]>([]);
  const [selectedCatePath, setSelectedCatePath] = useState<number[]>();

  // 加载 SPU 分类数据
  useEffect(() => {
    const loadCates = async () => {
      const res = await getSPUCateBaseList();
      setCates(res);
    };
    loadCates();
  }, []);

  // 构建级联选择器选项
  const cascaderOptions = useMemo(() => {
    const options = buildCascaderOptions(cates);
    return [
      {
        value: 0,
        label: '全部分类',
        children: options,
      },
    ];
  }, [cates]);

  const handleSearch = () => {
    let k2: string | undefined = nameKeyword.trim();
    if (!k2) {
      k2 = undefined;
    }

    let k3: string[] | undefined = selectedBrands;
    if (k3?.length === 0) {
      k3 = undefined;
    }

    let lonely: boolean | undefined = undefined;
    if (isLonely === 'lonely') {
      lonely = true;
    }
    if (isLonely === 'linked') {
      lonely = false;
    }

    onQuery({
      spuCateIDs,
      nameKeyword: k2,
      brands: k3,
      spuState,
      lonely,
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
              label="名称 关键词"
              tooltip="输入 SPU 名称的部分值, 支持模糊搜索"
            >
              <Input
                placeholder="请输入 SPU 名称"
                value={nameKeyword}
                onChange={e => setNameKeyword(e.target.value)}
                onPressEnter={handleSearch}
                size="large"
                prefix={<Search size={16} style={{ color: '#999' }} />}
              />
            </Form.Item>
          </Col>

          <Col {...formItemCol}>
            <Form.Item label="SPU 分类" tooltip="选择 SPU 分类">
              <Cascader
                options={cascaderOptions}
                value={selectedCatePath}
                onChange={(value) => {
                  setSelectedCatePath(value as number[]);
                  if (!value || value.length === 0) {
                    // 没有选择任何分类
                    setSpuCateIDs(undefined);
                  } else if (value.length === 1 && value[0] === 0) {
                    // 只选择了"全部分类"
                    setSpuCateIDs(undefined);
                  } else {
                    // 使用最后一级的分类 ID（跳过"全部分类"这一级）
                    const lastId = value[value.length - 1] as number;
                    if (lastId === 0) {
                      setSpuCateIDs(undefined);
                    } else {
                      setSpuCateIDs([lastId]);
                    }
                  }
                }}
                placeholder="请选择 SPU 分类"
                showSearch={{
                  filter: (inputValue, path) =>
                    path.some(
                      (option) =>
                        option.label
                          ?.toString()
                          .toLowerCase()
                          .indexOf(inputValue.toLowerCase()) > -1
                    ),
                }}
                changeOnSelect
                style={{ width: '100%' }}
                size="large"
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
            <Form.Item label="是否已关联 SKU" tooltip="选择要筛选的状态">
              <Select
                value={isLonely}
                placeholder="请选择"
                style={{ width: '100%' }}
                onChange={v => {
                  setIsLonely(v);
                }}
                size="large"
                allowClear
              >
                <Select.Option value="nofilter">不进行过滤</Select.Option>
                <Select.Option value="lonely">未关联 SKU</Select.Option>
                <Select.Option value="linked">已关联 SKU</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col {...formItemCol}>
            <Form.Item label="状态" tooltip="选择要筛选的状态">
              <Select
                value={spuState}
                placeholder="请选择状态"
                style={{ width: '100%' }}
                onChange={v => {
                  setSPUState(v);
                }}
                size="large"
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
                setNameKeyword('');
                setSpuCateIDs(undefined);
                setSelectedCatePath(undefined);
                setSelectedBrands(undefined);
                setIsLonely('nofilter');
                setSPUState(SPUState.在用);
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

/**
 * [页面] SPU 列表
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function () {
  const [list, setList] =
    useState<Pick<SPU, 'state' | 'name' | 'id' | 'brand'>[]>();
  const [loading, setLoading] = useState(false);

  const limit = 100;
  const [filterParams, setFilterParams] =
    useState<Parameters<typeof getSPUListNew>[0]>();

  // 获取权限
  const { permission, errMsg: permissionErrMsg } =
    usePermission('product-manage');
  if (permission === undefined) {
    return <>正在加载权限</>;
  }
  if (permission === null) {
    return <>没有获取到权限, {permissionErrMsg}</>;
  }

  return (
    <PageWrap ppKey="product-manage">
      <SPUCateListProvider>
        <Head>
          <title>SPU 列表</title>
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
              SPU 列表
            </h1>
            <p style={{ 
              color: '#666', 
              margin: 0,
              fontSize: '14px'
            }}>
              查询、过滤、筛选 SPU，如有多个过滤项目，取其交集
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
                  const {
                    spuCateIDs: cateIDs,
                    nameKeyword,
                    brands,
                    spuState,
                    lonely,
                  } = v;

                  // 生成过滤数据
                  const filterParams: Parameters<typeof getSPUListNew>[0] = {
                    cateIDs,
                    nameKeyword,
                    brands,
                    states: spuState ? [spuState] : undefined,
                    lonely,
                    orderBy: [
                      { key: 'p."brand"', sort: 'ASC' },
                      { key: 'p."cate_id"', sort: 'ASC' },
                      { key: 'p."order"', sort: 'ASC' },
                      { key: 'p."id"', sort: 'DESC' },
                    ],
                    limit,
                    offset: 0,
                  };

                  // 从服务器获取数据
                  const res = await getSPUListNew(filterParams, [
                    'id',
                    'name',
                    'brand',
                    'state',
                  ]);

                  setFilterParams(filterParams);
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

            {list && filterParams && (
              <Table
                rowKey={'id'}
                size="middle"
                dataSource={list}
                loading={loading}
                columns={[
                  {
                    dataIndex: 'id',
                    title: 'SPU ID',
                    width: 100,
                    fixed: 'left',
                  },
                  {
                    dataIndex: 'name',
                    title: 'SPU 名称',
                    ellipsis: true,
                  },
                  {
                    dataIndex: 'brand',
                    title: '品牌',
                    width: 120,
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
                pagination={false}
                footer={() => {
                  if (list.length % limit !== 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '8px' }}>
                        <Tag color="success">已经获取所有数据</Tag>
                      </div>
                    );
                  }
                  return (
                    <Button
                      type="text"
                      block
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await getSPUListNew(
                            update(filterParams, {
                              offset: { $set: list.length },
                            }),
                            ['id', 'name', 'brand', 'state']
                          );
                          setList(update(list, { $push: res }));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      loading={loading}
                    >
                      加载更多数据
                    </Button>
                  );
                }}
                sticky
                scroll={{ x: 800 }}
              />
            )}
          </Card>
        </div>
      </SPUCateListProvider>
    </PageWrap>
  );
}
