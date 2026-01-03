import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';
import getContext from '@/lib/get-context';

// GET: 获取产品列表（管理员）
export async function GET(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || '10', 10);
    const categoryId = searchParams.get('menuId') || undefined; // 前端传的是 menuId
    const uncategorized = searchParams.get('uncategorized') === 'true';
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const channels = searchParams.get('channels')?.split(',').filter(Boolean) || undefined;

    const result = await getProducts({
      storeId: storeId!,
      page,
      pageSize,
      categoryId,
      uncategorized,
      status: status === 'ALL' ? undefined : status,
      search,
      channelCodes: channels
    });

    return ApiResponseBuilder.success(traceId, {
      data: result.list,
      total: result.total,
      page: result.page,
      limit: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize)
    });
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '获取产品列表失败', 500);
  }
}

const productSchema = z.object({
  name: z.string().min(1, { message: '商品名称不能为空' }),
  styleId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  images: z.any(),
  materials: z.any().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  sortOrder: z.number().int().min(0).default(0),
  categoryIds: z.array(z.string()).optional(),
  mainFlower: z.string().optional().nullable(),
  colorSeries: z.string().optional().nullable(),
  variants: z.array(z.any()).optional(),
});

// POST: Handles product creation
export async function POST(request: NextRequest) {
  const { traceId, storeId } = getContext(request);
  try {
    const body = await request.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '数据校验失败', 400);
    }

    // 自动生成 displayId (简单起见使用时间戳或随机数，实际应有序列号生成器)
    const displayId = `P${Date.now().toString().slice(-6)}`;

    const newProduct = await createProduct({
      ...validation.data,
      storeId: storeId!,
      displayId,
      images: validation.data.images || [],
      materials: validation.data.materials || [],
      status: validation.data.status || 'ACTIVE',
      sortOrder: validation.data.sortOrder || 0,
      categoryIds: validation.data.categoryIds || [],
    });

    return ApiResponseBuilder.success(traceId, newProduct);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '创建产品失败', 500);
  }
}

// PUT: 更新产品
export async function PUT(request: NextRequest) {
  const { traceId } = getContext(request);
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return ApiResponseBuilder.error(traceId, '产品ID不能为空', 400);

    const body = await request.json();
    const validation = productSchema.partial().safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(traceId, '数据校验失败', 400);
    }

    const updatedProduct = await updateProduct(id, validation.data);

    return ApiResponseBuilder.success(traceId, updatedProduct);
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '更新产品失败', 500);
  }
}

// DELETE: 删除产品
export async function DELETE(request: NextRequest) {
  const { traceId } = getContext(request);
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return ApiResponseBuilder.error(traceId, '产品ID不能为空', 400);

    await deleteProduct(id);
    return ApiResponseBuilder.success(traceId, { success: true });
  } catch (error: any) {
    console.error(`[API Error] ${traceId}:`, error);
    return ApiResponseBuilder.error(traceId, '删除产品失败', 500);
  }
}
