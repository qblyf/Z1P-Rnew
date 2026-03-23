"use client";

import { useEffect, useMemo, useState } from 'react';
import constate from 'constate';

// 类型定义
interface Z1PUserJWTPayload {
  exp: number;
  name: string;
  [key: string]: any;
}

function isZ1PUserJWTPayload(payload: any): payload is Z1PUserJWTPayload {
  return payload && typeof payload.exp === 'number' && typeof payload.name === 'string';
}

/**
 * 获取 user JWT payload
 * @param p JWT 字符串
 * @returns 结构化的 payload
 */
export function getPayload(
  p: string
): [Z1PUserJWTPayload, null] | [null, Error] {
  // 服务端检查
  if (typeof window === 'undefined') {
    return [null, new Error('服务端环境下无法解析token')];
  }
  
  if (!p || typeof p !== 'string') {
    return [null, new Error('无效的 JWT 字符串')];
  }
  const str = p.split('.')[1];
  if (typeof str !== 'string') {
    return [null, new Error('不是有效 JWT')];
  }

  let res: unknown = null;
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    res = JSON.parse(window.atob(padded));
  } catch (err) {
    return [
      null,
      new Error('JWT 解析失败'),
    ];
  }
  if (!isZ1PUserJWTPayload(res)) {
    return [
      null,
      new Error('payload 结构无效'),
    ];
  }
  if (res.exp < Math.trunc(Date.now() / 1000)) {
    return [null, new Error(`已在 ${res.exp} 过期`)];
  }
  res.name = window.decodeURIComponent(res.name);
  return [res, null];
}

function getCacheToken(): [string, null] | [null, Error] {
  // 服务端检查
  if (typeof window === 'undefined') {
    return [null, new Error('服务端环境下无法访问localStorage')];
  }
  
  const cacheToken = window.localStorage.getItem('token');
  if (cacheToken === null) {
    return [null, new Error('没有从缓存中拿到数据')];
  }
  // 不检查 cacheToken 是否有效
  return [cacheToken, null];
}

/**
 * 设置缓存的 token
 * @param v token 字符串或 null（清除缓存）
 * 
 * Note: Token 有效性检查在 getPayload() 中进行
 */
export function setCacheToken(v: string | null): void {
  // 服务端检查
  if (typeof window === 'undefined') {
    console.warn('服务端环境下无法访问localStorage');
    return;
  }
  
  if (typeof v === 'string') {
    window.localStorage.setItem('token', v);
  } else {
    window.localStorage.removeItem('token');
  }
}

/**
 * [Hooks] 自动登录
 */
function useToken() {
  const [token, setToken] = useState<string | null>(undefined as any);
  const [errMsg, setErrMsg] = useState<string>();
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // 服务端检查
  if (typeof window === 'undefined') {
    return { token: null, errMsg: null, payload: null, isTokenExpired: false };
  }

  // 监听 localStorage 变化（来自其他标签页或同一页面的更新）
  useEffect(() => {
    const handleStorageChange = (e?: StorageEvent) => {
      console.log('Storage change detected, checking for token...', e);
      const [t] = getCacheToken();
      if (t) {
        const [_, err] = getPayload(t as string);
        if (err) {
          console.warn('Invalid token in cache:', err);
          setCacheToken(null);
          setToken(null);
          setIsTokenExpired(true);
        } else {
          console.log('Valid token found in cache after storage change');
          setToken(t as string);
          setIsTokenExpired(false);
        }
      } else {
        console.log('No token in cache after storage change');
        setToken(null);
      }
    };

    // 监听来自其他标签页的 storage 事件
    window.addEventListener('storage', handleStorageChange);
    // 监听自定义的 storage 事件（同一页面内的更新）
    window.addEventListener('storage', handleStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('useToken useEffect called');

    // 检查是否已经有缓存.
    const [t] = getCacheToken();
    if (t) {
      const [_, err] = getPayload(t as string);
      if (err) {
        // 清空缓存中的 token
        console.warn('Cached token is invalid:', err);
        setCacheToken(null);
        setIsTokenExpired(true);
      } else {
        console.log('Valid cached token found');
        setToken(t as string);
        setIsTokenExpired(false);
        return;
      }
    }

    // 动态导入钉钉相关模块
    import('dingtalk-jsapi/entry/union').then(() => {
      import('dingtalk-jsapi/api/runtime/permission/requestAuthCode').then(({ default: requestAuthCode }) => {
        import('dingtalk-jsapi/lib/env').then(({ getENV }) => {
          import('@zsqk/z1-sdk/es/z1p/auth').then(({ dingtalkLogin }) => {
            import('../constants').then(({ DINGDING_CORPID }) => {
              import('antd').then(({ message }) => {
                (async () => {
                  const env = getENV();
                  if (env.platform !== 'notInDingTalk') {
                    // 尝试钉钉自动登录
                    const { code } = await requestAuthCode({ corpId: DINGDING_CORPID });

                    const token = await dingtalkLogin(code);
                    setToken(token);
                    setIsTokenExpired(false);

                    const [payload] = getPayload(token);
                    if (payload) {
                      message.success(`欢迎你 ${payload.name}!`);
                    }
                  } else {
                    // 非钉钉环境，设置为null表示没有token，让页面跳转到登录页面
                    console.log('Not in DingTalk environment');
                    setErrMsg('环境限制, 无法进行自动登录');
                    setToken(null);
                  }
                })().catch(err => {
                  console.error('Auto login error:', err);
                  setErrMsg(`${err}`);
                  setToken(null);
                });
              });
            });
          });
        });
      });
    }).catch(err => {
      console.error('Failed to load DingTalk SDK:', err);
      setErrMsg('无法加载钉钉SDK');
      setToken(null);
    });
  }, []);

  // 根据 token 获取 payload
  const payload = useMemo(() => {
    if (!token) {
      return null;
    }
    const [p, err] = getPayload(token);
    // 校验过期时间, 如果过期则清空 token
    if (p === null) {
      console.warn(`getPayload 没有拿到有效数据`, err);
      setCacheToken(null);
      setErrMsg(`token 已经无效, ${err}`);
      setIsTokenExpired(true);
      return null;
    }
    return p;
  }, [token]);

  return { token, errMsg, payload, isTokenExpired };
}

export const [TokenProvider, useTokenContext] = constate(useToken);