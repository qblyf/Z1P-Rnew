'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChangeList } from '@zsqk/z1-sdk/es/z1p/changes';
import { ChangeLog } from '@zsqk/z1-sdk/es/z1p/changes-types';
import { useTokenContext } from '../datahooks/auth';
import Table, { ColumnsType } from 'antd/lib/table';

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

  return (
    <ChangeTableWithoutData
      data={data}
      columnKeys={columnKeys}
    />
  );
}

function ChangeTableWithoutData(props: {
  data?: ChangeLog[];
  columnKeys?: string[];
}) {
  const { data, columnKeys } = props;
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const columns: ColumnsType<ChangeLog> = [
    { title: '变动项', dataIndex: 'logFor', key: 'logFor', width: 120 },
    { title: '变动方式', dataIndex: 'operate', key: 'operate', width: 100 },
    {
      title: '变动时间',
      render: (_, { createdAt }) => <RenderDateTime muts={createdAt} />,
      key: 'createdAt',
      width: 180,
    },
    {
      title: '变动人',
      key: 'createdBy',
      render: (_, { createdBy }) => <RenderUser userIdent={createdBy} />,
      width: 100,
    },
  ];

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
      pagination={false}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
        expandedRowRender: (record) => (
          <div style={{ padding: '12px 16px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: '#333' }}>变动详情</div>
            <RenderChangeDetail log={record} />
          </div>
        ),
      }}
    />
  );
}

function RenderDateTime(props: { muts: string | number }) {
  return <span>{new Date(Number(props.muts)).toLocaleString()}</span>;
}

function RenderUser(props: { userIdent: string }) {
  return <span>{props.userIdent}</span>;
}

function RenderChangeDetail(props: { log: ChangeLog }) {
  const { log } = props;
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
        <div
          key={idx}
          style={{
            padding: '12px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            borderLeft: `3px solid ${item.type === 'change' ? '#1890ff' : item.type === 'add' ? '#52c41a' : '#ff4d4f'}`,
            border: `1px solid ${item.type === 'change' ? '#91d5ff' : item.type === 'add' ? '#b7eb8f' : '#ffccc7'}`,
          }}
        >
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 500 }}>
            {item.label}
          </div>
          <div style={{ fontSize: '12px', color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {formatDetailValue(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDetailValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${formatHumanReadable(val)}`)
      .join('\n');
  }
  return String(value);
}

function formatHumanReadable(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.join(', ')}]`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}
