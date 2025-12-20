/**
 * API相关类型定义
 */

import { Product } from './product';

/**
 * 分页信息
 */
export interface Pagination {
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    limit: number;
    /** 总数量 */
    total: number;
    /** 总页数 */
    totalPages: number;
}

/**
 * API响应数据结构
 */
export interface ApiResponseData {
    /** 产品列表 */
    data: Product[];
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    limit: number;
    /** 总数量 */
    total: number;
    /** 总页数 */
    totalPages: number;
}

/**
 * API标准响应格式
 */
export interface ApiResponse {
    /** 是否成功 */
    success: boolean;
    /** 响应数据 */
    data: ApiResponseData;
    /** 错误信息（失败时） */
    error?: string;
}

/**
 * 产品查询参数
 */
export interface ProductQueryParams {
    /** 页码 */
    page?: number;
    /** 每页数量 */
    limit?: number;
    /** 款式筛选 */
    style?: string;
    /** 色系筛选 */
    colorSeries?: string;
    /** 搜索关键词 */
    search?: string;
    /** 指定ID列表（逗号分隔） */
    ids?: string;
}

