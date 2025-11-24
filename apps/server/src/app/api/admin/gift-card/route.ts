import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - 获取电子封面列表
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const type = searchParams.get('type') || 'system'; // system 或 user
        const sortBy = searchParams.get('sortBy') || 'id';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const skip = (page - 1) * limit;

        // 根据type设置查询条件
        const whereCondition = type === 'system'
            ? { userId: null }
            : { userId: { not: null } };

        // 查询数据
        const [covers, total] = await Promise.all([
            prisma.diyCover.findMany({
                where: whereCondition,
                include: type === 'user' ? {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            nickname: true,
                            avatar: true
                        }
                    }
                } : undefined,
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip,
                take: limit
            }),
            prisma.diyCover.count({
                where: whereCondition
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data: {
                data: covers,
                total,
                page,
                limit,
                totalPages
            }
        });

    } catch (error) {
        console.error('获取电子封面列表失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '获取电子封面列表失败'
            },
            { status: 500 }
        );
    }
}

// POST - 创建电子封面
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, backgroundImage } = body;

        // 验证必填字段
        if (!backgroundImage) {
            return NextResponse.json(
                {
                    success: false,
                    error: '背景图片为必填项'
                },
                { status: 400 }
            );
        }

        // 如果是用户封面，验证userId
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) }
            });

            if (!user) {
                return NextResponse.json(
                    {
                        success: false,
                        error: '用户不存在'
                    },
                    { status: 400 }
                );
            }
        }

        // 创建电子封面
        const cover = await prisma.diyCover.create({
            data: {
                userId: userId ? parseInt(userId) : null,
                backgroundImage
            },
            include: {
                user: userId ? {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        avatar: true
                    }
                } : undefined
            }
        });

        return NextResponse.json({
            success: true,
            data: cover,
            message: '电子封面创建成功'
        });

    } catch (error) {
        console.error('创建电子封面失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '创建电子封面失败'
            },
            { status: 500 }
        );
    }
}

// PUT - 更新电子封面
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: '缺少封面ID'
                },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { userId, backgroundImage } = body;

        // 验证封面是否存在
        const existingCover = await prisma.diyCover.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingCover) {
            return NextResponse.json(
                {
                    success: false,
                    error: '电子封面不存在'
                },
                { status: 404 }
            );
        }

        // 如果是用户封面，验证userId
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) }
            });

            if (!user) {
                return NextResponse.json(
                    {
                        success: false,
                        error: '用户不存在'
                    },
                    { status: 400 }
                );
            }
        }

        // 更新电子封面
        const cover = await prisma.diyCover.update({
            where: { id: parseInt(id) },
            data: {
                userId: userId ? parseInt(userId) : null,
                backgroundImage: backgroundImage || existingCover.backgroundImage
            },
            include: {
                user: userId ? {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        avatar: true
                    }
                } : undefined
            }
        });

        return NextResponse.json({
            success: true,
            data: cover,
            message: '电子封面更新成功'
        });

    } catch (error) {
        console.error('更新电子封面失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '更新电子封面失败'
            },
            { status: 500 }
        );
    }
}

// DELETE - 删除电子封面
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: '缺少封面ID'
                },
                { status: 400 }
            );
        }

        // 验证封面是否存在
        const existingCover = await prisma.diyCover.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingCover) {
            return NextResponse.json(
                {
                    success: false,
                    error: '电子封面不存在'
                },
                { status: 404 }
            );
        }

        // // 检查是否有订单正在使用此封面
        // const orderCount = await prisma.order.count({
        //     where: { coverId: parseInt(id) }
        // });

        // if (orderCount > 0) {
        //     return NextResponse.json(
        //         {
        //             success: false,
        //             error: `无法删除，此封面正被 ${orderCount} 个订单使用`
        //         },
        //         { status: 400 }
        //     );
        // }

        // 删除电子封面
        await prisma.diyCover.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({
            success: true,
            message: '电子封面删除成功'
        });

    } catch (error) {
        console.error('删除电子封面失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '删除电子封面失败'
            },
            { status: 500 }
        );
    }
}