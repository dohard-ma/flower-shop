import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { traceId, appId } = getContext(request);
  const { id } = await params;

  try {
    const store = await prisma.store.findUnique({
      where: { appId }
    });

    if (!store) {
      return ApiResponseBuilder.error(traceId, '未找到店铺信息', 404);
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
        storeId: store.id
      }
    });

    if (!product || product.status !== 'ACTIVE') {
      return ApiResponseBuilder.error(traceId, '商品不存在或已下架', 404);
    }

    return ApiResponseBuilder.success(traceId, product);
  } catch (error: any) {
    console.error(`获取商品详情失败 [${id}]:`, error);
    return ApiResponseBuilder.error(traceId, '获取商品详情失败', 500, [
      { message: error.message }
    ]);
  }
}

