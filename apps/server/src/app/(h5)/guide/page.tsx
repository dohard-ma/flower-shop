'use client'; // 【重要】1. 声明为客户端组件

import { useState, useRef } from 'react';
// import type { Metadata } from 'next'; // 客户端组件不能导出 metadata，先注释掉
import { Noto_Serif_SC } from 'next/font/google';
import {
    Sparkles, Zap, Camera, Truck,
    Download, Loader2 // 引入新的图标
} from 'lucide-react';
// 【重要】2. 引入 html2canvas
import html2canvas from 'html2canvas';

// 配置字体
const notoSerifSC = Noto_Serif_SC({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-noto-serif',
    display: 'swap',
});

// 客户端组件不能包含 metadata 导出，如果需要 SEO，请放在父级 layout 或 page 中
/*
export const metadata: Metadata = {
    title: '花涧里 - 首页引导',
    description: '用花，陪伴您的每个重要时刻',
};
*/

export default function GuidePage() {
    // 【重要】3. 创建 ref 用于引用需要截图的卡片 DOM 元素
    const cardRef = useRef<HTMLElement>(null);
    // 【重要】4. 创建 state 用于管理下载时的加载状态
    const [isDownloading, setIsDownloading] = useState(false);

    // 【重要】5. 实现下载处理函数
    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            setIsDownloading(true);

            // 调用 html2canvas 将 ref 指向的元素转换为 canvas
            const canvas = await html2canvas(cardRef.current, {
                // 关键配置：允许跨域图片（Unsplash 和二维码 API 需要此配置）
                useCORS: true,
                // 提高清晰度，设置为 2 或 3 可以在高清屏上获得更好的效果
                scale: window.devicePixelRatio > 1 ? 2 : 1,
                // 背景透明，确保圆角外的区域是透明的而不是白色
                backgroundColor: null,
                // 稍微等待一下以确保字体和图片加载完成
                logging: false,
            });

            // 将 canvas 转换为数据 URL (base64 PNG图片)
            const image = canvas.toDataURL('image/png', 1.0);

            // 创建一个临时的能够点击的 <a> 标签来触发下载
            const link = document.createElement('a');
            link.href = image;
            // 设置下载的文件名
            link.download = `花涧里-引导卡片-${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Failed to download image:', error);
            alert('图片生成失败，请检查网络或稍后重试。');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        // 修改外层容器，改为 flex-col 并增加 gap，以便放置底部的下载按钮
        <div className={`flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 gap-8 ${notoSerifSC.variable} font-sans`}>

            {/* 【重要】6. 将 ref 绑定到主卡片容器上
                为了保证截图内容的稳定性，这里给 main 加一个固定的宽度约束，
                防止 flex 布局在不同屏幕下导致截图变形。
            */}
            <main
                ref={cardRef}
                className="relative flex w-[375px] flex-shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#FFF9F2] to-[#FFF0E6] shadow-2xl"
            >

                {/* 背景装饰光斑 */}
                <div className="pointer-events-none absolute left-[-100px] top-[-120px] h-[350px] w-[350px] rounded-full bg-[#FFE4D6] opacity-50 blur-[80px]" aria-hidden="true"></div>
                <div className="pointer-events-none absolute bottom-[100px] right-[-80px] h-[280px] w-[280px] rounded-full bg-[#FAD4C0] opacity-30 blur-[60px]" aria-hidden="true"></div>

                {/* Logo 区域 */}
                <div className="z-10 flex justify-center pt-10">
                    {/* 使用自定义字体变量 */}
                    <div className="flex h-10 items-center rounded-full border-2 border-[#A67B5B] px-4 py-1 font-[var(--font-noto-serif)] text-xl font-bold text-[#A67B5B]">
                        花涧里
                    </div>
                </div>

                {/* 标题区域 */}
                <div className="z-10 mt-8 px-6 text-center">
                    <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-[#CD9B7B]">
                        For Your Special Moment
                    </p>
                    {/* 使用自定义字体变量 */}
                    <h1 className="font-[var(--font-noto-serif)] text-[30px] font-bold leading-tight text-[#5E4B41]">
                        用花，陪伴您的<br />每个重要时刻
                    </h1>
                </div>

                {/* 主图区域 (拍立得风格) */}
                <div className="relative z-10 mx-8 mt-8 h-[280px]">
                    {/* 背景旋转的白色底框 */}
                    <div className="absolute inset-0 transform rounded-[24px] bg-white/60 rotate-[-3deg] scale-[1.02] shadow-sm"></div>
                    {/* 前景旋转的图片容器 */}
                    <div className="relative z-10 h-full w-full transform rounded-[24px] bg-white p-2 shadow-[0_12px_24px_rgba(166,123,91,0.15)] rotate-[2deg]">
                        <div className="h-full w-full overflow-hidden rounded-[20px]">
                            {/* 【重要】7. 为跨域图片添加 crossOrigin="anonymous"
                                这对于 html2canvas 正确捕获外部图片至关重要
                            */}
                            <img
                                src="https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&q=80&w=800"
                                className="h-full w-full object-cover"
                                alt="Flower Bouquet"
                                crossOrigin="anonymous"
                            />
                        </div>
                    </div>
                </div>

                {/* 优势卖点标签 */}
                {/* 信任标签 */}
                <div className="z-10 mt-10 mb-10 px-8 flex justify-center flex-wrap gap-3">
                    <TrustTag icon={<Zap className="w-3.5 h-3.5" />} text="3分钟定制" />
                    <TrustTag icon={<Sparkles className="w-3.5 h-3.5" />} text="AI智能推荐" />
                    <TrustTag icon={<Camera className="w-3.5 h-3.5" />} text="实物实拍返图" />
                    <TrustTag icon={<Truck className="w-3.5 h-3.5" />} text="4公里免费配送" />
                </div>

                {/* 底部 CTA 区域 */}
                {/* mt-auto 确保它始终在最底部 */}
                <footer className="relative mt-auto rounded-t-[40px] bg-white/80 p-8 text-center shadow-[0_-8px_30px_rgba(255,230,210,0.5)] backdrop-blur-md">
                    {/* 顶部装饰条 */}
                    <div className="absolute left-1/2 top-[-8px] h-1.5 w-12 -translate-x-1/2 transform rounded-full bg-[#EBD3C5]"></div>

                    <div className="flex items-center justify-center gap-6">
                        {/* 二维码容器 */}
                        <div className="h-24 w-24 rounded-2xl border border-[#EBD3C5] bg-[#FFF9F2] p-2 shadow-inner">
                            {/* 【重要】同样为二维码图片添加 crossOrigin */}
                            <img
                                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://shop.laohuoji.link/&color=A67B5B"
                                className="h-full w-full mix-blend-multiply"
                                alt="QR Code"
                                crossOrigin="anonymous"
                            />
                        </div>

                        {/* 右侧文字 */}
                        <div className="text-left">
                            <p className="font-[var(--font-noto-serif)] text-xl font-bold text-[#5E4B41]">
                                扫码开始订花
                            </p>
                            <p className="mt-2 text-sm text-[#A67B5B]">深圳同城 · 8:30-22:00</p>
                            <p className="mt-2 text-sm text-[#A67B5B]">微信 · 16603056010</p>

                        </div>
                    </div>
                </footer>
            </main>

            {/* 【重要】8. 添加下载按钮
                放在 main 标签外面，这样它自己不会被截图进去
            */}
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={`
          flex w-[375px] items-center justify-center gap-2 rounded-full
          bg-[#A67B5B] py-3.5 text-base font-bold text-white shadow-lg/40 shadow-[#A67B5B]
          transition-all hover:bg-[#8c664a] hover:shadow-xl/50 hover:-translate-y-0.5
          active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0
          font-[var(--font-noto-serif)] mb-8
        `}
            >
                {isDownloading ? (
                    // 加载状态
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>正在生成卡片...</span>
                    </>
                ) : (
                    // 正常状态
                    <>
                        <Download className="h-5 w-5" />
                        <span>保存卡片到相册</span>
                    </>
                )}
            </button>
        </div>
    );
}

// 信任标签组件
interface TrustTagProps {
    icon: React.ReactNode;
    text: string;
}

function TrustTag({ icon, text }: TrustTagProps) {
    return (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-xs text-[#A67B5B] shadow-sm border border-[#EBD3C5]">
            {icon}
            <span>{text}</span>
        </div>
    );
}