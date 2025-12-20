/**
 * 筛选栏组件
 *
 * 职责：
 * - 组织所有筛选器
 * - 管理筛选器交互
 * - 统一筛选器样式
 */

'use client';

import { Share2, Trash2 } from 'lucide-react';
import { FilterDropdown } from './FilterDropdown';
import { FILTER_OPTIONS, type StyleOption, type ColorOption } from '../types';

interface FilterBarProps {
    /** 当前款式 */
    selectedStyle: string;
    /** 当前色系 */
    selectedColor: string;
    /** 是否显示"我喜欢" */
    showLikedOnly: boolean;
    /** 是否显示"为您推荐" */
    showSharedOnly: boolean;
    /** 是否显示"为您推荐"按钮 */
    hasSharedIds: boolean;
    /** 喜欢数量 */
    likedCount: number;
    /** 款式变化 */
    onStyleChange: (style: string) => void;
    /** 色系变化 */
    onColorChange: (color: string) => void;
    /** 切换"我喜欢" */
    onToggleLiked: () => void;
    /** 切换"为您推荐" */
    onToggleShared: () => void;
    /** 清空所有喜欢 */
    onClearAllLiked?: () => void;
}

/**
 * 筛选栏组件
 */
export function FilterBar({
    selectedStyle,
    selectedColor,
    showLikedOnly,
    showSharedOnly,
    hasSharedIds,
    likedCount,
    onStyleChange,
    onColorChange,
    onToggleLiked,
    onToggleShared,
    onClearAllLiked,
}: FilterBarProps) {
    return (
        <div className="flex items-center px-4 pb-3 gap-2">
            {/* 款式筛选 */}
            <FilterDropdown<StyleOption>
                label="款式"
                options={FILTER_OPTIONS.STYLES}
                value={selectedStyle as StyleOption | ''}
                onChange={onStyleChange}
            />

            {/* 色系筛选 */}
            <FilterDropdown<ColorOption>
                label="色系"
                options={FILTER_OPTIONS.COLORS}
                value={selectedColor as ColorOption | ''}
                onChange={onColorChange}
            />

            {/* 我喜欢 */}
            <div className="relative flex-shrink-0">
                <button
                    type="button"
                    onClick={onToggleLiked}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        showLikedOnly
                            ? 'bg-pink-100 text-pink-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <svg
                        className={`w-4 h-4 ${showLikedOnly ? 'text-red-500 fill-current' : 'text-gray-600'}`}
                        fill={showLikedOnly ? 'currentColor' : 'none'}
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
                    <span>我喜欢</span>
                    {likedCount > 0 && (
                        <span className="ml-1 text-xs">({likedCount})</span>
                    )}
                </button>
            </div>

            {/* 为您推荐（分享模式） */}
            {hasSharedIds && (
                <div className="relative flex-shrink-0">
                    <button
                        type="button"
                        onClick={onToggleShared}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            showSharedOnly
                                ? 'bg-pink-100 text-pink-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Share2 className="w-4 h-4" />
                        <span>为您推荐</span>
                    </button>
                </div>
            )}
        </div>
    );
}










