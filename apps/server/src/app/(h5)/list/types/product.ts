/**
 * 产品相关类型定义
 */

/**
 * 产品状态
 */
export type ProductStatus = 'active' | 'inactive' | 'draft';

/**
 * 产品信息
 */
export interface Product {
    /** 产品ID */
    id: string;
    /** 产品名称 */
    name: string;
    /** 分类 */
    category: string | null;
    /** 款式 */
    style: string | null;
    /** 色系 */
    colorSeries: string | null;
    /** 目标受众 */
    targetAudience: string[] | null;
    /** 产品图片列表 */
    images: string[];
    /** 参考价格 */
    priceRef: string;
    /** 产品描述 */
    description?: string;
    /** 产品状态 */
    status: string;
}

