import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import generateTraceId from '@/lib/generate-trace-id';
import { generateToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import getContext from '@/lib/get-context';

export async function POST(request: NextRequest) {
  const traceId = getContext(request).traceId;
  try {
    const { ticketId, openid, storeId } = await request.json();

    if (!ticketId || !openid || !storeId) {
      return ApiResponseBuilder.error(traceId, '参数不足', 400);
    }

    // 1. 查找票据
    const ticket = await prisma.loginTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return ApiResponseBuilder.error(traceId, '登录请求已失效', 404);
    }

    if (ticket.status !== 'PENDING' && ticket.status !== 'SCANNED') {
      return ApiResponseBuilder.error(traceId, '该二维码已失效或已使用', 400);
    }

    // 2. 验证用户权限 (是否是该店管理员)
    const user = await prisma.user.findFirst({
      where: {
        openid,
        storeId,
        role: UserRole.ADMIN
      }
    });

    if (!user) {
      return ApiResponseBuilder.error(traceId, '您不是该店铺的管理员，无权登录后台', 403);
    }

    // 3. 生成管理员 Token
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

    // 4. 更新票据状态为已确认，并存入 token
    await prisma.loginTicket.update({
      where: { id: ticketId },
      data: {
        status: 'CONFIRMED',
        openid,
        userId: user.id,
        token: token
      }
    });

    return ApiResponseBuilder.success(traceId, null, '确认登录成功');
  } catch (error: any) {
    console.error('确认登录失败:', error);
    return ApiResponseBuilder.error(traceId, error.message || '内部服务器错误', 500);
  }
}

