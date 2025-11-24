'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
    id: string;
    name: string;
    category: string;
    images: string[];
    priceRef: string;
    description?: string;
    status: string;
}

interface ApiResponse {
    success: boolean;
    data: {
        data: Product[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export default function Home() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
    const [showPromotion, setShowPromotion] = useState(true);
    const [isPromotionExpanded, setIsPromotionExpanded] = useState(true);

    const toggleLike = (productId: string) => {
        setLikedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/public/products');
                const result: ApiResponse = await response.json();

                if (result.success && result.data) {
                    setProducts(result.data.data);
                } else {
                    setError('获取产品列表失败');
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
                setError('网络错误，请稍后重试');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Loading Store Header */}
                <div className="bg-white p-4 sm:p-6 mb-4">
                    {/* 响应式Loading布局 */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-center md:space-x-8 space-y-4 md:space-y-0 max-w-4xl md:mx-auto">
                        {/* 左侧：Logo区域Loading */}
                        <div className="flex items-center space-x-3 md:space-x-0 md:flex-col md:items-center flex-shrink-0">
                            <div className="w-20 h-20 md:w-28 lg:w-32 xl:w-36 md:h-28 lg:h-32 xl:h-36 bg-gray-200 rounded-full animate-pulse"></div>
                            {/* 小屏幕信息 */}
                            <div className="flex-1 md:hidden">
                                <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </div>
                            {/* 大屏幕信息 */}
                            <div className="hidden md:block mt-3 text-center">
                                <div className="h-6 bg-gray-200 rounded w-40 mb-2 animate-pulse mx-auto"></div>
                                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse mx-auto"></div>
                            </div>
                        </div>

                        {/* 右侧：介绍信息Loading */}
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/5 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Loading Content */}
                <main className="max-w-full mx-auto px-3 py-2">
                    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3">
                        {[...Array(12)].map((_, index) => (
                            <div key={index} className="break-inside-avoid mb-3">
                                <div className="bg-gray-100 rounded-xl overflow-hidden animate-pulse" style={{ height: `${220 + (index % 3) * 60}px` }}>
                                    <div className="w-full h-3/4 bg-gray-200"></div>
                                    <div className="p-3">
                                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
                    >
                        重新加载
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden">
            {/* 小红书博主页面风格的花店头部 */}
            <div className="bg-white">
                {/* 店铺主要信息 */}
                <div className="p-4 sm:p-6">
                    {/* 小屏幕：垂直布局 | 大屏幕：左右分布居中 */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-center md:space-x-8 space-y-4 md:space-y-0 max-w-4xl md:mx-auto">
                        {/* 左侧：Logo区域 */}
                        <div className="flex items-center space-x-3 md:space-x-0 md:flex-col md:items-center md:text-center flex-shrink-0">
                            {/* 店铺头像/Logo */}
                            <div className="relative">
                                <Image
                                    src="/logo.webp"
                                    alt="花涧里"
                                    width={120}
                                    height={120}
                                    className="w-20 h-20 md:w-28 lg:w-32 xl:w-36 md:h-28 lg:h-32 xl:h-36 rounded-full border-2 border-gray-100"
                                />

                            </div>

                            {/* 小屏幕的店铺基本信息 */}
                            <div className="flex-1 min-w-0 md:hidden">
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <h1 className="text-lg font-bold text-gray-900 truncate">深圳花涧里花艺</h1>

                                </div>
                                <p className="text-xs text-gray-500">手机号：16603056010</p>
                            </div>


                        </div>

                        {/* 右侧：介绍信息区域 */}
                        <div className="flex-1 min-w-0">

                            {/* 大屏幕的店铺名称（在Logo下方） */}
                            <div className="hidden md:block mt-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900">深圳花涧里花艺</h1>
                                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                                        <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        认证
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">手机号：16603056010</p>
                            </div>

                            {/* 店铺介绍 */}
                            <div className="-space-y-0.5 text-sm md:text-base text-gray-700 leading-relaxed tracking-tighter">
                                <p>以花触自然，以艺敬生命，让花传递美好与温度！</p>
                                <p>深圳全城可配送！仿真花永生花全国可邮寄</p>
                                <p>鲜花花束｜生日求婚｜派对布置｜开业花篮</p>
                                <p >营业时间：8:30-21:30</p>
                            </div>

                            {/* 店铺位置 */}
                            <div className="mt-3 md:mt-4 flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>广东深圳</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 活动广告区 - 可收起展开 */}
                {showPromotion && (
                    <div className="border-t border-gray-100 relative">
                        <div
                            className={`bg-gradient-to-r from-pink-50 to-red-50 transition-all duration-500 overflow-hidden ${isPromotionExpanded ? 'max-h-32 sm:max-h-28' : 'max-h-14 sm:max-h-16'
                                }`}
                        >
                            <div className="p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full mr-2 animate-pulse flex-shrink-0"></div>
                                        <span className="text-red-600 font-medium text-xs sm:text-sm">七夕特惠活动</span>
                                    </div>
                                    <button
                                        onClick={() => setIsPromotionExpanded(!isPromotionExpanded)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        <svg
                                            className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${isPromotionExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                {isPromotionExpanded && (
                                    <div className="mt-2 text-xs sm:text-sm text-gray-700 space-y-1">
                                        <p>💐 七夕预定中，25号前预定享受七夕优惠价！</p>
                                        <p className="text-red-600 font-medium">💕 情人节花束低至8折，买二送一配送服务</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab栏 */}
                <div className="border-t border-gray-100">
                    <div className="flex">
                        <button className="flex-1 py-2.5 sm:py-3 text-center ">
                            <span className=" font-medium text-sm sm:text-base">作品</span>
                        </button>
                        <button className="flex-1 py-2.5 sm:py-3 text-center">
                            <span className="text-gray-500 text-sm sm:text-base">商品</span>
                        </button>
                    </div>
                </div>
            </div>


            {/* Main Content */}
            <main className="max-w-full mx-auto px-2 sm:px-3 py-2 sm:py-3">
                {/* Masonry Grid - 小红书风格瀑布流 */}
                <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2 sm:gap-3">
                    {products.map((product, index) => (
                        <div
                            key={product.id}
                            className="break-inside-avoid mb-2 sm:mb-3"
                        >
                            <Link href={`/products/${product.id}`} className="block group">
                                <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                    {/* Product Image */}
                                    <div
                                        className="relative overflow-hidden"
                                        style={{
                                            aspectRatio: index % 2 === 0 ? '3/4' : '4/5'
                                        }}
                                    >
                                        {product.images && product.images.length > 0 ? (
                                            <Image
                                                src={product.images[0]}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
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

                                        {/* Like Button - 小红书风格 */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleLike(product.id);
                                            }}
                                            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all duration-200 group/like"
                                        >
                                            <svg
                                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-200 ${likedProducts.has(product.id)
                                                    ? 'text-red-500 fill-current'
                                                    : 'text-gray-600 group-hover/like:text-red-400'
                                                    }`}
                                                fill={likedProducts.has(product.id) ? 'currentColor' : 'none'}
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-2.5 sm:p-3">
                                        <h3 className="font-medium text-gray-900 text-xs sm:text-sm mb-1 line-clamp-2 leading-relaxed">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center justify-between mt-1.5 sm:mt-2">
                                            <span className="text-red-500 font-semibold text-sm sm:text-base">
                                                ¥{product.priceRef}
                                            </span>
                                            <span className="text-xs text-gray-400 bg-gray-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                                                {getCategoryName(product.category)}
                                            </span>
                                        </div>

                                        {/* Store Info - 小红书风格 */}
                                        <div className="flex items-center mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-50">
                                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-r from-pink-400 to-red-400 flex-shrink-0"></div>
                                            <span className="text-xs text-gray-500 ml-1.5 sm:ml-2 truncate">花润里 深圳花艺</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {products.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                            </svg>
                        </div>
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">暂无产品</h3>
                        <p className="text-sm sm:text-base text-gray-500 text-center max-w-sm">目前还没有可展示的花束作品，敬请期待更多精美花艺产品上线。</p>
                    </div>
                )}
            </main>
        </div>
    );
}

// Helper function to get category display name
function getCategoryName(category: string): string {
    const categoryMap: Record<string, string> = {
        'BOUQUET': '花束',
        'BASKET': '花篮',
        'POTTED': '盆栽',
        'WREATH': '花环'
    };
    return categoryMap[category] || category;
}