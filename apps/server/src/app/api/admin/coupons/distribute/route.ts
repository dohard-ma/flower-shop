import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { z } from 'zod';

const distributeCouponSchema = z.object({
    couponId: z.number().min(1, '优惠券ID不能为空'),
    userIds: z.array(z.number()).min(1, '用户ID列表不能为空'),
    distributeType: z.enum(['specific', 'all']), // specific-指定用户, all-所有用户
});

// 发放优惠券
export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const body = await req.json();
        const parseResult = distributeCouponSchema.safeParse(body);

        if (!parseResult.success) {
            return ApiResponseBuilder.error(traceId, '发放数据不完整', 400);
        }

        const { couponId, userIds, distributeType } = parseResult.data;

        // 验证优惠券是否存在
        const coupon = await prisma.coupon.findUnique({
            where: { id: couponId }
        });

        if (!coupon) {
            return ApiResponseBuilder.error(traceId, '优惠券不存在', 404);
        }

        // 检查优惠券是否已过期
        const now = new Date();
        if (coupon.endTime < now) {
            return ApiResponseBuilder.error(traceId, '优惠券已过期，无法发放', 400);
        }

        let targetUserIds = userIds;

        // 如果是发放给所有用户，获取所有用户ID
        if (distributeType === 'all') {
            const allUsers = await prisma.user.findMany({
                select: { id: true }
            });
            targetUserIds = allUsers.map(user => user.id);
        }

        // 过滤掉已经领取过该优惠券的用户
        const existingUserCoupons = await prisma.userCoupon.findMany({
            where: {
                couponId,
                userId: {
                    in: targetUserIds
                }
            },
            select: { userId: true }
        });

        const existingUserIds = existingUserCoupons.map(uc => uc.userId);
        const newUserIds = targetUserIds.filter(id => !existingUserIds.includes(id));

        if (newUserIds.length === 0) {
            return ApiResponseBuilder.error(traceId, '所有指定用户都已领取过该优惠券', 400);
        }

        // 批量创建用户优惠券记录
        const userCouponsData = newUserIds.map(userId => ({
            userId,
            couponId,
            status: 0, // 未使用
            receivedAt: now
        }));

        const result = await prisma.userCoupon.createMany({
            data: userCouponsData
        });

        return ApiResponseBuilder.success(traceId, {
            distributedCount: result.count,
            skippedCount: existingUserIds.length,
            totalTargeted: targetUserIds.length
        }, `成功发放 ${result.count} 张优惠券`);

    } catch (error: any) {
        console.error('发放优惠券失败:', error);
        return ApiResponseBuilder.error(traceId, `发放优惠券失败: ${error.message}`, 500);
    }
}