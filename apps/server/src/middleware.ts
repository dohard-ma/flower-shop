import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './lib/auth/types';
import { getVerifiedToken } from './lib/auth/jwt';
import { ApiResponseBuilder } from './lib/api-response';
import { Logger } from './lib/logger';

// 角色对应的路径前缀
const ROLE_PATHS = {
  [UserRole.ADMIN]: ['/api/admin'],
  [UserRole.USER]: ['/api/wx'],
  [UserRole.GUEST]: ['/api/public']
} as const;

function generateTraceId(pathname: string): string {
  const path = pathname.replace(/^\//, '').replace(/\//g, '.')
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).slice(-3)
  return `${path}.${timestamp}${random}`
}

// 获取路径对应的角色和要求
function getRouteConfig(path: string) {
  // 1. 真正的全局公开接口 (无需 appId, 无需登录)
  if (path.startsWith('/api/public')) {
    return { role: UserRole.GUEST, needAppId: false, needAuth: false };
  }

  // 2. 小程序公开接口 (需 appId, 无需登录)
  if (path.startsWith('/api/wx/public') || path === '/api/wx/users') {
    return { role: UserRole.GUEST, needAppId: true, needAuth: false };
  }

  // 3. 小程序端管理员接口 (需 appId, 需登录, 需 admin 角色)
  if (path.startsWith('/api/wx/admin')) {
    return { role: UserRole.ADMIN, needAppId: true, needAuth: true };
  }

  // 4. 小程序端通用接口 (需 appId, 需登录)
  if (path.startsWith('/api/wx')) {
    return { role: UserRole.USER, needAppId: true, needAuth: true };
  }

  // 5. 后台管理接口 (需登录)
  if (path.startsWith('/api/admin')) {
    // 登录相关的接口不需要鉴权
    if (path.startsWith('/api/admin/auth/login') || path.startsWith('/api/admin/auth/ticket')) {
      return { role: UserRole.ADMIN, needAppId: false, needAuth: false };
    }
    return { role: UserRole.ADMIN, needAppId: false, needAuth: true };
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const traceId = generateTraceId(pathname)

  const method = request.method
  const url = request.url
  const searchParams = Object.fromEntries(new URL(url).searchParams)
  // 记录请求信息
  let requestBody = ''
  if (method !== 'GET') {
    try {
      const clonedRequest = request.clone()
      requestBody = await clonedRequest.text()
    } catch {
      requestBody = '[无法解析的请求体]'
    }
  }
  Logger.info(traceId, `[START] ${method} ${url}`, {
    params: searchParams,
    body: requestBody || undefined,
  })

  // 跳过不需要处理的静态路径
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/wx/payment/notify'
  ) {
    return NextResponse.next();
  }

  // 获取路由配置
  const config = getRouteConfig(pathname);

  // 如果没有找到配置，说明路径不合法
  if (!config) {
    return ApiResponseBuilder.error(traceId, '接口不存在', 404);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Trace-ID', traceId);

  // 校验 AppId
  if (config.needAppId) {
    const appId = request.headers.get('x-wechat-appid');
    if (!appId) {
      return ApiResponseBuilder.error(traceId, '未识别的小程序客户端 (Missing x-wechat-appid)', 400);
    }
    requestHeaders.set('x-wechat-appid', appId);
  }

  // 如果不需要登录，直接放行
  if (!config.needAuth) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  try {
    // 验证 token
    const payload = await getVerifiedToken(request, config.role);

    // 额外的权限检查：如果是 ADMIN 路径，角色必须是 admin
    if (config.role === UserRole.ADMIN && payload.role !== UserRole.ADMIN) {
      return ApiResponseBuilder.error(traceId, '权限不足', 403);
    }

    // 将用户信息添加到请求头中
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-store-id', payload.storeId);

    // 继续处理请求
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  } catch (error: any) {
    const message = error.message === 'No token provided' ? '未登录' : '登录已过期';
    return ApiResponseBuilder.error(traceId, message, 401);
  }
}

export const config = {
  matcher: ['/api/:path*']
};
