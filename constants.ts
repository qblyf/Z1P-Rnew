export enum AllUrls {
  运行环境测试 = '/c/env-test',
}

export const Z1P_ENDPOINT =
  process.env.NEXT_PUBLIC_Z1P_ENDPOINT ?? 'https://p-api.z1.pub';
export const DINGDING_CORPID =
  process.env.NEXT_PUBLIC_Z1P_DINGDING_CORPID ?? '';
export const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL ?? '';

/** 每次延迟 20ms */
export const delayTime = 20;
/** 最多延迟 10 次 */
export const delayCount = 10;

/** 无响应最长时间间隔 (超时失败时间) */
export const repeatClickIntervalTime = 10000;

/** 成功响应时间间隔 (成功信息在 UI 停留的时间) */
export const successInfoStayTime = 2000;

/** 失败响应时间间隔 (失败信息在 UI 停留的时间) */
export const failureInfoStayTime = 6000;

/** 最小 loading 等待时间 */
export const minLoadingTime = 600;

/** [样式] 层级 */
export const MAX_ZINDEX = 2147480000;

/** 盘库结果查询页面 初始选择时间 */
export const pankuMinSelectTime = '2020-01-01';

/** 有效盘库方案最大长度 */
export const maxValidStocktakingPlan = 100;

/** 手机端 默认页面导航栏标题 */
export const defaultPageTitle = 'Z1 钉钉版';

/** 阿里云 OSS 上传区域 */
export const OSS_REGION = `oss-cn-qingdao`;

/** 阿里云 OSS 储存桶 */
export const OSS_BUCKET = `z1p`;

/** 阿里云 OSS 访问域名 */
export const OSS_VISIT_DOMAIN = `z1p.oss-cn-qingdao.aliyuncs.com`;

/** 限制上传图片大小 Byte */
export const limitUploadImgSize = 8388608;

/** 渲染 Byte 值 */
export function byte2str(v: number): string {
  if (v < 1024) {
    return `${v}字节`;
  }
  if (v < 1048576) {
    let str = (v / 1024).toFixed();
    const d = v % 1024;
    if (d !== 0) {
      str = '约' + str;
    }
    return `${str}KB`;
  }
  let str = (v / 1048576).toFixed();
  const d = v % 1048576;
  if (d !== 0) {
    str = '约' + str;
  }
  return `${str}MB`;
}
