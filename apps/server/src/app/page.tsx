// 'use client';

// import { useState, useEffect, Suspense } from 'react';
// import { useSearchParams } from 'next/navigation';
// import {
//   Sparkles, Zap, Camera, Truck, CheckCircle, Clock, Gift, ArrowDown,
//   FileText, CreditCard, Leaf, Instagram, Music
// } from 'lucide-react';
// import Image from 'next/image';

// // 主题配置接口
// interface ThemeConfig {
//   name: string;
//   logo: string;
//   slogan: string;
//   socialMedia?: { url: string; name: string; channel: string }[];
//   customerService: string;
// }

// // 主题配置映射表
// const THEME_CONFIGS: Record<string, ThemeConfig> = {
//   default: {
//     name: '',
//     logo: '/logo.png',
//     slogan: '用花，陪伴您的每个重要时刻',
//     socialMedia: [
//       {
//         url: 'https://www.xiaohongshu.com/user/profile/6524138f000000002b003377',
//         name: '@花涧里',
//         channel: 'xiaohongshu'
//       },
//       {
//         url: 'https://www.xiaohongshu.com/user/profile/6721aceb000000001d02e7b7',
//         name: '@花时予',
//         channel: 'xiaohongshu'
//       },
//       {
//         url: 'https://v.douyin.com/F80nvksPK9c/',
//         name: '@花涧里',
//         channel: 'douyin'
//       }
//     ],
//     customerService: 'huayu_ai'
//   },
//   // 示例：可以添加更多租户配置
//   tenant1: {
//     name: '花语定制',
//     logo: '/logo.png',
//     slogan: '专属花束，定制你的美好时光',
//     customerService: 'huayu_custom'
//   },
//   tenant2: {
//     name: '花艺生活',
//     logo: '/logo.png',
//     slogan: '让每一束花都充满温度',
//     customerService: 'huayi_life'
//   }
// };

// // Hero区域组件
// interface HeroSectionProps {
//   theme: ThemeConfig;
// }

// function HeroSection({ theme }: HeroSectionProps) {
//   const [userCount, setUserCount] = useState(286);

//   useEffect(() => {
//     setUserCount(286 + Math.floor(Math.random() * 10));
//   }, []);

//   const scrollToProcess = () => {
//     document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' });
//   };

//   return (
//     <section className="relative min-h-screen flex flex-col justify-center items-center px-5 bg-gradient-to-b from-pink-20 via-white to-pink-50 overflow-hidden">
//       {/* 背景装饰 */}
//       <div className="absolute inset-0 opacity-50">
//         <div className="absolute top-10 left-10 w-32 h-32 bg-pink-200 rounded-full blur-3xl animate-pulse"></div>
//         <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-200 rounded-full blur-3xl animate-pulse delay-1000"></div>
//       </div>

//       {/* Logo区域 */}
//       <div className="relative text-center mb-10 animate-fade-in-down">
//         <div className="w-40 h-20 mx-auto mb-4 flex items-center justify-center">
//           <Image src={theme.logo} alt={theme.name} width={160} height={160} className="rounded-lg" />
//         </div>
//         <h1 className="text-3xl font-bold text-rose-500 mb-2">{theme.name}</h1>
//         <p className="text-base text-gray-600">{theme.slogan}</p>
//       </div>

//       {/* 信任标签 */}
//       <div className="relative flex flex-wrap gap-3 mb-12 justify-center animate-fade-in-up">
//         <TrustTag icon={<Zap className="w-3.5 h-3.5" />} text="3分钟定制" />
//         <TrustTag icon={<Sparkles className="w-3.5 h-3.5" />} text="AI智能推荐" />
//         <TrustTag icon={<Camera className="w-3.5 h-3.5" />} text="实物实拍返图" />
//         <TrustTag icon={<Truck className="w-3.5 h-3.5" />} text="4公里免费配送" />
//       </div>

//       {/* CTA按钮 */}
//       <button
//         onClick={() => window.location.href = '/list'}
//         className="relative w-[280px] h-14 bg-gradient-to-r from-rose-500 to-orange-400 rounded-full text-white text-lg font-semibold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:-translate-y-0.5 transition-all duration-300 animate-pulse-shadow"
//       >
//         进入选花
//       </button>

//       <p className="relative mt-4 text-xs text-gray-400">
//         本周已有 {userCount} 位用户定制专属花束
//       </p>

//       {/* 滚动提示 */}
//       <button
//         onClick={scrollToProcess}
//         className="absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
//         aria-label="向下滚动"
//       >
//         <ArrowDown className="w-6 h-6" />
//       </button>
//     </section>
//   );
// }

// // 信任标签组件
// interface TrustTagProps {
//   icon: React.ReactNode;
//   text: string;
// }

// function TrustTag({ icon, text }: TrustTagProps) {
//   return (
//     <div className="flex items-center gap-1 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-xs text-rose-500 border border-rose-500/20">
//       {icon}
//       <span>{text}</span>
//     </div>
//   );
// }

// // 流程区域组件
// function ProcessSection() {
//   const steps = [
//     {
//       icon: <Sparkles className="w-6 h-6 text-rose-500" />,
//       title: 'AI推荐/上传图片',
//       desc: '告诉AI你的需求，或上传参考图，秒级生成方案'
//     },
//     {
//       icon: <CheckCircle className="w-6 h-6 text-rose-500" />,
//       title: '确认款式规格',
//       desc: '选择花束大小，查看实物参照图，确定最终效果'
//     },
//     {
//       icon: <FileText className="w-6 h-6 text-rose-500" />,
//       title: '填写配送信息',
//       desc: '收花人信息、配送时间，AI帮你计算配送费'
//     },
//     {
//       icon: <CreditCard className="w-6 h-6 text-rose-500" />,
//       title: '微信支付下单',
//       desc: '扫码付款，24小时内安排制作配送，全程可追踪'
//     }
//   ];

//   return (
//     <section id="process" className="py-16 px-5 bg-white">
//       <h2 className="text-center text-2xl font-semibold mb-10">四步订到心仪花束</h2>
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
//         {steps.map((step, index) => (
//           <div
//             key={index}
//             className="text-center p-6 bg-pink-50 rounded-2xl hover:-translate-y-1 transition-transform duration-300"
//           >
//             <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center">
//               {step.icon}
//             </div>
//             <h3 className="text-base font-semibold mb-2">{step.title}</h3>
//             <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
//           </div>
//         ))}
//       </div>
//       <div className="flex justify-center gap-5 mt-8 flex-wrap">
//         <div className="flex items-center gap-1.5 text-sm text-rose-500 font-medium">
//           <CheckCircle className="w-4 h-4" />
//           <span>新鲜花材，不新鲜包退</span>
//         </div>
//         <div className="flex items-center gap-1.5 text-sm text-rose-500 font-medium">
//           <CheckCircle className="w-4 h-4" />
//           <span>准时送达，超时免单</span>
//         </div>
//       </div>
//     </section>
//   );
// }

// // 用户评价组件
// interface Review {
//   name: string;
//   meta: string;
//   content: string;
//   avatar: string;
// }

// function TestimonialsSection() {
//   const reviews: Review[] = [
//     {
//       name: '张先生',
//       meta: '第3次下单 · 女朋友生日花束',
//       content: '"女朋友超喜欢！实物比图片还美，特别贴心。"',
//       avatar: 'https://static.laohuoji.link/huajianli/avatar/qesfsfafdadf.jpg'
//     },
//     {
//       name: '李女士',
//       meta: '企业客户 · 商务花礼',
//       content: '"在这里订了高性价比花束，省下不少时间。"',
//       avatar: 'https://static.laohuoji.link/huajianli/avatar/sjkfdysdhkhaf.jpg'
//     }
//   ];

//   const galleryImages = [
//     { src: 'https://static.laohuoji.link/huajianli/gallery/2025-11-24_153210_602.jpg?imageMogr2/thumbnail/500x500/quality/85', alt: '用户实拍花束1' },
//     { src: 'https://static.laohuoji.link/huajianli/gallery/20251113222619_82_93.jpg?imageMogr2/quality/20', alt: '用户实拍花束2' },
//     { src: 'https://static.laohuoji.link/huajianli/gallery/20251122184926_195_221.jpg?imageMogr2/thumbnail/500x500/quality/85', alt: '用户实拍花束3' },
//   ];

//   return (
//     <section className="py-16 px-5 bg-pink-50">
//       <h2 className="text-center text-2xl font-semibold mb-10">他们说</h2>
//       <div className="max-w-3xl mx-auto">
//         {reviews.map((review, index) => (
//           <div key={index} className="bg-white p-6 rounded-2xl mb-5 shadow-sm">
//             <div className="flex items-center gap-3 mb-3">
//               <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center overflow-hidden">
//                 <Image
//                   src={review.avatar}
//                   alt={review.name}
//                   width={40}
//                   height={40}
//                   className="object-cover"
//                 />
//               </div>
//               <div className="flex-1">
//                 <div className="text-sm font-semibold">{review.name}</div>
//                 <div className="text-xs text-gray-400">{review.meta}</div>
//               </div>
//             </div>
//             <p className="text-sm leading-relaxed text-gray-700">{review.content}</p>
//           </div>
//         ))}
//         <h2 className="text-center text-2xl font-semibold mb-10">客户实拍</h2>

//         <div className="grid grid-cols-3 gap-2 mt-5">
//           {galleryImages.map((img, index) => (
//             <div key={index} className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
//               <Image
//                 src={img.src}
//                 alt={img.alt}
//                 fill
//                 className="object-cover"
//                 sizes="(max-width: 768px) 33vw, 200px"
//               />
//             </div>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }

// // 服务承诺组件
// function GuaranteeSection() {
//   const guarantees = [
//     {
//       icon: <Leaf className="w-5 h-5 text-green-600" />,
//       title: '新鲜花材',
//       desc: '不新鲜包退'
//     },
//     {
//       icon: <Clock className="w-5 h-5 text-green-600" />,
//       title: '准时送达',
//       desc: '超时免单'
//     },
//     {
//       icon: <Gift className="w-5 h-5 text-green-600" />,
//       title: '隐私配送',
//       desc: '保护惊喜'
//     }
//   ];

//   return (
//     <section className="py-10 px-5 bg-white">
//       <h2 className="text-center text-2xl font-semibold mb-10">服务承诺</h2>
//       <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
//         {guarantees.map((item, index) => (
//           <div key={index} className="text-center">
//             <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-full flex items-center justify-center">
//               {item.icon}
//             </div>
//             <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
//             <p className="text-xs text-gray-600">{item.desc}</p>
//           </div>
//         ))}
//       </div>
//     </section>
//   );
// }

// const DouyinIcon = () => {
//   return (
//     <Image src="/douyin.svg" alt="Douyin" width={20} height={20} />
//   );
// };

// const XiaoHongShuIcon = () => {
//   return (
//     <Image src="/xiaohongshu.svg" alt="XiaoHongShu" width={20} height={20} />
//   );
// };

// // 底部组件
// interface FooterSectionProps {
//   theme: ThemeConfig;
// }

// function FooterSection({ theme }: FooterSectionProps) {
//   return (
//     <footer className="py-10 px-5 bg-gray-900 text-white text-center">
//       <div className="flex justify-center gap-5 mb-5 flex-wrap">
//         {theme.socialMedia?.map((item) => (
//           <a
//             href={item.url}
//             className="flex items-center gap-1.5 text-sm px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
//           >
//             {item.channel === 'xiaohongshu' ? <XiaoHongShuIcon /> : <DouyinIcon />}
//             <span>{item.name}</span>
//           </a>
//         ))}
//       </div>
//       <div className="text-xs text-gray-400 leading-relaxed">
//         客服微信：{theme.customerService}<br />
//         工作时间：8:00-22:00 · 深圳同城配送
//       </div>
//     </footer>
//   );
// }

// // 主题选择组件（需要 useSearchParams）
// function ThemeSelector() {
//   const searchParams = useSearchParams();
//   const tenant = searchParams.get('tenant') || 'default';

//   // 根据 URL 参数获取主题配置，如果不存在则使用默认配置
//   const theme: ThemeConfig = THEME_CONFIGS[tenant] || THEME_CONFIGS.default;

//   return (
//     <div className="min-h-screen">
//       <HeroSection theme={theme} />
//       <ProcessSection />
//       <TestimonialsSection />
//       <GuaranteeSection />
//       <FooterSection theme={theme} />
//     </div>
//   );
// }

// // 主页面组件
// export default function WelcomePage() {
//   return (
//     <Suspense fallback={
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
//           <p className="text-gray-600">加载中...</p>
//         </div>
//       </div>
//     }>
//       <ThemeSelector />
//     </Suspense>
//   );
// }

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';


export default async function Page() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) {
    // 如果没有 session token，重定向到我们的新登录页
    return redirect('/auth/login');
  } else {
    // 如果有 session token，用户已登录，重定向到 dashboard
    // 根据项目实际的主要仪表盘路径调整，可能是 /dashboard/overview 或 /dashboard
    redirect('/dashboard');
  }
  // 通常在 redirect 后不需要返回其他内容，但 Next.js 可能需要一个 return
  // return null; // 或者不返回，redirect 会抛出错误中断执行
}
