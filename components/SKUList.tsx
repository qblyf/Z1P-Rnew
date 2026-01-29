import { useState, useMemo, useRef, useEffect } from 'react';
import { SkuID, SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Alert, Col, Row, Table, Tag, Input, Button, Spin, message } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';
import { getSKUList, getSKUsInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { useBrandListContext } from '../datahooks/brand';
import { useSpuIDContext, useSpuListContext } from '../datahooks/product';
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
  const { spuList } = useSpuListContext();
  const { token } = useTokenContext();
  const { brandList } = useBrandListContext();

  const [skuList, setSkuList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSkuID, setSelectedSkuID] = useState<SkuID | undefined>();
  const [skuDetails, setSkuDetails] = useState<Map<number, { gtins: string[], listPrice: number }>>(new Map());
  const [loadingSkuIDs, setLoadingSkuIDs] = useState<Set<number>>(new Set());
  
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
    console.log('spuList length:', spuList.length);
    console.log('================================');
    
    if (!token) {
      console.warn('没有 token，无法加载 SKU 列表');
      return;
    }

    lessAwait(async () => {
      setLoading(true);
      try {
        let spuIDs: number[] = [];
        const limit = 100; // 统一最多获取100条SKU
        
        if (spuID) {
          // 选中了 SPU，获取该 SPU 的 SKU（最多100条）
          spuIDs = [spuID];
          console.log('开始加载选中 SPU 的 SKU...', spuID, '，最多', limit, '条');
        } else {
          // 未选中 SPU，获取当前 SPU 列表中所有 SPU 的 SKU（最多100条）
          spuIDs = spuList.map(spu => spu.id);
          console.log('开始加载 SPU 列表中的 SKU...', spuIDs.length, '个 SPU，最多', limit, '条 SKU');
        }
        
        if (spuIDs.length === 0) {
          console.warn('没有可用的 SPU ID');
          setSkuList([]);
          setLoading(false);
          return;
        }

        // 构建查询参数
        const queryParams: any = {
          limit: limit,
          offset: 0,
          orderBy: [{ key: 'id', sort: 'DESC' }],
          states: [SKUState.在用],
          spuIDs: spuIDs,
        };

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
        
        // 转换数据格式
        const formattedSkus = skus.map((sku: any) => ({
          skuID: sku.id,
          name: sku.name,
          state: sku.state,
          spuID: sku.spuID,
          brand: '',
        }));
        
        setSkuList(formattedSkus);
        setSelectedSkuID(undefined);
        
        if (spuID && formattedSkus.length === 0) {
          console.warn('⚠️ 该 SPU 没有关联的"在用"状态的 SKU');
        }
        
        // 不再自动加载所有SKU详情，改为按需加载
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
  }, [spuID, spuList, token]);

  // 按需加载单个 SKU 详情（69码和官网价）
  const loadSingleSkuDetail = async (skuID: number) => {
    // 如果已经加载过或正在加载，则跳过
    if (skuDetails.has(skuID) || loadingSkuIDs.has(skuID)) {
      return;
    }
    
    // 标记为正在加载
    setLoadingSkuIDs(prev => new Set(prev).add(skuID));
    
    try {
      console.log('开始加载 SKU 详情...', skuID);
      const details = await getSKUsInfo([skuID]);
      
      if (details.length > 0 && !('errInfo' in details[0])) {
        const detail = details[0];
        setSkuDetails(prev => {
          const newMap = new Map(prev);
          newMap.set(detail.id, {
            gtins: detail.gtins || [],
            listPrice: detail.listPrice || 0,
          });
          return newMap;
        });
        console.log('✓ SKU 详情加载完成', skuID);
      }
    } catch (err) {
      console.error('✗ 加载 SKU 详情失败:', skuID, err);
    } finally {
      // 移除加载标记
      setLoadingSkuIDs(prev => {
        const newSet = new Set(prev);
        newSet.delete(skuID);
        return newSet;
      });
    }
  };

  // 复制69码到剪贴板
  const copyGtinsToClipboard = async (gtins: string[]) => {
    try {
      const text = gtins.join('\n');
      await navigator.clipboard.writeText(text);
      const gtinDisplay = gtins.length > 3 
        ? `${gtins.slice(0, 3).join(', ')}... (共${gtins.length}个)` 
        : gtins.join(', ');
      message.success(`69码已复制到剪贴板: ${gtinDisplay}`);
    } catch (err) {
      console.error('复制失败:', err);
      message.error('复制失败，请手动复制');
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
            key: 'name',
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
            width: 40,
            align: 'right' as const,
            render: (_v, v) => {
              const detail = skuDetails.get(v.skuID);
              const isLoading = loadingSkuIDs.has(v.skuID);
              
              // 显示加载中
              if (isLoading) {
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Spin size="small" />
                  </div>
                );
              }
              
              // 已加载且有数据
              if (detail && detail.gtins.length > 0) {
                const gtinsText = detail.gtins.join('\n');
                
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Tag
                      icon={<BarcodeOutlined />}
                      color="blue"
                      style={{ 
                        margin: 0,
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                      }}
                      title={`${gtinsText}\n\n点击复制`}
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止触发行选择
                        copyGtinsToClipboard(detail.gtins);
                      }}
                    >
                      {detail.gtins.length > 1 && (
                        <span style={{ fontSize: '10px', marginLeft: '2px' }}>
                          {detail.gtins.length}
                        </span>
                      )}
                    </Tag>
                  </div>
                );
              }
              
              // 未加载，显示图标，鼠标悬停时加载
              return (
                <div 
                  style={{ display: 'flex', justifyContent: 'flex-end' }}
                  onMouseEnter={() => loadSingleSkuDetail(v.skuID)}
                >
                  <BarcodeOutlined 
                    style={{ 
                      color: '#d9d9d9',
                      fontSize: '16px',
                      cursor: 'pointer',
                    }} 
                  />
                </div>
              );
            },
          },
          {
            key: 'listPrice',
            width: 80,
            align: 'right' as const,
            render: (_v, v) => {
              const detail = skuDetails.get(v.skuID);
              const isLoading = loadingSkuIDs.has(v.skuID);
              
              if (isLoading) {
                return <Spin size="small" />;
              }
              if (!detail || detail.listPrice === 0) {
                return null;
              }
              return (
                <span style={{ fontWeight: 500, color: '#ff4d4f', fontSize: '13px' }}>
                  ¥{(detail.listPrice / 100).toFixed(0)}
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
