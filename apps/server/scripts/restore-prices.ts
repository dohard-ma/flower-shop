// 运行命令: npx ts-node scripts/restore-prices.ts

import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// 假设你的备份文件在项目根目录
const BACKUP_FILE_PATH = path.join(__dirname, './backup_products.json');

async function main() {
  console.log('🚑 [董事会] 启动灾难恢复程序...');

  // 1. 读取备份文件
  if (!fs.existsSync(BACKUP_FILE_PATH)) {
    throw new Error(`❌ 找不到备份文件: ${BACKUP_FILE_PATH}`);
  }
  const rawData = fs.readFileSync(BACKUP_FILE_PATH, 'utf-8');
  const products = JSON.parse(rawData);
  console.log(`📂 读取到 ${products.length} 条历史商品数据`);

  // 2. 获取必要的基础设施 ID
  const store = await prisma.store.findFirst();
  if (!store) throw new Error('❌ 数据库中没有店铺，无法恢复数据');
  
  // 我们默认恢复到 "微信小程序" 渠道
  let wechatChannel = await prisma.channel.findUnique({
    where: { storeId_code: { storeId: store.id, code: 'wechat_mini' } }
  });

  // 如果还没渠道，先创建一个保底
  if (!wechatChannel) {
    console.log('⚠️ 未找到微信渠道，正在自动创建...');
    wechatChannel = await prisma.channel.create({
      data: { storeId: store.id, code: 'wechat_mini', name: '微信小程序' }
    });
  }

  console.log(`🎯 目标店铺: ${store.name} | 目标渠道: ${wechatChannel.name}`);
  
  let successCount = 0;
  let errorCount = 0;

  // 3. 循环恢复数据
  for (const item of products) {
    try {
      // 准备价格 (处理字符串转 Decimal)
      const price = new Prisma.Decimal(item.priceRef || 0);

      // 核心逻辑：Upsert (有则更新，无则创建)
      // 这样既能修复现有的空壳商品，也能找回被误删的商品
      await prisma.product.upsert({
        where: { id: item.id }, // 使用备份文件里的 ID 作为锚点
        update: {
          // 如果商品还活着，我们主要补充 Variant 和 Channel
          // 下面的 create 会自动处理关联
        },
        create: {
          id: item.id, // 保持 ID 不变，防止前端缓存失效
          storeId: store.id,
          name: item.name,
          displayId: `REC-${Date.now()}-${Math.floor(Math.random()*100)}`, // 临时生成一个
          images: item.images || [], // 假设备份里没图，给个空数组
          description: item.description,
          mainFlower: item.materials?.[0] || '混搭', // 尝试提取主花材
          materials: item.materials || [],
          colorSeries: item.colorSeries,
          // ... 其他字段
        }
      });

      // --- A. 恢复/创建 SKU (Variant) ---
      // 因为旧数据没有规格概念，我们统一创建一个 "标准款"
      await prisma.productVariant.upsert({
        where: {
          productId_name: {
            productId: item.id,
            name: '标准款' // 默认规格名
          }
        },
        update: {
          price: price, // 恢复价格
          isActive: true
        },
        create: {
          productId: item.id,
          name: '标准款',
          price: price,
          stock: 999, // ⚠️ 默认库存，因为旧数据里没有
          isActive: true
        }
      });

      // --- B. 恢复/创建 渠道价格 (Channel) ---
      await prisma.productChannel.upsert({
        where: {
          productId_channelId: {
            productId: item.id,
            channelId: wechatChannel.id
          }
        },
        update: {
          price: price, // 恢复展示价
          isListed: true
        },
        create: {
          productId: item.id,
          channelId: wechatChannel.id,
          price: price,
          isListed: true
        }
      });

      process.stdout.write('.'); // 进度条效果
      successCount++;

    } catch (e) {
      console.error(`\n❌ 恢复失败 [${item.name}]:`, e);
      errorCount++;
    }
  }

  console.log(`
  ✅ 恢复完成报告:
  -----------------------------------
  成功处理: ${successCount} 条
  失败跳过: ${errorCount} 条
  -----------------------------------
  现在你的数据库里应该有数据了，且符合新架构（含"标准款"SKU）。
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });