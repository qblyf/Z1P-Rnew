'use client';

import { 
  pullAllData,
  addSyncData,
  syncProductSingle
} from '@zsqk/z1-sdk/es/z1p/sync-data';
import { addSyncLogWithData } from '@zsqk/z1-sdk/es/z1p/sync-log';

import { Button, Descriptions, Table, Progress, Space, Card, Row, Col, Tag, Steps, List, Avatar, Alert, Checkbox } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, SyncOutlined, DatabaseOutlined } from '@ant-design/icons';
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // 账套列表和名称映射
  const [tenantList, setTenantList] = useState<Array<{ 
    id: string; 
    tenantID: string;
    clientName: string;
    remarks?: string;
  }>>([]);
  const [tenantIDMap, setTenantIDMap] = useState<Record<string, string>>({});
  
  // 选中的账套列表
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // 获取账套列表
  useEffect(() => {
    if (!token) return;
    
    // 使用 API 路由获取账套列表
    fetch(`/api/tenants?token=${encodeURIComponent(token)}`)
      .then(async res => {
        // 检查响应类型
        const contentType = res.headers.get('content-type');
        console.log('📡 API 响应状态:', res.status);
        console.log('📡 API 响应类型:', contentType);
        
        if (!contentType?.includes('application/json')) {
          const text = await res.text();
          console.error('❌ API 返回了非 JSON 响应:', text.substring(0, 500));
          throw new Error('API 返回了错误的响应格式，请检查服务器日志');
        }
        
        return res.json();
      })
      .then(result => {
        if (!result.success) {
          throw new Error(result.message || '获取账套列表失败');
        }
        
        console.log(`✅ 获取账套列表: ${result.data.length} 个账套`);
        
        // 直接使用 API 返回的账套列表
        const tenants = result.data.map((v: any) => ({
          id: v.tenantID || v.id,
          tenantID: v.tenantID || v.id,
          clientName: v.name,
          remarks: v.remarks
        }));
        
        console.log(`✅ 成功加载 ${tenants.length} 个账套:`, tenants);
        setTenantList(tenants);
        
        // 创建 tenantID 映射（用于显示）
        const idMap: Record<string, string> = {};
        tenants.forEach((t: any) => {
          idMap[t.tenantID] = t.clientName;
        });
        setTenantIDMap(idMap);
        
        // 默认全选
        setSelectedTenants(tenants.map((t: any) => t.tenantID));
      })
      .catch(err => {
        console.error('❌ 获取账套列表失败:', err);
        setMsg(`获取账套列表失败: ${err.message}`);
      });
  }, [token]);

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

  const fn = useMemo(() => {
    console.log('SyncButton init');
    return async () => {
      if (selectedTenants.length === 0) {
        setMsg('请至少选择一个账套进行同步');
        return;
      }

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
        
        // 步骤4: 使用选中的账套列表
        const tenantIDs = selectedTenants;
        console.log(`准备同步 ${tenantIDs.length} 个账套:`, tenantIDs);
        console.log('账套列表详情:', tenantList.filter(t => tenantIDs.includes(t.id)));
        
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
          setCurrentStep(`正在同步账套 ${tenantID} (${i + 1}/${totalSets})...`);
          
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
              name: `${tenantIDMap[tenantID] || tenantID} (${tenantID})`,
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
              name: `${tenantIDMap[tenantID] || tenantID} (${tenantID})`,
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
  }, [selectedTenants, tenantIDMap]);

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
            <Card title="同步控制" size="small">
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="同步数据">
                  <Tag color="blue">SPU 分类</Tag>
                  <Tag color="green">SPU</Tag>
                  <Tag color="orange">SKU</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="账套数量">
                  <strong>{tenantList.length}</strong> 个账套
                  {showDebugInfo && (
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => {
                        fetch(`/api/tenants?token=${encodeURIComponent(token!)}&raw=true`)
                          .then(res => res.json())
                          .then(data => {
                            console.log('原始 SDK 数据:', data);
                            alert('原始数据已输出到控制台，请按 F12 查看');
                          });
                      }}
                    >
                      查看原始数据
                    </Button>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="已选账套">
                  <strong style={{ color: selectedTenants.length === 0 ? '#ff4d4f' : '#1890ff' }}>
                    {selectedTenants.length}
                  </strong> 个账套
                </Descriptions.Item>
                <Descriptions.Item label="注意事项">
                  <span style={{ color: '#fa8c16' }}>⚠️</span> 同步时会锁表，请在数据修改完成后进行
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    style={{ marginLeft: 8 }}
                  >
                    {showDebugInfo ? '隐藏' : '显示'}调试信息
                  </Button>
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
                    const status = tenantSyncStatus[tenant.tenantID];
                    const duration = status?.startTime && status?.endTime 
                      ? `${((status.endTime - status.startTime) / 1000).toFixed(1)}s`
                      : status?.startTime 
                      ? `${((Date.now() - status.startTime) / 1000).toFixed(1)}s`
                      : '';

                    return (
                      <List.Item 
                        style={{ 
                          padding: '10px 12px',
                          borderBottom: '1px solid #f0f0f0',
                          background: isSelected ? '#f6ffed' : 'transparent',
                          transition: 'all 0.3s',
                          borderLeft: isSelected ? '3px solid #52c41a' : '3px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                          {/* 选择框 */}
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleTenantSelect(tenant.tenantID, e.target.checked)}
                            disabled={disabled}
                          />
                          
                          {/* 状态图标 */}
                          {status ? (
                            <Avatar 
                              size="small"
                              style={{
                                backgroundColor: 
                                  status.status === 'success' ? '#52c41a' :
                                  status.status === 'error' ? '#ff4d4f' :
                                  status.status === 'syncing' ? '#1890ff' : '#d9d9d9',
                                flexShrink: 0
                              }}
                              icon={
                                status.status === 'success' ? <CheckCircleOutlined /> :
                                status.status === 'error' ? <ExclamationCircleOutlined /> :
                                status.status === 'syncing' ? <SyncOutlined spin /> :
                                <ClockCircleOutlined />
                              }
                            />
                          ) : (
                            <div style={{ width: 24, flexShrink: 0 }} />
                          )}
                          
                          {/* 账套信息 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: 500, 
                              fontSize: '13px',
                              marginBottom: '2px'
                            }}>
                              {tenant.clientName}
                            </div>
                            <div style={{
                              color: '#999',
                              fontSize: '11px',
                              marginBottom: status ? '4px' : 0
                            }}>
                              tenantID: {tenant.tenantID}
                            </div>
                            {showDebugInfo && tenant.remarks && (
                              <div style={{
                                color: '#666',
                                fontSize: '10px',
                                fontStyle: 'italic',
                                marginBottom: status ? '4px' : 0
                              }}>
                                备注: {tenant.remarks}
                              </div>
                            )}
                            {status && (
                              <div style={{
                                color: status.status === 'error' ? '#ff4d4f' : '#666',
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {status.message || 
                                  (status.status === 'waiting' ? '等待同步' :
                                   status.status === 'syncing' ? '正在同步数据...' :
                                   status.status === 'success' ? '同步成功' : '同步失败')
                                }
                              </div>
                            )}
                          </div>
                          
                          {/* 耗时标签 */}
                          {duration && (
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#1890ff', 
                              background: '#e6f7ff',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              flexShrink: 0
                            }}>
                              {duration}
                            </span>
                          )}
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </div>
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
