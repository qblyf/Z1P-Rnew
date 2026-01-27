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
        // 构建查询参数 - 不使用 spuIDs，因为 API 可能不支持
        const queryParams: any = {
          limit: 1000,
          offset: 0,
          orderBy: { key: 'p.id', sort: 'DESC' },
          states: [SKUState.在用],
        };

        // 打印完整的请求参数用于调试
        console.log('=== SKU 列表请求参数 ===');
        console.log('queryParams:', JSON.stringify(queryParams, null, 2));
        console.log('fields:', JSON.stringify({
          sku: ['id', 'name', 'state'],
          spu: ['brand'],
        }, null, 2));
        console.log('========================');

        // 使用 getSKUListJoinSPU API 获取 SKU 数据
        // 注意：只请求 API 支持的字段
        const skus = await getSKUListJoinSPU(
          queryParams,
          {
            sku: ['id', 'name', 'state', 'spuID'],
            spu: ['brand'],
          }
        );
        
        console.log('✓ 成功获取 SKU 列表，数量:', skus.length);
        console.log('当前选中的 spuID:', spuID);
        
        // 打印前几条数据的结构用于调试
        if (skus.length > 0) {
          console.log('第一条 SKU 数据示例:', JSON.stringify(skus[0], null, 2));
          console.log('SKU 数据包含的字段:', Object.keys(skus[0]));
        }
        
        // 如果选中了 SPU，在前端筛选
        let filteredSkus = skus;
        if (spuID) {
          filteredSkus = skus.filter((sku: any) => {
            const match = sku.spuID === spuID;
            return match;
          });
          
          console.log('筛选后的 SKU 数量:', filteredSkus.length);
          
          if (filteredSkus.length === 0) {
            console.warn('⚠️ 选中了 SPU 但没有找到匹配的 SKU');
            console.warn('可能的原因：');
            console.warn('1. 该 SPU 没有关联的 SKU');
            console.warn('2. SKU 数量超过 1000 条限制，匹配的 SKU 不在前 1000 条中');
            console.warn('3. 该 SPU 的 SKU 状态不是"在用"');
            console.warn('建议：在 SPU 管理中查看该 SPU 的详细信息');
          }
        } else {
          console.log('未选中 SPU，显示所有 SKU');
        }
        
        // 转换数据格式
        const formattedSkus = filteredSkus.map((sku: any) => ({
          skuID: sku.id,
          name: sku.name,
          state: sku.state,
          brand: sku.brand || '',
        }));
        
        setSkuList(formattedSkus);
        setSelectedSkuID(undefined);
      } catch (err) {
        console.error('✗ 获取 SKU 列表失败');
        console.error('错误对象:', err);
        console.error('错误详情:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          endpoint: Z1P_ENDPOINT,
          hasToken: !!token,
          tokenLength: token?.length,
        });
        
        // 尝试解析错误信息
        if (err && typeof err === 'object') {
          console.error('错误对象的所有属性:', Object.keys(err));
          console.error('错误对象完整内容:', JSON.stringify(err, null, 2));
        }
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
      const searchStr = name.replaceAll(/\s/g, '').toLowerCase();
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
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.name}
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
