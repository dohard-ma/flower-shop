import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

export async function GET(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const categories = await prisma.storeCategory.findMany({
      where: {
        storeId: storeId!,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return ApiResponseBuilder.success(traceId, categories);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '获取分类失败', 500);
  }
}

