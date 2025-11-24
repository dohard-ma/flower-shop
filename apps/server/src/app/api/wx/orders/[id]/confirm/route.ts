import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';

const prisma = new PrismaClient();

// POST - 确认收货
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;
        const orderId = parseInt(params.id);

        if (isNaN(orderId)) {
            return ApiResponseBuilder.error(traceId, '无效的订单ID', 400);
        }

        // 验证订单是否存在且属于当前用户
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return ApiResponseBuilder.error(traceId, '订单不存在', 404);
        }

        if (order.userId !== userId) {
            return ApiResponseBuilder.error(traceId, '无权限操作此订单', 403);
        }

        // 验证订单状态（只有已发货的订单才能确认收货）
        if (order.status !== 2) {
            return ApiResponseBuilder.error(traceId, '订单状态不允许确认收货', 400);
        }

        // 更新订单状态为已完成
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 3, // 已完成
                updatedAt: new Date()
            }
        });

        // 更新相关发货计划状态
        await prisma.deliveryPlan.updateMany({
            where: {
                orderItemId: {
                    in: order.orderItems.map(item => item.id)
                },
                status: 2 // 已发货
            },
            data: {
                status: 3 // 已完成
            }
        });

        return ApiResponseBuilder.success(traceId, {
            orderId: order.id,
            orderNo: order.orderNo
        }, '确认收货成功');

    } catch (error: any) {
        console.error(`[${traceId}] 确认收货失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '确认收货失败', 500);
    }
}