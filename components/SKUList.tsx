import { useState, useMemo, useRef, useEffect } from 'react';
import { SkuID, SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Alert, Col, Row, Table, Tag, Input, Button, Spin } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import { getSKUList, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { useBrandListContext } from '../datahooks/brand';
import { useSpuIDContext } from '../datahooks/product';
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
  const { token } = useTokenContext();
  const { brandList } = useBrandListContext();

  const [skuList, setSkuList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSkuID, setSelectedSkuID] = useState<SkuID | undefined>();
  const [skuDetails, setSkuDetails] = useState<Map<number, { gtins: string[], listPrice: number }>>(new Map());
  
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
    console.log('=== SKUList useEffect 触发 ===');
    console.log('token:', token ? '存在' : '不存在');
    console.log('spuID:', spuID);
    console.log('================================');
    
    if (!token) {
      console.warn('没有 token，无法加载 SKU 列表');
      return;
    }

    lessAwait(async () => {
      setLoading(true);
      console.log('开始加载 SKU 列表...', spuID ? `(SPU: ${spuID})` : '(所有 SKU)');
      try {
        // 构建查询参数
        const queryParams: any = {
          limit: 5000,
          offset: 0,
          orderBy: { key: 'id', sort: 'DESC' },
          states: [SKUState.在用],
        };

        // 如果选中了 SPU，添加 spuIDs 参数
        if (spuID) {
          queryParams.spuIDs = [spuID];
        }

        // 打印完整的请求参数用于调试
        console.log('=== SKU 列表请求参数 ===');
        console.log('queryParams:', JSON.stringify(queryParams, null, 2));
        console.log('fields:', JSON.stringify(['id', 'name', 'state', 'spuID'], null, 2));
        console.log('========================');

        // 使用 getSKUList API 获取 SKU 数据
        const skus = await getSKUList(
          queryParams,
          ['id', 'name', 'state', 'spuID']
        );
        
        console.log('✓ 成功获取 SKU 列表，数量:', skus.length);
        
        // 打印前几条数据的结构用于调试
        if (skus.length > 0) {
          console.log('第一条 SKU 数据示例:', JSON.stringify(skus[0], null, 2));
        }
        
        // 如果选中了 SPU，进行前端筛选（以防后端参数不生效）
        let filteredSkus = skus;
        if (spuID) {
          filteredSkus = skus.filter(sku => sku.spuID === spuID);
          console.log(`按 SPU ${spuID} 筛选后的 SKU 数量:`, filteredSkus.length);
        }
        
        // 转换数据格式 - getSKUList 不返回 brand，需要从 brandList 中匹配
        const formattedSkus = filteredSkus.map((sku: any) => ({
          skuID: sku.id,
          name: sku.name,
          state: sku.state,
          brand: '', // getSKUList 不返回 brand，需要从 SKU 名称中提取或留空
        }));
        
        setSkuList(formattedSkus);
        setSelectedSkuID(undefined);
        
        if (spuID && formattedSkus.length === 0) {
          console.warn('⚠️ 该 SPU 没有关联的"在用"状态的 SKU');
        }
        
        // 后加载 SKU 详情（69码和官网价）
        if (formattedSkus.length > 0) {
          loadSkuDetails(formattedSkus.map(sku => sku.skuID));
        }
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

  // 后加载 SKU 详情（69码和官网价）
  const loadSkuDetails = async (skuIDs: number[]) => {
    if (skuIDs.length === 0) return;
    
    setLoadingDetails(true);
    try {
      console.log('开始加载 SKU 详情...', skuIDs.length, '条');
      const details = await getSKUsInfo(skuIDs);
      
      const detailsMap = new Map<number, { gtins: string[], listPrice: number }>();
      details.forEach((detail: any) => {
        if (!('errInfo' in detail)) {
          detailsMap.set(detail.id, {
            gtins: detail.gtins || [],
            listPrice: detail.listPrice || 0,
          });
        }
      });
      
      setSkuDetails(detailsMap);
      console.log('✓ SKU 详情加载完成');
    } catch (err) {
      console.error('✗ 加载 SKU 详情失败:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

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
        showHeader={true}
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
            key: 'name',
            title: 'SKU名称',
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
          {
            key: 'gtins',
            title: '69码',
            width: 150,
            render: (_v, v) => {
              const detail = skuDetails.get(v.skuID);
              if (loadingDetails && !detail) {
                return <Spin size="small" />;
              }
              if (!detail || detail.gtins.length === 0) {
                return <span style={{ color: '#999' }}>-</span>;
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BarcodeOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontSize: '12px' }}>{detail.gtins[0]}</span>
                  {detail.gtins.length > 1 && (
                    <Tag color="blue" style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                      +{detail.gtins.length - 1}
                    </Tag>
                  )}
                </div>
              );
            },
          },
          {
            key: 'listPrice',
            title: '官网价',
            width: 100,
            align: 'right' as const,
            render: (_v, v) => {
              const detail = skuDetails.get(v.skuID);
              if (loadingDetails && !detail) {
                return <Spin size="small" />;
              }
              if (!detail || detail.listPrice === 0) {
                return <span style={{ color: '#999' }}>-</span>;
              }
              return (
                <span style={{ fontWeight: 500, color: '#ff4d4f' }}>
                  ¥{(detail.listPrice / 100).toFixed(2)}
                </span>
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
