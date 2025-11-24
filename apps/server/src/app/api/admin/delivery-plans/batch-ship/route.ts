import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { NOTIFICATION_SCENES, NotificationManager } from '@/lib/notification-manager';

// 批量发货
export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const body = await req.json();
        const { deliveryPlanIds, expressCompany, expressNumber, remark } = body;

        if (!deliveryPlanIds || !Array.isArray(deliveryPlanIds)) {
            return ApiResponseBuilder.error(traceId, '发货计划ID列表不能为空', 400);
        }

        if (!expressCompany || !expressNumber) {
            return ApiResponseBuilder.error(traceId, '快递公司和快递单号不能为空', 400);
        }

        const result = await prisma.$transaction(async (tx) => {
            // 查询已确认的发货计划，包含相关信息用于发送通知
            const deliveryPlans = await tx.deliveryPlan.findMany({
                where: {
                    id: { in: deliveryPlanIds },
                    status: 1 // 已确认
                },
                include: {
                    orderItem: {
                        include: {
                            product: {
                                select: {
                                    productName: true
                                }
                            },
                            order: {
                                select: {
                                    id: true,
                                    orderNo: true,
                                    user: {
                                        select: {
                                            id: true,
                                            openid: true,
                                            nickname: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    receiver: {
                        select: {
                            id: true,
                            openid: true,
                            nickname: true
                        }
                    }
                }
            });

            if (deliveryPlans.length === 0) {
                throw new Error('没有找到可发货的计划');
            }

            // 更新发货计划状态和物流信息
            const updatePromises = deliveryPlans.map((plan) =>
                tx.deliveryPlan.update({
                    where: { id: plan.id },
                    data: {
                        status: 2, // 已发货
                        expressCompany,
                        expressNumber,
                        deliveryDate: new Date(),
                        remark
                    }
                })
            );

            await Promise.all(updatePromises);

            // 更新 OrderItem 的 deliveredCount
            const orderItemUpdates = new Map<number, number>();
            deliveryPlans.forEach(plan => {
                const orderItemId = plan.orderItem.id;
                orderItemUpdates.set(orderItemId, (orderItemUpdates.get(orderItemId) || 0) + 1);
            });

            // 批量更新 OrderItem 的 deliveredCount
            const orderItemUpdatePromises = Array.from(orderItemUpdates.entries()).map(([orderItemId, increment]) =>
                tx.orderItem.update({
                    where: { id: orderItemId },
                    data: {
                        deliveredCount: {
                            increment: increment
                        }
                    }
                })
            );

            await Promise.all(orderItemUpdatePromises);

            // 检查并更新订单状态
            const orderIds = Array.from(new Set(deliveryPlans.map(plan => plan.orderItem.order.id)));

            for (const orderId of orderIds) {
                // 查询该订单下所有 OrderItem 的发货情况
                const orderItems = await tx.orderItem.findMany({
                    where: { orderId: orderId },
                    select: {
                        id: true,
                        totalDeliveries: true,
                        deliveredCount: true
                    }
                });

                // 检查是否所有 OrderItem 都已完成发货
                const allCompleted = orderItems.every(item =>
                    item.deliveredCount >= item.totalDeliveries
                );

                if (allCompleted) {
                    // 更新订单状态为已完成
                    await tx.order.update({
                        where: { id: orderId },
                        data: { status: 3 } // 已完成
                    });

                    console.log(`[${traceId}] 订单 ${orderId} 所有商品已发货完成，状态更新为已完成`);
                }
            }

            return {
                shippedCount: deliveryPlans.length,
                deliveryPlans, // 返回发货计划信息用于发送通知
                updatedOrderItems: orderItemUpdates.size,
                completedOrders: orderIds.length
            };
        });

        // 发送发货通知 - 使用独立的事务
        try {
            await prisma.$transaction(async (notificationTx) => {
                await Promise.all(result.deliveryPlans.map(async (plan: any) => {
                    // 确定通知接收者（优先通知收礼人，如果没有则通知下单用户）
                    const recipient = plan.receiver || plan.orderItem.order.user;

                    if (!recipient?.openid) {
                        console.warn(`[${traceId}] 用户 ${recipient?.id} 没有openid，跳过通知`);
                        return;
                    }

                    return await NotificationManager.sendNotification({
                        prismaTransaction: notificationTx,
                        sceneCode: 'SHIPPED',
                        userId: plan.orderItem.order.user.id,
                        businessId: plan.orderItem.order.orderNo,
                        businessData: {
                            productName: plan.orderItem.product.productName,
                            orderNo: plan.orderItem.order.orderNo,
                            orderStatus: '已发货',
                            tips: '已发货，请确认收货地址！',
                            time: new Date().toLocaleString('zh-CN')
                        }
                    });
                }));
            });
        } catch (error) {
            console.error(`[${traceId}] 发送发货通知失败:`, error);
            // 通知失败不影响主流程
        }

        return ApiResponseBuilder.success(traceId, {
            shippedCount: result.shippedCount,
            updatedOrderItems: result.updatedOrderItems,
            completedOrders: result.completedOrders
        }, `批量发货成功，已更新 ${result.updatedOrderItems} 个订单项的发货数量`);
    } catch (error: any) {
        console.error(`[${traceId}] 批量发货失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '批量发货失败', 500);
    }
}