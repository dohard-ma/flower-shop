import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt';
import { ApiResponseBuilder } from '@/lib/api-response';
import { UserRole } from '@/lib/auth/types';
import prisma from '@/lib/prisma';
import * as CryptoJS from 'crypto-js';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        ApiResponseBuilder.error('trace-id', '用户名和密码不能为空', 400)
      );
    }

    // 查询管理员用户
    const adminUser = await prisma.adminUser.findUnique({
      where: {
        username: username
      }
    });

    if (!adminUser) {
      return NextResponse.json(
        ApiResponseBuilder.error('trace-id', '用户名或密码错误', 401)
      );
    }

    // 验证密码（MD5加密）
    const hashedPassword = CryptoJS.MD5(password).toString();
    if (hashedPassword !== adminUser.password) {
      return NextResponse.json(
        ApiResponseBuilder.error('trace-id', '用户名或密码错误', 401)
      );
    }

    // 生成 JWT token
    const token = await generateToken(
      {
        userId: adminUser.id,
        userNo: `ADMIN${adminUser.id.toString().padStart(4, '0')}`, // 管理员编号
        username: adminUser.username,
        role: UserRole.ADMIN
      },
      UserRole.ADMIN
    );

    const response = ApiResponseBuilder.success('trace-id', {
      user: {
        id: adminUser.id,
        username: adminUser.username
      }
    }, '登录成功');

    // 设置 session cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24小时，与 JWT 过期时间一致
      path: '/',
      sameSite: 'strict'
    });

    return response;
  } catch (error) {
    console.error('[LOGIN_API_ERROR]', error);
    return NextResponse.json(
      ApiResponseBuilder.error('trace-id', '登录时发生内部错误', 500)
    );
  }
}
