import { useState, useMemo, useRef, useEffect } from 'react';
import { SkuID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Alert, Col, Row, Table, Tag, Input, Button, Tooltip } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import { getSPUList, getSPUInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { useBrandListContext } from '../datahooks/brand';
import { useSpuIDContext, useSPUCateIDContext } from '../datahooks/product';
import { useTokenContext } from '../datahooks/auth';
import { lessAwait } from '../error';

/**
 * [组件] SKU 列表
 * 支持显示所有 SKU 或特定 SPU 的 SKU
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SKUList(props: {
  onWantEditSKU?: (id: SkuID) => void;
  onAddClick?: () => void;
  offsetTop?: number;
}) {
  const { onWantEditSKU, onAddClick, offsetTop = 24 } = props;
  const { spuID } = useSpuIDContext();
  const { spuCateID } = useSPUCateIDContext();
  const { token } = useTokenContext();
  const { brandList } = useBrandListContext();

  const [skuList, setSkuList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSkuID, setSelectedSkuID] = useState<SkuID | undefined>();
  
  const el = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(100);

  useEffect(() => {
    if (!el.current) {
      return;
    }
    const rect = el.current.getBoundingClientRect();
    setHeight(window.innerHeight - rect.y - offsetTop);
  }, [el, offsetTop]);

  // 加载 SKU 列表
  useEffect(() => {
    if (!token) {
      return;
    }

    lessAwait(async () => {
      setLoading(true);
      try {
        let skus: any[] = [];
        
        if (spuID) {
          // SPU 选择优先级最高：如果选择了 SPU，只获取该 SPU 的 SKU
          const spu = await getSPUInfo(spuID);
          skus = (spu.skuIDs || []).map(sku => ({
            ...sku,
            spuName: spu.name,
            brand: spu.brand,
          }));
        } else if (spuCateID) {
          // 其次：如果选择了商品分类，获取该分类下所有 SPU 的 SKU
          const spus = await getSPUList({ spuCateIDs: [spuCateID] });
          for (const spu of spus) {
            if (spu.skuIDs && Array.isArray(spu.skuIDs)) {
              const skusWithSpuName = spu.skuIDs.map(sku => ({
                ...sku,
                spuName: spu.name,
                brand: spu.brand,
              }));
              skus = skus.concat(skusWithSpuName);
            }
          }
        } else {
          // 最后：如果都没选择，获取所有 SPU 的 SKU
          const spus = await getSPUList({});
          for (const spu of spus) {
            if (spu.skuIDs && Array.isArray(spu.skuIDs)) {
              const skusWithSpuName = spu.skuIDs.map(sku => ({
                ...sku,
                spuName: spu.name,
                brand: spu.brand,
              }));
              skus = skus.concat(skusWithSpuName);
            }
          }
        }
        
        setSkuList(skus);
        setSelectedSkuID(undefined);
      } catch (err) {
        console.error('获取 SKU 列表失败:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [spuID, spuCateID, token]);

  const skuListFiltered = useMemo(() => {
    const s = search.replaceAll(/\s/g, '').toLowerCase();
    if (!s) {
      return skuList;
    }
    const ret = skuList.filter(sku => {
      const name = sku.name || '';
      const spec = sku.spec || '';
      const color = sku.color || '';
      const combo = sku.combo || '';
      const searchStr = `${name}${spec}${color}${combo}`.replaceAll(/\s/g, '').toLowerCase();
      return searchStr.includes(s);
    });
    return ret;
  }, [skuList, search]);

  return (
    <div ref={el}>
      <Row justify="space-between" align="middle" className="mb-4">
        <Col flex="auto">
          <Input.Search
            size="small"
            style={{ marginTop: '4px', marginBottom: '4px' }}
            value={search}
            placeholder="搜索"
            allowClear
            onChange={e => {
              setSearch(e.target.value);
            }}
          />
        </Col>
        <Col style={{ marginLeft: '8px' }}>
          <Button
            size="small"
            onClick={onAddClick}
          >
            新增
          </Button>
          {selectedSkuID && (
            <Button
              size="small"
              onClick={() => onWantEditSKU && onWantEditSKU(selectedSkuID)}
              style={{ marginLeft: '4px' }}
            >
              编辑
            </Button>
          )}
        </Col>
      </Row>
      {skuListFiltered.length === 1000 && (
        <Alert
          message="最多显示 1000 条数据. 请尽量细化过滤条件避免显示不全."
          type="warning"
        />
      )}
      <Table
        size="small"
        rowKey="id"
        dataSource={skuListFiltered}
        loading={loading}
        showHeader={false}
        columns={[
          {
            key: 'brand',
            width: 80,
            render: (_v, v) => {
              if (!v.brand) {
                return null;
              }
              const b = brandList.find(b => b.name === v.brand);
              if (b) {
                return <Tag color={b.color}>{b.name}</Tag>;
              }
              return <Tag>{v.brand}</Tag>;
            },
          },
          {
            key: 'd',
            render: (_v, v) => {
              // 生成 SKU 名称 - 只显示值，不显示属性字段名
              const skuNameParts: string[] = [];
              if (v.combo) skuNameParts.push(v.combo);
              if (v.spec) skuNameParts.push(v.spec);
              if (v.color) skuNameParts.push(v.color);
              const skuName = skuNameParts.length > 0 ? skuNameParts.join(' ') : `SKU ${v.id}`;
              
              // 组合 SPU 名称和 SKU 规格
              const fullName = v.spuName ? `${v.spuName} ${skuName}` : skuName;
              
              // 格式化官网价
              const listPrice = v.listPrice ? `¥${(v.listPrice / 100).toFixed(2)}` : '-';
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fullName}
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {v.gtins && v.gtins.length > 0 && (
                      <Tooltip title={v.gtins.join(', ')}>
                        <BarcodeOutlined style={{ cursor: 'pointer', color: '#1890ff' }} />
                      </Tooltip>
                    )}
                    <span style={{ fontSize: '12px', color: '#666', minWidth: '60px', textAlign: 'right' }}>
                      {listPrice}
                    </span>
                  </div>
                </div>
              );
            },
          },
        ]}
        pagination={{
          defaultPageSize: 20,
          pageSizeOptions: [20, 100, 1000],
        }}
        scroll={{ y: height - 100 }}
        rowSelection={{
          type: 'radio',
          hideSelectAll: true,
          selectedRowKeys: selectedSkuID ? [selectedSkuID] : [],
          onChange: (selectedRowKeys) => {
            setSelectedSkuID(selectedRowKeys[0] as SkuID | undefined);
          },
        }}
      />
    </div>
  );
}
