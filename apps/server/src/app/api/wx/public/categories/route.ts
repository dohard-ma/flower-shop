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

    const { searchParams } = new URL(request.url);
    // 渠道代码，用于过滤分类可见性
    const channelCode = searchParams.get('channelCode') || undefined;

    const categories = await prisma.storeCategory.findMany({
      where: {
        storeId: store.id,
        isVisible: true
      },
      orderBy: {
        sortOrder: 'asc',
      }
    });

    // 按渠道过滤分类
    // visibleChannels 为 null/空数组表示全渠道可见，否则只对指定渠道可见
    let filteredCategories = channelCode
      ? categories.filter(cat => {
          const visibleChannels = cat.visibleChannels as string[] | null;
          // 如果 visibleChannels 为空或未设置，则全渠道可见
          if (!visibleChannels || visibleChannels.length === 0) {
            return true;
          }
          // 否则检查是否包含当前渠道
          return visibleChannels.includes(channelCode);
        })
      : categories;

    // 如果指定了渠道，进一步过滤掉没有商品的分类
    if (channelCode) {
      // 获取每个分类下在该渠道上架的商品数量
      const categoryIds = filteredCategories.map(cat => cat.id);
      
      // 查询每个分类下是否有在该渠道上架的商品
      const categoriesWithProducts = await prisma.categoryOnProduct.groupBy({
        by: ['categoryId'],
        where: {
          categoryId: { in: categoryIds },
          product: {
            status: 'ACTIVE',
            channels: {
              some: {
                channel: { code: channelCode },
                isListed: true
              }
            }
          }
        },
        _count: {
          productId: true
        }
      });

      // 构建有商品的分类 ID 集合
      const categoryIdsWithProducts = new Set(
        categoriesWithProducts.map(c => c.categoryId)
      );

      // 过滤出有商品的分类，但保留父级分类（level 0 且有子分类）
      const categoryIdSet = new Set(filteredCategories.map(c => c.id));
      filteredCategories = filteredCategories.filter(cat => {
        // 如果该分类本身有商品，保留
        if (categoryIdsWithProducts.has(cat.id)) {
          return true;
        }
        // 如果是父级分类，检查其子分类是否有商品
        if (!cat.parentId) {
          // 查找所有子分类
          const childCategories = filteredCategories.filter(c => c.parentId === cat.id);
          // 如果有任意子分类有商品，保留父级
          return childCategories.some(child => categoryIdsWithProducts.has(child.id));
        }
        return false;
      });
    }

    // 格式化输出，适配小程序端字段 (id -> _id)，并保留 parentId 支持多级
    const formattedCategories = filteredCategories.map(cat => ({
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

