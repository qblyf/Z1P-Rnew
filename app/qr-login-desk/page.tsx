'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Row } from 'antd';

import {
  getPayload,
  setCacheToken,
  useTokenContext,
} from '../../datahooks/auth';
import { HOST_URL } from '../../constants';
import { airLoginCheck } from '@zsqk/z1-sdk/es/z1p/auth';

/**
 * 储存本页面全局 timeout ID, 避免同时存在多个 timeout
 */
let t: number;
/**
 * 储存本页面全局 loop ID, 避免同时存在多个 loop
 */
let l: number;

export default function () {
  return (
    <Suspense>
      <QrLoginDeskPage />
    </Suspense>
  );
}

/**
 * [页面] 桌面端 QR code 登录
 *
 * query:
 *
 * 1. `redirect` 跳转参数, 则在登录成功后进行页面跳转.
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
function QrLoginDeskPage() {
  const { token } = useTokenContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 前端生成的数据储存地址 key
  const [storage, setStorage] = useState<string>();

  // 二维码是否超时
  const [isTimeout, setIsTimeout] = useState(false);

  // 已经扫码的设备
  const [scanner, setScanner] = useState<string>();

  // 前端生成的扫码地址
  const url = useMemo(() => {
    const url = `${HOST_URL}/qr-login-mobile?storage=${storage}`;
    console.log('移动端登录 url', url);
    return url;
  }, [storage]);

  useEffect(() => {
    const redirect = searchParams?.get('redirect');
    if (typeof token !== 'string') {
      return;
    }
    const [_, err] = getPayload(token);
    if (err === null) {
      // 登录成功
      console.log('登录成功');
      if (typeof redirect === 'string') {
        // 进行页面跳转
        router.replace(redirect);
      }
    }
  }, [router, token, searchParams]);

  const updateQR = () => {
    // 重置超时
    clearTimeout(t);
    clearInterval(l);
    setIsTimeout(false);
    setScanner(undefined);

    // 生成新的 uuid 及超时
    const uuid = crypto.randomUUID();
    setStorage(uuid);
    l = window.setInterval(async () => {
      // 检查 storage 数据
      const res = await airLoginCheck(uuid);
      // console.log(res);
      if (res.state === 'confirmed') {
        // 如果找到 storage 的值, 则写入到 local 中
        setCacheToken(res.payload.token);
        window.clearInterval(l);
      } else if (res.state === 'scanned') {
        setScanner(res.payload.scanner);
      }
    }, 1000);
    t = window.setTimeout(() => {
      window.clearInterval(l);
      setIsTimeout(true);
    }, 60000); // TODO: 调试成功后改为 60s 60000
  };

  useEffect(() => {
    updateQR();
  }, []);

  useEffect(() => {
    if (token) {
      clearTimeout(t);
      clearInterval(l);
    }
  }, [token]);

  if (token) {
    return <Row>登录成功 LoginPage</Row>;
  }

  if (!storage) {
    return <Row>暂未获取有效数据 LoginPage</Row>;
  }

  const qrcodeJSX = (
    <Button type="link" onClick={updateQR} style={{ height: 'max-content' }}>
      <QRCodeSVG value={url} />
    </Button>
  );

  /** 是否要模糊化二维码 */
  const isBlurQR = isTimeout || scanner;

  return (
    <>
      <Row>请扫码登录 LoginPage</Row>
      <Row>
        <div style={isBlurQR ? { filter: 'blur(0.2em)' } : undefined}>
          {qrcodeJSX}
        </div>
      </Row>
      {isTimeout && <Row>二维码已过期, 请点击二维码进行刷新</Row>}
      {scanner && <Row>{scanner} 已扫码, 请在移动端确认登录</Row>}
    </>
  );
}
