import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const prisma = new PrismaClient();

// 固定导出目录
const EXPORT_DIR = path.join(process.cwd(), 'exports', 'products');
const IMAGES_DIR = path.join(EXPORT_DIR, 'images');
const JSON_FILE = path.join(EXPORT_DIR, 'products.json');

// 根据 Content-Type 获取文件扩展名
function getExtensionFromContentType(contentType: string | undefined): string {
    if (!contentType) {
        return '.jpg'; // 默认使用 jpg
    }

    // 映射 Content-Type 到文件扩展名
    const contentTypeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/bmp': '.bmp',
        'image/svg+xml': '.svg',
        'image/x-icon': '.ico',
        'image/vnd.microsoft.icon': '.ico'
    };

    // 移除可能的分号后的参数（如 charset=utf-8）
    const baseContentType = contentType.split(';')[0].trim().toLowerCase();

    return contentTypeMap[baseContentType] || '.jpg'; // 默认使用 jpg
}

// 下载图片，返回 Content-Type
async function downloadImage(url: string, filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        let file: fsSync.WriteStream | null = null;

        const cleanup = () => {
            if (file) {
                file.close();
                file = null;
            }
        };

        const handleResponse = (response: http.IncomingMessage) => {
            // 处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                    cleanup();
                    return downloadImage(response.headers.location, filePath).then(resolve).catch(reject);
                }
            }

            if (response.statusCode !== 200) {
                cleanup();
                fs.unlink(filePath).catch(() => { }); // 删除空文件
                reject(new Error(`下载失败: HTTP ${response.statusCode}`));
                return;
            }

            // 获取 Content-Type
            const contentType = response.headers['content-type'] as string | undefined;

            file = fsSync.createWriteStream(filePath);
            response.pipe(file);

            file.on('finish', () => {
                cleanup();
                resolve(contentType || 'image/jpeg');
            });

            file.on('error', (err) => {
                cleanup();
                fs.unlink(filePath).catch(() => { }); // 删除空文件
                reject(err);
            });
        };

        client.get(url, handleResponse).on('error', (err) => {
            reject(err);
        });
    });
}

// 主函数
async function exportProducts() {
    try {
        console.log('开始导出商品数据...');

        // 创建导出目录
        await fs.mkdir(EXPORT_DIR, { recursive: true });
        await fs.mkdir(IMAGES_DIR, { recursive: true });

        // 查询所有商品
        const products = await prisma.product.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`找到 ${products.length} 个商品`);

        // 准备导出的数据
        const exportData = [];

        // 处理每个商品
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            console.log(`处理商品 ${i + 1}/${products.length}: ${product.name} (${product.id})`);

            // 提取非图片数据
            const productData: any = {
                id: product.id,
                name: product.name,
                category: product.category,
                style: product.style,
                priceRef: product.priceRef,
                materials: product.materials,
                description: product.description,
                colorSeries: product.colorSeries,
                targetAudience: product.targetAudience,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            };

            exportData.push(productData);

            // 处理图片
            if (product.images && Array.isArray(product.images)) {
                const imageUrls = product.images as string[];

                for (let j = 0; j < imageUrls.length; j++) {
                    const imageUrl = imageUrls[j];

                    if (!imageUrl || typeof imageUrl !== 'string') {
                        console.warn(`  跳过无效图片 URL: ${imageUrl}`);
                        continue;
                    }

                    try {
                        // 先检查可能的文件扩展名，看文件是否已存在
                        const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
                        let existingFile: string | null = null;

                        for (const ext of possibleExtensions) {
                            const possibleFileName = imageUrls.length === 1
                                ? `${product.id}${ext}`
                                : `${product.id}-${j + 1}${ext}`;
                            const possibleFilePath = path.join(IMAGES_DIR, possibleFileName);

                            try {
                                await fs.access(possibleFilePath);
                                existingFile = possibleFileName;
                                break;
                            } catch {
                                // 文件不存在，继续检查下一个扩展名
                            }
                        }

                        // 如果文件已存在，跳过下载
                        if (existingFile) {
                            console.log(`  ⏭ 跳过：图片已存在 ${existingFile}`);
                            continue;
                        }

                        // 先使用临时文件名，下载后再根据 Content-Type 重命名
                        const tempFileName = imageUrls.length === 1
                            ? `${product.id}.tmp`
                            : `${product.id}-${j + 1}.tmp`;
                        const tempFilePath = path.join(IMAGES_DIR, tempFileName);

                        console.log(`  下载图片 ${j + 1}/${imageUrls.length}: ${imageUrl}`);

                        // 下载图片，获取 Content-Type
                        const contentType = await downloadImage(imageUrl, tempFilePath);

                        // 根据 Content-Type 确定正确的扩展名
                        const ext = getExtensionFromContentType(contentType);

                        // 生成最终文件名
                        const finalFileName = imageUrls.length === 1
                            ? `${product.id}${ext}`
                            : `${product.id}-${j + 1}${ext}`;
                        const finalFilePath = path.join(IMAGES_DIR, finalFileName);

                        // 如果临时文件名和最终文件名不同，重命名
                        if (tempFilePath !== finalFilePath) {
                            await fs.rename(tempFilePath, finalFilePath);
                        }

                        console.log(`  ✓ 图片下载成功: ${finalFileName} (Content-Type: ${contentType})`);
                    } catch (error) {
                        console.error(`  ✗ 图片下载失败: ${imageUrl}`, error);
                    }
                }
            }
        }

        // 写入 JSON 文件
        await fs.writeFile(JSON_FILE, JSON.stringify(exportData, null, 2), 'utf-8');

        console.log(`\n导出完成！`);
        console.log(`JSON 文件: ${JSON_FILE}`);
        console.log(`图片目录: ${IMAGES_DIR}`);
        console.log(`共导出 ${exportData.length} 个商品`);

    } catch (error) {
        console.error('导出失败:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// 运行脚本
exportProducts()
    .then(() => {
        console.log('脚本执行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });

