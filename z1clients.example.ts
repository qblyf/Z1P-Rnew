// 租户信息文件 (账套信息文件) - 示例文件
// 请根据实际情况复制此文件为 z1clients.ts 并填入真实的配置信息
// 
// Note: 历史上使用 client 这个词，但因为容易与客户端混淆，
// 现在改用 tenant（租户）这个词。代码中的 client 会逐步重构为 tenant。

import { Z1Tenant } from "../z1p-deno/tenants/z1tenant.type";

const clientKeys = [
  "newgy",
  "gx",
  "zsqk",
  "gy",
  "gx0775",
  "haombo",
  "zsqkp",
  "jcxiaomi",
  "llxiaomi",
  "baicheng",
  "jiyuandixintong",
  "changfasm",
  "pingnuo",
  "kaisheng",
  "linji",
  "sulian",
  "znyxt",
  "hwyxt",
  "xmyxt",
  "pgyxt",
  "yysyxt",
] as const;

export type ClientKey = (typeof clientKeys)[number];

export function isClientKey(v: unknown): v is ClientKey {
  if (typeof v !== "string") {
    return false;
  }
  return (clientKeys as readonly string[]).includes(v);
}

/**
 * 所有 Z1 账套信息 (⚠️ 仅供 Z1P 使用)
 * 
 * 注意: 敏感信息应该通过环境变量或安全的配置管理系统提供
 * 不要将真实的密钥、密码等敏感信息提交到版本控制系统
 */
export const z1ClientsObj: Partial<Record<ClientKey, Z1Tenant>> = {
  newgy: {
    id: "newgy",
    s1ClientID: "newgy",
    name: "高远控股",
    domain: "new-pwa.gaoyuansj.com",
    domains: {
      frontendPwa: "new-pwa.gaoyuansj.com",
      file: null,
      fileOss: null,
      filePrivate: null,
      filePrivateOss: null,
    },
    dbURI: process.env.NEWGY_DB_URI || "",
    dbURIPublic: process.env.NEWGY_DB_URI_PUBLIC || "",
    lastSyncAt: 0,
    remarks: '曾用于 "高远专卖"',
    state: "valid",
    key: process.env.NEWGY_KEY || "",
    acceptableKeys: {
      goBackend: process.env.NEWGY_GO_BACKEND_KEY || "",
    },
    jwtKey: process.env.NEWGY_JWT_KEY || "",
    oss: {
      accessKeyId: process.env.NEWGY_OSS_ACCESS_KEY_ID || "",
      accessKeySecret: process.env.NEWGY_OSS_ACCESS_KEY_SECRET || "",
      roleArn: process.env.NEWGY_OSS_ROLE_ARN || "",
    },
    mns: {
      accountID: process.env.NEWGY_MNS_ACCOUNT_ID || "",
      regionID: process.env.NEWGY_MNS_REGION_ID || "",
      accessKeyId: process.env.NEWGY_MNS_ACCESS_KEY_ID || "",
      accessKeySecret: process.env.NEWGY_MNS_ACCESS_KEY_SECRET || "",
    },
    ossPublic: {
      ossBucket: "new-cdn-gy",
      ossRegion: "oss-cn-qingdao",
    },
    uploadDir: {
      UPLOAD_DIR_LOCAL: "/home/csv",
      UPLOAD_DIR_WEB: "https://new-cdn-gy.oss-cn-qingdao.aliyuncs.com/csv",
    },
    sms: {
      ALISMS_ACCESS_KEY_ID: process.env.NEWGY_ALISMS_ACCESS_KEY_ID || "",
      ALISMS_ACCESS_KEY_SECRET: process.env.NEWGY_ALISMS_ACCESS_KEY_SECRET || "",
      ALISMS_SIGN: process.env.NEWGY_ALISMS_SIGN || "",
      ALISMS_TPL_ORDER_SUCCESS: process.env.NEWGY_ALISMS_TPL_ORDER_SUCCESS || "",
    },
    frontendEnv: {
      ENDPOINT_GO: "https://new-g.gaoyuansj.com",
      ENDPOINT_FUNC: "https://new-func.gaoyuansj.com/deno",
      DINGTALK_CORP_ID: "ding12c15dc89e666ea9",
      OSS_VISIT_DOMAIN: "new-cdn.gaoyuansj.com",
      QQ_MAP_KEY: "",
      ENDPOINT_WXMALL: "https://new-pwa.gaoyuansj.com/wxmall",
      QY_WECHAT_CORPID: "ww933163129930c478",
      QY_WECHAT_QRLOGIN_AGENTID: "1000041",
      ENDPOINT_PWA: "https://new-pwa.gaoyuansj.com",
    },
    dingtalk: {
      DINGTALK_AGENTID: process.env.NEWGY_DINGTALK_AGENTID || "",
      DINGTALK_APPKEY: process.env.NEWGY_DINGTALK_APPKEY || "",
      DINGTALK_APPSECRET: process.env.NEWGY_DINGTALK_APPSECRET || "",
      DINGTALK_WEBHOOK_ASEKEY: process.env.NEWGY_DINGTALK_WEBHOOK_ASEKEY || "",
      DINGTALK_WEBHOOK_TOKEN: process.env.NEWGY_DINGTALK_WEBHOOK_TOKEN || "",
    },
    wechat: {
      WECHAT_XCX_APP_ID: process.env.NEWGY_WECHAT_XCX_APP_ID || "",
      WECHAT_XCX_APP_KEY: process.env.NEWGY_WECHAT_XCX_APP_KEY || "",
      WECHAT_GZH_APP_ID: process.env.NEWGY_WECHAT_GZH_APP_ID || "",
      WECHAT_GZH_APP_KEY: process.env.NEWGY_WECHAT_GZH_APP_KEY || "",
      WECHAT_MCH_ID: process.env.NEWGY_WECHAT_MCH_ID || "",
      WECHAT_MCH_KEY: process.env.NEWGY_WECHAT_MCH_KEY || "",
      WECHAT_RSASN: process.env.NEWGY_WECHAT_RSASN || "",
      WECHAT_RSASN_KEY: process.env.NEWGY_WECHAT_RSASN_KEY || "",
      WECHAT_V3_KEY: process.env.NEWGY_WECHAT_V3_KEY || "",
    },
    wework: {
      WEWORK_CORPID: process.env.NEWGY_WEWORK_CORPID || "",
      WEWORK_QRLOGIN_AGENTID: process.env.NEWGY_WEWORK_QRLOGIN_AGENTID || "",
      WEWORK_QRLOGIN_SECRET: process.env.NEWGY_WEWORK_QRLOGIN_SECRET || "",
      WEWORK_CALLBACK_MSG_TOKEN: process.env.NEWGY_WEWORK_CALLBACK_MSG_TOKEN || "",
      WEWORK_CALLBACK_MSG_ENCODING_AES_KEY: process.env.NEWGY_WEWORK_CALLBACK_MSG_ENCODING_AES_KEY || "",
    },
    ahs: {
      AHS_KEY: process.env.NEWGY_AHS_KEY || "",
      AHS_SECRET: process.env.NEWGY_AHS_SECRET || "",
      AHS_OPENID: process.env.NEWGY_AHS_OPENID || "",
      AHS_BASE_URL: process.env.NEWGY_AHS_BASE_URL || "",
    },
    feishu: {
      FEISHU_APP_ID: process.env.NEWGY_FEISHU_APP_ID || "",
      FEISHU_APP_SECRET: process.env.NEWGY_FEISHU_APP_SECRET || "",
    },
    wxappid: process.env.NEWGY_WXAPPID || "",
    isJdxRecycleEnabled: false,
  },
  // 其他租户配置...
};
