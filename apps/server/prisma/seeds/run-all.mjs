/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seeds = [
  'admin-user.seed.mjs',
  'user.seed.mjs',
  'solar-term.seed.mjs',
  'product.seed.mjs',
  'subscription-product.seed.mjs',
  'order.seed.mjs'
];

async function runAllSeeds() {
  console.log('🌱 开始运行所有 Seeds 脚本...\n');

  for (const seed of seeds) {
    const seedPath = join(__dirname, seed);

    try {
      console.log(`📦 运行 ${seed}...`);
      execSync(`node "${seedPath}"`, { stdio: 'inherit' });
      console.log(`✅ ${seed} 完成\n`);
    } catch (error) {
      console.error(`❌ ${seed} 失败:`, error.message);
      process.exit(1);
    }
  }

  console.log('🎉 所有 Seeds 脚本运行完成！');
}

runAllSeeds().catch((error) => {
  console.error('运行 Seeds 失败:', error);
  process.exit(1);
});
