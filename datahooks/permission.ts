'use client';

import { permissionApply } from '@zsqk/z1-sdk/es/z1p/permission';
import { PermissionPackages } from '@zsqk/z1-sdk/es/z1p/permission-types';
import { createContext, useEffect, useState } from 'react';
import { useTokenContext } from './auth';

let cache: Partial<Record<keyof PermissionPackages, string>> = {};

/**
 * 解析 JWT payload, 但不校验
 * @param str JWT string
 * @returns
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
function getJWTPayload(
  str: string
): [Record<string, unknown>, null] | [null, Error] {
  const [_h, p] = str.split('.');
  if (typeof p === 'string') {
    try {
      return [JSON.parse(window.atob(p)), null];
    } catch (err) {
      if (err instanceof Error) {
        return [null, err];
      }
      return [null, new Error(`jwt 解析失败: ${err}`)];
    }
  }
  return [null, new Error(`无效的 jwt`)];
}

function getPermissionFromCache(
  key: keyof PermissionPackages
): string | undefined {
  const val = cache[key];
  if (typeof val === 'string') {
    // 解析 JWT payload
    const [p] = getJWTPayload(val);
    if (p === null) {
      // 如果为异常数据, 则清空该缓存
      cache[key] = undefined;
      return undefined;
    }
    // 检查有效期, 如果在有效期内, 则返回缓存
    if (Number(p.exp) > Math.trunc(Date.now() / 1000)) {
      return val;
    }
    // 如果不在有效期内, 则清空该缓存
    cache[key] = undefined;
  }
  return undefined;
}

/**
 * [Hooks] 使用权限包
 * @param key 权限包定位符
 * @returns
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function usePermission(key: keyof PermissionPackages) {
  const [permission, setPermission] = useState<null | string>();
  const [errMsg, setErrMsg] = useState('loading');
  const { token, errMsg: tokenErrMsg } = useTokenContext();
  useEffect(() => {
    if (!token && !tokenErrMsg) {
      // 等待 token 加载
      return;
    }
    if (!token) {
      setErrMsg('因没有有效 token 所以无法获取权限: ' + tokenErrMsg);
      setPermission(null);
      // 如果识别到 token 失效, 则置空所有权限
      cache = {};
      return;
    }

    // ✅ 开发模式：使用 Mock 权限
    if (process.env.NEXT_PUBLIC_SKIP_LOGIN === 'true') {
      // 创建一个 Mock 权限 JWT
      const mockPermissionJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJUZXN0IFVzZXIiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTY3MTQ3NDgwMH0.xxx';
      setErrMsg('');
      setPermission(mockPermissionJWT);
      console.log('✅ 开发模式：使用 Mock 权限');
      return;
    }

    const fn = async () => {
      const p: string =
        getPermissionFromCache(key) ??
        (await permissionApply(key, token).then(v => {
          cache[key] = v;
          return v;
        }));
      setErrMsg('');
      setPermission(p);
    };
    fn().catch((err: Error) => {
      setErrMsg(`获取权限包失败: ${err.message}`);
      setPermission(null);
    });
  }, [token, key, tokenErrMsg]);
  return { permission, errMsg };
}

export const PermissionContext = createContext('');
