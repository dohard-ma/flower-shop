import { NextRequest, NextResponse } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';

// GET - 获取电子封面列表
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id');
        try {

            // 获取请求参数中的type
            const type = request.nextUrl.searchParams.get('type');
            let query = {};
            if (type === 'all') {
                query = {
                    OR: [
                        { userId: null },
                        { userId: userId ? parseInt(userId) : null }
                    ]
                }
            } else {
                // 查询用户自定义的电子封面
                query = {
                    userId: userId ? parseInt(userId) : null
                }
            }

            // 查询系统电子封面和用户自定义的电子封面
            const [covers] = await Promise.all([
                prisma.diyCover.findMany({
                    where: query,
                    orderBy: {
                        createdAt: 'desc'
                    },

                }),

            ]);

            return ApiResponseBuilder.success('trace-id', covers);


        } catch (error) {
            return ApiResponseBuilder.error('trace-id', '获取电子封面列表失败', 500);
        }
    } catch (error) {
        return ApiResponseBuilder.error('trace-id', '获取电子封面列表失败', 500);
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

