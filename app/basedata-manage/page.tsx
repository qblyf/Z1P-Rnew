'use client';

import { Brand } from '@zsqk/z1-sdk/es/z1p/alltypes';
import {
  addBrandInfo,
  editBrandInfo,
  getBrandBaseList,
  getBrandInfo,
} from '@zsqk/z1-sdk/es/z1p/brand';
import { PageHeader } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Switch,
  Table,
  Tabs,
  TabsProps,
  Tag,
  message,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Suspense, useEffect, useMemo, useState } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';

import { Content } from '../../components/style/Content';
import { lessAwait, postAwait } from '../../error';
import { BrandListProvider, useBrandListContext } from '../../datahooks/brand';
import Head from 'next/head';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';

type BaseBrands = Awaited<ReturnType<typeof getBrandBaseList>>;

function BrandManage() {
  const { brandList: brands, reUpdate: refreshBrandList } = useBrandListContext();
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);

  const selectedBrand = selected
    ? brands?.find(v => v.name === selected)
    : undefined;

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input.Search
            placeholder="搜索品牌名称或拼音码"
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增品牌
          </Button>
        </Col>
      </Row>

      {/* 品牌列表表格 */}
      {brands ? (
        <Table
          size="small"
          rowKey="name"
          dataSource={filteredBrands}
          pagination={{
            defaultPageSize: 20,
            pageSizeOptions: [20, 50, 100],
            showTotal: (total) => `共 ${total} 个品牌`,
          }}
          columns={[
            {
              title: '品牌名称',
              dataIndex: 'name',
              width: 150,
              render: (name, record) => (
                <Tag color={record.color}>{name}</Tag>
              ),
            },
            {
              title: '拼音码',
              dataIndex: 'spell',
              width: 100,
            },
            {
              title: '排序号',
              dataIndex: 'order',
              width: 80,
              sorter: (a, b) => (a.order || 0) - (b.order || 0),
            },
            {
              title: '是否展示',
              dataIndex: 'display',
              width: 100,
              render: (display) => (
                <Tag color={display ? 'green' : 'default'}>
                  {display ? '展示' : '隐藏'}
                </Tag>
              ),
            },
            {
              title: '操作',
              width: 80,
              render: (_, record) => (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record.name)}
                >
                  编辑
                </Button>
              ),
            },
          ]}
        />
      ) : (
        '载入中...'
      )}

      {/* 编辑/新增抽屉 */}
      <Drawer
        title={isAddMode ? '新增品牌' : '编辑品牌'}
        placement="right"
        width={400}
        open={drawerOpen}
        onClose={handleDrawerClose}
      >
        <Form layout="vertical">
          {isAddMode ? (
            <BrandAdd onSuccess={handleSuccess} />
          ) : selected ? (
            <BrandEdit name={selected} onSuccess={handleSuccess} />
          ) : null}
        </Form>
      </Drawer>
    </div>
  );
}

function BrandEdit(props: { name: string; onSuccess?: () => void }) {
  const { name, onSuccess } = props;

  const [input, setInput] = useState<{
    spell?: string;
    order?: string;
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
    return <>加载中...</>;
  }

  return (
    <>
      <Form.Item label="品牌名称">
        <Input value={name} disabled />
      </Form.Item>

      <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
        <Input
          value={input.spell ?? preData.spell}
          onChange={e => {
            setInput(update(input, { spell: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <Form.Item label="排序号" tooltip="相同分类 从低到高显示">
        <Input
          type="number"
          value={input.order ?? preData.order}
          onChange={e => {
            setInput(update(input, { order: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <Form.Item label="颜色" tooltip="该品牌名称展示时文字的颜色">
        <Input
          value={input.color ?? preData.color}
          onChange={e => {
            setInput(update(input, { color: { $set: e.target.value } }));
          }}
          placeholder="如: #1890ff 或 blue"
        />
        {(input.color || preData.color) && (
          <Tag color={input.color ?? preData.color} style={{ marginTop: 8 }}>
            预览效果
          </Tag>
        )}
      </Form.Item>

      <Form.Item label="LOGO" tooltip="LOGO 图片 URL">
        <Input
          value={input.logo ?? preData.logo}
          onChange={e => {
            setInput(update(input, { logo: { $set: e.target.value } }));
          }}
          placeholder="输入图片URL"
        />
      </Form.Item>

      <Form.Item label="是否展示" tooltip="是否在快捷选择品牌时将其展示出来">
        <Switch
          checked={input.display ?? preData.display}
          onChange={v => setInput(update(input, { display: { $set: v } }))}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          loading={loading}
          onClick={postAwait(async () => {
            setLoading(true);
            try {
              let order: undefined | number;
              if (input.order !== undefined) {
                order = Number(input.order);
              }
              await editBrandInfo(name, { ...input, order }, { auth: token });
              message.success('修改成功');
              onSuccess?.();
            } finally {
              setLoading(false);
            }
          })}
        >
          确认修改
        </Button>
      </Form.Item>
    </>
  );
}

function BrandAdd(props: { onSuccess?: () => void }) {
  const { onSuccess } = props;
  const [input, setInput] = useState({
    name: '',
    spell: '',
    order: '',
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
    <>
      <Form.Item label="品牌名称" required tooltip="品牌的名称, 唯一">
        <Input
          value={input.name}
          onChange={e => {
            setInput(update(input, { name: { $set: e.target.value } }));
          }}
          placeholder="请输入品牌名称"
        />
      </Form.Item>

      <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
        <Input
          value={input.spell}
          onChange={e => {
            setInput(update(input, { spell: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <Form.Item label="排序号" tooltip="相同分类 从低到高显示">
        <Input
          type="number"
          value={input.order}
          onChange={e => {
            setInput(update(input, { order: { $set: e.target.value } }));
          }}
          placeholder="数字越小越靠前"
        />
      </Form.Item>

      <Form.Item label="颜色" tooltip="该品牌名称展示时文字的颜色">
        <Input
          value={input.color}
          onChange={e => {
            setInput(update(input, { color: { $set: e.target.value } }));
          }}
          placeholder="如: #1890ff 或 blue"
        />
        {input.color && (
          <Tag color={input.color} style={{ marginTop: 8 }}>
            预览效果
          </Tag>
        )}
      </Form.Item>

      <Form.Item label="LOGO" tooltip="LOGO 图片 URL">
        <Input
          value={input.logo}
          onChange={e => {
            setInput(update(input, { logo: { $set: e.target.value } }));
          }}
          placeholder="输入图片URL"
        />
      </Form.Item>

      <Form.Item label="是否展示" tooltip="是否在快捷选择品牌时将其展示出来">
        <Switch
          checked={input.display}
          onChange={v => setInput(update(input, { display: { $set: v } }))}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          loading={loading}
          disabled={!input.name}
          onClick={postAwait(async () => {
            if (!input.name) {
              message.warning('请输入品牌名称');
              return;
            }
            setLoading(true);
            try {
              const order = Number(input.order) || 0;
              const logo = input.logo === '' ? undefined : input.logo;
              await addBrandInfo(
                { name: input.name, spell: input.spell, order, color: input.color, logo, display: input.display },
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
 * [页面] 基础数据管理
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  const items: TabsProps['items'] = [
    {
      label: '品牌管理',
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
      <PageHeader
        title="基础数据管理"
        subTitle="管理品牌等基础数据"
      ></PageHeader>
      <Content>
        <Tabs defaultActiveKey="brand" items={items} />
      </Content>
    </PageWrap>
  );
}
