'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { Button, Card, Form, Input, message, Space, Spin } from 'antd';
import { setCacheToken, getPayload } from '../../datahooks/auth';

/**
 * [页面] Token 登录
 *
 * 接受外部 token 参数，验证并保存到本地存储
 *
 * Query 参数:
 * - `token`: JWT token 字符串
 * - `redirect`: 登录成功后的重定向 URL（可选）
 *
 * 使用示例:
 * /token-login?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&redirect=/product-manage
 *
 * @author Kiro
 */
export default function TokenLoginPage() {
  return (
    <Suspense fallback={<TokenLoginLoadingPage />}>
      <TokenLoginContent />
    </Suspense>
  );
}

function TokenLoginLoadingPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>加载中...</p>
      </Card>
    </div>
  );
}

function TokenLoginContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get('token'), [searchParams]);
  const redirect = useMemo(() => searchParams?.get('redirect') || '/', [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [manualToken, setManualToken] = useState('');
  const [isValidated, setIsValidated] = useState(false);

  // 如果 URL 中有 token 参数，自动验证
  useEffect(() => {
    if (token) {
      handleTokenSubmit(token);
    }
  }, [token]);

  const handleTokenSubmit = (tokenValue: string) => {
    setLoading(true);
    setError(undefined);

    try {
      // 验证 token 格式和有效期
      const [payload, err] = getPayload(tokenValue);

      if (err) {
        setError(`Token 验证失败: ${err.message}`);
        setLoading(false);
        return;
      }

      if (!payload) {
        setError('Token 无效或已过期');
        setLoading(false);
        return;
      }

      // Token 有效，保存到本地存储
      setCacheToken(tokenValue);
      setIsValidated(true);
      message.success(`登录成功，欢迎 ${payload.name}!`);

      // 延迟重定向，让用户看到成功消息
      setTimeout(() => {
        window.location.href = redirect;
      }, 1000);
    } catch (err) {
      setError(`发生错误: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualToken.trim()) {
      setError('请输入 Token');
      return;
    }
    handleTokenSubmit(manualToken.trim());
  };

  if (isValidated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card style={{ width: 400, textAlign: 'center' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>登录成功，正在跳转...</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Card style={{ width: 400 }} title="Token 登录">
        <Form layout="vertical">
          <Form.Item label="Token">
            <Input.TextArea
              placeholder="粘贴您的 JWT Token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              rows={6}
              disabled={loading}
            />
          </Form.Item>

          {error && (
            <Form.Item>
              <div style={{ color: '#ff4d4f', padding: '8px 12px', backgroundColor: '#fff1f0', borderRadius: '4px' }}>
                {error}
              </div>
            </Form.Item>
          )}

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                loading={loading}
                onClick={handleManualSubmit}
                style={{ width: 120 }}
              >
                登录
              </Button>
              <Button
                onClick={() => {
                  setManualToken('');
                  setError(undefined);
                }}
                disabled={loading}
              >
                清空
              </Button>
            </Space>
          </Form.Item>

          <Form.Item>
            <div style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
              <p>使用 URL 参数快速登录:</p>
              <code style={{ display: 'block', wordBreak: 'break-all', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                /token-login?token=YOUR_TOKEN
              </code>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
