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

async function seedDiyCovers() {
    console.log('开始生成电子封面测试数据...');

    try {
        // 清空现有数据
        await prisma.diyCover.deleteMany();
        console.log('已清空现有电子封面数据');

        // 获取用户数据
        const users = await prisma.user.findMany();
        if (users.length === 0) {
            console.warn('警告：未找到用户数据，将只创建系统内置封面');
        }

        // 系统内置封面数据
        const systemCovers = [
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2025/03/29/11/20/bee-9500879_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2024/03/03/21/11/peach-blossoms-8611337_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2022/11/05/19/56/bachalpsee-7572681_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2025/04/27/07/01/industry-9562428_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2025/03/19/07/25/sparrow-9480012_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2025/04/09/17/20/flowers-9524674_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2023/09/04/23/58/woman-8233937_1280.jpg'
            },
            {
                userId: null,
                backgroundImage: 'https://cdn.pixabay.com/photo/2025/02/25/16/36/bird-9431014_1280.jpg'
            }
        ];

        // 用户自定义封面数据（如果有用户）
        const userCovers = [];
        if (users.length > 0) {
            const coverImages = [
                'https://cdn.pixabay.com/photo/2025/03/29/10/59/ryoan-ji-9500830_1280.jpg',
                'https://cdn.pixabay.com/photo/2021/09/16/22/12/coffee-6631154_1280.jpg',
                'https://cdn.pixabay.com/photo/2025/04/16/06/25/penguin-9536897_1280.jpg',
                'https://cdn.pixabay.com/photo/2025/01/29/06/44/elephants-9367271_1280.jpg',
                'https://cdn.pixabay.com/photo/2025/01/17/01/56/horse-9338907_1280.jpg'
            ];

            for (let i = 0; i < Math.min(users.length, coverImages.length); i++) {
                userCovers.push({
                    userId: users[i].id,
                    backgroundImage: coverImages[i]
                });
            }
        }

        // 批量创建系统内置封面
        console.log('创建系统内置封面...');
        for (const cover of systemCovers) {
            await prisma.diyCover.create({
                data: cover
            });
        }

        // 批量创建用户自定义封面
        if (userCovers.length > 0) {
            console.log('创建用户自定义封面...');
            for (const cover of userCovers) {
                await prisma.diyCover.create({
                    data: cover
                });
            }
        }

        const totalSystemCovers = await prisma.diyCover.count({
            where: { userId: null }
        });

        const totalUserCovers = await prisma.diyCover.count({
            where: { userId: { not: null } }
        });

        console.log(`成功创建 ${totalSystemCovers} 个系统内置封面`);
        console.log(`成功创建 ${totalUserCovers} 个用户自定义封面`);
        console.log('电子封面测试数据生成完成！');

    } catch (error) {
        console.error('生成电子封面测试数据失败:', error);
        throw error;
    }
}

seedDiyCovers()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });