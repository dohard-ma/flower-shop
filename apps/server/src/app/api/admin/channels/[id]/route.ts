import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import getContext from '@/lib/get-context';
import { z } from 'zod';

const updateChannelSchema = z.object({
  name: z.string().min(1, '渠道名称不能为空').optional(),
  code: z.string().min(1, '渠道代码不能为空').optional(),
  icon: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { traceId, storeId } = getContext(request);
  const { id } = params;

  try {
    const body = await request.json();
    const validatedData = updateChannelSchema.parse(body);

    const channel = await prisma.channel.update({
      where: { id, storeId },
      data: validatedData,
    });

    return ApiResponseBuilder.success(traceId, channel, '更新渠道成功');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponseBuilder.error(traceId, error.errors[0].message, 400);
    }
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '更新渠道失败', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { traceId, storeId } = getContext(request);
  const { id } = params;

  try {
    await prisma.channel.delete({
      where: { id, storeId },
    });

    return ApiResponseBuilder.success(traceId, null, '删除渠道成功');
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '删除渠道失败', 500);
  }
}
