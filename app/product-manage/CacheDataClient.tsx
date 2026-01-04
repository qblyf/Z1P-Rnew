'use client';
import { useEffect } from 'react';

/**
 * [客户端组件] 缓存数据到客户端
 * @param props
 * @returns
 */
export default function CacheDataClient(props: { ossCredentials: string }) {
  const { ossCredentials } = props;
  useEffect(() => {
    sessionStorage.setItem('ossCredentials', ossCredentials);
  }, [ossCredentials]);
  return <></>;
}
