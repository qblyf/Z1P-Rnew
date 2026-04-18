import { NextResponse } from 'next/server';

// 标记为动态路由
export const dynamic = 'force-dynamic';

// 直接定义 endpoint
const API_ENDPOINT = process.env.NEXT_PUBLIC_Z1P_ENDPOINT || 'https://p-api.z1.pub';

/**
 * POST /api/product/sync/single
 * 同步商品数据
 * 注意：不需要 tenantID 参数，API会根据认证信息自动同步到对应账套
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少认证令牌' },
        { status: 401 }
      );
    }

    // 移除 tenantID（如果存在），API 不需要此参数
    const { tenantID, ...syncParams } = body;

    const res = await fetch(`${API_ENDPOINT}/product/sync/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncParams)
    });

    const data = await res.json();

    if (data.errMsg) {
      throw new Error(`backend code ${data.code}: ${data.errMsg}`);
    }

    return NextResponse.json({
      success: true,
      data: data.res || data
    });
  } catch (error) {
    console.error('❌ 同步数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '同步数据失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}