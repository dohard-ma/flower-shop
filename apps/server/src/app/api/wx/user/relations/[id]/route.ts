import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';

const prisma = new PrismaClient();

// 关系类型映射
const relationTypeNames: Record<number, string> = {
    1: '亲人',
    2: '朋友',
    3: '恋人',
    4: '同事',
    5: '其他'
};

// PUT - 更新用户关系
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;
        const relationId = parseInt((await params).id);

        if (isNaN(relationId)) {
            return ApiResponseBuilder.error(traceId, '无效的关系ID', 400);
        }

        const body = await request.json();
        const { relationType, remark } = body;

        if (relationType && ![1, 2, 3, 4, 5].includes(relationType)) {
            return ApiResponseBuilder.error(traceId, '无效的关系类型', 400);
        }

        // 验证关系是否属于当前用户
        const existingRelation = await prisma.userRelation.findFirst({
            where: {
                id: relationId,
                userId: userId
            },
            include: {
                friend: {
                    select: {
                        id: true,
                        nickname: true,
                        avatar: true
                    }
                }
            }
        });

        if (!existingRelation) {
            return ApiResponseBuilder.error(traceId, '关系不存在或无权限操作', 404);
        }

        // 更新关系信息
        const result = await prisma.$transaction(async (tx) => {
            // 更新当前用户的关系记录
            const updatedRelation = await tx.userRelation.update({
                where: { id: relationId },
                data: {
                    ...(relationType && { relationType }),
                    ...(remark !== undefined && { remark })
                },
                include: {
                    friend: {
                        select: {
                            id: true,
                            nickname: true,
                            avatar: true,
                            name: true
                        }
                    }
                }
            });

            // 同时更新对方的关系记录
            if (relationType) {
                await tx.userRelation.updateMany({
                    where: {
                        userId: existingRelation.friendUserId,
                        friendUserId: userId
                    },
                    data: {
                        relationType
                    }
                });
            }

            return updatedRelation;
        });

        return ApiResponseBuilder.success(traceId, {
            id: result.id,
            friendUserId: result.friendUserId,
            relationType: result.relationType,
            relationTypeName: relationTypeNames[result.relationType] || '其他',
            remark: result.remark,
            friend: result.friend
        }, '关系更新成功');

    } catch (error: any) {
        console.error(`[${traceId}] 更新用户关系失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '更新用户关系失败', 500);
    }
}

// DELETE - 删除用户关系
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;
        const relationId = parseInt((await params).id);

        if (isNaN(relationId)) {
            return ApiResponseBuilder.error(traceId, '无效的关系ID', 400);
        }

        // 验证关系是否属于当前用户
        const existingRelation = await prisma.userRelation.findFirst({
            where: {
                id: relationId,
                userId: userId
            }
        });

        if (!existingRelation) {
            return ApiResponseBuilder.error(traceId, '关系不存在或无权限操作', 404);
        }

        // 删除双向关系
        await prisma.$transaction(async (tx) => {
            // 删除当前用户的关系记录
            await tx.userRelation.delete({
                where: { id: relationId }
            });

            // 删除对方的关系记录
            await tx.userRelation.deleteMany({
                where: {
                    userId: existingRelation.friendUserId,
                    friendUserId: userId
                }
            });
        });

        return ApiResponseBuilder.success(traceId, {
            deletedRelationId: relationId
        }, '关系删除成功');

    } catch (error: any) {
        console.error(`[${traceId}] 删除用户关系失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '删除用户关系失败', 500);
    }
}

// GET - 获取单个关系详情
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;
        const relationId = parseInt((await params).id);

        if (isNaN(relationId)) {
            return ApiResponseBuilder.error(traceId, '无效的关系ID', 400);
        }

        // 查询关系详情
        const relation = await prisma.userRelation.findFirst({
            where: {
                id: relationId,
                userId: userId
            },
            include: {
                friend: {
                    select: {
                        id: true,
                        nickname: true,
                        avatar: true,
                        name: true,
                        phone: true
                    }
                }
            }
        });

        if (!relation) {
            return ApiResponseBuilder.error(traceId, '关系不存在或无权限查看', 404);
        }

        // 查询相关的送礼记录
        const giftHistory = await prisma.order.findMany({
            where: {
                OR: [
                    { userId: userId, orderItems: { some: { receiverId: relation.friendUserId } } },
                    { userId: relation.friendUserId, orderItems: { some: { receiverId: userId } } }
                ],
                isGift: true,
                status: { in: [1, 2, 3] } // 已支付、已赠送、已完成
            },
            include: {
                orderItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                productName: true,
                                coverImages: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        nickname: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10 // 最近10条记录
        });

        return ApiResponseBuilder.success(traceId, {
            id: relation.id,
            friendUserId: relation.friendUserId,
            relationType: relation.relationType,
            relationTypeName: relationTypeNames[relation.relationType] || '其他',
            remark: relation.remark,
            friend: relation.friend,
            giftHistory: giftHistory.map(order => ({
                id: order.id,
                orderNo: order.orderNo,
                amount: order.amount,
                createdAt: order.createdAt,
                sender: order.user,
                items: order.orderItems.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price
                }))
            }))
        });

    } catch (error: any) {
        console.error(`[${traceId}] 获取关系详情失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '获取关系详情失败', 500);
    }
}