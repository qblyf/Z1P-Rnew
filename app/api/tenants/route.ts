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
    
    console.log('🔍 API 路由调试信息:');
    console.log('  - process.env.NEXT_PUBLIC_Z1P_ENDPOINT:', process.env.NEXT_PUBLIC_Z1P_ENDPOINT);
    console.log('  - API_ENDPOINT 值:', API_ENDPOINT);
    console.log('  - endpoint 最终值:', endpoint);
    console.log('  - endpoint 类型:', typeof endpoint);
    console.log('  - endpoint 长度:', endpoint?.length);
    
    if (!endpoint) {
      console.error('❌ endpoint 为空');
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
    
    const { getSysSettings } = await import('@zsqk/z1-sdk/es/z1p/sys-setting');
    
    console.log('📡 准备调用 getSysSettings...');
    console.log('  - 传递的 endpoint:', endpoint);
    const sysSettings = await getSysSettings({ 
      auth: token,
      // @ts-ignore - SDK 类型定义可能不完整，但运行时需要 endpoint
      endpoint: endpoint
    });
    
    console.log('✅ SDK 调用成功，返回数据数量:', sysSettings.length);
    
    // 如果请求原始数据，直接返回
    if (raw) {
      console.log('📋 返回原始 SDK 数据');
      return NextResponse.json({
        success: true,
        data: sysSettings,
        total: sysSettings.length,
        note: '这是未处理的原始 SDK 数据，用于调试'
      });
    }
    
    console.log(`✅ 成功从 SDK 获取 ${sysSettings.length} 个账套`);
    
    if (debug) {
      console.log('📋 账套详情:', JSON.stringify(sysSettings, null, 2));
    }
    
    /**
     * 从 remarks 中提取 tenantID
     * 支持多种格式：
     * - "tenantID: newgy"
     * - "tenantID:newgy"
     * - "账套ID: newgy"
     * - "ID: newgy"
     */
    function extractTenantID(remarks: string, clientName: string): string {
      if (!remarks) {
        // 如果没有 remarks，使用 clientName 生成
        return clientName.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
      
      // 尝试多种模式匹配
      const patterns = [
        /tenantID[:\s]+([a-z0-9-]+)/i,
        /账套ID[:\s]+([a-z0-9-]+)/i,
        /ID[:\s]+([a-z0-9-]+)/i,
        /^([a-z0-9-]+)$/i, // 如果整个 remarks 就是 tenantID
      ];
      
      for (const pattern of patterns) {
        const match = remarks.match(pattern);
        if (match && match[1]) {
          return match[1].toLowerCase();
        }
      }
      
      // 如果都匹配不到，使用 clientName 生成
      console.warn(`⚠️ 无法从 remarks 提取 tenantID: "${remarks}"，使用 clientName 生成`);
      return clientName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }
    
    // 将 SDK 返回的数据转换为统一格式
    const tenants = sysSettings.map((setting) => {
      const tenantID = extractTenantID(setting.remarks, setting.clientName);
      
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
