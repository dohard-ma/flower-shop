import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import getContext from '@/lib/get-context';
import { z } from 'zod';

const createChannelSchema = z.object({
  name: z.string().min(1, '渠道名称不能为空'),
  code: z.string().min(1, '渠道代码不能为空'),
  icon: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const channels = await prisma.channel.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });

    return ApiResponseBuilder.success(traceId, channels);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '获取渠道列表失败', 500);
  }
}

export async function POST(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const body = await request.json();
    const validatedData = createChannelSchema.parse(body);

    const channel = await prisma.channel.create({
      data: {
        ...validatedData,
        storeId,
      },
    });

    return ApiResponseBuilder.success(traceId, channel, '创建渠道成功');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponseBuilder.error(traceId, error.errors[0].message, 400);
    }
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '创建渠道失败', 500);
  }
}
