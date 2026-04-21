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
  const { spuList, currentPage, pageSize, hasMore, loadPage, nameKeyword, setNameKeyword } = useSpuListContext();
  const { brandList } = useBrandListContext();

  const { spuID, setSpuID } = useSpuIDContext();

  const [searchInput, setSearchInput] = useState('');
  const el = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(100);

  useEffect(() => {
    if (!el.current) {
      return;
    }
    const rect = el.current.getBoundingClientRect();
    setHeight(window.innerHeight - rect.y - offsetTop);
  }, [el, offsetTop]);

  // 同步 nameKeyword 到本地输入状态
  useEffect(() => {
    setSearchInput(nameKeyword);
  }, [nameKeyword]);

  return (
    <div ref={el}>
      <Row justify="space-between" align="middle" className="mb-4">
        <Col flex="auto">
          <Input.Search
            size="small"
            style={{ marginTop: '4px', marginBottom: '4px' }}
            value={searchInput}
            placeholder="搜索 SPU 名称"
            allowClear
            onChange={e => {
              setSearchInput(e.target.value);
            }}
            onSearch={(value) => {
              setNameKeyword(value);
              loadPage(1, value);
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
      {spuList.length === pageSize && (
        <Alert
          message={`当前显示第 ${currentPage} 页数据，每页最多 ${pageSize} 条。`}
          type="info"
          style={{ marginBottom: '8px' }}
        />
      )}
      <Table
        size="small"
        rowKey="id"
        dataSource={spuList}
        showHeader={false}
        onRow={(record) => {
          return {
            onClick: () => {
              // 点击整行时切换选中状态
              if (spuID === record.id) {
                setSpuID(undefined);
              } else {
                setSpuID(record.id);
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
          current: currentPage,
          pageSize: pageSize,
          total: hasMore ? currentPage * pageSize + 1 : (currentPage - 1) * pageSize + spuList.length,
          showSizeChanger: false,
          onChange: (page) => {
            loadPage(page);
          },
        }}
        scroll={{ y: height - 100 }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: spuID ? [spuID] : [],
          hideSelectAll: true,
          onChange: (selectedRowKeys) => {
            // 如果点击的是已选中的项，则取消选中
            if (selectedRowKeys.length === 0) {
              setSpuID(undefined);
            } else if (selectedRowKeys[0] === spuID) {
              setSpuID(undefined);
            } else {
              setSpuID(selectedRowKeys[0] as SpuID);
            }
          },
        }}
      />
    </div>
  );
}
