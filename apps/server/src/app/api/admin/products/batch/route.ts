import { NextRequest } from 'next/server';
import { z } from 'zod';
import { batchUpdateStatus, batchUpdateCategories } from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';
import getContext from '@/lib/get-context';

export async function POST(request: NextRequest) {
  const { traceId } = getContext(request);
  try {
    const body = await request.json();
    const schema = z.object({
      ids: z.array(z.string()).min(1),
      action: z.enum(['status', 'category']),
      value: z.any()
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '参数校验失败', 400);
    }

    const { ids, action, value } = validation.data;

    if (action === 'status') {
      await batchUpdateStatus(ids, value);
    } else if (action === 'category') {
      await batchUpdateCategories(ids, value as string[]);
    }

    return ApiResponseBuilder.success(traceId, { success: true });
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '批量操作失败', 500);
  }
}
