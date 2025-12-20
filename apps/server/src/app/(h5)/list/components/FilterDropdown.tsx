/**
 * 通用筛选下拉组件
 *
 * 职责：
 * - 通用的下拉筛选UI
 * - 支持泛型，适配任何选项类型
 * - 统一交互逻辑
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface FilterDropdownProps<T extends string> {
    /** 筛选器标签 */
    label: string;
    /** 选项列表 */
    options: readonly T[];
    /** 当前选中值 */
    value: T | '';
    /** 值变化回调 */
    onChange: (value: T | '') => void;
    /** 自定义选项渲染 */
    renderOption?: (option: T) => React.ReactNode;
}

/**
 * 通用筛选下拉组件
 */
export function FilterDropdown<T extends string>({
    label,
    options,
    value,
    onChange,
    renderOption = (option) => option,
}: FilterDropdownProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    const handleSelect = (selectedValue: T | '') => {
        onChange(selectedValue);
        setIsOpen(false);
    };

    return (
        <div className="relative flex-shrink-0" ref={dropdownRef}>
            {/* 触发按钮 */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`filter-button flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    value ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
                <span>{label}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* 下拉菜单 */}
            {isOpen && (
                <div
                    className="filter-dropdown absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] min-w-[120px] max-h-60 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    {/* 全部选项 */}
                    <button
                        onClick={() => handleSelect('')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            !value ? 'bg-pink-50 text-pink-600' : ''
                        }`}
                    >
                        全部
                    </button>

                    {/* 选项列表 */}
                    {options.map((option) => (
                        <button
                            key={option}
                            onClick={() => handleSelect(option)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                value === option ? 'bg-pink-50 text-pink-600' : ''
                            }`}
                        >
                            {renderOption(option)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}








