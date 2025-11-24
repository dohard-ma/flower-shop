import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';
import { DeliveryPlanGenerator } from '@/lib/delivery-plan-generator';

const prisma = new PrismaClient();

interface AddressInfo {
    nationalCode: string, // 国家编码
    userName: string, // 收货人姓名
    nationalCodeFull: string, // 完整国家编码
    telNumber: string, // 电话号码
    postalCode: string, // 邮政编码
    provinceName: string, // 省份名称
    cityName: string, // 城市名称
    countyName: string, // 区县名称
    streetName: string, // 街道名称
    detailInfo: string, // 详细地址
}

// 地址信息类型
interface ReceiveOrderBody {
    address: AddressInfo;
    orderItemId?: number; // 新增：指定要领取的商品ID
    userInfo?: {
        selectedRelationship: number;
        nickname?: string;
        avatar?: string;
    };
}

// POST - 接收礼物
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份（静默登录，自动注册新用户）
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;
        const orderId = parseInt((await params).id);

        if (isNaN(orderId)) {
            return ApiResponseBuilder.error(traceId, '无效的订单ID', 400);
        }

        // 获取请求体中的地址信息
        const body = await request.json() as ReceiveOrderBody;
        console.log('1111111', body)

        const { address, userInfo, orderItemId } = body;

        if (!address.userName || !address.telNumber || !address.detailInfo) {
            return ApiResponseBuilder.error(traceId, '收货地址信息不完整', 400);
        }

        // 使用事务处理整个领取流程
        const result = await prisma.$transaction(async (tx) => {
            // 1. 验证订单状态
            const order = await tx.order.findUnique({
                where: { id: orderId },
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
                            avatar: true
                        }
                    }
                }
            });

            if (!order) {
                throw new Error('订单不存在');
            }

            // 验证订单基本条件
            if (order.status !== 1) {
                throw new Error('订单未支付，无法领取');
            }

            if (!order.isGift) {
                throw new Error('该订单不是礼品订单');
            }

            // 验证48小时时间限制
            const createdTime = new Date(order.createdAt);
            const expiryTime = new Date(createdTime.getTime() + 48 * 60 * 60 * 1000);
            const now = new Date();

            if (now > expiryTime) {
                throw new Error('礼物已过期，无法领取');
            }

            // 防止自己领取自己的礼物
            if (order.userId === userId) {
                throw new Error('不能领取自己的礼物');
            }

            // 2. 根据赠送类型处理不同逻辑
            let itemsToReceive = [];

            if (order.giftType === 1) {
                // 单人专属：领取所有待领取的商品
                itemsToReceive = order.orderItems.filter(item => item.giftStatus === 0);

                if (itemsToReceive.length === 0) {
                    throw new Error('礼物已被领取');
                }
            } else if (order.giftType === 2) {
                // 多人领取：检查用户是否已领取过
                const hasReceived = await tx.orderItem.findFirst({
                    where: {
                        orderId: order.id,
                        receiverId: userId,
                        giftStatus: 1 // 已领取
                    }
                });

                if (hasReceived) {
                    throw new Error('您已经领取过礼物了');
                }

                // 如果指定了orderItemId，领取指定商品
                if (orderItemId) {
                    const targetItem = order.orderItems.find(item => item.id === orderItemId);

                    if (!targetItem) {
                        throw new Error('指定的商品不存在');
                    }

                    if (targetItem.giftStatus !== 0) {
                        throw new Error('该商品已被领取');
                    }

                    itemsToReceive = [targetItem];
                } else {
                    // 未指定商品，领取第一个可用的商品
                    const availableItems = order.orderItems.filter(item => item.giftStatus === 0);

                    if (availableItems.length === 0) {
                        throw new Error('礼物已被领取完毕');
                    }

                    itemsToReceive = [availableItems[0]];
                }
            } else {
                throw new Error('无效的赠送类型');
            }

            // 更新用户信息
            await tx.user.update({
                where: { id: userId },
                data: {
                    nickname: userInfo?.nickname,
                    avatar: userInfo?.avatar,
                    phone: address.telNumber
                }
            });

            // 3. 更新OrderItem状态
            const updatedItems: any[] = [];
            for (const item of itemsToReceive) {
                const updatedItem = await tx.orderItem.update({
                    where: { id: item.id },
                    data: {
                        receiverId: userId,
                        giftStatus: 1, // 已领取
                        receivedAt: new Date()
                    },
                    include: {
                        product: true
                    }
                });
                updatedItems.push(updatedItem);
            }

            // 4. 创建发货计划
            const deliveryPlans = [];
            for (const item of updatedItems) {
                try {
                    // 使用发货计划生成器
                    const plans = await DeliveryPlanGenerator.generateDeliveryPlans(tx, {
                        deliveryType: item.deliveryType || item.product.deliveryType || 'once',
                        maxDeliveries: item.totalDeliveries || item.product.maxDeliveries || 1,
                        deliveryInterval: item.deliveryInterval || item.product.deliveryInterval || 0,
                        quantity: item.quantity,
                        baseDate: new Date()
                    });

                    console.log(`[${traceId}] 为订单项 ${item.id} 生成 ${plans.length} 个发货计划`);

                    // 创建发货计划记录
                    for (const plan of plans) {
                        const deliveryPlanData: any = {
                            // deliveryNo 在运营确认时生成
                            orderItemId: item.id,
                            userId: order.userId,
                            receiverId: userId,

                            // 收货信息快照
                            receiverName: address.userName,
                            receiverPhone: address.telNumber,
                            receiverAddress: address.detailInfo,
                            receiverProvince: address.provinceName,
                            receiverCity: address.cityName,
                            receiverArea: address.countyName,

                            // 发货时间
                            deliveryStartDate: plan.deliveryStartDate,
                            deliveryEndDate: plan.deliveryEndDate,

                            // 状态和序号
                            status: 0, // 待确认
                            deliverySequence: plan.deliverySequence,
                            remark: plan.remark
                        };

                        // 只有当solarTermId存在时才添加
                        if (plan.solarTermId) {
                            deliveryPlanData.solarTermId = plan.solarTermId;
                        }

                        const deliveryPlan = await tx.deliveryPlan.create({
                            data: deliveryPlanData
                        });
                        deliveryPlans.push(deliveryPlan);
                    }

                } catch (planError) {
                    console.error(`[${traceId}] 为订单项 ${item.id} 生成发货计划失败:`, planError);
                    // // 发货计划生成失败，使用备用逻辑
                    // const fallbackPlan = await createFallbackDeliveryPlan(tx, item, address, order, userId);
                    // deliveryPlans.push(fallbackPlan);
                }
            }

            // 5. 建立用户关系（送礼人 ↔ 收礼人）
            await createUserRelation(tx, order.userId, userId, userInfo?.selectedRelationship);

            // 6. 维护收礼人的地址信息
            await maintainUserAddress(tx, userId, address);

            return {
                orderId: order.id,
                orderNo: order.orderNo,
                receivedItems: updatedItems,
                deliveryPlans: deliveryPlans,
                sender: order.user
            };
        });

        return ApiResponseBuilder.success(traceId, result, '礼物领取成功');

    } catch (error: any) {
        console.error(`[${traceId}] 领取礼物失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '领取礼物失败', 500);
    }
}

// 建立用户关系的辅助函数
async function createUserRelation(
    tx: Prisma.TransactionClient,
    senderUserId: number,
    receiverUserId: number,
    giftRelationship?: number
) {
    try {
        // 检查是否已存在关系（双向检查）
        const existingRelation = await tx.userRelation.findFirst({
            where: {
                OR: [
                    { userId: senderUserId, friendUserId: receiverUserId },
                    { userId: receiverUserId, friendUserId: senderUserId }
                ]
            }
        });

        if (existingRelation) {
            console.log('用户关系已存在，跳过创建');
            return existingRelation;
        }

        // 确定关系类型
        const relationType = giftRelationship || 1; // 默认为好友

        // 创建双向关系
        const relation1 = await tx.userRelation.create({
            data: {
                userId: senderUserId,
                friendUserId: receiverUserId,
                relationType,
                remark: giftRelationship ? `通过赠送礼物建立关系：${giftRelationship}` : '通过赠送礼物建立关系'
            }
        });

        const relation2 = await tx.userRelation.create({
            data: {
                userId: receiverUserId,
                friendUserId: senderUserId,
                relationType,
                remark: giftRelationship ? `通过接收礼物建立关系：${giftRelationship}` : '通过接收礼物建立关系'
            }
        });

        console.log(`成功建立用户关系: ${senderUserId} ↔ ${receiverUserId}, 类型: ${relationType}`);
        return { relation1, relation2 };

    } catch (error) {
        console.error('建立用户关系失败:', error);
        // 关系建立失败不应该影响主流程，只记录日志
        return null;
    }
}

// 维护用户地址信息的辅助函数
async function maintainUserAddress(
    tx: Prisma.TransactionClient,
    userId: number,
    address: AddressInfo
) {
    try {
        // 收礼人是否存在地址
        const hasAddress = await tx.address.findFirst({
            where: {
                userId,
            }
        });

        if (hasAddress) {
            // 更新地址
            return tx.address.update({
                where: { id: hasAddress.id },
                data: address
            });
        }

        // 创建新地址
        const newAddress = await tx.address.create({
            data: {
                userId,
                nationalCode: address.nationalCode,
                userName: address.userName,
                nationalCodeFull: address.nationalCodeFull,
                telNumber: address.telNumber,
                postalCode: address.postalCode,
                provinceName: address.provinceName,
                cityName: address.cityName,
                countyName: address.countyName,
                streetName: address.streetName,
                detailInfo: address.detailInfo,
                isDefault: true // 设为默认地址
            }
        });

        console.log(`成功维护用户地址: ${userId}, 地址ID: ${newAddress.id}`);
        return newAddress;

    } catch (error) {
        console.error('维护用户地址失败:', error);
        // 地址维护失败不应该影响主流程，只记录日志
        return null;
    }
}
