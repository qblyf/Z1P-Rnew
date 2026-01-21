'use client';
import { SPU, SPUCateID, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUListNew, getSPUCateBaseList, editSPUInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Col, Form, Row, Select, Table, Tag, Alert, Space, Cascader, Drawer, Modal, message } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { PageHeader } from '@ant-design/pro-components';

import { SelectBrands } from '../../components/SelectBrands';
import { Content } from '../../components/style/Content';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider } from '../../datahooks/brand';
import { getAwait } from '../../error';
import { SPUCateListProvider, SpuIDProvider, SPUListProvider, useSpuIDContext } from '../../datahooks/product';
import { usePermission } from '../../datahooks/permission';
import PageWrap from '../../components/PageWrap';
import SPUEdit from '../../components/SPUEdit';
import { useTokenContext } from '../../datahooks/auth';

interface NamingIssue {
  type: 'no_space' | 'has_quanwangtong' | 'no_brand' | 'brand_mismatch' | 'lowercase_brand';
  message: string;
  severity: 'error' | 'warning';
}

interface SPUWithIssues extends Pick<SPU, 'state' | 'name' | 'id' | 'brand' | 'cateID'> {
  issues: NamingIssue[];
}

/**
 * 检查SPU命名是否符合规范
 */
function checkSPUNaming(spu: Pick<SPU, 'name' | 'brand'>, brandList: string[]): NamingIssue[] {
  const issues: NamingIssue[] = [];
  const { name, brand } = spu;

  // 检查是否有品牌
  if (!brand) {
    issues.push({
      type: 'no_brand',
      message: '缺少品牌信息',
      severity: 'error',
    });
    return issues;
  }

  // 检查是否包含"全网通"
  if (name.includes('全网通')) {
    issues.push({
      type: 'has_quanwangtong',
      message: '名称包含"全网通"字样',
      severity: 'warning',
    });
  }

  // 检查品牌名是否在名称开头
  if (!name.startsWith(brand)) {
    issues.push({
      type: 'brand_mismatch',
      message: `名称未以品牌"${brand}"开头`,
      severity: 'error',
    });
    return issues;
  }

  // 检查品牌后是否有空格
  if (name.length > brand.length && name[brand.length] !== ' ') {
    issues.push({
      type: 'no_space',
      message: '品牌名后缺少空格',
      severity: 'error',
    });
  }

  // 检查品牌名大小写（常见品牌）
  const commonBrands: Record<string, string> = {
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'macbook': 'MacBook',
    'huawei': 'HUAWEI',
    'xiaomi': 'Xiaomi',
    'oppo': 'OPPO',
    'vivo': 'vivo',
    'samsung': 'Samsung',
  };

  const lowerBrand = brand.toLowerCase();
  if (commonBrands[lowerBrand] && brand !== commonBrands[lowerBrand]) {
    issues.push({
      type: 'lowercase_brand',
      message: `品牌名大小写可能不正确，建议使用"${commonBrands[lowerBrand]}"`,
      severity: 'warning',
    });
  }

  return issues;
}

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
 * [组件] 批量修改品牌的 Modal
 */
function BatchChangeBrandModal(props: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allBrands: string[];
}) {
  const { visible, onClose, onSuccess, allBrands } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  const { token } = useTokenContext();

  const oldBrand = Form.useWatch('oldBrand', form);

  // 当选择原品牌时，获取该品牌的 SPU 数量
  useEffect(() => {
    if (!oldBrand) {
      setAffectedCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const res = await getSPUListNew(
          {
            brands: [oldBrand],
            states: [SPUState.在用],
            limit: 10000,
            offset: 0,
            orderBy: [{ key: 'p."id"', sort: 'DESC' }],
          },
          ['id']
        );
        setAffectedCount(res.length);
      } catch (error) {
        console.error('获取 SPU 数量失败:', error);
        setAffectedCount(0);
      }
    };

    fetchCount();
  }, [oldBrand]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { oldBrand, newBrand } = values;

      if (oldBrand === newBrand) {
        message.warning('原品牌和新品牌不能相同');
        return;
      }

      if (!token) {
        message.error('未获取到认证信息');
        return;
      }

      Modal.confirm({
        title: '确认批量修改品牌',
        content: `确定要将 ${affectedCount} 个 SPU 的品牌从 "${oldBrand}" 修改为 "${newBrand}" 吗？此操作不可撤销。`,
        okText: '确认修改',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          setLoading(true);
          try {
            // 获取所有需要修改的 SPU
            const spuList = await getSPUListNew(
              {
                brands: [oldBrand],
                states: [SPUState.在用],
                limit: 10000,
                offset: 0,
                orderBy: [{ key: 'p."id"', sort: 'DESC' }],
              },
              ['id', 'name']
            );

            let successCount = 0;
            let failCount = 0;

            // 批量修改每个 SPU
            for (const spu of spuList) {
              try {
                // 修改品牌，同时更新名称（将旧品牌名替换为新品牌名）
                const newName = spu.name.replace(new RegExp(`^${oldBrand}\\s*`), `${newBrand} `);
                
                await editSPUInfo(
                  spu.id,
                  {
                    brand: newBrand,
                    name: newName,
                  },
                  { auth: token }
                );
                successCount++;
              } catch (error) {
                console.error(`修改 SPU ${spu.id} 失败:`, error);
                failCount++;
              }
            }

            setLoading(false);
            
            if (failCount === 0) {
              message.success(`批量修改完成！成功修改 ${successCount} 个 SPU`);
            } else {
              message.warning(`批量修改完成！成功 ${successCount} 个，失败 ${failCount} 个`);
            }

            form.resetFields();
            onSuccess();
            onClose();
          } catch (error) {
            setLoading(false);
            message.error('批量修改失败，请重试');
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
      title="批量修改 SPU 品牌"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="开始修改"
      cancelText="取消"
      width={600}
    >
      <Alert
        message="注意事项"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>此操作将修改所有指定品牌的在用 SPU</li>
            <li>SPU 名称中的品牌名也会自动更新</li>
            <li>修改后无法撤销，请谨慎操作</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          label="原品牌"
          name="oldBrand"
          rules={[{ required: true, message: '请选择原品牌' }]}
        >
          <Select
            showSearch
            placeholder="请选择要修改的原品牌"
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '')?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {allBrands.map((brand) => (
              <Select.Option key={brand} value={brand}>
                {brand}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {oldBrand && (
          <Alert
            message={`该品牌下有 ${affectedCount} 个在用 SPU`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="新品牌"
          name="newBrand"
          rules={[{ required: true, message: '请选择新品牌' }]}
        >
          <Select
            showSearch
            placeholder="请选择新品牌"
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '')?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {allBrands.map((brand) => (
              <Select.Option key={brand} value={brand}>
                {brand}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * [页面组件] SPU 命名规范检查的搜索过滤框
 */
function QueryForm(props: {
  onQuery: (q: {
    spuCateIDs?: SPUCateID[];
    brands?: string[];
    spuState?: SPU['state'];
  }) => void;
}) {
  const { onQuery } = props;

  const [spuCateIDs, setSpuCateIDs] = useState<SPUCateID[]>();
  const [selectedBrands, setSelectedBrands] = useState<string[]>();
  const [spuState, setSPUState] = useState<SPU['state']>(SPUState.在用);
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
          <Form.Item label="SPU 分类" tooltip="选择 SPU 分类">
            <Cascader
              options={cascaderOptions}
              value={selectedCatePath}
              onChange={(value) => {
                setSelectedCatePath(value as number[]);
                if (!value || value.length === 0 || value[0] === 0) {
                  setSpuCateIDs(undefined);
                } else {
                  // 使用最后一级的分类 ID
                  const lastId = value[value.length - 1] as number;
                  setSpuCateIDs([lastId]);
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
              let k3: string[] | undefined = selectedBrands;
              if (k3?.length === 0) {
                k3 = undefined;
              }

              onQuery({
                spuCateIDs,
                brands: k3,
                spuState,
              });
            }}
          >
            开始检查
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

/**
 * [页面] SPU 命名规范性检查
 */
export default function () {
  const [list, setList] = useState<SPUWithIssues[]>();
  const [loading, setLoading] = useState(false);
  const [editingSpuID, setEditingSpuID] = useState<number | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchBrandModalVisible, setBatchBrandModalVisible] = useState(false);
  const [allBrands, setAllBrands] = useState<string[]>([]);

  // 获取权限
  const { permission, errMsg: permissionErrMsg } =
    usePermission('product-manage');
  if (permission === undefined) {
    return <>正在加载权限</>;
  }
  if (permission === null) {
    return <>没有获取到权限, {permissionErrMsg}</>;
  }

  const issueCount = list?.filter(item => item.issues.length > 0).length || 0;
  const errorCount = list?.filter(item => 
    item.issues.some(issue => issue.severity === 'error')
  ).length || 0;
  const warningCount = list?.filter(item => 
    item.issues.some(issue => issue.severity === 'warning') &&
    !item.issues.some(issue => issue.severity === 'error')
  ).length || 0;

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

  // 重新加载数据
  const reloadData = () => {
    // 触发重新检查，这里可以通过设置一个标志来触发
    message.success('数据已更新，请重新点击"开始检查"按钮');
  };

  return (
    <PageWrap ppKey="product-manage">
      <SPUCateListProvider>
        <SpuIDProvider>
          <SPUListProvider>
            <BrandListProvider>
              <Head>
                <title>SPU 命名规范检查</title>
              </Head>
              <PageHeader
                title="SPU 命名规范检查"
                subTitle="检查 SPU 名称是否符合命名规范"
                extra={[
                  <Button
                    key="batch-brand"
                    type="primary"
                    onClick={() => setBatchBrandModalVisible(true)}
                    disabled={allBrands.length === 0}
                  >
                    批量修改品牌
                  </Button>,
                ]}
              ></PageHeader>
              <Content>
          <Alert
            message="命名规范说明"
            description={
              <div>
                <p>SPU 命名应遵循以下规范：</p>
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>SPU 名称使用 品牌名 + 官方名称，之间留空格</li>
                  <li>使用官方名称大小写（如 iPhone 而不是 iphone）</li>
                  <li>不要有错别字</li>
                  <li>不要有"全网通"字样</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <QueryForm
            onQuery={v => {
              const fn = getAwait(async () => {
                setLoading(true);
                const {
                  spuCateIDs: cateIDs,
                  brands,
                  spuState,
                } = v;

                // 从服务器获取数据
                const res = await getSPUListNew(
                  {
                    cateIDs,
                    brands,
                    states: spuState ? [spuState] : undefined,
                    orderBy: [
                      { key: 'p."brand"', sort: 'ASC' },
                      { key: 'p."cate_id"', sort: 'ASC' },
                      { key: 'p."order"', sort: 'ASC' },
                      { key: 'p."id"', sort: 'DESC' },
                    ],
                    limit: 10000,
                    offset: 0,
                  },
                  ['id', 'name', 'brand', 'state', 'cateID']
                );

                // 获取所有品牌列表
                const allBrands = Array.from(new Set(res.map(item => item.brand).filter(Boolean)));
                setAllBrands(allBrands);

                // 检查每个 SPU 的命名规范
                const spuWithIssues: SPUWithIssues[] = res.map(spu => ({
                  ...spu,
                  issues: checkSPUNaming(spu, allBrands),
                }));

                setList(spuWithIssues);
                setLoading(false);
              });
              fn();
            }}
          />

          {list && (
            <>
              <Space style={{ marginBottom: 16, marginTop: 16 }}>
                <Tag color="default">总计: {list.length}</Tag>
                <Tag color="red">错误: {errorCount}</Tag>
                <Tag color="orange">警告: {warningCount}</Tag>
                <Tag color="green">正常: {list.length - issueCount}</Tag>
              </Space>

              <Row>
                <Col flex="auto">
                  <Table
                    rowKey={'id'}
                    size="small"
                    dataSource={list.filter(item => item.issues.length > 0)}
                    loading={loading}
                    columns={[
                      {
                        dataIndex: 'id',
                        title: 'SPU ID',
                        width: 100,
                      },
                      {
                        dataIndex: 'name',
                        title: '名称',
                        width: 300,
                      },
                      {
                        dataIndex: 'brand',
                        title: '品牌',
                        width: 120,
                      },
                      {
                        dataIndex: 'issues',
                        title: '问题',
                        render: (_, record) => (
                          <Space direction="vertical" size="small">
                            {record.issues.map((issue, index) => (
                              <Tag
                                key={index}
                                color={issue.severity === 'error' ? 'red' : 'orange'}
                              >
                                {issue.message}
                              </Tag>
                            ))}
                          </Space>
                        ),
                      },
                      {
                        dataIndex: 'action',
                        title: '操作',
                        width: 100,
                        render: (_, record) => (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleEdit(record.id)}
                          >
                            编辑
                          </Button>
                        ),
                      },
                    ]}
                    pagination={{
                      defaultPageSize: 50,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条异常记录`,
                    }}
                    sticky
                  />
                </Col>
              </Row>
            </>
          )}
        </Content>

        {/* SPU 编辑抽屉 */}
        <Drawer
          title="编辑 SPU"
          placement="right"
          onClose={handleCloseDrawer}
          open={drawerOpen}
          width="66%"
          destroyOnClose
        >
          {editingSpuID && (
            <SPUEditWrapper spuId={editingSpuID} />
          )}
        </Drawer>

        {/* 批量修改品牌 Modal */}
        <BatchChangeBrandModal
          visible={batchBrandModalVisible}
          onClose={() => setBatchBrandModalVisible(false)}
          onSuccess={reloadData}
          allBrands={allBrands}
        />
      </BrandListProvider>
    </SPUListProvider>
  </SpuIDProvider>
</SPUCateListProvider>
</PageWrap>
);
}

/**
 * SPU 编辑包装组件 - 用于设置 spuID 上下文
 */
function SPUEditWrapper({ spuId }: { spuId: number }) {
  const { setSpuID } = useSpuIDContext();
  
  useEffect(() => {
    setSpuID(spuId);
  }, [spuId, setSpuID]);

  return <SPUEdit defaultTab="basic" />;
}
