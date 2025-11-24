import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 更新发货计划
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const deliveryPlanId = parseInt((await params).id);
        if (isNaN(deliveryPlanId)) {
            return ApiResponseBuilder.error(traceId, '无效的发货计划ID', 400);
        }

        const body = await req.json();
        const {
            receiverName,
            receiverPhone,
            receiverProvince,
            receiverCity,
            receiverArea,
            receiverAddress,
            deliveryStartDate,
            deliveryEndDate,
            subscriptionProductId,
            remark
        } = body;

        // 验证必填字段
        if (!receiverName || !receiverPhone || !receiverAddress || !deliveryStartDate || !deliveryEndDate) {
            return ApiResponseBuilder.error(traceId, '收货人姓名、电话、地址和计划时间为必填项', 400);
        }

        // 验证时间逻辑
        const startDate = new Date(deliveryStartDate);
        const endDate = new Date(deliveryEndDate);
        if (startDate >= endDate) {
            return ApiResponseBuilder.error(traceId, '计划结束时间必须晚于开始时间', 400);
        }

        // 检查发货计划是否存在
        const existingPlan = await prisma.deliveryPlan.findUnique({
            where: { id: deliveryPlanId }
        });

        if (!existingPlan) {
            return ApiResponseBuilder.error(traceId, '发货计划不存在', 404);
        }

        // 处理订阅商品关联
        const updateData: any = {
            receiverName,
            receiverPhone,
            receiverProvince,
            receiverCity,
            receiverArea,
            receiverAddress,
            deliveryStartDate: startDate,
            deliveryEndDate: endDate,
            remark: remark || null
        };

        // 如果提供了订阅商品ID，进行验证和更新
        if (subscriptionProductId !== undefined) {
            if (subscriptionProductId === null || subscriptionProductId === 'none') {
                updateData.subscriptionProductId = null;
            } else {
                const subscriptionProductIdInt = parseInt(subscriptionProductId);

                // 验证订阅商品是否存在且有效
                const subscriptionProduct = await prisma.subscriptionProduct.findUnique({
                    where: { id: subscriptionProductIdInt }
                });

                if (!subscriptionProduct) {
                    return ApiResponseBuilder.error(traceId, `订阅商品 ID ${subscriptionProductIdInt} 不存在`, 400);
                }

                if (!subscriptionProduct.isActive) {
                    return ApiResponseBuilder.error(traceId, `订阅商品 "${subscriptionProduct.productName}" 已下架`, 400);
                }

                updateData.subscriptionProductId = subscriptionProductIdInt;
            }
        }

        // 更新发货计划
        const updatedPlan = await prisma.deliveryPlan.update({
            where: { id: deliveryPlanId },
            data: updateData,
            include: {
                orderItem: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                productName: true,
                                productType: true,
                                isSubscription: true
                            }
                        },
                        order: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        nickname: true,
                                        phone: true
                                    }
                                }
                            }
                        }
                    }
                },
                // 包含关联的订阅商品信息
                subscriptionProduct: {
                    select: {
                        id: true,
                        productName: true,
                        stock: true,
                        isActive: true
                    }
                }
            }
        });

        return ApiResponseBuilder.success(traceId, updatedPlan, '发货计划更新成功');
    } catch (error: any) {
        console.error(`[${traceId}] 更新发货计划失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '更新发货计划失败', 500);
    }
}

// 获取单个发货计划详情
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const deliveryPlanId = parseInt((await params).id);
        if (isNaN(deliveryPlanId)) {
            return ApiResponseBuilder.error(traceId, '无效的发货计划ID', 400);
        }

        const deliveryPlan = await prisma.deliveryPlan.findUnique({
            where: { id: deliveryPlanId },
            include: {
                orderItem: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                productName: true,
                                productType: true,
                                isSubscription: true
                            }
                        },
                        order: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        nickname: true,
                                        phone: true
                                    }
                                }
                            }
                        }
                    }
                },
                // 包含关联的订阅商品信息
                subscriptionProduct: {
                    select: {
                        id: true,
                        productName: true,
                        stock: true,
                        isActive: true
                    }
                }
            }
        });

        if (!deliveryPlan) {
            return ApiResponseBuilder.error(traceId, '发货计划不存在', 404);
        }

        return ApiResponseBuilder.success(traceId, deliveryPlan);
    } catch (error: any) {
        console.error(`[${traceId}] 获取发货计划详情失败:`, error);
        return ApiResponseBuilder.error(traceId, '获取发货计划详情失败', 500);
    }
}