import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

interface DailyBreakdown {
    date: string;
    quantity: number;
    urgentCount: number;
}

// 获取备货预估
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const searchParams = req.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '30');

        const startDate = new Date();
        const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // 查询指定时间范围内的发货计划
        const deliveryPlans = await prisma.deliveryPlan.findMany({
            where: {
                status: { in: [0, 1] }, // 待确认或已确认
                deliveryStartDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                orderItem: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                productName: true
                            }
                        }
                    }
                }
            }
        });

        // 按商品分组统计
        const productStats = new Map();

        deliveryPlans.forEach(plan => {
            const product = plan.orderItem.product;
            const quantity = plan.orderItem.quantity;

            if (!productStats.has(product.id)) {
                productStats.set(product.id, {
                    productId: product.id,
                    productName: product.productName,
                    totalQuantity: 0,
                    dailyBreakdown: new Map<string, DailyBreakdown>()
                });
            }

            const stats = productStats.get(product.id);
            stats.totalQuantity += quantity;

            // 按日期分组
            const dateKey = plan.deliveryStartDate.toISOString().split('T')[0];
            if (!stats.dailyBreakdown.has(dateKey)) {
                stats.dailyBreakdown.set(dateKey, {
                    date: dateKey,
                    quantity: 0,
                    urgentCount: 0
                });
            }

            const dayStats = stats.dailyBreakdown.get(dateKey);
            dayStats.quantity += quantity;

            // 判断是否紧急（超期或即将超期）
            const now = new Date();
            const planEndDate = new Date(plan.deliveryEndDate);
            if (planEndDate <= now || (planEndDate.getTime() - now.getTime()) <= 24 * 60 * 60 * 1000) {
                dayStats.urgentCount += quantity;
            }
        });

        // 转换为数组格式
        const forecast = Array.from(productStats.values()).map(stats => ({
            ...stats,
            dailyBreakdown: (Array.from(stats.dailyBreakdown.values()) as DailyBreakdown[]).sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            )
        }));

        return ApiResponseBuilder.success(traceId, forecast);
    } catch (error: any) {
        console.error('获取备货预估失败:', error);
        return ApiResponseBuilder.error(traceId, '获取备货预估失败', 500);
    }
}