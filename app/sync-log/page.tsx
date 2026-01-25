'use client';

import { Content } from '../../components/style/Content';
import { PageHeader } from '@ant-design/pro-components';

/**
 * [页面] 数据同步 日志查询
 *
 * 计划功能：
 * 1. 查询数据同步列表
 * 2. 列表中显示同步概要
 * 3. 列表中显示同步时间
 * 4. 可查看数据同步详情
 * 5. 数据同步详情下载
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function () {
  return (
    <>
      <PageHeader
        title="数据同步日志查询"
        subTitle="查询数据同步日志"
      ></PageHeader>
      <Content>
        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
          <p>功能开发中...</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            此功能将提供数据同步日志的查询、查看和下载功能
          </p>
        </div>
      </Content>
    </>
  );
}
