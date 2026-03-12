# 账套数据源说明

## 数据获取策略

账套管理功能使用**唯一数据源**：SDK 的 `getSysSettings` API。

## 实现方式

### SDK API

使用 `@zsqk/z1-sdk/es/z1p/sys-setting` 中的 `getSysSettings` API：

```typescript
import { getSysSettings } from '@zsqk/z1-sdk/es/z1p/sys-setting';

// 获取所有账套的系统设置（包括维护时间）
const sysSettings = await getSysSettings({ auth: token });

// 返回格式：
// Array<{
//   clientName: string;  // 账套名称
//   remarks: string;     // 备注
//   value: Array<{      // 维护时间配置
//     name: '例行维护时间' | '特殊维护时间';
//     startTime: UnixTimestamp;
//     endTime: UnixTimestamp;
//   }>;
// }>
```

### 数据流程

```
用户登录 → 获取 token → API 调用 getSysSettings → 返回所有账套
```

### 核心文件

- **`app/api/tenants/route.ts`**: API 路由
  - GET `/api/tenants?token=xxx` 从 SDK 获取账套列表
  - 必须提供有效的 token
  - 返回所有账套及其维护时间信息

- **`app/tenant-manage/page.tsx`**: 账套管理页面
  - 使用 `useTokenContext` 获取用户 token
  - 调用 API 获取账套列表
  - 如果未登录，显示提示信息

- **`app/system-maintenance-time/page.tsx`**: 系统维护时间页面
  - 使用相同的 `getSysSettings` API
  - 确保数据来源一致

## 优势

1. **数据一致性**：与"账套维护时间"页面使用相同的数据源
2. **实时准确**：直接从系统配置获取，反映最新状态
3. **体验统一**：避免多数据源导致的混乱
4. **数据完整**：获取所有已配置的账套，不会遗漏

## 使用要求

### 必须登录

账套管理功能需要用户登录后才能使用：
- 未登录时显示提示信息
- 登录后自动加载账套列表

### API 响应格式

```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    domain: string;
    state: 'valid' | 'invalid' | 'maintenance' | 'testing';
    remarks: string;
    lastSyncAt: number;
    maintenanceInfo: {
      routineStart?: number;
      routineEnd?: number;
      specialStart?: number;
      specialEnd?: number;
    }
  }>,
  total: number
}
```

## 问题排查

### 为什么看不到账套列表？

1. **未登录**：请先登录系统
2. **Token 过期**：刷新页面重新登录
3. **API 错误**：检查浏览器控制台的错误信息

### 如何验证？

打开浏览器控制台，查看日志：
```
成功加载 21 个账套
```

## 相关页面

- **系统维护时间** (`/system-maintenance-time`): 使用相同的 `getSysSettings` API
- **同步管理** (`/sync`): 使用账套名称进行同步操作

## 相关文档

- `app/system-maintenance-time/page.tsx`: 系统维护时间页面实现
- `app/sync/TENANT_NAME_MAPPING.md`: 账套名称映射说明
- `TENANT_MANAGEMENT_IMPLEMENTATION.md`: 账套管理功能实现文档
