import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

// 订阅商品数据校验 Schema
const subscriptionProductSchema = z.object({
  productName: z.string().min(1, { message: '商品名称不能为空' }),
  stock: z.number().int().min(0, { message: '库存不能为负' }),
  coverImage: z.string().url().optional().nullable(),
  detail: z.string().optional(),
  images: z.array(z.string().url()).optional().nullable(),
  isActive: z.boolean().default(true)
});

// GET: 获取订阅商品列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || '10', 10);
    const isActive = searchParams.get('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined;

    const skip = (page - 1) * pageSize;

    const [total, subscriptionProducts] = await Promise.all([
      prisma.subscriptionProduct.count({
        where: {
          ...(isActive !== undefined && { isActive })
        }
      }),
      prisma.subscriptionProduct.findMany({
        where: {
          ...(isActive !== undefined && { isActive })
        },
        skip,
        take: pageSize,
        orderBy: {
          id: 'desc'
        }
      })
    ]);

    return ApiResponseBuilder.success('trace-id', {
      data: subscriptionProducts,
      total,
      page,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error('获取订阅商品列表失败:', error);
    return ApiResponseBuilder.error('trace-id', '获取订阅商品列表失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}

// POST: 创建订阅商品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = subscriptionProductSchema.safeParse(body);

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

    const subscriptionProductData = validation.data;

    const newSubscriptionProduct = await prisma.subscriptionProduct.create({
      data: {
        productName: subscriptionProductData.productName,
        stock: subscriptionProductData.stock,
        coverImage: subscriptionProductData.coverImage,
        detail: subscriptionProductData.detail,
        images: subscriptionProductData.images || [],
        isActive: subscriptionProductData.isActive,
        updatedAt: new Date()
      }
    });

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '订阅商品创建成功',
      data: newSubscriptionProduct
    });
  } catch (error: any) {
    console.error('创建订阅商品失败:', error);
    return ApiResponseBuilder.error('trace-id', '创建订阅商品失败', 500, [
      { message: error.message }
    ]);
  }
}

// PUT: 更新订阅商品
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '订阅商品ID不能为空', 400);
    }

    const body = await request.json();

    const subscriptionProductSchemaForUpdate = subscriptionProductSchema.partial();
    const validation = subscriptionProductSchemaForUpdate.safeParse(body);

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

    const subscriptionProductData = validation.data;

    // 检查订阅商品是否存在
    const existingProduct = await prisma.subscriptionProduct.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return ApiResponseBuilder.error('trace-id', '订阅商品不存在', 404);
    }

    const updatedSubscriptionProduct = await prisma.subscriptionProduct.update({
      where: { id },
      data: {
        ...(subscriptionProductData.productName && { productName: subscriptionProductData.productName }),
        ...(subscriptionProductData.stock !== undefined && { stock: subscriptionProductData.stock }),
        ...(subscriptionProductData.coverImage !== undefined && { coverImage: subscriptionProductData.coverImage }),
        ...(subscriptionProductData.detail !== undefined && { detail: subscriptionProductData.detail }),
        ...(subscriptionProductData.images !== undefined && { images: subscriptionProductData.images || [] }),
        ...(subscriptionProductData.isActive !== undefined && { isActive: subscriptionProductData.isActive }),
        updatedAt: new Date()
      }
    });

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '订阅商品更新成功',
      data: updatedSubscriptionProduct
    });
  } catch (error: any) {
    const productId = new URL(request.url).searchParams.get('id');
    console.error(`更新订阅商品 ${productId || '[ID not found]'} 失败:`, error);
    return ApiResponseBuilder.error('trace-id', '更新订阅商品失败', 500, [
      { message: error.message }
    ]);
  }
}

// DELETE: 删除订阅商品
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '订阅商品ID不能为空', 400);
    }

    // 检查订阅商品是否存在
    const existingProduct = await prisma.subscriptionProduct.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return ApiResponseBuilder.error('trace-id', '订阅商品不存在', 404);
    }

    // 检查是否有关联的发货计划
    const relatedDeliveryPlans = await prisma.deliveryPlan.count({
      where: { subscriptionProductId: id }
    });

    if (relatedDeliveryPlans > 0) {
      return ApiResponseBuilder.error(
        'trace-id',
        '无法删除订阅商品，存在关联的发货计划',
        400,
        [{ message: `存在 ${relatedDeliveryPlans} 个关联的发货计划` }]
      );
    }

    await prisma.subscriptionProduct.delete({
      where: { id }
    });

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '订阅商品删除成功'
    });
  } catch (error: any) {
    console.error('删除订阅商品失败:', error);
    return ApiResponseBuilder.error('trace-id', '删除订阅商品失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}
