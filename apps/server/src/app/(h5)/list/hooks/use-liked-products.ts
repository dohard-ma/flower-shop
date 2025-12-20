/**
 * 喜欢产品管理 Hook
 *
 * 职责：
 * - 管理喜欢的产品ID集合
 * - 同步到localStorage持久化存储
 * - 提供添加/删除/清空操作
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'likedProducts';

export interface UseLikedProductsReturn {
    /** 喜欢的产品ID集合 */
    likedIds: Set<string>;
    /** 检查产品是否被喜欢 */
    isLiked: (id: string) => boolean;
    /** 切换喜欢状态 */
    toggleLike: (id: string) => void;
    /** 清空所有喜欢 */
    clearAll: () => void;
    /** 喜欢的产品数量 */
    count: number;
}

/**
 * 从 localStorage 加载喜欢列表
 */
function loadFromStorage(): Set<string> {
    if (typeof window === 'undefined') {
        return new Set();
    }

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const ids = JSON.parse(saved) as string[];
            return new Set(ids);
        }
    } catch (error) {
        console.error('Failed to load liked products from localStorage:', error);
    }

    return new Set();
}

/**
 * 保存喜欢列表到 localStorage
 */
function saveToStorage(likedIds: Set<string>): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const ids = Array.from(likedIds);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
        console.error('Failed to save liked products to localStorage:', error);
    }
}

/**
 * 管理用户喜欢的产品列表
 */
export function useLikedProducts(): UseLikedProductsReturn {
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [mounted, setMounted] = useState(false);

    // 客户端挂载后加载数据
    useEffect(() => {
        setMounted(true);
        setLikedIds(loadFromStorage());
    }, []);

    // 检查产品是否被喜欢
    const isLiked = useCallback((id: string): boolean => {
        return likedIds.has(id);
    }, [likedIds]);

    // 切换喜欢状态
    const toggleLike = useCallback((id: string): void => {
        setLikedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            saveToStorage(next);
            return next;
        });
    }, []);

    // 清空所有喜欢
    const clearAll = useCallback((): void => {
        const emptySet = new Set<string>();
        setLikedIds(emptySet);
        saveToStorage(emptySet);
    }, []);

    // 服务端渲染时返回空集合
    if (!mounted) {
        return {
            likedIds: new Set(),
            isLiked: () => false,
            toggleLike: () => {},
            clearAll: () => {},
            count: 0,
        };
    }

    return {
        likedIds,
        isLiked,
        toggleLike,
        clearAll,
        count: likedIds.size,
    };
}










