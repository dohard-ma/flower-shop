import { NextRequest } from 'next/server';
import { getProductById } from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '产品ID不能为空', 400);
    }

    const product = await getProductById(id);
    if (!product) {
      return ApiResponseBuilder.error('trace-id', '产品不存在', 404);
    }

    return ApiResponseBuilder.success('trace-id', {
      product
    });
  } catch (error: any) {
    console.error('获取产品详情失败:', error);
    return ApiResponseBuilder.error('trace-id', '获取产品详情失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}
