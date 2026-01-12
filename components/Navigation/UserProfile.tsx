'use client';

import { useState } from 'react';
import { LogOut, User, ChevronDown, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTokenContext } from '../../datahooks/auth';
import { setCacheToken } from '../../datahooks/auth';
import { detectDeviceType } from '../../utils/deviceDetect';

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { payload } = useTokenContext();

  const handleLogout = () => {
    setCacheToken(null);
    
    // 根据设备类型跳转到对应的登录页面
    const deviceType = detectDeviceType();
    const loginPage = deviceType === 'mobile' ? '/qr-login-mobile' : '/qr-login-desk';
    
    router.push(loginPage);
    
    // 刷新页面以清除所有状态
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const userName = payload?.name || '未认证用户';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {userInitial}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-slate-700">
          {userName}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-200">
            <p className="text-sm font-medium text-slate-800">{userName}</p>
            {payload?.phoneNum && (
              <p className="text-xs text-slate-500 mt-1">
                {payload.phoneNum.slice(-4)}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              // 可以添加个人设置页面
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <User size={16} />
            <span className="text-sm">个人设置</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              window.location.href = 'https://pre-p.z1.pub/';
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 transition-colors border-t border-slate-200 mt-2 pt-2"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">返回旧版</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors border-t border-slate-200 mt-2 pt-2"
          >
            <LogOut size={16} />
            <span className="text-sm">退出登录</span>
          </button>
        </div>
      )}
    </div>
  );
}
