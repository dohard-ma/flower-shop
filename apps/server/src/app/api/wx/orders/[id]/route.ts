import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';
import { z } from 'zod';

const prisma = new PrismaClient();

// GET - 获取订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = request.headers.get('X-Trace-ID') || 'unknown';

  try {
    const authResult = await getVerifiedToken(request, UserRole.USER);
    const userId = authResult.userId;
    const orderId = parseInt((await params).id);

    if (isNaN(orderId)) {
      return ApiResponseBuilder.error(traceId, '无效的订单ID', 400);
    }

    // 查询订单详情，包含每个订单项的发货计划
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                productType: true,
                price: true,
                coverImages: true,
                isSubscription: true,
                maxDeliveries: true,
                deliveryType: true,
                deliveryInterval: true
              }
            },
            receiver: {
              select: {
                nickname: true,
                avatar: true
              }
            },
            deliveryPlans: {
              select: {
                status: true,
                deliveryEndDate: true,
                deliveryDate: true,
                expressNumber: true,
                expressCompany: true,
                receiverName: true,
                receiverPhone: true,
                receiverProvince: true,
                receiverCity: true,
                receiverArea: true,
                receiverAddress: true,
                remark: true,
                deliverySequence: true,
                subscriptionProduct: {
                  select: {
                    id: true,
                    productName: true,
                    coverImage: true
                  }
                }
              },
              where: {
                status: {
                  in: [1, 2, 3, 4]
                }
              },
              orderBy: {
                deliverySequence: 'desc'
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
      }
    });

    if (!order) {
      return ApiResponseBuilder.error(traceId, '订单不存在', 404);
    }

    // 验证订单是否属于当前用户
    if (order.userId !== userId) {
      return ApiResponseBuilder.error(traceId, '无权限查看此订单', 403);
    }

    // 格式化订单数据，添加发货进度信息
    const formattedOrder = {
      ...order,
      orderItems: order.orderItems.map(item => ({
        ...item,
        // 计算发货进度
        progressPercent: item.isSubscription && item.totalDeliveries > 0
          ? Math.round((item.deliveredCount / item.totalDeliveries) * 100)
          : 0,
        // 发货计划已经包含在查询中
        deliveryPlans: item.deliveryPlans
      }))
    };

    return ApiResponseBuilder.success(traceId, formattedOrder);

  } catch (error: any) {
    console.error(`[${traceId}] 获取订单详情失败:`, error);
    return ApiResponseBuilder.error(traceId, error.message || '获取订单详情失败', 500);
  }
}

const updateOrderSchema = z.object({
  orderItemId: z.number().optional(), // 指定要更新的订单项ID，如果不指定则更新所有订单项
  giftRelationship: z.string().optional(),
  giftReceiverName: z.string().optional(),
  giftMessage: z.string().optional()
});


export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = request.headers.get('X-Trace-ID') || 'unknown';
  const orderId = parseInt((await params).id);

  try {
    const authResult = await getVerifiedToken(request, UserRole.USER);
    const userId = authResult.userId;

    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);
    const { orderItemId, ...orderItemData } = validatedData;

    // 验证订单是否属于当前用户
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true }
    });

    if (!order || order.userId !== userId) {
      return ApiResponseBuilder.error(traceId, '订单不存在或无权限', 404);
    }

    // 更新订单项的赠送信息
    if (orderItemId) {
      // 更新指定的订单项
      const orderItem = await prisma.orderItem.update({
        where: {
          id: orderItemId,
          orderId: orderId // 确保订单项属于当前订单
        },
        data: orderItemData
      });

      return ApiResponseBuilder.success(traceId, { updatedOrderItem: orderItem });
    } else {
      // 更新所有订单项（单人专属模式）
      await prisma.orderItem.updateMany({
        where: { orderId: orderId },
        data: orderItemData
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true }
      });

      return ApiResponseBuilder.success(traceId, updatedOrder);
    }

  } catch (error: any) {
    console.error(`[${traceId}] 更新订单信息失败:`, error);
    return ApiResponseBuilder.error(traceId, error.message || '更新订单信息失败', 500);
  }
}