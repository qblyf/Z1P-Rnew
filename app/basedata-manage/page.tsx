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
  Modal,
  Row,
  Space,
  Spin,
  Switch,
  Tabs,
  TabsProps,
  Tag,
  Tooltip,
  Typography,
  message,
  Pagination,
} from 'antd';
import { 
  EditOutlined, 
  PlusOutlined, 
  SearchOutlined,
  TagsOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SaveOutlined,
  HolderOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { lessAwait, postAwait } from '../../error';
import { BrandListProvider, useBrandListContext } from '../../datahooks/brand';
import Head from 'next/head';
import PageWrap from '../../components/PageWrap';
import { usePageTab } from '../../datahooks/usePageTab';
import { useTokenContext } from '../../datahooks/auth';
import {
  allSpuSpecAttribute,
  editSpuSpecAttribute,
  addSpuSpecAttribute,
} from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute';
import { SpecName } from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute-types';
import type { SpuSpecAttribute } from '@zsqk/z1-sdk/es/z1p/spu-spec-attribute-types';
import { getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';
import { SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

const { Title, Text } = Typography;

// 拖拽类型
const ItemTypes = {
  BRAND_CARD: 'brand_card',
};

// 可拖拽的品牌卡片组件
interface DraggableBrandCardProps {
  brand: Brand;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (name: string) => void;
}

function DraggableBrandCard({ brand, index, moveCard, onEdit }: DraggableBrandCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    { index: number },
    void,
    { handlerId: any }
  >({
    accept: ItemTypes.BRAND_CARD,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.BRAND_CARD,
    item: () => {
      return { index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <Card
        className="brand-card"
        size="small"
        onClick={() => onEdit(brand.name)}
        style={{
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        }}
        bodyStyle={{
          padding: 12,
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {/* 品牌名称 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Tag
              color={brand.color || 'default'}
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {brand.name}
            </Tag>
          </div>

          {/* 拼音码 */}
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {brand.spell || '-'}
          </Text>

          {/* 排序号 */}
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              color: '#999',
              textAlign: 'center',
            }}
          >
            排序 {brand.order || 0}
          </Text>
        </div>
      </Card>
    </div>
  );
}

function BrandManage() {
  const { brandList: brands, reUpdate: refreshBrandList } = useBrandListContext();
  const { token } = useTokenContext();
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(60);
  const [localBrands, setLocalBrands] = useState<Brand[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalBrands, setOriginalBrands] = useState<Brand[]>([]);

  // 同步外部品牌列表到本地
  useEffect(() => {
    if (brands) {
      const sortedBrands = [...brands].sort((a, b) => (b.order || 0) - (a.order || 0));
      setLocalBrands(sortedBrands as Brand[]);
      setOriginalBrands(JSON.parse(JSON.stringify(sortedBrands)));
      setHasChanges(false);
    }
  }, [brands]);

  // 过滤品牌列表
  const filteredBrands = useMemo(() => {
    if (!localBrands) return [];
    if (!search) return localBrands;
    const s = search.toLowerCase();
    return localBrands.filter(b => 
      b.name.toLowerCase().includes(s) || 
      (b.spell && b.spell.toLowerCase().includes(s))
    );
  }, [localBrands, search]);

  // 分页数据
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredBrands.slice(start, end);
  }, [filteredBrands, currentPage, pageSize]);

  // 统计数据
  const stats = useMemo(() => {
    if (!localBrands) return { total: 0, visible: 0, hidden: 0 };
    return {
      total: localBrands.length,
      visible: localBrands.filter(b => (b as any).display !== false).length,
      hidden: localBrands.filter(b => (b as any).display === false).length,
    };
  }, [localBrands]);

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

  // 拖拽移动卡片
  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
    setLocalBrands((prevBrands) => {
      const newBrands = [...prevBrands];
      const draggedItem = newBrands[dragIndex];
      newBrands.splice(dragIndex, 1);
      newBrands.splice(hoverIndex, 0, draggedItem);
      
      // 重新计算order（降序，最大值在前）
      const maxOrder = 999;
      const step = maxOrder / newBrands.length;
      newBrands.forEach((brand, index) => {
        brand.order = Math.round(maxOrder - index * step);
      });
      
      return newBrands;
    });
    
    setHasChanges(true);
  }, []);

  // 保存排序
  const handleSaveOrder = useCallback(async () => {
    if (!token) return;
    try {
      setSaving(true);
      
      // 找出有变更的项
      const changedBrands = localBrands.filter((brand) => {
        const original = originalBrands.find((o) => o.name === brand.name);
        return original && original.order !== brand.order;
      });

      if (changedBrands.length === 0) {
        message.info('没有需要保存的更改');
        return;
      }

      // 批量保存
      const promises = changedBrands.map((brand) =>
        editBrandInfo(
          brand.name,
          { order: brand.order },
          { auth: token }
        )
      );

      await Promise.all(promises);
      message.success(`保存成功，共更新 ${changedBrands.length} 项`);
      setHasChanges(false);
      refreshBrandList?.();
    } catch (error) {
      message.error('保存失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }, [token, localBrands, originalBrands, refreshBrandList]);

  return (
    <>
      <style jsx>{`
        :global(.brand-card) {
          transition: all 0.3s ease;
          cursor: pointer;
          height: 100%;
        }
        :global(.brand-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
        }
        :global(.brand-card .ant-card-body) {
          padding: 12px !important;
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
            <Space>
              {hasChanges && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveOrder}
                  loading={saving}
                  style={{ borderRadius: 8 }}
                >
                  保存排序
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAdd}
                style={{ borderRadius: 8 }}
              >
                新增品牌
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 品牌列表 */}
        {brands ? (
          filteredBrands.length > 0 ? (
            <>
              <Row gutter={[12, 12]}>
                {paginatedBrands.map((brand, index) => {
                  return (
                    <Col 
                      key={brand.name} 
                      xs={12} 
                      sm={8} 
                      md={6} 
                      lg={4} 
                      xl={3}
                      xxl={2}
                    >
                      <DraggableBrandCard
                        brand={brand}
                        index={index}
                        moveCard={moveCard}
                        onEdit={handleEdit}
                      />
                    </Col>
                  );
                })}
              </Row>

              {/* 分页 */}
              <div style={{ 
                marginTop: 24, 
                display: 'flex', 
                justifyContent: 'center' 
              }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredBrands.length}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size);
                  }}
                  showSizeChanger
                  showQuickJumper
                  pageSizeOptions={[60, 120, 180, 240]}
                  showTotal={(total, range) => 
                    `第 ${range[0]}-${range[1]} 个，共 ${total} 个品牌`
                  }
                />
              </div>
            </>
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

// ============ 规格管理组件 ============

// 可拖拽排序的规格卡片组件（使用 @dnd-kit）
interface SortableSpecCardProps {
  spec: SpuSpecAttribute;
  onEdit: (zid: string) => void;
  onMove: (spec: SpuSpecAttribute, currentIndex: number) => void;
  usageCount?: number;
  relativeIndex: number;
}

function SortableSpecCard({ spec, onEdit, onMove, usageCount, relativeIndex }: SortableSpecCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spec.zid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  // 排序权重显示：sortWeight / 1000
  const sortWeightDisplay = (() => {
    const val = spec.sortWeight / 1000;
    return Number.isInteger(val) ? val.toString() : val.toString();
  })();

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className="spec-card"
        size="small"
        onClick={() => onEdit(spec.zid)}
        style={{
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          cursor: 'pointer',
        }}
        bodyStyle={{
          padding: '8px 10px',
        }}
      >
        {/* 顶部栏：左拖拽按钮 + 右序号 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <div
            ref={setActivatorNodeRef}
            {...listeners}
            style={{ cursor: 'grab', color: '#999', fontSize: 14, lineHeight: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <HolderOutlined />
          </div>
          <Text style={{ fontSize: 11, color: '#999' }}>
            {relativeIndex}
          </Text>
        </div>

        {/* 规格值名称 - 单行省略 */}
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {spec.value}
        </div>

        {/* 标签 - 顿号分割，单行省略 */}
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            marginBottom: 6,
          }}
        >
          {spec.label.length > 0 ? spec.label.join('\u3001') : '-'}
        </Text>

        {/* 底部栏：左排序号 + 右移动按钮 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{ fontSize: 11, color: '#999' }}>
            排序 {sortWeightDisplay}
          </Text>
          <Tooltip title="移动到指定位置">
            <SwapOutlined
              style={{ fontSize: 13, color: '#999', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onMove(spec, relativeIndex);
              }}
            />
          </Tooltip>
        </div>
      </Card>
    </div>
  );
}

interface SpecManageProps {
  specName: SpecName;
  title: string;
}

function SpecManage({ specName, title }: SpecManageProps) {
  const { token } = useTokenContext();
  const [specs, setSpecs] = useState<SpuSpecAttribute[]>([]);
  const [filteredSpecs, setFilteredSpecs] = useState<SpuSpecAttribute[]>([]);
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(60);
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ spec: SpuSpecAttribute; currentIndex: number } | null>(null);
  const [movePosition, setMovePosition] = useState<number | null>(null);

  // 加载使用次数统计
  const loadUsageCounts = useCallback(async () => {
    if (!token) return new Map<string, number>();
    try {
      // 获取所有SPU数据
      const spuList = await getSPUListNew(
        {
          states: [SPUState.在用],
          limit: 10000, // 获取所有数据
          offset: 0,
          orderBy: [
            { key: 'p."id"', sort: 'DESC' }
          ],
        },
        ['id', 'name', 'skuIDs']
      );

      // 统计每个规格值的使用次数
      const counts = new Map<string, number>();
      
      for (const spu of spuList) {
        if (spu.skuIDs && Array.isArray(spu.skuIDs)) {
          for (const sku of spu.skuIDs) {
            let specValue: string | undefined;
            
            // 根据规格类型获取对应的字段
            if (specName === SpecName.组合 && 'combo' in sku) {
              specValue = sku.combo;
            } else if (specName === SpecName.规格 && 'spec' in sku) {
              specValue = sku.spec;
            } else if (specName === SpecName.颜色 && 'color' in sku) {
              specValue = sku.color;
            }
            
            if (specValue) {
              counts.set(specValue, (counts.get(specValue) || 0) + 1);
            }
          }
        }
      }
      
      return counts;
    } catch (error) {
      console.error('加载使用次数失败:', error);
      return new Map<string, number>();
    }
  }, [token, specName]);

  // 加载规格数据
  const loadSpecs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const allSpecs = await allSpuSpecAttribute({ auth: token });
      // 按类型筛选
      const typeSpecs = allSpecs.filter((s) => s.name === specName);
      // 按sortWeight降序排序
      typeSpecs.sort((a, b) => b.sortWeight - a.sortWeight);
      setSpecs(typeSpecs);
      setFilteredSpecs(typeSpecs);
      
      // 加载使用次数
      const counts = await loadUsageCounts();
      setUsageCounts(counts);
    } catch (error) {
      message.error('加载失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token, specName, loadUsageCounts]);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  // 搜索过滤
  useEffect(() => {
    if (!search) {
      setFilteredSpecs(specs);
      return;
    }
    const s = search.toLowerCase();
    const filtered = specs.filter((spec) =>
      spec.value.toLowerCase().includes(s) ||
      spec.label.some((l) => l.toLowerCase().includes(s))
    );
    setFilteredSpecs(filtered);
    setCurrentPage(1);
  }, [search, specs]);

  // 分页数据
  const paginatedSpecs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredSpecs.slice(start, end);
  }, [filteredSpecs, currentPage, pageSize]);

  // 统计数据
  const stats = useMemo(() => {
    const totalUsage = Array.from(usageCounts.values()).reduce((sum, count) => sum + count, 0);
    const usedCount = specs.filter(spec => (usageCounts.get(spec.value) || 0) > 0).length;
    return {
      total: specs.length,
      used: usedCount,
      unused: specs.length - usedCount,
      totalUsage,
    };
  }, [specs, usageCounts]);

  const handleEdit = (zid: string) => {
    setSelected(zid);
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
    loadSpecs();
  };

  // 根据目标绝对位置计算新权重（插值算法）
  // specs 是全量按 sortWeight 降序排列的数组
  const calcNewWeight = useCallback((targetAbsIdx: number, allSpecs: SpuSpecAttribute[], excludeZid: string) => {
    // 排除被移动项本身
    const others = allSpecs.filter((s) => s.zid !== excludeZid);
    if (others.length === 0) return 5000;

    let weight: number;
    if (targetAbsIdx <= 0) {
      // 插入到第一位
      weight = (10000000 + others[0].sortWeight) / 2;
    } else if (targetAbsIdx >= others.length) {
      // 插入到最后一位
      weight = (0.000 + others[others.length - 1].sortWeight) / 2;
    } else {
      // 插入到中间位置
      const prev = others[targetAbsIdx - 1];
      const next = others[targetAbsIdx];
      weight = (prev.sortWeight + next.sortWeight) / 2;
    }

    // 四舍五入保留3位小数
    return Math.round(weight);
  }, []);

  // 保存单个规格值的排序权重到后端
  const saveSpecWeight = useCallback(async (zid: string, sortWeight: number) => {
    if (!token) return;
    try {
      await editSpuSpecAttribute(
        { zid, sortWeight },
        { auth: token }
      );
    } catch (error) {
      message.error('保存排序失败');
      console.error(error);
    }
  }, [token]);

  // @dnd-kit 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // @dnd-kit 拖拽结束回调
  const handleSortEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeZid = active.id as string;
    const overZid = over.id as string;

    // 在当前分页数据中找到拖拽项和目标项的索引
    const oldIndex = paginatedSpecs.findIndex((s) => s.zid === activeZid);
    const newIndex = paginatedSpecs.findIndex((s) => s.zid === overZid);
    if (oldIndex === -1 || newIndex === -1) return;

    // 换算为 filteredSpecs 中的索引
    const pageOffset = (currentPage - 1) * pageSize;
    const dragFilteredIdx = pageOffset + oldIndex;
    const hoverFilteredIdx = pageOffset + newIndex;

    const draggedSpec = filteredSpecs[dragFilteredIdx];
    if (!draggedSpec) return;

    // 相对位置换算绝对位置后插值
    const isSearching = search.length > 0;
    let targetAbsIdx: number;

    if (isSearching) {
      const targetSpec = filteredSpecs[hoverFilteredIdx];
      if (targetSpec) {
        const absIdx = specs.findIndex((s) => s.zid === targetSpec.zid);
        if (hoverFilteredIdx > dragFilteredIdx) {
          targetAbsIdx = absIdx + 1;
        } else {
          targetAbsIdx = absIdx;
        }
      } else {
        targetAbsIdx = specs.length;
      }
    } else {
      targetAbsIdx = hoverFilteredIdx;
    }

    const newWeight = calcNewWeight(targetAbsIdx, specs, draggedSpec.zid);

    // 更新全量 specs
    const newSpecs = specs.map((s) =>
      s.zid === draggedSpec.zid ? { ...s, sortWeight: newWeight } : s
    );
    newSpecs.sort((a, b) => b.sortWeight - a.sortWeight);
    setSpecs(newSpecs);

    // 更新 filteredSpecs
    if (search) {
      const s = search.toLowerCase();
      const filtered = newSpecs.filter((spec) =>
        spec.value.toLowerCase().includes(s) ||
        spec.label.some((l) => l.toLowerCase().includes(s))
      );
      setFilteredSpecs(filtered);
    } else {
      setFilteredSpecs(newSpecs);
    }

    // 保存到后端
    saveSpecWeight(draggedSpec.zid, newWeight);
  }, [filteredSpecs, paginatedSpecs, specs, search, currentPage, pageSize, calcNewWeight, saveSpecWeight]);

  // 打开移动弹框（传入相对位置）
  const handleOpenMoveModal = useCallback((spec: SpuSpecAttribute, currentRelativeIndex: number) => {
    setMoveTarget({ spec, currentIndex: currentRelativeIndex });
    setMovePosition(null);
    setMoveModalOpen(true);
  }, []);

  // 执行移动（用户输入相对位置 → 换算绝对位置 → 插值计算权重）
  const handleMoveConfirm = useCallback(() => {
    if (!moveTarget || movePosition === null || movePosition < 1) {
      message.warning('请输入有效的目标位置');
      return;
    }

    const targetRelIdx = movePosition - 1; // 转为 0-based 相对位置
    const clampedRelIdx = Math.max(0, Math.min(targetRelIdx, filteredSpecs.length - 1));
    const movedSpec = moveTarget.spec;

    // 当前相对位置
    const currentRelIdx = filteredSpecs.findIndex((s) => s.zid === movedSpec.zid);
    if (currentRelIdx === -1) {
      message.error('未找到该规格值');
      return;
    }
    if (currentRelIdx === clampedRelIdx) {
      message.info('已在目标位置');
      setMoveModalOpen(false);
      return;
    }

    // 相对位置换算绝对位置
    const isSearching = search.length > 0;
    let targetAbsIdx: number;

    if (isSearching) {
      // 搜索模式：找到相对位置目标项在全量 specs 中的位置
      if (clampedRelIdx === 0) {
        // 目标是搜索结果第一项 → 在全量中插到该项之前
        const firstFilteredSpec = filteredSpecs.find((s) => s.zid !== movedSpec.zid);
        if (firstFilteredSpec) {
          const absIdx = specs.findIndex((s) => s.zid === firstFilteredSpec.zid);
          targetAbsIdx = absIdx;
        } else {
          targetAbsIdx = 0;
        }
      } else {
        // 找到目标位置的前一项（在排除自身之后的 filteredSpecs 中）
        const otherFiltered = filteredSpecs.filter((s) => s.zid !== movedSpec.zid);
        const actualIdx = Math.min(clampedRelIdx, otherFiltered.length);
        if (actualIdx >= otherFiltered.length) {
          // 插到最后
          const lastSpec = otherFiltered[otherFiltered.length - 1];
          const absIdx = specs.findIndex((s) => s.zid === lastSpec.zid);
          targetAbsIdx = absIdx + 1;
        } else {
          const targetFilteredSpec = otherFiltered[actualIdx];
          const absIdx = specs.findIndex((s) => s.zid === targetFilteredSpec.zid);
          targetAbsIdx = absIdx;
        }
      }
    } else {
      // 非搜索模式：相对位置 = 绝对位置
      targetAbsIdx = clampedRelIdx;
    }

    // 插值计算新权重
    const newWeight = calcNewWeight(targetAbsIdx, specs, movedSpec.zid);

    // 更新全量 specs
    const newSpecs = specs.map((s) =>
      s.zid === movedSpec.zid ? { ...s, sortWeight: newWeight } : s
    );
    newSpecs.sort((a, b) => b.sortWeight - a.sortWeight);
    setSpecs(newSpecs);

    // 更新 filteredSpecs
    if (search) {
      const s = search.toLowerCase();
      const filtered = newSpecs.filter((spec) =>
        spec.value.toLowerCase().includes(s) ||
        spec.label.some((l) => l.toLowerCase().includes(s))
      );
      setFilteredSpecs(filtered);
    } else {
      setFilteredSpecs(newSpecs);
    }

    setMoveModalOpen(false);
    saveSpecWeight(movedSpec.zid, newWeight);
    message.success(`已将「${movedSpec.value}」移动到第 ${movePosition} 位`);
  }, [moveTarget, movePosition, filteredSpecs, specs, search, calcNewWeight, saveSpecWeight]);

  if (!token) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        :global(.spec-card) {
          transition: all 0.3s ease;
          cursor: pointer;
          height: 100%;
        }
        :global(.spec-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
        }
        :global(.spec-card .ant-card-body) {
          padding: 12px !important;
        }
      `}</style>
      <div style={{ padding: '24px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            <TagsOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            {title}管理
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            管理系统中的{title}规格属性，支持新增、编辑和搜索
          </Text>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
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
                  <Text type="secondary" style={{ fontSize: 13 }}>全部{title}</Text>
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
          <Col xs={24} sm={12} md={6}>
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
                  <Text type="secondary" style={{ fontSize: 13 }}>已使用</Text>
                  <Title level={3} style={{ margin: '4px 0 0', color: '#52c41a' }}>
                    {stats.used}
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
          <Col xs={24} sm={12} md={6}>
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
                  <Text type="secondary" style={{ fontSize: 13 }}>未使用</Text>
                  <Title level={3} style={{ margin: '4px 0 0', color: '#faad14' }}>
                    {stats.unused}
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
          <Col xs={24} sm={12} md={6}>
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
                  <Text type="secondary" style={{ fontSize: 13 }}>总使用次数</Text>
                  <Title level={3} style={{ margin: '4px 0 0', color: '#722ed1' }}>
                    {stats.totalUsage}
                  </Title>
                </div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: '#f9f0ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TagsOutlined style={{ fontSize: 24, color: '#722ed1' }} />
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
                placeholder={`搜索${title}值或描述`}
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
                新增{title}
              </Button>
            </Col>
          </Row>

          {/* 规格列表 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#999' }}>加载中...</div>
            </div>
          ) : filteredSpecs.length > 0 ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSortEnd}
              >
                <SortableContext
                  items={paginatedSpecs.map((s) => s.zid)}
                  strategy={rectSortingStrategy}
                >
                  <Row gutter={[12, 12]}>
                    {paginatedSpecs.map((spec, index) => {
                      const relativeIndex = (currentPage - 1) * pageSize + index + 1;
                      return (
                        <Col
                          key={spec.zid}
                          span={3}
                        >
                          <SortableSpecCard
                            spec={spec}
                            onEdit={handleEdit}
                            onMove={handleOpenMoveModal}
                            usageCount={usageCounts.get(spec.value)}
                            relativeIndex={relativeIndex}
                          />
                        </Col>
                      );
                    })}
                  </Row>
                </SortableContext>
              </DndContext>

              {/* 分页 */}
              <div style={{
                marginTop: 24,
                display: 'flex',
                justifyContent: 'center'
              }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredSpecs.length}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size);
                  }}
                  showSizeChanger
                  showQuickJumper
                  pageSizeOptions={[60, 120, 180, 240]}
                  showTotal={(total, range) =>
                    `第 ${range[0]}-${range[1]} 个，共 ${total} 个${title}`
                  }
                />
              </div>
            </>
          ) : (
            <Empty
              description={`没有找到匹配的${title}`}
              style={{ padding: '60px 0' }}
            />
          )}
        </Card>

        {/* 编辑/新增抽屉 */}
        <Drawer
          title={
            <Space>
              {isAddMode ? <PlusOutlined /> : <EditOutlined />}
              {isAddMode ? `新增${title}` : `编辑${title}`}
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
            <SpecAdd specName={specName} title={title} onSuccess={handleSuccess} specs={specs} />
          ) : selected ? (
            <SpecEdit zid={selected} title={title} onSuccess={handleSuccess} specName={specName} specs={specs} />
          ) : null}
        </Drawer>

        {/* 移动规格值弹框 */}
        <Modal
          title="移动规格值"
          open={moveModalOpen}
          onOk={handleMoveConfirm}
          onCancel={() => setMoveModalOpen(false)}
          okText="移动"
          cancelText="取消"
        >
          {moveTarget && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Text>
                将「{moveTarget.spec.value}」移动到指定位置
              </Text>
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                  目标位置
                </Text>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={filteredSpecs.length}
                  value={movePosition}
                  onChange={(val) => setMovePosition(val)}
                  placeholder="输入目标位置序号，移动后会自动调整权重，确保该规格值位于指定位置"
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}

function SpecEdit(props: { zid: string; title: string; onSuccess?: () => void; specName: SpecName; specs: SpuSpecAttribute[] }) {
  const { zid, title, onSuccess, specName, specs } = props;
  const [input, setInput] = useState<{
    value?: string;
    label?: string[];
    insertPosition?: number;
  }>({});
  const [preData, setPreData] = useState<SpuSpecAttribute>();
  const [loading, setLoading] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [spuList, setSpuList] = useState<any[]>([]);
  const [spuLoading, setSpuLoading] = useState(false);

  const { token } = useTokenContext();

  useEffect(() => {
    const fn = async () => {
      if (!token) return;
      const allSpecs = await allSpuSpecAttribute({ auth: token });
      const spec = allSpecs.find((s) => s.zid === zid);
      setPreData(spec);
      if (spec) {
        setLabelInput(spec.label.join(', '));
      }
    };
    setInput({});
    lessAwait(fn)();
  }, [zid, token]);

  // 加载使用该规格的SPU列表
  const loadSpuList = useCallback(async () => {
    if (!token || !preData) return;
    try {
      setSpuLoading(true);
      // 获取所有SPU数据
      const allSpus = await getSPUListNew(
        {
          states: [SPUState.在用],
          limit: 10000,
          offset: 0,
          orderBy: [
            { key: 'p."id"', sort: 'DESC' }
          ],
        },
        ['id', 'name', 'skuIDs']
      );

      // 筛选包含该规格值的SPU
      const filteredSpus = allSpus.filter((spu) => {
        if (!spu.skuIDs || !Array.isArray(spu.skuIDs)) return false;
        
        return spu.skuIDs.some((sku: any) => {
          let specValue: string | undefined;
          
          // 根据规格类型获取对应的字段
          if (specName === SpecName.组合 && 'combo' in sku) {
            specValue = sku.combo;
          } else if (specName === SpecName.规格 && 'spec' in sku) {
            specValue = sku.spec;
          } else if (specName === SpecName.颜色 && 'color' in sku) {
            specValue = sku.color;
          }
          
          return specValue === preData.value;
        });
      });

      setSpuList(filteredSpus);
    } catch (error) {
      console.error('加载SPU列表失败:', error);
      message.error('加载SPU列表失败');
    } finally {
      setSpuLoading(false);
    }
  }, [token, preData, specName]);

  // 当切换到使用列表标签页时加载数据
  useEffect(() => {
    if (activeTab === 'usage' && spuList.length === 0) {
      loadSpuList();
    }
  }, [activeTab, spuList.length, loadSpuList]);

  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!preData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin />
        <div style={{ marginTop: 12, color: '#999' }}>加载{title}信息...</div>
      </div>
    );
  }

  const currentLabel = input.label ?? preData.label;

  const tabItems: TabsProps['items'] = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label={`${title}值`}
            tooltip={`${title}的具体值，如"红色"、"128GB"等`}
          >
            <Input
              value={input.value ?? preData.value}
              disabled
              onChange={e => {
                setInput(update(input, { value: { $set: e.target.value } }));
              }}
              placeholder={`输入${title}值`}
              style={{
                borderRadius: 8,
              }}
            />
          </Form.Item>

          <Form.Item label="规格描述" tooltip="多个描述用逗号分隔">
            <Input
              value={labelInput}
              onChange={e => {
                setLabelInput(e.target.value);
                const labels = e.target.value.split(',').map(l => l.trim()).filter(l => l);
                setInput(update(input, { label: { $set: labels } }));
              }}
              placeholder="输入描述，用逗号分隔"
              style={{ borderRadius: 8 }}
            />
            {currentLabel.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {currentLabel.map((label, idx) => (
                  <Tag key={idx} style={{ marginTop: 4 }}>{label}</Tag>
                ))}
              </div>
            )}
          </Form.Item>

          <Form.Item label="排序权重">
            <InputNumber
              value={preData.sortWeight / 1000}
              disabled
              style={{ width: '100%', borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button
              type="primary"
              loading={loading}
              block
              size="large"
              disabled={input.value !== undefined && !input.value.trim()}
              style={{ borderRadius: 8 }}
              onClick={postAwait(async () => {
                if (input.value !== undefined && !input.value.trim()) {
                  message.warning(`${title}值不能为空`);
                  return;
                }
                setLoading(true);
                try {
                  // 根据插入位置计算新权重
                  let newSortWeight: number | undefined;
                  if (input.insertPosition !== undefined) {
                    const targetIdx = input.insertPosition - 1;
                    const others = specs.filter((s) => s.zid !== preData.zid);
                    if (others.length === 0) {
                      newSortWeight = 5000;
                    } else if (targetIdx <= 0) {
                      newSortWeight = (10000 + others[0].sortWeight) / 2;
                    } else if (targetIdx >= others.length) {
                      newSortWeight = (0 + others[others.length - 1].sortWeight) / 2;
                    } else {
                      newSortWeight = (others[targetIdx - 1].sortWeight + others[targetIdx].sortWeight) / 2;
                    }
                  }

                  await editSpuSpecAttribute(
                    {
                      zid: preData.zid,
                      value: input.value,
                      label: input.label,
                      sortWeight: newSortWeight,
                    },
                    { auth: token }
                  );
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
      ),
    },
    {
      key: 'usage',
      label: (
        <span>
          使用列表
          {spuList.length > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {spuList.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
          {spuLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin />
              <div style={{ marginTop: 12, color: '#999' }}>加载SPU列表...</div>
            </div>
          ) : spuList.length > 0 ? (
            <div>
              <div style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
                共有 <Text strong style={{ color: '#1890ff' }}>{spuList.length}</Text> 个SPU使用了该{title}
              </div>
              <div style={{ 
                maxHeight: '500px', 
                overflowY: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
              }}>
                {spuList.map((spu, index) => (
                  <div
                    key={spu.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < spuList.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {spu.name}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ID: {spu.id}
                      </Text>
                    </div>
                    <Tag color="blue">
                      {spu.skuIDs?.length || 0} SKU
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty
              description={`暂无SPU使用该${title}`}
              style={{ padding: '60px 0' }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
      style={{ marginTop: -8 }}
    />
  );
}

function SpecAdd(props: { specName: SpecName; title: string; onSuccess?: () => void; specs: SpuSpecAttribute[] }) {
  const { specName, title, onSuccess, specs } = props;
  const [input, setInput] = useState({
    value: '',
    label: [] as string[],
    insertPosition: specs.length + 1,
  });
  const [labelInput, setLabelInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  return (
    <Form layout="vertical" style={{ marginTop: 8 }}>
      <Form.Item
        label={`${title}值`}
        required
        tooltip={`${title}的具体值，如"红色"、"128GB"等`}
      >
        <Input
          value={input.value}
          onChange={e => {
            setInput(update(input, { value: { $set: e.target.value } }));
          }}
          placeholder={`请输入${title}值`}
          style={{ borderRadius: 8 }}
        />
      </Form.Item>

      <Form.Item label="规格描述" tooltip="多个描述用逗号分隔">
        <Input
          value={labelInput}
          onChange={e => {
            setLabelInput(e.target.value);
            const labels = e.target.value.split(',').map(l => l.trim()).filter(l => l);
            setInput(update(input, { label: { $set: labels } }));
          }}
          placeholder="输入描述，用逗号分隔"
          style={{ borderRadius: 8 }}
        />
        {input.label.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {input.label.map((label, idx) => (
              <Tag key={idx} style={{ marginTop: 4 }}>{label}</Tag>
            ))}
          </div>
        )}
      </Form.Item>

      <Form.Item label="插入位置" tooltip={`输入目标位置序号（1 ~ ${specs.length + 1}），默认插入到最后`}>
        <InputNumber
          value={input.insertPosition}
          onChange={v => {
            setInput(update(input, { insertPosition: { $set: v ?? specs.length + 1 } }));
          }}
          placeholder="输入插入位置"
          style={{ width: '100%', borderRadius: 8 }}
          min={1}
          max={specs.length + 1}
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
        <Button
          type="primary"
          loading={loading}
          block
          size="large"
          disabled={!input.value}
          style={{ borderRadius: 8 }}
          onClick={postAwait(async () => {
            if (!input.value) {
              message.warning(`请输入${title}值`);
              return;
            }
            setLoading(true);
            try {
              // 根据插入位置计算权重
              const targetIdx = input.insertPosition - 1;
              let sortWeight: number;
              if (specs.length === 0) {
                sortWeight = 5000;
              } else if (targetIdx <= 0) {
                sortWeight = Math.abs((10000 + specs[0].sortWeight) / 2);
              } else if (targetIdx >= specs.length) {
                sortWeight = Math.abs((0 + specs[specs.length - 1].sortWeight) / 2);
              } else {
                sortWeight = Math.abs((specs[targetIdx - 1].sortWeight + specs[targetIdx].sortWeight) / 2);
              }

              await addSpuSpecAttribute(
                {
                  name: specName,
                  value: input.value,
                  label: input.label,
                  sortWeight,
                },
                { auth: token }
              );
              message.success('创建成功');
              onSuccess?.();
            } catch (error) {
              message.error('创建失败');
              console.error(error);
            } finally {
              setLoading(false);
            }
          })}
        >
          创建{title}
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
  // 注册页面标签页
  usePageTab('基础数据管理');
  
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
    {
      label: (
        <span>
          <TagsOutlined />
          版本管理
        </span>
      ),
      key: 'version',
      children: <SpecManage specName={SpecName.组合} title="版本" />,
    },
    {
      label: (
        <span>
          <TagsOutlined />
          配置管理
        </span>
      ),
      key: 'config',
      children: <SpecManage specName={SpecName.规格} title="配置" />,
    },
    {
      label: (
        <span>
          <TagsOutlined />
          颜色管理
        </span>
      ),
      key: 'color',
      children: <SpecManage specName={SpecName.颜色} title="颜色" />,
    },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
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
    </DndProvider>
  );
}
