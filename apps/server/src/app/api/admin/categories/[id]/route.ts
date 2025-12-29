import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

const updateSchema = z.object({
  name: z.string().min(1, '分类名称不能为空').optional(),
  sortOrder: z.number().optional(),
  isVisible: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { traceId, storeId } = getContext(request);
  const { id } = params;

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(
        traceId,
        validation.error.errors[0].message,
        400
      );
    }

    const category = await prisma.storeCategory.update({
      where: {
        id,
        storeId,
      },
      data: validation.data,
    });

    return ApiResponseBuilder.success(traceId, category);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '更新分类失败', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { traceId, storeId } = getContext(request);
  const { id } = params;

  try {
    // 检查是否有商品关联到此分类
    const productCount = await prisma.categoryOnProduct.count({
      where: {
        categoryId: id,
      },
    });

    if (productCount > 0) {
      return ApiResponseBuilder.error(
        traceId,
        `该分类下还有 ${productCount} 个商品，无法删除`,
        400
      );
    }

    await prisma.storeCategory.delete({
      where: {
        id,
        storeId,
      },
    });

    return ApiResponseBuilder.success(traceId, { message: '删除成功' });
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '删除分类失败', 500);
  }
}

