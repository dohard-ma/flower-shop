'use client';

/**
 * 产品发现页面
 *
 * 功能：
 * - 展示产品列表
 * - 支持筛选（款式、色系、喜欢、分享）
 * - 支持无限滚动加载
 * - 支持产品预览
 * - 支持生成分享图片
 */

import { Suspense, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Loader2, Share2, Trash2 } from 'lucide-react';
import { generateShareImage } from '@/utils/share-image-generator';
import { Modal, Button, Group, Text, Title, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';

// 导入自定义 Hooks
import {
    useLikedProducts,
    useProductFilter,
    useProducts,
    useSharedProducts,
    useInfiniteScroll,
} from './hooks';

// 导入组件
import {
    FilterBar,
    ProductGrid,
    ProductPreview,
    ShareImageModal,
} from './components';

// 导入工具函数
import { processQiniuImageUrl } from './utils/image-processor';
import type { Product } from './types';

/**
 * 页面内容组件
 */
function DiscoverPageContent() {
    const router = useRouter();

    // === 状态管理 ===
    const [viewMode, setViewMode] = useState<'all' | 'liked' | 'shared'>('all');
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [showShareImage, setShowShareImage] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
    const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // === 自定义 Hooks ===

    // 喜欢列表管理
    const { likedIds, isLiked, toggleLike, clearAll, count: likedCount } = useLikedProducts();

    // 分享模式管理
    const {
        isSharedMode,
        sharedProducts,
        loading: sharedLoading,
    } = useSharedProducts();

    // 产品筛选
    const [filters, setFilters] = useState({ style: '', color: '', search: '' });

    // 产品数据获取（普通模式）
    const {
        products: allProducts,
        loading: productsLoading,
        loadingMore,
        pagination,
        fetchProducts,
        fetchMore,
    } = useProducts({
        params: {
            style: filters.style,
            colorSeries: filters.color,
            search: filters.search,
        },
    });

    // === 数据整合逻辑 ===

    // 根据视图模式确定产品源
    const sourceProducts =
        viewMode === 'shared' ? sharedProducts :
            viewMode === 'liked' ? allProducts.filter(p => isLiked(p.id)) :
                allProducts;

    // 前端筛选（仅用于liked和shared模式）
    const { filteredProducts } = useProductFilter(
        viewMode === 'all' ? [] : sourceProducts // 普通模式由API筛选，不需要前端筛选
    );

    // 最终展示的产品列表
    const displayProducts = viewMode === 'all' ? sourceProducts : filteredProducts;

    // 加载状态
    const loading = viewMode === 'shared' ? sharedLoading : productsLoading;

    // === 无限滚动 ===
    useInfiniteScroll({
        onLoadMore: fetchMore,
        hasMore: pagination.hasMore && viewMode === 'all',
        isLoading: loading || loadingMore,
        enabled: viewMode === 'all',
    });

    // === 事件处理 ===

    // 款式筛选变化
    const handleStyleChange = useCallback((style: string) => {
        setFilters(prev => ({ ...prev, style }));
        if (viewMode === 'all') {
            fetchProducts(1);
        }
    }, [viewMode, fetchProducts]);

    // 色系筛选变化
    const handleColorChange = useCallback((color: string) => {
        setFilters(prev => ({ ...prev, color }));
        if (viewMode === 'all') {
            fetchProducts(1);
        }
    }, [viewMode, fetchProducts]);

    // 切换"我喜欢"
    const handleToggleLiked = useCallback(() => {
        const newMode = viewMode === 'liked' ? 'all' : 'liked';
        setViewMode(newMode);

        if (newMode === 'liked') {
            // 切换到喜欢模式：清除筛选
            setFilters({ style: '', color: '', search: '' });
        } else {
            // 切换回普通模式：重新加载
            fetchProducts(1);
        }
    }, [viewMode, fetchProducts]);

    // 切换"为您推荐"
    const handleToggleShared = useCallback(() => {
        const newMode = viewMode === 'shared' ? 'all' : 'shared';
        setViewMode(newMode);

        if (newMode === 'all') {
            // 切换回普通模式：重新加载
            fetchProducts(1);
        }
    }, [viewMode, fetchProducts]);

    // 打开预览
    const handleProductClick = useCallback((index: number) => {
        setPreviewIndex(index);
    }, []);

    // 关闭预览
    const handleClosePreview = useCallback(() => {
        setPreviewIndex(null);
    }, []);

    // 生成分享图片
    const handleGenerateShareImage = useCallback(async () => {
        const likedProductsList = allProducts.filter(p => isLiked(p.id));

        if (likedProductsList.length === 0) {
            notifications.show({
                title: '暂无分享内容',
                message: '请先选择您喜欢的花束',
            });
            return;
        }

        setIsGeneratingShareImage(true);

        try {
            const likedIdsArray = Array.from(likedIds);
            const currentUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${currentUrl}?shared=${likedIdsArray.join(',')}`;

            const imageUrl = await generateShareImage({
                products: likedProductsList,
                shareUrl,
                processImageUrl: processQiniuImageUrl,
            });

            setShareImageUrl(imageUrl);
            setShowShareImage(true);
        } catch (err) {
            console.error('Failed to generate share image:', err);
            notifications.show({
                title: '生成分享图失败',
                message: '请稍后重试',
                color: 'red',
            });
        } finally {
            setIsGeneratingShareImage(false);
        }
    }, [allProducts, isLiked, likedIds]);

    // 下载分享图片
    const handleDownloadShareImage = useCallback(() => {
        if (!shareImageUrl) return;

        const link = document.createElement('a');
        link.download = `花束分享-${new Date().getTime()}.png`;
        link.href = shareImageUrl;
        link.click();
    }, [shareImageUrl]);

    // 清空所有喜欢
    const handleClearAllLiked = useCallback(() => {
        clearAll();
        setShowClearConfirm(false);
    }, [clearAll]);

    // 功能提示
    const showTips = useCallback(() => {
        notifications.show({
            title: '功能尚未实现',
            message: '敬请期待',
            duration: 2000,
        });
    }, []);

    // === 渲染 ===
    return (
        <div className="min-h-screen bg-gray-50">
            {/* 顶部导航栏 */}
            <header className="bg-white sticky top-0 z-50 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* 左侧 Home 按钮 */}
                    <button
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={() => router.push('/')}
                        aria-label="返回首页"
                    >
                        <Home className="w-6 h-6 text-gray-700" />
                    </button>

                    {/* 标题 */}
                    <h1 className="text-lg font-semibold text-gray-900">发现</h1>

                    {/* 右侧购物袋 */}
                    <button
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                        onClick={showTips}
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </button>
                </div>

                {/* 筛选栏 */}
                <FilterBar
                    selectedStyle={filters.style}
                    selectedColor={filters.color}
                    showLikedOnly={viewMode === 'liked'}
                    showSharedOnly={viewMode === 'shared'}
                    hasSharedIds={isSharedMode}
                    likedCount={likedCount}
                    onStyleChange={handleStyleChange}
                    onColorChange={handleColorChange}
                    onToggleLiked={handleToggleLiked}
                    onToggleShared={handleToggleShared}
                />
            </header>

            {/* 主内容区域 */}
            <main className="px-4 py-4">
                {/* 标题栏 */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 h-9">
                        为您精心挑选
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* 喜欢模式下的操作按钮 */}
                        {viewMode === 'liked' && likedCount > 0 && (
                            <>
                                {/* 清空按钮 */}
                                <button
                                    onClick={() => setShowClearConfirm(true)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    aria-label="清除所有喜欢"
                                >
                                    <Trash2 className="w-5 h-5 text-gray-500" />
                                </button>
                                <Modal opened={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="确认清除">
                                    <Stack>
                                        <Text>确定要清除所有喜欢的花束吗？此操作无法撤销。</Text>
                                        <Group justify="flex-end">
                                            <Button variant="subtle" onClick={() => setShowClearConfirm(false)}>取消</Button>
                                            <Button color="red" onClick={handleClearAllLiked}>确认清除</Button>
                                        </Group>
                                    </Stack>
                                </Modal>

                                {/* 分享按钮 */}
                                <button
                                    onClick={handleGenerateShareImage}
                                    disabled={isGeneratingShareImage}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                    aria-label="生成分享图"
                                >
                                    {isGeneratingShareImage ? (
                                        <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                                    ) : (
                                        <Share2 className="w-5 h-5 text-pink-500" />
                                    )}
                                </button>
                            </>
                        )}

                        {/* 加载指示器 */}
                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                <span>加载中...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 产品网格 */}
                <ProductGrid
                    products={displayProducts}
                    loading={loading}
                    loadingMore={loadingMore}
                    hasMore={pagination.hasMore && viewMode === 'all'}
                    isLiked={isLiked}
                    onToggleLike={toggleLike}
                    onProductClick={handleProductClick}
                />
            </main>

            {/* 产品预览 */}
            <ProductPreview
                product={previewIndex !== null ? displayProducts[previewIndex] : null}
                isOpen={previewIndex !== null}
                onClose={handleClosePreview}
            />

            {/* 分享图片模态框 */}
            <ShareImageModal
                isOpen={showShareImage}
                imageUrl={shareImageUrl}
                onClose={() => setShowShareImage(false)}
                onDownload={handleDownloadShareImage}
            />
        </div>
    );
}

/**
 * 主页面组件（包裹 Suspense）
 */
export default function DiscoverPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">加载中...</p>
                    </div>
                </div>
            }
        >
            <DiscoverPageContent />
        </Suspense>
    );
}
