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
   * [doc](https://help.aliyun.com/document_detail/371864.html)
   * @returns
   */
  async function assumeRole() {
    // TODO: 为了安全, 要设置 policy
    const policy = undefined;
    // TODO: 为了安全, 一定要设置过期时间, 默认值为 3600 秒
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
