/**
 * 无限滚动 Hook
 *
 * 职责：
 * - 监听页面滚动事件
 * - 触发加载更多回调
 * - 节流优化性能
 * - 自动清理事件监听
 */

import { useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
    /** 加载更多回调 */
    onLoadMore: () => void;
    /** 是否有更多数据 */
    hasMore: boolean;
    /** 是否正在加载 */
    isLoading: boolean;
    /** 触发阈值（距离底部多少px时触发） */
    threshold?: number;
    /** 是否启用 */
    enabled?: boolean;
}

/**
 * 无限滚动 Hook
 *
 * @param options 配置选项
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions): void {
    const {
        onLoadMore,
        hasMore,
        isLoading,
        threshold = 100,
        enabled = true,
    } = options;

    const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // 未启用或没有更多数据时不监听
        if (!enabled || !hasMore || isLoading) {
            return;
        }

        const handleScroll = () => {
            // 节流处理
            if (scrollTimerRef.current) {
                return;
            }

            scrollTimerRef.current = setTimeout(() => {
                scrollTimerRef.current = null;

                // 再次检查状态
                if (isLoading || !hasMore) {
                    return;
                }

                // 计算是否到达底部
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;

                if (scrollTop + windowHeight >= documentHeight - threshold) {
                    onLoadMore();
                }
            }, 200); // 200ms 节流
        };

        // 添加滚动监听
        window.addEventListener('scroll', handleScroll, { passive: true });

        // 清理函数
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimerRef.current) {
                clearTimeout(scrollTimerRef.current);
            }
        };
    }, [enabled, hasMore, isLoading, threshold, onLoadMore]);
}








