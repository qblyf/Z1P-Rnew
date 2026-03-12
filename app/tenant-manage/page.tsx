'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch,
  Descriptions,
  Alert,
  Tooltip,
  Row,
  Col,
  message
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  KeyOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-components';
import { Content } from '../../components/style/Content';
import PageWrap from '../../components/PageWrap';
import { 
  TENANT_STATES, 
  type TenantConfig 
} from '../../utils/tenantConfig';
import { useTokenContext } from '../../datahooks/auth';
import { usePageTab } from '../../datahooks/usePageTab';

export default function TenantManagePage() {
  // 注册页面标签页
  usePageTab('租户管理');
  
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantConfig | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<TenantConfig | null>(null);
  const [form] = Form.useForm();
  
  // 获取用户 token
  const { token } = useTokenContext();

  // 数据加载 - 依赖 token
  useEffect(() => {
    loadTenants();
  }, [token]);

  const loadTenants = async () => {
    if (!token) {
      console.warn('未登录，无法加载账套列表');
      return;
    }
    
    setLoading(true);
    try {
      // 从 SDK API 加载所有账套信息
      const response = await fetch(`/api/tenants?token=${encodeURIComponent(token)}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setTenants(result.data);
        console.log(`成功加载 ${result.total} 个账套`);
      } else {
        throw new Error(result.message || '加载失败');
      }
    } catch (error) {
      console.error('加载账套失败:', error);
      message.error('加载账套列表失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };
  // 处理新增/编辑
  const handleEdit = (tenant?: TenantConfig) => {
    setEditingTenant(tenant || null);
    if (tenant) {
      form.setFieldsValue(tenant);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const tenantData: TenantConfig = {
        ...values,
        id: values.id,
        lastSyncAt: editingTenant?.lastSyncAt || 0
      };

      if (editingTenant) {
        // 更新
        setTenants(prev => prev.map(t => t.id === editingTenant.id ? tenantData : t));
      } else {
        // 新增
        setTenants(prev => [...prev, tenantData]);
      }

      setModalVisible(false);
      setEditingTenant(null);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 处理删除
  const handleDelete = (tenant: TenantConfig) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除账套"${tenant.name}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setTenants(prev => prev.filter(t => t.id !== tenant.id));
      }
    });
  };

  // 查看详情
  const handleView = (tenant: TenantConfig) => {
    setViewingTenant(tenant);
    setViewModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '账套ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => <code>{id}</code>
    },
    {
      title: '账套名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: TenantConfig) => (
        <Space>
          <strong>{name}</strong>
          {record.remarks && (
            <Tooltip title={record.remarks}>
              <Tag>备注</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      width: 200,
      render: (domain: string) => (
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
          <GlobalOutlined /> {domain}
        </a>
      )
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (state: keyof typeof TENANT_STATES) => {
        const stateConfig = TENANT_STATES[state];
        return <Tag color={stateConfig.color}>{stateConfig.label}</Tag>;
      }
    },
    {
      title: '最后同步',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      width: 150,
      render: (timestamp: number) => {
        if (!timestamp) return <span style={{ color: '#999' }}>从未同步</span>;
        const date = new Date(timestamp);
        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        return (
          <Tooltip title={date.toLocaleString()}>
            <span style={{ color: hours > 24 ? '#ff4d4f' : '#666' }}>
              {hours < 1 ? '刚刚' : `${hours}小时前`}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: TenantConfig) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record)}
            title="查看详情"
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            title="编辑"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record)}
            title="删除"
          />
        </Space>
      )
    }
  ];
  return (
    <PageWrap ppKey="product-manage">
      <PageHeader
        title="账套管理"
        subTitle="管理所有Z1平台账套配置"
        extra={[
          <Button 
            key="add" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleEdit()}
          >
            新增账套
          </Button>
        ]}
      />
      <Content>
        {!token && (
          <Alert
            message="需要登录"
            description="请先登录系统以查看账套列表"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Alert
          message="账套管理说明"
          description="账套是Z1平台的核心配置单元，包含数据库连接、域名配置、第三方服务配置等。数据来源于系统维护时间配置。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Card>
          <Table
            columns={columns}
            dataSource={tenants}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个账套`
            }}
          />
        </Card>

        {/* 新增/编辑模态框 */}
        <Modal
          title={editingTenant ? '编辑账套' : '新增账套'}
          open={modalVisible}
          onOk={handleSave}
          onCancel={() => {
            setModalVisible(false);
            setEditingTenant(null);
          }}
          width={600}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              state: 'valid'
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="id"
                  label="账套ID"
                  rules={[
                    { required: true, message: '请输入账套ID' },
                    { pattern: /^[a-z0-9]+$/, message: '只能包含小写字母和数字' }
                  ]}
                >
                  <Input 
                    placeholder="如: newgy" 
                    disabled={!!editingTenant}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="账套名称"
                  rules={[{ required: true, message: '请输入账套名称' }]}
                >
                  <Input placeholder="如: 高远控股" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="domain"
                  label="主域名"
                  rules={[
                    { required: true, message: '请输入域名' },
                    { type: 'url', message: '请输入有效的域名' }
                  ]}
                >
                  <Input placeholder="如: new-pwa.gaoyuansj.com" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="state"
                  label="状态"
                  rules={[{ required: true, message: '请选择状态' }]}
                >
                  <Select>
                    {Object.entries(TENANT_STATES).map(([key, config]) => (
                      <Select.Option key={key} value={key}>
                        <Tag color={config.color}>{config.label}</Tag>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="remarks"
              label="备注"
            >
              <Input.TextArea 
                placeholder="账套相关说明..." 
                rows={3}
              />
            </Form.Item>

            <Form.Item
              name="dbURI"
              label="数据库连接"
            >
              <Input.Password 
                placeholder="mongodb://..." 
                visibilityToggle
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 查看详情模态框 */}
        <Modal
          title="账套详情"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              关闭
            </Button>
          ]}
          width={800}
        >
          {viewingTenant && (
            <Descriptions column={2} bordered>
              <Descriptions.Item label="账套ID">
                <code>{viewingTenant.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="账套名称">
                {viewingTenant.name}
              </Descriptions.Item>
              <Descriptions.Item label="S1客户端ID">
                {viewingTenant.s1ClientID || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={TENANT_STATES[viewingTenant.state].color}>
                  {TENANT_STATES[viewingTenant.state].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="主域名" span={2}>
                <a href={`https://${viewingTenant.domain}`} target="_blank" rel="noopener noreferrer">
                  {viewingTenant.domain}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="数据库连接" span={2}>
                {viewingTenant.dbURI ? '已配置' : '未配置'}
              </Descriptions.Item>
              <Descriptions.Item label="最后同步时间" span={2}>
                {viewingTenant.lastSyncAt 
                  ? new Date(viewingTenant.lastSyncAt).toLocaleString()
                  : '从未同步'
                }
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {viewingTenant.remarks || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </Content>
    </PageWrap>
  );
}