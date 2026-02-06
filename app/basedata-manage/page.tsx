'use client';

import { Brand } from '@zsqk/z1-sdk/es/z1p/alltypes';
import {
  addBrandInfo,
  editBrandInfo,
  getBrandInfo,
} from '@zsqk/z1-sdk/es/z1p/brand';
import {
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  TabsProps,
  Tag,
  Typography,
  message,
} from 'antd';
import { 
  EditOutlined, 
  PlusOutlined, 
  SearchOutlined,
  TagsOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { Suspense, useEffect, useMemo, useState } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';

import { lessAwait, postAwait } from '../../error';
import { BrandListProvider, useBrandListContext } from '../../datahooks/brand';
import Head from 'next/head';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';

const { Title, Text } = Typography;

function BrandManage() {
  const { brandList: brands, reUpdate: refreshBrandList } = useBrandListContext();
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);

  // 过滤品牌列表
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    if (!search) return brands;
    const s = search.toLowerCase();
    return brands.filter(b => 
      b.name.toLowerCase().includes(s) || 
      (b.spell && b.spell.toLowerCase().includes(s))
    );
  }, [brands, search]);

  // 统计数据
  const stats = useMemo(() => {
    if (!brands) return { total: 0, visible: 0, hidden: 0 };
    return {
      total: brands.length,
      visible: brands.filter(b => (b as any).display !== false).length,
      hidden: brands.filter(b => (b as any).display === false).length,
    };
  }, [brands]);

  const handleEdit = (name: string) => {
    setSelected(name);
    setIsAddMode(false);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setSelected(undefined);
    setIsAddMode(true);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelected(undefined);
    setIsAddMode(false);
  };

  const handleSuccess = () => {
    handleDrawerClose();
    refreshBrandList?.();
  };

  return (
    <>
      <style jsx>{`
        :global(.compact-brand-table .ant-table-tbody > tr > td) {
          padding: 4px 8px !important;
          line-height: 1.3;
        }
        :global(.compact-brand-table .ant-table-thead > tr > th) {
          padding: 8px 8px !important;
          font-weight: 600;
        }
        :global(.compact-brand-table .ant-table-tbody > tr) {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        :global(.compact-brand-table .ant-table-tbody > tr:hover) {
          background-color: #f5f7fa;
        }
      `}</style>
      <div style={{ padding: '24px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
          <TagsOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          品牌管理
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          管理系统中的品牌信息，支持新增、编辑和搜索
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card 
            size="small" 
            style={{ 
              borderRadius: 12, 
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>全部品牌</Text>
                <Title level={3} style={{ margin: '4px 0 0', color: '#1890ff' }}>
                  {stats.total}
                </Title>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                backgroundColor: '#e6f7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TagsOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            size="small" 
            style={{ 
              borderRadius: 12, 
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>展示中</Text>
                <Title level={3} style={{ margin: '4px 0 0', color: '#52c41a' }}>
                  {stats.visible}
                </Title>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                backgroundColor: '#f6ffed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <EyeOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            size="small" 
            style={{ 
              borderRadius: 12, 
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>已隐藏</Text>
                <Title level={3} style={{ margin: '4px 0 0', color: '#faad14' }}>
                  {stats.hidden}
                </Title>
              </div>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                backgroundColor: '#fffbe6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <EyeInvisibleOutlined style={{ fontSize: 24, color: '#faad14' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主内容卡片 */}
      <Card 
        style={{ 
          borderRadius: 12, 
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* 操作栏 */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
          <Col>
            <Input
              placeholder="搜索品牌名称或拼音码"
              allowClear
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 280, borderRadius: 8 }}
            />
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAdd}
              style={{ borderRadius: 8 }}
            >
              新增品牌
            </Button>
          </Col>
        </Row>

        {/* 品牌列表 */}
        {brands ? (
          filteredBrands.length > 0 ? (
            <Table
              size="small"
              rowKey="name"
              dataSource={filteredBrands}
              pagination={{
                defaultPageSize: 50,
                pageSize: 50,
                pageSizeOptions: [50, 100, 200],
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 个品牌`,
                showSizeChanger: true,
                showQuickJumper: true,
                position: ['bottomCenter'],
              }}
              scroll={{ y: 'calc(100vh - 420px)' }}
              columns={[
                {
                  title: '品牌名称',
                  dataIndex: 'name',
                  width: 160,
                  fixed: 'left',
                  render: (name, record) => (
                    <Tag 
                      color={record.color || 'default'} 
                      style={{ 
                        borderRadius: 4,
                        padding: '0 8px',
                        fontSize: 13,
                        margin: 0,
                      }}
                    >
                      {name}
                    </Tag>
                  ),
                },
                {
                  title: '拼音码',
                  dataIndex: 'spell',
                  width: 100,
                  render: (spell) => (
                    <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {spell || '-'}
                    </Text>
                  ),
                },
                {
                  title: '排序',
                  dataIndex: 'order',
                  width: 70,
                  align: 'center',
                  sorter: (a, b) => (a.order || 0) - (b.order || 0),
                  render: (order) => (
                    <Text style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '1px 6px', 
                      borderRadius: 3,
                      fontSize: 12,
                    }}>
                      {order || 0}
                    </Text>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'display',
                  width: 80,
                  align: 'center',
                  filters: [
                    { text: '展示中', value: true },
                    { text: '已隐藏', value: false },
                  ],
                  onFilter: (value, record) => (record as any).display === value,
                  render: (_, record) => {
                    const display = (record as any).display !== false;
                    return (
                      <Tag 
                        color={display ? 'success' : 'default'}
                        style={{ borderRadius: 10, padding: '0 8px', fontSize: 12, margin: 0 }}
                      >
                        {display ? '展示' : '隐藏'}
                      </Tag>
                    );
                  },
                },
                {
                  title: '操作',
                  width: 80,
                  align: 'center',
                  fixed: 'right',
                  render: (_, record) => (
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(record.name)}
                      style={{ padding: '0 4px' }}
                    >
                      编辑
                    </Button>
                  ),
                },
              ]}
              className="compact-brand-table"
              style={{ 
                borderRadius: 8,
              }}
            />
          ) : (
            <Empty 
              description="没有找到匹配的品牌" 
              style={{ padding: '60px 0' }}
            />
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#999' }}>加载中...</div>
          </div>
        )}
      </Card>

      {/* 编辑/新增抽屉 */}
      <Drawer
        title={
          <Space>
            {isAddMode ? <PlusOutlined /> : <EditOutlined />}
            {isAddMode ? '新增品牌' : '编辑品牌'}
          </Space>
        }
        placement="right"
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 420}
        open={drawerOpen}
        onClose={handleDrawerClose}
        styles={{
          body: { padding: '24px' },
          header: { borderBottom: '1px solid #f0f0f0' },
        }}
      >
        {isAddMode ? (
          <BrandAdd onSuccess={handleSuccess} />
        ) : selected ? (
          <BrandEdit name={selected} onSuccess={handleSuccess} />
        ) : null}
      </Drawer>
    </div>
    </>
  );
}

function BrandEdit(props: { name: string; onSuccess?: () => void }) {
  const { name, onSuccess } = props;

  const [input, setInput] = useState<{
    name?: string;
    spell?: string;
    order?: number;
    color?: string;
    logo?: string;
    display?: boolean;
  }>({});
  const [preData, setPreData] = useState<Brand>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fn = async () => {
      const info = await getBrandInfo(name);
      setPreData(info);
    };
    setInput({});
    lessAwait(fn)();
  }, [name]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!preData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin />
        <div style={{ marginTop: 12, color: '#999' }}>加载品牌信息...</div>
      </div>
    );
  }

  return (
    <Form layout="vertical" style={{ marginTop: 8 }}>
      <Form.Item 
        label="品牌名称" 
        tooltip="修改品牌名称后，系统中所有引用该品牌的地方都会更新"
      >
        <Input 
          value={input.name ?? preData.name} 
          onChange={e => {
            setInput(update(input, { name: { $set: e.target.value } }));
          }}
          placeholder="输入品牌名称"
          style={{ 
            borderRadius: 8,
          }} 
        />
      </Form.Item>

      <Form.Item label="拼音码" tooltip="名称的拼音码，方便进行查找">
        <Input
          value={input.spell ?? preData.spell}
          onChange={e => {
            setInput(update(input, { spell: { $set: e.target.value } }));
          }}
          placeholder="输入拼音码"
          style={{ borderRadius: 8 }}
        />
      </Form.Item>

      <Form.Item label="排序号" tooltip="数字越小越靠前显示">
        <InputNumber
          value={input.order ?? preData.order}
          onChange={v => {
            setInput(update(input, { order: { $set: v ?? undefined } }));
          }}
          placeholder="输入排序号"
          style={{ width: '100%', borderRadius: 8 }}
          min={0}
        />
      </Form.Item>

      <Form.Item label="标签颜色" tooltip="品牌标签展示时的颜色">
        <Input
          value={input.color ?? preData.color}
          onChange={e => {
            setInput(update(input, { color: { $set: e.target.value } }));
          }}
          placeholder="如: #1890ff、blue、green"
          style={{ borderRadius: 8 }}
        />
        {(input.color || preData.color) && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>预览：</Text>
            <Tag 
              color={input.color ?? preData.color} 
              style={{ borderRadius: 6, padding: '2px 12px' }}
            >
              {name}
            </Tag>
          </div>
        )}
      </Form.Item>

      <Form.Item label="LOGO地址" tooltip="品牌LOGO图片的URL地址">
        <Input
          value={input.logo ?? preData.logo}
          onChange={e => {
            setInput(update(input, { logo: { $set: e.target.value } }));
          }}
          placeholder="输入图片URL"
          style={{ borderRadius: 8 }}
        />
      </Form.Item>

      <Form.Item label="是否展示" tooltip="是否在快捷选择品牌时展示">
        <Switch
          checked={input.display ?? preData.display}
          onChange={v => setInput(update(input, { display: { $set: v } }))}
          checkedChildren="展示"
          unCheckedChildren="隐藏"
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
        <Button
          type="primary"
          loading={loading}
          block
          size="large"
          disabled={input.name !== undefined && !input.name.trim()}
          style={{ borderRadius: 8 }}
          onClick={postAwait(async () => {
            if (input.name !== undefined && !input.name.trim()) {
              message.warning('品牌名称不能为空');
              return;
            }
            setLoading(true);
            try {
              await editBrandInfo(name, { ...input }, { auth: token });
              message.success('修改成功');
              onSuccess?.();
            } finally {
              setLoading(false);
            }
          })}
        >
          保存修改
        </Button>
      </Form.Item>
    </Form>
  );
}

function BrandAdd(props: { onSuccess?: () => void }) {
  const { onSuccess } = props;
  const [input, setInput] = useState({
    name: '',
    spell: '',
    order: 0,
    color: '',
    logo: '',
    display: true,
  });
  const [loading, setLoading] = useState(false);

  // 自动生成拼音码
  useEffect(() => {
    if (input.name) {
      setInput(prev => ({
        ...prev,
        spell: pinyin.convertToFirstLetter(prev.name),
      }));
    }
  }, [input.name]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  return (
    <Form layout="vertical" style={{ marginTop: 8 }}>
      <Form.Item 
        label="品牌名称" 
        required 
        tooltip="品牌的唯一标识名称"
      >
        <Input
          value={input.name}
          onChange={e => {
            setInput(update(input, { name: { $set: e.target.value } }));
          }}
          placeholder="请输入品牌名称"
          style={{ borderRadius: 8 }}
        />
      </Form.Item>

      <Form.Item label="拼音码" tooltip="自动根据名称生成，可手动修改">
        <Input
          value={input.spell}
          onChange={e => {
            setInput(update(input, { spell: { $set: e.target.value } }));
          }}
          placeholder="自动生成"
          style={{ borderRadius: 8 }}
        />
      </Form.Item>

      <Form.Item label="排序号" tooltip="数字越小越靠前显示">
        <InputNumber
          value={input.order}
          onChange={v => {
            setInput(update(input, { order: { $set: v ?? 0 } }));
          }}
          placeholder="输入排序号"
          style={{ width: '100%', borderRadius: 8 }}
          min={0}
        />
      </Form.Item>

      <Form.Item label="标签颜色" tooltip="品牌标签展示时的颜色">
        <Input
          value={input.color}
          onChange={e => {
            setInput(update(input, { color: { $set: e.target.value } }));
          }}
          placeholder="如: #1890ff、blue、green"
          style={{ borderRadius: 8 }}
        />
        {input.color && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>预览：</Text>
            <Tag 
              color={input.color} 
              style={{ borderRadius: 6, padding: '2px 12px' }}
            >
              {input.name || '品牌名称'}
            </Tag>
          </div>
        )}
      </Form.Item>

      <Form.Item label="LOGO地址" tooltip="品牌LOGO图片的URL地址">
        <Input
          value={input.logo}
          onChange={e => {
            setInput(update(input, { logo: { $set: e.target.value } }));
          }}
          placeholder="输入图片URL"
          style={{ borderRadius: 8 }}
        />
      </Form.Item>

      <Form.Item label="是否展示" tooltip="是否在快捷选择品牌时展示">
        <Switch
          checked={input.display}
          onChange={v => setInput(update(input, { display: { $set: v } }))}
          checkedChildren="展示"
          unCheckedChildren="隐藏"
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
        <Button
          type="primary"
          loading={loading}
          block
          size="large"
          disabled={!input.name}
          style={{ borderRadius: 8 }}
          onClick={postAwait(async () => {
            if (!input.name) {
              message.warning('请输入品牌名称');
              return;
            }
            setLoading(true);
            try {
              const logo = input.logo === '' ? undefined : input.logo;
              await addBrandInfo(
                { name: input.name, spell: input.spell, order: input.order, color: input.color, logo, display: input.display },
                { auth: token }
              );
              message.success('创建成功');
              onSuccess?.();
            } finally {
              setLoading(false);
            }
          })}
        >
          创建品牌
        </Button>
      </Form.Item>
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
 * [页面] 基础数据管理
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  const items: TabsProps['items'] = [
    {
      label: (
        <span>
          <TagsOutlined />
          品牌管理
        </span>
      ),
      key: 'brand',
      children: (
        <BrandListProvider>
          <BrandManage />
        </BrandListProvider>
      ),
    },
  ];

  return (
    <PageWrap ppKey="product-manage">
      <Head>
        <title>基础数据管理</title>
      </Head>
      <Tabs 
        defaultActiveKey="brand" 
        items={items}
        style={{ 
          backgroundColor: '#fff',
          padding: '0 16px',
        }}
      />
    </PageWrap>
  );
}
