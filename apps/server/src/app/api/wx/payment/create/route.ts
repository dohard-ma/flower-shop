import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { WechatService } from '@/lib/wechat';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { z } from 'zod';

// 地址信息验证Schema
const addressSchema = z.object({
    userName: z.string().min(1, '收货人姓名不能为空'),
    telNumber: z.string().min(1, '电话号码不能为空'),
    provinceName: z.string().min(1, '省份不能为空'),
    cityName: z.string().min(1, '城市不能为空'),
    countyName: z.string().min(1, '区县不能为空'),
    detailInfo: z.string().min(1, '详细地址不能为空'),
    postalCode: z.string().optional(),
    nationalCode: z.string().optional()
});

const createPaymentSchema = z.object({
    orderId: z.number().int().positive('订单ID必须是正整数'),
    addressInfo: addressSchema.optional() // 自购订单必须提供，送礼订单可选
});

export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;

    try {
        // 验证用户身份
        const decoded = await getVerifiedToken(req, UserRole.USER);

        const body = await req.json();
        const validation = createPaymentSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponseBuilder.error(
                traceId,
                '参数验证失败',
                400,
                Object.entries(validation.error.flatten().fieldErrors).map(
                    ([field, errors]) => ({
                        field,
                        message: errors?.[0] || '验证失败'
                    })
                )
            );
        }

        const { orderId, addressInfo } = validation.data;

        // 查询订单详情
        const order = await prisma.order.findUnique({
            where: { id: orderId, userId: decoded.userId },
            include: {
                user: {
                    select: {
                        id: true,
                        openid: true,
                        nickname: true
                    }
                },
                orderItems: {
                    include: {
                        product: {
                            select: {
                                productName: true
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

        // 自购订单必须提供地址信息
        if (!order.isGift && !addressInfo) {
            return ApiResponseBuilder.error(traceId, '自购订单必须提供收货地址', 400);
        }

        // 检查用户是否有openid
        if (!order.user.openid) {
            return ApiResponseBuilder.error(traceId, '用户未绑定微信', 400);
        }

        // 如果提供了地址信息，先保存到订单中（作为临时存储）
        if (addressInfo) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    // 使用JSON字段临时存储地址信息
                    addressSnapshot: addressInfo
                }
            });
        }

        // 构建商品描述
        const productNames = order.orderItems.map(item => item.product.productName).join('、');
        const description = `千礼挑一-${productNames}`;

        // 生成支付参数
        const notifyUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/wx/payment/notify`;

        const paymentParams = await WechatService.createPayOrder({
            outTradeNo: order.orderNo,
            description,
            amount: Math.round(Number(order.amount) * 100), // 转换为分
            openid: order.user.openid,
            notifyUrl
        });

        // 记录支付日志
        console.log(`[${traceId}] 创建支付订单成功:`, {
            orderId: order.id,
            orderNo: order.orderNo,
            amount: order.amount,
            userId: order.userId,
            hasAddressInfo: !!addressInfo
        });

        return ApiResponseBuilder.success(traceId, {
            paymentParams,
            orderInfo: {
                id: order.id,
                orderNo: order.orderNo,
                amount: order.amount,
                description
            }
        }, '创建支付订单成功');

    } catch (error: any) {
        console.error(`[${traceId}] 创建支付订单失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '创建支付订单失败', 500);
    }
}