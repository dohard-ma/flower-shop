import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { z } from 'zod';

const createCouponSchema = z.object({
    name: z.string().min(1, '优惠券名称不能为空'),
    discount: z.number().min(0, '折扣金额不能为负数'),
    minSpend: z.number().min(0, '最低消费不能为负数'),
    startTime: z.string().transform(str => new Date(str)),
    endTime: z.string().transform(str => new Date(str))
});

const updateCouponSchema = createCouponSchema.partial();

// 获取优惠券列表
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const name = searchParams.get('name');
        const status = searchParams.get('status'); // active, expired, all

        const skip = (page - 1) * limit;
        const now = new Date();

        // 构建查询条件
        const where: any = {};

        if (name) {
            where.name = {
                contains: name
            };
        }

        if (status === 'active') {
            where.endTime = {
                gte: now
            };
        } else if (status === 'expired') {
            where.endTime = {
                lt: now
            };
        }

        const [total, coupons] = await Promise.all([
            prisma.coupon.count({ where }),
            prisma.coupon.findMany({
                where,
                skip,
                take: limit,
                orderBy: { id: 'desc' },
                include: {
                    userCoupons: {
                        select: {
                            id: true,
                            status: true,
                            receivedAt: true,
                            usedAt: true,
                            user: {
                                select: {
                                    id: true,
                                    nickname: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        // 添加统计信息
        const couponsWithStats = coupons.map(coupon => {
            const totalReceived = coupon.userCoupons.length;
            const totalUsed = coupon.userCoupons.filter(uc => uc.status === 1).length;
            const totalExpired = coupon.userCoupons.filter(uc => uc.status === 2).length;
            const usageRate = totalReceived > 0 ? (totalUsed / totalReceived * 100).toFixed(2) : '0.00';

            return {
                ...coupon,
                stats: {
                    totalReceived,
                    totalUsed,
                    totalExpired,
                    usageRate: parseFloat(usageRate)
                }
            };
        });

        return ApiResponseBuilder.success(traceId, {
            data: couponsWithStats,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error: any) {
        console.error('获取优惠券列表失败:', error);
        return ApiResponseBuilder.error(traceId, '获取优惠券列表失败', 500);
    }
}

// 创建优惠券
export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const body = await req.json();
        const parseResult = createCouponSchema.safeParse(body);

        if (!parseResult.success) {
            return ApiResponseBuilder.error(traceId, '优惠券数据不完整', 400);
        }

        const { name, discount, minSpend, startTime, endTime } = parseResult.data;

        // 验证时间范围
        if (endTime <= startTime) {
            return ApiResponseBuilder.error(traceId, '结束时间必须晚于开始时间', 400);
        }

        const coupon = await prisma.coupon.create({
            data: {
                name,
                discount,
                minSpend,
                startTime,
                endTime
            }
        });

        return ApiResponseBuilder.success(traceId, coupon, '优惠券创建成功');

    } catch (error: any) {
        console.error('创建优惠券失败:', error);
        return ApiResponseBuilder.error(traceId, `创建优惠券失败: ${error.message}`, 500);
    }
}

// 更新优惠券
export async function PUT(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return ApiResponseBuilder.error(traceId, '优惠券ID不能为空', 400);
        }

        const body = await req.json();
        const parseResult = updateCouponSchema.safeParse(body);

        if (!parseResult.success) {
            return ApiResponseBuilder.error(traceId, '优惠券数据不完整', 400);
        }

        const updateData = parseResult.data;

        // 验证时间范围
        if (updateData.startTime && updateData.endTime && updateData.endTime <= updateData.startTime) {
            return ApiResponseBuilder.error(traceId, '结束时间必须晚于开始时间', 400);
        }

        const coupon = await prisma.coupon.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        return ApiResponseBuilder.success(traceId, coupon, '优惠券更新成功');

    } catch (error: any) {
        console.error('更新优惠券失败:', error);
        return ApiResponseBuilder.error(traceId, `更新优惠券失败: ${error.message}`, 500);
    }
}

// 删除优惠券
export async function DELETE(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return ApiResponseBuilder.error(traceId, '优惠券ID不能为空', 400);
        }

        // 检查优惠券是否已被使用
        const userCouponsCount = await prisma.userCoupon.count({
            where: { couponId: parseInt(id) }
        });

        if (userCouponsCount > 0) {
            return ApiResponseBuilder.error(traceId, '该优惠券已被用户领取，无法删除', 400);
        }

        await prisma.coupon.delete({
            where: { id: parseInt(id) }
        });

        return ApiResponseBuilder.success(traceId, null, '优惠券删除成功');

    } catch (error: any) {
        console.error('删除优惠券失败:', error);
        return ApiResponseBuilder.error(traceId, `删除优惠券失败: ${error.message}`, 500);
    }
}