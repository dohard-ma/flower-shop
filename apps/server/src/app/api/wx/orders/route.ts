import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { NumberGenerator } from '@/lib/api/number-generator';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';

// 状态映射函数
function getStatusMapping(orderType: string | null, statusKey: string): any {
    if (orderType === 'gift') {
        // 赠送订单状态映射
        switch (statusKey) {
            case 'pending': // 待支付
                return { status: 0 };
            case 'unsent': // 未赠送（已支付但未分享）
                return {
                    status: 1,
                    orderItems: {
                        every: { giftRelationship: null }
                    }
                };
            case 'pending_receive': // 待领取（已分享但未领取）
                return {
                    status: 1,
                    orderItems: {
                        some: {
                            giftRelationship: { not: null },
                            giftStatus: 0
                        }
                    }
                };
            case 'received': // 已领取
                return {
                    orderItems: {
                        some: { giftStatus: 1 }
                    }
                };
            case 'refund': // 退款记录
                return { status: 5 };
            default:
                return null;
        }
    } else if (orderType === 'purchase') {
        // 购买订单状态映射
        switch (statusKey) {
            case 'pending': // 待支付
                return { status: 0 };
            case 'pending_ship': // 待发货
                return { status: 1 };
            case 'shipped': // 已发货
                return { status: 2 };
            case 'completed': // 已完成
                return { status: 3 };
            case 'refund': // 退款记录
                return { status: 5 };
            default:
                return null;
        }
    }
    return null;
}

// 计算订单级别的发货进度
function calculateDeliveryProgress(orderItems: any[]) {
    const subscriptionItems = orderItems.filter(item => item.isSubscription);

    if (subscriptionItems.length === 0) {
        // 没有订阅商品，返回普通商品的数量信息
        const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        return {
            totalDeliveries: totalItems,
            deliveredCount: totalItems, // 普通商品支付后即算已发货
            progressPercent: 100,
            hasSubscription: false
        };
    }

    // 有订阅商品，计算总发货进度
    let totalDeliveries = 0;
    let deliveredCount = 0;

    orderItems.forEach(item => {
        if (item.isSubscription) {
            totalDeliveries += item.totalDeliveries * item.quantity;
            deliveredCount += item.deliveredCount * item.quantity;
        } else {
            // 普通商品计为1次发货
            totalDeliveries += item.quantity;
            deliveredCount += item.quantity;
        }
    });

    const progressPercent = totalDeliveries > 0
        ? Math.round((deliveredCount / totalDeliveries) * 100)
        : 0;

    return {
        totalDeliveries,
        deliveredCount,
        progressPercent,
        hasSubscription: true
    };
}

// 计算订单状态
function calculateOrderStatus(order: any) {
    const deliveryProgress = calculateDeliveryProgress(order.orderItems);

    // 基础状态映射
    const baseStatusMap: Record<number, { status: string; statusText: string }> = {
        0: { status: 'pending', statusText: '待支付' },
        1: { status: 'paid', statusText: '已支付' },
        2: { status: 'shipped', statusText: '已发货' },
        3: { status: 'completed', statusText: '已完成' },
        4: { status: 'cancelled', statusText: '已取消' },
        5: { status: 'refunded', statusText: '已退款' }
    };

    let result = baseStatusMap[order.status] || { status: 'unknown', statusText: '未知状态' };

    // 对于已支付的订单，根据发货进度细化状态
    if (order.status === 1) {
        if (order.isGift) {
            // 送礼订单逻辑 - 基于OrderItem级别的赠送信息
            const hasSharedItems = order.orderItems.some((item: any) => item.giftRelationship);

            if (!hasSharedItems) {
                result = { status: 'unsent', statusText: '未赠送' };
            } else {
                const hasUnreceivedItems = order.orderItems.some((item: any) => item.giftStatus === 0);
                if (hasUnreceivedItems) {
                    result = { status: 'pending_receive', statusText: '待领取' };
                } else {
                    result = { status: 'received', statusText: '已领取' };
                }
            }
        } else {
            // 自购订单逻辑
            if (deliveryProgress.hasSubscription) {
                if (deliveryProgress.progressPercent === 0) {
                    result = { status: 'pending_ship', statusText: '待发货' };
                } else if (deliveryProgress.progressPercent < 100) {
                    result = { status: 'partial_shipped', statusText: `发货中 ${deliveryProgress.progressPercent}%` };
                } else {
                    result = { status: 'all_shipped', statusText: '已发货' };
                }
            } else {
                result = { status: 'pending_ship', statusText: '待发货' };
            }
        }
    }

    return result;
}

// 计算礼品状态
function calculateGiftStatus(order: any) {
    if (!order.isGift) {
        return null;
    }

    // 基于OrderItem级别的赠送信息计算状态
    const isShared = order.orderItems.some((item: any) => item.giftRelationship);
    const allReceived = order.orderItems.every((item: any) => item.giftStatus === 1);
    const hasExpired = order.orderItems.some((item: any) => item.giftStatus === 2);

    return {
        isShared,
        isReceived: allReceived,
        canReceive: isShared && !allReceived && !hasExpired,
        hasExpired
    };
}

const createOrderSchema = z.object({
    giftCard: z.string().optional(),
    products: z.array(z.object({
        id: z.number().min(1, '商品ID不能为空'),
        quantity: z.number().min(1, '数量不能为空')
    })),
    giftType: z.number().optional()
});

// 创建订单
export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        const userId = req.headers.get('x-user-id');
        const body = await req.json();
        console.log('body', body);

        const parseResult = createOrderSchema.safeParse(body);

        if (!parseResult.success) {
            return ApiResponseBuilder.error(traceId, '创建订单失败1', 400);
        }

        const { giftCard, products, giftType } = parseResult.data;

        // 验证请求数据
        if (!userId || !products || products.length === 0) {
            return ApiResponseBuilder.error(traceId, '创建订单失败2', 400);
        }

        // 判断用户是否存在编号
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });


        if (!user) {
            return ApiResponseBuilder.error(traceId, '用户不存在', 400);
        }
        if (!user?.userNo) {
            // 生成用户编号
            const userNo = await NumberGenerator.generateUserNumber();
            console.log('userNo', userNo);
            // 更新用户编号
            await prisma.user.update({
                where: { id: parseInt(userId) },
                data: { userNo }
            });

        }

        // 生成订单号
        // const orderNo = await NumberGenerator.generateUniqueOrderNumber();
        const orderNo = NumberGenerator.generateUserOrderNumber();

        // 获取商品详情并计算总价
        const productDetails = await prisma.product.findMany({
            where: {
                id: {
                    in: products.map(product => product.id)
                }
            },
            select: {
                id: true,
                price: true,
                productType: true,
                isSubscription: true,
                maxDeliveries: true,
                deliveryType: true,
                deliveryInterval: true
            }
        });

        let totalPrice = new Decimal(0) as Decimal;
        for (const productDetail of productDetails) {
            const quantity = products.find(p => p.id === productDetail.id)?.quantity || 0;
            totalPrice = totalPrice.add(new Decimal(productDetail.price).mul(quantity));
        }
        const totalPriceNumber = totalPrice.toNumber();
        const isGift = !!giftCard;

        // 使用事务创建订单和订单项（不创建发货计划）
        const result = await prisma.$transaction(async (tx) => {
            // 1. 创建订单
            const order = await tx.order.create({
                data: {
                    orderNo,
                    userId: user.id,
                    giftCard,
                    amount: totalPriceNumber,
                    payType: 1, // 默认微信支付
                    status: 0, // 待支付
                    isGift, // 是否是赠送订单, 只有赠送订单才有封面
                    giftType: giftType,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });

            // 2. 创建订单项
            const orderItems = [];
            for (const productInput of products) {
                const productDetail = productDetails.find(p => p.id === productInput.id);
                if (!productDetail) {
                    throw new Error(`商品${productInput.id}不存在`);
                }

                // 根据赠送类型决定receiverId和创建策略
                if (!isGift) {
                    // 自购订单：接收人是自己，正常创建订单项
                    const orderItem = await tx.orderItem.create({
                        data: {
                            orderId: order.id,
                            productId: productInput.id,
                            quantity: productInput.quantity,
                            price: productDetail.price,
                            receiverId: user.id,
                            isSubscription: productDetail.isSubscription,
                            totalDeliveries: productDetail.isSubscription ? productDetail.maxDeliveries || 4 : 1,
                            deliveryType: productDetail.isSubscription ? productDetail.deliveryType : 'once',
                            deliveryInterval: productDetail.isSubscription ? productDetail.deliveryInterval : 0,
                            deliveredCount: 0
                        }
                    });
                    orderItems.push(orderItem);
                } else {
                    // 送礼订单：根据giftType决定创建策略
                    if (giftType === 1) {
                        // 单人专属：正常创建，一个人领取所有商品
                        const orderItem = await tx.orderItem.create({
                            data: {
                                orderId: order.id,
                                productId: productInput.id,
                                quantity: productInput.quantity,
                                price: productDetail.price,
                                receiverId: null, // 等待领取时确定
                                isSubscription: productDetail.isSubscription,
                                totalDeliveries: productDetail.isSubscription ? productDetail.maxDeliveries || 4 : 1,
                                deliveryType: productDetail.isSubscription ? productDetail.deliveryType : 'once',
                                deliveryInterval: productDetail.isSubscription ? productDetail.deliveryInterval : 0,
                                deliveredCount: 0
                            }
                        });
                        orderItems.push(orderItem);
                    } else if (giftType === 2) {
                        // 多人领取：拆分为独立的订单项，每个quantity=1
                        for (let i = 0; i < productInput.quantity; i++) {
                            const orderItem = await tx.orderItem.create({
                                data: {
                                    orderId: order.id,
                                    productId: productInput.id,
                                    quantity: 1, // 每个订单项只包含1个商品
                                    price: productDetail.price,
                                    receiverId: null, // 等待不同的人领取
                                    isSubscription: productDetail.isSubscription,
                                    totalDeliveries: productDetail.isSubscription ? productDetail.maxDeliveries || 4 : 1,
                                    deliveryType: productDetail.isSubscription ? productDetail.deliveryType : 'once',
                                    deliveryInterval: productDetail.isSubscription ? productDetail.deliveryInterval : 0,
                                    deliveredCount: 0
                                }
                            });
                            orderItems.push(orderItem);
                        }
                    }
                }
            }

            return { order, orderItems };
        });

        // 返回订单信息
        const orderWithDetails = await prisma.order.findUnique({
            where: { id: result.order.id },
            include: {
                orderItems: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        nickname: true,
                        phone: true
                    }
                }
            }
        });

        console.log('订单创建成功:', orderWithDetails);

        return ApiResponseBuilder.success(traceId, {
            orderId: result.order.id,
            orderNo: result.order.orderNo,
            order: orderWithDetails
        }, '订单创建成功');

    } catch (error: any) {
        console.error('创建订单失败:', error);
        return ApiResponseBuilder.error(traceId, `创建订单失败: ${error.message}`, 500);
    }
}

// 获取订单列表（用户端）
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;
    try {
        // 从认证中获取用户ID
        const decoded = await getVerifiedToken(req, UserRole.USER);
        const userId = decoded.userId;

        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get('status');
        const productType = searchParams.get('productType');
        const timeRange = searchParams.get('timeRange');
        const orderType = searchParams.get('orderType'); // 新增订单类型筛选
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        // 构建查询条件
        const where: any = { userId };

        // 订单类型筛选
        if (orderType && orderType !== '' && orderType !== 'all') {
            if (orderType === 'gift') {
                where.isGift = true; // 赠送订单
            } else if (orderType === 'purchase') {
                where.isGift = false; // 购买订单
            }
        }

        // 状态筛选
        if (status && status !== '' && status !== 'all') {
            // 处理数字状态（直接传递状态码）
            if (!isNaN(parseInt(status))) {
                where.status = parseInt(status);
            } else {
                // 处理字符串状态（需要根据订单类型映射）
                const statusMap = getStatusMapping(orderType, status);
                if (statusMap) {
                    Object.assign(where, statusMap);
                }
            }
        }

        // 时间范围筛选
        if (timeRange && timeRange !== '') {
            const days = parseInt(timeRange);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            where.createdAt = {
                gte: startDate
            };
        }

        // 商品类型筛选（需要通过订单项关联查询）
        let orderItemsWhere: any = {};
        if (productType && productType !== '') {
            orderItemsWhere = {
                product: {
                    productType: parseInt(productType)
                }
            };
        }

        const [total, orders] = await Promise.all([
            prisma.order.count({
                where: {
                    ...where,
                    ...(Object.keys(orderItemsWhere).length > 0 ? {
                        orderItems: {
                            some: orderItemsWhere
                        }
                    } : {})
                }
            }),
            prisma.order.findMany({
                where: {
                    ...where,
                    ...(Object.keys(orderItemsWhere).length > 0 ? {
                        orderItems: {
                            some: orderItemsWhere
                        }
                    } : {})
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    orderNo: true,
                    amount: true,
                    giftCard: true,
                    payType: true,
                    status: true,
                    isGift: true,
                    giftType: true,
                    createdAt: true,
                    updatedAt: true,
                    orderItems: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            deliveredCount: true,
                            giftStatus: true,
                            isSubscription: true,
                            totalDeliveries: true,
                            deliveryType: true,
                            deliveryInterval: true,
                            // 赠送相关信息
                            giftRelationship: true,
                            giftReceiverName: true,
                            giftMessage: true,
                            product: {
                                select: {
                                    id: true,
                                    productName: true,
                                    productType: true,
                                    price: true,
                                    coverImages: true,
                                }
                            },
                            receiver: {
                                select: {
                                    id: true,
                                    nickname: true,
                                    phone: true,
                                    avatar: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        // 格式化订单数据，添加预计算状态信息
        const formattedOrders = orders.map(order => {
            // 计算订单级别的发货进度
            const deliveryProgress = calculateDeliveryProgress(order.orderItems);

            // 计算订单状态
            const computedStatus = calculateOrderStatus(order);

            // 计算礼品状态
            const giftStatus = calculateGiftStatus(order);

            const orderItems = order.orderItems.map(item => ({
                ...item,
                // 计算单个商品的发货进度
                progressPercent: item.isSubscription && item.totalDeliveries > 0
                    ? Math.round((item.deliveredCount / item.totalDeliveries) * 100)
                    : 0
            }));

            return {
                ...order,
                orderItems,
                // 新增预计算状态
                computedStatus: {
                    orderStatus: computedStatus.status,
                    orderStatusText: computedStatus.statusText,
                    deliveryProgress,
                    giftStatus
                }
            };
        });

        return ApiResponseBuilder.success(traceId, {
            data: formattedOrders,
            total,
            page,
            limit,
            hasMore: page * limit < total
        });

    } catch (error: any) {
        console.error('获取订单列表失败:', error);
        return ApiResponseBuilder.error(traceId, '获取订单列表失败', 500);
    }
}