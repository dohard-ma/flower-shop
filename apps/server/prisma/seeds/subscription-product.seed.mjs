/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck

// const { PrismaClient } = require('@prisma/client');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const subscriptionProducts = [
  {
    stock: 100,
    coverImage: 'https://example.com/images/tea-set-1.jpg',
    detail:
      '精选茶具套装，包含茶壶、茶杯、茶盘等完整组件。采用上等紫砂制作，既实用又具有收藏价值。',
    images: JSON.stringify([
      'https://example.com/images/tea-set-1-detail-1.jpg',
      'https://example.com/images/tea-set-1-detail-2.jpg',
      'https://example.com/images/tea-set-1-detail-3.jpg'
    ]),
    isActive: true
  },
  {
    stock: 50,
    coverImage: 'https://example.com/images/incense-set-1.jpg',
    detail:
      '高级香道套装，含沉香、檀香等多种名贵香料，配备专业香具，让您在家也能体验传统香道文化。',
    images: JSON.stringify([
      'https://example.com/images/incense-set-1-detail-1.jpg',
      'https://example.com/images/incense-set-1-detail-2.jpg'
    ]),
    isActive: true
  },
  {
    stock: 80,
    coverImage: 'https://example.com/images/calligraphy-set-1.jpg',
    detail:
      '书法文房四宝套装，精选上等毛笔、宣纸、墨锭和砚台。适合书法爱好者日常练习使用。',
    images: JSON.stringify([
      'https://example.com/images/calligraphy-set-1-detail-1.jpg',
      'https://example.com/images/calligraphy-set-1-detail-2.jpg',
      'https://example.com/images/calligraphy-set-1-detail-3.jpg',
      'https://example.com/images/calligraphy-set-1-detail-4.jpg'
    ]),
    isActive: true
  },
  {
    stock: 30,
    coverImage: 'https://example.com/images/seasonal-gift-1.jpg',
    detail:
      '四季养生礼盒，根据节气特点精心搭配各类养生茶、干果、点心等，让您享受应季的滋养。',
    images: JSON.stringify([
      'https://example.com/images/seasonal-gift-1-detail-1.jpg',
      'https://example.com/images/seasonal-gift-1-detail-2.jpg'
    ]),
    isActive: false
  }
];

async function seedProduct() {
  console.log('开始生成订阅商品测试数据...');

  try {
    // 清空现有数据
    await prisma.subscriptionProduct.deleteMany();
    console.log('已清空现有订阅商品数据');

    // 批量创建新数据
    const createdProducts = await prisma.subscriptionProduct.createMany({
      data: subscriptionProducts
    });

    console.log(`成功创建 ${createdProducts.count} 个订阅商品`);
  } catch (error) {
    console.error('生成订阅商品测试数据失败:', error);
    throw error;
  }
}

seedProduct()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
