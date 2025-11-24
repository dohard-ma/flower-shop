import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { NumberGenerator } from '@/lib/api/number-generator';

export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;

    try {
        // 验证用户身份
        const decoded = await getVerifiedToken(req, UserRole.USER);

        const body = await req.json();
        const { orderId } = body;

        if (!orderId) {
            return ApiResponseBuilder.error(traceId, '订单ID不能为空', 400);
        }

        // 查询订单详情
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: {
                        id: true,
                        nickname: true,
                        wallet: true
                    }
                },
                orderItems: {
                    include: {
                        product: {
                            select: {
                                isSubscription: true,
                                maxDeliveries: true,
                                deliveryType: true,
                                deliveryInterval: true
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            return ApiResponseBuilder.error(traceId, '订单不存在', 404);
        }

        // 验证订单状态
        if (order.status !== 0) {
            return ApiResponseBuilder.error(traceId, '订单状态异常，无法支付', 400);
        }

        // 验证订单所有者
        if (order.userId !== decoded.userId) {
            return ApiResponseBuilder.error(traceId, '无权限操作此订单', 403);
        }

        // 检查用户钱包余额
        if (!order.user.wallet) {
            return ApiResponseBuilder.error(traceId, '用户钱包不存在', 400);
        }

        if (order.user.wallet.balance < order.amount) {
            return ApiResponseBuilder.error(traceId, '余额不足', 400);
        }

        // 执行余额支付
        await prisma.$transaction(async (tx) => {
            // 扣除钱包余额
            await tx.userWallet.update({
                where: { userId: order.userId },
                data: {
                    balance: {
                        decrement: order.amount
                    }
                }
            });

            // 记录钱包交易
            const walletTransaction = await tx.walletTransaction.create({
                data: {
                    userId: order.userId,
                    type: 2, // 消费
                    amount: order.amount,
                    createdAt: new Date(),
                    description: `订单支付-${order.orderNo}`
                }
            });

            // 更新订单状态和余额支付信息
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 1, // 已支付
                    payType: 2, // 余额支付
                    paidAt: new Date(),
                    // 保存余额支付信息
                    balanceAmount: order.amount,
                    balancePayTime: new Date(),
                    walletTransactionId: walletTransaction.id
                }
            });

            // 为订阅商品创建发货计划
            for (const orderItem of order.orderItems) {
                if (orderItem.product.isSubscription) {
                    // 更新订单项的订阅状态
                    await tx.orderItem.update({
                        where: { id: orderItem.id },
                        data: {
                            isSubscription: true,
                            totalDeliveries: orderItem.product.maxDeliveries || 4,
                            deliveryType: orderItem.product.deliveryType || 'interval',
                            deliveryInterval: orderItem.product.deliveryInterval || 30,
                        }
                    });

                    // 获取用户默认地址
                    const defaultAddress = await tx.address.findFirst({
                        where: {
                            userId: order.userId,
                            isDefault: true
                        }
                    });

                    if (!defaultAddress) {
                        console.error(`[${traceId}] 用户没有默认地址:`, order.userId);
                        continue;
                    }

                    // 创建发货计划
                    const maxDeliveries = orderItem.product.maxDeliveries || 4;
                    const deliveryInterval = orderItem.product.deliveryInterval || 30;

                    for (let i = 0; i < maxDeliveries; i++) {
                        const deliveryStartDate = new Date();
                        deliveryStartDate.setDate(deliveryStartDate.getDate() + (i * deliveryInterval));

                        const deliveryEndDate = new Date(deliveryStartDate);
                        deliveryEndDate.setDate(deliveryEndDate.getDate() + 7); // 一周内发货

                        // 生成发货计划编号
                        const deliveryNo = await NumberGenerator.generateUniqueDeliveryPlanNumber();

                        await tx.deliveryPlan.create({
                            data: {
                                deliveryNo,
                                orderItemId: orderItem.id,
                                userId: order.userId,
                                receiverId: orderItem.receiverId || order.userId,
                                // 收货信息快照
                                receiverName: defaultAddress.name,
                                receiverPhone: defaultAddress.phone,
                                receiverAddress: defaultAddress.address,
                                receiverProvince: defaultAddress.province,
                                receiverCity: defaultAddress.city,
                                receiverArea: defaultAddress.area,
                                // 发货时间
                                deliveryStartDate,
                                deliveryEndDate,
                                status: 0, // 待确认
                                deliverySequence: i + 1 // 发货序号
                            }
                        });
                    }
                } else {
                    // 普通商品：创建单个发货计划
                    const defaultAddress = await tx.address.findFirst({
                        where: {
                            userId: order.userId,
                            isDefault: true
                        }
                    });

                    if (!defaultAddress) {
                        console.error(`[${traceId}] 用户没有默认地址:`, order.userId);
                        continue;
                    }

                    const now = new Date();
                    const deliveryStartDate = new Date(now);
                    const deliveryEndDate = new Date(now);
                    deliveryEndDate.setDate(now.getDate() + 3); // 3天内发货

                    // 检查是否是16:00之后下单，如果是则推迟到下一天
                    if (now.getHours() >= 16) {
                        deliveryStartDate.setDate(deliveryStartDate.getDate() + 1);
                        deliveryEndDate.setDate(deliveryEndDate.getDate() + 1);
                    }

                    // 根据商品数量创建多个发货计划
                    for (let j = 0; j < orderItem.quantity; j++) {
                        const deliveryNo = await NumberGenerator.generateUniqueDeliveryPlanNumber();

                        await tx.deliveryPlan.create({
                            data: {
                                deliveryNo,
                                orderItemId: orderItem.id,
                                userId: order.userId,
                                receiverId: orderItem.receiverId || order.userId,
                                // 收货信息快照
                                receiverName: defaultAddress.name,
                                receiverPhone: defaultAddress.phone,
                                receiverAddress: defaultAddress.address,
                                receiverProvince: defaultAddress.province,
                                receiverCity: defaultAddress.city,
                                receiverArea: defaultAddress.area,
                                // 发货时间
                                deliveryStartDate,
                                deliveryEndDate,
                                status: 0, // 待确认
                                deliverySequence: 1 // 普通商品只发一次
                            }
                        });
                    }
                }
            }

            console.log(`[${traceId}] 余额支付成功:`, {
                orderId: order.id,
                orderNo: order.orderNo,
                amount: order.amount,
                userId: order.userId
            });
        });

        return ApiResponseBuilder.success(traceId, {
            orderId: order.id,
            orderNo: order.orderNo,
            amount: order.amount
        }, '余额支付成功');

    } catch (error: any) {
        console.error(`[${traceId}] 余额支付失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '余额支付失败', 500);
    }
}