import { NextRequest } from 'next/server';
import { getProducts, getProductById } from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

// GET: 获取产品列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids'); // 支持通过 ids 参数获取指定产品

    // 如果提供了 ids 参数，直接通过 ID 获取产品
    if (ids) {
      const idArray = ids.split(',').filter(Boolean);
      const products = await Promise.all(
        idArray.map(async (id) => {
          try {
            const product = await prisma.product.findUnique({
              where: { id: id.trim() }
            });
            // 只返回上架的产品
            return product && product.status === 'ACTIVE' ? product : null;
          } catch (err) {
            console.error(`Failed to fetch product ${id}:`, err);
            return null;
          }
        })
      );

      const validProducts = products.filter(p => p !== null);

      return ApiResponseBuilder.success('trace-id', {
        data: validProducts,
        total: validProducts.length,
        page: 1,
        limit: validProducts.length,
        totalPages: 1
      });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || '10', 10);
    const style = searchParams.get('style') || undefined;
    const colorSeries = searchParams.get('colorSeries') || undefined;
    const targetAudience = searchParams.get('targetAudience') || undefined;
    const search = searchParams.get('search') || undefined;

    // 公开接口只返回上架的商品
    const result = await getProducts({
      page,
      pageSize,
      status: 'ACTIVE',
      style,
      colorSeries,
      targetAudience,
      search
    });

    return ApiResponseBuilder.success('trace-id', {
      data: result.list,
      total: result.total,
      page: result.page,
      limit: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize)
    });
  } catch (error: any) {
    console.error('获取产品列表失败:', error);
    return ApiResponseBuilder.error('trace-id', '获取产品列表失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}
