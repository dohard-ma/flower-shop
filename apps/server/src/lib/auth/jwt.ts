import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from './types';
import { NextRequest } from 'next/server';

type JWTConfig = {
  secret: string;
  expiresIn: string;
  issuer: string;
};

// JWT 配置
const JWT_CONFIG = {
  [UserRole.ADMIN]: {
    secret: process.env.JWT_ADMIN_SECRET || 'admin-secret-key',
    expiresIn: '24h', // 管理员 token 24小时过期
    issuer: 'admin-api'
  },
  [UserRole.USER]: {
    secret: process.env.JWT_USER_SECRET || 'user-secret-key',
    expiresIn: '7d', // 普通用户 token 7天过期
    issuer: 'user-api'
  }
} as {
    [key in UserRole]: JWTConfig;
  };

export interface JWTPayload {
  userId: number;
  userNo: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
  iss?: string;
}

// 生成 token
export async function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'>,
  role: UserRole
): Promise<string> {
  const config = JWT_CONFIG[role] as JWTConfig;
  const secret = new TextEncoder().encode(config.secret);

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(config.issuer)
    .setExpirationTime(config.expiresIn)
    .sign(secret);

  return token;
}

// 验证 token
export async function verifyToken(
  token: string,
  role: UserRole
): Promise<JWTPayload> {
  try {
    const config = JWT_CONFIG[role];
    const secret = new TextEncoder().encode(config.secret);

    const { payload } = await jwtVerify(token, secret, {
      issuer: config.issuer
    });

    // 验证角色是否匹配
    if (payload.role !== role) {
      throw new Error('Invalid role');
    }

    return payload as unknown as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// 从请求中获取并验证 token
export async function getVerifiedToken(
  request: NextRequest,
  role: UserRole
): Promise<JWTPayload> {
  const token =
    request.headers.get('Authorization')?.split(' ')[1] ||
    request.cookies.get('session_token')?.value;

  if (!token) {
    throw new Error('No token provided');
  }

  return verifyToken(token, role);
}
