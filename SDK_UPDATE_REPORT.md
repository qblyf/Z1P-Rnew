# Z1 SDK 更新报告

**更新时间**: 2026年2月6日

## 更新摘要

### 中间层 SDK (@zsqk/z1-sdk)

#### 版本变更
- **旧版本**: `3.0.202501311111-26579-feat-invoice-detail-baysky`
  - Commit: `1be65010226c2d3ebf55fc4c05ffcdb5ab9bc20a`
  - 构建时间: 2025年1月31日

- **新版本**: `3.0.202602061024-feat-pc-order-collection-and-forwarding-vvvvvvvvvvip`
  - Commit: `099a1d19d6ee818afdba8c1a8c30da7e634e9d05`
  - 构建时间: 2026年2月6日 10:24:28

#### 更新内容
根据版本号分析，新版本包含以下特性：
- **PC端订单收集和转发功能** (feat-pc-order-collection-and-forwarding)
- 这是一个功能分支的构建版本

#### 影响范围
项目中使用 SDK 的主要模块：
1. **认证模块** (`datahooks/auth.ts`)
   - `dingtalkLogin` - 钉钉登录
   - `Z1PUserJWTPayload` - JWT 载荷类型

2. **产品模块** (`datahooks/product.ts`, `utils/smartMatcher.ts`)
   - `getSPUListNew` - 获取 SPU 列表
   - `getSPUInfo` - 获取 SPU 信息
   - `getSKUsInfo` - 获取 SKU 信息
   - `getSPUCateBaseList` - 获取 SPU 分类列表

3. **品牌模块** (`datahooks/brand.ts`)
   - `getBrandBaseList` - 获取品牌列表

4. **权限模块** (`datahooks/permission.ts`)
   - `permissionApply` - 权限申请
   - `PermissionPackages` - 权限包类型

5. **缓存模块** (`data/product.ts`)
   - `genCacheFunc` - 生成缓存函数

6. **类型定义**
   - `SPUCateID`, `SpuID`, `SkuID`, `SPUState`, `SKUState` 等

## 验证结果

### ✅ 构建测试
- **状态**: 通过
- **编译**: 成功，无错误
- **类型检查**: 通过
- **所有路由**: 正常生成（23个页面）

### ✅ 类型兼容性
已验证以下模块的类型兼容性，无错误：
- ✅ `datahooks/auth.ts` - 认证模块
- ✅ `datahooks/product.ts` - 产品模块
- ✅ `datahooks/brand.ts` - 品牌模块
- ✅ `datahooks/permission.ts` - 权限模块
- ✅ `utils/smartMatcher.ts` - 智能匹配模块

### ✅ 后端 API 连接
- **端点**: `https://p-api.z1.pub`
- **状态**: 正常响应
- **配置**: 通过环境变量 `NEXT_PUBLIC_Z1P_ENDPOINT` 可配置

## 建议操作

### 1. 测试验证
建议对以下功能进行回归测试：
- [ ] 钉钉登录流程
- [ ] 产品列表加载（SPU/SKU）
- [ ] 品牌数据获取
- [ ] 权限验证
- [ ] 智能匹配功能

### 2. 关注点
- 新版本主要涉及 PC 端订单功能，如果项目中使用了订单相关 API，需要特别关注
- 检查是否有 breaking changes 影响现有功能

### 3. 后续步骤
1. ✅ 运行项目确保没有编译错误 - **已完成**
2. 在开发环境验证核心功能
3. 如有问题，可以回退到旧版本

## 回退方法
如需回退到旧版本，执行：
```bash
npm install @zsqk/z1-sdk@github:zsqk/z1-mid-build#1be65010226c2d3ebf55fc4c05ffcdb5ab9bc20a
```
