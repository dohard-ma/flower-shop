import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';
import { createProduct, updateProduct } from '@/lib/api/products';
import prisma from '@/lib/prisma';

// 小程序商品数据校验 Schema
const wxProductSchema = z.object({
  title: z.string().min(1, { message: '商品标题不能为空' }),
  price: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'number') return val.toString();
    return val;
  }),
  category: z.string().min(1, { message: '商品分类不能为空' }),
  storeCode: z.string().optional(),
  mainFlower: z.string().optional(),
  colorScheme: z.string().optional(),
  targetAudience: z.string().optional(),
  quantity: z.number().optional(),
  style: z.string().optional(),
  stock: z.number().optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  mediaList: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url()
  })).default([]),
  remark: z.string().optional() // 快速录入的原始文本
});

// GET: 获取产品列表
export async function GET() {
  try {
    const [products] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: 'active'
        },
        orderBy: {
          id: 'desc'
        }
      })
    ]);

    return ApiResponseBuilder.success('trace-id', products);
  } catch (error: any) {
    return ApiResponseBuilder.error('trace-id', '获取产品列表失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}

// POST: 创建商品（小程序）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = wxProductSchema.safeParse(body);

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

    const { title, price, category, storeCode, mainFlower, colorScheme, targetAudience, quantity, style, stock, status, mediaList, remark } = validation.data;

    // 组装花材信息
    const materials: any[] = [];
    if (mainFlower) {
      materials.push({
        name: mainFlower,
        quantity: quantity || 1,
        color: colorScheme || '',
        description: targetAudience || ''
      });
    }

    // 提取图片和视频
    const images = mediaList.filter(item => item.type === 'image').map(item => item.url);
    const videos = mediaList.filter(item => item.type === 'video').map(item => item.url);

    // 组装商品描述
    const descriptionParts: string[] = [];
    if (targetAudience) descriptionParts.push(`适用场合：${targetAudience}`);
    if (colorScheme) descriptionParts.push(`颜色系列：${colorScheme}`);
    const description = descriptionParts.length > 0 ? descriptionParts.join('；') : undefined;

    // 状态映射：active/inactive/draft -> ACTIVE/INACTIVE/DRAFT
    const mappedStatus = status === 'active' ? 'ACTIVE' : status === 'inactive' ? 'INACTIVE' : 'DRAFT';

    // 创建商品数据
    const productData = {
      name: title,
      category: category || undefined, // 店主自定义分类，直接存储中文
      style: style || undefined, // 商品类型，直接存储中文（如"花束"、"花篮"等）
      storeCode: storeCode || undefined, // 商品编码
      priceRef: price,
      description,
      images: images.length > 0 ? images : [],
      videos: videos.length > 0 ? videos : undefined,
      materials,
      stock: stock || undefined, // 库存数量
      status: mappedStatus,
      sortOrder: 0,
      remark: remark || undefined // 快速录入的原始文本
    };

    const newProduct = await createProduct(productData);

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '商品创建成功',
      productId: newProduct.id,
      data: newProduct
    });
  } catch (error: any) {
    console.error('创建商品失败:', error);
    return ApiResponseBuilder.error('trace-id', '创建商品失败', 500, [
      { message: error.message }
    ]);
  }
}

// PUT: 更新商品（小程序）
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '商品ID不能为空', 400);
    }

    const body = await request.json();
    const validation = wxProductSchema.partial().safeParse(body);

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

    const data = validation.data;
    const updateData: any = {};

    // 映射字段
    if (data.title) updateData.name = data.title;
    if (data.price !== undefined) {
      // 处理价格，确保转为字符串
      const priceValue = data.price as string | number;
      updateData.priceRef = typeof priceValue === 'number' ? priceValue.toString() : String(priceValue);
    }
    // category 是店主自定义分类，直接存储中文
    if (data.category !== undefined) {
      updateData.category = data.category || undefined;
    }
    // style 是商品类型，直接存储中文（如"花束"、"花篮"等）
    if (data.style !== undefined) {
      updateData.style = data.style || undefined;
    }
    // storeCode 是商品编码
    if (data.storeCode !== undefined) {
      updateData.storeCode = data.storeCode || undefined;
    }
    // stock 是库存数量
    if (data.stock !== undefined) {
      updateData.stock = data.stock || undefined;
    }
    // 状态映射：active/inactive/draft -> ACTIVE/INACTIVE/DRAFT
    if (data.status) {
      updateData.status = data.status === 'active' ? 'ACTIVE' : data.status === 'inactive' ? 'INACTIVE' : 'DRAFT';
    }

    // 组装花材信息
    if (data.mainFlower || data.colorScheme || data.quantity) {
      const materials: any[] = [];
      if (data.mainFlower) {
        materials.push({
          name: data.mainFlower,
          quantity: data.quantity || 1,
          color: data.colorScheme || '',
          description: data.targetAudience || ''
        });
      }
      updateData.materials = materials;
    }

    // 处理媒体列表
    if (data.mediaList) {
      const images = data.mediaList.filter((item: any) => item.type === 'image').map((item: any) => item.url);
      const videos = data.mediaList.filter((item: any) => item.type === 'video').map((item: any) => item.url);
      updateData.images = images.length > 0 ? images : [];
      if (videos.length > 0) updateData.videos = videos;
    }

    // 组装描述（不再包含 style，因为 style 已经单独存储）
    const descriptionParts: string[] = [];
    if (data.targetAudience) descriptionParts.push(`适用场合：${data.targetAudience}`);
    if (data.colorScheme) descriptionParts.push(`颜色系列：${data.colorScheme}`);
    if (descriptionParts.length > 0) {
      updateData.description = descriptionParts.join('；');
    }

    // 处理快速录入的原始文本（remark）
    if (data.remark !== undefined) {
      updateData.remark = data.remark || undefined;
    }

    const updatedProduct = await updateProduct(id, updateData);

    return ApiResponseBuilder.success('trace-id', {
      success: true,
      message: '商品更新成功',
      data: updatedProduct
    });
  } catch (error: any) {
    console.error('更新商品失败:', error);
    return ApiResponseBuilder.error('trace-id', '更新商品失败', 500, [
      { message: error.message }
    ]);
  }
}
