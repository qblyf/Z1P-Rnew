import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 测试 API 路由 - 验证基本功能
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    // 测试 1: 基本响应
    if (!token) {
      return NextResponse.json({
        success: false,
        test: 'basic',
        message: '缺少 token 参数'
      });
    }
    
    // 测试 2: 环境变量
    const endpoint = process.env.NEXT_PUBLIC_Z1P_ENDPOINT || 'https://p-api.z1.pub';
    
    return NextResponse.json({
      success: true,
      test: 'environment',
      data: {
        endpoint: endpoint,
        hasEndpoint: !!endpoint,
        endpointLength: endpoint?.length,
        envValue: process.env.NEXT_PUBLIC_Z1P_ENDPOINT,
        tokenLength: token.length
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
