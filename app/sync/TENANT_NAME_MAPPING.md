# 账套名称映射说明

## 当前状态

目前账套名称映射使用硬编码的备用映射，这不是最佳实践。

## 问题

1. **硬编码名称**：名称可能不准确（如"吉源地信通"应为"济源迪信通"）
2. **维护困难**：需要手动同步配置文件中的名称变更
3. **数据不一致**：可能与实际配置文件中的名称不匹配

## 建议的解决方案

### 方案1：从配置文件动态读取（推荐）

```typescript
// 理想的实现方式
import { z1ClientsObj } from '../../z1clients';

const getTenantName = (tenantId: string): string => {
  // 从实际配置文件中读取
  const config = z1ClientsObj[tenantId];
  if (config?.name) {
    return config.name;
  }
  
  // 如果配置中没有名称，返回ID
  return tenantId;
};
```

### 方案2：通过API获取

```typescript
// 从后端API获取账套信息
const getTenantName = async (tenantId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/tenants/${tenantId}`);
    const tenant = await response.json();
    return tenant.name || tenantId;
  } catch (error) {
    return tenantId;
  }
};
```

### 方案3：环境变量配置

```typescript
// 通过环境变量配置名称映射
const TENANT_NAMES = {
  'newgy': process.env.TENANT_NAME_NEWGY || '高远控股',
  'jiyuandixintong': process.env.TENANT_NAME_JIYUANDIXINTONG || '济源迪信通',
  // ...其他账套
};
```

## 当前的临时修复

已修正已知的错误名称：
- ✅ `jiyuandixintong`: '济源迪信通' （原为"吉源地信通"）

## 需要验证的名称

以下名称需要与实际配置核对：
- `gx`: '广西' - 是否应该更具体？
- `gy`: '高远' - 与 `newgy` 的区别？
- `zsqk`: '中晟' - 完整名称是什么？
- `sulian`: '苏联' - 这个名称看起来不太对
- `znyxt`: '智能云系统' - 需要确认
- `hwyxt`: '华为云系统' - 需要确认
- `xmyxt`: '小米云系统' - 需要确认
- `pgyxt`: '苹果云系统' - 需要确认
- `yysyxt`: '应用商业系统' - 需要确认

## 实施建议

1. **短期**：继续使用当前的 `getTenantName` 函数，但需要核对所有名称
2. **中期**：实现从配置文件动态读取的功能
3. **长期**：考虑通过API或数据库获取账套信息

## 代码位置

- 主要实现：`Z1P-Rnew/app/sync/page.tsx` 中的 `getTenantName` 函数
- 配置参考：`Z1P-Rnew/z1clients.example.ts`