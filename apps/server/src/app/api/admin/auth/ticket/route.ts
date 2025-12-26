import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponseBuilder } from '@/lib/api-response';
import generateTraceId from '@/lib/generate-trace-id';
import { WechatService } from '@/lib/wechat';

export async function POST(request: NextRequest) {
  const traceId = generateTraceId(request.url);
  try {
    let { storeId, storeCode } = await request.json();

    // 如果没传，使用环境变量中的默认店铺编码
    if (!storeId && !storeCode) {
      storeCode = process.env.DEFAULT_STORE_CODE;
    }

    if (!storeId && !storeCode) {
      return ApiResponseBuilder.error(traceId, '请提供店铺ID或店铺编码', 400);
    }

    // 1. 获取店铺信息
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: storeId || undefined },
          { code: storeCode || undefined }
        ]
      }
    });

    if (!store) {
      return ApiResponseBuilder.error(traceId, '未找到该店铺', 404);
    }

    // 2. 创建登录票据
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效
    const ticket = await prisma.loginTicket.create({
      data: {
        storeId: store.id,
        status: 'PENDING',
        expiresAt
      }
    });

    // 3. 生成小程序码
    // scene 参数: ticketId
    // page 参数: 小程序内负责确认登录的页面
    const scene = ticket.id;
    const page = 'pages/admin/login/index'; // 专门的扫码授权页面

    let qrCodeBuffer: Buffer;
    try {
      qrCodeBuffer = await WechatService.getUnlimitedQRCode(
        scene,
        page,
        store.appId,
        store.appSecret || undefined
      );
    } catch (e: any) {
      console.error('生成小程序码失败:', e);
      return ApiResponseBuilder.error(traceId, `生成小程序码失败: ${e.message}`, 500);
    }

    // 4. 返回票据ID和base64小程序码
    return ApiResponseBuilder.success(traceId, {
      ticketId: ticket.id,
      expiresAt: ticket.expiresAt,
      qrCode: `data:image/png;base64,${qrCodeBuffer.toString('base64')}`
    });
  } catch (error: any) {
    console.error('创建登录票据失败:', error);
    return ApiResponseBuilder.error(traceId, error.message || '内部服务器错误', 500);
  }
}

