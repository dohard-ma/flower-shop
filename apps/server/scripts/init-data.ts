// 运行命令: npx ts-node scripts/init-data.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 [董事会] 开始执行数据初始化与迁移...');

  // ==========================================
  // 1. 初始化渠道 (Channels)
  // ==========================================
  const store = await prisma.store.findFirst();
  if (!store) {
    throw new Error('❌ 错误：数据库中没有店铺(Store)。请先创建一个店铺再运行此脚本。');
  }
  console.log(`🏠 目标店铺: ${store.name} (${store.id})`);

  // 定义你要的 4 个渠道
  const channelsData = [
    { code: 'wechat_mini', name: '微信小程序' },
    { code: 'meituan',     name: '美团点评' },
    { code: 'douyin',      name: '抖音团购' },
    { code: 'eleme',       name: '饿了么' },
  ];

  console.log('📦 正在检查/创建渠道...');
  
  // 使用 Map 暂存创建好的渠道 ID，后面迁移价格要用
  const channelMap = new Map<string, string>();

  for (const c of channelsData) {
    const channel = await prisma.channel.upsert({
      where: {
        storeId_code: {
          storeId: store.id,
          code: c.code,
        }
      },
      update: {}, // 如果存在就不动
      create: {
        storeId: store.id,
        code: c.code,
        name: c.name,
        config: {}, // 空配置
      },
    });
    channelMap.set(c.code, channel.id);
    console.log(`   ✅ 渠道就绪: ${c.name}`);
  }

  // ==========================================
  // 2. 迁移旧价格 (Migrate PriceRef)
  // ==========================================
  // 这里的逻辑是将 Product 表里的旧 priceRef 搬运到 "微信小程序" 渠道中
  // 前提：你的 schema.prisma 里暂时还保留着 priceRef 字段 (软迁移状态)
  
  console.log('💰 开始迁移旧价格数据...');

  // 这里的类型断言 (any) 是为了防止你的 Schema 已经删除了 priceRef 而导致 TS 报错
  // 如果数据库里字段已经删了，这一步会读取失败
  const products = await prisma.product.findMany({
    select: { id: true, name: true, priceRef: true } // 尝试读取旧字段
  } as any);

  let successCount = 0;
  let skipCount = 0;

  const wechatChannelId = channelMap.get('wechat_mini');
  if (!wechatChannelId) throw new Error('无法找到微信小程序渠道ID');

  for (const p of products) {
    const oldPrice = (p as any).priceRef;

    // 只有当旧价格存在，且大于 0 时才迁移
    if (oldPrice && Number(oldPrice) > 0) {
      await prisma.productChannel.upsert({
        where: {
          productId_channelId: {
            productId: p.id,
            channelId: wechatChannelId
          }
        },
        update: {
            // 如果想强制覆盖，可以在这里写 price: oldPrice
        }, 
        create: {
          productId: p.id,
          channelId: wechatChannelId,
          price: oldPrice,
          isListed: true, // 默认上架
        }
      });
      successCount++;
    } else {
      skipCount++;
    }
  }

  console.log(`
  📊 迁移报告:
  -----------------------------------
  ✅ 成功迁移价格: ${successCount} 个商品
  ⏭️ 跳过/无旧价格: ${skipCount} 个商品
  -----------------------------------
  `);

  console.log('✨ [董事会] 执行完毕。现在你可以安全地删除 Product 表中的 priceRef 字段了。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });