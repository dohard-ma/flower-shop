import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { UserRole, Permission, AuthContext, JWTPayload } from './types';
import { ApiResponseBuilder } from '../api-response';

// 角色对应的默认权限
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.USER]: [
    Permission.PRODUCT_READ,
    Permission.ORDER_READ,
    Permission.ORDER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE
  ],
  [UserRole.GUEST]: [Permission.PRODUCT_READ]
};

// 验证 JWT token
async function verifyToken(token: string): Promise<JWTPayload> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

// 检查权限
function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

// 创建权限中间件
export function withAuth(requiredPermission?: Permission) {
  return async function authMiddleware(request: NextRequest) {
    try {
      // 获取 token
      const token = request.headers.get('Authorization')?.split(' ')[1];

      // 如果没有 token，且接口需要权限，则返回未授权
      if (!token && requiredPermission) {
        return ApiResponseBuilder.error('trace-id', '未授权访问', 401);
      }

      let authContext: AuthContext = {
        role: UserRole.GUEST,
        permissions: rolePermissions[UserRole.GUEST]
      };

      // 如果有 token，验证并获取用户信息
      if (token) {
        try {
          const payload = await verifyToken(token);
          authContext = {
            userId: payload.userId,
            role: payload.role,
            permissions: payload.permissions
          };
        } catch (error) {
          // token 无效，使用游客权限
          console.warn('Invalid token:', error);
        }
      }

      // 检查权限
      if (
        requiredPermission &&
        !hasPermission(authContext.permissions, requiredPermission)
      ) {
        return ApiResponseBuilder.error('trace-id', '权限不足', 403);
      }

      // 将认证信息添加到请求中
      request.auth = authContext;

      return null; // 继续处理请求
    } catch (error: any) {
      return ApiResponseBuilder.error('trace-id', '认证失败', 401, [
        {
          message: error.message
        }
      ]);
    }
  };
}

// 扩展 NextRequest 类型
declare module 'next/server' {
  interface NextRequest {
    auth?: AuthContext;
  }
}
