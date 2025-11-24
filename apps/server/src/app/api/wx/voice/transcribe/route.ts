import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import { transcribeAudio } from '@/lib/api/doubao/chat';

// POST: 语音转文本（接收七牛云的音频URL）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { audioUrl } = body;

        if (!audioUrl) {
            return ApiResponseBuilder.error('trace-id', '缺少音频URL参数', 400);
        }

        console.log('接收音频URL:', audioUrl);

        // 调用豆包AI进行语音转文本
        const text = await transcribeAudio(audioUrl);

        return ApiResponseBuilder.success('trace-id', {
            text
        });

    } catch (error: any) {
        console.error('语音转文本失败:', error);
        return ApiResponseBuilder.error('trace-id', '语音转文本失败', 500, [
            {
                message: error.message
            }
        ]);
    }
}
