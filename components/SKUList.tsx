import { useState, useMemo, useRef, useEffect } from 'react';
import { SkuID, SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Alert, Col, Row, Table, Tag, Input, Button } from 'antd';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import { useBrandListContext } from '../datahooks/brand';
import { useSpuIDContext, useSPUCateIDContext } from '../datahooks/product';
import { useTokenContext } from '../datahooks/auth';
import { lessAwait } from '../error';
import { Z1P_ENDPOINT } from '../constants';

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
    console.log('SKUList useEffect - token:', token ? '存在' : '不存在');
    if (!token) {
      console.warn('没有 token，无法加载 SKU 列表');
      return;
    }

    lessAwait(async () => {
      setLoading(true);
      console.log('开始加载 SKU 列表...');
      try {
        // 构建查询参数
        const queryParams: any = {
          limit: 1000,
          offset: 0,
          orderBy: { key: 'p.id', sort: 'DESC' },
        };

        // 只添加非空的查询参数
        if (spuID) {
          queryParams.spuIDs = [spuID];
        }
        
        queryParams.states = [SKUState.在用];

        // 使用 getSKUListJoinSPU API 一次性获取 SKU 和 SPU 关联数据
        const skus = await getSKUListJoinSPU(
          queryParams,
          {
            sku: ['id', 'name', 'state'],
            spu: ['brand', 'spuName'],
          }
        );
        
        // 转换数据格式
        const formattedSkus = skus.map((sku: any) => ({
          skuID: sku.id,
          name: sku.name,
          state: sku.state,
          spuName: sku.spuName || '',
          brand: sku.brand || '',
        }));
        
        setSkuList(formattedSkus);
        setSelectedSkuID(undefined);
      } catch (err) {
        console.error('获取 SKU 列表失败:', err);
        console.error('错误详情:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          endpoint: Z1P_ENDPOINT,
          hasToken: !!token,
          tokenLength: token?.length,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [spuID, token]);

  const skuListFiltered = useMemo(() => {
    const s = search.replaceAll(/\s/g, '').toLowerCase();
    if (!s) {
      return skuList;
    }
    const ret = skuList.filter(sku => {
      const name = sku.name || '';
      const spuName = sku.spuName || '';
      const searchStr = `${spuName}${name}`.replaceAll(/\s/g, '').toLowerCase();
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
        rowKey="skuID"
        dataSource={skuListFiltered}
        loading={loading}
        showHeader={false}
        onRow={(record) => {
          return {
            onClick: () => {
              // 点击整行时切换选中状态
              if (selectedSkuID === record.skuID) {
                setSelectedSkuID(undefined);
              } else {
                setSelectedSkuID(record.skuID);
              }
            },
            style: { cursor: 'pointer' },
          };
        }}
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
              // 组合 SPU 名称和 SKU 名称
              const fullName = v.spuName ? `${v.spuName} ${v.name}` : v.name;
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fullName}
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
