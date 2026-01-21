'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Spin, Card } from 'antd';
import { RefreshCw, Smartphone } from 'lucide-react';

import {
  getPayload,
  setCacheToken,
  useTokenContext,
} from '../../datahooks/auth';
import { HOST_URL } from '../../constants';
import { airLoginCheck } from '@zsqk/z1-sdk/es/z1p/auth';

// 创建自定义事件来通知token更新
const TOKEN_UPDATE_EVENT = 'tokenUpdated';

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

  // 是否显示非钉钉扫码提示
  const [showDingtalkWarning, setShowDingtalkWarning] = useState(false);

  // 前端生成的扫码地址
  const url = useMemo(() => {
    const baseUrl = HOST_URL.endsWith('/') ? HOST_URL.slice(0, -1) : HOST_URL;
    const url = `${baseUrl}/qr-login-mobile?storage=${storage}`;
    console.log('移动端登录 url', url);
    return url;
  }, [storage]);

  useEffect(() => {
    if (typeof token !== 'string') {
      return;
    }
    const [_, err] = getPayload(token);
    if (err === null) {
      // 登录成功，立即跳转到首页
      console.log('Desktop login successful, redirecting to home');
      // 使用 push 而不是 replace，确保跳转能够执行
      router.push('/');
    }
  }, [router, token]);

  const updateQR = () => {
    // 重置超时
    clearTimeout(t);
    clearInterval(l);
    setIsTimeout(false);
    setScanner(undefined);
    setShowDingtalkWarning(false);

    // 生成新的 uuid 及超时
    const uuid = crypto.randomUUID();
    setStorage(uuid);
    console.log('Generated QR UUID:', uuid);
    
    // 记录扫码时间，用于判断是否超时未登录
    let scannedTime: number | null = null;
    
    l = window.setInterval(async () => {
      try {
        // 检查 storage 数据
        const res = await airLoginCheck(uuid);
        console.log('airLoginCheck result:', res);
        
        if (res && res.state === 'confirmed') {
          console.log('Login confirmed, token received:', res.payload?.token ? 'yes' : 'no');
          // 如果找到 storage 的值, 则写入到 local 中
          if (res.payload && res.payload.token) {
            setCacheToken(res.payload.token);
            console.log('Token saved to localStorage');
            // 刷新页面以重新初始化 token context
            window.location.reload();
          } else {
            console.error('No token in confirmed response:', res.payload);
          }
          window.clearInterval(l);
          setShowDingtalkWarning(false);
        } else if (res && res.state === 'scanned') {
          console.log('QR scanned by:', res.payload?.scanner);
          setScanner(res.payload?.scanner);
          
          // 记录扫码时间
          if (scannedTime === null) {
            scannedTime = Date.now();
          }
          
          // 如果扫码后5秒还没有登录成功，显示钉钉提示
          if (Date.now() - scannedTime > 5000) {
            setShowDingtalkWarning(true);
          }
        }
      } catch (err) {
        console.error('Error checking login status:', err);
      }
    }, 1000);
    
    t = window.setTimeout(() => {
      window.clearInterval(l);
      console.log('QR code expired');
      setIsTimeout(true);
      setShowDingtalkWarning(false);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <Spin size="large" />
          <p className="mt-4 text-slate-600">登录成功，正在跳转...</p>
        </Card>
      </div>
    );
  }

  if (!storage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <Spin size="large" />
          <p className="mt-4 text-slate-600">正在加载二维码...</p>
        </Card>
      </div>
    );
  }

  const qrcodeJSX = (
    <button
      onClick={updateQR}
      className="inline-block p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
    >
      <QRCodeSVG value={url} size={256} level="H" includeMargin={true} />
    </button>
  );

  /** 是否要模糊化二维码 */
  const isBlurQR = isTimeout || scanner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full mb-4">
            <span className="text-white font-bold text-2xl">Z1</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Z1 平台</h1>
          <p className="text-slate-600">数据管理系统</p>
        </div>

        {/* 主卡片 */}
        <Card className="shadow-xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Smartphone size={20} className="text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-800">扫码登录</h2>
            </div>

            <p className="text-slate-600 text-sm mb-6">
              使用手机扫描下方二维码进行登录
            </p>

            {/* 二维码容器 */}
            <div className="flex justify-center mb-6">
              <div
                className={`transition-all duration-300 ${
                  isBlurQR ? 'blur-sm opacity-50' : ''
                }`}
              >
                {qrcodeJSX}
              </div>
            </div>

            {/* 状态提示 */}
            {isTimeout && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 text-sm font-medium mb-3">
                  二维码已过期
                </p>
                <button
                  onClick={updateQR}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
                >
                  <RefreshCw size={16} />
                  刷新二维码
                </button>
              </div>
            )}

            {scanner && !isTimeout && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse mr-2"></div>
                  <p className="text-emerald-800 text-sm font-medium">
                    {scanner} 已扫码
                  </p>
                </div>
                <p className="text-emerald-700 text-xs">
                  请在移动设备上确认登录
                </p>
              </div>
            )}

            {showDingtalkWarning && !isTimeout && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 text-sm font-medium mb-2">
                  ⚠️ 登录提示
                </p>
                <p className="text-amber-700 text-xs">
                  请使用钉钉扫码登录。如果您使用的是其他应用（如微信、浏览器等），请切换到钉钉应用进行扫码。
                </p>
              </div>
            )}

            {!isTimeout && !scanner && (
              <div className="text-slate-500 text-sm">
                <p>等待扫码中...</p>
              </div>
            )}
          </div>
        </Card>

        {/* 底部提示 */}
        <div className="text-center mt-6 text-slate-600 text-sm">
          <p>首次登录？请使用手机应用扫码</p>
        </div>
      </div>
    </div>
  );
}
