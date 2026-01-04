'use client';

import { useEffect, useState } from 'react';

export default function SimpleTestPage() {
  const [localStorageToken, setLocalStorageToken] = useState<string | null>(null);
  const [envSkipLogin, setEnvSkipLogin] = useState<string | undefined>();
  const [envMockToken, setEnvMockToken] = useState<string | undefined>();

  useEffect(() => {
    // 检查 localStorage
    const token = localStorage.getItem('token');
    setLocalStorageToken(token);

    // 检查环境变量
    setEnvSkipLogin(process.env.NEXT_PUBLIC_SKIP_LOGIN);
    setEnvMockToken(process.env.NEXT_PUBLIC_MOCK_TOKEN);

    console.log('localStorage token:', token);
    console.log('NEXT_PUBLIC_SKIP_LOGIN:', process.env.NEXT_PUBLIC_SKIP_LOGIN);
    console.log('NEXT_PUBLIC_MOCK_TOKEN:', process.env.NEXT_PUBLIC_MOCK_TOKEN?.substring(0, 50));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>简单测试页面</h1>
      <div>
        <h2>localStorage</h2>
        <p>Token: {localStorageToken ? localStorageToken.substring(0, 50) + '...' : 'null'}</p>
      </div>
      <div>
        <h2>环境变量</h2>
        <p>NEXT_PUBLIC_SKIP_LOGIN: {envSkipLogin}</p>
        <p>NEXT_PUBLIC_MOCK_TOKEN: {envMockToken?.substring(0, 50)}...</p>
      </div>
      <div>
        <h2>操作</h2>
        <button onClick={() => {
          const mockToken = process.env.NEXT_PUBLIC_MOCK_TOKEN;
          if (mockToken) {
            localStorage.setItem('token', mockToken);
            window.location.href = '/';
          }
        }}>
          设置 Mock Token 并跳转到首页
        </button>
      </div>
    </div>
  );
}
