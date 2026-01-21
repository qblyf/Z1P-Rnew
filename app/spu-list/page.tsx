'use client';
import { SPU, SPUCateID, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUListNew, getSPUCateBaseList } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Col, Form, Input, Row, Select, Table, Cascader } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import update from 'immutability-helper';
import Head from 'next/head';
import { PageHeader } from '@ant-design/pro-components';

import { SelectBrands } from '../../components/SelectBrands';
import { Content } from '../../components/style/Content';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider } from '../../datahooks/brand';
import { getAwait } from '../../error';
import { SPUCateListProvider } from '../../datahooks/product';
import { RenderSPUState } from '../../components/render/RenderSPU';
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
}) {
  const { onQuery } = props;

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

  return (
    <Form {...formColProps}>
      <Row gutter={14}>
        <Col {...formItemCol}>
          <Form.Item
            label="名称 关键词"
            tooltip="输入 SPU 名称的部分值, 支持模糊搜索"
          >
            <Input
              onBlur={e => {
                setNameKeyword(e.target.value);
              }}
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
              style={{ width: '100%' }}
              onChange={v => {
                setIsLonely(v);
              }}
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
              style={{ width: '100%' }}
              onChange={v => {
                setSPUState(v);
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
            }}
          >
            查找
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

/**
 * [页面] SPU 列表
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function () {
  const [list, setList] =
    useState<Pick<SPU, 'state' | 'name' | 'id' | 'brand'>[]>();

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
        <PageHeader
          title="SKU 列表"
          subTitle="查询, 过滤, 筛选 SKU. 如有多个过滤项目, 取其交集."
        ></PageHeader>
        <Content>
          <QueryForm
            onQuery={v => {
              const fn = getAwait(async () => {
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
              });
              fn();
            }}
          />
          <Row>
            <Col flex="auto">
              {list && filterParams && (
                <Table
                  rowKey={'id'}
                  size="small"
                  dataSource={list}
                  columns={[
                    {
                      dataIndex: 'id',
                      title: 'SPU ID',
                      width: 100,
                    },
                    {
                      dataIndex: 'name',
                      title: '名称',
                    },
                    {
                      dataIndex: 'brand',
                      title: '品牌',
                    },

                    {
                      dataIndex: 'state',
                      title: '状态',
                      width: 100,
                      render: (_, v) => <RenderSPUState v={v.state} />,
                    },
                  ]}
                  pagination={false}
                  footer={() => {
                    if (list.length % limit !== 0) {
                      return <span>已经获取所有数据</span>;
                    }
                    return (
                      <Button
                        type="text"
                        block
                        onClick={async () => {
                          const res = await getSPUListNew(
                            update(filterParams, {
                              offset: { $set: list.length },
                            }),
                            ['id', 'name', 'brand', 'state']
                          );
                          setList(update(list, { $push: res }));
                        }}
                      >
                        加载更多数据
                      </Button>
                    );
                  }}
                  sticky
                  summary={pageData => (
                    <Table.Summary fixed={'bottom'}>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}>
                          当前总数: {pageData.length}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              )}
            </Col>
          </Row>
        </Content>
      </SPUCateListProvider>
    </PageWrap>
  );
}
