import { NextRequest } from 'next/server';
import { Permission, UserRole } from './types';
import { ApiResponseBuilder } from '../api-response';
import { withAuth } from './middleware';

// 从请求头中获取用户角色
export function getUserRoleFromRequest(request: NextRequest): UserRole {
  return (request.headers.get('x-user-role') as UserRole) || UserRole.GUEST;
}

// 检查是否是管理员
export function isAdmin(request: NextRequest): boolean {
  return getUserRoleFromRequest(request) === UserRole.ADMIN;
}

// 检查是否是普通用户
export function isUser(request: NextRequest): boolean {
  return getUserRoleFromRequest(request) === UserRole.USER;
}

// 检查是否是游客
export function isGuest(request: NextRequest): boolean {
  return getUserRoleFromRequest(request) === UserRole.GUEST;
}

// 权限验证高阶函数
export function requireAuth(permission?: Permission) {
  return function (handler: (request: NextRequest) => Promise<Response>) {
    return async function (request: NextRequest) {
      // 检查权限
      if (permission) {
        const authResult = await withAuth(permission)(request);
        if (authResult) return authResult;
      }

      // 检查是否是管理员（如果需要）
      if (permission && !isAdmin(request)) {
        return ApiResponseBuilder.error('trace-id', '权限不足', 403);
      }

      // 调用原始处理函数
      return handler(request);
    };
  };
}

// 公开接口高阶函数
export function publicRoute(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async function (request: NextRequest) {
    // 直接调用处理函数，不做权限检查
    return handler(request);
  };
}

// 管理员接口高阶函数
export function adminRoute(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async function (request: NextRequest) {
    // 检查是否是管理员
    if (!isAdmin(request)) {
      return ApiResponseBuilder.error('trace-id', '权限不足', 403);
    }

    // 调用处理函数
    return handler(request);
  };
}
