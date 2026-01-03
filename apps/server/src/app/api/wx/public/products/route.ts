import { NextRequest } from 'next/server';
import { getProducts } from '@/lib/api/products';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import getContext from '@/lib/get-context';

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
    const channelCode = 'wechat_mini';

    const includeOptions = {
      channels: {
        where: {
          channel: { code: channelCode }
        },
        include: {
          channel: true
        }
      },
      variants: {
        where: { isActive: true },
        orderBy: { price: 'asc' as const },
        take: 1
      }
    };

    // 统一处理格式化的函数
    const formatProduct = (p: any) => {
      const miniChannel = p.channels.find((c: any) => c.channel.code === channelCode);
      let price = '0';
      
      if (miniChannel && Number(miniChannel.price) > 0) {
        price = miniChannel.price.toString();
      } else if (p.variants && p.variants.length > 0) {
        price = p.variants[0].price.toString();
      }
      
      return {
        ...p,
        priceRef: price
      };
    };

    // 如果提供了 ids 参数，直接通过 ID 获取产品
    if (ids) {
      const idArray = ids.split(',').filter(Boolean);
      const products = await prisma.product.findMany({
        where: {
          id: { in: idArray.map(id => id.trim()) },
          storeId: store.id,
          status: 'ACTIVE',
          channels: {
            some: {
              channel: { code: channelCode },
              isListed: true
            }
          }
        },
        include: includeOptions
      });

      return ApiResponseBuilder.success(traceId, {
        data: products.map(formatProduct),
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
      status: 'ACTIVE',
      channels: {
        some: {
          channel: { code: channelCode },
          isListed: true
        }
      }
    };

    // 店内分类过滤 (多对多关系)
    if (categoryId) {
      // 获取该分类及其所有子分类的 ID
      const subCategories = await prisma.storeCategory.findMany({
        where: { parentId: categoryId },
        select: { id: true }
      });

      const categoryIds = [categoryId, ...subCategories.map(c => c.id)];

      where.categories = {
        some: {
          categoryId: { in: categoryIds }
        }
      };
    }

    // 物理款式过滤 (单选)
    if (style) {
      where.styleId = style;
    }

    if (colorSeries) where.colorSeries = colorSeries;
    if (search) where.name = { contains: search };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
        include: includeOptions
      }),
      prisma.product.count({ where })
    ]);

    return ApiResponseBuilder.success(traceId, {
      data: products.map(formatProduct),
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

