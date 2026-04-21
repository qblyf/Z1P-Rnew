import { NextResponse } from 'next/server';

// 标记为动态路由
export const dynamic = 'force-dynamic';

// 直接定义 endpoint
const API_ENDPOINT = process.env.NEXT_PUBLIC_Z1P_ENDPOINT || 'https://p-api.z1.pub';

/**
 * POST /api/product/sync/single
 * 同步商品数据
 * 注意：同步API不需要Bearer token认证，后端通过其他方式（如cookie、内部网络等）进行认证
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 移除 tenantID（如果存在），API 不需要此参数
    const { tenantID, ...syncParams } = body;

    // 直接转发请求到后端，不添加 Authorization header
    // 后端通过其他机制进行认证
    const res = await fetch(`${API_ENDPOINT}/product/sync/single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncParams)
    });

    // 检查响应类型
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await res.text();
      console.error('❌ API返回非JSON响应:', text.substring(0, 500));
      return NextResponse.json(
        { success: false, error: `API返回了错误的响应格式: ${res.status} ${text.substring(0, 100)}` },
        { status: 400 }
      );
    }

    const data = await res.json();

    if (data.errMsg) {
      return NextResponse.json(
        { success: false, error: `backend code ${data.code}: ${data.errMsg}` },
        { status: 400 }
      );
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