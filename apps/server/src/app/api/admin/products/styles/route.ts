import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

export async function GET(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const styles = await prisma.productStyle.findMany({
      where: {
        storeId: storeId!,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return ApiResponseBuilder.success(traceId, styles);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '获取产品款式失败', 500);
  }
}
