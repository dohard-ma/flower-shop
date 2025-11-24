import { NextRequest, NextResponse } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('X-Trace-ID')!;
  try {
    const response = NextResponse.json(
      ApiResponseBuilder.success(traceId, { message: '登出成功' })
    );

    // 清除 session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // 立即过期
      path: '/',
      sameSite: 'strict'
    });

    return response
  } catch (error) {
    console.error('[LOGOUT_API_ERROR]', error);
    return NextResponse.json(
      ApiResponseBuilder.error(traceId, '登出时发生内部错误', 500)
    );
  }
}
