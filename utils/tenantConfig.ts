/**
 * 账套配置管理工具
 * 用于读取和管理 z1clients.ts 配置文件
 */

// 账套配置类型定义
export interface TenantConfig {
  id: string;
  s1ClientID?: string;
  name: string;
  domain: string;
  state: 'valid' | 'invalid' | 'maintenance' | 'testing';
  remarks?: string;
  lastSyncAt: number;
  
  // 数据库配置
  dbURI?: string;
  dbURIPublic?: string;
  
  // 域名配置
  domains?: {
    frontendPwa: string;
    file: string | null;
    fileOss: string | null;
    filePrivate: string | null;
    filePrivateOss: string | null;
  };
  
  // 安全配置
  key?: string;
  jwtKey?: string;
  acceptableKeys?: {
    goBackend: string;
  };
  
  // OSS配置
  oss?: {
    accessKeyId: string;
    accessKeySecret: string;
    roleArn: string;
  };
  
  // 其他服务配置
  sms?: Record<string, string>;
  dingtalk?: Record<string, string>;
  wechat?: Record<string, string>;
  wework?: Record<string, string>;
  ahs?: Record<string, string>;
  feishu?: Record<string, string>;
}

// 账套状态配置
export const TENANT_STATES = {
  valid: { label: '有效', color: 'success', description: '正常运行中' },
  invalid: { label: '无效', color: 'error', description: '已停用或配置错误' },
  maintenance: { label: '维护中', color: 'warning', description: '系统维护中，暂停服务' },
  testing: { label: '测试', color: 'processing', description: '测试环境，仅供开发使用' }
} as const;

// 默认账套列表（从z1clients.example.ts提取）
export const DEFAULT_TENANT_IDS = [
  'newgy', 'gx', 'zsqk', 'gy', 'gx0775', 
  'haombo', 'zsqkp', 'jcxiaomi', 'llxiaomi',
  'baicheng', 'jiyuandixintong', 'changfasm', 
  'pingnuo', 'kaisheng', 'linji', 'sulian',
  'znyxt', 'hwyxt', 'xmyxt', 'pgyxt', 'yysyxt'
] as const;

/**
 * 获取账套配置
 * 注意：此函数已废弃，建议直接使用 getSysSettings SDK
 * 返回默认配置仅用于向后兼容
 */
export async function getTenantConfigs(): Promise<TenantConfig[]> {
  return getDefaultTenantConfigs();
}

/**
 * 获取默认账套配置
 */
export function getDefaultTenantConfigs(): TenantConfig[] {
  const defaultNames: Record<string, string> = {
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
    'jiyuandixintong': '济源迪信通',
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

  return DEFAULT_TENANT_IDS.map(id => ({
    id,
    name: defaultNames[id] || id,
    domain: `${id}.example.com`,
    state: 'valid' as const,
    lastSyncAt: 0,
    remarks: `${defaultNames[id] || id}账套配置`
  }));
}

/**
 * 获取账套名称
 */
export function getTenantName(tenantId: string): string {
  const defaultNames: Record<string, string> = {
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
    'jiyuandixintong': '济源迪信通',
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
  
  return defaultNames[tenantId] || tenantId;
}

/**
 * 验证账套配置
 */
export function validateTenantConfig(config: Partial<TenantConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.id) {
    errors.push('账套ID不能为空');
  } else if (!/^[a-z0-9]+$/.test(config.id)) {
    errors.push('账套ID只能包含小写字母和数字');
  }
  
  if (!config.name) {
    errors.push('账套名称不能为空');
  }
  
  if (!config.domain) {
    errors.push('域名不能为空');
  }
  
  if (config.state && !Object.keys(TENANT_STATES).includes(config.state)) {
    errors.push('无效的账套状态');
  }
  
  return errors;
}

/**
 * 生成账套配置文件内容
 */
export function generateConfigFileContent(tenants: TenantConfig[]): string {
  const imports = `import { Z1Tenant } from "../z1p-deno/tenants/z1tenant.type";`;
  
  const clientKeys = tenants.map(t => `"${t.id}"`).join(',\n  ');
  const clientKeysArray = `const clientKeys = [\n  ${clientKeys}\n] as const;`;
  
  const typeDefinitions = `
export type ClientKey = (typeof clientKeys)[number];

export function isClientKey(v: unknown): v is ClientKey {
  if (typeof v !== "string") {
    return false;
  }
  return (clientKeys as readonly string[]).includes(v);
}`;

  const tenantConfigs = tenants.map(tenant => {
    return `  ${tenant.id}: {
    id: "${tenant.id}",
    name: "${tenant.name}",
    domain: "${tenant.domain}",
    state: "${tenant.state}",
    lastSyncAt: ${tenant.lastSyncAt},
    ${tenant.remarks ? `remarks: "${tenant.remarks}",` : ''}
    // 其他配置字段...
  }`;
  }).join(',\n');

  const configObject = `
export const z1ClientsObj: Partial<Record<ClientKey, Z1Tenant>> = {
${tenantConfigs}
};`;

  return [imports, clientKeysArray, typeDefinitions, configObject].join('\n\n');
}