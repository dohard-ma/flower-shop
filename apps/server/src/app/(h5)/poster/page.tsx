'use client';

import { Sparkles, Zap, Camera, Truck, Clock, MapPin, Star } from 'lucide-react';
import Image from 'next/image';

// 复用你原本的数据源，确保信息同步
const THEME_CONFIG = {
    logo: '/logo.png', // 确保你的public目录下有这个
    slogan: '用花，陪伴您的每个重要时刻',
    siteUrl: 'https://shop.laohuoji.link/',
    // 提取你代码中的实拍图，这在海报上非常有说服力
    galleryImages: [
        'https://static.laohuoji.link/huajianli/gallery/2025-11-24_153210_602.jpg?imageMogr2/thumbnail/500x500/quality/85',
        'https://static.laohuoji.link/huajianli/gallery/20251122184926_195_221.jpg?imageMogr2/thumbnail/500x500/quality/85',
        'https://static.laohuoji.link/huajianli/gallery/20251113222619_82_93.jpg?imageMogr2/quality/20',
    ]
};

export default function PosterPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            {/* 海报容器
        设置了固定宽高比，模拟一张竖版海报
        shadow-2xl 让它在页面上看起来像张纸
      */}
            <div
                id="poster-node"
                className="relative w-[375px] h-[667px] bg-gradient-to-b from-pink-50 via-white to-pink-50 overflow-hidden shadow-2xl flex flex-col"
            >

                {/* 1. 顶部品牌区 (Header) */}
                <div className="pt-8 pb-4 text-center px-6">
                    {/* 这里用文字模拟Logo，实际请替换为 <Image src={THEME_CONFIG.logo} ... /> */}
                    <div className="w-24 h-12 mx-auto mb-2 relative">
                        {/* 假设 logo 图片比例合适，用 object-contain */}
                        <Image
                            src={THEME_CONFIG.logo}
                            alt="花涧里"
                            fill
                            className="object-contain"
                        />
                    </div>

                    <h1 className="text-xl font-bold text-gray-800 tracking-wider font-serif mt-2">花涧里</h1>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="h-[1px] w-4 bg-rose-300"></span>
                        <p className="text-xs text-rose-500 font-medium tracking-widest">{THEME_CONFIG.slogan}</p>
                        <span className="h-[1px] w-4 bg-rose-300"></span>
                    </div>
                </div>

                {/* 2. 核心视觉区 (Visual Hook) - 复用你的实拍图 */}
                <div className="px-5 mb-4 relative z-10">
                    <div className="grid grid-cols-3 gap-2 h-40">
                        {/* 主图 (左侧大图) */}
                        <div className="col-span-2 row-span-2 relative rounded-xl overflow-hidden shadow-md border-2 border-white">
                            <Image
                                src={THEME_CONFIG.galleryImages[0]}
                                alt="主推款式"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-rose-500/90 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                                <Star className="w-3 h-3 fill-white" />
                                店长推荐
                            </div>
                        </div>
                        {/* 副图 (右侧两张) */}
                        <div className="relative rounded-lg overflow-hidden shadow-sm border border-white">
                            <Image src={THEME_CONFIG.galleryImages[1]} alt="细节" fill className="object-cover" />
                        </div>
                        <div className="relative rounded-lg overflow-hidden shadow-sm border border-white">
                            <Image src={THEME_CONFIG.galleryImages[2]} alt="实拍" fill className="object-cover" />
                        </div>
                    </div>
                </div>

                {/* 3. 卖点矩阵 (Feature Grid) - 改造自你的 TrustTag */}
                <div className="px-5 mb-4">
                    <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-pink-100 shadow-sm">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                            <FeatureItem icon={<Zap className="w-4 h-4" />} title="3分钟定制" desc="AI智能生成方案" />
                            <FeatureItem icon={<Camera className="w-4 h-4" />} title="实物实拍" desc="所见即所得" />
                            <FeatureItem icon={<Truck className="w-4 h-4" />} title="4公里免运" desc="专人配送直达" />
                            <FeatureItem icon={<Sparkles className="w-4 h-4" />} title="AI推荐" desc="懂你的送花心意" />
                        </div>
                    </div>
                </div>

                {/* 4. 底部行动区 (CTA & QR) - 强引导 */}
                <div className="mt-auto relative">
                    {/* 装饰波浪 */}
                    <svg className="absolute bottom-0 w-full h-48 text-rose-500 opacity-5" viewBox="0 0 1440 320" preserveAspectRatio="none">
                        <path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,250.7C960,235,1056,181,1152,165.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>

                    <div className="bg-gradient-to-t from-white via-white/80 to-transparent pb-8 pt-4 px-6 text-center relative z-10">
                        <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-rose-50">

                            {/* 左侧文字引导 */}
                            <div className="text-left pl-2">
                                <p className="text-lg font-bold text-gray-800 mb-1">扫码开始定制</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                    <Clock className="w-3 h-3" />
                                    <span>9:00 - 21:00 接单</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-rose-500 bg-rose-50 px-2 py-1 rounded w-fit">
                                    <MapPin className="w-3 h-3" />
                                    <span>深圳同城配送</span>
                                </div>
                            </div>

                            {/* 右侧二维码 */}
                            <div className="w-24 h-24 bg-gray-900 rounded-lg p-1 shrink-0">
                                {/* 这里使用了qrserver API生成你的真实链接二维码
                  实际使用时可以替换为你自己的二维码图片
                */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(THEME_CONFIG.siteUrl)}`}
                                    alt="QR Code"
                                    className="w-full h-full rounded border-2 border-white"
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 mt-4 tracking-wider">
                            IN THE FLOWER · HUAJIANLI
                        </p>
                    </div>
                </div>

            </div>

            {/* 这是一个辅助按钮，实际导出时隐藏 */}
            <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded text-xs opacity-50">
                提示：使用截图工具或 html2canvas 保存为图片
            </div>
        </div>
    );
}

// 辅助小组件：特性项
function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-800 leading-tight">{title}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
            </div>
        </div>
    )
}