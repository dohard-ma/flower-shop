import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt';
import { ApiResponseBuilder } from '@/lib/api-response';
import { UserRole } from '@/lib/auth/types';
import { prisma } from '@/lib/prisma';
import * as CryptoJS from 'crypto-js';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json(); // 这里的 username 实际上是 displayId

    if (!username || !password) {
      return ApiResponseBuilder.error('trace-id', '用户名(编号)和密码不能为空', 400);
    }

    // 1. 直接通过 displayId 查询用户 (displayId 是全局唯一的)
    const user = await prisma.user.findUnique({
      where: {
        displayId: username,
      },
      include: {
        store: true // 包含店铺信息以获取 storeId
      }
    });

    if (!user || user.role !== 'ADMIN') {
      return ApiResponseBuilder.error('trace-id', '管理员账号或密码错误', 401);
    }

    // 2. 验证密码（MD5加密）
    const hashedPassword = CryptoJS.MD5(password).toString();
    if (hashedPassword !== user.password) {
      return ApiResponseBuilder.error('trace-id', '用户名或密码错误', 401);
    }

    // 4. 生成 JWT token
    const token = await generateToken(
      {
        userId: user.id,
        userNo: user.displayId,
        username: user.nickname || user.displayId || '管理员',
        role: UserRole.ADMIN,
        storeId: user.storeId
      },
      UserRole.ADMIN
    );

    const response = ApiResponseBuilder.success('trace-id', {
      user: {
        id: user.id,
        displayId: user.displayId,
        nickname: user.nickname
      }
    }, '登录成功');

    // 5. 设置 session cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24小时
      path: '/',
      sameSite: 'strict'
    });

    return response;
  } catch (error: any) {
    console.error('[LOGIN_API_ERROR]', error);
    return ApiResponseBuilder.error('trace-id', error.message || '登录时发生内部错误', 500);
  }
}
