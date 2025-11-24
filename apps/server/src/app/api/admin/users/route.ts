import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';

// 用户更新验证模式
const userUpdateSchema = z.object({
  nickname: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  gender: z.number().min(0).max(2).optional(),
  birthday: z.string().optional()
});

// GET: 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const nickname = searchParams.get('nickname') || undefined;
    const name = searchParams.get('name') || undefined;
    const phone = searchParams.get('phone') || undefined;
    const gender = searchParams.get('gender')
      ? parseInt(searchParams.get('gender')!)
      : undefined;

    const where = {
      ...(nickname && { nickname: { contains: nickname } }),
      ...(name && { name: { contains: name } }),
      ...(phone && { phone: { contains: phone } }),
      ...(gender !== undefined && { gender })
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          membership: true,
          wallet: true
        }
      })
    ]);

    return ApiResponseBuilder.success('trace-id', {
      data: users,
      total,
      page,
      limit
    });
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || '获取用户列表失败'
      },
      { status: 500 }
    );
  }
}

// PUT: 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    const id = parseInt(request.nextUrl.pathname.split('/').pop() || '0');
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的用户ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = userUpdateSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { ...validatedData, updatedAt: new Date() },
      include: {
        membership: true,
        wallet: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    console.error('更新用户信息失败:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: '数据验证失败',
          errors: error.errors
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: error.message || '更新用户信息失败'
      },
      { status: 500 }
    );
  }
}
