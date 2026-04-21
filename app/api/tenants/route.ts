import { NextResponse } from 'next/server';

// 标记为动态路由，因为需要读取 request.url
export const dynamic = 'force-dynamic';

// 直接定义 endpoint，确保在 Vercel 上也能正常工作
const API_ENDPOINT = process.env.NEXT_PUBLIC_Z1P_ENDPOINT || 'https://p-api.z1.pub';

/**
 * GET /api/tenants
 * 从 SDK getSysSettings API 获取所有账套配置信息
 * 
 * 必须提供有效的 token 参数
 * 
 * 查询参数：
 * - token: 认证令牌（必需）
 * - debug: 是否输出调试信息（可选，值为 "true" 时启用）
 * - raw: 是否返回原始 SDK 数据（可选，值为 "true" 时返回未处理的数据）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const debug = searchParams.get('debug') === 'true';
    const raw = searchParams.get('raw') === 'true';
    const test = searchParams.get('test') === 'true';
    
    // 测试模式：只返回基本信息，不调用 SDK
    if (test) {
      const endpoint = API_ENDPOINT;
      return NextResponse.json({
        success: true,
        test: true,
        data: {
          endpoint: endpoint,
          hasToken: !!token,
          tokenLength: token?.length || 0,
          envValue: process.env.NEXT_PUBLIC_Z1P_ENDPOINT,
          apiEndpoint: API_ENDPOINT
        }
      });
    }
    
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
    const endpoint = API_ENDPOINT;

    if (!endpoint) {
      return NextResponse.json(
        {
          success: false,
          error: '服务器配置错误',
          message: 'endpoint 配置为空，请检查环境变量 NEXT_PUBLIC_Z1P_ENDPOINT'
        },
        { status: 500 }
      );
    }

    if (debug) {
      console.log('  - token 前10位:', token.substring(0, 10) + '...');
    }

    // 在 API 路由中也需要初始化 SDK
    const { init } = await import('@zsqk/z1-sdk/es/z1p/util');
    init({ endpoint: endpoint });

    const { getSysSettings } = await import('@zsqk/z1-sdk/es/z1p/sys-setting');

    const sysSettings = await getSysSettings({
      auth: token
    });

    // 如果请求原始数据，直接返回
    if (raw) {
      return NextResponse.json({
        success: true,
        data: sysSettings,
        total: sysSettings.length,
        note: '这是未处理的原始 SDK 数据，用于调试'
      });
    }

    if (debug) {
      console.log('📋 账套详情:', JSON.stringify(sysSettings, null, 2));
    }
    
    // 直接使用 clientName 作为 tenantID
    const extractTenantID = (clientName: string): string => clientName;
    
    // 将 SDK 返回的数据转换为统一格式
    const tenants = sysSettings.map((setting) => {
      const tenantID = extractTenantID(setting.clientName);
      
      if (debug) {
        console.log(`  - ${setting.clientName} -> ${tenantID} (remarks: ${setting.remarks})`);
      }
      
      return {
        id: tenantID,
        name: setting.clientName,
        tenantID: tenantID,
        domain: `${tenantID}.example.com`,
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
      };
    });
    
    return NextResponse.json({
      success: true,
      data: tenants,
      total: tenants.length
    });
  } catch (error) {
    console.error('❌ 获取账套列表失败:', error);
    console.error('错误详情:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      {
        success: false,
        error: '获取账套列表失败',
        message: error instanceof Error ? error.message : '未知错误',
        details: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : undefined
      },
      { status: 500 }
    );
  }
}
