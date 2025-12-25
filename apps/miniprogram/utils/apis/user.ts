import { API_BASE_URL } from '../../config/index';
import { storage, STORAGE_KEYS } from '../storage';
import { request } from './index';

// 添加登录相关类型
type LoginResponse = {
  success: boolean;
  data: UserInfo & {
    token: string;
  };
};

export async function getUserToken(): Promise<string | null> {
  const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    return token;
  }
  // await silentLogin();
  return storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}


// 静默登录函数
export async function silentLogin(): Promise<void> {
  try {
    // 获取登录凭证
    const loginRes = await wx.login();
    if (!loginRes.code) {
      throw new Error('登录失败');
    }

    // 发送 code 到服务器
    const accountInfo = wx.getAccountInfoSync();
    const appId = accountInfo.miniProgram.appId;

    const { data } = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>(
      (resolve, reject) => {
        wx.request({
          url: `${API_BASE_URL}/users`,
          method: 'POST',
          data: { code: loginRes.code },
          header: {
            'x-wechat-appid': appId
          },
          success: resolve,
          fail: reject,
        });
      }
    );

    const response = data as LoginResponse;
    if (response?.data?.token) {
      storage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
    }
    storage.setItem(STORAGE_KEYS.USER_INFO, response.data);

  } catch (error) {
    console.error('静默登录失败:', error);
    throw error;
  }
}


export const decryptPhoneNumber = async (code: string, encryptedData: string, iv: string) => {
  const res = await request<{ phoneNumber: string }>({
    url: `/users/phone`,
    method: 'POST',
    data: { code, encryptedData, iv }
  });
  return res;
}


export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

// 用户信息类型定义
export interface UserInfo {
  id: number;
  userNo: string;
  avatar: string;
  nickname: string;
  name: string;
  phone: string;
  gender: number;
  birthday?: string;
  city?: string;
  province?: string;
  subscriptionEnabled: boolean;
  membership?: any;
  wallet?: any;
  alwaysAllowSubscriptionKeys?: string[];
  allowSubscription?: boolean;
  role: UserRole;
}

// 更新用户信息参数
export interface UpdateUserParams {
  nickname?: string;
  name?: string;
  avatar?: string;
  phone?: string;
  gender?: number;
  birthday?: string;
  city?: string;
  province?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * 获取用户信息
 */
export function getUserInfo(): Promise<ApiResponse<UserInfo>> {
  return request({
    url: `/user`,
    method: 'GET'
  });
}

/**
 * 更新用户信息
 */
export function updateUserInfo(data: UpdateUserParams): Promise<ApiResponse<UserInfo>> {
  return request({
    url: `/user`,
    method: 'PUT',
    data
  });
}

/**
 * 登录并注册/更新用户信息
 */
export async function loginAndRegister(params: {
  code: string;
  phoneCode?: string;
  nickname?: string;
  avatarPath?: string;
}): Promise<ApiResponse<UserInfo & { token: string }>> {
  const accountInfo = wx.getAccountInfoSync();
  const appId = accountInfo.miniProgram.appId;

  return new Promise((resolve, reject) => {
    // 如果有头像，使用 uploadFile (multipart/form-data)
    if (params.avatarPath) {
      wx.uploadFile({
        url: `${API_BASE_URL}/users`,
        filePath: params.avatarPath,
        name: 'avatar',
        header: {
          'x-wechat-appid': appId,
        },
        formData: {
          code: params.code,
          phoneCode: params.phoneCode || '',
          nickname: params.nickname || '',
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        },
        fail: reject,
      });
    } else {
      // 如果没有头像，使用普通 request (application/json)
      wx.request({
        url: `${API_BASE_URL}/users`,
        method: 'POST',
        header: {
          'x-wechat-appid': appId,
        },
        data: {
          code: params.code,
          phoneCode: params.phoneCode,
          nickname: params.nickname,
        },
        success: (res) => {
          resolve(res.data as ApiResponse<UserInfo & { token: string }>);
        },
        fail: reject,
      });
    }
  });
}


export interface Friend {
  id: number;
  nickname: string;
  avatar: string;
  name: string;
  phone: string;
}
export interface Relation {
  id: number;
  friendUserId: number;
  relationType: number;
  relationTypeName: string;
  remark: string;
  friend: Friend;
  giftCount?: number;           // 送礼次数
  daysSinceLastGift?: number;   // 距离上次送礼天数
}

export const getUserRelations = async () => {
  const res = await request<Relation[]>({
    url: `/user/relations`,
    method: 'GET',
  });
  return res;
}

/**
 * 请求订阅权限
 */
export function updateSubscriptionPermission(data: {
  grantedTemplates: string[];
  deniedTemplates: string[];
  alwaysAllowTemplates: string[];
  allowSubscription: boolean;
}) {
  return request({
    url: '/user/subscription-permission',
    method: 'POST',
    data
  });
}
