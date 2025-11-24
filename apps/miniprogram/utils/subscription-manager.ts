import { updateSubscriptionPermission } from './apis/user';

/**
 * 订阅权限收集结果接口
 */
interface SubscriptionResult {
    success: boolean;
    granted?: boolean;
    alwaysAllow?: boolean;
    templateIds?: string[];
    reason?: string;
    error?: string;
    rawResponse?: any;
}


export enum SubscriptionStrategy {
    CUSTOMER_PURCHASE = 'CUSTOMER_PURCHASE',
    ADDRESS_CONFIRM = 'ADDRESS_CONFIRM',
    ORDER_DETAIL = 'ORDER_DETAIL',
    APP_LAUNCH = 'APP_LAUNCH',
    PRODUCT_DETAIL = 'PRODUCT_DETAIL',
    USER_GIFT_RECEIVE = 'USER_GIFT_RECEIVE',
    CUSTOMER_PAYMENT = 'CUSTOMER_PAYMENT',
}

/**
 * 小程序端订阅权限管理器
 * 负责权限收集、状态管理和智能引导
 * 重要：系统弹出授权弹窗，用户可以选择一直允许，但是如果存在新的订阅消息模版，还会打开弹窗提示用户授权新的模版
 */
export class MiniProgramSubscriptionManager {
    // 默认模板ID配置
    private static readonly DEFAULT_TEMPLATE_IDS = [
        'UXitKzFcB8zlW6Q_cHN2YZRwmYYmpRXSujjkF0gvKfQ', // 订单状态变更通知
        'PTnCLoWbKXu6iFMDebEYFb6d3iHlMKvtgCkm1t2qAwQ', // 订单发货通知
        'Yy-6b5Xn4ahLRxSugcJqJ7Xetevo6q10HqakVIiog6k'  // 促销优惠通知
    ];

    // 用户已经允许静默授权的通知模版列表
    private static readonly ALWAYS_ALLOW_KEYS = new Set<string>();

    // 用户是否允许获取通知授权
    private static allowSubscription = true;

    // 通过 [wx.getSetting](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/setting/wx.getSetting.html) 判断是否允许获取通知授权
    static async getSetting() {
        return new Promise((resolve) => {
            wx.getSetting({
                withSubscriptions: true,
                success: (res) => {
                    this.allowSubscription = !!res?.subscriptionsSetting?.mainSwitch;
                    const subscriptionsSetting = res?.subscriptionsSetting?.itemSettings;
                    console.log('[订阅权限] 是否允许获取通知授权:', res);
                    this.DEFAULT_TEMPLATE_IDS.forEach(templateId => {
                        const isAuthorized = subscriptionsSetting?.[templateId] === "accept"
                        if (isAuthorized) {
                            this.ALWAYS_ALLOW_KEYS.add(templateId);
                        }
                    });
                    resolve(this.allowSubscription);
                },
                fail: (error) => {
                    resolve(undefined)
                    this.allowSubscription = false;
                    this.ALWAYS_ALLOW_KEYS.clear();
                    console.error('[订阅权限] 获取设置失败:', error);
                }
            });
        })
    }

    static async init() {
        this.getSetting();
    }

    /**
     * 获取模板ID列表
     */
    static getTemplateIds() {
        // const config = await this.getNotificationConfig();
        // return config.templateIds.length > 0 ? config.templateIds : this.DEFAULT_TEMPLATE_IDS;
        return this.DEFAULT_TEMPLATE_IDS;
    }

    /**
     * 请求订阅消息权限（原生接口封装）
     */
    public static async requestSubscribeMessage({ force }: { force: boolean }): Promise<SubscriptionResult> {
        const alwaysAllowKeys = Array.from(this.ALWAYS_ALLOW_KEYS);
        console.log('[订阅权限] 是否总是允许:', alwaysAllowKeys);

        // 用户不允许通知授权，则不进行权限收集
        if (!this.allowSubscription) {
            return {
                success: true,
                granted: true,
            }
        }

        // 如果没有用户允许静默授权的通知模版，并且不是强制获取授权，则跳过
        if (alwaysAllowKeys.length === 0 && !force) {
            return {
                success: true,
                granted: true,
            }
        }

        // 获取模板ID列表。如果是非强制性的，返回用户已经授权过的模版ID列表，否则返回默认模版ID列表，来提示用户授权
        const templateIds = force ? this.getTemplateIds() : alwaysAllowKeys;

        return new Promise((resolve) => {
            // 根据需要的权限数量选择模板
            wx.requestSubscribeMessage({
                tmplIds: templateIds,
                success: (res) => {
                    console.log('[订阅权限] 微信API调用成功:', res);

                    const grantedTemplates: string[] = [];
                    // 用户拒绝的模版
                    const deniedTemplates: string[] = [];

                    templateIds.forEach(templateId => {
                        const status = res[templateId];
                        if (status === 'accept') {
                            grantedTemplates.push(templateId);
                        }
                        if (status === 'reject') {
                            deniedTemplates.push(templateId);
                        }
                    });

                    this.getSetting().then(() => {
                        // 更新可通知的次数，以及是否总是允许
                        updateSubscriptionPermission({
                            grantedTemplates: grantedTemplates,
                            deniedTemplates: deniedTemplates,
                            allowSubscription: this.allowSubscription,
                            alwaysAllowTemplates: Array.from(this.ALWAYS_ALLOW_KEYS)
                        });
                    })



                    resolve({
                        success: true,
                        granted: true,
                        templateIds: grantedTemplates,
                    });
                },
                fail: (error) => {
                    console.error('[订阅权限] 微信API调用失败:', error);
                    resolve({
                        success: false,
                        granted: false,
                        error: error.errMsg || '请求权限失败'
                    });
                }
            });
        });
    }

}

// 在小程序启动时初始化
MiniProgramSubscriptionManager.init();

export default MiniProgramSubscriptionManager;