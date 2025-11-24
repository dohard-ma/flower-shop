/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck

// const { PrismaClient } = require('@prisma/client');
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

async function seedUsers() {
  // 清空已有数据
  await prisma.walletTransaction.deleteMany({});
  await prisma.userWallet.deleteMany({});
  await prisma.userMembership.deleteMany({});
  await prisma.user.deleteMany({});

  // 创建普通用户
  const normalUsers = [
    {
      nickname: '快乐小兔',
      name: '张小兔',
      phone: '13800138001',
      gender: 2,
      birthday: new Date('1995-01-15'),
      wallet: {
        create: {
          balance: 100.0
        }
      }
    },
    {
      nickname: '阳光男孩',
      name: '李阳光',
      phone: '13800138002',
      gender: 1,
      birthday: new Date('1990-03-20'),
      wallet: {
        create: {
          balance: 500.0
        }
      }
    },
    {
      nickname: '悠然自得',
      name: '王悠然',
      phone: '13800138003',
      gender: 2,
      birthday: new Date('1992-07-08'),
      wallet: {
        create: {
          balance: 300.0
        }
      }
    }
  ];

  // 创建会员用户
  const vipUsers = [
    {
      nickname: 'VIP达人',
      name: '刘达人',
      phone: '13900139001',
      gender: 1,
      birthday: new Date('1988-12-25'),
      wallet: {
        create: {
          balance: 2000.0
        }
      },
      membership: {
        create: {
          vipType: 'VIP',
          startTime: new Date(),
          endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 一年后
          status: 1 // 开通中
        }
      }
    },
    {
      nickname: '超级SVIP',
      name: '陈超群',
      phone: '13900139002',
      gender: 2,
      birthday: new Date('1991-06-15'),
      wallet: {
        create: {
          balance: 5000.0
        }
      },
      membership: {
        create: {
          vipType: 'SVIP',
          startTime: new Date(),
          endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 一年后
          status: 1 // 开通中
        }
      }
    },
    {
      nickname: '过期会员',
      name: '赵过期',
      phone: '13900139003',
      gender: 1,
      birthday: new Date('1993-09-01'),
      wallet: {
        create: {
          balance: 50.0
        }
      },
      membership: {
        create: {
          vipType: 'VIP',
          startTime: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 两年前
          endTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 一年前
          status: 2 // 已过期
        }
      }
    }
  ];

  // 批量创建用户
  for (const userData of [...normalUsers, ...vipUsers]) {
    const user = await prisma.user.create({
      data: userData,
      include: {
        wallet: true,
        membership: true
      }
    });

    // 为每个用户创建一些交易记录
    const transactions = [
      {
        userId: user.id,
        type: 1, // 充值
        amount: 1000.0,
        description: '首次充值',
        createdAt: new Date()
      },
      {
        userId: user.id,
        type: 2, // 消费
        amount: -500.0,
        description: '购买商品',
        createdAt: new Date()
      },
      {
        userId: user.id,
        type: 3, // 赠送
        amount: 100.0,
        description: '新用户奖励',
        createdAt: new Date()
      }
    ];

    // VIP用户额外的交易记录
    if (user.membership) {
      transactions.push({
        userId: user.id,
        type: 2,
        amount: -2999.0,
        description: '开通年费会员',
        createdAt: new Date()
      });
    }

    // 创建交易记录
    for (const transaction of transactions) {
      await prisma.walletTransaction.create({
        data: transaction
      });
    }
  }

  console.log('用户数据创建成功！');
}

seedUsers()
  .catch((e) => {
    console.error('用户数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
