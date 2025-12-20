/**
 * 分享图片模态框组件
 *
 * 职责：
 * - 展示生成的分享图片
 * - 提供下载功能
 */

'use client';

import { X } from 'lucide-react';

interface ShareImageModalProps {
    /** 是否显示 */
    isOpen: boolean;
    /** 分享图片URL */
    imageUrl: string | null;
    /** 关闭回调 */
    onClose: () => void;
    /** 下载回调 */
    onDownload: () => void;
}

/**
 * 分享图片模态框组件
 */
export function ShareImageModal({
    isOpen,
    imageUrl,
    onClose,
    onDownload,
}: ShareImageModalProps) {
    if (!isOpen || !imageUrl) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    aria-label="关闭"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* 分享图片 */}
                <div className="mb-4">
                    <img
                        src={imageUrl}
                        alt="分享图片"
                        className="w-full rounded-lg"
                    />
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                    <button
                        onClick={onDownload}
                        className="flex-1 bg-gradient-to-r from-rose-500 to-orange-400 text-white py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                        保存图片
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                    >
                        取消
                    </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                    保存图片后，可以发送给微信好友
                </p>
            </div>
        </div>
    );
}








