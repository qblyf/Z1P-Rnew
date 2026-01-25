'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { init } from '@zsqk/z1-sdk/es/z1p/util';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import Head from 'next/head';

import { Z1P_ENDPOINT } from '../constants';
import { CanvasWatermark } from '../components/CanvasWatermark';
import { TokenProvider, useTokenContext } from '../datahooks/auth';
import { AdminLayout } from '../components/Layout/AdminLayout';

import { WPK_BID } from '../constant/for-dev';

import dayjs from 'dayjs';

import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

init({ endpoint: Z1P_ENDPOINT });

export function ClientLayout({ children }: { children: React.ReactNode }) {
  /**
   * 判断是否应该加载监控
   */
  const [shouldLoadMonitoring, setShouldLoadMonitoring] = useState(false);

  // 使用 useEffect 确保只在客户端执行
  useEffect(() => {
    const isProductEnv = !!(
      typeof window !== 'undefined' &&
      window.location &&
      window.location.host &&
      !window.location.host.includes('127.0.0.1') &&
      !window.location.host.includes('localhost') &&
      !window.location.host.includes('192.168.')
    );
    setShouldLoadMonitoring(isProductEnv);
  }, []);

  return (
    <>
      <Head>
        <meta name="wpk-bid" content={WPK_BID} />
      </Head>

      {/* 钉钉远程调试 SDK */}
      <Script
        id="dingtalk-debug"
        crossOrigin="anonymous"
        src="https://g.alicdn.com/code/npm/@ali/dingtalk-h5-remote-debug-sdk/0.1.3/app.bundle.js"
        strategy="afterInteractive"
      />

      {/* 钉钉前端监控 */}
      {shouldLoadMonitoring ? (
        <Script
          id="wpk-reporter"
          crossOrigin="anonymous"
          strategy="afterInteractive"
          src="https://g.alicdn.com/woodpeckerx/jssdk??wpkReporter.js"
          onLoad={() => {
            const win = window as any;
            if (!win.__wpk) {
              win.__wpk = new win.wpkReporter({ bid: WPK_BID });
            }
            win.__wpk.installAll();
          }}
        />
      ) : null}

      <ConfigProvider locale={zhCN}>
        <TokenProvider>
          <NameCanvasWatermark />
          <AdminLayout>
            <AntdRegistry>{children}</AntdRegistry>
          </AdminLayout>
        </TokenProvider>
      </ConfigProvider>
    </>
  );
}

function NameCanvasWatermark() {
  const { payload } = useTokenContext();

  let text = '未认证用户';
  if (payload) {
    // 解析 token, 将用户姓名及手机号后四位放入水印中
    text = `${payload.name} ${payload.phoneNum.slice(-4)}`;
  }

  return <CanvasWatermark text={text} isRotate={true} />;
}
