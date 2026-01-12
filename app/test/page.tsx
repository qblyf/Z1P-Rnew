'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { parserUA } from '@zsqk/somefn/js/ua';

export default function () {
  return (
    <Suspense>
      <Test />
    </Suspense>
  );
}

/**
 * [页面] 远程调试管理
 *
 * 功能点:
 *
 * 1. 取消调试模式.
 * 2. 根据传入 ID 设置调试模式.
 * 3. 自动生成 ID 并进入调试模式. (该模式为根据钉钉推断的非正式功能)
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
function Test() {
  const searchParams = useSearchParams();
  const clear = searchParams?.get('clear');

  // 远程调试链接
  const [link, setLink] = useState<string>();

  useEffect(() => {
    const uuid = searchParams?.get('uuid');
    const gen = searchParams?.get('gen');

    // 取消调试模式
    if (clear) {
      localStorage.removeItem('testUUID');
    }

    // 根据传入 ID 设置调试模式
    if (typeof uuid === 'string') {
      localStorage.setItem('testUUID', uuid);
      setLink(
        `https://render.alipay-eco.com/p/s/devtools-web/index.html?ch2=${uuid}&chInfo=dingtalk-h5`
      );
    }

    // 自动生成 ID 并进入调试模式
    if (gen) {
      let uuid = 'dde82858-ada6-461f-973d-3bdb224b9319';
      if (crypto.randomUUID) {
        uuid = crypto.randomUUID();
      }
      localStorage.setItem('testUUID', uuid);
      setLink(
        `https://render.alipay-eco.com/p/s/devtools-web/index.html?ch2=${uuid}&chInfo=dingtalk-h5`
      );
      // TODO: 有人创建调试模式时, 自动通知开发者
    }
  }, [clear, searchParams]);

  return (
    <>
      页面 远程调试管理 {JSON.stringify(searchParams?.entries())}
      <br />
      {clear && '已退出调试'}
      {link}
      <EnvDisplay />
    </>
  );
}

function EnvDisplay() {
  const [uaInfo, setUA] = useState<Record<string, unknown>>();
  useEffect(() => {
    const zsqkUA = parserUA(window.navigator.userAgent);
    const ua = {
      ua: window.navigator.userAgent,
      操作系统: zsqkUA.os,
      软件: zsqkUA.softwareName,
    };
    const env = {
      'crypto 支持': typeof crypto === 'object',
    };
    setUA({ ...ua, ...env });
  }, []);
  if (!uaInfo) {
    return <></>;
  }
  return Object.entries(uaInfo).reduce(
    (pre, [k, v]) => {
      return (
        <>
          {pre}
          <br />
          {k}: {`${v}`}
        </>
      );
    },
    <></>
  );
}
