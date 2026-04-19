'use client';

import { Button, Descriptions, Progress, Space, Card, Row, Col, Tag, Steps, List, Alert, Checkbox, Collapse } from 'antd';
import { SyncOutlined, DatabaseOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-components';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { Content } from '../../components/style/Content';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';
import { usePageTab } from '../../datahooks/usePageTab';

export default function () {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}

/**
 * [页面] 数据同步
 *
 * 功能点:
 *
 * 1. 商品数据同步. (包括 SPU 分类, SPU, SKU)
 * 
 * 同步流程：
 * - 拉取数据：pullAllData()
 * - 整理数据：addSyncData()
 * - 写同步日志：addSyncLogWithData()
 * - 单账套写入数据：循环调用 syncProductSingle()
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  // 注册页面标签页
  usePageTab('数据同步');
  
  const { token } = useTokenContext();
  const [msg, setMsg] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [disabled, setDisabled] = useState(false);

  // 账套列表 - 硬编码的账套ID列表（与CLI一致）
  const clientKeys = [
    'newgy', 'gx', 'zsqk', 'gy', 'gx0775',
    'haombo', 'zsqkp', 'jcxiaomi', 'llxiaomi',
    'baicheng', 'jiyuandixintong', 'changfasm',
    'pingnuo', 'kaisheng', 'linji', 'sulian',
    'znyxt', 'hwyxt', 'xmyxt', 'pgyxt', 'yysyxt'
  ];

  const [tenantList, setTenantList] = useState<Array<{
    id: string;
    tenantID: string;
    clientName: string;
  }>>(
    clientKeys.map(id => ({ id, tenantID: id, clientName: id }))
  );

  // 失败账套详情
  const [failedTenants, setFailedTenants] = useState<Array<{ tenantID: string; error: string }>>([]);

  // 选中的账套列表
  const [selectedTenants, setSelectedTenants] = useState<string[]>(clientKeys);
  const [selectAll, setSelectAll] = useState(true);

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedTenants(tenantList.map(t => t.tenantID));
    } else {
      setSelectedTenants([]);
    }
  };

  // 处理单个账套选择
  const handleTenantSelect = (tenantId: string, checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedTenants, tenantId];
      setSelectedTenants(newSelected);
      setSelectAll(newSelected.length === tenantList.length);
    } else {
      const newSelected = selectedTenants.filter(id => id !== tenantId);
      setSelectedTenants(newSelected);
      setSelectAll(false);
    }
  };

  // SDK 同步函数
  const { pullAllData, addSyncData, syncProductSingle } = require('@zsqk/z1-sdk/es/z1p/sync-data');
  const { addSyncLogWithData } = require('@zsqk/z1-sdk/es/z1p/sync-log');

  // 遍历账套进行同步
  const syncAllTenants = async (syncDataID: number, data: any, selectedTenantIDs: string[]) => {
    const results: any[] = [];
    for (const tenantID of selectedTenantIDs) {
      try {
        const result = await syncProductSingle({
          tenantID,
          syncDataID,
          data,
        });
        results.push({ tenantID, success: true, result });
      } catch (error) {
        results.push({ tenantID, success: false, error });
      }
    }
    return results;
  };

  const fn = useMemo(() => {
    console.log('SyncButton init');
    return async () => {
      if (!token) {
        setMsg('请先登录系统');
        return;
      }

      setDisabled(true);
      setProgress(0);
      setCurrentStepIndex(0);
      setFailedTenants([]);
      setMsg('');

      // 设置超时处理
      const timeoutId = setTimeout(() => {
        setMsg('同步超时，请检查网络连接后重试');
        setCurrentStep('');
        setProgress(0);
        setCurrentStepIndex(-1);
        setDisabled(false);
      }, 180000); // 3分钟超时

      try {
        // 步骤1: 拉取数据
        setCurrentStep('正在从公库拉取数据...');
        setCurrentStepIndex(0);
        setProgress(10);
        const data = await pullAllData();

        // 步骤2: 生成同步数据相关信息
        setCurrentStep('正在整理同步数据...');
        setCurrentStepIndex(1);
        setProgress(30);
        const syncDataResult = await addSyncData({ data });
        const syncDataID = syncDataResult.syncDataID;

        // 步骤3: 生成同步日志
        setCurrentStep('正在生成同步日志...');
        setCurrentStepIndex(2);
        setProgress(40);
        const logResult = await addSyncLogWithData({ syncDataID, data });
        const logID = logResult.logID;

        // 步骤4: 遍历账套执行同步
        setCurrentStep(`正在同步到 ${selectedTenants.length} 个账套...`);
        setCurrentStepIndex(3);
        setProgress(60);

        const results = await syncAllTenants(syncDataID, data, selectedTenants);

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        const failedDetails = results
          .filter(r => !r.success)
          .map(r => ({ tenantID: r.tenantID, error: r.error?.message || String(r.error) }));

        setFailedTenants(failedDetails);

        console.log('✅ 同步完成:', results);

        setProgress(100);
        setCurrentStepIndex(4);
        setCurrentStep('');
        setMsg(`同步完成：成功 ${successCount} 个，失败 ${failCount} 个`);

        // 清除超时定时器
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        setMsg(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
        setCurrentStep('');
        setProgress(0);
        setCurrentStepIndex(-1);
      } finally {
        setDisabled(false);
      }
    };
  }, [token, selectedTenants]);

  // 同步步骤配置
  const syncSteps = [
    {
      title: '拉取数据',
      description: '从公库获取最新数据',
      icon: <DatabaseOutlined />
    },
    {
      title: '整理数据',
      description: '生成同步数据结构',
      icon: <SyncOutlined />
    },
    {
      title: '写入日志',
      description: '记录同步操作日志',
      icon: <SyncOutlined />
    },
    {
      title: '执行同步',
      description: '向账套同步数据',
      icon: <SyncOutlined />
    },
    {
      title: '完成',
      description: '同步操作完成',
      icon: <SyncOutlined />
    }
  ];

  return (
    <PageWrap ppKey="product-manage">
      <PageHeader
        title="数据同步"
        subTitle="将数据同步到各个账套中"
      />
      <Content>
        <Row gutter={[16, 16]}>
          {/* 左侧：同步控制和进度 */}
          <Col xs={24} lg={10}>
            <Card title="同步控制" size="small">
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="同步数据">
                  <Tag color="blue">SPU 分类</Tag>
                  <Tag color="green">SPU</Tag>
                  <Tag color="orange">SKU</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="账套数量">
                  <strong>{tenantList.length}</strong> 个账套
                </Descriptions.Item>
                <Descriptions.Item label="已选账套">
                  <strong style={{ color: selectedTenants.length === 0 ? '#ff4d4f' : '#1890ff' }}>
                    {selectedTenants.length}
                  </strong> 个账套
                </Descriptions.Item>
                <Descriptions.Item label="注意事项">
                  <span style={{ color: '#fa8c16' }}>⚠️</span> 同步时会锁表，请在数据修改完成后进行
                </Descriptions.Item>
              </Descriptions>
              
              <div style={{ marginTop: 16 }}>
                <Button 
                  disabled={disabled || selectedTenants.length === 0} 
                  onClick={fn} 
                  type="primary" 
                  size="large"
                  block
                  icon={disabled ? <SyncOutlined spin /> : <DatabaseOutlined />}
                >
                  {disabled ? '正在同步...' : `开始同步 (${selectedTenants.length} 个账套)`}
                </Button>
                {selectedTenants.length === 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    color: '#ff4d4f', 
                    fontSize: '12px',
                    textAlign: 'center'
                  }}>
                    请至少选择一个账套
                  </div>
                )}
              </div>

              {/* 同步步骤 */}
              {disabled && (
                <div style={{ marginTop: 24 }}>
                  <Steps
                    current={currentStepIndex}
                    size="small"
                    direction="vertical"
                    items={syncSteps.map((step, index) => ({
                      title: step.title,
                      description: step.description,
                      icon: index === currentStepIndex && disabled ? <SyncOutlined spin /> : step.icon,
                      status: index < currentStepIndex ? 'finish' : 
                             index === currentStepIndex ? 'process' : 'wait'
                    }))}
                  />
                </div>
              )}

              {/* 总体进度 */}
              {disabled && (
                <div style={{ marginTop: 16 }}>
                  <Progress 
                    percent={progress} 
                    status={progress === 100 ? 'success' : 'active'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    format={(percent) => `${percent}%`}
                  />
                  {currentStep && (
                    <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                      {currentStep}
                    </div>
                  )}
                </div>
              )}

              {/* 结果消息 */}
              {msg && (
                <Alert
                  style={{ marginTop: 16 }}
                  message={msg}
                  type={msg.includes('失败') ? 'error' : 'success'}
                  showIcon
                />
              )}
            </Card>
          </Col>

          {/* 右侧：账套选择与同步状态 */}
          <Col xs={24} lg={14}>
            <Card 
              title={
                <Space>
                  <span>账套选择与同步状态</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    ({tenantList.length} 个账套)
                  </span>
                </Space>
              }
              size="small"
            >
              <div style={{ marginBottom: 12 }}>
                <Checkbox
                  checked={selectAll}
                  indeterminate={selectedTenants.length > 0 && selectedTenants.length < tenantList.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={disabled}
                  style={{ fontWeight: 500 }}
                >
                  全选 ({selectedTenants.length}/{tenantList.length})
                </Checkbox>
              </div>

              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                <List
                  size="small"
                  dataSource={tenantList}
                  renderItem={(tenant) => {
                    const isSelected = selectedTenants.includes(tenant.tenantID);

                    return (
                      <List.Item
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0',
                          background: isSelected ? '#f6ffed' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleTenantSelect(tenant.tenantID, e.target.checked)}
                            disabled={disabled}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 500,
                              fontSize: '13px',
                              color: '#1890ff'
                            }}>
                              {tenant.tenantID}
                            </div>
                            <div style={{
                              color: '#666',
                              fontSize: '11px',
                            }}>
                              {tenant.clientName}
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* 同步结果提示 */}
        {msg && (
          <Card style={{ marginTop: 16 }}>
            <Alert
              message={msg}
              type={msg.includes('失败') && failedTenants.length > 0 ? 'error' : msg.includes('完成') ? 'success' : 'info'}
              showIcon
            />
            {failedTenants.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Collapse
                  ghost
                  size="small"
                  items={[{
                    key: 'failed',
                    label: (
                      <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
                        查看失败的 {failedTenants.length} 个账套
                      </span>
                    ),
                    children: (
                      <List
                        size="small"
                        dataSource={failedTenants}
                        renderItem={(item) => (
                          <List.Item style={{ padding: '4px 0' }}>
                            <Space>
                              <Tag color="error">{item.tenantID}</Tag>
                              <span style={{ color: '#666', fontSize: '12px' }}>{item.error}</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    )
                  }]}
                />
              </div>
            )}
          </Card>
        )}
      </Content>
    </PageWrap>
  );
}
