import { NextResponse } from 'next/server';

// 标记为动态路由，因为需要读取 request.url
export const dynamic = 'force-dynamic';

// 在 API 路由中直接获取 endpoint
// Next.js API 路由运行在服务端，NEXT_PUBLIC_ 变量可能不可用
const getEndpoint = () => {
  return process.env.NEXT_PUBLIC_Z1P_ENDPOINT || 'https://p-api.z1.pub';
};

/**
 * GET /api/tenants
 * 从 SDK getSysSettings API 获取所有账套配置信息
 * 
 * 必须提供有效的 token 参数
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const debug = searchParams.get('debug') === 'true';
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少认证令牌',
          message: '请先登录系统'
        },
        { status: 401 }
      );
    }
    
    // 从 SDK 获取所有账套信息
    const endpoint = getEndpoint();
    
    if (debug) {
      console.log('🔍 API 路由环境检查:');
      console.log('  - 使用的 endpoint:', endpoint);
    }
    
    const { getSysSettings } = await import('@zsqk/z1-sdk/es/z1p/sys-setting');
    const sysSettings = await getSysSettings({ 
      auth: token,
      // @ts-ignore - SDK 类型定义可能不完整，但运行时需要 endpoint
      endpoint: endpoint
    });
    
    console.log(`✅ 成功从 SDK 获取 ${sysSettings.length} 个账套`);
    
    if (debug) {
      console.log('账套详情:', JSON.stringify(sysSettings, null, 2));
    }
    
    // 将 SDK 返回的数据转换为统一格式
    const tenants = sysSettings.map((setting) => ({
      id: setting.clientName.toLowerCase().replace(/\s+/g, ''),
      name: setting.clientName,
      domain: `${setting.clientName.toLowerCase()}.example.com`,
      state: 'valid' as const,
      remarks: setting.remarks || '',
      lastSyncAt: 0,
      // 维护时间信息
      maintenanceInfo: {
        routineStart: setting.value.find(v => v.name === '例行维护时间')?.startTime,
        routineEnd: setting.value.find(v => v.name === '例行维护时间')?.endTime,
        specialStart: setting.value.find(v => v.name === '特殊维护时间')?.startTime,
        specialEnd: setting.value.find(v => v.name === '特殊维护时间')?.endTime,
      }
    }));
    
    return NextResponse.json({
      success: true,
      data: tenants,
      total: tenants.length
    });
  } catch (error) {
    console.error('获取账套列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取账套列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
