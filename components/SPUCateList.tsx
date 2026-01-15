'use client';

import { Button, Col, Input, Row, Tree, Tag, Alert } from 'antd';
import { TreeProps } from 'antd/lib/tree';
import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import update, { Spec } from 'immutability-helper';
import { getSPUCateBaseList } from '@zsqk/z1-sdk/es/z1p/product';
import { SPUCateID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { ChevronRight } from 'lucide-react';
import {
  useSPUCateIDContext,
  useSPUCateListContext,
} from '../datahooks/product';

type Data = Awaited<ReturnType<typeof getSPUCateBaseList>>[0];

/**
 * 生成 antd Tree 组件数据
 * @author Lian Zheren <lzr@go0356.com>
 */
function pidTree(data: Data[], pid: number): TreeProps['treeData'] {
  return data
    .filter(v => v.pid === pid)
    .sort((a, b) => a.order - b.order)
    .map(v => {
      const childCount = data.filter(c => c.pid === v.id).length;
      const hasChildren = childCount > 0;
      
      return {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', paddingRight: '8px' }}>
            <span style={{ flex: 1 }}>{v.name}</span>
            {hasChildren && <Tag color="blue">{childCount}</Tag>}
          </div>
        ),
        key: v.id,
        children: hasChildren ? pidTree(data, v.id) : undefined,
        switcherIcon: hasChildren ? (props) => (
          <ChevronRight
            size={18}
            style={{
              transform: props.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          />
        ) : null,
      };
    });
}

/**
 * [组件] SPU 分类 列表
 *
 * 上下文依赖:
 *
 * 1. useSPUCateListContext.
 * 2. useSPUCateIDContext.
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
const SPUCateList = memo(function SPUCateList(props: { 
  offsetTop?: number;
  onAddClick?: () => void;
  onEditClick?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { offsetTop = 24, onAddClick, onEditClick, onMoveUp, onMoveDown } = props;
  const { spuCateList: originalData } = useSPUCateListContext();
  const { spuCateID, setSpuCateID } = useSPUCateIDContext();

  const el = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(100);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!el.current) {
      return;
    }
    const rect = el.current.getBoundingClientRect();
    setHeight(window.innerHeight - rect.y - offsetTop);
  }, [el, offsetTop]);

  // 过滤数据 - 搜索时包含所有匹配项及其祖先
  const filteredData = useMemo(() => {
    const s = search.replaceAll(/\s/g, '').toLowerCase();
    if (!s) {
      return originalData;
    }
    
    // 找出所有匹配的项
    const matchedIds = new Set<number>();
    originalData.forEach(v => {
      if (v.name.replaceAll(/\s/g, '').toLowerCase().includes(s)) {
        matchedIds.add(v.id);
      }
    });
    
    // 找出所有匹配项的祖先
    const ancestorIds = new Set<number>();
    matchedIds.forEach(id => {
      let current = originalData.find(v => v.id === id);
      while (current && current.pid !== 0) {
        ancestorIds.add(current.pid);
        current = originalData.find(v => v.id === current!.pid);
      }
    });
    
    // 返回匹配项和祖先项
    return originalData.filter(v => matchedIds.has(v.id) || ancestorIds.has(v.id));
  }, [originalData, search]);

  const treeData: TreeProps['treeData'] = useMemo(() => {
    return pidTree(filteredData, 0);
  }, [filteredData]);

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
          {spuCateID && !search && (
            <>
              <Button
                size="small"
                onClick={onEditClick}
                style={{ marginLeft: '4px' }}
              >
                编辑
              </Button>
              <Button
                size="small"
                onClick={onMoveUp}
                style={{ marginLeft: '4px' }}
              >
                上移
              </Button>
              <Button
                size="small"
                onClick={onMoveDown}
                style={{ marginLeft: '4px' }}
              >
                下移
              </Button>
            </>
          )}
        </Col>
      </Row>
      {filteredData.length === 1000 && (
        <Alert
          message="最多显示 1000 条数据. 请尽量细化过滤条件避免显示不全."
          type="warning"
        />
      )}
      <div style={{ height: `${height - 100}px`, overflow: 'auto', scrollbarWidth: 'auto', scrollbarColor: '#999 #f1f1f1' }} className="spu-cate-tree">
        <style jsx>{`
          .spu-cate-tree::-webkit-scrollbar {
            width: 8px;
          }
          .spu-cate-tree::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .spu-cate-tree::-webkit-scrollbar-thumb {
            background: #999;
            border-radius: 4px;
          }
          .spu-cate-tree::-webkit-scrollbar-thumb:hover {
            background: #666;
          }
          .spu-cate-tree :global(.ant-tree) {
            background: transparent;
          }
          .spu-cate-tree :global(.ant-tree-treenode) {
            padding: 0 !important;
            margin: 0 !important;
            height: 39.5px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid #f0f0f0;
            width: 100%;
            cursor: pointer;
          }
          .spu-cate-tree :global(.ant-tree-treenode:hover) {
            background-color: #fafafa;
            transition: background-color 0.2s ease;
          }
          .spu-cate-tree :global(.ant-tree-node-content-wrapper:hover) {
            background-color: transparent;
          }
          .spu-cate-tree :global(.ant-tree-treenode.ant-tree-treenode-selected) {
            background-color: #e6f4ff;
          }
          .spu-cate-tree :global(.ant-tree-treenode.ant-tree-treenode-selected .ant-tree-node-content-wrapper) {
            background-color: transparent;
          }
          .spu-cate-tree :global(.ant-tree-treenode:last-child) {
            border-bottom: none;
          }
          .spu-cate-tree :global(.ant-tree-content) {
            width: 100%;
            padding: 0 8px;
            display: flex;
            align-items: center;
            flex: 1;
          }
          .spu-cate-tree :global(.ant-tree-node-content-wrapper) {
            width: 100%;
            padding: 0 !important;
            display: flex;
            align-items: center;
            flex: 1;
          }
          .spu-cate-tree :global(.ant-tree-title) {
            width: 100%;
            padding: 0 !important;
            display: flex;
            align-items: center;
          }
          .spu-cate-tree :global(.ant-tree-switcher) {
            width: 24px;
            height: 39.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            margin: 0 !important;
            flex-shrink: 0;
          }
          .spu-cate-tree :global(.ant-tree-checkbox) {
            width: 24px;
            height: 39.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            margin: 0 !important;
            flex-shrink: 0;
          }
          /* 单选框样式 - 圆点样式 */
          .spu-cate-tree :global(.ant-tree-checkbox-wrapper) {
            display: flex;
            align-items: center;
            height: 100%;
          }
          .spu-cate-tree :global(.ant-tree-checkbox-inner) {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #d9d9d9;
            background-color: #fff;
            position: relative;
          }
          .spu-cate-tree :global(.ant-tree-checkbox-checked .ant-tree-checkbox-inner) {
            background-color: #1890ff;
            border-color: #1890ff;
          }
          .spu-cate-tree :global(.ant-tree-checkbox-checked .ant-tree-checkbox-inner::after) {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            background-color: #fff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          }
        `}</style>
        <Tree
          selectedKeys={spuCateID ? [spuCateID] : []}
          showLine={{ showLeafIcon: false }}
          onSelect={useCallback((v: React.Key[]) => {
            const v1 = v[0];
            if (v1 !== undefined) {
              setSpuCateID(Number(v1));
            } else {
              setSpuCateID(undefined);
            }
          }, [setSpuCateID])}
          treeData={treeData}
          defaultExpandAll={search.length > 0}
          checkable
          checkStrictly
          checkedKeys={spuCateID ? [spuCateID] : []}
          onCheck={useCallback((checkedKeys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
            const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
            // 单选逻辑：只保留最后一个选中的项，不受父级影响
            if (keys.length > 0) {
              const selectedID = Number(keys[keys.length - 1]);
              setSpuCateID(selectedID);
            } else {
              setSpuCateID(undefined);
            }
          }, [setSpuCateID])}
        />
      </div>
    </div>
  );
});

export default SPUCateList;

/**
 * 根据变动生成新的 SPUCateList 数据
 * @author Lian Zheren <lzr@go0356.com>
 */
function updateSPUCateList(
  spuCateList: Data[],
  changes: Array<{ id: SPUCateID } & Partial<Data>>
) {
  if (changes.length === 0) {
    return spuCateList;
  }

  /** 对 spuCateList 的修改 */
  const obj: Spec<typeof spuCateList> = {};
  for (const { id, ...rest } of changes) {
    const i = spuCateList.findIndex(v => v.id === id);
    if (i === -1) {
      throw new Error('data spuCateList');
    }
    obj[i] = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, { $set: v }])
    );
  }

  return update(spuCateList, obj);
}

/**
 * [组件] 可进行上下移编辑的 SPU 分类列表
 * https://gitlab.com/zsqk/Zsqk/-/issues/4075
 *
 * 功能点:
 *
 * 1. 可进行搜索.
 * 2. 如果有搜索, 则返回列表.
 * 3. 如果没有搜索, 则返回树形.
 * 4. 在树形结构中, 如果选中, 可进行上下移操作.
 *
 * 上下文依赖:
 *
 * 1. useSPUCateIDContext.
 * 2. useSPUCateListContext.
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function SPUCateListWithEdit(props: {
  onAddClick?: () => void;
  onEditClick?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { onAddClick, onEditClick, onMoveUp, onMoveDown } = props;

  return (
    <>
      <SPUCateList 
        onAddClick={onAddClick}
        onEditClick={onEditClick}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </>
  );
}
