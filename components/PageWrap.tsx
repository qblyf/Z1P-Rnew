'use client';

import { ReactNode, useMemo, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PermissionContext, usePermission } from '../datahooks/permission';
import { PermissionPackages } from '@zsqk/z1-sdk/es/z1p/permission-types';
import { useTokenContext } from '../datahooks/auth';
import { detectDeviceType } from '../utils/deviceDetect';

/**
 * [组件] 页面包裹
 * @param props
 * @returns
 */
export default function PageWrap(props: {
  children: ReactNode;
  /** 权限包 key */
  ppKey: keyof PermissionPackages;
}) {
  const { children } = props;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | null>(null);

  // 获取权限
  const { token, errMsg } = useTokenContext();
  const { permission, errMsg: permissionErrMsg } =
    usePermission('product-manage');

  const redirect = useMemo(() => {
    if (!searchParams) {
      return pathname;
    }
    return `${pathname}?${searchParams.toString()}`;
  }, [searchParams, pathname]);

  // 初始化设备类型
  useEffect(() => {
    setDeviceType(detectDeviceType());
  }, []);

  // 获取对应的登录页面
  const getLoginPage = () => {
    if (deviceType === 'mobile') {
      return '/qr-login-mobile';
    }
    return '/qr-login-desk';
  };

  // 使用 useEffect 处理路由跳转，避免在渲染时调用 router.push
  useEffect(() => {
    if (!token) {
      // 如果没有 token 且设备类型已加载，立即跳转到登录页面
      if (!deviceType) {
        return;
      }
      const loginPage = getLoginPage();
      if (!redirect) {
        router.push(loginPage);
        return;
      }
      const p = new URLSearchParams({
        redirect,
      });
      router.push(`${loginPage}?${p}`);
    }
  }, [token, redirect, router, deviceType]);

  // 处理权限过期的路由跳转
  useEffect(() => {
    if (permission === null && permissionErrMsg.includes('jwt is expired')) {
      if (!deviceType) {
        return;
      }
      const loginPage = getLoginPage();
      const p = new URLSearchParams(redirect ? { redirect } : undefined);
      router.push(`${loginPage}?${p}`);
    }
  }, [permission, permissionErrMsg, redirect, router, deviceType]);

  if (!token) {
    return <>正在跳转到登录页面, 请稍等</>;
  }

  if (permission === undefined) {
    return <>正在加载权限</>;
  }
  if (permission === null) {
    if (permissionErrMsg.includes('jwt is expired')) {
      return <>登录超时, 需要重新登录.</>;
    }
    return <>没有获取到权限, {permissionErrMsg}</>;
  }

  return (
    <PermissionContext.Provider value={permission}>
      {children}
    </PermissionContext.Provider>
  );
}
