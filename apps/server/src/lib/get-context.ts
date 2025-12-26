import { NextRequest } from 'next/server';

// 获取请求中的上下文信息
export default function getContext(request: NextRequest) {
    return {
        traceId: request.headers.get('X-Trace-ID')!,
        storeId: request.headers.get('x-store-id')!,
        userId: request.headers.get('x-user-id')!,
        appId: request.headers.get('x-wechat-appid')!,
    };
}