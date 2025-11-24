import { PrismaClient } from '@prisma/client';
import CryptoJS from 'crypto-js';

const prisma = new PrismaClient();

console.log('11111111111')

async function seedAdminUsers() {
  console.log('🌱 开始添加管理员用户数据...');

  // 默认管理员用户
  const defaultAdmin = {
    username: 'admin',
    password: CryptoJS.MD5('iJwiTQjj9hPkVprW0VHr').toString() // 默认密码 123456
  };

  try {
    // 检查是否已存在
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { username: defaultAdmin.username }
    });

    if (!existingAdmin) {
      await prisma.adminUser.create({
        data: defaultAdmin
      });
      console.log(`✅ 创建默认管理员用户: ${defaultAdmin.username}`);
    } else {
      console.log(`⚠️  管理员用户已存在: ${defaultAdmin.username}`);
    }

    console.log('✅ 管理员用户数据添加完成');
  } catch (error) {
    console.error('❌ 添加管理员用户数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdminUsers().catch((error) => {
  console.error('运行管理员用户种子失败:', error);
  process.exit(1);
});

