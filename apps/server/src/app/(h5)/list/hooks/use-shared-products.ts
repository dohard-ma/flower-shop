/**
 * 分享产品管理 Hook
 *
 * 职责：
 * - 解析URL中的分享产品ID
 * - 获取分享的产品列表
 * - 管理分享模式状态
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { productService } from '../services/product-service';
import type { Product } from '../types';

export interface UseSharedProductsReturn {
    /** 分享的产品ID列表 */
    sharedIds: string[];
    /** 是否为分享模式 */
    isSharedMode: boolean;
    /** 分享的产品列表 */
    sharedProducts: Product[];
    /** 加载状态 */
    loading: boolean;
    /** 错误信息 */
    error: string | null;
    /** 获取分享产品 */
    fetchSharedProducts: () => Promise<void>;
}

/**
 * 分享产品管理 Hook
 */
export function useSharedProducts(): UseSharedProductsReturn {
    const searchParams = useSearchParams();

    const [sharedIds, setSharedIds] = useState<string[]>([]);
    const [sharedProducts, setSharedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // 解析URL中的分享ID
    useEffect(() => {
        const sharedParam = searchParams.get('shared');

        if (sharedParam) {
            try {
                const ids = sharedParam.split(',').filter(Boolean);
                setSharedIds(ids);
            } catch (err) {
                console.error('Failed to parse shared product IDs:', err);
                setSharedIds([]);
            }
        } else {
            setSharedIds([]);
            setSharedProducts([]);
        }
    }, [searchParams]);

    // 获取分享的产品
    const fetchSharedProducts = useCallback(async () => {
        if (sharedIds.length === 0) {
            setSharedProducts([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await productService.fetchProductsByIds(sharedIds);

            if (result.success && result.data) {
                setSharedProducts(result.data.data || []);
            } else {
                throw new Error('获取推荐产品失败');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '获取推荐产品失败';
            setError(message);
            console.error('Failed to fetch shared products:', err);
        } finally {
            setLoading(false);
        }
    }, [sharedIds]);

    // 自动加载分享产品
    useEffect(() => {
        if (sharedIds.length > 0 && !initialized) {
            setInitialized(true);
            fetchSharedProducts();
        }
    }, [sharedIds, initialized, fetchSharedProducts]);

    return {
        sharedIds,
        isSharedMode: sharedIds.length > 0,
        sharedProducts,
        loading,
        error,
        fetchSharedProducts,
    };
}









