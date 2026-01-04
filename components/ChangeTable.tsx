'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChangeList } from '@zsqk/z1-sdk/es/z1p/changes';
import { ChangeLog } from '@zsqk/z1-sdk/es/z1p/changes-types';
import { useTokenContext } from '../datahooks/auth';
import Table, { ColumnsType } from 'antd/lib/table';
import { useRef } from 'react';

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
    if (token === undefined) {
      return;
    }
    getFn(token);
  }, [token, getFn]);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const [changeLog, setChangeLog] = useState<ChangeLog>();

  return (
    <>
      <ChangeTableWithoutData
        data={data}
        columnKeys={columnKeys}
        open={v => {
          if (dialogRef.current === null) {
            return;
          }
          setChangeLog(v);
          dialogRef.current.showModal();
        }}
      />
      <dialog ref={dialogRef}>
        <form method="dialog">
          {changeLog ? <ChangeDetails log={changeLog} /> : '暂无数据'}
          <button type="submit">关闭</button>
        </form>
      </dialog>
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
  return <>{renderChangeLog(log)}</>;
}

function RenderDateTime(props: { muts: string | number }) {
  return <span>{new Date(Number(props.muts)).toLocaleString()}</span>;
}

function RenderUser(props: { userIdent: string }) {
  return <span>{props.userIdent}</span>;
}

function renderChangeLog(v: ChangeLog) {
  let text = ``;
  let present = 'present' in v ? JSON.stringify(v.present) : '';
  if (present !== '{}') {
    text += `改为 ${present}`;
  }
  let change = 'change' in v ? JSON.stringify(v.change) : '';
  if (change !== '{}') {
    text += `增加了 ${change}`;
  }
  let original = 'original' in v ? JSON.stringify(v.original) : '';
  if (original !== '{}') {
    text += `, 之前为 ${original}`;
  }
  return (
    <span>
      <RenderUser userIdent={v.createdBy} />在
      <RenderDateTime muts={v.createdAt} />
      执行了{v.operate}操作
      {text}
    </span>
  );
}
