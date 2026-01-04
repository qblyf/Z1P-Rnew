'use client';

export default function TestEnvPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>环境变量测试</h1>
      <p>NEXT_PUBLIC_SKIP_LOGIN: {process.env.NEXT_PUBLIC_SKIP_LOGIN}</p>
      <p>NEXT_PUBLIC_MOCK_TOKEN: {process.env.NEXT_PUBLIC_MOCK_TOKEN?.substring(0, 50)}...</p>
    </div>
  );
}
