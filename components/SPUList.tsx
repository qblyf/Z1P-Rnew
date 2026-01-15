import { useState, useMemo, useRef, useEffect } from 'react';
import { SpuID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Alert, Col, Row, Table, Tag, Input, Button } from 'antd';
import { useBrandListContext } from '../datahooks/brand';
import { useSpuIDContext, useSpuListContext } from '../datahooks/product';

/**
 * [组件] SPU 列表
 * 目前仅支持有效数据.
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SPUList(props: {
  onWandEditSPU?: (id: SpuID) => void;
  onAddClick?: () => void;
  offsetTop?: number;
}) {
  const { onWandEditSPU, onAddClick, offsetTop = 24 } = props;
  const { spuList } = useSpuListContext();
  const { brandList } = useBrandListContext();

  const { spuID, setSpuID } = useSpuIDContext();

  const [search, setSearch] = useState('');
  const el = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(100);

  useEffect(() => {
    if (!el.current) {
      return;
    }
    const rect = el.current.getBoundingClientRect();
    setHeight(window.innerHeight - rect.y - offsetTop);
  }, [el, offsetTop]);

  const spuListFiltered = useMemo(() => {
    const s = search.replaceAll(/\s/g, '').toLowerCase();
    let filtered = spuList;
    
    if (s) {
      filtered = spuList.filter(spu =>
        spu.name.replaceAll(/\s/g, '').toLowerCase().includes(s)
      );
    }
    
    // 按排序号从大到小排序
    return filtered.sort((a, b) => ((b as any).order || 0) - ((a as any).order || 0));
  }, [spuList, search]);

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
          {spuID && (
            <Button
              size="small"
              onClick={() => onWandEditSPU && onWandEditSPU(spuID)}
              style={{ marginLeft: '4px' }}
            >
              编辑
            </Button>
          )}
        </Col>
      </Row>
      {spuListFiltered.length === 1000 && (
        <Alert
          message="最多显示 1000 条数据. 请尽量细化过滤条件避免显示不全."
          type="warning"
        />
      )}
      <Table
        size="small"
        rowKey="id"
        dataSource={spuListFiltered}
        onRow={v => {
          return {
            onClick: () => {
              // 如果点击的是已选中的行，则取消选中；否则选中该行
              if (spuID === v.id) {
                setSpuID(undefined);
              } else {
                setSpuID(v.id);
              }
            },
          };
        }}
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
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.name}
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', gap: '4px' }}>
                    {v.series && <Tag color="gold">{v.series}</Tag>}
                    {v.generation && <Tag color="cyan">{v.generation}</Tag>}
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
        rowClassName={(record) => {
          return spuID === record.id ? 'ant-table-row-selected' : '';
        }}
      />
    </div>
  );
}
