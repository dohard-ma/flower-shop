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
  userId: string;
  userNo: string;
  username: string;
  role: UserRole;
  storeId: string;
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
  const tryVerify = async (targetRole: UserRole) => {
    const config = JWT_CONFIG[targetRole];
    const secret = new TextEncoder().encode(config.secret);
    const { payload } = await jwtVerify(token, secret, {
      issuer: config.issuer
    });
    return payload as unknown as JWTPayload;
  };

  try {
    // 1. 首先尝试用要求的角色对应的密钥验证
    let payload: JWTPayload;
    try {
      payload = await tryVerify(role);
    } catch (e) {
      // 2. 如果要求的角色是 USER，但验证失败，则尝试用 ADMIN 密钥验证（Admin 也是 User）
      if (role === UserRole.USER) {
        payload = await tryVerify(UserRole.ADMIN);
      } else {
        throw e;
      }
    }

    // 3. 角色校验：如果是 ADMIN 接口，必须是 admin 角色
    if (role === UserRole.ADMIN && payload.role !== UserRole.ADMIN) {
      throw new Error('Invalid role');
    }

    return payload;
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
