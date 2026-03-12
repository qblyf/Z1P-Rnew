import { NextResponse } from 'next/server';

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
    const { getSysSettings } = await import('@zsqk/z1-sdk/es/z1p/sys-setting');
    const sysSettings = await getSysSettings({ auth: token });
    
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
