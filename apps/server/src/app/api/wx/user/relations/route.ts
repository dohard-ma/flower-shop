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

// GET - 获取用户关系列表
export async function GET(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;

        // 获取URL参数
        const { searchParams } = new URL(request.url);
        const relationType = searchParams.get('relationType'); // 筛选关系类型
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');

        // 构建查询条件
        const whereCondition: any = {
            userId: userId
        };

        if (relationType && !isNaN(parseInt(relationType))) {
            whereCondition.relationType = parseInt(relationType);
        }

        // 查询用户关系
        const [relations, total] = await Promise.all([
            prisma.userRelation.findMany({
                where: whereCondition,
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
                },
                orderBy: {
                    id: 'desc'
                },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            prisma.userRelation.count({
                where: whereCondition
            })
        ]);

        // 格式化返回数据
        const formattedRelations = relations.map(relation => ({
            id: relation.id,
            friendUserId: relation.friendUserId,
            relationType: relation.relationType,
            relationTypeName: relationTypeNames[relation.relationType] || '其他',
            remark: relation.remark,
            friend: {
                id: relation.friend.id,
                nickname: relation.friend.nickname,
                avatar: relation.friend.avatar,
                name: relation.friend.name,
                phone: relation.friend.phone
            }
        }));

        // 统计各关系类型数量
        const relationStats = await prisma.userRelation.groupBy({
            by: ['relationType'],
            where: { userId },
            _count: {
                relationType: true
            }
        });

        const stats = relationStats.reduce((acc, stat) => {
            acc[relationTypeNames[stat.relationType] || '其他'] = stat._count.relationType;
            return acc;
        }, {} as Record<string, number>);

        return ApiResponseBuilder.success(traceId, {
            relations: formattedRelations,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            },
            stats
        });

    } catch (error: any) {
        console.error(`[${traceId}] 获取用户关系失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '获取用户关系失败', 500);
    }
}

// POST - 手动添加用户关系
export async function POST(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;

        const body = await request.json();
        const { friendPhone, relationType, remark } = body;

        if (!friendPhone || !relationType) {
            return ApiResponseBuilder.error(traceId, '手机号和关系类型不能为空', 400);
        }

        if (![1, 2, 3, 4, 5].includes(relationType)) {
            return ApiResponseBuilder.error(traceId, '无效的关系类型', 400);
        }

        // 查找好友用户
        const friendUser = await prisma.user.findFirst({
            where: { phone: friendPhone }
        });

        if (!friendUser) {
            return ApiResponseBuilder.error(traceId, '未找到该手机号对应的用户', 404);
        }

        if (friendUser.id === userId) {
            return ApiResponseBuilder.error(traceId, '不能添加自己为好友', 400);
        }

        // 检查是否已存在关系
        const existingRelation = await prisma.userRelation.findFirst({
            where: {
                OR: [
                    { userId: userId, friendUserId: friendUser.id },
                    { userId: friendUser.id, friendUserId: userId }
                ]
            }
        });

        if (existingRelation) {
            return ApiResponseBuilder.error(traceId, '该用户关系已存在', 400);
        }

        // 创建双向关系
        const result = await prisma.$transaction(async (tx) => {
            const relation1 = await tx.userRelation.create({
                data: {
                    userId: userId,
                    friendUserId: friendUser.id,
                    relationType,
                    remark: remark || '手动添加'
                }
            });

            const relation2 = await tx.userRelation.create({
                data: {
                    userId: friendUser.id,
                    friendUserId: userId,
                    relationType,
                    remark: remark || '被添加为好友'
                }
            });

            return { relation1, relation2 };
        });

        return ApiResponseBuilder.success(traceId, {
            relationId: result.relation1.id,
            friendUser: {
                id: friendUser.id,
                nickname: friendUser.nickname,
                avatar: friendUser.avatar,
                name: friendUser.name
            },
            relationType,
            relationTypeName: relationTypeNames[relationType]
        }, '好友关系添加成功');

    } catch (error: any) {
        console.error(`[${traceId}] 添加用户关系失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '添加用户关系失败', 500);
    }
}