// 商品管理

import ossConfig from '../../constant/oss-config';
import { genOSSTempCredentials } from '../../common/genOSSTempCredentials';
import CacheDataClient from './CacheDataClient';
import ProductManagerWithHeader from './ProductManager';
import { Suspense } from 'react';
import { Z1P_ENDPOINT } from '../../constants';

export default async function () {
  const { accessKeyId, accessKeySecret, roleArn } = ossConfig;

  // 利用 Next.js 的缓存特性，缓存 OSS 临时凭证
  // 凭证有效期为 1200 秒（20 分钟），与 revalidate 时间一致
  let ossCredentials = null;
  
  // 只有在配置了 OSS 凭证时才生成临时凭证
  if (accessKeyId && accessKeySecret && roleArn) {
    ossCredentials = await fetch(`${Z1P_ENDPOINT}/test`, {
      method: 'OPTIONS',
      next: { revalidate: 1200 },
    }).catch(() => 0).then(() =>
      genOSSTempCredentials({
        accessKeyId,
        accessKeySecret,
        roleArn,
      })
    );
  }

  // 在此处不必进行页面权限的校验, 详见文档
  return (
    <Suspense fallback={<>加载中, 请稍候.</>}>
      <ProductManagerWithHeader />
      <CacheDataClient ossCredentials={JSON.stringify(ossCredentials)} />
    </Suspense>
  );
}
