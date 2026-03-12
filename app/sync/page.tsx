'use client';

import { 
  pullAllData,
  addSyncData,
  syncProductSingle
} from '@zsqk/z1-sdk/es/z1p/sync-data';
import { addSyncLogWithData } from '@zsqk/z1-sdk/es/z1p/sync-log';

import { Button, Descriptions, Table, Progress, Space, Card, Row, Col, Tag, Steps, List, Avatar, Spin, Alert } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, SyncOutlined, DatabaseOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-components';
import { Suspense, useMemo, useState } from 'react';
import { Content } from '../../components/style/Content';
import PageWrap from '../../components/PageWrap';

// 账套配置 - 从配置文件中获取所有账套ID
// 这个列表应该与 z1clients.ts 中的配置保持一致
const ALL_TENANT_IDS = [
  'newgy', 'gx', 'zsqk', 'gy', 'gx0775', 
  'haombo', 'zsqkp', 'jcxiaomi', 'llxiaomi',
  'baicheng', 'jiyuandixintong', 'changfasm', 
  'pingnuo', 'kaisheng', 'linji', 'sulian',
  'znyxt', 'hwyxt', 'xmyxt', 'pgyxt', 'yysyxt'
] as const;

// 尝试从配置文件中获取账套名称，如果失败则使用备用映射
const getTenantName = (tenantId: string): string => {
  // 尝试从配置文件中读取（如果存在）
  try {
    // 这里可以尝试导入实际的配置文件
    // const { z1ClientsObj } = require('../../z1clients');
    // if (z1ClientsObj[tenantId]?.name) {
    //   return z1ClientsObj[tenantId].name;
    // }
  } catch (error) {
    // 配置文件不存在或读取失败，使用备用映射
  }
  
  // 备用名称映射
  const FALLBACK_TENANT_NAMES: Record<string, string> = {
    'newgy': '高远控股',
    'gx': '广西',
    'zsqk': '中晟',
    'gy': '高远',
    'gx0775': '广西0775',
    'haombo': '好博',
    'zsqkp': '中晟科普',
    'jcxiaomi': '金昌小米',
    'llxiaomi': '临洮小米',
    'baicheng': '白城',
    'jiyuandixintong': '济源迪信通', // 修正：原为"吉源地信通"
    'changfasm': '长发商贸',
    'pingnuo': '苹诺',
    'kaisheng': '凯盛',
    'linji': '临济',
    'sulian': '苏联',
    'znyxt': '智能云系统',
    'hwyxt': '华为云系统',
    'xmyxt': '小米云系统',
    'pgyxt': '苹果云系统',
    'yysyxt': '应用商业系统'
  };
  
  return FALLBACK_TENANT_NAMES[tenantId] || tenantId;
};

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
  const [msg, setMsg] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tenantSyncStatus, setTenantSyncStatus] = useState<Record<string, {
    status: 'waiting' | 'syncing' | 'success' | 'error';
    message?: string;
    startTime?: number;
    endTime?: number;
  }>>({});
  const [productSyncInfo, setProductSyncInfo] = useState<
    Array<{
      name: string;
      errMsg?: string;
      resCode: string;
      status: string;
    }>
  >();
  const [disabled, setDisabled] = useState(false);

  const fn = useMemo(() => {
    console.log('SyncButton init');
    return async () => {
      setDisabled(true);
      setProductSyncInfo(undefined);
      setProgress(0);
      setCurrentStepIndex(0);
      setTenantSyncStatus({});
      
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
        const logID = await addSyncLogWithData({ syncDataID, data });
        
        // 步骤4: 获取需要同步的账套列表
        // 使用完整的账套列表
        const syncClientLogIDs = syncDataResult.syncClientLogIDs || [];
        
        // 如果SDK返回了具体的客户端日志ID，使用对应数量的账套
        // 否则使用所有配置的账套
        const tenantIDs = syncClientLogIDs.length > 0 
          ? ALL_TENANT_IDS.slice(0, syncClientLogIDs.length)
          : ALL_TENANT_IDS;
          
        console.log(`准备同步 ${tenantIDs.length} 个账套:`, tenantIDs);
        
        // 初始化账套状态
        const initialStatus: Record<string, any> = {};
        tenantIDs.forEach(id => {
          initialStatus[id] = { status: 'waiting' };
        });
        setTenantSyncStatus(initialStatus);
        
        setCurrentStep('正在向各账套同步数据...');
        setCurrentStepIndex(3);
        const totalSets = tenantIDs.length;
        const syncResults: Array<{
          name: string;
          errMsg?: string;
          resCode: string;
          status: string;
        }> = [];
        
        // 步骤5: 循环调用 syncProductSingle 向各账套写数据
        for (let i = 0; i < totalSets; i++) {
          const tenantID = tenantIDs[i];
          const currentProgress = 40 + Math.floor((i / totalSets) * 50);
          setProgress(currentProgress);
          setCurrentStep(`正在同步账套 ${getTenantName(tenantID)} (${i + 1}/${totalSets})...`);
          
          // 更新当前账套状态为同步中
          setTenantSyncStatus(prev => ({
            ...prev,
            [tenantID]: { 
              status: 'syncing', 
              startTime: Date.now() 
            }
          }));
          
          try {
            const result = await syncProductSingle({ 
              tenantID, 
              syncDataID, 
              data,
              logID 
            });
            
            // 更新账套状态为成功
            setTenantSyncStatus(prev => ({
              ...prev,
              [tenantID]: { 
                status: 'success', 
                startTime: prev[tenantID]?.startTime,
                endTime: Date.now(),
                message: result.errMsg || '同步成功'
              }
            }));
            
            syncResults.push({
              name: getTenantName(tenantID),
              resCode: result.resCode === 'complete' ? '已成功' : '失败',
              status: '已完成',
              errMsg: result.errMsg || '',
            });
          } catch (error) {
            // 更新账套状态为失败
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            setTenantSyncStatus(prev => ({
              ...prev,
              [tenantID]: { 
                status: 'error', 
                startTime: prev[tenantID]?.startTime,
                endTime: Date.now(),
                message: errorMsg
              }
            }));
            
            syncResults.push({
              name: getTenantName(tenantID),
              resCode: '失败',
              status: '已完成',
              errMsg: errorMsg,
            });
          }
        }
        
        setProductSyncInfo(syncResults);
        setProgress(100);
        setCurrentStepIndex(4);
        setCurrentStep('');
        setMsg('已完成同步请求');
        
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
  }, []);

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
      icon: <CheckCircleOutlined />
    },
    {
      title: '同步账套',
      description: '向各账套写入数据',
      icon: <ClockCircleOutlined />
    },
    {
      title: '完成',
      description: '同步操作完成',
      icon: <CheckCircleOutlined />
    }
  ];

  // 获取账套状态统计
  const getStatusStats = () => {
    const stats = { waiting: 0, syncing: 0, success: 0, error: 0 };
    Object.values(tenantSyncStatus).forEach(status => {
      stats[status.status]++;
    });
    return stats;
  };

  const statusStats = getStatusStats();

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
            <Card title="同步控制" size="small" style={{ height: '100%' }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="同步数据">
                  <Tag color="blue">SPU 分类</Tag>
                  <Tag color="green">SPU</Tag>
                  <Tag color="orange">SKU</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="账套数量">
                  <strong>{ALL_TENANT_IDS.length}</strong> 个账套
                </Descriptions.Item>
                <Descriptions.Item label="注意事项">
                  <span style={{ color: '#fa8c16' }}>⚠️</span> 同步时会锁表，请在数据修改完成后进行
                </Descriptions.Item>
              </Descriptions>
              
              <div style={{ marginTop: 16 }}>
                <Button 
                  disabled={disabled} 
                  onClick={fn} 
                  type="primary" 
                  size="large"
                  block
                  icon={disabled ? <SyncOutlined spin /> : <DatabaseOutlined />}
                >
                  {disabled ? '正在同步...' : '开始数据同步'}
                </Button>
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

          {/* 右侧：账套同步状态 */}
          <Col xs={24} lg={14}>
            <Card 
              title={
                <Space>
                  <span>账套同步状态</span>
                  {Object.keys(tenantSyncStatus).length > 0 && (
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      ({Object.keys(tenantSyncStatus).length} 个账套)
                    </span>
                  )}
                </Space>
              }
              size="small"
              style={{ height: '100%' }}
              extra={
                Object.keys(tenantSyncStatus).length > 0 && (
                  <Space size="small">
                    {statusStats.waiting > 0 && <Tag color="default">等待 {statusStats.waiting}</Tag>}
                    {statusStats.syncing > 0 && <Tag color="processing">同步中 {statusStats.syncing}</Tag>}
                    {statusStats.success > 0 && <Tag color="success">成功 {statusStats.success}</Tag>}
                    {statusStats.error > 0 && <Tag color="error">失败 {statusStats.error}</Tag>}
                  </Space>
                )
              }
            >
              {Object.keys(tenantSyncStatus).length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: '#999',
                  background: '#fafafa',
                  borderRadius: '6px',
                  border: '1px dashed #d9d9d9'
                }}>
                  <DatabaseOutlined style={{ fontSize: '32px', marginBottom: '12px', color: '#d9d9d9' }} />
                  <div>点击"开始数据同步"查看各账套同步状态</div>
                </div>
              ) : (
                <div style={{ maxHeight: '450px', overflow: 'auto' }}>
                  <List
                    size="small"
                    dataSource={Object.entries(tenantSyncStatus)}
                    renderItem={([tenantId, status]) => {
                      const duration = status.startTime && status.endTime 
                        ? `${((status.endTime - status.startTime) / 1000).toFixed(1)}s`
                        : status.startTime 
                        ? `${((Date.now() - status.startTime) / 1000).toFixed(1)}s`
                        : '';

                      return (
                        <List.Item style={{ 
                          padding: '8px 0',
                          borderBottom: '1px solid #f0f0f0'
                        }}>
                          <List.Item.Meta
                            avatar={
                              <Avatar 
                                size="small"
                                style={{
                                  backgroundColor: 
                                    status.status === 'success' ? '#52c41a' :
                                    status.status === 'error' ? '#ff4d4f' :
                                    status.status === 'syncing' ? '#1890ff' : '#d9d9d9'
                                }}
                                icon={
                                  status.status === 'success' ? <CheckCircleOutlined /> :
                                  status.status === 'error' ? <ExclamationCircleOutlined /> :
                                  status.status === 'syncing' ? <SyncOutlined spin /> :
                                  <ClockCircleOutlined />
                                }
                              />
                            }
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500 }}>
                                  {getTenantName(tenantId)}
                                </span>
                                {duration && (
                                  <span style={{ 
                                    fontSize: '11px', 
                                    color: '#1890ff', 
                                    background: '#e6f7ff',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                  }}>
                                    {duration}
                                  </span>
                                )}
                              </div>
                            }
                            description={
                              <span style={{
                                color: status.status === 'error' ? '#ff4d4f' : '#666',
                                fontSize: '12px'
                              }}>
                                {status.message || 
                                  (status.status === 'waiting' ? '等待同步' :
                                   status.status === 'syncing' ? '正在同步数据...' :
                                   status.status === 'success' ? '同步成功' : '同步失败')
                                }
                              </span>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 详细结果表格 */}
        {productSyncInfo && (
          <Card title="同步结果详情" style={{ marginTop: 16 }} size="small">
            <Table
              dataSource={productSyncInfo}
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
              columns={[
                {
                  title: '账套名称',
                  dataIndex: 'name',
                  width: 200,
                  fixed: 'left',
                },
                {
                  title: '同步状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (status: string) => (
                    <Tag color={status === '已完成' ? 'success' : 'processing'}>
                      {status}
                    </Tag>
                  ),
                },
                {
                  title: '同步结果',
                  dataIndex: 'resCode',
                  width: 100,
                  render: (resCode: string) => (
                    <Tag color={resCode === '已成功' ? 'success' : 'error'}>
                      {resCode}
                    </Tag>
                  ),
                },
                {
                  title: '详细信息',
                  dataIndex: 'errMsg',
                  render: (errMsg: string) => (
                    <span style={{ 
                      color: errMsg ? '#ff4d4f' : '#52c41a',
                      fontSize: '12px'
                    }}>
                      {errMsg || '同步成功'}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </Content>
    </PageWrap>
  );
}
