import oss from 'ali-oss';

export type OSSTempCredentials = {
  SecurityToken: string;
  AccessKeyId: string;
  AccessKeySecret: string;
  Expiration: string;
};

export async function genOSSTempCredentials({
  accessKeyId,
  accessKeySecret,
  roleArn,
}: {
  /** 阿里云 RAM 用户 ID */
  accessKeyId: string;
  /** 阿里云 RAM 用户 密钥 */
  accessKeySecret: string;
  /** 阿里云 OSS role ARN */
  roleArn: string;
}) {
  const sts = new oss.STS({
    accessKeyId,
    accessKeySecret,
  });

  /**
   * 生成 OSS token
   * @see https://help.aliyun.com/document_detail/371864.html
   * 
   * @returns OSS 临时凭证
   * 
   * SECURITY NOTE: 
   * - policy: 当前使用默认策略，建议根据实际需求限制权限范围
   * - expirationSeconds: 使用默认 3600 秒（1小时），可根据业务需求调整
   */
  async function assumeRole() {
    // 使用默认策略（允许所有操作）
    // 生产环境建议设置更严格的策略，例如：
    // const policy = {
    //   Statement: [{
    //     Action: ['oss:PutObject'],
    //     Effect: 'Allow',
    //     Resource: ['acs:oss:*:*:bucket-name/*']
    //   }],
    //   Version: '1'
    // };
    const policy = undefined;
    
    // 使用默认过期时间 3600 秒（1小时）
    // 可根据业务需求调整，范围：900-3600 秒
    const expirationSeconds = undefined;
    
    const session = 'putObject';

    const r = await sts.assumeRole(roleArn, policy, expirationSeconds, session);
    return r.credentials;
  }

  async function assumeRoleToken() {
    const result = await assumeRole();
    return result;
  }

  const osstoken = await assumeRoleToken();

  return osstoken;
}

export default genOSSTempCredentials;
