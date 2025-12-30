import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

const createSchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  sortOrder: z.number().optional().default(0),
  parentId: z.string().nullable().optional(),
  isVisible: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const channels = searchParams.get('channels')?.split(',').filter(Boolean) || [];

    // 构建商品过滤条件，用于统计数量
    const productWhere: any = {};
    if (status && status !== 'ALL') {
      productWhere.status = status;
    }
    if (search) {
      productWhere.OR = [
        { name: { contains: search } },
        { displayId: { contains: search } },
      ];
    }
    if (channels.length > 0) {
      productWhere.channels = {
        some: {
          channel: {
            code: { in: channels }
          }
        }
      };
    }

    const categories = await prisma.storeCategory.findMany({
      where: {
        storeId: storeId!,
      },
      include: {
        _count: {
          select: { 
            products: {
              where: {
                product: productWhere
              }
            } 
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ],
    });

    return ApiResponseBuilder.success(traceId, categories);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '获取分类失败', 500);
  }
}

export async function POST(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(
        traceId,
        validation.error.errors[0].message,
        400
      );
    }

    const category = await prisma.storeCategory.create({
      data: {
        ...validation.data,
        storeId,
      },
    });

    return ApiResponseBuilder.success(traceId, category);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '创建分类失败', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const body = await request.json();

    // 如果是数组，则认为是批量更新排序
    if (Array.isArray(body)) {
      try {
        // 使用更安全的方式更新，并确保 storeId 匹配
        const updates = body.map((item: { id: string; sortOrder: number }) =>
          prisma.storeCategory.updateMany({
            where: {
              id: item.id,
              storeId: storeId
            },
            data: { sortOrder: Number(item.sortOrder) },
          })
        );

        await prisma.$transaction(updates);
        return ApiResponseBuilder.success(traceId, { message: '排序更新成功' });
      } catch (transactionError: any) {
        console.error(`[Transaction Error] ${traceId}:`, transactionError);
        return ApiResponseBuilder.error(traceId, '排序批量更新失败', 500);
      }
    }

    return ApiResponseBuilder.error(traceId, '无效的请求数据', 400);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    // 打印更详细的错误信息
    const errorMessage = error.code === 'P2025' ? '部分分类未找到或无权操作' : '更新失败';
    return ApiResponseBuilder.error(traceId, errorMessage, 500);
  }
}

