import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';

const prisma = new PrismaClient();

// PUT - 更新用户头像和昵称
export async function PUT(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;

        // 获取请求体
        const body = await request.json();
        const { avatar, nickname } = body;

        // 参数验证
        if (!avatar && !nickname) {
            return ApiResponseBuilder.error(traceId, '头像或昵称至少需要提供一个', 400);
        }

        // 验证昵称长度
        if (nickname && (nickname.length < 1 || nickname.length > 20)) {
            return ApiResponseBuilder.error(traceId, '昵称长度必须在1-20个字符之间', 400);
        }

        // 验证头像URL格式（简单验证）
        if (avatar && !avatar.startsWith('http')) {
            return ApiResponseBuilder.error(traceId, '头像必须是有效的URL地址', 400);
        }

        // 构建更新数据
        const updateData: any = {};
        if (avatar) updateData.avatar = avatar;
        if (nickname) updateData.nickname = nickname;

        // 更新用户信息
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                userNo: true,
                avatar: true,
                nickname: true,
                name: true,
                phone: true,
                updatedAt: true
            }
        });

        return ApiResponseBuilder.success(traceId, {
            user: updatedUser
        }, '用户信息更新成功');

    } catch (error: any) {
        console.error(`[${traceId}] 更新用户信息失败:`, error);

        // 处理 Prisma 错误
        if (error.code === 'P2025') {
            return ApiResponseBuilder.error(traceId, '用户不存在', 404);
        }

        return ApiResponseBuilder.error(traceId, error.message || '更新用户信息失败', 500);
    } finally {
        await prisma.$disconnect();
    }
}

// GET - 获取当前用户信息
export async function GET(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID') || 'unknown';

    try {
        // 验证用户身份
        const authResult = await getVerifiedToken(request, UserRole.USER);
        const userId = authResult.userId;

        // 获取用户信息
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                userNo: true,
                openid: true,
                avatar: true,
                nickname: true,
                name: true,
                phone: true,
                gender: true,
                birthday: true,
                city: true,
                province: true,
                allowSubscription: true,
                updatedAt: true,
                membership: {
                    select: {
                        vipType: true,
                        startTime: true,
                        endTime: true,
                        status: true
                    }
                },
                wallet: {
                    select: {
                        balance: true
                    }
                }
            }
        });

        if (!user) {
            return ApiResponseBuilder.error(traceId, '用户不存在', 404);
        }

        return ApiResponseBuilder.success(traceId, { user }, '获取用户信息成功');

    } catch (error: any) {
        console.error(`[${traceId}] 获取用户信息失败:`, error);
        return ApiResponseBuilder.error(traceId, error.message || '获取用户信息失败', 500);
    } finally {
        await prisma.$disconnect();
    }
}