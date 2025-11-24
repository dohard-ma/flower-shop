import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 获取发货计划列表
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // 修改状态筛选为支持多选
        const statusParam = searchParams.get('status');
        let statusFilter: number[] | null = null;
        if (statusParam && statusParam !== 'all') {
            try {
                // 支持逗号分隔的状态值，如 "0,1"
                statusFilter = statusParam.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
            } catch (error) {
                // 如果解析失败，忽略状态筛选
                statusFilter = null;
            }
        }

        const productType = searchParams.get('productType');
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const productCategoryTab = searchParams.get('productCategoryTab') as 'regular' | 'subscription';

        // 构建查询条件
        const where: any = {};

        // 状态筛选 - 支持多选
        if (statusFilter && statusFilter.length > 0) {
            where.status = {
                in: statusFilter
            };
        }

        // 时间筛选
        if (startDate && endDate) {
            where.deliveryStartDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        // 商品分类筛选
        if (productCategoryTab) {
            where.orderItem = {
                product: {
                    isSubscription: productCategoryTab === 'subscription'
                }
            };
        }

        // 商品类型筛选
        if (productType && productType !== 'all') {
            where.orderItem = {
                product: {
                    productType: parseInt(productType)
                }
            };
        }

        // 搜索筛选
        if (search) {
            where.OR = [
                { deliveryNo: { contains: search } },
                { receiverName: { contains: search } },
                { receiverPhone: { contains: search } },
                {
                    orderItem: {
                        order: {
                            orderNo: { contains: search }
                        }
                    }
                },
                {
                    orderItem: {
                        product: {
                            productName: { contains: search }
                        }
                    }
                }
            ];
        }

        // 使用事务查询发货计划列表
        const [total, deliveryPlans] = await prisma.$transaction([
            prisma.deliveryPlan.count({ where }),
            prisma.deliveryPlan.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { deliveryStartDate: 'asc' },
                    { deliverySequence: 'asc' }
                ],
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
            })
        ]);

        // 计算总页数
        const totalPages = Math.ceil(total / limit);

        return ApiResponseBuilder.success(traceId, {
            data: deliveryPlans,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error: any) {
        console.error('获取发货计划列表失败:', error);
        return ApiResponseBuilder.error(traceId, '获取发货计划列表失败', 500);
    }
}