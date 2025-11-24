import { WechatService } from '@/lib/wechat';
import { Prisma } from '@prisma/client';

// 通知模版参数类型
type ORDER_STATUS_CHANGE_DATA = {
    productName: string;
    orderNo: string;
    orderStatus: string;
    tips: string;
    time: string;
}
type GIFT_RECEIVE_DATA = {
    productName: string;
    orderNo: string;
    address: string;
}
type PROMOTION_NOTICE_DATA = {
    productName: string;
    quantity: number;
    getAt: string;
    endAt: string;
    remark: string;
}


// 固定的通知模版
const NOTIFICATION_TEMPLATES = {
    // 订单状态变更通知
    ORDER_STATUS_CHANGE: {
        templateId: 'UXitKzFcB8zlW6Q_cHN2YZRwmYYmpRXSujjkF0gvKfQ',
        templateCode: 'ORDER_STATUS_CHANGE',
        // 根据微信模板实际字段配置参数映射
        paramMapping: {
            'character_string1': 'orderNo',    // 订单号
            'thing2': 'productName',           // 项目名称
            'phrase3': 'orderStatus',          // 订单状态
            'thing4': 'tips',                  // 温馨提示
            'time7': 'time'                 // 更新时间
        }
    },
    // 订单发货通知
    DELIVERY_NOTICE: {
        templateId: 'PTnCLoWbKXu6iFMDebEYFb6d3iHlMKvtgCkm1t2qAwQ',
        templateCode: 'DELIVERY_NOTICE',
        paramMapping: {
            'thing1': 'productName',
            'character_string2': 'orderNo',
            'thing3': 'address'
        }
    },
    // 促销优惠通知
    PROMOTION_NOTICE: {
        templateId: 'Yy-6b5Xn4ahLRxSugcJqJ7Xetevo6q10HqakVIiog6k',
        templateCode: 'PROMOTION_NOTICE',
        paramMapping: {
            'thing1': 'productName',
            'number2': 'quantity',
            'date3': 'getAt',
            'date4': 'endAt',
            'thing5': 'remark',
        }
    }
}


// 固定的通知场景配置。场景关联模版。不同场景的消息内容和跳转页面不同。
export const NOTIFICATION_SCENES = {
    /**
     * 支付成功
     */
    PAYMENT_SUCCESS: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/detail/index',
        data: {} as ORDER_STATUS_CHANGE_DATA
    },
    /**
     * 领取成功
     */
    GIFT_RECEIVE: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/detail/index',
        data: {} as GIFT_RECEIVE_DATA
    },

    /**
     * 准备发货
     */
    DELIVERY_NOTICE: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/delivery-plan/index',
        data: {} as ORDER_STATUS_CHANGE_DATA
    },

    /**
     * 已经发货，物流信息为xxx
     */
    SHIPPED: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/delivery-plan/index',
        data: {} as GIFT_RECEIVE_DATA
    },

    /**
     * 超过48小时未领取，已自动退款
     */
    AUTO_REFUND: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/detail/index',
        data: {} as ORDER_STATUS_CHANGE_DATA
    },

    /**
     *
     * 订单剩余n次服务次数，是否继续购买？
     */
    CONTINUE_PURCHASE: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/detail/index',
        data: {} as PROMOTION_NOTICE_DATA
    },

    /**
     * 已为您退款
     */
    REFUND_SUCCESS: {
        templateId: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateId,
        templateCode: NOTIFICATION_TEMPLATES.ORDER_STATUS_CHANGE.templateCode,
        jumpPage: 'pages/order/detail/index',
        data: {} as ORDER_STATUS_CHANGE_DATA
    }
};

export interface NotificationParams {
    sceneCode: string;
    userId: number;
    /**
     * 业务编码。用于关联业务数据。
     */
    businessId?: string;
    /**
     * 业务数据。用于构建模板参数。
     */
    businessData?: ORDER_STATUS_CHANGE_DATA | GIFT_RECEIVE_DATA | PROMOTION_NOTICE_DATA;
    /**
     * 跳转页面。默认不跳转。
     */
    jumpPage?: string;
    /**
     * Prisma 事务实例
     */
    prismaTransaction: Prisma.TransactionClient;
}

export class NotificationManager {
    /**
     * 发送通知
     */
    static async sendNotification(params: NotificationParams): Promise<void> {
        const { sceneCode, userId, jumpPage, businessId, businessData = {}, prismaTransaction } = params;

        console.log(`[NotificationManager] 开始发送通知:`, {
            sceneCode,
            userId,
            businessId,
            businessData
        });

        try {
            // 1. 获取场景配置
            const sceneConfig = NOTIFICATION_SCENES[sceneCode as keyof typeof NOTIFICATION_SCENES];
            if (!sceneConfig) {
                console.warn(`[NotificationManager] 通知场景不存在: ${sceneCode}`);
                console.warn(`[NotificationManager] 可用场景:`, Object.keys(NOTIFICATION_SCENES));
                return;
            }

            console.log(`[NotificationManager] 找到场景配置:`, sceneConfig);

            // 2. 获取用户OpenID
            const openid = await this.getUserOpenId(userId, prismaTransaction);
            console.log(`[NotificationManager] 用户OpenID: ${openid}`);

            // 3. 检查用户是否有订阅权限
            const availableCount = await this.checkNotificationPermission(userId, sceneConfig.templateId, prismaTransaction);
            console.log(`[NotificationManager] 可用权限次数: ${availableCount}`);

            if (availableCount <= 0) {
                console.warn(`[NotificationManager] 用户 ${userId} 没有模板 ${sceneConfig.templateId} 的订阅权限`);
                await this.logNotificationSend({
                    userId,
                    sceneCode,
                    templateCode: sceneConfig.templateCode,
                    businessId,
                    templateVariables: null,
                    sendStatus: 'no_permission',
                    errorMessage: '用户未授权订阅消息'
                }, prismaTransaction);
                return;
            }

            // 4. 获取对应的模板配置
            const templateConfig = this.getTemplateConfig(sceneConfig.templateCode);
            if (!templateConfig) {
                console.error(`[NotificationManager] 找不到模板配置: ${sceneConfig.templateCode}`);
                return;
            }

            // 5. 简单的模板参数构建（使用微信订阅消息的固定格式）
            const templateParams = this.buildTemplateParams(businessData, templateConfig);
            console.log(`[NotificationManager] 构建的模板参数:`, templateParams);

            // 6. 消耗订阅权限。（无论是否发送成功，都消耗）
            await this.consumeSubscriptionPermission(userId, sceneConfig.templateId, prismaTransaction);
            console.log(`[NotificationManager] 权限已消耗`);

            // 7. 发送微信订阅消息
            console.log(`[NotificationManager] 准备发送微信消息:`, {
                touser: openid,
                template_id: sceneConfig.templateId,
                page: jumpPage,
                data: templateParams
            });

            const result = await WechatService.sendWechatSubscribeMessage({
                touser: openid,
                template_id: sceneConfig.templateId,
                page: jumpPage,
                data: templateParams
            });

            console.log(`[NotificationManager] 微信发送结果:`, result);

            // 8. 记录发送结果
            await this.logNotificationSend({
                userId,
                sceneCode,
                templateCode: sceneConfig.templateCode,
                businessId,
                templateVariables: templateParams,
                sendStatus: result.success ? 'success' : 'failed',
                errorMessage: result.success ? null : result.error
            }, prismaTransaction);

            console.log(`[NotificationManager] 通知发送完成:`, {
                success: result.success,
                permissionConsumed: result.success
            });

        } catch (error: any) {
            // TODO
            console.error(`[NotificationManager] 发送通知失败 [${sceneCode}]:`, error);
            console.error(`[NotificationManager] 错误堆栈:`, error.stack);

            await this.logNotificationSend({
                userId,
                sceneCode,
                templateCode: NOTIFICATION_SCENES[sceneCode as keyof typeof NOTIFICATION_SCENES]?.templateCode || '',
                businessId,
                templateVariables: null,
                sendStatus: 'failed',
                errorMessage: error.message
            }, prismaTransaction);
        }
    }

    /**
     * 获取模板配置
     */
    private static getTemplateConfig(templateCode: string): any {
        return Object.values(NOTIFICATION_TEMPLATES).find(
            template => template.templateCode === templateCode
        );
    }

    /**
     * 构建模板参数（简化版本）
     */
    private static buildTemplateParams(
        businessData: Record<string, any>,
        templateConfig: any
    ): Record<string, { value: string }> {
        console.log(`[NotificationManager] 开始构建模板参数:`, {
            businessData,
            paramMapping: templateConfig.paramMapping
        });

        const result: Record<string, { value: string }> = {};

        // 根据模板配置的参数映射来构建模板参数
        if (templateConfig.paramMapping) {
            for (const [templateField, businessField] of Object.entries(templateConfig.paramMapping)) {
                const value = businessData[businessField as string];
                if (value !== undefined && value !== null) {
                    // 对不同类型的字段进行简单处理
                    let formattedValue = String(value);

                    // 特殊处理时间字段
                    if (templateField.includes('time') && value instanceof Date) {
                        formattedValue = value.toLocaleString('zh-CN');
                    } else if (templateField.includes('time') && typeof value === 'string') {
                        try {
                            const date = new Date(value);
                            formattedValue = date.toLocaleString('zh-CN');
                        } catch (e) {
                            // 如果解析失败，保持原值
                        }
                    }

                    // 限制字段长度（微信模板字段有长度限制）
                    if (templateField.startsWith('thing') && formattedValue.length > 20) {
                        formattedValue = formattedValue.substring(0, 17) + '...';
                    } else if (templateField.startsWith('character_string') && formattedValue.length > 32) {
                        formattedValue = formattedValue.substring(0, 29) + '...';
                    } else if (templateField.startsWith('phrase') && formattedValue.length > 5) {
                        formattedValue = formattedValue.substring(0, 5);
                    }

                    result[templateField] = { value: formattedValue };
                    console.log(`[NotificationManager] 映射字段: ${templateField} = ${formattedValue} (来源: ${businessField})`);
                } else {
                    console.warn(`[NotificationManager] 业务数据中缺少字段: ${businessField}`);
                }
            }
        } else {
            console.warn(`[NotificationManager] 场景配置中没有参数映射`);
        }

        console.log(`[NotificationManager] 构建完成的模板参数:`, result);
        return result;
    }

    /**
     * 批量发送通知
     */
    static async sendBatchNotifications(notifications: NotificationParams[]): Promise<void> {
        const promises = notifications.map(notification =>
            this.sendNotification(notification).catch(error => {
                console.error(`批量发送通知失败:`, error);
            })
        );

        await Promise.all(promises);
    }

    /**
     * 检查通知权限 - 返回可用次数
     */
    static async checkNotificationPermission(
        userId: number,
        templateId: string,
        prismaTransaction: Prisma.TransactionClient
    ): Promise<number> {
        const permission = await prismaTransaction.subscriptionPermission.findUnique({
            where: {
                userId_templateId: {
                    userId,
                    templateId
                }
            },
            select: { availableCount: true }
        });

        return permission?.availableCount || 0;
    }

    /**
     * 获取用户OpenID
     */
    private static async getUserOpenId(userId: number, prismaTransaction: Prisma.TransactionClient): Promise<string> {
        const user = await prismaTransaction.user.findUnique({
            where: { id: userId },
            select: { openid: true }
        });

        if (!user?.openid) {
            throw new Error(`用户 ${userId} 的 OpenID 不存在`);
        }

        return user.openid;
    }

    /**
     * 消耗订阅权限
     */
    private static async consumeSubscriptionPermission(
        userId: number,
        templateId: string,
        prismaTransaction: Prisma.TransactionClient
    ): Promise<void> {
        console.log(`[NotificationManager] 开始消耗权限:`, { userId, templateId });

        try {
            // 查找权限记录
            const permission = await prismaTransaction.subscriptionPermission.findUnique({
                where: {
                    userId_templateId: {
                        userId,
                        templateId
                    }
                }
            });

            if (!permission || permission.availableCount <= 0) {
                console.warn(`[NotificationManager] 没有找到可用权限或次数不足:`, { userId, templateId, availableCount: permission?.availableCount });
                return;
            }

            // 减少可用次数
            await prismaTransaction.subscriptionPermission.update({
                where: {
                    userId_templateId: {
                        userId,
                        templateId
                    }
                },
                data: {
                    availableCount: {
                        decrement: 1
                    }
                }
            });

            console.log(`[NotificationManager] 权限消耗成功:`, {
                permissionId: permission.id,
                userId,
                templateId,
                remainingCount: permission.availableCount - 1
            });

        } catch (error) {
            console.error(`[NotificationManager] 消耗权限失败:`, error);
            throw error;
        }
    }

    /**
     * 记录通知发送日志
     */
    private static async logNotificationSend(params: {
        userId: number;
        sceneCode: string;
        templateCode: string;
        businessId?: string;
        templateVariables: any;
        sendStatus: string;
        errorMessage?: string | null;
    }, prismaTransaction: Prisma.TransactionClient): Promise<void> {
        // 从场景配置获取 templateId
        const sceneConfig = NOTIFICATION_SCENES[params.sceneCode as keyof typeof NOTIFICATION_SCENES];
        const templateId = sceneConfig?.templateId || '';

        await prismaTransaction.subscriptionMessageLog.create({
            data: {
                userId: params.userId,
                templateId,
                messageType: params.sceneCode,
                content: {
                    templateCode: params.templateCode,
                    templateVariables: params.templateVariables,
                    businessId: params.businessId
                },
                status: params.sendStatus,
                errorMsg: params.errorMessage
            }
        });
    }
}