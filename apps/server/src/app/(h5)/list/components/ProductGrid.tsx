/**
 * 产品网格组件
 *
 * 职责：
 * - 展示产品列表网格布局
 * - 处理加载状态
 * - 处理空状态
 * - 处理加载更多提示
 */

'use client';

import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { EmptyState } from './EmptyState';

interface ProductGridProps {
    /** 产品列表 */
    products: Product[];
    /** 加载状态 */
    loading: boolean;
    /** 加载更多状态 */
    loadingMore: boolean;
    /** 是否有更多数据 */
    hasMore: boolean;
    /** 检查是否喜欢 */
    isLiked: (id: string) => boolean;
    /** 切换喜欢 */
    onToggleLike: (id: string) => void;
    /** 点击产品回调 */
    onProductClick: (index: number) => void;
}

/**
 * 产品网格组件
 */
export function ProductGrid({
    products,
    loading,
    loadingMore,
    hasMore,
    isLiked,
    onToggleLike,
    onProductClick,
}: ProductGridProps) {
    // 加载状态骨架屏
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse"
                    >
                        <div className="aspect-[3/4] bg-gray-200"></div>
                        <div className="p-3">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // 空状态
    if (products.length === 0) {
        return <EmptyState />;
    }

    // 产品列表
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                {products.map((product, index) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        isLiked={isLiked(product.id)}
                        onToggleLike={onToggleLike}
                        onClick={() => onProductClick(index)}
                    />
                ))}
            </div>

            {/* 加载更多提示 */}
            <div className="mt-6 pb-6">
                {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                        <span>加载更多...</span>
                    </div>
                ) : !hasMore ? (
                    <div className="text-center text-sm text-gray-400 py-4">
                        没有更多商品了
                    </div>
                ) : null}
            </div>
        </>
    );
}








