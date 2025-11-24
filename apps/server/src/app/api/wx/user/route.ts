import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import { z } from 'zod';

// 更新用户信息的数据验证Schema
const updateUserSchema = z.object({
    nickname: z.string().min(1, '昵称不能为空').optional(),
    // name: z.string().optional(),
    phone: z.string().nullable().optional(),
    gender: z.number().min(0).max(2).nullable().optional(), // 0未知 1男 2女，允许null
    birthday: z.string().nullable().optional(), // ISO日期字符串，允许null
});

// GET - 获取当前用户信息
export async function GET(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;

    try {
        // 从请求头获取用户ID
        const userId = parseInt(req.headers.get('X-User-ID') || '0');

        if (!userId) {
            return ApiResponseBuilder.error(traceId, '用户未登录', 401);
        }

        // 查询用户信息
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                membership: true,
                wallet: true,
                addresses: true
            }
        });

        if (!user) {
            return ApiResponseBuilder.error(traceId, '用户不存在', 404);
        }
        if (!user.addresses) {
            user.addresses = []
        }
        const defaultAddress = user.addresses.find((address) => address.isDefault) || user.addresses[0];

        // 构造返回数据
        const userData = {
            id: user.id,
            userNo: user.userNo,
            avatar: user.avatar,
            nickname: user.nickname,
            name: user.name,
            phone: user.phone,
            gender: user.gender,
            birthday: user.birthday ? user.birthday.toISOString().split('T')[0] : null,
            membership: user.membership,
            wallet: user.wallet,
            address: defaultAddress
        };
        return ApiResponseBuilder.success(traceId, userData, '获取用户信息成功');

    } catch (error: any) {
        console.error(`[${traceId}] 获取用户信息失败:`, error);
        return ApiResponseBuilder.error(traceId, '获取用户信息失败', 500);
    }
}

// PUT - 更新当前用户信息
export async function PUT(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;

    try {
        // 从请求头获取用户ID
        const userId = parseInt(req.headers.get('X-User-ID')!);

        if (!userId) {
            return ApiResponseBuilder.error(traceId, '用户未登录', 401);
        }

        const body = await req.json();

        // 数据验证
        const validation = updateUserSchema.safeParse(body);

        if (body.phone) {
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(body.phone)) {
                return ApiResponseBuilder.error(traceId, '请输入正确的手机号', 400);
            }
        }
        if (!validation.success) {
            return ApiResponseBuilder.error(
                traceId,
                '数据校验失败',
                400,
                Object.entries(validation.error.flatten().fieldErrors).map(
                    ([field, errors]) => ({
                        field,
                        message: errors?.[0] || '验证失败'
                    })
                )
            );
        }

        const updateData = validation.data;

        // 检查用户是否存在
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return ApiResponseBuilder.error(traceId, '用户不存在', 404);
        }

        // 处理生日字段
        const updatePayload: any = { ...updateData };
        if (updateData.gender) {
            updatePayload.gender = updateData.gender;
        }
        if (updateData.birthday) {
            updatePayload.birthday = new Date(updateData.birthday);
        }

        // 更新用户信息
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updatePayload
        });

        // 构造返回数据
        const userData = {
            id: updatedUser.id,
            avatar: updatedUser.avatar,
            nickname: updatedUser.nickname,
            name: updatedUser.name,
            phone: updatedUser.phone,
            gender: updatedUser?.gender,
            birthday: updatedUser.birthday ? updatedUser.birthday.toISOString().split('T')[0] : null,
        };

        return ApiResponseBuilder.success(traceId, userData, '更新用户信息成功');

    } catch (error: any) {
        console.error(`[${traceId}] 更新用户信息失败:`, error);
        return ApiResponseBuilder.error(traceId, '更新用户信息失败', 500);
    }
}