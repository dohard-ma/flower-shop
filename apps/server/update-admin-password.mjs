import { PrismaClient } from '@prisma/client';
import CryptoJS from 'crypto-js';

const prisma = new PrismaClient();

async function updateAdminPassword() {
  console.log('🔑 开始更新管理员密码...');

  const newPassword = CryptoJS.MD5('iJwiTQjj9hPkVprW0VHr').toString();

  try {
    const result = await prisma.adminUser.update({
      where: { username: 'admin' },
      data: { password: newPassword }
    });

    console.log('✅ 管理员密码更新成功');
    console.log(`用户名: admin`);
    console.log(`新密码: iJwiTQjj9hPkVprW0VHr`);
  } catch (error) {
    console.error('❌ 更新密码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();
