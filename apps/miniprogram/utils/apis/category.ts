import { request } from './index';

export interface Category {
  _id: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  parentId: string | null;
  productCount: number;
  level: number;
}

export const categoryApi = {
  // 获取所有分类 (管理员用)
  getList() {
    return request<Category[]>({
      url: '/admin/categories',
      method: 'GET'
    });
  },

  // 获取公开可见的分类 (浏览用)
  getPublicList(params?: { channelCode?: string }) {
    const queryParams = params?.channelCode 
      ? `?channelCode=${params.channelCode}` 
      : '';
    return request<Category[]>({
      url: `/public/categories${queryParams}`,
      method: 'GET'
    });
  },

  // 创建分类
  create(data: Partial<Category>) {
    return request<Category>({
      url: '/admin/categories',
      method: 'POST',
      data
    });
  },

  // 更新分类
  update(data: Partial<Category> & { id: string }) {
    return request<Category>({
      url: '/admin/categories',
      method: 'PUT',
      data
    });
  },

  // 删除分类
  delete(id: string) {
    return request<void>({
      url: `/wx/admin/categories?id=${id}`,
      method: 'DELETE'
    });
  }
};

