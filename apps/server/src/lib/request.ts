import { ApiResponse } from './api-response';

interface RequestOptions extends RequestInit {
  showError?: boolean; // 是否显示错误提示
}

type ResponseData<T> = {
  success: boolean;
  data: T;
  message: string;
  traceId: string;
};

// 统一的请求方法
export async function request<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<ResponseData<T>> {
  const { showError = true, ...restOptions } = options;

  try {
    // 如果是FormData，不要设置Content-Type，让浏览器自动设置
    const isFormData = restOptions.body instanceof FormData;

    const response = await fetch(url, {
      ...restOptions,
      headers: isFormData ? {
        ...restOptions.headers
      } : {
        'Content-Type': 'application/json',
        ...restOptions.headers
      }
    });

    // 判断 http status
    if (response.status === 401) {
      // 跳转登录页面
      window.location.href = '/auth/login';
      return Promise.reject(new Error('未登录或登录已过期'));
    }

    const data = (await response.json()) as ApiResponse<T>;

    console.log('==========', data);

    // 处理业务错误码
    if (!data.success) {
      if (showError) {
        // TODO: 这里可以接入你的提示组件，比如 toast
        console.error(data.message);
      }
      throw new Error(data.message);
    }

    return data as ResponseData<T>;
  } catch (error: any) {
    // 处理网络错误或业务错误
    if (error.name === 'TypeError') {
      // 网络错误
      if (showError) {
        console.error('网络错误，请检查网络连接');
      }
      throw new Error('网络错误，请检查网络连接');
    }

    // 其他错误
    if (showError) {
      console.error(error.message);
    }
    throw error;
  }
}

// 封装常用的请求方法
export const http = {
  get: <T = any>(url: string, data?: any, options?: RequestOptions) => {
    const queryString = data ? `?${new URLSearchParams(data).toString()}` : '';
    return request<T>(url + queryString, { ...options, method: 'GET' });
  },

  post: <T = any>(url: string, data?: any, options?: RequestOptions) => {
    const isFormData = data instanceof FormData;
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  },

  put: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' })
};
