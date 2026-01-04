'use client';

import { useSearchParams } from 'next/navigation';
import { useTokenContext } from '../../datahooks/auth';
import { Button, Row } from 'antd';
import { airLoginConfirm, airLoginScan } from '@zsqk/z1-sdk/es/z1p/auth';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { parserUA } from '@zsqk/somefn/js/ua';

export default function () {
  return (
    <Suspense>
      <QrLoginMobilePage />
    </Suspense>
  );
}

/**
 * [页面] 移动端 QR code 登录
 *
 * query:
 *
 * 1. `storage` 中转站参数, 则在登录成功后将 token 传入中转站.
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
function QrLoginMobilePage() {
  const { token, errMsg } = useTokenContext();

  const searchParams = useSearchParams();
  const storage = useMemo(() => searchParams?.get('storage'), [searchParams]);
  const [status, setStatus] = useState<'等待确认' | string>('等待确认');

  useEffect(() => {
    if (typeof storage !== 'string') {
      return;
    }
    const ua = parserUA(window.navigator.userAgent);
    airLoginScan(storage, { scanner: `${ua.os} ${ua.softwareName}` });
  }, [storage]);

  // 抛错, 不是有效的参数
  if (typeof storage !== 'string') {
    return <>请等待参数传入, 或当前参数无效</>;
  }

  if (errMsg) {
    return <span>无法进一步登录: {errMsg}</span>;
  }

  if (!token) {
    return <span>正在登录中, 请稍等.</span>;
  }

  return (
    <>
      <Row>{status}</Row>
      {status === '等待确认' && (
        <Button
          onClick={async () => {
            setStatus('正在登录中, 请稍等');

            // 登录已完成, 将 token 写入 storage
            await airLoginConfirm(storage, { token }).catch(err => {
              setStatus(`${err}`);
            });
            setStatus('登录已完成');
          }}
        >
          请确认登录
        </Button>
      )}
    </>
  );
}
