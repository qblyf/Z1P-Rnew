"use client"

import 'dingtalk-jsapi/entry/union';
import requestAuthCode from 'dingtalk-jsapi/api/runtime/permission/requestAuthCode';
import { getENV } from 'dingtalk-jsapi/lib/env';
import { useEffect, useMemo, useState } from 'react';
import { dingtalkLogin } from '@zsqk/z1-sdk/es/z1p/auth';
import { message } from 'antd';
import constate from 'constate';
import { DINGDING_CORPID } from '../constants';
import {
  isZ1PUserJWTPayload,
  Z1PUserJWTPayload,
} from '@zsqk/z1-sdk/es/z1p/auth-types';

/**
 * 获取 user JWT payload
 * @param p JWT 字符串
 * @returns 结构化的 payload
 */
export function getPayload(
  p: string
): [Z1PUserJWTPayload, null] | [null, Error] {
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
  const cacheToken = window.localStorage.getItem('token');
  if (cacheToken === null) {
    return [null, new Error('没有从缓存中拿到数据')];
  }
  // 不检查 cacheToken 是否有效
  return [cacheToken, null];
}

export function setCacheToken(v: string | null): void {
  // TODO: 支持可选参 检查 cacheToken 是否有效
  // TODO: 如果检查发现 cacheToken 无效则置空缓存
  if (typeof v === 'string') {
    window.localStorage.setItem('token', v);
  } else {
    window.localStorage.removeItem('token');
  }
}

/**
 * [Hooks] 自动登录
 *
 * 1. 如果在钉钉中, 则调用钉钉登录.
 * 2. 如果在企业微信中, 则调用企业微信登录.
 * 3. 如果在飞书中, 则调用飞书登录.
 */
function useToken() {
  const [token, setToken] = useState<string | null>(undefined as any);
  const [errMsg, setErrMsg] = useState<string>();

  // 监听 localStorage 变化（来自其他标签页或同一页面的更新）
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('Storage change detected, checking for token...');
      const [t] = getCacheToken();
      if (t) {
        const [_, err] = getPayload(t as string);
        if (err) {
          console.warn('Invalid token in cache:', err);
          setCacheToken(null);
          setToken(null);
        } else {
          console.log('Valid token found in cache after storage change');
          setToken(t as string);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
      } else {
        console.log('Valid cached token found');
        setToken(t as string);
        return;
      }
    }

    (async () => {
      const env = getENV();
      if (env.platform !== 'notInDingTalk') {
        // 尝试钉钉自动登录
        const { code } = await requestAuthCode({ corpId: DINGDING_CORPID });

        const token = await dingtalkLogin(code);
        setToken(token);

        // TODO: 如果自动登录失败则返回相关错误.

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
      return null;
    }
    return p;
  }, [token]);

  return { token, errMsg, payload };
}

export const [TokenProvider, useTokenContext] = constate(useToken);
