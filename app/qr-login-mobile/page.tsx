'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useTokenContext } from '../../datahooks/auth';
import { Button, Card, Spin, Alert } from 'antd';
import { airLoginConfirm, airLoginScan } from '@zsqk/z1-sdk/es/z1p/auth';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { parserUA } from '@zsqk/somefn/js/ua';
import { CheckCircle, AlertCircle, Smartphone } from 'lucide-react';

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
  const router = useRouter();
  const { token, errMsg } = useTokenContext();

  const searchParams = useSearchParams();
  const storage = useMemo(() => searchParams?.get('storage'), [searchParams]);
  const [status, setStatus] = useState<'等待确认' | '正在登录中' | '登录已完成' | string>('等待确认');
  const [isLoading, setIsLoading] = useState(false);
  const [isDingTalk, setIsDingTalk] = useState(true);

  // 检测是否为钉钉扫码
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isDingTalkApp = userAgent.includes('dingtalk');
    setIsDingTalk(isDingTalkApp);
    
    if (!isDingTalkApp) {
      console.warn('非钉钉扫码访问');
    }
  }, []);

  useEffect(() => {
    if (typeof storage !== 'string') {
      return;
    }
    const ua = parserUA(window.navigator.userAgent);
    airLoginScan(storage, { scanner: `${ua.os} ${ua.softwareName}` });
  }, [storage]);

  // 移动端登录成功后不跳转，保持在当前页面显示成功提示

  // 未登录时跳转到桌面端 QR 登录页面
  useEffect(() => {
    if (token === null) {
      router.push('/qr-login-desk');
    }
  }, [token, router]);

  // 抛错, 不是有效的参数
  if (typeof storage !== 'string') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">参数错误</h2>
          <p className="text-slate-600">请等待参数传入，或当前参数无效</p>
        </Card>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">登录失败</h2>
          <p className="text-slate-600 text-sm">{errMsg}</p>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <Spin size="large" />
          <p className="mt-4 text-slate-600">正在获取登录信息...</p>
        </Card>
      </div>
    );
  }

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
          {/* 钉钉扫码提示 */}
          {!isDingTalk && (
            <Alert
              message="请使用钉钉扫码"
              description="检测到您未使用钉钉扫码，请使用钉钉应用扫描二维码进行登录"
              type="warning"
              showIcon
              className="mb-4"
            />
          )}

          <div className="text-center">
            {status === '等待确认' && (
              <>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Smartphone size={20} className="text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-800">确认登录</h2>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
                  <p className="text-slate-700 text-sm mb-4">
                    您在桌面设备上扫描了二维码，请在此确认登录
                  </p>
                  <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">等待您的确认</span>
                  </div>
                </div>

                <Button
                  type="primary"
                  size="large"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-0 h-12 text-base font-medium"
                  onClick={async () => {
                    setStatus('正在登录中');
                    setIsLoading(true);

                    try {
                      // 登录已完成, 将 token 写入 storage
                      await airLoginConfirm(storage, { token });
                      setStatus('登录已完成');
                    } catch (err) {
                      setStatus(`登录失败: ${err}`);
                      setIsLoading(false);
                    }
                  }}
                  loading={isLoading}
                  disabled={!isDingTalk}
                >
                  {isDingTalk ? '确认登录' : '请使用钉钉扫码'}
                </Button>
              </>
            )}

            {status === '正在登录中' && (
              <>
                <Spin size="large" />
                <p className="mt-4 text-slate-600 font-medium">正在登录中，请稍等...</p>
              </>
            )}

            {status === '登录已完成' && (
              <>
                <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
                <h2 className="text-lg font-bold text-slate-800 mb-2">登录成功</h2>
                <p className="text-slate-600 text-sm mb-6">您已成功登录，桌面端将自动跳转</p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-emerald-700 text-sm">
                    请返回桌面设备查看登录结果
                  </p>
                </div>
              </>
            )}

            {status !== '等待确认' && status !== '正在登录中' && status !== '登录已完成' && (
              <>
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-lg font-bold text-slate-800 mb-2">出错了</h2>
                <p className="text-slate-600 text-sm">{status}</p>
              </>
            )}
          </div>
        </Card>

        {/* 底部提示 */}
        <div className="text-center mt-6 text-slate-600 text-sm">
          <p>请勿关闭此页面</p>
        </div>
      </div>
    </div>
  );
}
