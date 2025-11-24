import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';

// 导出发货计划Excel
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get('status');
        const productType = searchParams.get('productType');
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // 构建查询条件（与列表API相同的逻辑）
        const where: any = {};

        if (status && status !== 'all') {
            where.status = parseInt(status);
        }

        if (startDate && endDate) {
            where.deliveryStartDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        if (productType && productType !== 'all') {
            where.orderItem = {
                product: {
                    productType: parseInt(productType)
                }
            };
        }

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

        // 查询发货计划数据
        const deliveryPlans = await prisma.deliveryPlan.findMany({
            where,
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
                }
            }
        });

        // 生成CSV格式数据（简化版本，实际项目中可以使用xlsx库）
        const statusMap: Record<number, string> = {
            0: '待确认',
            1: '已确认',
            2: '已发货',
            3: '已完成',
            4: '已取消'
        };

        const productTypeMap: Record<number, string> = {
            1: '年卡',
            2: '礼盒',
            3: '周边'
        };

        const csvHeader = [
            '发货编号',
            '商品名称',
            '商品类型',
            '用户昵称',
            '用户电话',
            '订单号',
            '收货人',
            '收货电话',
            '收货地址',
            '计划开始时间',
            '计划结束时间',
            '状态',
            '快递公司',
            '快递单号',
            '发货时间',
            '备注'
        ].join(',');

        const csvRows = deliveryPlans.map(plan => [
            plan.deliveryNo || '待生成',
            plan.orderItem.product.productName,
            productTypeMap[plan.orderItem.product.productType] || '未知',
            plan.orderItem.order.user.nickname || '未设置',
            plan.orderItem.order.user.phone || '未设置',
            plan.orderItem.order.orderNo,
            plan.receiverName || '待填写',
            plan.receiverPhone || '待填写',
            `${plan.receiverProvince || ''}${plan.receiverCity || ''}${plan.receiverArea || ''}${plan.receiverAddress || ''}`,
            plan.deliveryStartDate.toISOString().split('T')[0],
            plan.deliveryEndDate.toISOString().split('T')[0],
            statusMap[plan.status] || '未知',
            plan.expressCompany || '',
            plan.expressNumber || '',
            plan.deliveryDate ? plan.deliveryDate.toISOString().split('T')[0] : '',
            plan.remark || ''
        ].map(field => `"${field}"`).join(','));

        const csvContent = [csvHeader, ...csvRows].join('\n');

        // 返回CSV文件
        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="delivery-plans-${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error: any) {
        console.error('导出发货计划失败:', error);
        return ApiResponseBuilder.error(traceId, '导出发货计划失败', 500);
    }
}