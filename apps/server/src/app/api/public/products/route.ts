import { NextRequest } from 'next/server';
import { getProducts } from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';

// GET: 获取产品列表（公开接口）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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
