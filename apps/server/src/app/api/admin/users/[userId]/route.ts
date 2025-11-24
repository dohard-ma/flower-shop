import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';

// 用户更新验证模式
const userUpdateSchema = z.object({
    nickname: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    gender: z.number().min(0).max(2).optional(),
    birthday: z.string().optional()
});

// GET: 获取单个用户信息
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const userIdInt = Number(userId);
        if (!userId) {
            return ApiResponseBuilder.error('trace-id', '无效的用户ID', 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userIdInt },
            include: {
                membership: true,
                wallet: true,
                addresses: true,
                userCoupons: {
                    include: {
                        coupon: true
                    }
                }
            }
        });

        if (!user) {
            return ApiResponseBuilder.error('trace-id', '用户不存在', 404);
        }

        return ApiResponseBuilder.success('trace-id', user);
    } catch (error: any) {
        console.error('获取用户信息失败:', error);
        return ApiResponseBuilder.error('trace-id', error.message || '获取用户信息失败', 500);
    }
}

// PUT: 更新用户信息
export async function PUT(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = await params;
        const userIdInt = Number(userId);
        if (!userIdInt) {
            return ApiResponseBuilder.error('trace-id', '无效的用户ID', 400);
        }

        const body = await request.json();
        const validatedData = userUpdateSchema.parse(body);

        // 检查用户是否存在
        const existingUser = await prisma.user.findUnique({
            where: { id: userIdInt }
        });

        if (!existingUser) {
            return ApiResponseBuilder.error('trace-id', '用户不存在', 404);
        }

        // 更新用户信息
        const updatedUser = await prisma.user.update({
            where: { id: userIdInt },
            data: {
                ...validatedData,
                ...(validatedData.birthday && {
                    birthday: new Date(validatedData.birthday)
                }),
                updatedAt: new Date()
            },
            include: {
                membership: true,
                wallet: true,
                addresses: true,
                userCoupons: {
                    include: {
                        coupon: true
                    }
                }
            }
        });

        return ApiResponseBuilder.success('trace-id', { data: updatedUser });
    } catch (error: any) {
        console.error('更新用户信息失败:', error);
        if (error instanceof z.ZodError) {
            return ApiResponseBuilder.error('trace-id', '数据验证失败', 400);
        }
        return ApiResponseBuilder.error('trace-id', error.message || '更新用户信息失败', 500);
    }
}

// // DELETE: 删除用户
// export async function DELETE(
//     request: NextRequest,
//     { params }: { params: { userId: string } }
// ) {
//     try {
//         const { userId } = await params;
//         const userIdInt = Number(userId);
//         if (!userIdInt) {
//             return ApiResponseBuilder.error('trace-id', '无效的用户ID', 400);
//         }

//         // 检查用户是否存在
//         const existingUser = await prisma.user.findUnique({
//             where: { id: userIdInt }
//         });

//         if (!existingUser) {
//             return ApiResponseBuilder.error('trace-id', '用户不存在', 404);
//         }

//         // 删除用户
//         await prisma.user.delete({
//             where: { id: userId }
//         });

//         return ApiResponseBuilder.success('trace-id', {
//             message: '用户删除成功'
//         });
//     } catch (error: any) {
//         console.error('删除用户失败:', error);
//         return ApiResponseBuilder.error('trace-id', error.message || '删除用户失败', 500);
//     }
// }
