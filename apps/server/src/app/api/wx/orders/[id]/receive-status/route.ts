import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';

const prisma = new PrismaClient();

// 类型定义
type OrderWithItems = {
    id: number;
    orderNo: string;
    giftType: number | null;
    status: number;
    isGift: boolean;
    userId: number;
    createdAt: Date;
    orderItems: Array<{
        id: number;
        quantity: number;
        price: any;
        giftStatus: number;
        receivedAt: Date | null;
        product: {
            id: number;
            productName: string;
            coverImages: any;
            price: any;
        };
    }>;
    user: {
        id: number;
        nickname: string | null;
        avatar: string | null;
    };
};

// GET - 检查订单可领取状态
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        const orderId = parseInt((await params).id);

        if (isNaN(orderId)) {
            return ApiResponseBuilder.error(traceId, '无效的订单ID', 400);
        }

        // 尝试获取用户信息（可能未登录）
        let userId = null;
        try {
            const authResult = await getVerifiedToken(request, UserRole.USER);
            userId = authResult.userId;
        } catch {
            // 未登录用户也可以查看状态
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                productName: true,
                                coverImages: true,
                                price: true
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
                }
            }
        }) as OrderWithItems | null;

        if (!order) {
            return ApiResponseBuilder.error(traceId, '订单不存在', 404);
        }

        // 检查基本条件
        let canReceive = true;
        let reason = '';
        let hasReceived = false;

        if (order.status !== 1) {
            canReceive = false;
            reason = '订单未支付';
        } else if (!order.isGift) {
            canReceive = false;
            reason = '该订单不是礼品订单';
        } else {
            // 检查时间限制
            const createdTime = new Date(order.createdAt);
            const expiryTime = new Date(createdTime.getTime() + 48 * 60 * 60 * 1000);
            const now = new Date();
            const isExpired = now > expiryTime;

            if (isExpired) {
                canReceive = false;
                reason = '礼物已过期';
            }

            // 检查用户是否已领取（如果已登录）
            if (userId && canReceive) {
                if (order.userId === userId) {
                    canReceive = false;
                    reason = '不能领取自己的礼物';
                } else {
                    const receivedItem = await prisma.orderItem.findFirst({
                        where: {
                            orderId: order.id,
                            receiverId: userId,
                            giftStatus: 1
                        }
                    });
                    hasReceived = !!receivedItem;

                    if (hasReceived && order.giftType === 2) {
                        canReceive = false;
                        reason = '您已经领取过礼物了';
                    }
                }
            }

            // 检查是否还有可领取的商品
            if (canReceive) {
                const availableItems = order.orderItems.filter(item => item.giftStatus === 0);
                if (availableItems.length === 0) {
                    canReceive = false;
                    reason = '礼物已被领取完毕';
                }
            }
        }

        const availableItems = order.orderItems.filter(item => item.giftStatus === 0);
        const receivedItems = order.orderItems.filter(item => item.giftStatus === 1);
        const availableCount = availableItems.length;
        const totalCount = order.orderItems.length;
        const createdTime = new Date(order.createdAt);
        const expiredAt = new Date(createdTime.getTime() + 48 * 60 * 60 * 1000);
        const isExpired = new Date() > expiredAt;

        return ApiResponseBuilder.success(traceId, {
            // 基本信息
            orderId: order.id,
            orderNo: order.orderNo,
            giftType: order.giftType,

            // 状态信息
            canReceive,
            reason,
            hasReceived,
            isExpired,

            // 统计信息
            availableCount,
            totalCount,
            expiredAt,

            // 商品信息
            availableItems: availableItems.map(item => ({
                id: item.id,
                product: {
                    id: item.product.id,
                    name: item.product.productName,
                    image: item.product.coverImages,
                    price: item.product.price
                },
                quantity: item.quantity,
                price: item.price
            })),
            receivedItems: receivedItems.map(item => ({
                id: item.id,
                product: {
                    id: item.product.id,
                    name: item.product.productName,
                    image: item.product.coverImages,
                    price: item.product.price
                },
                quantity: item.quantity,
                price: item.price,
                receivedAt: item.receivedAt
            })),

            // 送礼人信息
            sender: order.user
        });

    } catch (error: any) {
        console.error(`[${traceId}] 检查领取状态失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '检查领取状态失败', 500);
    }
}