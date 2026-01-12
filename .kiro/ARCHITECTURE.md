# Z1P React 项目架构

## 项目概述

**Z1 平台数据管理系统** - 一个基于 Next.js 14 的企业级数据管理应用，集成钉钉、企业微信等多平台支持。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js | 14.2.25 |
| **UI 库** | Ant Design (antd) | 5.19.0 |
| **语言** | TypeScript | 5.5.3 |
| **状态管理** | constate | 3.3.2 |
| **数据获取** | SWR | 2.2.5 |
| **拖拽** | react-dnd | 16.0.1 |
| **日期** | dayjs, moment | - |
| **存储** | 阿里云 OSS | - |
| **认证** | 钉钉 JSAPI | 3.0.9 |

## 项目结构

```
z1p-react/
├── app/                          # Next.js App Router 应用目录
│   ├── layout.tsx               # 全局布局（认证、主题、监控）
│   ├── page.tsx                 # 首页（功能导航）
│   ├── product-manage/          # 商品管理模块
│   ├── spu-list/                # SPU 列表
│   ├── sku-list/                # SKU 列表
│   ├── basedata-manage/         # 基础数据管理
│   ├── data-export/             # 数据导出
│   ├── log/                     # 更新日志
│   ├── changes/                 # 操作审计
│   ├── system-maintenance-time/ # 账套维护时间
│   ├── chat/                    # 聊天模块
│   ├── qr-login-desk/           # 二维码登录（桌面）
│   ├── qr-login-mobile/         # 二维码登录（移动）
│   └── [其他页面]/
│
├── components/                   # React 组件库
│   ├── PageWrap.tsx             # 页面包装器（权限检查）
│   ├── Upload.tsx               # 文件上传组件
│   ├── CanvasWatermark.tsx       # 水印组件
│   ├── SKUManager.tsx            # SKU 管理器
│   ├── SPUList.tsx              # SPU 列表组件
│   ├── render/                  # 渲染组件
│   │   ├── RenderSPU.tsx
│   │   ├── RenderSKU.tsx
│   │   └── RenderDate.tsx
│   ├── style/                   # 样式组件
│   │   └── Content.tsx
│   └── [其他组件]/
│
├── datahooks/                    # 数据获取 Hooks
│   ├── auth.ts                  # 认证（钉钉/企业微信/飞书）
│   ├── product.ts               # 商品数据
│   ├── brand.ts                 # 品牌数据
│   └── permission.ts            # 权限数据
│
├── common/                       # 公共工具函数
│   ├── genOSSTempCredentials.ts # 生成 OSS 临时凭证
│   └── mpUplodaOssHelper.ts     # 文件上传助手
│
├── constant/                     # 常量定义
│   ├── data.tsx                 # 数据常量
│   ├── formProps.tsx            # 表单配置
│   ├── oss-config.ts            # OSS 配置
│   └── for-dev.ts               # 开发常量
│
├── data/                         # 数据模型
│   └── product.ts               # 商品数据模型
│
├── constants.ts                  # 全局常量
├── z1clients.ts                  # SDK 客户端初始化
├── next.config.js                # Next.js 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json                  # 项目依赖
```

## 核心架构设计

### 1. 认证层（Authentication）

**文件**: `datahooks/auth.ts`

```
钉钉/企业微信/飞书
    ↓
requestAuthCode (获取授权码)
    ↓
dingtalkLogin (后端登录)
    ↓
JWT Token (存储在 localStorage)
    ↓
TokenProvider (constate 全局状态)
    ↓
useTokenContext (组件使用)
```

**特点**:
- 支持多平台自动登录（钉钉、企业微信、飞书）
- 开发模式使用 Mock Token
- JWT 解析和过期检查
- 用户信息水印显示

### 2. 页面结构

**全局布局** (`app/layout.tsx`):
- ConfigProvider (Ant Design 中文配置)
- TokenProvider (认证上下文)
- CanvasWatermark (用户水印)
- AntdRegistry (样式隔离)
- 钉钉远程调试 SDK
- 钉钉前端监控 (生产环境)

### 3. 数据获取层

**Hooks 模式** (`datahooks/`):
- `useToken()` - 认证信息
- `useProduct()` - 商品数据
- `useBrand()` - 品牌数据
- `usePermission()` - 权限数据

**集成 SWR**:
- 自动缓存
- 实时更新
- 错误处理

### 4. 业务模块

#### 商品管理 (`/product-manage`)
- SPU 分类管理
- SPU 管理
- SKU 管理
- 参数配置

#### 基础数据 (`/basedata-manage`)
- 品牌管理
- 分类管理
- 参数管理

#### 数据导出 (`/data-export`)
- CSV 导出
- 批量操作

#### 操作审计 (`/changes`)
- 变动日志查询
- 操作追踪

### 5. 文件上传

**流程**:
```
选择文件
    ↓
Upload 组件
    ↓
genOSSTempCredentials (获取临时凭证)
    ↓
阿里云 OSS 直传
    ↓
获取文件 URL
```

**配置**:
- 区域: oss-cn-qingdao
- 桶: z1p
- 域名: z1p.oss-cn-qingdao.aliyuncs.com
- 限制: 8MB

### 6. 外部集成

#### Z1 SDK (`@zsqk/z1-sdk`)
- 后端 API 调用
- 认证接口
- 业务数据接口

#### 钉钉 JSAPI (`dingtalk-jsapi`)
- 授权登录
- 远程调试
- 前端监控

#### Ant Design Pro Components
- 高级表格
- 表单组件
- 布局组件

## 关键流程

### 应用启动流程

```
1. 加载 layout.tsx
   ├─ 初始化 Z1 SDK
   ├─ 配置 Ant Design (中文)
   ├─ 启动 TokenProvider
   └─ 加载钉钉 SDK

2. useToken Hook 执行
   ├─ 检查缓存 Token
   ├─ 如果无效，尝试钉钉登录
   ├─ 解析 JWT Payload
   └─ 更新全局状态

3. 渲染页面
   ├─ 显示用户水印
   ├─ 加载页面内容
   └─ 初始化数据获取
```

### 页面访问流程

```
用户访问页面
    ↓
PageWrap 组件检查权限
    ↓
useTokenContext 获取认证信息
    ↓
datahooks 获取业务数据
    ↓
Ant Design 组件渲染
    ↓
用户交互 → 更新数据 → 重新渲染
```

## 环境配置

### 环境变量

```env
# .env.local / .env.development
NEXT_PUBLIC_Z1P_ENDPOINT=https://p-api.z1.pub
NEXT_PUBLIC_Z1P_DINGDING_CORPID=xxx
NEXT_PUBLIC_HOST_URL=xxx
```

### 开发模式

- Mock Token 自动注入
- 钉钉 SDK 调试模式
- 热重载支持

### 生产模式

- 真实钉钉登录
- 前端监控启用
- 静态优化

## 性能优化

1. **代码分割**: Next.js 自动按路由分割
2. **图片优化**: Next.js Image 组件
3. **样式隔离**: AntdRegistry 防止样式冲突
4. **缓存策略**: SWR 自动缓存
5. **监控**: 钉钉前端监控（生产环境）

## 安全性

1. **JWT 验证**: 过期时间检查
2. **权限检查**: PageWrap 组件验证
3. **CORS**: 后端配置
4. **OSS 临时凭证**: 时间限制

## 扩展点

1. **新页面**: 在 `app/` 下创建新目录
2. **新组件**: 在 `components/` 下创建
3. **新数据源**: 在 `datahooks/` 下创建 Hook
4. **新工具函数**: 在 `common/` 下创建
5. **新常量**: 在 `constant/` 下创建

## 常见任务

### 添加新页面
```
1. 在 app/ 下创建目录
2. 创建 page.tsx
3. 使用 PageWrap 包装
4. 在首页添加导航链接
```

### 添加新数据源
```
1. 在 datahooks/ 下创建 Hook
2. 使用 SWR 获取数据
3. 在组件中使用 Hook
```

### 添加新组件
```
1. 在 components/ 下创建文件
2. 导出 React 组件
3. 在页面中导入使用
```

## 部署

- **框架**: Vercel (Next.js 官方推荐)
- **构建**: `npm run build`
- **启动**: `npm run start`
- **开发**: `npm run dev`

## 监控和调试

- **钉钉远程调试**: 生产环境可用
- **前端监控**: 生产环境自动启用
- **本地调试**: 开发模式 Mock Token
