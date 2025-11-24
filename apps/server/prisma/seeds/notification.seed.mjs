/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

async function seedNotificationSystem() {
    console.log('开始创建通知系统种子数据...');

    // 清空现有通知相关数据
    await prisma.subscriptionMessageLog.deleteMany({});
    await prisma.notificationSendLog.deleteMany({});
    await prisma.subscriptionPermission.deleteMany({});
    await prisma.permissionCollectionConfig.deleteMany({});
    await prisma.notificationScene.deleteMany({});
    await prisma.notificationTemplate.deleteMany({});

    console.log('已清空现有通知数据');

    // 1. 创建通知模板
    const templates = await Promise.all([
        // 订单状态变更通知模板
        prisma.notificationTemplate.create({
            data: {
                templateCode: 'ORDER_STATUS_CHANGE',
                templateName: '订单状态变更通知',
                wechatTemplateId: 'UXitKzFcB8zlW6Q_cHN2YZRwmYYmpRXSujjkF0gvKfQ',
                wechatTemplateNumber: '9830',
                templateTitle: '订单状态变更通知',
                templateCategory: '生鲜/初级食用农产品',
                targetRole: 'customer',
                templateFields: {
                    character_string1: {
                        name: '订单号',
                        type: 'character_string',
                        required: true,
                        maxLength: 20
                    },
                    thing2: {
                        name: '项目名称',
                        type: 'thing',
                        required: true,
                        maxLength: 20
                    },
                    phrase3: {
                        name: '订单状态',
                        type: 'phrase',
                        required: true,
                        maxLength: 5
                    },
                    thing4: {
                        name: '温馨提示',
                        type: 'thing',
                        required: false,
                        maxLength: 20
                    },
                    time7: {
                        name: '更新时间',
                        type: 'time',
                        required: true
                    }
                },
                fieldMapping: {
                    character_string1: 'order.orderNo',
                    thing2: 'order.productNames',
                    phrase3: 'order.statusText',
                    thing4: 'order.tips',
                    time7: 'order.updatedAt'
                },
                jumpPage: 'pages/order/detail/index',
                sceneDescription: '用户支付成功、订单状态变更时发送通知',
                isActive: true
            }
        }),

        // 订单发货通知模板
        prisma.notificationTemplate.create({
            data: {
                templateCode: 'ORDER_DELIVERY',
                templateName: '订单发货通知',
                wechatTemplateId: 'PTnCLoWbKXu6iFMDebEYFb6d3iHlMKvtgCkm1t2qAwQ',
                wechatTemplateNumber: '604',
                templateTitle: '订单发货通知',
                templateCategory: '生鲜/初级食用农产品',
                targetRole: 'user',
                templateFields: {
                    character_string6: {
                        name: '订单编号',
                        type: 'character_string',
                        required: true,
                        maxLength: 20
                    },
                    thing1: {
                        name: '商品信息',
                        type: 'thing',
                        required: true,
                        maxLength: 20
                    },
                    thing7: {
                        name: '快递公司',
                        type: 'thing',
                        required: true,
                        maxLength: 20
                    },
                    character_string8: {
                        name: '快递单号',
                        type: 'character_string',
                        required: true,
                        maxLength: 32
                    },
                    time17: {
                        name: '预计送达时间',
                        type: 'time',
                        required: false
                    }
                },
                fieldMapping: {
                    character_string6: 'delivery.orderNo',
                    thing1: 'delivery.productName',
                    thing7: 'delivery.expressCompany',
                    character_string8: 'delivery.expressNumber',
                    time17: 'delivery.estimatedArrival'
                },
                jumpPage: 'pages/order/logistics/index',
                sceneDescription: '商品发货时向收货人发送通知',
                isActive: true
            }
        }),

        // 促销优惠通知模板
        prisma.notificationTemplate.create({
            data: {
                templateCode: 'PROMOTION_COUPON',
                templateName: '促销优惠通知',
                wechatTemplateId: 'Yy-6b5Xn4ahLRxSugcJqJ7Xetevo6q10HqakVIiog6k',
                wechatTemplateNumber: '8409',
                templateTitle: '促销优惠通知',
                templateCategory: '家居家纺',
                targetRole: 'customer',
                templateFields: {
                    thing1: {
                        name: '活动名称',
                        type: 'thing',
                        required: true,
                        maxLength: 20
                    },
                    thing4: {
                        name: '活动说明',
                        type: 'thing',
                        required: true,
                        maxLength: 20
                    },
                    date2: {
                        name: '开始时间',
                        type: 'date',
                        required: true
                    },
                    date3: {
                        name: '结束时间',
                        type: 'date',
                        required: true
                    }
                },
                fieldMapping: {
                    thing1: 'promotion.name',
                    thing4: 'promotion.description',
                    date2: 'promotion.startTime',
                    date3: 'promotion.endTime'
                },
                jumpPage: 'pages/coupon/list/index',
                sceneDescription: '赠送客户优惠券时发送通知',
                isActive: true
            }
        })
    ]);

    console.log(`创建了 ${templates.length} 个通知模板`);

    // 2. 创建通知场景
    const scenes = await Promise.all([
        // 支付成功场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'PAYMENT_SUCCESS',
                sceneName: '支付成功通知',
                templateId: templates[0].id, // 订单状态变更通知
                triggerCondition: {
                    event: 'order.payment.success',
                    conditions: {
                        orderStatus: 'paid',
                        paymentStatus: 'success'
                    }
                },
                variableMapping: {
                    'order.statusText': '支付成功',
                    'order.tips': '您的订单已支付成功，我们将尽快为您处理'
                },
                isActive: true
            }
        }),

        // 礼物领取成功场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'GIFT_RECEIVED',
                sceneName: '礼物领取成功通知',
                templateId: templates[0].id, // 订单状态变更通知
                triggerCondition: {
                    event: 'gift.received',
                    conditions: {
                        isGift: true,
                        giftStatus: 'received'
                    }
                },
                variableMapping: {
                    'order.statusText': '礼物已领取',
                    'order.tips': '您的礼物已被成功领取，感谢您的心意'
                },
                isActive: true
            }
        }),

        // 发货通知场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'ORDER_SHIPPED',
                sceneName: '订单发货通知',
                templateId: templates[1].id, // 订单发货通知
                triggerCondition: {
                    event: 'order.shipped',
                    conditions: {
                        deliveryStatus: 'shipped'
                    }
                },
                variableMapping: {},
                isActive: true
            }
        }),

        // 发货计划确认场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'DELIVERY_PLAN_CONFIRMED',
                sceneName: '发货计划确认通知',
                templateId: templates[0].id, // 订单状态变更通知
                triggerCondition: {
                    event: 'delivery.plan.confirmed',
                    conditions: {
                        planStatus: 'confirmed'
                    }
                },
                variableMapping: {
                    'order.statusText': '准备发货',
                    'order.tips': '请确认收货地址，我们即将为您发货'
                },
                isActive: true
            }
        }),

        // 礼物超时场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'GIFT_TIMEOUT',
                sceneName: '礼物超时通知',
                templateId: templates[0].id, // 订单状态变更通知
                triggerCondition: {
                    event: 'gift.timeout',
                    conditions: {
                        isGift: true,
                        timeoutHours: 48
                    }
                },
                variableMapping: {
                    'order.statusText': '即将退款',
                    'order.tips': '礼物超时未领取，将在24小时后自动退款'
                },
                isActive: true
            }
        }),

        // 权限不足提醒场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'PERMISSION_REMINDER',
                sceneName: '权限不足提醒',
                templateId: templates[2].id, // 促销优惠通知
                triggerCondition: {
                    event: 'permission.insufficient',
                    conditions: {
                        remainingCount: { lte: 2 }
                    }
                },
                variableMapping: {
                    'promotion.name': '消息通知权限',
                    'promotion.description': '剩余权限不足，建议重新授权'
                },
                isActive: true
            }
        }),

        // 退款通知场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'REFUND_PROCESSED',
                sceneName: '退款处理通知',
                templateId: templates[0].id, // 订单状态变更通知
                triggerCondition: {
                    event: 'order.refund.processed',
                    conditions: {
                        refundStatus: 'processed'
                    }
                },
                variableMapping: {
                    'order.statusText': '已退款',
                    'order.tips': '您的退款已处理完成，请注意查收'
                },
                isActive: true
            }
        }),

        // 优惠券发放场景
        prisma.notificationScene.create({
            data: {
                sceneCode: 'COUPON_GRANTED',
                sceneName: '优惠券发放通知',
                templateId: templates[2].id, // 促销优惠通知
                triggerCondition: {
                    event: 'coupon.granted',
                    conditions: {
                        couponType: 'promotion'
                    }
                },
                variableMapping: {},
                isActive: true
            }
        })
    ]);

    console.log(`创建了 ${scenes.length} 个通知场景`);

    // 3. 创建权限收集配置
    const permissionConfigs = await Promise.all([
        // 购买时权限收集
        prisma.permissionCollectionConfig.create({
            data: {
                triggerCode: 'CUSTOMER_PURCHASE',
                triggerName: '客户购买时',
                targetRole: 'customer',
                collectionStrategy: 'active',
                permissionCount: 3,
                guideConfig: {
                    title: '消息通知',
                    content: '为了及时通知您订单状态，请允许接收消息通知',
                    confirmText: '开启通知',
                    cancelText: '暂不开启'
                },
                isActive: true
            }
        }),

        // 支付成功权限收集
        prisma.permissionCollectionConfig.create({
            data: {
                triggerCode: 'CUSTOMER_PAYMENT',
                triggerName: '客户支付成功',
                targetRole: 'customer',
                collectionStrategy: 'active',
                permissionCount: 2,
                guideConfig: {
                    title: '支付成功',
                    content: '支付成功！开启消息通知，及时了解订单进展',
                    confirmText: '开启通知',
                    cancelText: '暂不开启'
                },
                isActive: true
            }
        }),

        // 地址确认权限收集
        prisma.permissionCollectionConfig.create({
            data: {
                triggerCode: 'ADDRESS_CONFIRM',
                triggerName: '地址确认时',
                targetRole: 'customer',
                collectionStrategy: 'silent',
                permissionCount: 1,
                guideConfig: null,
                isActive: true
            }
        }),

        // 查看详情权限收集
        prisma.permissionCollectionConfig.create({
            data: {
                triggerCode: 'ORDER_DETAIL',
                triggerName: '查看订单详情',
                targetRole: 'customer',
                collectionStrategy: 'silent',
                permissionCount: 1,
                guideConfig: null,
                isActive: true
            }
        }),

        // 收礼时权限收集
        prisma.permissionCollectionConfig.create({
            data: {
                triggerCode: 'USER_GIFT_RECEIVE',
                triggerName: '用户领取礼物',
                targetRole: 'user',
                collectionStrategy: 'active',
                permissionCount: 2,
                guideConfig: {
                    title: '礼物通知',
                    content: '领取礼物时开启通知，享受贴心服务',
                    confirmText: '开启通知',
                    cancelText: '暂不开启'
                },
                isActive: true
            }
        }),

        // 启动小程序权限收集
        prisma.permissionCollectionConfig.create({
            data: {
                triggerCode: 'APP_LAUNCH',
                triggerName: '启动小程序',
                targetRole: 'customer',
                collectionStrategy: 'silent',
                permissionCount: 1,
                guideConfig: null,
                isActive: true
            }
        })
    ]);

    console.log(`创建了 ${permissionConfigs.length} 个权限收集配置`);

    // 4. 获取用户数据并创建一些示例权限和发送记录
    const users = await prisma.user.findMany({ take: 5 });

    if (users.length > 0) {
        // 为用户创建一些权限记录
        const permissions = [];
        for (let i = 0; i < Math.min(3, users.length); i++) {
            const user = users[i];

            // 为每个用户创建不同数量的权限
            const permissionCount = Math.floor(Math.random() * 5) + 1;
            for (let j = 0; j < permissionCount; j++) {
                const permission = await prisma.subscriptionPermission.create({
                    data: {
                        userId: user.id,
                        templateId: templates[j % templates.length].wechatTemplateId,
                        source: ['CUSTOMER_PURCHASE', 'CUSTOMER_PAYMENT', 'USER_GIFT_RECEIVE'][j % 3],
                        grantedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 过去7天内随机时间
                        status: Math.random() > 0.7 ? 'used' : 'available' // 30%概率已使用
                    }
                });
                permissions.push(permission);
            }
        }

        console.log(`创建了 ${permissions.length} 个权限记录`);

        // 创建一些发送记录
        const sendLogs = [];
        for (let i = 0; i < Math.min(10, permissions.length); i++) {
            const permission = permissions[i];
            const scene = scenes[i % scenes.length];

            const sendLog = await prisma.notificationSendLog.create({
                data: {
                    userId: permission.userId,
                    sceneCode: scene.sceneCode,
                    templateCode: templates.find(t => t.id === scene.templateId)?.templateCode || 'ORDER_STATUS_CHANGE',
                    businessId: `order_${Math.floor(Math.random() * 1000)}`,
                    templateVariables: {
                        character_string1: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
                        thing2: '精美礼盒装',
                        phrase3: '支付成功',
                        thing4: '感谢您的购买，我们将尽快处理',
                        time7: new Date().toISOString()
                    },
                    sendStatus: Math.random() > 0.1 ? 'success' : 'failed', // 90%成功率
                    errorMessage: Math.random() > 0.9 ? '用户权限不足' : null,
                    sentAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) // 过去24小时内随机时间
                }
            });
            sendLogs.push(sendLog);
        }

        console.log(`创建了 ${sendLogs.length} 个发送记录`);

        // 创建一些订阅消息日志
        const messageLogs = [];
        for (let i = 0; i < Math.min(5, sendLogs.length); i++) {
            const sendLog = sendLogs[i];

            const messageLog = await prisma.subscriptionMessageLog.create({
                data: {
                    userId: sendLog.userId,
                    templateId: templates[i % templates.length].wechatTemplateId,
                    messageType: sendLog.sceneCode,
                    content: {
                        template_id: templates[i % templates.length].wechatTemplateId,
                        touser: `user_${sendLog.userId}`,
                        data: sendLog.templateVariables,
                        page: templates[i % templates.length].jumpPage
                    },
                    status: sendLog.sendStatus,
                    errorMsg: sendLog.sendStatus === 'failed' ? '用户拒绝接收消息' : null,
                    sentAt: sendLog.sentAt
                }
            });
            messageLogs.push(messageLog);
        }

        console.log(`创建了 ${messageLogs.length} 个订阅消息日志`);
    }

    // 5. 更新用户的订阅状态
    if (users.length > 0) {
        for (let i = 0; i < Math.min(3, users.length); i++) {
            await prisma.user.update({
                where: { id: users[i].id },
                data: {
                    subscriptionEnabled: true,
                    subscriptionCount: Math.floor(Math.random() * 10) + 1,
                    lastSubscriptionTime: new Date(),
                    alwaysAllowSubscription: i === 0 // 第一个用户设置为总是允许
                }
            });
        }
        console.log(`更新了 ${Math.min(3, users.length)} 个用户的订阅状态`);
    }

    // 输出统计信息
    const stats = {
        templates: await prisma.notificationTemplate.count(),
        scenes: await prisma.notificationScene.count(),
        permissionConfigs: await prisma.permissionCollectionConfig.count(),
        permissions: await prisma.subscriptionPermission.count(),
        sendLogs: await prisma.notificationSendLog.count(),
        messageLogs: await prisma.subscriptionMessageLog.count()
    };

    console.log('\n=== 通知系统种子数据创建完成 ===');
    console.log(`📧 通知模板: ${stats.templates} 个`);
    console.log(`🎯 通知场景: ${stats.scenes} 个`);
    console.log(`⚙️  权限配置: ${stats.permissionConfigs} 个`);
    console.log(`🔑 权限记录: ${stats.permissions} 个`);
    console.log(`📤 发送记录: ${stats.sendLogs} 个`);
    console.log(`💬 消息日志: ${stats.messageLogs} 个`);
    console.log('=====================================\n');
}

seedNotificationSystem()
    .catch((e) => {
        console.error('通知系统种子数据创建失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });