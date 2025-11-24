import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 获取订单详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = req.headers.get('X-Trace-ID')!;
  try {
    const { id: idNumber } = await params;
    const id = parseInt(idNumber);

    if (isNaN(id)) {
      return ApiResponseBuilder.error(traceId, '订单ID无效', 400);
    }

    // 获取订单详细信息
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true,
            avatar: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                productType: true,
                price: true,
                coverImages: true,
                detail: true,
                isSubscription: true,
                maxDeliveries: true,
                deliveryType: true,
                deliveryInterval: true
              }
            },
            receiver: {
              select: {
                id: true,
                nickname: true,
                phone: true,
                avatar: true
              }
            },
            deliveryPlans: {
              orderBy: [
                { deliverySequence: 'asc' },
                { deliveryStartDate: 'asc' }
              ]
            }
          }
        },
        userCoupon: {
          include: {
            coupon: {
              select: {
                id: true,
                name: true,
                discount: true,
                minSpend: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return ApiResponseBuilder.error(traceId, '订单不存在', 404);
    }

    // 计算订单元数据
    const hasSubscriptionItems = order.orderItems.some((item: any) => item.product.isSubscription);
    const totalItems = order.orderItems.reduce((sum: any, item: any) => sum + item.quantity, 0);

    // 获取主要商品信息
    const mainProduct = order.orderItems[0]?.product;

    // 格式化订单数据
    const orderDetail = {
      ...order,
      isSubscription: hasSubscriptionItems,
      totalItems,
      mainProduct,
      // 兼容前端现有结构
      product: mainProduct,
      receiver: order.orderItems[0]?.receiver, // 取第一个订单项的接收人
      receiverId: order.orderItems[0]?.receiverId,
    };

    return ApiResponseBuilder.success(traceId, orderDetail, '获取订单详情成功');

  } catch (error: any) {
    console.error('获取订单详情失败:', error);
    return ApiResponseBuilder.error(traceId, '获取订单详情失败', 500);
  }
}

// 更新订单状态
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const traceId = req.headers.get('X-Trace-ID')!;
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { status, remark } = body;

    if (isNaN(id)) {
      return ApiResponseBuilder.error(traceId, '订单ID无效', 400);
    }

    // 更新订单状态
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    return ApiResponseBuilder.success(traceId, updatedOrder, '订单状态更新成功');

  } catch (error: any) {
    console.error('更新订单状态失败:', error);
    return ApiResponseBuilder.error(traceId, '更新订单状态失败', 500);
  }
}
