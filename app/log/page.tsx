'use client';

import moment from 'moment';
import 'moment/locale/zh-cn';

import { Modal, Tag, Button, Drawer, Pagination, Tooltip, Popconfirm } from 'antd';
import { notification } from 'antd';
import { EditTwoTone, PlusOutlined, DeleteOutlined, CalendarOutlined, NodeIndexOutlined, RocketOutlined } from '@ant-design/icons';
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
import './log.css';

function formatDate(v: number) {
  return moment(v * 1000).format('YYYY-MM-DD');
}

function formatDateVerbose(v: number) {
  return moment(v * 1000).format('MM月DD日');
}

/**
 * 更新日志
 */
function Log(): JSX.Element {
  const { displayButton = true } = {};
  const { token } = useTokenContext();
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [logListAll, setLogListAll] = useState<UpdateLog[]>([]);
  const [editLog, setEditLog] = useState<UpdateLog>();
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const getLogList = useCallback(() => {
    lessAwait(async () => {
      const res = await getUpdateLogList({});
      setTotal(res.length);
      setLogListAll(res);
    })();
  }, []);

  useEffect(() => {
    getLogList();
  }, [getLogList]);

  const changePage = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const logListDisplay = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return logListAll.slice(start, end);
  }, [currentPage, logListAll]);

  const onDelLog = (log: UpdateLog) => {
    Modal.confirm({
      title: '确定删除此日志吗？',
      content: '删除操作是危险且不可逆的',
      okText: '是',
      cancelText: '否',
      okButtonProps: { danger: true },
      onOk() {
        if (!log) {
          notification.warning({ message: '没有找到日志信息' });
          return;
        }
        if (!token) {
          notification.error({ message: '未登录，无法删除' });
          return;
        }
        deleteUpdateLog(log.id, { auth: token })
          .then(() => {
            notification.success({ message: '删除成功' });
            getLogList();
          })
          .catch((e) => notification.error({ message: e.message }));
      },
    });
  };

  return (
    <PageWrap ppKey={'product-manage'}>
      {/* 顶部英雄区 */}
      <div className="log-hero">
        <div className="log-hero-inner">
          <div className="log-hero-icon">
            <NodeIndexOutlined />
          </div>
          <h1 className="log-hero-title">帐套更新日志</h1>
          <p className="log-hero-subtitle">记录每一次系统更新与迭代</p>
          {displayButton && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="log-add-btn"
              onClick={() => setAddVisible(true)}
            >
              添加更新
            </Button>
          )}
        </div>
      </div>

      {/* 更新日志列表 */}
      <div className="log-list">
        {logListDisplay?.map((v, i) => (
          <div key={i.toString()} className="log-card">
            {/* 左侧日期 */}
            <div className="log-card-date">
              <div className="log-date-main">
                <CalendarOutlined className="log-date-icon" />
                <span className="log-date-text">
                  {v.date ? formatDateVerbose(Number(v.date || 0)) : '--'}
                </span>
              </div>
              <div className="log-date-year">
                {v.date ? moment(Number(v.date || 0) * 1000).format('YYYY') : ''}
              </div>
            </div>

            {/* 中部分隔线 */}
            <div className="log-card-line">
              <div className="log-line-dot" />
              <div className="log-line-bar" />
            </div>

            {/* 右侧内容 */}
            <div className="log-card-body">
              <div className="log-card-header">
                <Tag className="log-version-tag" icon={<RocketOutlined />}>
                  {v.version || 'v?.?'}
                </Tag>
                {displayButton && (
                  <div className="log-card-actions">
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditTwoTone />}
                        onClick={() => {
                          setEditVisible(true);
                          setEditLog(v);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="确定删除此日志吗？"
                      description="删除操作不可逆"
                      onConfirm={() => onDelLog(v)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                )}
              </div>
              <div className="log-card-content">{v.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="log-pagination">
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={changePage}
            showTotal={(t) => `共 ${t} 条`}
          />
        </div>
      )}

      {/* 添加 Drawer */}
      <Drawer
        title={
          <span className="log-drawer-title">
            <PlusOutlined /> 添加更新日志
          </span>
        }
        destroyOnClose
        open={addVisible}
        onClose={() => setAddVisible(false)}
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 480}
      >
        <LogAdd close={() => setAddVisible(false)} updateList={getLogList} />
      </Drawer>

      {/* 编辑 Drawer */}
      <Drawer
        title={
          <span className="log-drawer-title">
            <EditTwoTone /> 编辑更新日志
          </span>
        }
        destroyOnClose
        open={editVisible}
        onClose={() => setEditVisible(false)}
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 480}
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
