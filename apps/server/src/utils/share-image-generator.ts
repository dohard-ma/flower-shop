/**
 * 分享图片生成工具 - 最终优化版
 *
 * 优化点回顾：
 * 1. [新] 精确计算了垂直坐标，确保虚线分割线上下间距完全相等（均为 100px）。
 * 2. [新] 二维码位置下移，完美坐落在底部粉色区域内。
 * 3. [已包含] 实现了全局圆角裁剪，导出图片为圆角卡片样式。
 * 4. [已包含] 实现了杂志风的图片堆叠和拍立得效果。
 */

// --- 接口定义 ---

export interface Product {
    id: string;
    name: string;
    images: string[];
}

export interface ShareImageOptions {
    products: Product[];
    shareUrl: string;
    /** 可选：用于处理图片URL的函数（例如 CDN 裁剪参数） */
    processImageUrl?: (url: string, options: { width?: number; height?: number; quality?: number }) => string;
    /** 可选：背景图片 URL，如果不提供则使用默认渐变 */
    backgroundImageUrl?: string;
}

// --- 辅助函数 ---

/**
 * 扩展 CanvasRenderingContext2D 的 roundRect 方法
 * 用于兼容不支持原生 roundRect 的环境
 */
function ensureRoundRect(ctx: CanvasRenderingContext2D) {
    if (!(ctx as any).roundRect) {
        (ctx as any).roundRect = function (
            this: CanvasRenderingContext2D,
            x: number,
            y: number,
            w: number,
            h: number,
            r: number
        ) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.beginPath();
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            this.closePath();
            return this;
        };
    }
}

/**
 * 加载图片
 */
function loadImage(src: string, useCORS = true): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (useCORS) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            // 返回一个空的占位图，避免整个流程失败
            reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
    });
}

// --- 核心绘制逻辑 ---

/**
 * 绘制堆叠的商品图片（拍立得风格）
 */
async function drawStackedProductImages(
    ctx: CanvasRenderingContext2D,
    products: Product[],
    centerX: number,
    topY: number,
    processImageUrl?: (url: string, options: { width?: number; height?: number; quality?: number }) => string
) {
    const displayProducts = products.slice(0, 3);
    const count = displayProducts.length;
    if (count === 0) return;

    const borderWidth = 10;
    const borderRadius = 12;

    // 定义位置配置
    const allPositions = [
        // 3张图配置
        [
            { x: -80, y: 20, width: 280, height: 350, rotation: -6, zIndex: 1, shadowBlur: 10, shadowOpacity: 0.15 },
            { x: 60, y: 40, width: 280, height: 350, rotation: 4, zIndex: 2, shadowBlur: 10, shadowOpacity: 0.2 },
            { x: -10, y: 0, width: 300, height: 380, rotation: -1.5, zIndex: 3, shadowBlur: 20, shadowOpacity: 0.25 }
        ],
        // 2张图配置
        [
            { x: -40, y: 20, width: 290, height: 360, rotation: -4, zIndex: 1, shadowBlur: 12, shadowOpacity: 0.18 },
            { x: 40, y: 0, width: 300, height: 380, rotation: 3, zIndex: 2, shadowBlur: 20, shadowOpacity: 0.25 }
        ],
        // 1张图配置
        [
            { x: 0, y: 0, width: 320, height: 400, rotation: 0, zIndex: 1, shadowBlur: 20, shadowOpacity: 0.25 }
        ]
    ];

    const configIndex = 3 - count;
    const positions = allPositions[configIndex];

    const sortedItems = displayProducts
        .map((product, index) => ({ product, pos: positions[index] }))
        .sort((a, b) => a.pos.zIndex - b.pos.zIndex);

    const imagePromises = sortedItems.map(item => {
        const { product, pos } = item;
        if (!product.images || product.images.length === 0) return Promise.resolve(null);
        const imageUrl = processImageUrl
            ? processImageUrl(product.images[0], { width: pos.width, height: pos.height, quality: 85 })
            : product.images[0];
        return loadImage(imageUrl).catch(() => null);
    });

    const loadedImages = await Promise.all(imagePromises);

    for (let i = 0; i < sortedItems.length; i++) {
        const img = loadedImages[i];
        if (!img) continue;

        const { pos } = sortedItems[i];
        ctx.save();

        // 变换坐标系
        const itemCenterX = centerX + pos.x;
        const itemCenterY = topY + pos.y + pos.height / 2;
        ctx.translate(itemCenterX, itemCenterY);
        ctx.rotate((pos.rotation * Math.PI) / 180);
        const drawX = -pos.width / 2;
        const drawY = -pos.height / 2;

        // 绘制白边框和阴影
        ctx.shadowColor = `rgba(0, 0, 0, ${pos.shadowOpacity})`;
        ctx.shadowBlur = pos.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        (ctx as any).roundRect(
            drawX - borderWidth,
            drawY - borderWidth,
            pos.width + borderWidth * 2,
            pos.height + borderWidth * 2,
            borderRadius + 4
        );
        ctx.fill();

        // 绘制图片内容
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        (ctx as any).roundRect(drawX, drawY, pos.width, pos.height, borderRadius);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, pos.width, pos.height);
        ctx.restore();
    }
}

/**
 * 生成分享图片的主函数
 */
export async function generateShareImage(options: ShareImageOptions): Promise<string> {
    const { products, shareUrl, processImageUrl, backgroundImageUrl } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('无法创建 Canvas 上下文');
    }

    ensureRoundRect(ctx);

    // 1. 设置画布尺寸
    const canvasWidth = 750;
    const canvasHeight = 1334;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // --- 全局圆角裁剪 ---
    const outerRadius = 36;
    ctx.beginPath();
    (ctx as any).roundRect(0, 0, canvasWidth, canvasHeight, outerRadius);
    ctx.clip();

    // 2. 绘制背景
    if (backgroundImageUrl) {
        try {
            const bgImg = await loadImage(backgroundImageUrl);
            ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        } catch (e) {
            drawDefaultBackground(ctx, canvasWidth, canvasHeight);
        }
    } else {
        drawDefaultBackground(ctx, canvasWidth, canvasHeight);
    }

    // --- 核心坐标常量定义 (本次优化的关键) ---
    const headerTopCenterY = 120;
    const imageAreaTopY = 240;
    // 根据计算，图片堆叠的视觉底部大约在 y=640 左右

    // [调整 1] 分隔线 Y 坐标
    // 设定为 740。这样它距离上方图片底部(约640)的间距为 100px。
    const dividerCenterY = 740;

    // [调整 2] 底部粉色区域起始 Y
    // 让它从分隔线位置开始
    const footerStartY = dividerCenterY;

    // [调整 3] 二维码绘制坐标
    const qrSize = 240;
    const qrBoxPadding = 20; // drawQRCodeSection 中定义的 padding 值
    // 我们希望二维码白盒子的顶部距离分隔线也是 100px
    // 白盒子顶部 Y = dividerCenterY + 100 = 840
    // 因此，二维码图片的绘制起点 qrDrawY = 白盒子顶部 Y + padding
    const qrDrawY = 840 + qrBoxPadding; // 860

    // [调整 4] 底部文字坐标
    // 白盒子底部 Y = qrDrawY + qrSize + padding = 860 + 240 + 20 = 1120
    // 文字距离白盒子底部 60px
    const textStartY = 1120 + 60; // 1180
    // ---------------------------------------


    // 3. 绘制标题区域
    ctx.fillStyle = '#BE185D';
    ctx.font = 'bold 56px "Songti SC", "Noto Serif SC", STSong, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('甄选·花礼', canvasWidth / 2, headerTopCenterY);

    ctx.fillStyle = '#999999';
    ctx.font = '300 24px -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SPECIALLY SELECTED FOR YOU', canvasWidth / 2, headerTopCenterY + 50);
    ctx.letterSpacing = '0px';

    // 4. 绘制商品图片堆叠区域
    await drawStackedProductImages(
        ctx,
        products,
        canvasWidth / 2,
        imageAreaTopY,
        processImageUrl
    );

    // 5. 绘制分隔线装饰
    drawDecorativeDivider(ctx, canvasWidth, dividerCenterY);

    // 6. 绘制底部区域背景
    const footerHeight = canvasHeight - footerStartY;
    drawFooterSection(ctx, canvasWidth, footerStartY, footerHeight);

    // 7. 绘制二维码及其容器
    const qrX = (canvasWidth - qrSize) / 2;
    await drawQRCodeSection(ctx, shareUrl, qrX, qrDrawY, qrSize);

    // 8. 绘制底部文字
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('长按识别 查看详情', canvasWidth / 2, textStartY);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('用花，陪伴您的每个重要时刻', canvasWidth / 2, textStartY + 46);

    // 9. 导出图片 (使用 PNG 以支持透明圆角)
    return canvas.toDataURL('image/png', 0.92);
}


// --- 内部绘制子函数 ---

function drawDefaultBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#FFFCF5');
    gradient.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
}

function drawDecorativeDivider(ctx: CanvasRenderingContext2D, w: number, y: number) {
    ctx.save();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const lineLength = 100;
    const gap = 40;
    const centerX = w / 2;
    ctx.moveTo(centerX - gap / 2 - lineLength, y);
    ctx.lineTo(centerX - gap / 2, y);
    ctx.moveTo(centerX + gap / 2, y);
    ctx.lineTo(centerX + gap / 2 + lineLength, y);
    ctx.stroke();

    ctx.fillStyle = '#FBCFE8';
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✿', centerX, y + 2);
    ctx.restore();
}

function drawFooterSection(ctx: CanvasRenderingContext2D, w: number, y: number, height: number) {
    ctx.save();
    ctx.fillStyle = '#FFF5F7'; // 底部淡粉色背景
    ctx.fillRect(0, y, w, height);

    ctx.strokeStyle = '#F9A8D4';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制半圆缺口
    ctx.fillStyle = '#FFFFFF'; // 这里简化为白色，实际应匹配背景图对应位置的颜色
    const notchRadius = 16;
    ctx.beginPath();
    ctx.arc(0, y, notchRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w, y, notchRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

async function drawQRCodeSection(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
    ctx.save();
    const padding = 20; // 白盒子的内边距
    const boxSize = size + padding * 2;
    const boxX = x - padding;
    const boxY = y - padding;

    // 1. 绘制二维码白底容器
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    (ctx as any).roundRect(boxX, boxY, boxSize, boxSize, 24);
    ctx.fill();

    // 2. 绘制二维码图片
    ctx.shadowColor = 'transparent';
    try {
        // 演示用API，实际请替换
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(url)}&margin=0`;
        const qrImg = await loadImage(qrApiUrl);
        const innerPadding = 5;
        ctx.drawImage(qrImg, x + innerPadding, y + innerPadding, size - innerPadding * 2, size - innerPadding * 2);
    } catch (err) {
        // 简单的错误占位
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
}