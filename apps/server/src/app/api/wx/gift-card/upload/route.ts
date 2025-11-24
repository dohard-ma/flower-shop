import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import { PrismaClient } from '@prisma/client';
import {
    generateUniqueFilename,
    uploadImage,
    OSS_DIR
} from '@/lib/qiniu';

const prisma = new PrismaClient();

// POST - 上传封面图片并创建封面记录
export async function POST(request: NextRequest) {
    const traceId = request.headers.get('X-Trace-ID')!;
    try {
        const userId = request.headers.get('x-user-id');

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
            const imageUrl = await uploadImage(buffer, uniqueFilename, OSS_DIR.PRODUCTS.GIFT_CARD);

            // 创建封面记录
            const cover = await prisma.diyCover.create({
                data: {
                    userId: parseInt(userId!),
                    backgroundImage: imageUrl
                }
            });

            return ApiResponseBuilder.success(traceId, cover);

        } catch (uploadError) {
            console.error('图片上传失败:', uploadError);
            return ApiResponseBuilder.error(traceId, '图片上传失败，请重试', 500);
        }

    } catch (error) {
        console.error('上传封面失败:', error);
        return ApiResponseBuilder.error(traceId, '上传封面失败', 500);
    }
}