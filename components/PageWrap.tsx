'use client';

import { ReactNode, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PermissionContext, usePermission } from '../datahooks/permission';
import { PermissionPackages } from '@zsqk/z1-sdk/es/z1p/permission-types';
import { useTokenContext } from '../datahooks/auth';

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

  // 使用 useEffect 处理路由跳转，避免在渲染时调用 router.push
  useEffect(() => {
    if (!token) {
      if (!errMsg) {
        return;
      }
      if (!redirect) {
        router.push(`/qr-login-desk`);
        return;
      }
      const p = new URLSearchParams({
        redirect,
      });
      router.push(`/qr-login-desk?${p}`);
    }
  }, [token, errMsg, redirect, router]);

  // 处理权限过期的路由跳转
  useEffect(() => {
    if (permission === null && permissionErrMsg.includes('jwt is expired')) {
      const p = new URLSearchParams(redirect ? { redirect } : undefined);
      router.push(`/qr-login-desk?${p}`);
    }
  }, [permission, permissionErrMsg, redirect, router]);

  if (!token) {
    if (!errMsg) {
      return <>正在登录, 请稍等</>;
    }
    return <>正在跳转, 请稍等</>;
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
