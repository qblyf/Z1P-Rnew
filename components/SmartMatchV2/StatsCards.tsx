'use client';

import { Card, Statistic, Row, Col, Spin } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMatch } from './MatchContext';

export function StatsCards() {
  const { state } = useMatch();
  const { status, total, matched, spuMatched, unmatched } = state;

  const isLoading = status === 'initializing' || status === 'matching';

  return (
    <Card className="mb-4 relative">
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总数"
            value={total}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已匹配"
            value={matched}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="SPU匹配"
            value={spuMatched}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="未匹配"
            value={unmatched}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
      </Row>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        </div>
      )}
    </Card>
  );
}
