/**
 * 产品API服务
 */

import type { ApiResponse, ProductQueryParams } from '../types';

/**
 * 产品服务类
 */
class ProductService {
    private readonly baseUrl = '/api/public/products';

    /**
     * 构建查询参数字符串
     */
    private buildQueryString(params: ProductQueryParams): string {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });

        return searchParams.toString();
    }

    /**
     * 获取产品列表（分页）
     *
     * @param params 查询参数
     * @returns 产品列表响应
     */
    async fetchProducts(params: ProductQueryParams = {}): Promise<ApiResponse> {
        try {
            const queryString = this.buildQueryString({
                page: 1,
                limit: 10,
                ...params,
            });

            const url = `${this.baseUrl}?${queryString}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch products:', error);
            throw error;
        }
    }

    /**
     * 根据ID列表获取产品
     *
     * @param ids 产品ID列表
     * @returns 产品列表响应
     */
    async fetchProductsByIds(ids: string[]): Promise<ApiResponse> {
        try {
            if (ids.length === 0) {
                return {
                    success: true,
                    data: {
                        data: [],
                        page: 1,
                        limit: ids.length,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }

            const idsParam = ids.join(',');
            const url = `${this.baseUrl}?ids=${encodeURIComponent(idsParam)}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to fetch products by IDs:', error);
            throw error;
        }
    }
}

// 导出单例
export const productService = new ProductService();

