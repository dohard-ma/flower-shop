import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// GET: 获取用户钱包交易记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userIdInt = parseInt(userId);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的用户ID'
        },
        { status: 400 }
      );
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: userIdInt },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true
      }
    });

    return ApiResponseBuilder.success('trace-id', {
      data: transactions
    });
  } catch (error: any) {
    return ApiResponseBuilder.error('trace-id', '获取用户交易记录失败');
  }
}
