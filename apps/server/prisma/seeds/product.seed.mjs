/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck

// const { PrismaClient } = require('@prisma/client');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProduct() {
  // 清空已有数据（如需要）
  await prisma.product.deleteMany({});
  await prisma.subscriptionProduct.deleteMany({});

  // 创建普通商品
  const normalProducts = [
    {
      productName: "浪漫樱花礼盒",
      productType: 2, // 礼盒
      price: 520.00,
      stock: 100,
      coverImage: "https://cdn.pixabay.com/photo/2025/03/29/11/20/bee-9500879_1280.jpg",
      detail: "精选樱花主题礼品，包含香氛蜡烛、干花、手工巧克力等。",
      images: [
        "https://cdn.pixabay.com/photo/2025/05/04/17/47/dog-9578735_1280.jpg",
        "https://cdn.pixabay.com/photo/2024/05/23/07/17/woman-8782450_1280.jpg",
        "https://cdn.pixabay.com/photo/2025/04/29/13/22/cityscape-9567180_1280.jpg"
      ],
      isSubscription: false,
      isActive: true
    },
    {
      productName: "心形巧克力礼盒",
      productType: 2, // 礼盒
      price: 199.00,
      stock: 200,
      coverImage: "https://cdn.pixabay.com/photo/2024/03/03/21/11/peach-blossoms-8611337_1280.jpg",
      detail: "精选比利时进口巧克力，20枚装心形礼盒。",
      images: [
        "https://pixabay.com/photos/italy-rome-colosseum-sunset-9505446/",
      ],
      isSubscription: false,
      isActive: true
    },
    {
      productName: "情侣手环对戒",
      productType: 3, // 周边
      price: 299.00,
      stock: 50,
      coverImage: "https://cdn.pixabay.com/photo/2022/11/05/19/56/bachalpsee-7572681_1280.jpg",
      detail: "纯银材质情侣对戒，可刻字定制。",
      images: [
        "https://cdn.pixabay.com/photo/2023/09/04/23/58/woman-8233937_1280.jpg"
      ],
      isSubscription: false,
      isActive: true
    }
  ];

  // 创建订阅商品
  const subscriptionProducts = [
    {
      productName: "怦然心动年卡",
      productType: 1, // 年卡
      price: 2999.00,
      stock: 100,
      coverImage: "https://cdn.pixabay.com/photo/2025/04/27/07/01/industry-9562428_1280.jpg",
      detail: "全年12次精选礼品配送，让爱情保持新鲜感。",
      images: [
        "https://cdn.pixabay.com/photo/2025/01/17/01/56/horse-9338907_1280.jpg"
      ],
      isSubscription: true,
      maxDeliveries: 12,
      deliveryType: "interval",
      deliveryInterval: 30,
      isActive: true
    },
    {
      productName: "节气礼盒年卡",
      productType: 1, // 年卡
      price: 4999.00,
      stock: 80,
      coverImage: "https://cdn.pixabay.com/photo/2025/03/19/07/25/sparrow-9480012_1280.jpg",
      detail: "根据中国传统24节气，每个节气赠送应景礼物。",
      images: [
        "https://cdn.pixabay.com/photo/2025/03/31/08/17/penguin-9504250_1280.jpg"
      ],
      isSubscription: true,
      maxDeliveries: 24,
      deliveryType: "solar_term",
      isActive: true
    },
    {
      productName: "双周卡",
      productType: 1,
      price: 1580.00,
      stock: 150,
      coverImage: "https://cdn.pixabay.com/photo/2025/04/09/17/20/flowers-9524674_1280.jpg",
      detail: "为期3个月的惊喜礼物订阅，每月一次。",
      images: [
        "https://cdn.pixabay.com/photo/2025/02/25/16/36/bird-9431014_1280.jpg"
      ],
      isSubscription: true,
      maxDeliveries: 6,
      deliveryType: "interval",
      deliveryInterval: 14,
      isActive: true
    },
    // 周卡
    {
      productName: "甜蜜季卡",
      productType: 1,
      price: 800.00,
      stock: 100,
      coverImage: "https://example.com/images/season-card.jpg",
      detail: "为期3个月的惊喜礼物订阅，每月一次。",
      images: [
        "https://cdn.pixabay.com/photo/2025/03/29/10/59/ryoan-ji-9500830_1280.jpg"
      ],
      isSubscription: true,
      maxDeliveries: 48,
      deliveryType: "interval",
      deliveryInterval: 7,
      isActive: true
    }
  ];

  // 创建订阅商品配送内容
  const subProducts = [
    {
      stock: 200,
      coverImage: "https://cdn.pixabay.com/photo/2021/09/16/22/12/coffee-6631154_1280.jpg",
      detail: "精选鲜花礼盒，每月主题不同。",
      images: [
        "https://example.com/images/flower-1.jpg",
        "https://example.com/images/flower-2.jpg"
      ],
      isActive: true
    },
    {
      stock: 200,
      coverImage: "https://cdn.pixabay.com/photo/2025/04/16/06/25/penguin-9536897_1280.jpg",
      detail: "精选甜点礼盒，每月风味不同。",
      images: [
        "https://example.com/images/dessert-1.jpg",
        "https://example.com/images/dessert-2.jpg"
      ],
      isActive: true
    },
    {
      stock: 200,
      coverImage: "https://cdn.pixabay.com/photo/2025/01/29/06/44/elephants-9367271_1280.jpg",
      detail: "精选茶礼盒，搭配精美茶具。",
      images: [
        "https://example.com/images/tea-1.jpg",
        "https://example.com/images/tea-2.jpg"
      ],
      isActive: true
    }
  ];

  // 批量创建普通商品
  for (const product of normalProducts) {
    await prisma.product.create({
      data: product
    });
  }

  // 批量创建订阅商品
  for (const product of subscriptionProducts) {
    await prisma.product.create({
      data: product
    });
  }

  // 批量创建订阅商品配送内容
  for (const product of subProducts) {
    await prisma.subscriptionProduct.create({
      data: product
    });
  }
}

seedProduct()
  .catch((e) => {
    console.error(e);
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect();
  });