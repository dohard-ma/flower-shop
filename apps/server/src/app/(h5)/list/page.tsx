'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * 处理七牛云图片URL，添加压缩参数（用于列表缩略图）
 * @param url 原始图片URL
 * @param options 处理选项
 * @returns 处理后的图片URL
 */
function processQiniuImageUrl(
    url: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
    } = {}
): string {
    if (!url || typeof url !== 'string') return url;

    // 检查是否已经包含图片处理参数，避免重复添加
    if (url.includes('imageMogr2') || url.includes('imageView2')) {
        return url;
    }

    const { width = 500, height = 500, quality = 85 } = options;
    const params: string[] = [];

    // 缩略图处理：使用居中裁剪模式，保持图片方向
    params.push(`auto-orient`); // 自动根据 EXIF 信息旋转图片
    params.push(`thumbnail/${width}x${height}`); // 等比缩放并居中裁剪

    // 质量压缩
    params.push(`quality/${quality}`);

    // 组合处理参数
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}imageMogr2/${params.join('/')}`;
}

interface Product {
    id: string;
    name: string;
    category: string | null;
    style: string | null;
    colorSeries: string | null;
    targetAudience: string[] | null;
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

// 筛选选项
const STYLE_OPTIONS = ['花束', '花篮', '花盒', '桌花', '手捧花', '抱抱桶', '开业花篮', '其他'];
const COLOR_OPTIONS = ['红', '粉', '白', '黄', '紫', '橙', '蓝', '绿', '混搭'];

export default function DiscoverPage() {

    const { toast } = useToast();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [mounted, setMounted] = useState(false);

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // 使用 ref 来防止重复请求
    const isLoadingRef = useRef(false);
    const lastPageRequestedRef = useRef(0);

    // 筛选状态
    const [showStyleFilter, setShowStyleFilter] = useState(false);
    const [showColorFilter, setShowColorFilter] = useState(false);

    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [showLikedOnly, setShowLikedOnly] = useState(false);

    // 图片预览状态
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // 确保客户端渲染一致性，避免 hydration 错误
    useEffect(() => {
        setMounted(true);
    }, []);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        if (!mounted) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // 检查点击是否在下拉菜单外部
            if (
                (showStyleFilter || showColorFilter) &&
                !target.closest('.filter-dropdown') &&
                !target.closest('.filter-button')
            ) {
                setShowStyleFilter(false);
                setShowColorFilter(false);
            }
        };

        if (showStyleFilter || showColorFilter) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [mounted, showStyleFilter, showColorFilter]);

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

    // 获取产品列表
    const fetchProducts = useCallback(async (page: number = 1, append: boolean = false) => {
        // 防止重复请求
        if (isLoadingRef.current) {
            return;
        }

        try {
            isLoadingRef.current = true;

            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            // 构建查询参数
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '10');
            if (selectedStyle) params.append('style', selectedStyle);
            if (selectedColor) params.append('colorSeries', selectedColor);
            if (searchQuery) params.append('search', searchQuery);

            const queryString = params.toString();
            const url = `/api/public/products?${queryString}`;

            const response = await fetch(url);
            const result: ApiResponse = await response.json();

            if (result.success && result.data) {
                if (append) {
                    // 追加数据，使用函数式更新避免重复
                    setProducts(prev => {
                        // 检查是否已存在该页的数据（通过产品ID去重）
                        const existingIds = new Set(prev.map(p => p.id));
                        const newProducts = result.data.data.filter(p => !existingIds.has(p.id));

                        if (newProducts.length === 0) {
                            // 没有新数据，返回原数据
                            return prev;
                        }

                        return [...prev, ...newProducts];
                    });
                } else {
                    // 重置数据
                    setProducts(result.data.data);
                    lastPageRequestedRef.current = 0; // 重置最后请求的页码
                }
                setCurrentPage(result.data.page);
                setTotalPages(result.data.totalPages);
                setHasMore(result.data.page < result.data.totalPages);
            } else {
                setError('获取产品列表失败');
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError('网络错误，请稍后重试');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [selectedStyle, selectedColor, searchQuery]);

    // 初始加载和筛选条件变化时重置分页
    useEffect(() => {
        setCurrentPage(1);
        setHasMore(true);
        lastPageRequestedRef.current = 0; // 重置最后请求的页码
        fetchProducts(1, false);
    }, [fetchProducts]);

    // 滚动加载更多
    useEffect(() => {
        if (!mounted || loading || loadingMore || !hasMore || showLikedOnly) return;

        let scrollTimer: NodeJS.Timeout | null = null;

        const handleScroll = () => {
            // 使用节流，减少触发频率
            if (scrollTimer) return;

            scrollTimer = setTimeout(() => {
                scrollTimer = null;

                // 再次检查状态，防止在节流期间状态已改变
                if (isLoadingRef.current || loadingMore || !hasMore) {
                    return;
                }

                // 计算是否滚动到底部（距离底部100px时触发）
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;

                if (scrollTop + windowHeight >= documentHeight - 100) {
                    // 使用函数式更新获取最新的 currentPage
                    setCurrentPage(prevPage => {
                        const nextPage = prevPage + 1;

                        // 检查是否正在加载或已经请求过这一页
                        if (isLoadingRef.current || lastPageRequestedRef.current === nextPage) {
                            return prevPage;
                        }

                        // 记录请求的页码
                        lastPageRequestedRef.current = nextPage;

                        // 发起请求
                        fetchProducts(nextPage, true);

                        return prevPage; // 不在这里更新，让 fetchProducts 来更新
                    });
                }
            }, 200); // 200ms 节流
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimer) {
                clearTimeout(scrollTimer);
            }
        };
    }, [mounted, loading, loadingMore, hasMore, showLikedOnly, fetchProducts]);

    // 过滤"我喜欢"
    const filteredProducts = products.filter(product => {
        if (showLikedOnly) {
            return likedProducts.has(product.id);
        }
        return true;
    });

    // 打开图片预览
    const openPreview = (index: number) => {
        setPreviewIndex(index);
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    };

    // 关闭图片预览
    const closePreview = () => {
        setPreviewIndex(null);
        document.body.style.overflow = ''; // 恢复滚动
    };

    // 键盘事件处理（ESC 关闭）
    useEffect(() => {
        if (previewIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closePreview();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [previewIndex]);

    // 功能尚未实现的提示
    const showTips = () => {
        toast({
            title: '功能尚未实现',
            description: '敬请期待',
            variant: 'default',
            duration: 500,
        });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 顶部导航栏 */}
            <header className="bg-white sticky top-0 z-50 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* 左侧菜单 */}
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={showTips}>
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* 标题 */}
                    <h1 className="text-lg font-semibold text-gray-900">发现</h1>

                    {/* 右侧购物袋 */}
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors relative" onClick={showTips}>
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </button>
                </div>

                {/* 搜索栏 */}
                {/* <div className="px-4 pb-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="搜索花束或花语"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                    </div>
                </div> */}

                {/* 筛选选项 */}
                <div className="flex items-center px-4 pb-3 gap-2">
                    {/* 款式 */}
                    <div className="relative flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setShowStyleFilter(!showStyleFilter);
                                setShowColorFilter(false);
                            }}
                            className={`filter-button flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedStyle ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span>款式</span>
                            <svg className={`w-4 h-4 transition-transform ${showStyleFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {mounted && showStyleFilter && (
                            <div
                                className="filter-dropdown absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] min-w-[120px] max-h-60 overflow-y-auto"
                                onClick={(e) => {
                                    // 阻止点击事件冒泡
                                    e.stopPropagation();
                                }}
                                onWheel={(e) => {
                                    // 阻止滚动事件冒泡到页面
                                    e.stopPropagation();
                                }}
                                onTouchMove={(e) => {
                                    // 阻止触摸滚动事件冒泡到页面
                                    e.stopPropagation();
                                }}
                            >
                                <button
                                    onClick={() => {
                                        setSelectedStyle('');
                                        setShowStyleFilter(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!selectedStyle ? 'bg-pink-50 text-pink-600' : ''}`}
                                >
                                    全部
                                </button>
                                {STYLE_OPTIONS.map(style => (
                                    <button
                                        key={style}
                                        onClick={() => {
                                            setSelectedStyle(style);
                                            setShowStyleFilter(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedStyle === style ? 'bg-pink-50 text-pink-600' : ''}`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 色系 */}
                    <div className="relative flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setShowColorFilter(!showColorFilter);
                                setShowStyleFilter(false);
                            }}
                            className={`filter-button flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedColor ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span>色系</span>
                            <svg className={`w-4 h-4 transition-transform ${showColorFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {mounted && showColorFilter && (
                            <div
                                className="filter-dropdown absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] min-w-[100px] max-h-60 overflow-y-auto"
                                onClick={(e) => {
                                    // 阻止点击事件冒泡
                                    e.stopPropagation();
                                }}
                                onWheel={(e) => {
                                    // 阻止滚动事件冒泡到页面
                                    e.stopPropagation();
                                }}
                                onTouchMove={(e) => {
                                    // 阻止触摸滚动事件冒泡到页面
                                    e.stopPropagation();
                                }}
                            >
                                <button
                                    onClick={() => {
                                        setSelectedColor('');
                                        setShowColorFilter(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!selectedColor ? 'bg-pink-50 text-pink-600' : ''}`}
                                >
                                    全部
                                </button>
                                {COLOR_OPTIONS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            setSelectedColor(color);
                                            setShowColorFilter(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedColor === color ? 'bg-pink-50 text-pink-600' : ''}`}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 我喜欢 */}
                    <div className="relative flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setShowLikedOnly(!showLikedOnly);
                                setShowStyleFilter(false);
                                setShowColorFilter(false);
                            }}
                            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${showLikedOnly ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <svg
                                className={`w-4 h-4 ${showLikedOnly ? 'text-red-500 fill-current' : 'text-gray-600'}`}
                                fill={showLikedOnly ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>我喜欢</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 主内容区域 */}
            <main className="px-4 py-4">
                {/* AI推荐标题 */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">为您精心挑选</h2>
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            <span>加载中...</span>
                        </div>
                    )}
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setCurrentPage(1);
                                setHasMore(true);
                                fetchProducts(1, false);
                            }}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                        >
                            重试
                        </button>
                    </div>
                )}

                {/* 商品网格 */}
                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, index) => (
                            <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                                <div className="aspect-[3/4] bg-gray-200"></div>
                                <div className="p-3">
                                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map((product, index) => (
                            <div
                                key={product.id}
                                className="block group cursor-pointer"
                                onClick={() => openPreview(index)}
                            >
                                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                    {/* 商品图片 */}
                                    <div className="relative aspect-[1/1] overflow-hidden">
                                        {product.images && product.images.length > 0 ? (
                                            <Image
                                                src={processQiniuImageUrl(product.images[0], {
                                                    width: 500,
                                                    height: 500,
                                                    quality: 85
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

                                        {/* AI推荐标签 */}
                                        {/* <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                            AI推荐
                                        </div> */}

                                        {/* 收藏按钮 */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleLike(product.id);
                                            }}
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all duration-200"
                                        >
                                            <svg
                                                className={`w-4 h-4 transition-all duration-200 ${likedProducts.has(product.id)
                                                    ? 'text-red-500 fill-current'
                                                    : 'text-gray-600'
                                                    }`}
                                                fill={likedProducts.has(product.id) ? 'currentColor' : 'none'}
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* 商品信息 */}
                                    <div className="p-3">
                                        <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 leading-relaxed">
                                            {product.name}
                                        </h3>
                                        {/* <div className="flex items-center justify-between">
                                            <span className="text-red-500 font-semibold text-base">
                                                ¥{product.priceRef}
                                            </span>
                                        </div> */}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-gray-300"
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
                        <h3 className="text-base font-medium text-gray-900 mb-2">暂无商品</h3>
                        <p className="text-sm text-gray-500 text-center max-w-sm">没有找到符合条件的商品，试试调整筛选条件吧。</p>
                    </div>
                )}

                {/* 加载更多提示 */}
                {!loading && filteredProducts.length > 0 && (
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
                )}
            </main>

            {/* 全屏图片预览 */}
            {previewIndex !== null && filteredProducts[previewIndex] && (
                <div
                    className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
                    onClick={closePreview}
                >
                    {/* 关闭按钮 */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            closePreview();
                        }}
                        className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                        aria-label="关闭预览"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* 图片容器 - 点击图片也关闭预览 */}
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {filteredProducts[previewIndex].images && filteredProducts[previewIndex].images.length > 0 ? (
                            <div className="relative w-full h-full max-w-4xl max-h-full">
                                <Image
                                    src={filteredProducts[previewIndex].images[0]}
                                    alt={filteredProducts[previewIndex].name}
                                    fill
                                    className="object-contain cursor-pointer"
                                    sizes="100vw"
                                    priority
                                    onClick={closePreview}
                                />
                            </div>
                        ) : (
                            <div className="text-white text-center">
                                <p>暂无图片</p>
                            </div>
                        )}
                    </div>

                    {/* 图片信息 */}
                    <div className="absolute bottom-4 left-0 right-0 z-10 text-center text-white pointer-events-none">
                        <p className="text-base font-medium">
                            {filteredProducts[previewIndex].name}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

