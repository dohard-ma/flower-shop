import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 获取发货计划统计数据
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        // 使用事务获取各状态的发货计划数量
        const [pending, confirmed, shipped, completed, stockForecast] = await prisma.$transaction([
            // 待确认
            prisma.deliveryPlan.count({
                where: { status: 0 }
            }),
            // 已确认
            prisma.deliveryPlan.count({
                where: { status: 1 }
            }),
            // 已发货
            prisma.deliveryPlan.count({
                where: { status: 2 }
            }),
            // 已完成
            prisma.deliveryPlan.count({
                where: { status: 3 }
            }),
            // 未来7天需要发货的数量
            prisma.deliveryPlan.count({
                where: {
                    status: { in: [0, 1] }, // 待确认或已确认
                    deliveryStartDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        const stats = {
            pending,
            confirmed,
            shipped,
            completed,
            stockForecast
        };

        return ApiResponseBuilder.success(traceId, stats);
    } catch (error: any) {
        console.error('获取发货计划统计失败:', error);
        return ApiResponseBuilder.error(traceId, '获取发货计划统计失败', 500);
    }
}