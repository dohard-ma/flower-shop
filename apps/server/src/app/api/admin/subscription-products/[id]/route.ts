import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id!);
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '产品ID不能为空', 400);
    }

    const product = await prisma.subscriptionProduct.findUnique({
      where: { id }
    });

    if (!product) {
      return ApiResponseBuilder.error('trace-id', '产品不存在', 404);
    }

    return ApiResponseBuilder.success('trace-id', product);
  } catch (error: any) {
    console.error('获取产品详情失败:', error);
    return ApiResponseBuilder.error('trace-id', '获取产品详情失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}
