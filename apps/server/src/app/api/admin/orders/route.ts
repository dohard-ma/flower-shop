import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const traceId = req.headers.get('X-Trace-ID')!;
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const orderBy = searchParams.get('orderBy');
    const orderType = searchParams.get('orderType');
    const status = searchParams.get('status'); // 订单状态筛选

    // 构建排序条件
    const orderCondition: any = {};
    if (orderBy && orderType) {
      orderCondition[orderBy] = orderType;
    } else {
      orderCondition.id = 'desc';
    }

    // 构建查询条件
    const where: any = {};
    if (status && status !== 'all') {
      where.status = parseInt(status);
    }

    // 查询订单列表
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: orderCondition,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  productName: true,
                  price: true,
                  isSubscription: true
                }
              },
              receiver: {
                select: {
                  id: true,
                  nickname: true,
                  phone: true
                }
              }
            }
          }
        }
      })
    ]);

    // 为每个订单添加计算字段
    const ordersWithMeta = orders.map((order: any) => {
      const hasSubscriptionItems = order.orderItems.some((item: any) => item.product.isSubscription);
      const totalItems = order.orderItems.reduce((sum: any, item: any) => sum + item.quantity, 0);
      const mainProduct = order.orderItems[0]?.product;

      return {
        ...order,
        isSubscription: hasSubscriptionItems,
        totalItems,
        mainProductName: mainProduct?.productName || '未知商品'
      };
    });

    return ApiResponseBuilder.success(traceId, {
      data: ordersWithMeta,
      total,
      page,
      limit
    });
  } catch (error: any) {
    console.error('获取订单列表失败:', error);
    return ApiResponseBuilder.error(traceId, '获取订单列表失败', 500);
  }
}

// 取消订单
export async function PUT(req: NextRequest) {
  const traceId = req.headers.get('X-Trace-ID')!;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return ApiResponseBuilder.error(traceId, '订单ID不能为空', 400);
    }

    // 先查询订单及其商品信息，判断是否有订阅商品
    const orderWithItems = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                isSubscription: true
              }
            }
          }
        }
      }
    });

    if (!orderWithItems) {
      return ApiResponseBuilder.error(traceId, '订单不存在', 404);
    }

    const hasSubscriptionItems = orderWithItems.orderItems.some(item => item.product.isSubscription);

    // 更新订单状态
    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status: 4 } // 4-已取消
    });

    // 如果有订阅商品，取消相关的发货计划
    if (hasSubscriptionItems) {
      // 取消相关的发货计划
      await prisma.deliveryPlan.updateMany({
        where: {
          orderItemId: {
            in: orderWithItems.orderItems.map(item => item.id)
          },
          status: {
            in: [0, 1] // 只取消待确认和已确认的计划
          }
        },
        data: { status: 4 } // 4-已取消
      });
    }

    return ApiResponseBuilder.success(traceId, order, '订单取消成功');
  } catch (error: any) {
    console.error('取消订单失败:', error);
    return ApiResponseBuilder.error(traceId, '取消订单失败', 500);
  }
}
