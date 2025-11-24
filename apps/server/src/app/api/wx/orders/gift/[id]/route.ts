import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getVerifiedToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/auth/types';
import { ApiResponseBuilder } from '@/lib/api-response';
import { z } from 'zod';

const prisma = new PrismaClient();

// GET - 获取礼物详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = request.headers.get('X-Trace-ID') || 'unknown';

  try {
    const orderId = parseInt((await params).id);
    const userId = request.headers.get('X-User-ID')

    if (isNaN(orderId)) {
      return ApiResponseBuilder.error(traceId, '无效的订单ID', 400);
    }

    // 查询礼物详情
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        giftCard: true,
        giftType: true,
        status: true,
        isGift: true,
        orderItems: {
          select: {
            product: {
              select: {
                productName: true,
                coverImages: true
              }
            },
            receiverId: true,
            quantity: true,
            price: true,
            giftStatus: true,
            id: true,
            // 从OrderItem获取赠送信息
            giftMessage: true,
            giftReceiverName: true,
            giftRelationship: true,
          }
        },
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    });

    if (!order) {
      return ApiResponseBuilder.error(traceId, '订单不存在', 404);
    }

    let canReceive = false;
    let message = '';

    // 判断订单是否为已支付状态，且为赠送订单，且未领取
    if (order.status !== 1) {
      message = '该订单不是已支付状态';
    } else if (!order.isGift) {
      message = '该订单不是赠送订单';
    } else if (order.user.id === Number(userId)) {
      message = '不能领取自己的礼物';
    } else {
      // 检查是否有未被当前用户领取的商品
      const hasUnreceivedItems = order.orderItems.some(item => item.receiverId === null);
      const hasAlreadyReceived = order.orderItems.some(item => item.receiverId === Number(userId));

      if (hasAlreadyReceived) {
        message = '您已经领取过该礼物';
      } else if (hasUnreceivedItems) {
        canReceive = true;
      } else {
        message = '该礼物已被他人领取';
      }
    }

    return ApiResponseBuilder.success(traceId, {
      ...order,
      canReceive,
      message
    });

  } catch (error: any) {
    console.error(`[${traceId}] 获取订单详情失败:`, error);
    return ApiResponseBuilder.error(traceId, error.message || '获取订单详情失败', 500);
  }
}
