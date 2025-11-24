import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { NOTIFICATION_SCENES, NotificationManager } from '@/lib/notification-manager';
import { z } from 'zod';

const requestSchema = z.object({
    // 发货计划ID列表
    deliveryPlanIds: z.array(z.number()),
    // 订阅商品，次数需要传入发货对应的订阅商品ID
    subscriptionProductMappings: z.any().optional().default({})
});

// 批量确认发货计划
export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const body = await req.json();
        const validation = requestSchema.safeParse(body);
        if (!validation.success) {
            console.error(`[${traceId}] 数据校验失败:`, validation.error);
            return ApiResponseBuilder.error(traceId, '数据校验失败', 400);
        }

        const { deliveryPlanIds, subscriptionProductMappings = {} } = validation.data;

        if (!deliveryPlanIds || !Array.isArray(deliveryPlanIds)) {
            return ApiResponseBuilder.error(traceId, '发货计划ID列表不能为空', 400);
        }

        const result = await prisma.$transaction(async (tx) => {
            // 查询待确认的发货计划，包含相关信息用于发送通知
            const deliveryPlans = await tx.deliveryPlan.findMany({
                where: {
                    id: { in: deliveryPlanIds },
                    status: 0, // 待确认
                    deliveryNo: null // 未生成编号
                },
                include: {
                    orderItem: {
                        include: {
                            product: {
                                select: {
                                    productName: true,
                                    isSubscription: true
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
                    // 如果是礼品订单，还需要获取收礼人信息
                    receiver: {
                        select: {
                            id: true,
                            openid: true,
                            nickname: true
                        }
                    },
                    // 包含已关联的订阅商品信息
                    subscriptionProduct: {
                        select: {
                            id: true,
                            productName: true,
                            stock: true
                        }
                    }
                }
            });

            if (deliveryPlans.length === 0) {
                throw new Error('没有找到待确认的发货计划');
            }

            // 生成发货编号的逻辑（简化版本）
            const generateDeliveryNo = async (num: number) => {
                const today = new Date();
                const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

                // 获取当天已生成的发货编号数量
                const count = await tx.deliveryPlan.count({
                    where: {
                        deliveryNo: {
                            startsWith: dateStr
                        }
                    }
                });

                return Array.from({ length: num }, (_, i) => {
                    return `${dateStr}${String(count + i + 1).padStart(5, '0')}`;
                });
            };

            const deliveryNos = await generateDeliveryNo(deliveryPlans.length);
            // 更新发货计划状态和编号
            const updatePromises = deliveryPlans.map(async (plan, index) => {
                const updateData: any = {
                    deliveryNo: deliveryNos[index],
                    status: 1 // 已确认
                };

                // 如果有订阅商品映射，更新关联的订阅商品
                if (subscriptionProductMappings[plan.id]) {
                    const subscriptionProductId = Number(subscriptionProductMappings[plan.id]);

                    // 验证订阅商品是否存在且有效
                    const subscriptionProduct = await tx.subscriptionProduct.findUnique({
                        where: { id: subscriptionProductId }
                    });

                    if (!subscriptionProduct) {
                        throw new Error(`订阅商品 ID ${subscriptionProductId} 不存在`);
                    }

                    if (!subscriptionProduct.isActive) {
                        throw new Error(`订阅商品 "${subscriptionProduct.productName}" 已下架`);
                    }

                    if (subscriptionProduct.stock <= 0) {
                        throw new Error(`订阅商品 "${subscriptionProduct.productName}" 库存不足`);
                    }

                    updateData.subscriptionProductId = subscriptionProductId;

                    // 减少订阅商品库存
                    await tx.subscriptionProduct.update({
                        where: { id: subscriptionProductId },
                        data: {
                            stock: {
                                decrement: 1
                            }
                        }
                    });
                }

                return tx.deliveryPlan.update({
                    where: { id: plan.id },
                    data: updateData
                });
            });

            await Promise.all(updatePromises);

            // 记录订阅商品关联操作
            const subscriptionMappingCount = Object.keys(subscriptionProductMappings).length;
            if (subscriptionMappingCount > 0) {
                console.log(`[${traceId}] 成功关联 ${subscriptionMappingCount} 个发货计划的订阅商品`);
            }

            return {
                confirmedCount: deliveryPlans.length,
                deliveryNumbers: deliveryNos,
                deliveryPlans, // 返回发货计划信息用于发送通知
                subscriptionMappingCount
            };
        });

        // 发送订阅消息通知
        try {
            // 为发送通知创建新的事务
            await prisma.$transaction(async (tx) => {
                await Promise.all(result.deliveryPlans.map(async (plan: any) => {
                    // 确定通知接收者（优先通知收礼人，如果没有则通知下单用户）
                    // TODO: 要确认中途更改了收礼人，更新 receiver 的时机
                    const recipient = plan.receiver || plan.orderItem.order.user;

                    if (!recipient?.openid) {
                        console.warn(`[${traceId}] 用户 ${recipient?.id} 没有openid，跳过通知`);
                        return;
                    }

                    return await NotificationManager.sendNotification({
                        prismaTransaction: tx,
                        jumpPage: `${NOTIFICATION_SCENES.DELIVERY_NOTICE.jumpPage}?deliveryPlanId=${plan.id}`,
                        sceneCode: 'DELIVERY_NOTICE',
                        userId: plan.orderItem.order.user.id,
                        businessId: plan.orderItem.order.orderNo,
                        businessData: {
                            productName: plan.orderItem.product.productName,
                            orderNo: plan.orderItem.order.orderNo,
                            orderStatus: '商品备货中',
                            tips: '您的商品正在备货，预计3天左右送达！',
                            time: new Date().toLocaleString('zh-CN')
                        }
                    });
                }));
            });

        } catch (error) {
            console.error(`[${traceId}] 发送通知时出错:`, error);
            // 通知失败不影响主流程
        }

        const successMessage = result.subscriptionMappingCount > 0
            ? `发货计划确认成功，已关联 ${result.subscriptionMappingCount} 个订阅商品`
            : '发货计划确认成功';

        return ApiResponseBuilder.success(traceId, {
            confirmedCount: result.confirmedCount,
            deliveryNumbers: result.deliveryNumbers,
            subscriptionMappingCount: result.subscriptionMappingCount
        }, successMessage);
    } catch (error: any) {
        console.error(`[${traceId}] 确认发货计划失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '确认发货计划失败', 500);
    }
}