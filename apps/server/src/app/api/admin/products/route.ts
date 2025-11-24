import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';

// 产品数据校验 Schema
const productSchema = z.object({
  name: z.string().min(1, { message: '商品名称不能为空' }),
  category: z.enum(['BOUQUET', 'BASKET', 'POTTED', 'WREATH'], {
    message: '商品分类必须为: BOUQUET, BASKET, POTTED, WREATH'
  }),
  style: z.string().optional(), // 产品类型：花束、花篮、花盒、桌花、手捧花、抱抱桶、开业花篮、其他
  priceRef: z.string().min(1, { message: '参考价格不能为空' }),
  description: z.string().optional(),
  images: z.any(),
  videos: z.any().optional(),
  materials: z.array(z.string()).default([]), // 花材名称数组，直接存储花材名称
  targetAudience: z.array(z.string()).optional(), // 赠送对象数组，直接存储赠送对象名称
  size: z.enum(['XS', 'S', 'M', 'L']).optional(),
  branchCount: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  sortOrder: z.number().int().min(0).default(0)
});

// GET: 获取产品列表（管理员）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || '10', 10);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;

    const result = await getProducts({
      page,
      pageSize,
      category,
      status
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

// POST: Handles product creation AND direct file uploads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const productSchemaForCreate = productSchema.extend({
      images: z.array(z.string().url()).optional().nullable(),
      videos: z.array(z.string().url()).optional().nullable()
    });
    const validation = productSchemaForCreate.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(
        'trace-id',
        '数据校验失败',
        400,
        Object.entries(validation.error.flatten().fieldErrors).map(
          ([field, errors]) => ({
            field,
            message: errors?.[0] || '验证失败'
          })
        )
      );
    }
    const productData = { ...validation.data, updatedAt: new Date() };

    const newProduct = await createProduct(productData as any); // Cast to any if types slightly mismatch after zod

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '产品创建成功',
      productId: newProduct.id,
      data: newProduct
    });
  } catch (error: any) {
    console.error('创建产品失败:', error);
    return ApiResponseBuilder.error('trace-id', '创建产品失败', 500, [
      { message: error.message }
    ]);
  }
}

// PUT: 更新产品（管理员）
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '产品ID不能为空', 400);
    }

    // For PUT, we expect JSON body as files are handled by action=upload now
    const body = await request.json();

    // Zod schema for update expects string URLs for images
    const productSchemaForUpdate = productSchema.partial().extend({
      images: z.array(z.string().url()).optional().nullable(), // Allow null to remove images
      videos: z.array(z.string().url()).optional().nullable() // Allow null to remove videos
    });

    const validation = productSchemaForUpdate.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(
        'trace-id',
        '数据校验失败(PUT)',
        400,
        Object.entries(validation.error.flatten().fieldErrors).map(
          ([field, errors]) => ({
            field,
            message: errors?.[0] || '验证失败'
          })
        )
      );
    }

    const productData = { ...validation.data, updatedAt: new Date() };

    const updatedProduct = await updateProduct(id, productData as any);

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '产品更新成功',
      data: updatedProduct
    });
  } catch (error: any) {
    // Access id directly from request.nextUrl.searchParams within the catch block if needed for logging
    const productId = new URL(request.url).searchParams.get('id');
    console.error(`更新产品 ${productId || '[ID not found]'} 失败:`, error);
    return ApiResponseBuilder.error('trace-id', '更新产品失败', 500, [
      { message: error.message }
    ]);
  }
}

// DELETE: 删除产品（管理员）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '产品ID不能为空', 400);
    }

    await deleteProduct(id);

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '产品删除成功'
    });
  } catch (error: any) {
    console.error('删除产品失败:', error);
    return ApiResponseBuilder.error('trace-id', '删除产品失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}
