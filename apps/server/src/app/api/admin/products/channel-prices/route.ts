import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import getContext from '@/lib/get-context';

const updateSchema = z.object({
  updates: z.array(z.object({
    variantId: z.string(),
    channelId: z.string(),
    price: z.number().nullable(),
  })),
});

export async function POST(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '参数校验失败', 400);
    }

    const { updates } = validation.data;

    // 按 variantId 分组处理
    const variantUpdates = new Map<string, { channelId: string; price: number | null }[]>();
    
    updates.forEach(({ variantId, channelId, price }) => {
      if (!variantUpdates.has(variantId)) {
        variantUpdates.set(variantId, []);
      }
      variantUpdates.get(variantId)!.push({ channelId, price });
    });

    // 获取渠道信息用于构建 channelData
    const channelIds = [...new Set(updates.map(u => u.channelId))];
    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, code: true },
    });
    const channelMap = new Map(channels.map(c => [c.id, c.code]));

    // 批量更新 ProductVariant.channelData
    await prisma.$transaction(async (tx) => {
      for (const [variantId, channelPrices] of variantUpdates) {
        // 获取当前 variant 的 channelData
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { channelData: true, productId: true },
        });

        if (!variant) continue;

        const currentData = (variant.channelData as Record<string, any>) || {};

        // 更新 channelData
        channelPrices.forEach(({ channelId, price }) => {
          const channelCode = channelMap.get(channelId);
          if (!channelCode) return;

          if (price === null) {
            // 清除该渠道价格
            delete currentData[channelCode];
          } else {
            currentData[channelCode] = {
              ...currentData[channelCode],
              price,
            };
          }
        });

        await tx.productVariant.update({
          where: { id: variantId },
          data: { channelData: currentData },
        });

        // 同步更新 ProductChannel.isListed
        for (const { channelId, price } of channelPrices) {
          const isListed = price !== null;
          
          // 尝试更新或创建 ProductChannel
          await tx.productChannel.upsert({
            where: {
              productId_channelId: {
                productId: variant.productId,
                channelId,
              },
            },
            update: {
              isListed,
              price: price ?? 0,
            },
            create: {
              productId: variant.productId,
              channelId,
              isListed,
              price: price ?? 0,
            },
          });
        }
      }
    });

    return ApiResponseBuilder.success(traceId, { success: true });
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '批量更新渠道价格失败', 500);
  }
}
