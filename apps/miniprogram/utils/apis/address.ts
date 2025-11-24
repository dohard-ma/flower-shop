import { request } from './index';

// 地址类型定义
export interface Address {
    id: number;
    userId: number;
    name: string;
    phone: string;
    address: string;
    province: string;
    city: string;
    area: string;
    latitude?: number;
    longitude?: number;
    isDefault: boolean;
}

// 创建地址参数
export interface AddressCreateParams {
    name: string;
    phone: string;
    address: string;
    province: string;
    city: string;
    area: string;
    isDefault: boolean;
    latitude?: number;
    longitude?: number;
}

// 更新地址参数
export interface AddressUpdateParams {
    name: string;
    phone: string;
    address: string;
    province: string;
    city: string;
    area: string;
    isDefault: boolean;
    latitude?: number;
    longitude?: number;
}

// API响应类型
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message: string;
}

/**
 * 获取用户地址列表
 */
export function getUserAddresses(): Promise<ApiResponse<Address[]>> {
    return request({
        url: '/user/addresses',
        method: 'GET'
    });
}

/**
 * 创建地址
 */
export function createAddress(data: AddressCreateParams): Promise<ApiResponse<Address>> {
    return request({
        url: '/user/addresses',
        method: 'POST',
        data
    });
}

/**
 * 更新地址
 */
export function updateAddress(id: number, data: AddressUpdateParams): Promise<ApiResponse<Address>> {
    return request({
        url: `/user/addresses/${id}`,
        method: 'PUT',
        data
    });
}

/**
 * 删除地址
 */
export function deleteAddress(id: number): Promise<ApiResponse<void>> {
    return request({
        url: `/user/addresses/${id}`,
        method: 'DELETE'
    });
}

/**
 * 设为默认地址
 */
export function setDefaultAddress(id: number): Promise<ApiResponse<void>> {
    return request({
        url: `/user/addresses/${id}/default`,
        method: 'PUT'
    });
}