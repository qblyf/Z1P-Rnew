'use client';
// 更新日志

import moment from 'moment';
import 'moment/locale/zh-cn';

import { Modal, Tag, Button, Drawer, message, Pagination } from 'antd';
import { EditTwoTone } from '@ant-design/icons';
import {
  getUpdateLogList,
  deleteUpdateLog,
} from '@zsqk/z1-sdk/es/z1p/update-log';
import { UpdateLog } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { lessAwait } from '../../error';
import PageWrap from '../../components/PageWrap';
import LogAdd from '../../components/LogAdd';
import LogEdit from '../../components/LogEdit';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTokenContext } from '../../datahooks/auth';

function formatDate(v: number) {
  return moment(v * 1000).format('YYYY-M-D');
}

/**
 * 更新日志
 * @param props
 * @returns JSX.Element
 * @author zhaoxuxu<zhaoxuxujc@gmail.com>
 */
function Log(): JSX.Element {
  const { displayButton = true } = {};
  const { token } = useTokenContext();
  const [addVisible, setAddVisible] = useState<boolean>(false);
  const [editVisible, setEditVisible] = useState<boolean>(false);
  const [logListAll, setLogListAll] = useState<UpdateLog[]>([]);
  const [editLog, setEditLog] = useState<UpdateLog>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [pageSize] = useState<number>(10);

  const getLogList = useCallback(() => {
    lessAwait(async () => {
      const res = await getUpdateLogList({});
      setTotal(res.length);
      setLogListAll(res);
    })();
  }, []);

  useEffect(getLogList, [getLogList]);

  const changePage = useCallback((page: React.SetStateAction<number>) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const logListDisplay = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return logListAll.slice(start, end);
  }, [currentPage, logListAll, pageSize]);

  const onDelLog = (log: UpdateLog) => {
    Modal.confirm({
      title: '确定删除此日志吗？',
      content: '删除操作是危险且不可逆的',
      okText: '是',
      cancelText: '否',
      onOk() {
        if (!log) {
          message.warning('没有找到日志信息');
          return;
        }
        if (!token) {
          message.error('未登录，无法删除');
          return;
        }
        // 删除系统更新日志
        deleteUpdateLog(log.id, {
          auth: token,
        })
          .then(getLogList)
          .then(close)
          .catch(e => message.success(e.message));
      },
    });
  };

  return (
    <PageWrap ppKey={'product-manage'}>
      <div
        style={{ marginLeft: '40px', marginTop: '35px', paddingBottom: '32px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <h3
            style={{
              lineHeight: '32px',
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'black',
            }}
          >
            更新日志
          </h3>
          {displayButton && (
            <Button
              icon={<EditTwoTone />}
              type="text"
              onClick={() => setAddVisible(true)}
            />
          )}
        </div>
        <div style={{ marginTop: '10px' }}>
          {logListDisplay?.map((v, i) => (
            <div key={i.toString()}>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#000000',
                }}
              >
                {v.version}
              </div>
              <div
                style={{
                  marginTop: '20px',
                }}
              >
                <Tag
                  style={{
                    lineHeight: '30px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    fontSize: '15px',
                  }}
                >
                  {v.date ? formatDate(Number(v.date || 0)) : '--'}
                </Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  margin: '0 0.5rem 0',
                  alignItems: 'flex-start',
                  marginTop: '20px',
                }}
              >
                <div
                  style={{
                    border: '3px solid #1677FF',
                    width: '3px',
                    height: '3px',
                    boxSizing: 'content-box',
                    borderRadius: '50%',
                    flexGrow: '0',
                    flexShrink: '0',
                    marginTop: '7px',
                    marginRight: '4px',
                  }}
                ></div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: '#333333',
                  }}
                >
                  {v.content}
                </div>
              </div>
              {displayButton && (
                <div
                  style={{
                    marginBottom: '60px',
                    marginLeft: '5px',
                  }}
                >
                  <Button
                    type="text"
                    style={{ color: '#1677FF' }}
                    onClick={() => {
                      setEditVisible(true);
                      setEditLog(v);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    danger
                    type="text"
                    onClick={() => {
                      onDelLog(v);
                    }}
                  >
                    删除
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <Pagination
          simple
          current={currentPage}
          total={total}
          pageSize={pageSize}
          onChange={changePage}
        />
      </div>
      <Drawer
        title="添加更新日志"
        destroyOnClose
        open={addVisible}
        onClose={() => setAddVisible(false)}
        width={450}
      >
        <LogAdd close={() => setAddVisible(false)} updateList={getLogList} />
      </Drawer>
      <Drawer
        title="编辑更新日志"
        destroyOnClose
        open={editVisible}
        onClose={() => setEditVisible(false)}
        width={450}
      >
        <LogEdit
          close={() => setEditVisible(false)}
          editLog={editLog}
          updateList={getLogList}
        />
      </Drawer>
    </PageWrap>
  );
}

export default function () {
  return (
    <Suspense>
      <Log />
    </Suspense>
  );
}
