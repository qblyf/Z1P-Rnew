'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useTokenContext } from '../../datahooks/auth';
import { Button, Card, Spin } from 'antd';
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
  const { token: contextToken, errMsg } = useTokenContext();

  const searchParams = useSearchParams();
  const storage = useMemo(() => searchParams?.get('storage'), [searchParams]);
  const [status, setStatus] = useState<'等待确认' | '正在登录中' | '登录已完成' | '登录失败' | string>('等待确认');
  const [isLoading, setIsLoading] = useState(false);
  const [showDingtalkWarning, setShowDingtalkWarning] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof storage !== 'string') {
      return;
    }
    const ua = parserUA(window.navigator.userAgent);
    airLoginScan(storage, { scanner: `${ua.os} ${ua.softwareName}` });
    
    // 检查是否在钉钉环境中
    const isDingtalk = ua.softwareName?.toLowerCase().includes('dingtalk') || 
                       ua.softwareName?.toLowerCase().includes('钉钉');
    
    if (!isDingtalk) {
      // 如果不是钉钉环境，显示警告
      setShowDingtalkWarning(true);
    }
  }, [storage]);

  // 当有 storage 参数时（扫码进来），使用 contextToken；否则等待自动登录
  useEffect(() => {
    if (typeof storage === 'string') {
      // 扫码进来的情况：等待钉钉自动登录完成
      if (contextToken !== undefined) {
        // contextToken 已经初始化完成（可能是 null 或有效 token）
        if (contextToken) {
          setToken(contextToken);
        }
        setIsInitialized(true);
      }
      // 如果 contextToken 还是 undefined，继续等待
    } else {
      // 没有 storage 参数的情况：等待自动登录
      if (contextToken === null) {
        // 自动登录失败，跳转到PC端登录页面
        router.push('/qr-login-desk');
      } else if (contextToken) {
        // 自动登录成功
        setToken(contextToken);
      }
      setIsInitialized(true);
    }
  }, [contextToken, storage, router]);

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

  // 如果有 storage 参数（扫码进来的），检查是否是钉钉环境
  if (errMsg && storage && isInitialized && !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">需要钉钉登录</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-800 text-sm font-medium mb-2">
              ⚠️ 重要提示
            </p>
            <p className="text-amber-700 text-xs mb-2">
              本系统仅支持钉钉登录。请使用钉钉应用扫描二维码。
            </p>
            <p className="text-amber-700 text-xs">
              如果您使用的是微信、浏览器等其他应用扫码，将无法完成登录。
            </p>
          </div>
          <p className="text-slate-500 text-xs mt-4">错误信息: {errMsg}</p>
        </Card>
      </div>
    );
  }
  
  // 如果没有 storage 参数且有错误，显示错误
  if (errMsg && !storage) {
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

  // 等待初始化完成
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <Spin size="large" />
          <p className="mt-4 text-slate-600">正在初始化...</p>
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
                  className="w-full h-12 text-base font-medium"
                  style={{ 
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#047857';
                    e.currentTarget.style.borderColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                    e.currentTarget.style.borderColor = '#059669';
                  }}
                  onClick={async () => {
                    setStatus('正在登录中');
                    setIsLoading(true);

                    // 自动重试机制：最多重试 3 次
                    const maxRetries = 3;
                    let lastError: any = null;

                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                      try {
                        console.log(`Login attempt ${attempt}/${maxRetries}`);
                        // 登录已完成, 将 token 写入 storage
                        await airLoginConfirm(storage, { token });
                        setStatus('登录已完成');
                        setShowDingtalkWarning(false);
                        return; // 成功后直接返回
                      } catch (err: any) {
                        lastError = err;
                        console.error(`Login attempt ${attempt} failed:`, err);
                        
                        // 如果是 session 错误且还有重试次数，等待后重试
                        if (attempt < maxRetries && 
                            (err?.message?.includes('session') || 
                             err?.message?.includes('5001') ||
                             err?.message?.includes('ConnectionError'))) {
                          console.log(`Retrying in ${attempt} second(s)...`);
                          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                          continue;
                        }
                        
                        // 其他错误或已达最大重试次数，直接失败
                        break;
                      }
                    }

                    // 所有重试都失败
                    setStatus('登录失败');
                    setIsLoading(false);
                    console.error('All login attempts failed:', lastError);
                  }}
                  loading={isLoading}
                  disabled={!token}
                >
                  确认登录
                </Button>

                {showDingtalkWarning && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm font-medium mb-2">
                      ⚠️ 重要提示
                    </p>
                    <p className="text-amber-700 text-xs">
                      检测到您可能不是使用钉钉扫码。本系统仅支持钉钉登录，请使用钉钉应用扫描二维码。
                    </p>
                  </div>
                )}
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
                <Button
                  type="primary"
                  size="large"
                  className="w-full h-12 text-base font-medium"
                  style={{ 
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#047857';
                    e.currentTarget.style.borderColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                    e.currentTarget.style.borderColor = '#059669';
                  }}
                  onClick={() => {
                    router.push('/');
                  }}
                >
                  点击进入手机版
                </Button>
              </>
            )}

            {status !== '等待确认' && status !== '正在登录中' && status !== '登录已完成' && status !== '登录失败' && (
              <>
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-lg font-bold text-slate-800 mb-2">出错了</h2>
                <p className="text-slate-600 text-sm">{status}</p>
              </>
            )}

            {status === '登录失败' && (
              <>
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-lg font-bold text-slate-800 mb-2">登录失败</h2>
                <p className="text-slate-600 text-sm mb-4">登录过程中出现错误</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm font-medium mb-2">
                    ⚠️ 请检查
                  </p>
                  <p className="text-amber-700 text-xs">
                    请确保您使用的是钉钉应用扫码。如果使用其他应用（如微信、浏览器等）扫码，将无法完成登录。
                  </p>
                </div>
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
