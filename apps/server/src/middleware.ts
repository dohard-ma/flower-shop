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

// 检查路径是否需要特定角色
function checkPathPermission(path: string, role: UserRole): boolean {
  const allowedPaths = ROLE_PATHS[role];
  return allowedPaths.some((prefix) => path.startsWith(prefix));
}
function generateTraceId(pathname: string): string {
  const path = pathname.replace(/^\//, '').replace(/\//g, '.')
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).slice(-3)
  return `${path}.${timestamp}${random}`
}


// 获取路径对应的角色
function getRoleFromPath(path: string): UserRole | null {
  for (const [role, paths] of Object.entries(ROLE_PATHS)) {
    if (paths.some((prefix) => path.startsWith(prefix))) {
      return role as UserRole;
    }
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

  // // 跳过不需要验证的路径
  // if (
  //   pathname.startsWith('/_next') ||
  //   pathname.startsWith('/static') ||
  //   pathname.startsWith('/favicon.ico') ||
  //   pathname === '/api/admin/auth/login' ||
  //   pathname === '/api/wx/users' || // 跳过登录接口
  //   pathname === '/api/wx/payment/notify'
  // ) {
  //   return NextResponse.next();
  // }

  // // 获取路径对应的角色
  // const requiredRole = getRoleFromPath(pathname);

  // // 如果是公开路径，直接放行
  // if (requiredRole === UserRole.GUEST) {
  //   return NextResponse.next();
  // }

  // // 如果没有找到对应的角色配置，返回 404
  // if (!requiredRole) {
  //   return NextResponse.json(
  //     ApiResponseBuilder.error('trace-id', '接口不存在', 404),
  //     { status: 404 }
  //   );
  // }

  // try {
  //   // 验证 token
  //   const payload = await getVerifiedToken(request, requiredRole);

  //   // 将用户信息添加到请求头中
  //   const requestHeaders = new Headers(request.headers);
  //   requestHeaders.set('x-user-id', payload.userId.toString());
  //   requestHeaders.set('x-user-role', payload.role);
  //   requestHeaders.set('X-Trace-ID', traceId)

  // 继续处理请求
  // return NextResponse.next({
  //   request: {
  //     headers: requestHeaders
  //   }
  // });
  // } catch (error) {
  //   // 其他角色返回 401
  //   return NextResponse.json(
  //     ApiResponseBuilder.error('trace-id', '未登录或登录已过期', 401),
  //     { status: 401 }
  //   );
  // }
}

export const config = {
  matcher: ['/api/:path*']
};
