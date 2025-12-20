import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import ExcelJS from 'exceljs';

// 固定目录
const EXPORT_DIR = path.join(process.cwd(), 'exports');
const IMAGES_DIR = path.join(EXPORT_DIR, 'products', 'images');
const PRODUCTS_JSON = path.join(EXPORT_DIR, 'products', 'products.json');
const SELECTION_JSON = path.join(EXPORT_DIR, 'products-selection.json');
const WATERMARK_PATH = path.join(EXPORT_DIR, 'watermark.png');
const WATERMARKED_DIR = path.join(EXPORT_DIR, 'watermarked-images');
const EXCEL_FILE = path.join(EXPORT_DIR, 'selected-products.xlsx');

interface ProductData {
    id: string;
    name: string;
    category: string | null;
    style: string | null;
    priceRef: string;
    materials: string[];
    description: string | null;
    colorSeries: string | null;
    targetAudience: string[];
    imageCount: number;
}

// 添加水印到图片
async function addWatermark(imagePath: string, outputPath: string): Promise<void> {
    try {
        // 读取原始图片
        const image = sharp(imagePath);
        const imageMetadata = await image.metadata();
        const imageWidth = imageMetadata.width || 0;
        const imageHeight = imageMetadata.height || 0;

        // 读取水印图片
        const watermark = sharp(WATERMARK_PATH);
        const watermarkMetadata = await watermark.metadata();
        const watermarkWidth = watermarkMetadata.width || 0;
        const watermarkHeight = watermarkMetadata.height || 0;

        // 计算水印大小（缩小到原图的1/6左右）
        const watermarkScale = Math.min(imageWidth, imageHeight) / 6;
        const scaledWatermarkWidth = Math.round(Math.min(watermarkWidth, watermarkScale));
        const scaledWatermarkHeight = Math.round((scaledWatermarkWidth / watermarkWidth) * watermarkHeight);

        // 确保尺寸是正整数
        const finalWatermarkWidth = Math.max(1, scaledWatermarkWidth);
        const finalWatermarkHeight = Math.max(1, scaledWatermarkHeight);

        // 缩小水印
        const scaledWatermark = await watermark
            .resize(finalWatermarkWidth, finalWatermarkHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer();

        // 计算底部3/4区域的起始位置（只平铺一行）
        const bottomQuarterStart = Math.floor(imageHeight * 0.25); // 从25%的位置开始
        const bottomQuarterHeight = imageHeight - bottomQuarterStart; // 底部3/4的高度

        // 计算水印在底部3/4区域的垂直居中位置（只平铺一行）
        const verticalCenter = bottomQuarterStart + Math.floor(bottomQuarterHeight / 2);
        const watermarkY = Math.round(verticalCenter - finalWatermarkHeight / 2);

        // 计算平铺数量（只横向平铺一行，适度平铺，不填满）
        // 根据图片大小，横向3-5个
        const horizontalCount = Math.min(Math.max(3, Math.floor(imageWidth / finalWatermarkWidth / 2)), 5);

        // 计算水印之间的横向间距
        const horizontalSpacing = Math.floor((imageWidth - horizontalCount * finalWatermarkWidth) / (horizontalCount + 1));

        // 创建合成图片的数组
        const composites: sharp.OverlayOptions[] = [];

        // 在底部3/4区域平铺一行水印
        for (let col = 0; col < horizontalCount; col++) {
            const x = Math.round(horizontalSpacing + col * (finalWatermarkWidth + horizontalSpacing));

            composites.push({
                input: scaledWatermark,
                left: x,
                top: watermarkY,
                blend: 'over' // 使用叠加模式
            });
        }

        // 获取原图格式，确保输出格式一致
        const imageFormat = imageMetadata.format || 'jpeg';
        const ext = path.extname(outputPath).toLowerCase();

        // 构建输出管道，确保高质量不被压缩
        let outputPipeline = image.composite(composites);

        // 根据格式设置输出选项，确保高质量不被压缩
        if (imageFormat === 'jpeg' || ext === '.jpg' || ext === '.jpeg') {
            outputPipeline = outputPipeline
                .jpeg({
                    quality: 100, // JPEG 最高质量
                    mozjpeg: true // 使用 mozjpeg 编码器（更高质量）
                });
        } else if (imageFormat === 'png' || ext === '.png') {
            outputPipeline = outputPipeline
                .png({
                    compressionLevel: 0, // PNG 不压缩（最高质量）
                    palette: false // 不使用调色板，保持真彩色
                });
        } else {
            // 其他格式保持原格式
            outputPipeline = outputPipeline.toFormat(imageFormat);
        }

        // 应用水印并保存，确保高质量
        await outputPipeline.toFile(outputPath);

    } catch (error) {
        console.error(`添加水印失败: ${imagePath}`, error);
        throw error;
    }
}

// 截取为正方形
async function cropToSquare(imagePath: string, outputPath: string): Promise<void> {
    try {
        // 1. 加入 .rotate() 自动处理手机照片旋转问题
        const image = sharp(imagePath).rotate();

        const imageMetadata = await image.metadata();
        const imageWidth = imageMetadata.width || 0;
        const imageHeight = imageMetadata.height || 0;

        // 增加兜底检查，防止读取不到宽高导致后续计算 NaN
        if (!imageWidth || !imageHeight) {
            throw new Error('无法获取图片尺寸');
        }

        const minSize = Math.min(imageWidth, imageHeight);

        // 计算居中坐标
        const cropX = Math.floor((imageWidth - minSize) / 2);
        const cropY = Math.floor((imageHeight - minSize) / 2);

        // 2. 去掉 unnecessary await
        // 注意：extract 是在原管道上操作，直接链式调用即可
        await image
            .extract({
                left: cropX,
                top: cropY,
                width: minSize,
                height: minSize
            })
            .toFile(outputPath);

    } catch (error) {
        console.error(`截取为正方形失败: ${imagePath}`, error);
        throw error;
    }
}
// 查找商品的所有图片
async function findProductImages(productId: string, imagesDir: string): Promise<string[]> {
    const imageFiles: string[] = [];

    // 检查单图片文件
    const singleImagePath = path.join(imagesDir, `${productId}.jpg`);
    const singleImagePathPng = path.join(imagesDir, `${productId}.png`);

    // 先检查单图片
    try {
        await fs.access(singleImagePath);
        imageFiles.push(singleImagePath);
        return imageFiles; // 如果是单图片，直接返回
    } catch {
        try {
            await fs.access(singleImagePathPng);
            imageFiles.push(singleImagePathPng);
            return imageFiles; // 如果是单图片，直接返回
        } catch {
            // 继续检查多图片
        }
    }

    // 检查多图片文件
    let index = 1;
    while (index <= 100) { // 防止无限循环
        const multiImagePath = path.join(imagesDir, `${productId}-${index}.jpg`);
        const multiImagePathPng = path.join(imagesDir, `${productId}-${index}.png`);

        let found = false;

        // 检查 jpg
        try {
            await fs.access(multiImagePath);
            imageFiles.push(multiImagePath);
            found = true;
        } catch {
            // 检查 png
            try {
                await fs.access(multiImagePathPng);
                imageFiles.push(multiImagePathPng);
                found = true;
            } catch {
                // 没有更多图片了
                break;
            }
        }

        if (!found) {
            break;
        }

        index++;
    }

    return imageFiles;
}

// 主函数
async function exportSelectedProducts() {
    try {
        console.log('开始导出选中的商品...');

        // 检查必需的文件
        if (!await fs.access(PRODUCTS_JSON).then(() => true).catch(() => false)) {
            throw new Error(`找不到商品数据文件: ${PRODUCTS_JSON}`);
        }

        if (!await fs.access(SELECTION_JSON).then(() => true).catch(() => false)) {
            throw new Error(`找不到选择配置文件: ${SELECTION_JSON}`);
        }

        if (!await fs.access(WATERMARK_PATH).then(() => true).catch(() => false)) {
            throw new Error(`找不到水印图片: ${WATERMARK_PATH}`);
        }

        // 读取配置文件
        const selectionContent = await fs.readFile(SELECTION_JSON, 'utf-8');
        const selectedIds: string[] = JSON.parse(selectionContent);
        console.log(`配置文件中共有 ${selectedIds.length} 个商品ID`);

        // 读取完整商品数据
        const productsContent = await fs.readFile(PRODUCTS_JSON, 'utf-8');
        const allProducts: ProductData[] = JSON.parse(productsContent);

        // 筛选出选中的商品
        const selectedProducts = allProducts.filter(product =>
            selectedIds.includes(product.id)
        );

        console.log(`找到 ${selectedProducts.length} 个匹配的商品`);

        if (selectedProducts.length === 0) {
            console.warn('没有找到匹配的商品，请检查配置文件中的商品ID');
            return;
        }

        // 创建带水印图片的目录
        await fs.mkdir(WATERMARKED_DIR, { recursive: true });

        // 处理每个商品
        const excelData: Array<ProductData & { imageCount: number }> = [];

        for (let i = 0; i < selectedProducts.length; i++) {
            const product = selectedProducts[i];
            console.log(`\n处理商品 ${i + 1}/${selectedProducts.length}: ${product.name} (${product.id})`);

            // 查找商品的所有图片
            const imageFiles = await findProductImages(product.id, IMAGES_DIR);

            if (imageFiles.length === 0) {
                console.warn(`  未找到商品图片: ${product.id}`);
                excelData.push({
                    ...product,
                    imageCount: 0
                });
                continue;
            }

            console.log(`  找到 ${imageFiles.length} 张图片`);

            // 处理每张图片，添加水印
            let processedCount = 0;
            for (let j = 0; j < imageFiles.length; j++) {
                const imagePath = imageFiles[j];
                const imageExt = path.extname(imagePath);

                // 生成输出文件名
                const outputFileName = imageFiles.length === 1
                    ? `${product.id}${imageExt}`
                    : `${product.id}-${j + 1}${imageExt}`;
                const outputPath = path.join(WATERMARKED_DIR, outputFileName);

                try {
                    console.log(`    添加水印: ${path.basename(imagePath)} -> ${outputFileName}`);
                    // await addWatermark(imagePath, outputPath);
                    await cropToSquare(imagePath, outputPath);
                    processedCount++;
                } catch (error) {
                    console.error(`    水印处理失败: ${imagePath}`, error);
                }
            }

            console.log(`  ✓ 完成 ${processedCount}/${imageFiles.length} 张图片`);

            excelData.push({
                ...product,
                imageCount: processedCount
            });
        }

        // 创建Excel文件
        console.log('\n生成Excel文件...');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('商品列表');

        // 设置表头
        worksheet.columns = [
            { header: '产品ID', key: 'id', width: 30 },
            { header: '商品名称', key: 'name', width: 50 },
            { header: '分类', key: 'category', width: 15 },
            { header: '风格', key: 'style', width: 15 },
            { header: '参考价格', key: 'priceRef', width: 15 },
            { header: '描述', key: 'description', width: 60 },
            { header: '图片数量', key: 'imageCount', width: 12 },
            { header: '花材', key: 'materials', width: 15 },
            { header: '色系', key: 'colorSeries', width: 15 },
            { header: '赠送对象', key: 'targetAudience', width: 15 },
            { header: '主花材', key: 'mainMaterial', width: 15 },
            { header: '枝数/朵数', key: 'branchCount', width: 15 },
            { header: '属性', key: 'attributes', width: 60 },

            // 属性[主花材]不能为空；属性[枝数/朵数]不能为空；属性[色系]不能为空；属性[款式]不能为空；属性[适用人群]不能为空；

        ];

        // 设置表头样式
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // 添加数据
        excelData.forEach((product) => {
            worksheet.addRow({
                id: product.id,
                name: product.name,
                category: product.category || '',
                style: product.style || '',
                priceRef: product.priceRef,
                description: product.description || '',
                imageCount: product.imageCount,
                materials: product.materials.join(',') || '',
                colorSeries: product.colorSeries || '',
                targetAudience: product.targetAudience.join(',') || '',
                mainMaterial: product.materials[0] || '',
                branchCount: 26,
                attributes: `主花材：${product.materials[0] || ''}。枝数/朵数：26。色系：${product.colorSeries || ''}。款式：${product.style || ''}。适用人群：${product.targetAudience.join(',')};`
            });
        });

        // 保存Excel文件
        await workbook.xlsx.writeFile(EXCEL_FILE);

        console.log(`\n导出完成！`);
        console.log(`Excel 文件: ${EXCEL_FILE}`);
        console.log(`带水印图片目录: ${WATERMARKED_DIR}`);
        console.log(`共导出 ${excelData.length} 个商品`);
        console.log(`共处理 ${excelData.reduce((sum, p) => sum + p.imageCount, 0)} 张图片`);

    } catch (error) {
        console.error('导出失败:', error);
        throw error;
    }
}

// 运行脚本
exportSelectedProducts()
    .then(() => {
        console.log('脚本执行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });

