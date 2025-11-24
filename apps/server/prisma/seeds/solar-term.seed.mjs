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

async function seedSolarTerm() {
  // 清空已有数据（如需要）
  await prisma.solarTerm.deleteMany({});

  // 2025年24节气数据
  const solarTerms2025 = [
    // 春季节气
    {
      name: '立春',
      startTime: new Date('2025-02-04'),
      endTime: new Date('2025-02-18'),
      year: 2025,
      isActive: true
    },
    {
      name: '雨水',
      startTime: new Date('2025-02-19'),
      endTime: new Date('2025-03-05'),
      year: 2025,
      isActive: true
    },
    {
      name: '惊蛰',
      startTime: new Date('2025-03-06'),
      endTime: new Date('2025-03-20'),
      year: 2025,
      isActive: true
    },
    {
      name: '春分',
      startTime: new Date('2025-03-21'),
      endTime: new Date('2025-04-04'),
      year: 2025,
      isActive: true
    },
    {
      name: '清明',
      startTime: new Date('2025-04-05'),
      endTime: new Date('2025-04-19'),
      year: 2025,
      isActive: true
    },
    {
      name: '谷雨',
      startTime: new Date('2025-04-20'),
      endTime: new Date('2025-05-05'),
      year: 2025,
      isActive: true
    },

    // 夏季节气
    {
      name: '立夏',
      startTime: new Date('2025-05-06'),
      endTime: new Date('2025-05-20'),
      year: 2025,
      isActive: true
    },
    {
      name: '小满',
      startTime: new Date('2025-05-21'),
      endTime: new Date('2025-06-05'),
      year: 2025,
      isActive: true
    },
    {
      name: '芒种',
      startTime: new Date('2025-06-06'),
      endTime: new Date('2025-06-21'),
      year: 2025,
      isActive: true
    },
    {
      name: '夏至',
      startTime: new Date('2025-06-22'),
      endTime: new Date('2025-07-06'),
      year: 2025,
      isActive: true
    },
    {
      name: '小暑',
      startTime: new Date('2025-07-07'),
      endTime: new Date('2025-07-22'),
      year: 2025,
      isActive: true
    },
    {
      name: '大暑',
      startTime: new Date('2025-07-23'),
      endTime: new Date('2025-08-07'),
      year: 2025,
      isActive: true
    },

    // 秋季节气
    {
      name: '立秋',
      startTime: new Date('2025-08-08'),
      endTime: new Date('2025-08-22'),
      year: 2025,
      isActive: true
    },
    {
      name: '处暑',
      startTime: new Date('2025-08-23'),
      endTime: new Date('2025-09-07'),
      year: 2025,
      isActive: true
    },
    {
      name: '白露',
      startTime: new Date('2025-09-08'),
      endTime: new Date('2025-09-22'),
      year: 2025,
      isActive: true
    },
    {
      name: '秋分',
      startTime: new Date('2025-09-23'),
      endTime: new Date('2025-10-07'),
      year: 2025,
      isActive: true
    },
    {
      name: '寒露',
      startTime: new Date('2025-10-08'),
      endTime: new Date('2025-10-23'),
      year: 2025,
      isActive: true
    },
    {
      name: '霜降',
      startTime: new Date('2025-10-24'),
      endTime: new Date('2025-11-06'),
      year: 2025,
      isActive: true
    },

    // 冬季节气
    {
      name: '立冬',
      startTime: new Date('2025-11-07'),
      endTime: new Date('2025-11-21'),
      year: 2025,
      isActive: true
    },
    {
      name: '小雪',
      startTime: new Date('2025-11-22'),
      endTime: new Date('2025-12-06'),
      year: 2025,
      isActive: true
    },
    {
      name: '大雪',
      startTime: new Date('2025-12-07'),
      endTime: new Date('2025-12-21'),
      year: 2025,
      isActive: true
    },
    {
      name: '冬至',
      startTime: new Date('2025-12-22'),
      endTime: new Date('2026-01-05'),
      year: 2025,
      isActive: true
    },
    {
      name: '小寒',
      startTime: new Date('2026-01-06'),
      endTime: new Date('2026-01-19'),
      year: 2025,
      isActive: true
    },
    {
      name: '大寒',
      startTime: new Date('2026-01-20'),
      endTime: new Date('2026-02-03'),
      year: 2025,
      isActive: true
    }
  ];

  // 2024年24节气数据（历史数据）
  const solarTerms2024 = [
    // 春季节气
    {
      name: '立春',
      startTime: new Date('2024-02-04'),
      endTime: new Date('2024-02-18'),
      year: 2024,
      isActive: true
    },
    {
      name: '雨水',
      startTime: new Date('2024-02-19'),
      endTime: new Date('2024-03-04'),
      year: 2024,
      isActive: true
    },
    {
      name: '惊蛰',
      startTime: new Date('2024-03-05'),
      endTime: new Date('2024-03-19'),
      year: 2024,
      isActive: true
    },
    {
      name: '春分',
      startTime: new Date('2024-03-20'),
      endTime: new Date('2024-04-03'),
      year: 2024,
      isActive: true
    },
    {
      name: '清明',
      startTime: new Date('2024-04-04'),
      endTime: new Date('2024-04-19'),
      year: 2024,
      isActive: true
    },
    {
      name: '谷雨',
      startTime: new Date('2024-04-20'),
      endTime: new Date('2024-05-04'),
      year: 2024,
      isActive: true
    },

    // 夏季节气
    {
      name: '立夏',
      startTime: new Date('2024-05-05'),
      endTime: new Date('2024-05-20'),
      year: 2024,
      isActive: true
    },
    {
      name: '小满',
      startTime: new Date('2024-05-21'),
      endTime: new Date('2024-06-04'),
      year: 2024,
      isActive: true
    },
    {
      name: '芒种',
      startTime: new Date('2024-06-05'),
      endTime: new Date('2024-06-20'),
      year: 2024,
      isActive: true
    },
    {
      name: '夏至',
      startTime: new Date('2024-06-21'),
      endTime: new Date('2024-07-05'),
      year: 2024,
      isActive: true
    },
    {
      name: '小暑',
      startTime: new Date('2024-07-06'),
      endTime: new Date('2024-07-21'),
      year: 2024,
      isActive: true
    },
    {
      name: '大暑',
      startTime: new Date('2024-07-22'),
      endTime: new Date('2024-08-06'),
      year: 2024,
      isActive: true
    },

    // 秋季节气
    {
      name: '立秋',
      startTime: new Date('2024-08-07'),
      endTime: new Date('2024-08-22'),
      year: 2024,
      isActive: true
    },
    {
      name: '处暑',
      startTime: new Date('2024-08-23'),
      endTime: new Date('2024-09-06'),
      year: 2024,
      isActive: true
    },
    {
      name: '白露',
      startTime: new Date('2024-09-07'),
      endTime: new Date('2024-09-22'),
      year: 2024,
      isActive: true
    },
    {
      name: '秋分',
      startTime: new Date('2024-09-23'),
      endTime: new Date('2024-10-07'),
      year: 2024,
      isActive: true
    },
    {
      name: '寒露',
      startTime: new Date('2024-10-08'),
      endTime: new Date('2024-10-22'),
      year: 2024,
      isActive: true
    },
    {
      name: '霜降',
      startTime: new Date('2024-10-23'),
      endTime: new Date('2024-11-06'),
      year: 2024,
      isActive: true
    },

    // 冬季节气
    {
      name: '立冬',
      startTime: new Date('2024-11-07'),
      endTime: new Date('2024-11-21'),
      year: 2024,
      isActive: true
    },
    {
      name: '小雪',
      startTime: new Date('2024-11-22'),
      endTime: new Date('2024-12-06'),
      year: 2024,
      isActive: true
    },
    {
      name: '大雪',
      startTime: new Date('2024-12-07'),
      endTime: new Date('2024-12-21'),
      year: 2024,
      isActive: true
    },
    {
      name: '冬至',
      startTime: new Date('2024-12-22'),
      endTime: new Date('2025-01-05'),
      year: 2024,
      isActive: true
    },
    {
      name: '小寒',
      startTime: new Date('2025-01-06'),
      endTime: new Date('2025-01-19'),
      year: 2024,
      isActive: true
    },
    {
      name: '大寒',
      startTime: new Date('2025-01-20'),
      endTime: new Date('2025-02-03'),
      year: 2024,
      isActive: true
    }
  ];

  // 合并所有年份的节气数据
  const allSolarTerms = [...solarTerms2024, ...solarTerms2025];

  // 批量创建节气数据
  for (const solarTerm of allSolarTerms) {
    await prisma.solarTerm.create({
      data: solarTerm
    });
  }

  console.log(`已成功创建 ${allSolarTerms.length} 条节气数据`);
}

seedSolarTerm()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
