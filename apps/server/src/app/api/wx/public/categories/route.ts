import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

// GET: 获取公开分类列表 (仅可见的)
export async function GET(request: NextRequest) {
  const { traceId, appId } = getContext(request);

  try {
    const store = await prisma.store.findUnique({
      where: { appId }
    });

    if (!store) {
      return ApiResponseBuilder.error(traceId, '未找到店铺信息', 404);
    }

    const categories = await prisma.storeCategory.findMany({
      where: {
        storeId: store.id,
        isVisible: true
      },
      orderBy: {
        sortOrder: 'asc',
      }
    });

    // 格式化输出，适配小程序端字段 (id -> _id)，并保留 parentId 支持多级
    const formattedCategories = categories.map(cat => ({
      ...cat,
      _id: cat.id,
    }));

    // 如果前端需要树形结构，可以在这里转换，但通常小程序端分类列表是扁平获取后再处理或直接展示
    return ApiResponseBuilder.success(traceId, formattedCategories);
  } catch (error: any) {
    console.error('[Public Categories GET] Error:', error);
    return ApiResponseBuilder.error(traceId, '获取分类列表失败', 500, [
      { message: error.message }
    ]);
  }
}

