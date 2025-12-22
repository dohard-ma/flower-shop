/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck
/**
 * 旧商品数据迁移脚本 (增强版)
 * 用途：将解析后的 old-products.json 数据同步到数据库，支持覆盖更新和深度解析 JSON
 */

import { PrismaClient } from '@prisma/client';
import Hashids from 'hashids';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const HASHIDS_SALT = process.env.HASHIDS_SALT || 'huajianli-secret-salt';
const hashids = new Hashids(HASHIDS_SALT, 4);

async function generateProductDisplayId(storeCode) {
  const sequence = await prisma.systemSequence.create({ data: {} });
  const hashedId = hashids.encode(sequence.id);
  return `${storeCode}P-${hashedId}`;
}

async function migrateOldProducts() {
  console.log('🚀 开始同步商品数据 (支持覆盖更新)...\n');

  try {
    const jsonPath = path.resolve(__dirname, 'old-products.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error('找不到 old-products.json，请先运行解析脚本');
    }

    const oldProductsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    // 获取店铺
    let store = await prisma.store.findFirst({ where: { code: 'H' } });
    if (!store) {
      store = await prisma.store.create({
        data: { name: '花间里', code: 'H', appId: 'placeholder' }
      });
    }

    // 处理分类映射
    const categoryNames = [...new Set(oldProductsData.map(p => p.style || p.category).filter(Boolean))];
    const categoryMap = {};
    for (const name of categoryNames) {
      let cat = await prisma.category.findFirst({ where: { storeId: store.id, name } });
      if (!cat) {
        cat = await prisma.category.create({
          data: { storeId: store.id, name, level: 0 }
        });
      }
      categoryMap[name] = cat.id;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < oldProductsData.length; i++) {
      const oldProduct = oldProductsData[i];

      try {
        // 深度解析 JSON
        const deepParseJson = (input) => {
          if (!input || input === 'null') return [];
          let current = input;
          try {
            // 循环解析直到不再是字符串（处理双重转义）
            while (typeof current === 'string' && (current.startsWith('[') || current.startsWith('{') || current.startsWith('"'))) {
              const decoded = JSON.parse(current);
              if (decoded === current) break;
              current = decoded;
            }
          } catch (e) {
            // 如果解析失败但看起来像数组，尝试清理转义符
            if (typeof current === 'string' && current.includes('http')) {
               const matches = current.match(/https?:\/\/[^\s"']+/g);
               if (matches) return matches;
            }
            return [];
          }
          return Array.isArray(current) ? current : (current ? [current] : []);
        };

        const images = deepParseJson(oldProduct.images);
        const materials = deepParseJson(oldProduct.materials);
        const categoryId = categoryMap[oldProduct.style || oldProduct.category] || null;

        // 检查是否存在
        const existing = await prisma.product.findUnique({ where: { id: oldProduct.id } });

        if (existing) {
          // 更新现有商品
          await prisma.product.update({
            where: { id: oldProduct.id },
            data: {
              images,
              materials,
              categoryId,
              priceRef: oldProduct.priceRef,
              description: oldProduct.description,
              status: oldProduct.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
              updatedAt: oldProduct.updatedAt ? new Date(oldProduct.updatedAt) : new Date()
            }
          });
          console.log(`   [${i+1}/${oldProductsData.length}] 🔄 更新: ${oldProduct.name} (图片数: ${images.length})`);
        } else {
          // 创建新商品
          const displayId = await generateProductDisplayId(store.code);
          await prisma.product.create({
            data: {
              id: oldProduct.id,
              storeId: store.id,
              displayId,
              name: oldProduct.name,
              categoryId,
              images,
              materials,
              priceRef: oldProduct.priceRef,
              style: oldProduct.style,
              status: oldProduct.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
              description: oldProduct.description,
              createdAt: oldProduct.createdAt ? new Date(oldProduct.createdAt) : new Date(),
              updatedAt: oldProduct.updatedAt ? new Date(oldProduct.updatedAt) : new Date()
            }
          });
          console.log(`   [${i+1}/${oldProductsData.length}] ✅ 新增: ${oldProduct.name} (${displayId})`);
        }
        successCount++;
      } catch (err) {
        console.error(`   ❌ 失败 [${oldProduct.name}]:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 同步完成！成功: ${successCount}, 失败: ${errorCount}`);
  } catch (error) {
    console.error('💥 脚本崩溃:', error);
  }
}

migrateOldProducts().finally(() => prisma.$disconnect());
