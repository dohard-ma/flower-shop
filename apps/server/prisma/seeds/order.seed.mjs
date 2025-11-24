/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

async function seedOrders() {
    // 按正确的外键依赖顺序清空已有订单数据
    await prisma.deliveryPlan.deleteMany({});
    await prisma.subscriptionOrder.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.userCoupon.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.diyCover.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.subscriptionProduct.deleteMany({});
    await prisma.address.deleteMany({});
    // 不要清理用户数据，由专门的用户seeds管理

    // 获取用户数据
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        throw new Error('请先运行用户种子数据');
    }

    // 创建地址数据
    const addresses = [];
    for (let i = 0; i < users.length; i++) {
        const address = await prisma.address.create({
            data: {
                userId: users[i].id,
                name: users[i].name || `用户${i + 1}`,
                phone: users[i].phone || `1380013800${i + 1}`,
                address: `详细地址${i + 1}号`,
                province: '广东省',
                city: '深圳市',
                area: '南山区',
                latitude: 22.5431 + i * 0.001,
                longitude: 113.9344 + i * 0.001,
                isDefault: true
            }
        });
        addresses.push(address);
    }

    // 创建优惠券
    const coupons = await Promise.all([
        prisma.coupon.create({
            data: {
                name: '新用户专享券',
                discount: 50.0,
                minSpend: 200.0,
                startTime: new Date(),
                endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        }),
        prisma.coupon.create({
            data: {
                name: '满减优惠券',
                discount: 100.0,
                minSpend: 500.0,
                startTime: new Date(),
                endTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            }
        })
    ]);

    // 为用户分配优惠券
    const userCoupons = await Promise.all([
        prisma.userCoupon.create({
            data: {
                userId: users[0].id,
                couponId: coupons[0].id,
                status: 0,
                receivedAt: new Date()
            }
        }),
        prisma.userCoupon.create({
            data: {
                userId: users[1].id,
                couponId: coupons[1].id,
                status: 0,
                receivedAt: new Date()
            }
        })
    ]);

    // 创建电子封面
    const diyCovers = await Promise.all([
        prisma.diyCover.create({
            data: {
                userId: users[0].id,
                backgroundImage: 'https://example.com/cover1.jpg'
            }
        }),
        prisma.diyCover.create({
            data: {
                userId: users[1].id,
                backgroundImage: 'https://example.com/cover2.jpg'
            }
        })
    ]);

    // 创建商品
    const products = await Promise.all([
        // 普通商品
        prisma.product.create({
            data: {
                productName: '精美礼盒装',
                productType: 2, // 礼盒
                price: 299.0,
                stock: 100,
                coverImage: 'https://example.com/product1.jpg',
                detail: '精美包装的节日礼盒，包含多种精选商品',
                images: JSON.stringify(['image1.jpg', 'image2.jpg']),
                isSubscription: false,
                isActive: true
            }
        }),
        prisma.product.create({
            data: {
                productName: '限量周边商品',
                productType: 3, // 周边
                price: 99.0,
                stock: 50,
                coverImage: 'https://example.com/product2.jpg',
                detail: '限量版周边商品，收藏价值极高',
                images: JSON.stringify(['image3.jpg', 'image4.jpg']),
                isSubscription: false,
                isActive: true
            }
        }),
        // 订阅商品
        prisma.product.create({
            data: {
                productName: '节气茶叶年卡',
                productType: 1, // 年卡
                price: 1999.0,
                stock: 30,
                coverImage: 'https://example.com/product3.jpg',
                detail: '按照二十四节气定期配送的精选茶叶',
                images: JSON.stringify(['image5.jpg', 'image6.jpg']),
                isSubscription: true,
                maxDeliveries: 24,
                deliveryType: 'solar_term',
                isActive: true
            }
        }),
        prisma.product.create({
            data: {
                productName: '月度美食订阅',
                productType: 1, // 年卡
                price: 599.0,
                stock: 20,
                coverImage: 'https://example.com/product4.jpg',
                detail: '每月定期配送的特色美食',
                images: JSON.stringify(['image7.jpg', 'image8.jpg']),
                isSubscription: true,
                maxDeliveries: 12,
                deliveryType: 'interval',
                deliveryInterval: 30, // 30天间隔
                isActive: true
            }
        })
    ]);

    // 生成订单号的函数
    function generateOrderNo() {
        return `ORD${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }

    // 1. 一个订单一个普通商品
    const order1 = await prisma.order.create({
        data: {
            orderNo: generateOrderNo(),
            userId: users[0].id,
            coverId: diyCovers[0].id,
            amount: 249.0, // 使用优惠券后的价格
            userCouponId: userCoupons[0].id,
            payType: 1, // 微信支付
            status: 3, // 已完成
            isGift: false,
            paidAt: new Date()
        }
    });

    // 为订单1创建订单项
    const orderItem1 = await prisma.orderItem.create({
        data: {
            orderId: order1.id,
            productId: products[0].id, // 精美礼盒装
            quantity: 1,
            price: 299.0
        }
    });

    // 2. 一个订单一个订阅商品（赠送他人）
    const order2 = await prisma.order.create({
        data: {
            orderNo: generateOrderNo(),
            userId: users[1].id,
            receiverId: users[2].id, // 赠送给第三个用户
            coverId: diyCovers[1].id,
            amount: 1899.0, // 使用优惠券后的价格
            userCouponId: userCoupons[1].id,
            payType: 2, // 余额支付
            status: 2, // 已赠送
            isGift: true,
            paidAt: new Date()
        }
    });

    // 为订单2创建订单项
    const orderItem2 = await prisma.orderItem.create({
        data: {
            orderId: order2.id,
            productId: products[2].id, // 节气茶叶年卡
            quantity: 1,
            price: 1999.0
        }
    });

    // 为订阅商品创建订阅记录
    const subscriptionOrder1 = await prisma.subscriptionOrder.create({
        data: {
            orderId: order2.id,
            orderItemId: orderItem2.id,
            userId: users[2].id, // 接收者
            totalDeliveries: 24,
            deliveredCount: 2,
            deliveryType: 'solar_term',
            status: 1 // 已确认
        }
    });

    // 3. 一个订单多个普通商品
    const order3 = await prisma.order.create({
        data: {
            orderNo: generateOrderNo(),
            userId: users[2].id,
            amount: 895.0, // 礼盒装x2 + 周边x3 的价格
            payType: 1,
            status: 1, // 已支付
            isGift: false,
            paidAt: new Date()
        }
    });

    // 为订单3创建多个订单项
    const orderItem3_1 = await prisma.orderItem.create({
        data: {
            orderId: order3.id,
            productId: products[0].id, // 精美礼盒装
            quantity: 2,
            price: 299.0
        }
    });

    const orderItem3_2 = await prisma.orderItem.create({
        data: {
            orderId: order3.id,
            productId: products[1].id, // 限量周边商品
            quantity: 3,
            price: 99.0
        }
    });

    // 4. 一个订单多个订阅商品
    const order4 = await prisma.order.create({
        data: {
            orderNo: generateOrderNo(),
            userId: users[3].id,
            amount: 2598.0, // 两个订阅商品的价格
            payType: 1,
            status: 1, // 已支付
            isGift: false,
            paidAt: new Date()
        }
    });

    // 为订单4创建多个订阅商品的订单项
    const orderItem4_1 = await prisma.orderItem.create({
        data: {
            orderId: order4.id,
            productId: products[2].id, // 节气茶叶年卡
            quantity: 1,
            price: 1999.0
        }
    });

    const orderItem4_2 = await prisma.orderItem.create({
        data: {
            orderId: order4.id,
            productId: products[3].id, // 月度美食订阅
            quantity: 1,
            price: 599.0
        }
    });

    // 为订单4的订阅商品创建订阅记录
    const subscriptionOrder2 = await prisma.subscriptionOrder.create({
        data: {
            orderId: order4.id,
            orderItemId: orderItem4_1.id,
            userId: users[3].id,
            totalDeliveries: 24,
            deliveredCount: 0,
            deliveryType: 'solar_term',
            status: 0 // 待确认
        }
    });

    const subscriptionOrder3 = await prisma.subscriptionOrder.create({
        data: {
            orderId: order4.id,
            orderItemId: orderItem4_2.id,
            userId: users[3].id,
            totalDeliveries: 12,
            deliveredCount: 1,
            deliveryType: 'interval',
            deliveryInterval: 30,
            status: 1 // 已确认
        }
    });

    // 创建一些发货计划
    await prisma.deliveryPlan.create({
        data: {
            orderId: order2.id,
            orderItemId: orderItem2.id,
            subscriptionOrderId: subscriptionOrder1.id,
            productId: products[2].id,
            userId: users[2].id,
            addressId: addresses[2].id,
            deliveryStartDate: new Date(),
            deliveryEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deliveryDate: new Date(),
            expressCompany: '顺丰快递',
            expressNumber: 'SF1234567890',
            status: 3 // 已完成
        }
    });

    await prisma.deliveryPlan.create({
        data: {
            orderId: order4.id,
            orderItemId: orderItem4_2.id,
            subscriptionOrderId: subscriptionOrder3.id,
            productId: products[3].id,
            userId: users[3].id,
            addressId: addresses[3].id,
            deliveryStartDate: new Date(),
            deliveryEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: 1 // 已确认
        }
    });

    // 为普通商品创建发货计划
    await prisma.deliveryPlan.create({
        data: {
            orderId: order3.id,
            orderItemId: orderItem3_1.id,
            productId: products[0].id,
            userId: users[2].id,
            addressId: addresses[2].id,
            deliveryStartDate: new Date(),
            deliveryEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            expressCompany: '中通快递',
            expressNumber: 'ZTO9876543210',
            status: 2 // 已发货
        }
    });

    console.log('订单数据创建成功！');
    console.log(`创建了 ${await prisma.order.count()} 个订单`);
    console.log(`创建了 ${await prisma.orderItem.count()} 个订单项`);
    console.log(`创建了 ${await prisma.subscriptionOrder.count()} 个订阅订单`);
    console.log(`创建了 ${await prisma.deliveryPlan.count()} 个发货计划`);
}

seedOrders()
    .catch((e) => {
        console.error('订单数据创建失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
