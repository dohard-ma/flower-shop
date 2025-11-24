'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface Product {
    id: string;
    name: string;
    category: string;
    images: string[];
    videos?: string[];
    priceRef: string;
    description?: string;
    materials: Array<{
        name: string;
        quantity?: number;
        color?: string;
        description?: string;
    }>;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    success: boolean;
    data: Product;
}

export default function ProductDetail() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/public/products/${params.id}`);
                const result: ApiResponse = await response.json();

                if (result.success && result.data) {
                    setProduct(result.data);
                } else {
                    setError('产品不存在');
                }
            } catch (err) {
                console.error('Failed to fetch product:', err);
                setError('网络错误，请稍后重试');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchProduct();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || '产品不存在'}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                    >
                        返回
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        重试
                    </button>
                </div>
            </div>
        );
    }

    const images = Array.isArray(product.images) ? product.images : [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <button
                            onClick={() => router.back()}
                            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-lg font-medium text-gray-900 truncate">产品详情</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Product Images */}
                    <div className="relative">
                        {images.length > 0 ? (
                            <>
                                <div className="aspect-square relative bg-gray-100">
                                    <Image
                                        src={images[currentImageIndex]}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 800px"
                                    />
                                </div>

                                {/* Image Navigation */}
                                {images.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCurrentImageIndex(prev =>
                                                prev === 0 ? images.length - 1 : prev - 1
                                            )}
                                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setCurrentImageIndex(prev =>
                                                prev === images.length - 1 ? 0 : prev + 1
                                            )}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>

                                        {/* Image Indicators */}
                                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                            {images.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                    className={`w-2 h-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="aspect-square flex items-center justify-center bg-gray-200">
                                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="p-6">
                        <div className="mb-4">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {getCategoryName(product.category)}
                            </span>
                        </div>

                        <div className="mb-6">
                            <span className="text-3xl font-bold text-red-600">¥{product.priceRef}</span>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">产品描述</h3>
                                <p className="text-gray-700 leading-relaxed">{product.description}</p>
                            </div>
                        )}

                        {/* Materials */}
                        {product.materials && Array.isArray(product.materials) && product.materials.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-3">花材信息</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {product.materials.map((material, index) => (
                                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                            <div className="font-medium text-gray-900">{material.name}</div>
                                            {material.color && (
                                                <div className="text-sm text-gray-600">颜色: {material.color}</div>
                                            )}
                                            {material.quantity && (
                                                <div className="text-sm text-gray-600">数量: {material.quantity}</div>
                                            )}
                                            {material.description && (
                                                <div className="text-sm text-gray-600 mt-1">{material.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                            <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                立即订购
                            </button>
                            <button className="flex-1 bg-white text-blue-600 py-3 px-6 rounded-lg font-medium border border-blue-600 hover:bg-blue-50 transition-colors">
                                咨询客服
                            </button>
                        </div>
                    </div>
                </div>
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
