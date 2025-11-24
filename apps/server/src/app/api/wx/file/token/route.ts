import { NextRequest } from "next/server";
import { Logger } from "@/lib/logger";
import { ApiResponseBuilder } from "@/lib/api-response";
import { createOssFile } from "@/lib/api/files";
import { z } from "zod";

const querySchema = z.object({
    type: z.enum(['private', 'public']).default('public')
});

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const traceId = request.headers.get('X-Trace-ID')!

    try {
        const { searchParams } = new URL(request.url);
        const result = querySchema.safeParse(Object.fromEntries(searchParams));

        if (!result.success) {
            return ApiResponseBuilder.error(traceId, "参数验证失败", 400, result.error.errors);
        }

        const { type } = result.data;
        const fileData = await createOssFile();

        Logger.info(traceId, "生成七牛云上传Token", {
            type,
            ossKey: fileData.ossKey,
            responseTime: Date.now() - startTime,
        });

        return ApiResponseBuilder.success(traceId, fileData);

    } catch (error) {
        Logger.error(traceId, "生成七牛云上传Token失败", { error, responseTime: Date.now() - startTime });
        return ApiResponseBuilder.error(traceId, "生成上传Token失败", 500);
    }
}