import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import generateTraceId from '@/lib/generate-trace-id';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = generateTraceId(request.url);
  try {
    const ticketId = (await params).id;

    if (!ticketId) {
      return ApiResponseBuilder.error(traceId, '缺少票据ID', 400);
    }

    const ticket = await prisma.loginTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return ApiResponseBuilder.error(traceId, '票据不存在', 404);
    }

    // 检查是否过期
    if (ticket.expiresAt < new Date()) {
      if (ticket.status === 'PENDING' || ticket.status === 'SCANNED') {
        await prisma.loginTicket.update({
          where: { id: ticketId },
          data: { status: 'EXPIRED' }
        });
        return ApiResponseBuilder.success(traceId, { status: 'EXPIRED' });
      }
    }

    // 如果已确认，返回 token
    if (ticket.status === 'CONFIRMED' && ticket.token) {
      return ApiResponseBuilder.success(traceId, {
        status: ticket.status,
        token: ticket.token
      });
    }

    return ApiResponseBuilder.success(traceId, {
      status: ticket.status
    });
  } catch (error: any) {
    console.error('查询票据状态失败:', error);
    return ApiResponseBuilder.error(traceId, error.message || '内部服务器错误', 500);
  }
}

