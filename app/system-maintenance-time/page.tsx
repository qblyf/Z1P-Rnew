'use client';

import { getSysSettings } from '@zsqk/z1-sdk/es/z1p/sys-setting';
import {
  Button,
  Layout,
  message,
  Modal,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import { Content, Header } from 'antd/es/layout/layout';
import { Suspense, useCallback, useEffect, useState } from 'react';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';
import { ColumnsType } from 'antd/es/table';
import { EditSystemMaintenanceTime } from '../../components/EditSystemMaintenanceTime';
import {
  RenderDateMinute,
  RenderHourMinute,
} from '../../components/render/RenderDate';
import { UnixTimestamp } from '@zsqk/z1-sdk/es/types/basetypes';
import { BatchEditSystemMaintenanceTime } from '../../components/BatchEditSystemMaintenanceTime';

/** 后端商品数据返回类型 */
type Data = {
  key: number;
  routineMaintenanceStartTime?: UnixTimestamp | null;
  routineMaintenanceEndTime?: UnixTimestamp | null;
  specialMaintenanceStartTime?: UnixTimestamp | null;
  specialMaintenanceEndTime?: UnixTimestamp | null;
  clientName: string;
  remarks: string;
};

/**
 * 系统维护时间
 * @param props
 * @returns JSX.Element
 * @author Cheng Yan <1748872910@qq.com>
 */
function SystemMaintenanceTime(): JSX.Element {
  const { token } = useTokenContext();
  // 列表
  const [list, setList] = useState<Data[]>([]);

  // 编辑详情
  const [editInfo, setEditInfo] = useState<Data>();
  // 编辑 控制开关
  const [visible, setVisible] = useState<boolean>(false);
  // 批量编辑 控制开关
  const [batchVisible, setBatchVisible] = useState<boolean>(false);
  // 批量
  const [selectRows, setSelectRows] = useState<Data[]>([]);

  // 分页
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 获取参数组列表
  const fn = useCallback(async () => {
    if (!token) {
      return;
    }
    const res = await getSysSettings({ auth: token });
    const data = res.map((v, i) => {
      return {
        key: i + 1,
        clientName: v.clientName,
        routineMaintenanceStartTime: v.value.find(
          s => s.name === '例行维护时间'
        )?.startTime,
        routineMaintenanceEndTime: v.value.find(s => s.name === '例行维护时间')
          ?.endTime,
        specialMaintenanceStartTime: v.value.find(
          s => s.name === '特殊维护时间'
        )?.startTime,
        specialMaintenanceEndTime: v.value.find(s => s.name === '特殊维护时间')
          ?.endTime,
        remarks: v.remarks,
      };
    });
    setList(data);
  }, [token]);

  useEffect(() => {
    fn().catch(err => {
      message.error(err.message);
    });
  }, [fn]);

  const columns: ColumnsType<Data> = [
    {
      title: '序号',
      key: 'index',
      dataIndex: 'index',
      width: 55,
      render: (_r, _t, i) => i + 1,
    },
    { dataIndex: 'clientName', title: '账套名称', width: 400 },
    {
      dataIndex: 'routinemaintenancewindow',
      title: '例行维护时段',
      render: (_v, record) => {
        if (
          !record.routineMaintenanceStartTime ||
          !record.routineMaintenanceEndTime
        ) {
          return '-';
        }
        return (
          <>
            {RenderHourMinute({
              unix: record.routineMaintenanceStartTime,
            })}
            ~
            {RenderHourMinute({
              unix: record.routineMaintenanceEndTime,
            })}
          </>
        );
      },
    },
    {
      dataIndex: 'specialmaintenancewindow',
      title: '特殊维护时段',
      render: (_v, record) => {
        if (
          !record.specialMaintenanceStartTime ||
          !record.specialMaintenanceEndTime
        ) {
          return '-';
        }
        return (
          <>
            {RenderDateMinute({
              unix: record.specialMaintenanceStartTime,
            })}
            ~
            {RenderDateMinute({
              unix: record.specialMaintenanceEndTime,
            })}
          </>
        );
      },
    },
    {
      dataIndex: 'remarks',
      title: '文字说明',
      width: '30%',
      ellipsis: {
        showTitle: false,
      },
      render: (_, record) => (
        <Tooltip title={record.remarks} placement="topLeft">
          {record.remarks}
        </Tooltip>
      ),
    },
    {
      dataIndex: 'operation',
      title: '操作',
      width: 200,
      render: (_v, record) => {
        return (
          <Button
            type="link"
            onClick={() => {
              setVisible(true);
              setEditInfo(record);
            }}
          >
            编辑
          </Button>
        );
      },
    },
  ];
  return (
    <PageWrap ppKey={'product-manage'}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout>
          <Header
            style={{
              backgroundColor: 'white',
              padding: '8px',
              height: 'auto',
            }}
          >
            <Typography.Title
              level={4}
              style={{ marginBottom: '12px', marginTop: '0' }}
            >
              账套维护时间
            </Typography.Title>
          </Header>
          <Content
            style={{
              marginTop: '8px',
              backgroundColor: 'white',
              padding: '8px',
              height: 'auto',
            }}
          >
            <div style={{ padding: '8px 0' }}>
              <Button
                type="primary"
                disabled={!selectRows.length}
                onClick={() => {
                  setBatchVisible(true);
                }}
              >
                批量编辑
              </Button>
            </div>
            <Table
              size="small"
              rowClassName="gaoyuan-table"
              dataSource={list}
              columns={columns}
              rowKey="key"
              pagination={{
                hideOnSinglePage: false,
                defaultPageSize: pageSize,
                pageSizeOptions: ['20', '40', '100', '500', '2000'],
                showQuickJumper: true,
                size: 'small',
                total: list.length,
                current: currentPage,
                pageSize,
                showTotal: count => `总计 ${count} 条数据`,
              }}
              onChange={pagination => {
                const { current, pageSize } = pagination;
                current && setCurrentPage(current);
                pageSize && setPageSize(pageSize);
              }}
              rowSelection={{
                onChange: (selectedRowKeys, selectedRows) => {
                  selectedRowKeys;
                  setSelectRows(selectedRows);
                },
              }}
            />
          </Content>
        </Layout>
      </Layout>
      {editInfo !== undefined && (
        <Modal
          width={725}
          title="维护时间"
          open={visible}
          footer={false}
          onCancel={() => {
            setEditInfo(undefined);
            setVisible(false);
          }}
        >
          <EditSystemMaintenanceTime
            editInfo={editInfo}
            onOk={e => {
              if (e) {
                fn().catch(err => {
                  message.error(err.message);
                });
              }
              setVisible(false);
              setEditInfo(undefined);
            }}
          />
        </Modal>
      )}
      {selectRows.length > 0 && (
        <Modal
          width={725}
          title="维护时间"
          open={batchVisible}
          footer={false}
          onCancel={() => {
            setBatchVisible(false);
          }}
        >
          <BatchEditSystemMaintenanceTime
            selectRows={selectRows}
            onOk={e => {
              if (e) {
                fn().catch(err => {
                  message.error(err.message);
                });
              }
              setBatchVisible(false);
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
      <SystemMaintenanceTime />
    </Suspense>
  );
}
