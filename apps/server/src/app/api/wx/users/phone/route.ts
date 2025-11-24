import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { WechatService } from '@/lib/wechat';
import { z } from 'zod';

const decryptPhoneNumberSchema = z.object({
    code: z.string().min(1, '缺少code'),
    encryptedData: z.string().min(1, '缺少encryptedData'),
    iv: z.string().min(1, '缺少iv')
});

// POST - 解密手机号
export async function POST(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID')!;
    try {
        const userId = request.headers.get('x-user-id');
        const body = await request.json();


        const result = decryptPhoneNumberSchema.safeParse(body);

        if (!result.success) {
            return ApiResponseBuilder.error(
                traceId,
                '参数验证失败',
                400,
                result.error.errors
            );
        }

        const { code } = result.data;

        // 使用微信的getPhoneNumber专用接口
        const phoneData = await WechatService.getPhoneNumber(code);

        const phoneNumber = phoneData?.phone_info?.phoneNumber;

        if (phoneNumber && userId) {
            // 更新用户手机号
            const user = await prisma.user.update({
                where: { id: parseInt(userId) },
                data: { phone: phoneNumber }
            });

            if (!user) {
                return ApiResponseBuilder.error(traceId, '用户不存在', 400);
            }
        }

        return ApiResponseBuilder.success(traceId, { phoneNumber });

    } catch (error) {
        return ApiResponseBuilder.error(traceId, '解密手机号失败', 500);
    }
}
