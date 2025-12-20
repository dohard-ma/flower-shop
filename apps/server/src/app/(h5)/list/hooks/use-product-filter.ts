/**
 * 产品筛选 Hook
 *
 * 职责：
 * - 管理筛选条件状态（款式、色系、搜索）
 * - 对产品列表进行前端过滤
 * - 使用 useMemo 优化过滤性能
 */

import { useState, useMemo, useCallback } from 'react';
import type { Product, FilterState } from '../types';

export interface UseProductFilterReturn {
    /** 当前筛选条件 */
    filters: FilterState;
    /** 设置单个筛选条件 */
    setFilter: (key: keyof FilterState, value: string) => void;
    /** 批量设置筛选条件 */
    setFilters: (filters: Partial<FilterState>) => void;
    /** 清空所有筛选条件 */
    clearFilters: () => void;
    /** 过滤后的产品列表 */
    filteredProducts: Product[];
}

/**
 * 初始筛选状态
 */
const INITIAL_FILTERS: FilterState = {
    style: '',
    color: '',
    search: '',
};

/**
 * 产品筛选 Hook
 *
 * @param products 原始产品列表
 * @returns 筛选状态和过滤后的产品列表
 */
export function useProductFilter(products: Product[]): UseProductFilterReturn {
    const [filters, setFiltersState] = useState<FilterState>(INITIAL_FILTERS);

    // 设置单个筛选条件
    const setFilter = useCallback((key: keyof FilterState, value: string) => {
        setFiltersState(prev => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    // 批量设置筛选条件
    const setFilters = useCallback((newFilters: Partial<FilterState>) => {
        setFiltersState(prev => ({
            ...prev,
            ...newFilters,
        }));
    }, []);

    // 清空所有筛选条件
    const clearFilters = useCallback(() => {
        setFiltersState(INITIAL_FILTERS);
    }, []);

    // 使用 useMemo 优化过滤性能
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            // 款式筛选
            if (filters.style && product.style !== filters.style) {
                return false;
            }

            // 色系筛选
            if (filters.color && product.colorSeries !== filters.color) {
                return false;
            }

            // 搜索筛选
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const nameMatch = product.name.toLowerCase().includes(searchLower);
                const descMatch = product.description?.toLowerCase().includes(searchLower);
                if (!nameMatch && !descMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [products, filters]);

    return {
        filters,
        setFilter,
        setFilters,
        clearFilters,
        filteredProducts,
    };
}








