import { API_BASE_URL } from '@/config/index';
import { ApiResponse, request } from "./index";
import { storage, STORAGE_KEYS } from '../storage';

export async function getGiftCardList(type: 'all' | 'user' = 'user') {
    const res = await request<{ id: number, backgroundImage: string }[]>({
        url: `/gift-card?type=${type}`,
        method: 'GET'
    });

    if (res.success) {
        return res?.data || [];
    }

    return [];
}

// 上传封面
export async function uploadGiftCard(filePath: string): Promise<ApiResponse<{ backgroundImage: string }>> {
    return new Promise((resolve, reject) => {
        wx.uploadFile({
            url: `${API_BASE_URL}/gift-card/upload`,
            filePath: filePath,
            name: 'image',
            header: {
                'Authorization': `Bearer ${storage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`
            },
            success: (res) => {
                console.log(res);
                resolve(JSON.parse(res.data));
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
}

// 删除封面
export async function deleteGiftCard(id: string): Promise<ApiResponse<void>> {
    return request<void>({
        url: `/gift-card/${id}`,
        method: 'DELETE'
    });
}