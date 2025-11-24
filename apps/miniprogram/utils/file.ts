/**
   * 获取文件类型后缀
   * @param filePath 文件路径或文件对象
   * @param defaultType 默认类型（image 或 video）
   * @returns 文件后缀（jpg、png、jpeg、mp4等）
   */
export const getFileExtension = (filePath: string | any, defaultType: 'image' | 'video' = 'image'): string => {
    let ext: string | undefined;

    // 如果传入的是文件对象，尝试从 fileType 获取
    if (typeof filePath === 'object' && filePath.fileType) {
        const fileType = filePath.fileType.toLowerCase();
        // 映射 fileType 到后缀
        const typeMap: Record<string, string> = {
            'image': 'jpg',
            'jpg': 'jpg',
            'jpeg': 'jpg',
            'png': 'png',
            'gif': 'gif',
            'webp': 'webp',
            'video': 'mp4',
            'mp4': 'mp4',
            'mov': 'mov',
            'avi': 'avi',
            'm4v': 'm4v'
        };
        ext = typeMap[fileType];
    }

    // 如果没有从 fileType 获取到，尝试从文件路径获取后缀
    if (!ext && typeof filePath === 'string') {
        const pathMatch = filePath.match(/\.([a-zA-Z0-9]+)$/);
        if (pathMatch && pathMatch[1]) {
            ext = pathMatch[1].toLowerCase();
        }
    }

    // 验证是否是支持的类型
    if (ext) {
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const videoExts = ['mp4', 'mov', 'avi', 'm4v'];

        if (defaultType === 'image' && imageExts.includes(ext)) {
            return ext === 'jpeg' ? 'jpg' : ext; // 统一 jpeg 为 jpg
        }
        if (defaultType === 'video' && videoExts.includes(ext)) {
            return ext;
        }
    }

    // 如果没有后缀或后缀不匹配，使用默认类型
    if (defaultType === 'image') {
        return 'jpg'; // 图片默认为 jpg
    } else {
        return 'mp4'; // 视频默认为 mp4
    }
}

