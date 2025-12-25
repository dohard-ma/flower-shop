import { request } from './index';

export interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  priceRef: string;
  images: string[];
  description: string | null;
  status: string;
  sortOrder: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  style?: string;
  colorSeries?: string;
  targetAudience?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productApi = {
  // 获取产品列表 (公开浏览)
  getPublicList(params?: ProductListParams) {
    return request<PaginatedResult<Product>>({
      url: '/public/products',
      method: 'GET',
      data: params
    });
  },

  // 获取产品详情 (公开浏览)
  getPublicDetail(id: string) {
    return request<Product>({
      url: `/public/products/${id}`,
      method: 'GET'
    });
  }
};

