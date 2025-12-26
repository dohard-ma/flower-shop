import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

// 1. 定义校验 Schema
const categorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional().default(0),
  isVisible: z.boolean().optional().default(true),
  level: z.number().optional().default(0),
});

const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().min(1, '分类ID不能为空'),
});



// GET: 获取分类列表
export async function GET(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    // 格式化输出，适配小程序端字段 (id -> _id, productCount)
    const formattedCategories = categories.map(cat => ({
      ...cat,
      _id: cat.id,
      productCount: cat._count.products,
    }));

    return ApiResponseBuilder.success(traceId, formattedCategories);
  } catch (error: any) {
    console.error('[Admin Categories GET] Error:', error);
    return ApiResponseBuilder.error(traceId, '获取分类列表失败', 500, [
      { message: error.message }
    ]);
  }
}

// POST: 创建分类
export async function POST(request: NextRequest) {
  const { traceId, storeId } = getContext(request);

  try {
    const body = await request.json();
    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(
        traceId,
        '数据校验失败',
        400,
        Object.entries(validation.error.flatten().fieldErrors).map(([field, errors]) => ({
          field,
          message: errors?.[0] || '验证失败'
        }))
      );
    }

    const result = await prisma.category.create({
      data: {
        ...validation.data,
        storeId,
      }
    });

    return ApiResponseBuilder.success(traceId, { ...result, _id: result.id });
  } catch (error: any) {
    console.error('[Admin Categories POST] Error:', error);
    return ApiResponseBuilder.error(traceId, '创建分类失败', 500, [
      { message: error.message }
    ]);
  }
}

// PUT: 更新分类
export async function PUT(request: NextRequest) {
  const { traceId } = getContext(request);

  try {
    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseBuilder.error(
        traceId,
        '数据校验失败',
        400,
        Object.entries(validation.error.flatten().fieldErrors).map(([field, errors]) => ({
          field,
          message: errors?.[0] || '验证失败'
        }))
      );
    }

    const { id, ...data } = validation.data;

    const result = await prisma.category.update({
      where: { id },
      data
    });

    return ApiResponseBuilder.success(traceId, { ...result, _id: result.id });
  } catch (error: any) {
    console.error('[Admin Categories PUT] Error:', error);
    return ApiResponseBuilder.error(traceId, '更新分类失败', 500, [
      { message: error.message }
    ]);
  }
}

// DELETE: 删除分类
export async function DELETE(request: NextRequest) {
  const { traceId } = getContext(request);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiResponseBuilder.error(traceId, '分类ID不能为空', 400);
    }

    // 检查是否有子分类
    const childrenCount = await prisma.category.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      return ApiResponseBuilder.error(traceId, '请先删除子分类', 400);
    }

    // 检查是否有商品关联
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productsCount > 0) {
      return ApiResponseBuilder.error(traceId, '该分类下已有商品，无法删除', 400);
    }

    await prisma.category.delete({
      where: { id }
    });

    return ApiResponseBuilder.success(traceId, null, '删除成功');
  } catch (error: any) {
    console.error('[Admin Categories DELETE] Error:', error);
    return ApiResponseBuilder.error(traceId, '删除分类失败', 500, [
      { message: error.message }
    ]);
  }
}

