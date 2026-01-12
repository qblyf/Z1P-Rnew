'use client';

import { useTokenContext } from '../../datahooks/auth';
import { usePermission } from '../../datahooks/permission';

export default function DebugPage() {
  const { token, errMsg } = useTokenContext();
  const { permission, errMsg: permissionErrMsg } = usePermission('product-manage');

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>调试页面</h1>
      <div>
        <h2>Token 状态</h2>
        <p>Token: {token ? token.substring(0, 50) + '...' : 'undefined'}</p>
        <p>Token Error: {errMsg || 'none'}</p>
      </div>
      <div>
        <h2>权限状态</h2>
        <p>Permission: {permission ? permission.substring(0, 50) + '...' : 'undefined'}</p>
        <p>Permission Error: {permissionErrMsg || 'none'}</p>
      </div>
      <div>
        <h2>环境变量</h2>
        <p>NEXT_PUBLIC_SKIP_LOGIN: {process.env.NEXT_PUBLIC_SKIP_LOGIN}</p>
        <p>NEXT_PUBLIC_MOCK_TOKEN: {process.env.NEXT_PUBLIC_MOCK_TOKEN?.substring(0, 50)}...</p>
      </div>
    </div>
  );
}
