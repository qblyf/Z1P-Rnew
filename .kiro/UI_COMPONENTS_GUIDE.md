# UI 组件库规范指南

## 1. 组件分类

### 1.1 基础组件 (UI Components)

基础组件是最小的可复用单元，不包含业务逻辑。

```
Button          - 按钮
Input           - 输入框
Select          - 下拉选择
Checkbox        - 复选框
Radio           - 单选框
Switch          - 开关
DatePicker      - 日期选择
TimePicker      - 时间选择
Upload          - 文件上传
Avatar          - 头像
Badge           - 徽章
Tag             - 标签
```

### 1.2 布局组件 (Layout Components)

```
Header          - 页面头部
Sidebar         - 侧边栏
Footer          - 页脚
PageContainer   - 页面容器
Card            - 卡片
Row/Col         - 栅格系统
Space           - 间距
Divider         - 分割线
```

### 1.3 业务组件 (Business Components)

包含业务逻辑的组件。

```
ProductForm     - 商品表单
ProductTable    - 商品表格
CategoryTree    - 分类树
SKUManager      - SKU 管理器
UserProfile     - 用户资料
```

### 1.4 反馈组件 (Feedback Components)

```
Modal           - 对话框
Drawer          - 抽屉
Notification    - 通知
Message         - 消息
Popover         - 气泡卡片
Tooltip         - 提示
Loading         - 加载
Empty           - 空状态
```

## 2. 基础组件使用规范

### 2.1 按钮 (Button)

#### 类型

```typescript
// 主要按钮 - 用于主要操作
<Button type="primary">保存</Button>

// 默认按钮 - 用于次要操作
<Button>取消</Button>

// 虚线按钮 - 用于添加操作
<Button type="dashed">添加</Button>

// 文本按钮 - 用于链接操作
<Button type="text">详情</Button>

// 危险按钮 - 用于删除操作
<Button danger>删除</Button>
```

#### 大小

```typescript
<Button size="large">大按钮</Button>
<Button size="middle">中按钮</Button>
<Button size="small">小按钮</Button>
```

#### 状态

```typescript
<Button loading>加载中</Button>
<Button disabled>禁用</Button>
<Button ghost>幽灵按钮</Button>
```

#### 最佳实践

```typescript
// ✅ 好的做法
<Button type="primary" onClick={handleSave}>
  保存
</Button>

// ❌ 避免
<Button type="primary" onClick={handleSave} loading={isLoading}>
  {isLoading ? '保存中...' : '保存'}
</Button>
```

### 2.2 输入框 (Input)

#### 基础用法

```typescript
// 文本输入
<Input placeholder="请输入商品名称" />

// 带前缀/后缀
<Input
  prefix={<SearchOutlined />}
  placeholder="搜索"
/>

// 文本域
<Input.TextArea
  rows={4}
  placeholder="请输入描述"
/>

// 数字输入
<InputNumber
  min={0}
  max={100}
  placeholder="请输入数量"
/>
```

#### 验证状态

```typescript
<Input status="error" placeholder="错误状态" />
<Input status="warning" placeholder="警告状态" />
<Input status="success" placeholder="成功状态" />
```

### 2.3 表格 (Table)

#### 基础配置

```typescript
const columns = [
  {
    title: '商品名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: '价格',
    dataIndex: 'price',
    key: 'price',
    width: 100,
    align: 'right',
    render: (price) => `¥${price.toFixed(2)}`,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    render: (_, record) => (
      <Space>
        <Button type="link" size="small">
          编辑
        </Button>
        <Button type="link" danger size="small">
          删除
        </Button>
      </Space>
    ),
  },
]

<Table
  columns={columns}
  dataSource={products}
  rowKey="id"
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
  loading={loading}
/>
```

#### 高级功能

```typescript
// 可选择
<Table
  columns={columns}
  dataSource={data}
  rowSelection={{
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  }}
/>

// 可排序
<Table
  columns={columns}
  dataSource={data}
  onChange={(pagination, filters, sorter) => {
    // 处理排序
  }}
/>

// 可展开
<Table
  columns={columns}
  dataSource={data}
  expandable={{
    expandedRowRender: (record) => <Details data={record} />,
  }}
/>
```

### 2.4 表单 (Form)

#### 基础配置

```typescript
const [form] = Form.useForm()

<Form
  form={form}
  layout="vertical"
  onFinish={onSubmit}
  initialValues={initialData}
>
  <Form.Item
    label="商品名称"
    name="name"
    rules={[
      { required: true, message: '请输入商品名称' },
      { min: 2, message: '至少 2 个字符' },
    ]}
  >
    <Input placeholder="请输入商品名称" />
  </Form.Item>

  <Form.Item
    label="商品分类"
    name="categoryId"
    rules={[{ required: true, message: '请选择分类' }]}
  >
    <Select placeholder="请选择分类">
      {categories.map((cat) => (
        <Select.Option key={cat.id} value={cat.id}>
          {cat.name}
        </Select.Option>
      ))}
    </Select>
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit">
      保存
    </Button>
    <Button onClick={() => form.resetFields()}>
      重置
    </Button>
  </Form.Item>
</Form>
```

#### 表单布局

```typescript
// 竖直布局（推荐用于后台）
<Form layout="vertical">
  {/* 字段 */}
</Form>

// 水平布局
<Form layout="horizontal" labelCol={{ span: 6 }}>
  {/* 字段 */}
</Form>

// 内联布局
<Form layout="inline">
  {/* 字段 */}
</Form>
```

### 2.5 模态框 (Modal)

#### 基础用法

```typescript
const [visible, setVisible] = useState(false)

<Modal
  title="确认删除"
  open={visible}
  onOk={handleDelete}
  onCancel={() => setVisible(false)}
  okText="确认"
  cancelText="取消"
>
  确定要删除这个商品吗？
</Modal>
```

#### 表单模态框

```typescript
<Modal
  title="编辑商品"
  open={visible}
  onOk={() => form.submit()}
  onCancel={() => setVisible(false)}
>
  <Form form={form} onFinish={onSubmit}>
    {/* 表单字段 */}
  </Form>
</Modal>
```

### 2.6 消息提示

#### Message（消息）

```typescript
// 成功
message.success('保存成功')

// 错误
message.error('保存失败')

// 警告
message.warning('请确认操作')

// 信息
message.info('这是一条信息')

// 加载
message.loading('加载中...')
```

#### Notification（通知）

```typescript
notification.success({
  message: '保存成功',
  description: '商品已保存到系统',
  duration: 4.5,
})
```

## 3. 布局组件规范

### 3.1 页面布局

#### 标准后台布局

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Layout>
        <Sidebar />
        <Layout>
          <Content>{children}</Content>
          <Footer />
        </Layout>
      </Layout>
    </Layout>
  )
}
```

### 3.2 页面容器

#### PageContainer

```typescript
// 标准页面容器
<PageContainer
  title="商品管理"
  subTitle="管理所有商品信息"
  extra={[
    <Button key="add" type="primary">
      添加商品
    </Button>,
  ]}
>
  {/* 页面内容 */}
</PageContainer>
```

### 3.3 卡片布局

```typescript
// 基础卡片
<Card title="商品信息">
  {/* 内容 */}
</Card>

// 带操作的卡片
<Card
  title="商品信息"
  extra={<Button>编辑</Button>}
>
  {/* 内容 */}
</Card>

// 无边框卡片
<Card bordered={false}>
  {/* 内容 */}
</Card>
```

## 4. 业务组件规范

### 4.1 组件结构

```typescript
// components/business/ProductForm.tsx
interface ProductFormProps {
  initialData?: Product
  onSubmit: (data: Product) => Promise<void>
  loading?: boolean
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    try {
      await onSubmit(values)
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败')
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={initialData}
    >
      {/* 表单字段 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          保存
        </Button>
      </Form.Item>
    </Form>
  )
}
```

### 4.2 组件通信

```typescript
// 父组件
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

<ProductTable
  onSelect={setSelectedProduct}
  onEdit={(product) => {
    setSelectedProduct(product)
    setModalVisible(true)
  }}
/>

<ProductModal
  visible={modalVisible}
  product={selectedProduct}
  onClose={() => setModalVisible(false)}
  onSubmit={handleSubmit}
/>
```

## 5. 响应式设计规范

### 5.1 断点

```typescript
// Ant Design 断点
xs: 480px   // 超小屏幕
sm: 576px   // 小屏幕
md: 768px   // 中等屏幕
lg: 992px   // 大屏幕
xl: 1200px  // 超大屏幕
xxl: 1600px // 超超大屏幕
```

### 5.2 响应式栅格

```typescript
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8} lg={6}>
    <Card>内容</Card>
  </Col>
  <Col xs={24} sm={12} md={8} lg={6}>
    <Card>内容</Card>
  </Col>
</Row>
```

### 5.3 响应式表格

```typescript
// 小屏幕隐藏某些列
const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    responsive: ['xs', 'sm', 'md', 'lg', 'xl'],
  },
  {
    title: '描述',
    dataIndex: 'description',
    responsive: ['md', 'lg', 'xl'], // 小屏幕隐藏
  },
]
```

## 6. 主题定制规范

### 6.1 主题配置

```typescript
// app/layout.tsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 6,
      fontSize: 14,
    },
    components: {
      Button: {
        primaryColor: '#1890ff',
      },
      Table: {
        headerBg: '#fafafa',
      },
    },
  }}
>
  {children}
</ConfigProvider>
```

### 6.2 自定义样式

```typescript
// styles/theme.ts
export const theme = {
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
}
```

## 7. 无障碍设计规范

### 7.1 语义化 HTML

```typescript
// ✅ 好的做法
<button aria-label="删除商品">
  <DeleteOutlined />
</button>

// ❌ 避免
<div onClick={handleDelete}>删除</div>
```

### 7.2 键盘导航

```typescript
// 支持 Tab 键导航
<Button tabIndex={0}>按钮</Button>

// 支持 Enter 键
<Input onKeyPress={(e) => {
  if (e.key === 'Enter') {
    handleSubmit()
  }
}} />
```

### 7.3 颜色对比度

- 文本与背景对比度至少 4.5:1
- 大文本对比度至少 3:1

## 8. 性能优化规范

### 8.1 虚拟滚动

```typescript
// 大列表使用虚拟滚动
<Table
  columns={columns}
  dataSource={largeData}
  virtual
  scroll={{ y: 600 }}
/>
```

### 8.2 懒加载

```typescript
// 图片懒加载
<Image
  src={url}
  preview={false}
  loading="lazy"
/>
```

### 8.3 分页加载

```typescript
// 使用分页而不是一次加载所有数据
<Table
  pagination={{
    pageSize: 20,
    total: totalCount,
    onChange: (page) => {
      fetchData(page)
    },
  }}
/>
```

## 9. 常见组件组合

### 9.1 搜索 + 表格

```typescript
const [searchText, setSearchText] = useState('')
const [data, setData] = useState([])

const filteredData = data.filter((item) =>
  item.name.includes(searchText)
)

return (
  <>
    <Input.Search
      placeholder="搜索商品"
      onSearch={setSearchText}
      style={{ marginBottom: 16 }}
    />
    <Table columns={columns} dataSource={filteredData} />
  </>
)
```

### 9.2 表单 + 表格

```typescript
const [form] = Form.useForm()
const [data, setData] = useState([])

const handleSearch = (values) => {
  // 根据表单值搜索
  const filtered = data.filter((item) => {
    return Object.entries(values).every(([key, value]) => {
      return !value || item[key] === value
    })
  })
  setData(filtered)
}

return (
  <>
    <Form form={form} layout="inline" onFinish={handleSearch}>
      {/* 搜索字段 */}
    </Form>
    <Table columns={columns} dataSource={data} />
  </>
)
```

### 9.3 模态框 + 表单

```typescript
const [visible, setVisible] = useState(false)
const [form] = Form.useForm()

const handleSubmit = async (values) => {
  await api.save(values)
  message.success('保存成功')
  setVisible(false)
  form.resetFields()
}

return (
  <>
    <Button onClick={() => setVisible(true)}>添加</Button>
    <Modal
      title="添加商品"
      open={visible}
      onOk={() => form.submit()}
      onCancel={() => setVisible(false)}
    >
      <Form form={form} onFinish={handleSubmit}>
        {/* 表单字段 */}
      </Form>
    </Modal>
  </>
)
```

## 10. 常见问题

### Q: 如何自定义组件样式？

A: 使用 `className` 和 CSS-in-JS，或者使用 Ant Design 的 `style` 属性

### Q: 如何处理表单验证？

A: 使用 Form.Item 的 `rules` 属性定义验证规则

### Q: 如何实现国际化？

A: 使用 `ConfigProvider` 的 `locale` 属性

### Q: 如何处理大数据列表？

A: 使用虚拟滚动或分页加载

## 11. 参考资源

- [Ant Design 组件库](https://ant.design/components/overview/)
- [Ant Design Pro 最佳实践](https://pro.ant.design/)
- [React 组件设计模式](https://react.dev/learn)
