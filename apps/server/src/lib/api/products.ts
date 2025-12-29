import prisma from '@/lib/prisma';

// 获取商品列表
export async function getProducts(params: {
  storeId?: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  uncategorized?: boolean;
  status?: string;
  styleId?: string;
  search?: string;
  channelCodes?: string[];
}) {
  const { storeId, page = 1, pageSize = 10, categoryId, uncategorized, status, styleId, search, channelCodes } = params;
  const skip = (page - 1) * pageSize;

  try {
    // 构建查询条件
    const where: import('@prisma/client').Prisma.ProductWhereInput = {};

    if (storeId) {
      where.storeId = storeId;
    }

    if (status) {
      where.status = status;
    }

    if (channelCodes && channelCodes.length > 0) {
      where.channels = {
        some: {
          channel: {
            code: { in: channelCodes }
          }
        }
      };
    }

    if (uncategorized) {
      // 查找没有任何分类关联的商品
      where.categories = {
        none: {},
      };
    } else if (categoryId) {
      // 获取该分类及其所有子分类的 ID
      const subCategories = await prisma.storeCategory.findMany({
        where: { parentId: categoryId },
        select: { id: true }
      });

      const categoryIds = [categoryId, ...subCategories.map(c => c.id)];

      // 查找属于这些分类之一的商品
      where.categories = {
        some: {
          categoryId: { in: categoryIds },
        },
      };
    }

    if (styleId) {
      where.styleId = styleId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { displayId: { contains: search } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          style: true,
          variants: {
            orderBy: {
              sortOrder: 'asc'
            }
          },
          channels: {
            include: {
              channel: true
            }
          }
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    throw error;
  }
}

// 获取商品详情
export async function getProductById(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new Error('商品不存在');
    }

    return product;
  } catch (error) {
    throw error;
  }
}

// 创建商品
export async function createProduct(data: {
  storeId: string;
  displayId: string;
  name: string;
  styleId?: string;
  priceRef: string;
  description?: string;
  images: any;
  materials: any;
  status: string;
  sortOrder: number;
  categoryIds?: string[];
}) {
  const { categoryIds, ...rest } = data;
  try {
    const product = await prisma.product.create({
      data: {
        ...rest,
        categories: categoryIds ? {
          create: categoryIds.map(id => ({
            categoryId: id
          }))
        } : undefined
      }
    });
    return product;
  } catch (error) {
    throw error;
  }
}

// 更新商品
export async function updateProduct(
  id: string,
  data: {
    name?: string;
    styleId?: string;
    priceRef?: string;
    description?: string;
    images?: any;
    materials?: any;
    status?: string;
    sortOrder?: number;
    categoryIds?: string[];
  }
) {
  const { categoryIds, ...rest } = data;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        categories: categoryIds ? {
          deleteMany: {},
          create: categoryIds.map(cid => ({
            categoryId: cid
          }))
        } : undefined
      }
    });
    return product;
  } catch (error) {
    throw error;
  }
}

// 删除商品
export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    throw error;
  }
}

// 更新商品状态
export async function updateProductStatus(id: string, status: string) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { status }
    });
    return product;
  } catch (error) {
    throw error;
  }
}
