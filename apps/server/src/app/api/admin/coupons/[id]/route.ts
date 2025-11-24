import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 获取优惠券详情
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const id = parseInt(params.id);
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const userStatus = searchParams.get('userStatus'); // 0-未使用, 1-已使用, 2-已过期

        if (isNaN(id)) {
            return ApiResponseBuilder.error(traceId, '优惠券ID无效', 400);
        }

        // 获取优惠券基本信息
        const coupon = await prisma.coupon.findUnique({
            where: { id },
            include: {
                userCoupons: {
                    select: {
                        id: true,
                        status: true
                    }
                }
            }
        });

        if (!coupon) {
            return ApiResponseBuilder.error(traceId, '优惠券不存在', 404);
        }

        // 构建用户优惠券查询条件
        const where: any = {
            couponId: id
        };

        if (userStatus && ['0', '1', '2'].includes(userStatus)) {
            where.status = parseInt(userStatus);
        }

        const skip = (page - 1) * limit;

        // 获取用户优惠券详细信息
        const [total, userCoupons] = await Promise.all([
            prisma.userCoupon.count({ where }),
            prisma.userCoupon.findMany({
                where,
                skip,
                take: limit,
                orderBy: { receivedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickname: true,
                            phone: true,
                            avatar: true
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            orderNo: true,
                            amount: true,
                            createdAt: true
                        }
                    }
                }
            })
        ]);

        // 计算统计信息
        const totalReceived = coupon.userCoupons.length;
        const totalUsed = coupon.userCoupons.filter(uc => uc.status === 1).length;
        const totalExpired = coupon.userCoupons.filter(uc => uc.status === 2).length;
        const totalUnused = coupon.userCoupons.filter(uc => uc.status === 0).length;
        const usageRate = totalReceived > 0 ? (totalUsed / totalReceived * 100).toFixed(2) : '0.00';

        const result = {
            coupon: {
                ...coupon,
                stats: {
                    totalReceived,
                    totalUsed,
                    totalExpired,
                    totalUnused,
                    usageRate: parseFloat(usageRate)
                }
            },
            userCoupons: {
                data: userCoupons,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

        return ApiResponseBuilder.success(traceId, result);

    } catch (error: any) {
        console.error('获取优惠券详情失败:', error);
        return ApiResponseBuilder.error(traceId, '获取优惠券详情失败', 500);
    }
}