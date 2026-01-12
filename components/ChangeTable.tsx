'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChangeList } from '@zsqk/z1-sdk/es/z1p/changes';
import { ChangeLog } from '@zsqk/z1-sdk/es/z1p/changes-types';
import { useTokenContext } from '../datahooks/auth';
import Table, { ColumnsType } from 'antd/lib/table';
import { Modal } from 'antd';

export function ChangeTable(props: {
  /**
   * 要查看的相关数据, 不填则为查看全部数据
   */
  logFor?: ChangeLog['logFor'][];
  /**
   * 要显示的列, 不填则为全部显示
   */
  columnKeys?: string[];
}) {
  const { logFor, columnKeys } = props;
  const [data, setData] = useState<ChangeLog[]>();
  const { token } = useTokenContext();

  const getFn = useCallback(
    (token: string) =>
      getChangeList(
        { logFor, limit: 10, orderBy: { key: 'logID', sort: 'DESC' } },
        { auth: token }
      )
        .then(v => {
          setData(v);
        })
        .catch(err => {
          console.error('getChangeList', err);
        }),
    [logFor]
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    getFn(token);
  }, [token, getFn]);

  const [changeLog, setChangeLog] = useState<ChangeLog>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ChangeTableWithoutData
        data={data}
        columnKeys={columnKeys}
        open={v => {
          setChangeLog(v);
          setIsModalOpen(true);
        }}
      />
      <Modal
        title="变动详情"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        {changeLog ? <ChangeDetails log={changeLog} /> : '暂无数据'}
      </Modal>
    </>
  );
}

function ChangeTableWithoutData(props: {
  data?: ChangeLog[];
  columnKeys?: string[];
  open: (v: ChangeLog) => void;
}) {
  const { data, columnKeys, open } = props;
  const columns: ColumnsType<ChangeLog> = [
    { title: '变动项', dataIndex: 'logFor', key: 'logFor' },
    { title: '变动方式', dataIndex: 'operate', key: 'operate' },
    {
      title: '变动时间',
      render: (_, { createdAt }) => <RenderDateTime muts={createdAt} />,
      key: 'createdAt',
    },
    {
      title: '变动人',
      key: 'createdBy',
      render: (_, { createdBy }) => <RenderUser userIdent={createdBy} />,
    },
  ];

  // TODO: 性能优化, 在 props 没有变化的时候, 不要重新渲染

  return (
    <Table
      rowKey="logID"
      size="small"
      columns={columns.filter(v => {
        if (columnKeys === undefined || typeof v.key !== 'string') {
          return true;
        }
        return columnKeys.includes(v.key);
      })}
      dataSource={data}
      onRow={v => {
        return {
          onClick: () => {
            open(v);
          },
        };
      }}
    />
  );
}

function ChangeDetails(props: { log: ChangeLog }) {
  const { log } = props;
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>操作人</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            <RenderUser userIdent={log.createdBy} />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>操作时间</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            <RenderDateTime muts={log.createdAt} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>操作类型</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>{log.operate}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>变动详情</div>
        {renderChangeDetails(log)}
      </div>
    </div>
  );
}

function RenderDateTime(props: { muts: string | number }) {
  return <span>{new Date(Number(props.muts)).toLocaleString()}</span>;
}

function RenderUser(props: { userIdent: string }) {
  return <span>{props.userIdent}</span>;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function renderChangeDetails(log: ChangeLog) {
  const items: { label: string; type: 'change' | 'add' | 'remove'; value: any }[] = [];

  if ('present' in log && log.present && Object.keys(log.present).length > 0) {
    items.push({ label: '修改为', type: 'change', value: log.present });
  }

  if ('change' in log && log.change && Object.keys(log.change).length > 0) {
    items.push({ label: '增加了', type: 'add', value: log.change });
  }

  if ('original' in log && log.original && Object.keys(log.original).length > 0) {
    items.push({ label: '之前为', type: 'remove', value: log.original });
  }

  if (items.length === 0) {
    return <div style={{ color: '#999', fontSize: '12px' }}>无变动详情</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px', borderLeft: `3px solid ${item.type === 'change' ? '#1890ff' : item.type === 'add' ? '#52c41a' : '#ff4d4f'}` }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 500 }}>
            {item.label}
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#333',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              backgroundColor: '#fff',
              padding: '8px',
              borderRadius: '2px',
              border: '1px solid #e8e8e8',
            }}
          >
            {formatValue(item.value)}
          </pre>
        </div>
      ))}
    </div>
  );
}
