/**
 * 产品数据获取 Hook
 *
 * 职责：
 * - 管理产品数据的加载状态
 * - 支持分页加载
 * - 防止重复请求
 * - 统一错误处理
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { productService } from '../services/product-service';
import type { Product, ProductQueryParams } from '../types';

export interface UseProductsOptions {
    /** 查询参数 */
    params?: ProductQueryParams;
    /** 是否自动加载 */
    autoFetch?: boolean;
}

export interface UseProductsReturn {
    /** 产品列表 */
    products: Product[];
    /** 加载状态 */
    loading: boolean;
    /** 加载更多状态 */
    loadingMore: boolean;
    /** 错误信息 */
    error: string | null;
    /** 分页信息 */
    pagination: {
        currentPage: number;
        totalPages: number;
        hasMore: boolean;
    };
    /** 获取产品（重置列表） */
    fetchProducts: (page?: number) => Promise<void>;
    /** 加载更多产品（追加） */
    fetchMore: () => Promise<void>;
    /** 重新加载 */
    refetch: () => Promise<void>;
    /** 重置状态 */
    reset: () => void;
}

/**
 * 产品数据获取 Hook
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
    const { params = {}, autoFetch = false } = options;

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // 防止重复请求
    const isLoadingRef = useRef(false);
    const lastRequestedPageRef = useRef(0);

    // 获取产品列表
    const fetchProducts = useCallback(async (page: number = 1) => {
        // 防止重复请求
        if (isLoadingRef.current) {
            return;
        }

        try {
            isLoadingRef.current = true;
            setError(null);

            // 第一页显示loading，追加页显示loadingMore
            if (page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const result = await productService.fetchProducts({
                ...params,
                page,
            });

            if (result.success && result.data) {
                const { data, page: responsePage, totalPages: responseTotalPages } = result.data;

                // 去重处理
                if (page === 1) {
                    setProducts(data);
                } else {
                    setProducts(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newProducts = data.filter(p => !existingIds.has(p.id));
                        return [...prev, ...newProducts];
                    });
                }

                setCurrentPage(responsePage);
                setTotalPages(responseTotalPages);
                setHasMore(responsePage < responseTotalPages);
                lastRequestedPageRef.current = responsePage;
            } else {
                throw new Error('获取产品列表失败');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '网络错误，请稍后重试';
            setError(message);
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [params]);

    // 加载更多
    const fetchMore = useCallback(async () => {
        if (!hasMore || isLoadingRef.current) {
            return;
        }

        const nextPage = currentPage + 1;
        if (lastRequestedPageRef.current === nextPage) {
            return;
        }

        await fetchProducts(nextPage);
    }, [currentPage, hasMore, fetchProducts]);

    // 重新加载
    const refetch = useCallback(async () => {
        lastRequestedPageRef.current = 0;
        await fetchProducts(1);
    }, [fetchProducts]);

    // 重置状态
    const reset = useCallback(() => {
        setProducts([]);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
        setCurrentPage(1);
        setTotalPages(1);
        setHasMore(true);
        isLoadingRef.current = false;
        lastRequestedPageRef.current = 0;
    }, []);

    // 自动加载
    useEffect(() => {
        if (autoFetch) {
            fetchProducts(1);
        }
    }, [autoFetch, fetchProducts]);

    return {
        products,
        loading,
        loadingMore,
        error,
        pagination: {
            currentPage,
            totalPages,
            hasMore,
        },
        fetchProducts,
        fetchMore,
        refetch,
        reset,
    };
}









