/**
 * 图片处理工具函数
 */

/**
 * 七牛云图片处理选项
 */
export interface QiniuImageOptions {
    /** 目标宽度 */
    width?: number;
    /** 目标高度 */
    height?: number;
    /** 图片质量 (1-100) */
    quality?: number;
}

/**
 * 处理七牛云图片URL，添加压缩参数
 *
 * @param url 原始图片URL
 * @param options 处理选项
 * @returns 处理后的图片URL
 *
 * @example
 * ```ts
 * const thumbnailUrl = processQiniuImageUrl(
 *   'https://cdn.example.com/image.jpg',
 *   { width: 500, height: 500, quality: 85 }
 * );
 * ```
 */
export function processQiniuImageUrl(
    url: string,
    options: QiniuImageOptions = {}
): string {
    // 参数校验
    if (!url || typeof url !== 'string') {
        return url;
    }

    // 避免重复添加处理参数
    if (url.includes('imageMogr2') || url.includes('imageView2')) {
        return url;
    }

    // 默认参数
    const { width = 500, height = 500, quality = 85 } = options;

    // 构建处理参数
    const params: string[] = [
        'auto-orient',                  // 自动根据 EXIF 信息旋转图片
        `thumbnail/${width}x${height}`, // 等比缩放并居中裁剪
        `quality/${quality}`,           // 质量压缩
    ];

    // 添加参数到URL
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}imageMogr2/${params.join('/')}`;
}

/**
 * 预设的图片处理配置
 */
export const IMAGE_PRESETS = {
    /** 缩略图 (小) */
    THUMBNAIL_SMALL: { width: 300, height: 300, quality: 80 },
    /** 缩略图 (中) */
    THUMBNAIL_MEDIUM: { width: 500, height: 500, quality: 85 },
    /** 缩略图 (大) */
    THUMBNAIL_LARGE: { width: 800, height: 800, quality: 90 },
    /** 预览图 */
    PREVIEW: { width: 1200, height: 1200, quality: 90 },
} as const;

