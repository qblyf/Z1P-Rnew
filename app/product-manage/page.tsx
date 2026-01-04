// 商品管理

import ossConfig from '../../constant/oss-config';
import { genOSSTempCredentials } from '../../common/genOSSTempCredentials';
import CacheDataClient from './CacheDataClient';
import ProductManagerWithHeader from './ProductManager';
import { Suspense } from 'react';
import { Z1P_ENDPOINT } from '../../constants';

export default async function () {
  const { accessKeyId, accessKeySecret, roleArn } = ossConfig;

  // 这是一个 trick, 利用了 Next.js 的缓存特性, 将来可以用 API 替换
  // TODO: 将过期时间作为参数传入 genOSSTempCredentials
  const ossCredentials = await fetch(`${Z1P_ENDPOINT}/test`, {
    method: 'OPTIONS',
    next: { revalidate: 1200 },
  }).catch(() => 0).then(() =>
    genOSSTempCredentials({
      accessKeyId,
      accessKeySecret,
      roleArn,
    })
  );

  // 在此处不必进行页面权限的校验, 详见文档
  return (
    <Suspense fallback={<>加载中, 请稍候.</>}>
      <ProductManagerWithHeader />
      <CacheDataClient ossCredentials={JSON.stringify(ossCredentials)} />
    </Suspense>
  );
}
