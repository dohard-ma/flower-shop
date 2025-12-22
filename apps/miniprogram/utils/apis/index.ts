import { API_BASE_URL } from '@/config/index';
import { getUserToken, silentLogin } from './user';
import { storage, STORAGE_KEYS } from '../storage';

export type ApiResponse<T> = {
    success: boolean;
    code: number;
    message: string;
    data: T;
}


// 改进的请求封装
export async function request<T>(options: WechatMiniprogram.RequestOption): Promise<ApiResponse<T>> {
    const accountInfo = wx.getAccountInfoSync();
    const appId = accountInfo.miniProgram.appId;

    const handleRequest = async (retryCount = 0): Promise<ApiResponse<T>> => {
        try {
            // 确保有 userToken
            await getUserToken();

            const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult<ApiResponse<T>>>(
                (resolve, reject) => {
                    wx.request({
                        ...options,
                        url: `${API_BASE_URL}${options.url}`,
                        header: {
                            ...options.header,
                            'Authorization': `Bearer ${token}`,
                            'x-wechat-appid': appId, // 统一注入 AppID
                        },
                        success: resolve,
                        fail: (err) => {
                            console.error('请求失败:', err);
                            reject(err);
                        },
                    });
                }
            );

            console.log('请求成功:', res);

            // 处理 401 错误
            if (res.statusCode === 401 && retryCount < 1) {
                // 清除 token 和 userId
                storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

                // 尝试静默登录
                try {
                    await silentLogin();
                    // 重新尝试原始请求
                    return handleRequest(retryCount + 1);
                } catch (loginError) {
                    throw loginError;
                }
            }
            if (!res?.data?.success) {
                // 显示错误 toast
                wx.showToast({
                    title: res.data.message,
                    icon: 'none'
                });
            }
            return res.data;
        } catch (error) {
            throw error;
        }
    };

    return handleRequest();
}

