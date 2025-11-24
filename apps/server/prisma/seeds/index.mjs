#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seedFiles = [
    'user.seed.mjs',
    'order.seed.mjs',
    'notification.seed.mjs'
];

async function runSeeds() {
    console.log('🌱 开始运行种子数据脚本...\n');

    for (const seedFile of seedFiles) {
        const seedPath = join(__dirname, seedFile);
        console.log(`📦 运行 ${seedFile}...`);

        try {
            execSync(`node "${seedPath}"`, {
                stdio: 'inherit',
                cwd: join(__dirname, '../..')
            });
            console.log(`✅ ${seedFile} 运行成功\n`);
        } catch (error) {
            console.error(`❌ ${seedFile} 运行失败:`, error.message);
            process.exit(1);
        }
    }

    console.log('🎉 所有种子数据创建完成！');
}

runSeeds().catch((error) => {
    console.error('种子数据运行失败:', error);
    process.exit(1);
});