# Z1P 后台应用开发规范

## 1. 项目概述

本规范定义了 Z1P 后台管理系统的开发标准，确保代码质量、UI 一致性和用户体验的统一。参考模版项目的现代化设计风格，采用 Tailwind CSS + 现代组件库的方案。

### 1.1 设计目标

- 🎨 **现代化设计** - 采用 Tailwind CSS 的现代化设计风格
- 📱 **响应式布局** - 完全响应式，支持移动端、平板、桌面
- ⚡ **高性能** - 优化加载速度和交互体验
- 🔒 **安全可靠** - 权限控制和数据保护
- 🎯 **易用性** - 直观的用户界面和操作流程
- 🌈 **视觉统一** - 渐变色、圆角、阴影的统一应用

## 2. 技术栈规范

### 2.1 核心框架

```
Next.js 14.2.25      - 服务端渲染和静态生成
React 18.3.1         - UI 组件库
TypeScript 5.5.3     - 类型安全
Tailwind CSS 3.4.1   - 原子化 CSS 框架
Lucide React         - 现代化图标库
```

### 2.2 状态管理

- **全局状态**: constate (轻量级上下文)
- **本地状态**: React Hooks (useState, useReducer)
- **数据获取**: SWR (缓存和实时更新)

### 2.3 样式方案

- **CSS 框架**: Tailwind CSS (原子化 CSS)
- **响应式**: Tailwind 的响应式前缀系统
- **主题定制**: Tailwind 配置文件 + CSS 变量
- **图标**: Lucide React (现代化 SVG 图标)

## 3. 项目结构规范

### 3.1 目录组织

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 全局布局
│   ├── page.tsx           # 首页
│   ├── (auth)/            # 认证相关页面
│   ├── (dashboard)/       # 仪表板页面组
│   ├── (product)/         # 商品管理页面组
│   └── [module]/          # 功能模块
│       ├── page.tsx
│       ├── layout.tsx
│       └── components/
│
├── components/            # 可复用组件
│   ├── layout/           # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── common/           # 通用组件
│   │   ├── PageHeader.tsx
│   │   ├── DataTable.tsx
│   │   └── FormModal.tsx
│   ├── business/         # 业务组件
│   │   ├── ProductForm.tsx
│   │   ├── SKUManager.tsx
│   │   └── CategoryTree.tsx
│   └── ui/              # 基础 UI 组件
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
│
├── hooks/               # 自定义 Hooks
│   ├── useAuth.ts
│   ├── useProduct.ts
│   ├── usePagination.ts
│   └── useForm.ts
│
├── services/            # API 服务层
│   ├── api.ts          # API 基础配置
│   ├── auth.ts         # 认证服务
│   ├── product.ts      # 商品服务
│   └── common.ts       # 通用服务
│
├── types/              # TypeScript 类型定义
│   ├── index.ts
│   ├── api.ts
│   ├── models.ts
│   └── common.ts
│
├── utils/              # 工具函数
│   ├── format.ts       # 格式化函数
│   ├── validate.ts     # 验证函数
│   ├── storage.ts      # 存储操作
│   └── request.ts      # 请求工具
│
├── constants/          # 常量定义
│   ├── api.ts
│   ├── config.ts
│   ├── enum.ts
│   └── messages.ts
│
├── styles/             # 全局样式
│   ├── globals.css
│   ├── variables.css
│   └── theme.ts
│
└── config/             # 配置文件
    ├── env.ts
    └── constants.ts
```

### 3.2 模块化规范

每个功能模块应包含：

```
module/
├── page.tsx           # 页面入口
├── layout.tsx         # 模块布局（可选）
├── components/        # 模块专用组件
│   ├── List.tsx
│   ├── Form.tsx
│   └── Detail.tsx
├── hooks/             # 模块专用 Hooks
│   └── useModule.ts
├── services/          # 模块专用服务
│   └── moduleApi.ts
├── types/             # 模块类型定义
│   └── index.ts
└── constants.ts       # 模块常量
```

## 4. 代码规范

### 4.1 命名规范

#### 文件命名

- **组件文件**: PascalCase (e.g., `ProductList.tsx`)
- **Hook 文件**: camelCase 以 `use` 开头 (e.g., `useProduct.ts`)
- **工具文件**: camelCase (e.g., `formatDate.ts`)
- **类型文件**: PascalCase (e.g., `Product.ts`)
- **常量文件**: camelCase (e.g., `apiConfig.ts`)

#### 变量命名

```typescript
// 组件
const ProductList: React.FC = () => {}

// 常量
const MAX_PAGE_SIZE = 100
const API_ENDPOINT = 'https://api.example.com'

// 变量
const [products, setProducts] = useState([])
const isLoading = true
const handleSubmit = () => {}

// 布尔值前缀
const isVisible = true
const hasError = false
const canEdit = true
const shouldUpdate = false
```

### 4.2 TypeScript 规范

```typescript
// ✅ 好的做法
interface Product {
  id: string
  name: string
  price: number
  createdAt: Date
}

type ProductStatus = 'active' | 'inactive' | 'archived'

// ✅ 使用泛型
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

// ✅ 导出类型
export type { Product, ProductStatus }
export interface IProductService {
  getProducts(): Promise<Product[]>
}

// ❌ 避免使用 any
const data: any = response.data // 不好

// ✅ 使用具体类型
const data: Product[] = response.data // 好
```

### 4.3 React 组件规范

```typescript
// ✅ 函数组件 + TypeScript
interface ProductListProps {
  onSelect?: (product: Product) => void
  loading?: boolean
}

export const ProductList: React.FC<ProductListProps> = ({
  onSelect,
  loading = false,
}) => {
  const [products, setProducts] = useState<Product[]>([])

  return (
    <div className="product-list">
      {/* 内容 */}
    </div>
  )
}

// ✅ 导出组件
export default ProductList

// ✅ 使用 Hooks
const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 逻辑
  }, [])

  return { products, loading }
}
```

### 4.4 代码格式

- **缩进**: 2 个空格
- **分号**: 必须
- **引号**: 单引号 (除非包含单引号)
- **行长**: 最多 100 字符
- **Prettier 配置**: 见 `.prettierrc`

## 5. UI/UX 规范

### 5.1 布局规范

#### 页面布局

```
┌─────────────────────────────────────┐
│          Header (导航栏)             │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │    Main Content          │
│ (菜单)   │    (主要内容区)          │
│          │                          │
├──────────┴──────────────────────────┤
│          Footer (页脚)               │
└─────────────────────────────────────┘
```

#### 内容区域

- **顶部**: PageHeader (标题 + 操作按钮)
- **中部**: 主要内容 (表格/表单/卡片)
- **底部**: 分页/操作栏

### 5.2 色彩规范

#### 主色系

```
主色 (Primary):     #1890ff (Ant Design 蓝)
成功 (Success):     #52c41a (绿色)
警告 (Warning):     #faad14 (橙色)
错误 (Error):       #f5222d (红色)
信息 (Info):        #1890ff (蓝色)
```

#### 中性色

```
文本主色:    #000000 (rgba(0, 0, 0, 0.85))
文本次色:    #666666 (rgba(0, 0, 0, 0.65))
文本禁用:    #999999 (rgba(0, 0, 0, 0.45))
背景色:      #ffffff
边框色:      #d9d9d9
```

### 5.3 间距规范

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px

使用示例:
margin: 16px;      // md
padding: 8px 16px; // sm md
gap: 24px;         // lg
```

### 5.4 字体规范

```
标题 H1:  24px, 600 weight, 1.35 line-height
标题 H2:  20px, 600 weight, 1.35 line-height
标题 H3:  16px, 600 weight, 1.35 line-height
正文:     14px, 400 weight, 1.5 line-height
小文本:   12px, 400 weight, 1.5 line-height
```

### 5.5 组件规范

#### 按钮

```typescript
// 主要操作
<Button type="primary">保存</Button>

// 次要操作
<Button>取消</Button>

// 危险操作
<Button danger>删除</Button>

// 禁用状态
<Button disabled>不可用</Button>

// 加载状态
<Button loading>加载中...</Button>
```

#### 表格

```typescript
// 标准表格配置
<Table
  columns={columns}
  dataSource={data}
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
  loading={loading}
  rowKey="id"
/>
```

#### 表单

```typescript
// 标准表单配置
<Form
  layout="vertical"
  onFinish={onSubmit}
  initialValues={initialData}
>
  <Form.Item
    label="商品名称"
    name="name"
    rules={[{ required: true, message: '请输入商品名称' }]}
  >
    <Input placeholder="请输入商品名称" />
  </Form.Item>
</Form>
```

#### 卡片

```typescript
// 标准卡片
<Card
  title="商品信息"
  extra={<Button>编辑</Button>}
  bordered={false}
>
  {/* 内容 */}
</Card>
```

## 6. 状态管理规范

### 6.1 全局状态

使用 constate 管理全局状态：

```typescript
// hooks/useAppState.ts
import constate from 'constate'

function useAppState() {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')

  return { user, setUser, theme, setTheme }
}

export const [AppProvider, useApp] = constate(useAppState)
```

### 6.2 本地状态

使用 React Hooks：

```typescript
// 简单状态
const [visible, setVisible] = useState(false)

// 复杂状态
const [state, dispatch] = useReducer(reducer, initialState)

// 表单状态
const [form] = Form.useForm()
```

### 6.3 数据获取

使用 SWR：

```typescript
import useSWR from 'swr'

const { data, error, isLoading } = useSWR(
  '/api/products',
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  }
)
```

## 7. 错误处理规范

### 7.1 错误类型

```typescript
// API 错误
interface ApiError {
  code: number
  message: string
  details?: Record<string, any>
}

// 业务错误
class BusinessError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message)
  }
}
```

### 7.2 错误处理

```typescript
// ✅ 好的做法
try {
  const data = await fetchProducts()
  setProducts(data)
} catch (error) {
  if (error instanceof ApiError) {
    message.error(error.message)
  } else {
    message.error('发生未知错误')
  }
}

// ✅ 使用 SWR 错误处理
const { data, error } = useSWR('/api/products', fetcher)

if (error) {
  return <ErrorBoundary error={error} />
}
```

## 8. 性能优化规范

### 8.1 代码分割

```typescript
// 动态导入
const ProductList = dynamic(() => import('./ProductList'), {
  loading: () => <Skeleton />,
})
```

### 8.2 记忆化

```typescript
// 使用 useMemo
const memoizedValue = useMemo(() => {
  return expensiveCalculation(a, b)
}, [a, b])

// 使用 useCallback
const memoizedCallback = useCallback(() => {
  doSomething(a, b)
}, [a, b])

// 使用 React.memo
export const ProductCard = React.memo(({ product }) => {
  return <div>{product.name}</div>
})
```

### 8.3 图片优化

```typescript
// 使用 Next.js Image
import Image from 'next/image'

<Image
  src="/product.jpg"
  alt="产品图片"
  width={200}
  height={200}
  priority
/>
```

## 9. 测试规范

### 9.1 单元测试

```typescript
// 使用 Jest + React Testing Library
describe('ProductList', () => {
  it('should render product list', () => {
    const { getByText } = render(<ProductList />)
    expect(getByText('商品列表')).toBeInTheDocument()
  })
})
```

### 9.2 集成测试

```typescript
// 测试完整流程
it('should add product successfully', async () => {
  const { getByRole, getByText } = render(<ProductForm />)
  
  fireEvent.change(getByRole('textbox'), {
    target: { value: '新商品' },
  })
  
  fireEvent.click(getByText('保存'))
  
  await waitFor(() => {
    expect(getByText('保存成功')).toBeInTheDocument()
  })
})
```

## 10. 文档规范

### 10.1 代码注释

```typescript
/**
 * 获取商品列表
 * @param page - 页码，默认为 1
 * @param pageSize - 每页数量，默认为 20
 * @returns 商品列表数据
 */
export async function getProducts(
  page: number = 1,
  pageSize: number = 20
): Promise<Product[]> {
  // 实现
}
```

### 10.2 README 规范

每个模块应包含 README.md：

```markdown
# 模块名称

## 功能描述

## 使用方法

## API 文档

## 常见问题
```

## 11. Git 规范

### 11.1 分支命名

```
feature/xxx      - 新功能
bugfix/xxx       - 修复 bug
refactor/xxx     - 代码重构
docs/xxx         - 文档更新
style/xxx        - 样式调整
```

### 11.2 提交信息

```
feat: 添加商品搜索功能
fix: 修复表格分页问题
refactor: 优化 API 请求逻辑
docs: 更新开发文档
style: 调整按钮样式
```

## 12. 开发工作流

### 12.1 本地开发

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 启动开发服务器
npm run dev

# 3. 编写代码并测试
# ...

# 4. 提交代码
git add .
git commit -m "feat: 添加新功能"

# 5. 推送到远程
git push origin feature/new-feature
```

### 12.2 代码审查

- 所有代码必须通过 ESLint 检查
- 必须有单元测试覆盖
- 需要至少一个审查者批准

### 12.3 部署流程

```
开发分支 → 测试环境 → 预发布环境 → 生产环境
```

## 13. 常见问题

### Q: 如何添加新页面？

A: 在 `app/` 下创建新目录，添加 `page.tsx` 和 `layout.tsx`

### Q: 如何创建可复用组件？

A: 在 `components/` 下创建，导出 TypeScript 类型定义

### Q: 如何管理全局状态？

A: 使用 constate 创建 Provider，通过 Hook 访问

### Q: 如何处理 API 错误？

A: 使用统一的错误处理中间件，显示用户友好的错误信息

## 14. 参考资源

- [Ant Design 文档](https://ant.design/)
- [Next.js 文档](https://nextjs.org/docs)
- [React 最佳实践](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
