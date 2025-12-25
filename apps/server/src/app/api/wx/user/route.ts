import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

const updateSchema = z.object({
  nickname: z.string().optional(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  gender: z.number().optional(),
  birthday: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const traceId = request.headers.get('X-Trace-ID')!;
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return ApiResponseBuilder.error(traceId, '未授权', 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiResponseBuilder.error(traceId, '用户不存在', 404);
    }

    return ApiResponseBuilder.success(traceId, user);
  } catch (error: any) {
    console.error(`[User GET Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '获取用户信息失败', 500);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = request.headers.get('X-Trace-ID')!;
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return ApiResponseBuilder.error(traceId, '未授权', 401);
  }

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '参数错误', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: validation.data,
    });

    return ApiResponseBuilder.success(traceId, user);
  } catch (error: any) {
    console.error(`[User PUT Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '更新用户信息失败', 500);
  }
}

