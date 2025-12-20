/**
 * 筛选相关类型定义
 */

/**
 * 查看模式
 */
export type ViewMode = 'all' | 'liked' | 'shared';

/**
 * 筛选条件
 */
export interface FilterState {
    /** 款式筛选 */
    style: string;
    /** 色系筛选 */
    color: string;
    /** 搜索关键词 */
    search: string;
}

/**
 * 筛选选项配置
 */
export const FILTER_OPTIONS = {
    /** 款式选项 */
    STYLES: ['花束', '花篮', '花盒', '桌花', '手捧花', '抱抱桶', '开业花篮', '其他'] as const,
    /** 色系选项 */
    COLORS: ['红', '粉', '白', '黄', '紫', '橙', '蓝', '绿', '混搭'] as const,
} as const;

/** 款式类型 */
export type StyleOption = typeof FILTER_OPTIONS.STYLES[number];

/** 色系类型 */
export type ColorOption = typeof FILTER_OPTIONS.COLORS[number];

