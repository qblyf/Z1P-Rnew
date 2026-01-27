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
  const { spuList, currentPage, pageSize, hasMore, loadPage } = useSpuListContext();
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
    
    if (s) {
      return spuList.filter(spu =>
        spu.name.replaceAll(/\s/g, '').toLowerCase().includes(s)
      );
    }
    
    // 数据已经在服务端按 order 字段降序排序，无需再次排序
    return spuList;
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
      {spuListFiltered.length === pageSize && (
        <Alert
          message={`当前显示第 ${currentPage} 页，每页 ${pageSize} 条数据。使用下方分页按钮加载更多。`}
          type="info"
          style={{ marginBottom: '8px' }}
        />
      )}
      <Table
        size="small"
        rowKey="id"
        dataSource={spuListFiltered}
        showHeader={false}
        onRow={(record) => {
          return {
            onClick: () => {
              console.log('=== SPU 行点击事件 ===');
              console.log('点击的 SPU ID:', record.id);
              console.log('当前选中的 spuID:', spuID);
              
              // 点击整行时切换选中状态
              if (spuID === record.id) {
                console.log('取消选中 SPU');
                setSpuID(undefined);
              } else {
                console.log('选中 SPU:', record.id);
                setSpuID(record.id);
              }
              console.log('====================');
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
                  <div style={{ flexShrink: 0, display: 'flex', gap: '4px' }}>
                    {v.series && <Tag color="gold">{v.series}</Tag>}
                    {v.generation && <Tag color="cyan">{v.generation}</Tag>}
                  </div>
                </div>
              );
            },
          },
        ]}
        pagination={false}
        scroll={{ y: height - 140 }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: spuID ? [spuID] : [],
          hideSelectAll: true,
          onChange: (selectedRowKeys) => {
            console.log('=== SPU 选择变化 ===');
            console.log('selectedRowKeys:', selectedRowKeys);
            console.log('当前 spuID:', spuID);
            
            // 如果点击的是已选中的项，则取消选中
            if (selectedRowKeys.length === 0) {
              console.log('取消选中（通过选择框）');
              setSpuID(undefined);
            } else if (selectedRowKeys[0] === spuID) {
              console.log('取消选中（重复点击）');
              setSpuID(undefined);
            } else {
              console.log('选中新的 SPU:', selectedRowKeys[0]);
              setSpuID(selectedRowKeys[0] as SpuID);
            }
            console.log('==================');
          },
        }}
      />
      <Row justify="center" align="middle" style={{ marginTop: '12px', gap: '8px' }}>
        <Button
          size="small"
          disabled={currentPage === 1}
          onClick={() => loadPage(currentPage - 1)}
        >
          上一页
        </Button>
        <span style={{ margin: '0 8px' }}>第 {currentPage} 页</span>
        <Button
          size="small"
          disabled={!hasMore}
          onClick={() => loadPage(currentPage + 1)}
        >
          下一页
        </Button>
      </Row>
    </div>
  );
}
