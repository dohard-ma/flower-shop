/**
 * 产品预览组件
 *
 * 职责：
 * - 全屏展示产品图片
 * - 支持键盘 ESC 关闭
 * - 显示产品名称
 */

'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { Product } from '../types';

interface ProductPreviewProps {
    /** 产品信息 */
    product: Product | null;
    /** 是否显示 */
    isOpen: boolean;
    /** 关闭回调 */
    onClose: () => void;
}

/**
 * 产品预览组件
 */
export function ProductPreview({ product, isOpen, onClose }: ProductPreviewProps) {
    // 键盘事件处理
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !product) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
            onClick={onClose}
        >
            {/* 关闭按钮 */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                aria-label="关闭预览"
            >
                <X className="w-6 h-6" />
            </button>

            {/* 图片容器 */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
                {product.images && product.images.length > 0 ? (
                    <div className="relative w-full h-full max-w-4xl max-h-full">
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-contain cursor-pointer"
                            sizes="100vw"
                            priority
                            onClick={onClose}
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
                <p className="text-base font-medium">{product.name}</p>
            </div>
        </div>
    );
}










