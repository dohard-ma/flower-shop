import { NextRequest } from 'next/server';
import { getProducts } from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

// 获取请求中的上下文信息
function getContext(request: NextRequest) {
  return {
    traceId: request.headers.get('X-Trace-ID')!,
    appId: request.headers.get('x-wechat-appid')!,
  };
}

// GET: 获取产品列表（公开接口）
export async function GET(request: NextRequest) {
  const { traceId, appId } = getContext(request);

  try {
    const store = await prisma.store.findUnique({
      where: { appId }
    });

    if (!store) {
      return ApiResponseBuilder.error(traceId, '未找到店铺信息', 404);
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    // 如果提供了 ids 参数，直接通过 ID 获取产品
    if (ids) {
      const idArray = ids.split(',').filter(Boolean);
      const products = await prisma.product.findMany({
        where: {
          id: { in: idArray.map(id => id.trim()) },
          storeId: store.id,
          status: 'ACTIVE'
        }
      });

      return ApiResponseBuilder.success(traceId, {
        data: products,
        total: products.length,
        page: 1,
        limit: products.length,
        totalPages: 1
      });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || '10', 10);
    const categoryId = searchParams.get('categoryId') || undefined;
    const style = searchParams.get('style') || undefined;
    const colorSeries = searchParams.get('colorSeries') || undefined;
    const targetAudience = searchParams.get('targetAudience') || undefined;
    const search = searchParams.get('search') || undefined;

    // TODO: getProducts Helper 需要增加 storeId 支持
    // 这里暂时手动实现过滤以确保安全
    const where: any = {
      storeId: store.id,
      status: 'ACTIVE'
    };
    if (categoryId) where.categoryId = categoryId;
    if (style) where.style = style;
    if (colorSeries) where.colorSeries = colorSeries;
    if (search) where.name = { contains: search };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.product.count({ where })
    ]);

    return ApiResponseBuilder.success(traceId, {
      data: products,
      total,
      page,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error('获取产品列表失败:', error);
    return ApiResponseBuilder.error(traceId, '获取产品列表失败', 500, [
      { message: error.message }
    ]);
  }
}

