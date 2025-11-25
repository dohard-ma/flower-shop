import prisma from '@/lib/prisma';

// 获取商品列表
export async function getProducts(params: {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  style?: string;
  colorSeries?: string;
  targetAudience?: string;
  search?: string;
}) {
  const { page = 1, pageSize = 10, category, status, style, colorSeries, targetAudience, search } = params;
  const skip = (page - 1) * pageSize;

  try {
    // 构建查询条件
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (style) {
      where.style = style;
    }

    if (colorSeries) {
      where.colorSeries = colorSeries;
    }

    if (search) {
      // 搜索商品名称（MySQL 使用 LIKE）
      where.name = {
        contains: search
      };
    }

    // 先获取所有符合基本条件的商品
    const [allProducts, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.product.count({ where })
    ]);

    // 在应用层过滤 targetAudience（JSON 数组字段）
    let filteredProducts = allProducts;
    if (targetAudience) {
      filteredProducts = allProducts.filter(product => {
        if (!product.targetAudience) return false;
        const audienceArray = Array.isArray(product.targetAudience)
          ? product.targetAudience
          : JSON.parse(product.targetAudience as string);
        return Array.isArray(audienceArray) && audienceArray.includes(targetAudience);
      });
    }

    // 分页处理
    const total = targetAudience ? filteredProducts.length : totalCount;
    const paginatedProducts = filteredProducts.slice(skip, skip + pageSize);

    return {
      list: paginatedProducts,
      total,
      page,
      pageSize
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
  name: string;
  category?: string; // 店主自定义分类
  style?: string; // 商品类型（中文）：花束、花篮等
  storeCode?: string; // 商品编码
  priceRef: string;
  description?: string;
  images: any;
  videos?: any;
  materials: any[];
  stock?: number; // 库存数量
  status: string;
  sortOrder: number;
}) {
  try {
    const product = await prisma.product.create({
      data: {
        ...data
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
    category?: string; // 店主自定义分类
    style?: string; // 商品类型（中文）：花束、花篮等
    storeCode?: string; // 商品编码
    priceRef?: string;
    description?: string;
    images?: any;
    videos?: any;
    materials?: any[];
    stock?: number; // 库存数量
    status?: string;
    sortOrder?: number;
  }
) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data
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
