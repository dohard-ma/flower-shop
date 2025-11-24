import { request } from './index';
import { getQiniuToken, uploadToQiniu } from '@/utils/qiniu';

export enum ProductType {
    Subscription = 1, // 年卡
    GiftBox = 2, // 礼盒
    Accessory = 3 // 周边
}

export type Project = {
    id: number;
    productName: string;
    productType: ProductType; // 类型 1-年卡 2-礼盒 3-周边
    price: string;
    stock: number;
    coverImages: string[];
    detail: string;
    images: string[];
    isSubscription: boolean;
    maxDeliveries: number | null;
    deliveryType: number | null;
    deliveryInterval: number | null;
}

export async function getProjectList() {
    const res = await request<Project[]>({
        url: '/products',
        method: 'GET'
    });

    if (res.success) {
        return res.data || [];
    }

    return [];
}



// AI分析响应类型
export interface AnalysisResponse {
    analysis: {
        product_title: string;
        style: string;
        flowers: string[];
        color_series: string;
        price: number;
        quantity: number;
    };
}


/**
 * AI分析花艺图片
 * @param imageUrl 图片URL
 */
export async function analyzeFlowerImage(imageUrl: string) {
    return request<AnalysisResponse>({
        url: '/analyze',
        method: 'POST',
        data: {
            imageUrl
        }
    });
}

/**
 * 语音转文本接口响应类型
 */
export interface VoiceTranscribeResponse {
    text: string;
}

/**
 * 语音转文本
 * @param filePath 音频文件路径
 */
export async function transcribeVoice(filePath: string) {
    try {
        // 先上传音频到七牛云
        // 获取上传token
        const { token, domain } = await getQiniuToken('public');

        // 生成音频文件的ossKey（替换目录为音频目录）
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const audioOssKey = `huajianli/audio/voice/${timestamp}-${random}.mp3`;

        // 上传到七牛云
        const uploadResult = await uploadToQiniu(filePath, {
            token,
            ossKey: audioOssKey,
            domain
        });

        // 获取音频URL
        const audioUrl = `${domain}/${uploadResult.key}`;

        console.log('音频已上传到七牛云:', audioUrl);

        // 调用服务端接口进行语音转文本
        return request<VoiceTranscribeResponse>({
            url: '/voice/transcribe',
            method: 'POST',
            data: {
                audioUrl
            }
        });
    } catch (error) {
        console.error('语音转文本失败:', error);
        throw error;
    }
}

/**
 * 分析语音转文本后的内容（文本AI结构化）
 * @param text 语音转文本后的内容
 */
export async function analyzeVoiceText(text: string) {
    return request<AnalysisResponse>({
        url: '/voice/analyze',
        method: 'POST',
        data: {
            text
        }
    });
}

/**
 * 商品保存响应类型
 */
export interface ProductSaveResponse {
    success: boolean;
    message: string;
    productId?: string;
    data?: any;
}

/**
 * 创建商品
 * @param productData 商品数据
 */
export async function createProduct(productData: {
    title: string;
    price: number | string;
    category: string;
    storeCode?: string;
    mainFlower?: string;
    colorScheme?: string;
    targetAudience?: string;
    quantity?: number;
    style?: string;
    stock?: number;
    status?: 'active' | 'inactive' | 'draft';
    mediaList: Array<{ type: 'image' | 'video'; url: string }>;
}) {
    return request<ProductSaveResponse>({
        url: '/products',
        method: 'POST',
        data: productData
    });
}

/**
 * 更新商品
 * @param productId 商品ID
 * @param productData 商品数据
 */
export async function updateProduct(
    productId: string,
    productData: {
        title?: string;
        price?: number | string;
        category?: string;
        storeCode?: string;
        mainFlower?: string;
        colorScheme?: string;
        targetAudience?: string;
        quantity?: number;
        style?: string;
        stock?: number;
        status?: 'active' | 'inactive' | 'draft';
        mediaList?: Array<{ type: 'image' | 'video'; url: string }>;
    }
) {
    return request<ProductSaveResponse>({
        url: `/products?id=${productId}`,
        method: 'PUT',
        data: productData
    });
}
