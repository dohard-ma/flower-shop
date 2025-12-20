/**
 * 产品卡片组件
 *
 * 职责：
 * - 展示单个产品信息
 * - 处理喜欢交互
 * - 处理点击预览
 */

'use client';

import Image from 'next/image';
import type { Product } from '../types';
import { processQiniuImageUrl } from '../utils/image-processor';

interface ProductCardProps {
    /** 产品信息 */
    product: Product;
    /** 是否被喜欢 */
    isLiked: boolean;
    /** 切换喜欢回调 */
    onToggleLike: (id: string) => void;
    /** 点击卡片回调 */
    onClick?: () => void;
}

/**
 * 产品卡片组件
 */
export function ProductCard({
    product,
    isLiked,
    onToggleLike,
    onClick,
}: ProductCardProps) {
    const handleLikeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleLike(product.id);
    };

    return (
        <div
            className="block group cursor-pointer"
            onClick={onClick}
        >
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                {/* 产品图片 */}
                <div className="relative aspect-[3/4] overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                        <Image
                            src={processQiniuImageUrl(product.images[0], {
                                width: 500,
                                height: 500,
                                quality: 85,
                            })}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <svg
                                className="w-8 h-8 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                    )}

                    {/* 收藏按钮 */}
                    <button
                        onClick={handleLikeClick}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all duration-200"
                        aria-label={isLiked ? '取消喜欢' : '喜欢'}
                    >
                        <svg
                            className={`w-4 h-4 transition-all duration-200 ${
                                isLiked ? 'text-red-500 fill-current' : 'text-gray-600'
                            }`}
                            fill={isLiked ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                    </button>
                </div>

                {/* 产品信息 */}
                <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 leading-relaxed">
                        {product.name}
                    </h3>
                </div>
            </div>
        </div>
    );
}








