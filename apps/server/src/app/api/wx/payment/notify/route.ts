import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { WechatService } from '@/lib/wechat';
import { DeliveryPlanGenerator } from '@/lib/delivery-plan-generator';
import { NOTIFICATION_SCENES, NotificationManager } from '@/lib/notification-manager';

export async function POST(req: NextRequest) {
    const traceId = req.headers.get('X-Trace-ID')!;

    try {
        // 获取微信回调数据
        const signature = req.headers.get('Wechatpay-Signature') || '';
        const timestamp = req.headers.get('Wechatpay-Timestamp') || '';
        const nonce = req.headers.get('Wechatpay-Nonce') || '';
        const body = await req.text();

        console.log(`[${traceId}] 收到微信支付回调:`, {
            signature,
            timestamp,
            nonce,
            body // 只记录前200字符
        });

        // 验证签名
        const isValid = WechatService.verifyPaymentNotify(signature, timestamp, nonce, body);
        if (!isValid) {
            console.error(`[${traceId}] 微信支付回调签名验证失败`);
            return new Response('签名验证失败', { status: 400 });
        }

        // 解析回调数据
        const paymentData = JSON.parse(body);
        const { resource } = paymentData;

        console.log('解析回调数据', paymentData)

        if (!resource || !resource.ciphertext) {
            console.error(`[${traceId}] 微信支付回调数据格式错误:`, paymentData);
            return new Response('数据格式错误', { status: 400 });
        }

        // 解密支付结果
        let paymentResult: any;
        try {
            // 验证API密钥格式
            const keyValidation = WechatService.validateApiKey();
            console.log(`[${traceId}] API密钥验证:`, keyValidation);

            // 输出调试信息
            // WechatService.debugDecryptPaymentNotify(resource);

            paymentResult = WechatService.decryptPaymentNotify(resource);
            console.log(`[${traceId}] 解密后的支付结果:`, paymentResult);
        } catch (decryptError) {
            console.error(`[${traceId}] 解密支付数据失败:`, decryptError);
            return new Response('解密失败', { status: 400 });
        }

        // 验证解密后的数据
        if (!paymentResult.out_trade_no || !paymentResult.trade_state) {
            console.error(`[${traceId}] 解密后的数据格式不完整:`, paymentResult);
            return new Response('数据格式不完整', { status: 400 });
        }

        // 查找对应的订单
        const order = await prisma.order.findUnique({
            where: { orderNo: paymentResult.out_trade_no },
            include: {
                orderItems: {
                    include: {
                        product: {
                            select: {
                                productName: true,
                                isSubscription: true,
                                maxDeliveries: true,
                                deliveryType: true,
                                deliveryInterval: true
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            console.error(`[${traceId}] 订单不存在:`, paymentResult.out_trade_no);
            return new Response('订单不存在', { status: 404 });
        }

        // 检查订单状态
        if (order.status !== 0) {
            console.log(`[${traceId}] 订单状态已更新，跳过处理:`, order.id);
            return new Response('SUCCESS', { status: 200 });
        }

        // 支付成功，更新订单状态
        if (paymentResult.trade_state === 'SUCCESS') {
            await prisma.$transaction(async (tx) => {
                // 解析微信支付成功时间
                let wechatSuccessTime: Date | null = null;
                if (paymentResult.success_time) {
                    try {
                        wechatSuccessTime = new Date(paymentResult.success_time);
                    } catch (e) {
                        console.warn(`[${traceId}] 解析微信支付时间失败:`, paymentResult.success_time);
                    }
                }

                // 更新订单状态和微信支付信息
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: 1, // 已支付
                        payType: 1, // 微信支付
                        paidAt: new Date(),
                        // 保存微信支付信息
                        wechatTransactionId: paymentResult.transaction_id,
                        wechatTradeType: paymentResult.trade_type,
                        wechatPayerOpenid: paymentResult.payer?.openid,
                        wechatSuccessTime: wechatSuccessTime,
                        wechatPaymentInfo: paymentResult // 保存完整的支付信息
                    }
                });

                // 更新订单项状态
                for (const orderItem of order.orderItems) {
                    await tx.orderItem.update({
                        where: { id: orderItem.id },
                        data: {
                            // 复制商品的订阅信息到订单项
                            isSubscription: orderItem.product.isSubscription,
                            totalDeliveries: orderItem.product.isSubscription ?
                                (orderItem.product.maxDeliveries || 1) : 1,
                            deliveryType: orderItem.product.isSubscription ?
                                (orderItem.product.deliveryType || 'once') : 'once',
                            deliveryInterval: orderItem.product.isSubscription ?
                                (orderItem.product.deliveryInterval || 30) : 0,
                            // 如果不是送礼订单，则此时就把订单项状态设置为已领取
                            giftStatus: order.isGift ? 0 : 1
                        }
                    });
                }

                // 只有自购订单才立即创建发货计划
                // 送礼订单需要等待接收人确认后才创建发货计划
                if (!order.isGift) {
                    console.log(`[${traceId}] 自购订单，立即创建发货计划`);

                    // 获取订单中保存的地址信息
                    const addressInfo = order.addressSnapshot as any;

                    if (!addressInfo) {
                        console.error(`[${traceId}] 自购订单缺少地址信息:`, order.id);
                        // 自购订单没有地址信息，记录错误但不阻断流程
                    } else {
                        // 为每个订单项创建发货计划
                        for (const orderItem of order.orderItems) {
                            try {
                                // 使用发货计划生成器
                                const deliveryPlans = await DeliveryPlanGenerator.generateDeliveryPlans(tx, {
                                    deliveryType: orderItem.product.deliveryType || 'once',
                                    maxDeliveries: orderItem.product.maxDeliveries || 1,
                                    deliveryInterval: orderItem.product.deliveryInterval || 0,
                                    quantity: orderItem.quantity,
                                    baseDate: new Date()
                                });

                                console.log(`[${traceId}] 为订单项 ${orderItem.id} 生成 ${deliveryPlans.length} 个发货计划`);

                                // 创建发货计划记录
                                for (const plan of deliveryPlans) {
                                    const deliveryPlanData: any = {
                                        deliveryNo: null, // 运营确认时生成
                                        orderItemId: orderItem.id,
                                        userId: order.userId,
                                        receiverId: order.userId, // 自购订单接收人是自己
                                        // 收货信息快照（使用订单中保存的地址）
                                        receiverName: addressInfo.userName,
                                        receiverPhone: addressInfo.telNumber,
                                        receiverAddress: addressInfo.detailInfo,
                                        receiverProvince: addressInfo.provinceName,
                                        receiverCity: addressInfo.cityName,
                                        receiverArea: addressInfo.countyName,
                                        // 发货时间
                                        deliveryStartDate: plan.deliveryStartDate,
                                        deliveryEndDate: plan.deliveryEndDate,
                                        status: 0, // 待确认
                                        deliverySequence: plan.deliverySequence,
                                        remark: plan.remark
                                    };

                                    // 只有当solarTermId存在时才添加
                                    if (plan.solarTermId) {
                                        deliveryPlanData.solarTermId = plan.solarTermId;
                                    }

                                    await tx.deliveryPlan.create({
                                        data: deliveryPlanData
                                    });
                                }

                            } catch (planError) {
                                console.error(`[${traceId}] 为订单项 ${orderItem.id} 生成发货计划失败:`, planError);
                                // 发货计划生成失败，使用默认逻辑
                                await createFallbackDeliveryPlan(tx, orderItem, order, addressInfo, traceId);
                            }
                        }
                    }
                } else {
                    console.log(`[${traceId}] 送礼订单，等待接收人确认后创建发货计划`);
                    // 送礼订单：
                    // 1. 订单状态已更新为已支付
                    // 2. 订单项状态保持为待确认（等待接收人确认）
                    // 3. 不创建发货计划
                    // 4. 48小时后如果未被领取，将触发自动退款
                }

                // 获取商品名称
                const productNames = order.orderItems?.map(item =>
                    item?.product?.productName
                ).join('、') || '商品';

                await NotificationManager.sendNotification({
                    sceneCode: 'PAYMENT_SUCCESS',
                    prismaTransaction: tx,
                    jumpPage: `${NOTIFICATION_SCENES.PAYMENT_SUCCESS.jumpPage}?orderId=${order.id}`,
                    userId: order.userId,
                    businessId: order.id.toString(),
                    businessData: {
                        productName: productNames,
                        orderNo: order.orderNo,
                        orderStatus: '已支付',
                        tips: '您的订单已支付成功，我们将尽快为您处理',
                        time: new Date().toLocaleString('zh-CN')
                    }
                });

                console.log(`[${traceId}] 订单支付成功处理完成:`, {
                    orderId: order.id,
                    orderNo: order.orderNo,
                    amount: order.amount,
                    isGift: order.isGift,
                    deliveryPlansCreated: !order.isGift
                });
            });

            // 返回成功响应给微信
            return new Response('SUCCESS', { status: 200 });
        } else {
            // 支付失败，记录日志
            console.log(`[${traceId}] 订单支付失败:`, {
                orderId: order.id,
                orderNo: order.orderNo,
                tradeState: paymentResult.trade_state
            });

            return new Response('FAIL', { status: 200 });
        }

    } catch (error: any) {
        console.error(`[${traceId}] 处理微信支付回调失败:`, error);
        return new Response('FAIL', { status: 500 });
    }

    // 创建备用发货计划的方法
    async function createFallbackDeliveryPlan(tx: any, orderItem: any, order: any, addressInfo: any, traceId: string) {
        console.log(`[${traceId}] 使用备用发货计划逻辑`);

        const now = new Date();
        const deliveryStartDate = new Date(now);
        const deliveryEndDate = new Date(now);
        deliveryEndDate.setDate(now.getDate() + 3); // 3天内发货

        // 检查是否是16:00之后下单，如果是则推迟到下一天
        if (now.getHours() >= 16) {
            deliveryStartDate.setDate(deliveryStartDate.getDate() + 1);
            deliveryEndDate.setDate(deliveryEndDate.getDate() + 1);
        }

        // 根据商品数量创建发货计划
        for (let j = 0; j < orderItem.quantity; j++) {
            await tx.deliveryPlan.create({
                data: {
                    deliveryNo: null, // 运营确认时生成
                    orderItemId: orderItem.id,
                    userId: order.userId,
                    receiverId: order.userId, // 自购订单接收人是自己
                    // 收货信息快照（使用订单中保存的地址）
                    receiverName: addressInfo.userName,
                    receiverPhone: addressInfo.telNumber,
                    receiverAddress: addressInfo.detailInfo,
                    receiverProvince: addressInfo.provinceName,
                    receiverCity: addressInfo.cityName,
                    receiverArea: addressInfo.countyName,
                    // 发货时间
                    deliveryStartDate,
                    deliveryEndDate,
                    status: 0, // 待确认
                    deliverySequence: 1, // 备用计划序号为1
                    remark: `第${j + 1}份商品 - 备用发货计划`
                }
            });
        }
    }
}
