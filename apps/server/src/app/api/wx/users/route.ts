import { ApiResponseBuilder } from '@/lib/api-response';
import { Logger } from '@/lib/logger';
import { z } from 'zod';
import { WechatService } from '@/lib/wechat';
import { generateToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import prisma from '@/lib/prisma';

const createUserSchema = z.object({
    code: z.string().min(1, '缺少code')
});

export async function POST(request: Request) {
    const traceId = request.headers.get('X-Trace-ID')!;
    const startTime = Date.now();

    try {
        const body = await request.json();
        const result = createUserSchema.safeParse(body);

        if (!result.success) {
            return ApiResponseBuilder.error(
                traceId,
                '参数验证失败',
                400,
                result.error.errors
            );
        }

        const { code } = result.data;

        // 获取微信openid
        const sessionData = await WechatService.code2Session(code);
        const { openid } = sessionData;

        if (!openid) {
            Logger.error(traceId, '获取openid失败', { sessionData });
            return ApiResponseBuilder.error(traceId, '获取openid失败', 400);
        }

        // 查找或创建用户

        let user = await prisma.user.findUnique({
            where: { openid }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    openid
                }
            });
            Logger.info(traceId, '新用户创建成功', { openid, userId: user?.id });
        }

        // 生成 token
        const token = await generateToken(
            {
                userId: user.id,
                userNo: user?.userNo || '',
                username: user.nickname || '',
                role: UserRole.USER
            },
            UserRole.USER
        );

        const address = await prisma.address.findFirst({
            where: {
                userId: user.id
            }
        });

        Logger.info(traceId, '微信登录成功', {
            openid,
            userId: user.id,
            responseTime: Date.now() - startTime
        });

        return ApiResponseBuilder.success(traceId, {
            ...user,
            userId: user.id,
            token,
            address
        });
    } catch (error) {
        Logger.error(traceId, '用户注册/登录失败', { error });
        return ApiResponseBuilder.error(traceId, '用户注册/登录失败', 500);
    }
}


const updateUserSchema = z.object({
    nickname: z.string().min(1, '昵称不能为空'),
    avatar: z.string().min(1, '头像不能为空'),
    gender: z.number().min(1, '性别不能为空'),
    city: z.string().min(1, '城市不能为空'),
    province: z.string().min(1, '省份不能为空')
});

export async function PUT(request: Request) {
    const traceId = request.headers.get('X-Trace-ID')!;
    try {
        const userId = request.headers.get('X-User-ID')!;

        const body = await request.json();

        const result = updateUserSchema.safeParse(body);
        if (!result.success) {
            return ApiResponseBuilder.error(
                traceId,
                '参数验证失败',
                400,
                result.error.errors
            );
        }

        const { nickname, avatar, gender, city, province } = result.data;
        const user = await prisma.user.update({
            where: { id: Number(userId) },
            data: { nickname, avatar, gender, city, province }
        });

        return ApiResponseBuilder.success(traceId, { user });
    } catch (error) {
        Logger.error(traceId, '更新用户信息失败', { error });
        return ApiResponseBuilder.error(traceId, '更新用户信息失败', 500);
    }
}