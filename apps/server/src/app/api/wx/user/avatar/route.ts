import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import {
    generateUniqueFilename,
    uploadImage,
    OSS_DIR
} from '@/lib/qiniu';
import prisma from '@/lib/prisma';

// POST - 上传封面图片并创建封面记录
export async function POST(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID')!;
    try {

        const formData = await request.formData();
        const file = formData.get('image') as File | null;

        if (!file) {
            return ApiResponseBuilder.error(traceId, '请选择要上传的图片', 400);
        }

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            return ApiResponseBuilder.error(traceId, '只能上传图片文件', 400);
        }

        // 验证文件大小 (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return ApiResponseBuilder.error(traceId, '图片大小不能超过5MB', 400);
        }

        try {
            // 上传图片到七牛云
            const buffer = Buffer.from(await file.arrayBuffer());
            const uniqueFilename = generateUniqueFilename(file.name);
            const imageUrl = await uploadImage(buffer, uniqueFilename, OSS_DIR.USERS.AVATAR);

            const userId = parseInt(request.headers.get('X-User-ID')!);
            await prisma.user.update({
                where: { id: userId },
                data: { avatar: imageUrl }
            });

            return ApiResponseBuilder.success(traceId, {
                avatarUrl: imageUrl
            });


        } catch (uploadError) {
            console.error('图片上传失败:', uploadError);
            return ApiResponseBuilder.error(traceId, '图片上传失败，请重试', 500);
        }

    } catch (error) {
        console.error('上传封面失败:', error);
        return ApiResponseBuilder.error(traceId, '上传封面失败', 500);
    }
}