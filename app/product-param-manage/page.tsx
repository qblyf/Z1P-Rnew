'use client';

import {
  paramsGroupCount,
  paramsGroupList,
} from '@zsqk/z1-sdk/es/z1p/params-groups';
import {
  Button,
  Input,
  Layout,
  message,
  Switch,
  Table,
  Tree,
  Typography,
} from 'antd';
import { Content, Header } from 'antd/es/layout/layout';
import Sider from 'antd/es/layout/Sider';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import PageWrap from '../../components/PageWrap';
import { postAwait } from '../../error';
import Modal from 'antd/es/modal/Modal';
import { AddParam } from '../../components/AddParam';
import { AddParamGroup } from '../../components/AddParamGroup';
import { useTokenContext } from '../../datahooks/auth';
import { EditParamGroup } from '../../components/EditParamGroup';
import {
  ParamsGroup,
  ParamsGroupID,
} from '@zsqk/z1-sdk/es/types/params-group-types';
import { DirectoryTreeProps } from 'antd/es/tree';
import { OrderBySort } from '@zsqk/z1-sdk/es/types/basetypes';
import {
  deleteParamsDefinition,
  editParamsDefinition,
  paramsDefinitionCount,
  paramsDefinitionList,
} from '@zsqk/z1-sdk/es/z1p/params-definition';
import { EditParam } from '../../components/EditParam';
import { ParamsDefinition } from '@zsqk/z1-sdk/es/types/params-definition-types';
import { ColumnsType } from 'antd/es/table';
const Search = Input.Search;
export type MyParamsGroup = Pick<ParamsGroup, 'id'> &
  Partial<Pick<ParamsGroup, 'name' | 'weight'>>;

/**
 * [业务组件 FC]商品参数管理
 * @returns JSX.Element
 * @author Guo Yafang
 */
function ProductParamManage(): JSX.Element {
  const { token } = useTokenContext();
  // 参数组搜索值
  const [searchValue, setSearchValue] = useState<string>('');
  // 参数组列表
  const [paramGroups, setParamGroups] = useState<ParamsGroup[]>([]);
  // 参数定义列表
  const [list, setList] = useState<ParamsDefinition[]>([]);
  // 选中的参数组信息
  const [paramGroupInfo, setParamGroupInfo] = useState<MyParamsGroup>();
  // 选中的参数组ID
  const [paramGroupID, setParamGroupID] = useState<number>();
  const [paramGroupName, setParamGroupName] = useState<string>();

  // 编辑的参数定义详情
  const [editParamInfo, setEditParamInfo] = useState<ParamsDefinition>();
  // 新增参数定义参数组ID 适用paramGroupID组件不会重新渲染，因此加了此state
  const [addParamGroupID, setAddParamGroupID] = useState<number>();
  // 控制开关
  const [addParamGroupVisible, setAddParamGroupVisible] = useState<boolean>();
  const [editParamGroupVisible, setEditParamGroupVisible] = useState<boolean>();
  const [addParamVisible, setAddParamVisible] = useState<boolean>();
  const [editParamVisible, setEditParamVisible] = useState<boolean>();
  // 分页
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>();
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 获取参数组列表
  const fn = useCallback(async () => {
    if (!token) {
      return;
    }
    const count = await paramsGroupCount({}, { token });
    if (count === 0) {
      setParamGroups([]);
      return;
    }
    const res = await paramsGroupList(
      {
        limit: count,
        offset: 0,
        orderBy: [
          {
            key: 'weight',
            sort: OrderBySort.升序,
          },
        ],
      },
      { token }
    );
    setParamGroups(res);
    const paramGroup = res.find(i => i.id === paramGroupID);
    if (!paramGroup) {
      setParamGroupName(undefined);
      return;
    }
    setParamGroupName(paramGroup.name);
  }, [paramGroupID, token]);

  // 获取参数定义列表
  const getParamsList = useCallback(
    async (groups: ParamsGroupID) => {
      if (!token) {
        return;
      }
      const count = await paramsDefinitionCount(
        { groups: [groups] },
        { token }
      );
      if (count === 0) {
        setTotal(0);
        setList([]);
        return;
      }
      const res = await paramsDefinitionList(
        {
          groups: [groups],
          limit: pageSize,
          offset: 0,
          orderBy: [
            {
              key: 'weight',
              sort: OrderBySort.升序,
            },
          ],
        },
        { token }
      );
      setTotal(count);
      setList(res);
    },
    [pageSize, token]
  );

  // 选择参数组
  const onSelectTree: DirectoryTreeProps['onSelect'] = (keys, info) => {
    setCurrentPage(1);
    if (!info.selected) {
      setTotal(0);
      setList([]);
      setParamGroupID(undefined);
      setAddParamGroupID(undefined);
      setParamGroupName(undefined);
      return;
    }
    getParamsList(Number(keys[0]));
    const paramGroup = paramGroups.find(r => r.id === Number(keys[0]));
    if (!paramGroup) {
      setParamGroupID(undefined);
      setParamGroupName(undefined);
      setAddParamGroupID(undefined);
      return;
    }
    setParamGroupID(paramGroup.id);
    setAddParamGroupID(paramGroup.id);
    setParamGroupName(paramGroup.name);
  };

  // 搜索参数组列表
  const treeData = useMemo(() => {
    const loop = (
      data: MyParamsGroup[]
    ): (MyParamsGroup & { title: JSX.Element; key: number })[] =>
      data.map(item => {
        const strTitle = item.name as string;
        const index = strTitle.indexOf(searchValue);
        const beforeStr = strTitle.substring(0, index);
        const afterStr = strTitle.slice(index + searchValue.length);
        return {
          id: item.id,
          title: (
            <div
              style={{
                display: 'flex',
                minWidth: '70px',
                width: '100%',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '400',
                color: '#000',
                lineHeight: '26px',
                wordBreak: 'break-all',
              }}
            >
              {index > -1 ? (
                <span>
                  {beforeStr}
                  <span style={{ color: '#FF5500' }}>{searchValue}</span>
                  {afterStr}
                  <span style={{ color: '#666' }}>[权重{item.weight}]</span>
                </span>
              ) : (
                <span>
                  {strTitle}
                  <span style={{ color: '#666' }}>[权重{item.weight}]</span>
                </span>
              )}
            </div>
          ),
          key: item.id,
        };
      });
    return loop(paramGroups);
  }, [paramGroups, searchValue]);

  useEffect(() => {
    fn();
  }, [fn]);

  const columns: ColumnsType<ParamsDefinition> = [
    {
      title: '序号',
      key: 'index',
      dataIndex: 'index',
      width: 55,
      render: (_r, _t, i) => i + 1,
    },
    { dataIndex: 'name', title: '参数名', width: 400 },
    {
      dataIndex: 'options',
      title: '参数值',
      render: (_v, record) => {
        return (
          <>
            {record.options.map((option, index) => {
              if (index + 1 === record.options.length) {
                return <span key={index}>{option}</span>;
              }
              return <span key={index}>{option}，</span>;
            })}
          </>
        );
      },
    },
    {
      dataIndex: 'weight',
      title: '权重值',
      width: 150,
    },
    {
      dataIndex: 'isFilterable',
      title: '是否用于筛选？',
      width: 150,
      render: (_v, record) => {
        return (
          <Switch
            checked={record.isFilterable}
            onChange={postAwait(async e => {
              if (!token) {
                return;
              }
              await editParamsDefinition(
                {
                  id: record.id,
                  isFilterable: e,
                },
                { token }
              ).then(() => {
                getParamsList(record.group);
              });
            })}
          />
        );
      },
    },
    {
      dataIndex: 'operation',
      title: '操作',
      width: 200,
      render: (_v, record) => {
        return (
          <>
            <Button
              type="link"
              onClick={() => {
                setEditParamVisible(true);
                setEditParamInfo(record);
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              danger
              onClick={postAwait(async () => {
                if (!token) {
                  return;
                }
                await deleteParamsDefinition({ id: record.id }, { token }).then(
                  () => {
                    paramGroupID && getParamsList(paramGroupID);
                  }
                );
              })}
            >
              删除
            </Button>
          </>
        );
      },
    },
  ];
  return (
    <PageWrap ppKey={'product-manage'}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          style={{
            marginRight: '8px',
            backgroundColor: 'white',
            padding: '0.53rem',
            boxShadow: '2px 0px 2px rgba(0,0,0,0.05)',
          }}
        >
          <Typography.Title
            level={4}
            style={{ marginBottom: '12px', marginTop: '0' }}
          >
            商品参数管理
          </Typography.Title>
          <Search
            style={{ marginBottom: '10px' }}
            placeholder="搜索"
            onSearch={(searchKeyword: string) => {
              if (searchKeyword.length < 1) {
                message.warning('请输入更多关键字以进行搜索');
                setSearchValue(searchKeyword);
                return;
              }
              setSearchValue(searchKeyword);
            }}
          />
          <Tree defaultExpandAll treeData={treeData} onSelect={onSelectTree} />
        </Sider>
        <Layout>
          <Header
            style={{
              backgroundColor: 'white',
              padding: '8px',
              height: 'auto',
              boxShadow: '0px 2px 2px rgba(0,0,0,0.05)',
            }}
          >
            <div>
              <span
                style={{
                  marginRight: '1rem',
                  fontWeight: 'bold',
                  fontSize: '20px',
                }}
              >
                {paramGroupName}
              </span>
              <Button
                type="primary"
                onClick={() => setAddParamGroupVisible(true)}
              >
                新增
              </Button>
              {paramGroupID && (
                <Button
                  type="primary"
                  ghost
                  style={{ marginLeft: '20px' }}
                  onClick={() => {
                    setEditParamGroupVisible(true);
                    const paramGroup = paramGroups.find(
                      i => i.id === paramGroupID
                    );
                    if (!paramGroup) {
                      setParamGroupInfo(undefined);
                      return;
                    }
                    setParamGroupInfo(paramGroup);
                  }}
                >
                  编辑
                </Button>
              )}
            </div>
          </Header>
          <Content
            style={{
              marginTop: '8px',
              backgroundColor: 'white',
              padding: '8px',
              height: 'auto',
            }}
          >
            <div style={{ padding: '0.5rem 0 1rem', textAlign: 'right' }}>
              {paramGroupID && (
                <Button
                  type="primary"
                  onClick={() => {
                    setAddParamVisible(true);
                    setAddParamGroupID(paramGroupID);
                  }}
                >
                  添加参数
                </Button>
              )}
            </div>
            <Table
              size="small"
              rowClassName="gaoyuan-table"
              dataSource={list}
              columns={columns}
              rowKey="id"
              pagination={{
                hideOnSinglePage: false,
                defaultPageSize: pageSize,
                pageSizeOptions: ['10', '20', '50'],
                showQuickJumper: true,
                size: 'small',
                total,
                current: currentPage,
                pageSize,
                showTotal: count => `总计 ${count} 条数据`,
              }}
              onChange={async pagination => {
                const { current, pageSize } = pagination;
                current && setCurrentPage(current);
                pageSize && setPageSize(pageSize);
                if (!paramGroupID || !token) {
                  return;
                }
                const res = await paramsDefinitionList(
                  {
                    groups: [paramGroupID],
                    limit: pageSize,
                    offset:
                      (current && current > 0 ? current - 1 : 0) *
                      (pageSize || 20),
                    orderBy: [
                      {
                        key: 'weight',
                        sort: OrderBySort.升序,
                      },
                    ],
                  },
                  { token }
                );
                setList(res);
              }}
            />
          </Content>
        </Layout>
      </Layout>
      {addParamGroupVisible && (
        <Modal
          width={725}
          title="新增参数组"
          open={addParamGroupVisible}
          footer={false}
          onCancel={() => setAddParamGroupVisible(false)}
        >
          <AddParamGroup
            onOk={e => {
              if (e) {
                fn();
              }
              setAddParamGroupVisible(false);
            }}
          />
        </Modal>
      )}
      {paramGroupInfo && (
        <Modal
          width={725}
          title="编辑参数组"
          open={editParamGroupVisible}
          onCancel={() => {
            setEditParamGroupVisible(false);
            setParamGroupInfo(undefined);
          }}
          footer={false}
        >
          <EditParamGroup
            data={paramGroupInfo}
            onOk={e => {
              if (e) {
                fn();
              }
              setEditParamGroupVisible(false);
              setParamGroupInfo(undefined);
            }}
          />
        </Modal>
      )}
      {addParamGroupID && (
        <Modal
          width={725}
          title="新增参数"
          open={addParamVisible}
          footer={false}
          onCancel={() => {
            setAddParamVisible(false);
            setAddParamGroupID(undefined);
          }}
        >
          <AddParam
            paramGroupID={addParamGroupID}
            onOk={e => {
              if (e === 'ok') {
                paramGroupID && getParamsList(paramGroupID);
              }
              setAddParamVisible(false);
              setAddParamGroupID(undefined);
            }}
          />
        </Modal>
      )}
      {editParamInfo && (
        <Modal
          width={725}
          title="编辑参数"
          open={editParamVisible}
          footer={false}
          onCancel={() => {
            setEditParamVisible(false);
            setEditParamInfo(undefined);
          }}
        >
          <EditParam
            paramInfo={editParamInfo}
            onOk={e => {
              if (e) {
                paramGroupID && getParamsList(paramGroupID);
              }
              setAddParamVisible(false);
              setEditParamInfo(undefined);
            }}
          />
        </Modal>
      )}
    </PageWrap>
  );
}
export default function () {
  return (
    <Suspense fallback={<>加载中, 请稍候.</>}>
      <ProductParamManage />
    </Suspense>
  );
}
