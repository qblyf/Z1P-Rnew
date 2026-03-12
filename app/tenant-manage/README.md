# 账套管理功能

## 功能概述

账套管理是Z1平台的核心配置管理功能，用于管理所有账套（租户）的配置信息，包括数据库连接、域名配置、第三方服务配置等。

## 主要功能

### 1. 账套列表管理
- 📋 **账套概览**：显示所有账套的基本信息
- 🏷️ **状态管理**：有效、无效、维护中、测试等状态
- 🔍 **快速查找**：支持按名称、ID、域名搜索
- 📊 **同步状态**：显示最后同步时间和状态

### 2. 账套配置管理
- ➕ **新增账套**：创建新的账套配置
- ✏️ **编辑配置**：修改账套的基本信息和配置
- 👁️ **查看详情**：查看账套的完整配置信息
- 🗑️ **删除账套**：安全删除不再使用的账套

### 3. 配置验证
- ✅ **格式验证**：确保账套ID、域名等格式正确
- 🔒 **安全检查**：验证敏感配置的完整性
- ⚠️ **冲突检测**：检查重复的ID或域名配置

## 数据结构

### 账套配置字段

```typescript
interface TenantConfig {
  // 基本信息
  id: string;                    // 账套唯一标识
  name: string;                  // 账套显示名称
  domain: string;                // 主域名
  state: 'valid' | 'invalid' | 'maintenance' | 'testing';
  remarks?: string;              // 备注说明
  lastSyncAt: number;           // 最后同步时间戳
  
  // 数据库配置
  dbURI?: string;               // 主数据库连接
  dbURIPublic?: string;         // 公共数据库连接
  
  // 安全配置
  key?: string;                 // 主密钥
  jwtKey?: string;              // JWT密钥
  
  // 第三方服务配置
  oss?: object;                 // 对象存储配置
  sms?: object;                 // 短信服务配置
  dingtalk?: object;            // 钉钉配置
  wechat?: object;              // 微信配置
  // ... 其他服务配置
}
```

### 账套状态说明

| 状态 | 说明 | 颜色 |
|------|------|------|
| valid | 有效 - 正常运行中 | 绿色 |
| invalid | 无效 - 已停用或配置错误 | 红色 |
| maintenance | 维护中 - 系统维护，暂停服务 | 橙色 |
| testing | 测试 - 测试环境，仅供开发使用 | 蓝色 |

## 配置文件管理

### 配置文件位置
- **主配置文件**：`z1p-rnew/z1clients.ts`
- **类型定义**：`z1p-deno/tenants/z1tenant.type.ts`
- **示例配置**：`z1p-rnew/z1clients.example.ts`

### 配置文件结构
```typescript
// z1clients.ts
import { Z1Tenant } from "../z1p-deno/tenants/z1tenant.type";

const clientKeys = ["newgy", "gx", ...] as const;
export type ClientKey = (typeof clientKeys)[number];

export const z1ClientsObj: Partial<Record<ClientKey, Z1Tenant>> = {
  newgy: {
    id: "newgy",
    name: "高远控股",
    domain: "new-pwa.gaoyuansj.com",
    // ... 其他配置
  },
  // ... 其他账套
};
```

## 使用指南

### 新增账套
1. 点击"新增账套"按钮
2. 填写基本信息：ID、名称、域名
3. 选择账套状态
4. 添加备注说明（可选）
5. 配置数据库连接（可选）
6. 保存配置

### 编辑账套
1. 在账套列表中点击"编辑"按钮
2. 修改需要更新的字段
3. 保存更改

### 查看详情
1. 点击"查看详情"按钮
2. 查看账套的完整配置信息
3. 检查配置的完整性和正确性

### 删除账套
1. 点击"删除"按钮
2. 确认删除操作
3. 系统将移除该账套配置

## 安全注意事项

### 敏感信息保护
- 🔐 **环境变量**：敏感配置应通过环境变量提供
- 🚫 **版本控制**：不要将密钥等敏感信息提交到Git
- 🔒 **访问控制**：限制账套管理功能的访问权限

### 配置验证
- ✅ **格式检查**：确保ID、域名等格式正确
- 🔍 **重复检测**：避免重复的ID或域名
- ⚠️ **依赖检查**：确保相关服务配置完整

## 与其他功能的集成

### 数据同步
- 账套管理与数据同步功能紧密集成
- 同步功能会读取账套配置来确定同步目标
- 支持选择性同步特定账套

### 系统监控
- 显示各账套的运行状态
- 监控最后同步时间
- 提供健康检查功能

## 开发说明

### 文件结构
```
app/tenant-manage/
├── page.tsx              # 主页面组件
├── README.md             # 功能说明文档
utils/
├── tenantConfig.ts       # 账套配置工具函数
```

### 主要组件
- `TenantManagePage`: 主页面组件
- `TenantForm`: 账套编辑表单
- `TenantDetail`: 账套详情展示

### 工具函数
- `getTenantConfigs()`: 获取账套配置列表
- `getTenantName()`: 获取账套显示名称
- `validateTenantConfig()`: 验证账套配置
- `generateConfigFileContent()`: 生成配置文件内容

## 后续改进计划

1. **配置导入导出**：支持批量导入导出账套配置
2. **配置模板**：提供常用配置模板
3. **实时验证**：实时检查配置的有效性
4. **配置历史**：记录配置变更历史
5. **批量操作**：支持批量修改账套状态
6. **配置备份**：自动备份重要配置