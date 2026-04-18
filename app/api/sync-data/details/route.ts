import { NextResponse } from 'next/server';

// 标记为动态路由
export const dynamic = 'force-dynamic';

// 直接定义 endpoint
const API_ENDPOINT = process.env.NEXT_PUBLIC_Z1P_ENDPOINT || 'https://p-api.z1.pub';

/**
 * GET /api/sync-data/details
 * 同步数据详情
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const syncDataIDs = searchParams.get('syncDataIDs');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少认证令牌' },
        { status: 401 }
      );
    }

    if (!syncDataIDs) {
      return NextResponse.json(
        { success: false, error: '缺少 syncDataIDs 参数' },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_ENDPOINT}/sync-data/details?syncDataIDs=${encodeURIComponent(syncDataIDs)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
    console.error('❌ 获取同步数据详情失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取同步数据详情失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}