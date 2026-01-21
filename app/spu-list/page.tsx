'use client';
import { SPU, SPUCateID, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUListNew, getSPUCateBaseList, editSPUInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Card, Col, Form, Input, Row, Select, Table, Cascader, Tag, Space, Divider, Modal, message, Drawer } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { Search, Edit } from 'lucide-react';
import type { TableRowSelection } from 'antd/es/table/interface';

import { SelectBrands } from '../../components/SelectBrands';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider, useBrandListContext } from '../../datahooks/brand';
import { getAwait } from '../../error';
import { SPUCateListProvider, SpuIDProvider, SPUListProvider, useSpuIDContext } from '../../datahooks/product';
import { usePermission } from '../../datahooks/permission';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';
import SPUEdit from '../../components/SPUEdit';

type SPUCateData = Awaited<ReturnType<typeof getSPUCateBaseList>>[0];

interface CascaderOption {
  value: number;
  label: string;
  children?: CascaderOption[];
}

type SPUListItem = Pick<SPU, 'state' | 'name' | 'id' | 'brand' | 'cateID'>;

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
 * [组件] 批量编辑 SPU Modal
 */
function BatchEditModal(props: {
  visible: boolean;
  selectedIds: number[];
  onClose: () => void;
  onSuccess: () => void;
  cates: SPUCateData[];
}) {
  const { visible, selectedIds, onClose, onSuccess, cates } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token } = useTokenContext();
  const { brandList } = useBrandListContext();

  const cascaderOptions = useMemo(() => {
    const options = buildCascaderOptions(cates);
    return options;
  }, [cates]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!token) {
        message.error('未获取到认证信息');
        return;
      }

      // 检查是否至少选择了一个要修改的字段
      const hasChanges = values.brand || values.cateID || values.description || values.remark;
      if (!hasChanges) {
        message.warning('请至少选择一个要修改的字段');
        return;
      }

      Modal.confirm({
        title: '确认批量编辑',
        content: `确定要批量编辑 ${selectedIds.length} 个 SPU 吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          setLoading(true);
          try {
            let successCount = 0;
            let failCount = 0;

            // 准备更新参数
            const updateParams: any = {};
            if (values.brand) updateParams.brand = values.brand;
            if (values.cateID) updateParams.cateID = values.cateID[values.cateID.length - 1];
            if (values.description) updateParams.description = values.description;
            if (values.remark) updateParams.remark = values.remark;

            // 批量修改每个 SPU
            for (const spuId of selectedIds) {
              try {
                await editSPUInfo(spuId, updateParams, { auth: token });
                successCount++;
              } catch (error) {
                console.error(`修改 SPU ${spuId} 失败:`, error);
                failCount++;
              }
            }

            setLoading(false);
            
            if (failCount === 0) {
              message.success(`批量编辑完成！成功修改 ${successCount} 个 SPU`);
            } else {
              message.warning(`批量编辑完成！成功 ${successCount} 个，失败 ${failCount} 个`);
            }

            form.resetFields();
            onSuccess();
            onClose();
          } catch (error) {
            setLoading(false);
            message.error('批量编辑失败，请重试');
            console.error(error);
          }
        },
      });
    } catch (error) {
      // 表单验证失败
    }
  };

  return (
    <Modal
      title={`批量编辑 SPU (已选择 ${selectedIds.length} 个)`}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="开始编辑"
      cancelText="取消"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={`品牌 (共 ${brandList.length} 个)`}
          name="brand"
          tooltip="留空则不修改"
        >
          <Select
            showSearch
            placeholder="选择新品牌（留空不修改）"
            allowClear
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {brandList.map((brand) => (
              <Select.Option key={brand.name} value={brand.name} label={`${brand.name} ${brand.spell}`}>
                {brand.name} {brand.spell}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="SPU 分类"
          name="cateID"
          tooltip="留空则不修改"
        >
          <Cascader
            options={cascaderOptions}
            placeholder="选择新分类（留空不修改）"
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
            allowClear
          />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
          tooltip="留空则不修改"
        >
          <Input.TextArea
            rows={3}
            placeholder="输入新描述（留空不修改）"
          />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          tooltip="留空则不修改"
        >
          <Input.TextArea
            rows={3}
            placeholder="输入新备注（留空不修改）"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * [页面组件] SPU 列表 的搜索过滤框
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
  cates: SPUCateData[];
}) {
  const { onQuery, loading, cates } = props;

  const [spuCateIDs, setSpuCateIDs] = useState<SPUCateID[]>();
  const [nameKeyword, setNameKeyword] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>();
  const [spuState, setSPUState] = useState<SPU['state']>(SPUState.在用);
  const [isLonely, setIsLonely] = useState<'nofilter' | 'lonely' | 'linked'>('nofilter');
  const [selectedCatePath, setSelectedCatePath] = useState<number[]>();

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
              label="名称关键词"
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
                    setSpuCateIDs(undefined);
                  } else if (value.length === 1 && value[0] === 0) {
                    setSpuCateIDs(undefined);
                  } else {
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
            <Form.Item label="SKU 关联" tooltip="选择要筛选的状态">
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
 * SPU 编辑包装组件
 */
function SPUEditWrapper({ spuId }: { spuId: number }) {
  const { setSpuID } = useSpuIDContext();
  
  useEffect(() => {
    setSpuID(spuId);
  }, [spuId, setSpuID]);

  return <SPUEdit defaultTab="basic" />;
}

/**
 * [页面] SPU 列表
 */
export default function () {
  const [list, setList] = useState<SPUListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchEditVisible, setBatchEditVisible] = useState(false);
  const [editingSpuID, setEditingSpuID] = useState<number | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cates, setCates] = useState<SPUCateData[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // 查询参数
  const [queryParams, setQueryParams] = useState<{
    spuCateIDs?: SPUCateID[];
    nameKeyword?: string;
    brands?: string[];
    spuState?: SPU['state'];
    lonely?: boolean;
  }>();

  // 加载 SPU 分类数据
  useEffect(() => {
    const loadCates = async () => {
      const res = await getSPUCateBaseList();
      setCates(res);
    };
    loadCates();
  }, []);

  // 获取权限
  const { permission, errMsg: permissionErrMsg } = usePermission('product-manage');
  
  if (permission === undefined) {
    return <>正在加载权限</>;
  }
  if (permission === null) {
    return <>没有获取到权限, {permissionErrMsg}</>;
  }

  // 加载数据
  const loadData = async (page: number, size: number, params?: typeof queryParams) => {
    setLoading(true);
    try {
      const {
        spuCateIDs: cateIDs,
        nameKeyword,
        brands: brandFilter,
        spuState,
        lonely,
      } = params || {};

      const res = await getSPUListNew(
        {
          cateIDs,
          nameKeyword,
          brands: brandFilter,
          states: spuState ? [spuState] : undefined,
          lonely,
          orderBy: [
            { key: 'p."brand"', sort: 'ASC' },
            { key: 'p."cate_id"', sort: 'ASC' },
            { key: 'p."order"', sort: 'ASC' },
            { key: 'p."id"', sort: 'DESC' },
          ],
          limit: size,
          offset: (page - 1) * size,
        },
        ['id', 'name', 'brand', 'state', 'cateID']
      );

      setList(res);
      setTotal(res.length < size ? (page - 1) * size + res.length : page * size + 1);
    } finally {
      setLoading(false);
    }
  };

  // 处理查询
  const handleQuery = (params: typeof queryParams) => {
    setQueryParams(params);
    setCurrentPage(1);
    loadData(1, pageSize, params);
  };

  // 处理分页变化
  const handleTableChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    loadData(page, size, queryParams);
  };

  // 行选择配置
  const rowSelection: TableRowSelection<SPUListItem> = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  // 打开编辑抽屉
  const handleEdit = (spuId: number) => {
    setEditingSpuID(spuId);
    setDrawerOpen(true);
  };

  // 关闭编辑抽屉
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingSpuID(undefined);
  };

  // 刷新数据
  const refreshData = () => {
    loadData(currentPage, pageSize, queryParams);
    setSelectedRowKeys([]);
  };

  return (
    <PageWrap ppKey="product-manage">
      <SPUCateListProvider>
        <SpuIDProvider>
          <SPUListProvider>
            <BrandListProvider>
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
                    查询、过滤、筛选 SPU，支持单个编辑和批量编辑
                  </p>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* 查询表单 */}
                <QueryForm
                  loading={loading}
                  onQuery={handleQuery}
                  cates={cates}
                />

                {/* 操作栏 */}
                {selectedRowKeys.length > 0 && (
                  <Card style={{ marginBottom: 16 }}>
                    <Space>
                      <span>已选择 <strong>{selectedRowKeys.length}</strong> 项</span>
                      <Button
                        type="primary"
                        icon={<Edit size={16} />}
                        onClick={() => setBatchEditVisible(true)}
                      >
                        批量编辑
                      </Button>
                      <Button onClick={() => setSelectedRowKeys([])}>
                        取消选择
                      </Button>
                    </Space>
                  </Card>
                )}

                {/* 结果表格 */}
                <Card>
                  {list.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Tag color="blue">总计: {total}</Tag>
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
                    rowKey="id"
                    size="middle"
                    dataSource={list}
                    loading={loading}
                    rowSelection={rowSelection}
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
                      {
                        title: '操作',
                        width: 100,
                        fixed: 'right',
                        render: (_, record) => (
                          <Button
                            type="link"
                            size="small"
                            icon={<Edit size={14} />}
                            onClick={() => handleEdit(record.id)}
                          >
                            编辑
                          </Button>
                        ),
                      },
                    ]}
                    pagination={{
                      current: currentPage,
                      pageSize: pageSize,
                      total: total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      pageSizeOptions: [20, 50, 100, 200],
                      onChange: handleTableChange,
                    }}
                    scroll={{ x: 1000, y: 600 }}
                  />
                </Card>

                {/* SPU 编辑抽屉 */}
                <Drawer
                  title="编辑 SPU"
                  placement="right"
                  onClose={handleCloseDrawer}
                  open={drawerOpen}
                  width="66%"
                  destroyOnClose
                  afterOpenChange={(open) => {
                    if (!open) {
                      refreshData();
                    }
                  }}
                >
                  {editingSpuID && (
                    <SPUEditWrapper spuId={editingSpuID} />
                  )}
                </Drawer>

                {/* 批量编辑 Modal */}
                <BatchEditModal
                  visible={batchEditVisible}
                  selectedIds={selectedRowKeys as number[]}
                  onClose={() => setBatchEditVisible(false)}
                  onSuccess={refreshData}
                  cates={cates}
                />
              </div>
            </BrandListProvider>
          </SPUListProvider>
        </SpuIDProvider>
      </SPUCateListProvider>
    </PageWrap>
  );
}
