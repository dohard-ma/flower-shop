import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 开始差异比对 ---');

  // 1. 加载 Meituan Hot JSON
  const meituanHotPath = path.join(__dirname, '../../../商品数据/meituan_hot.json');
  const meituanRaw = fs.readFileSync(meituanHotPath, 'utf-8');
  const meituanData = JSON.parse(meituanRaw);
  const meituanProducts = meituanData.data.productList;
  console.log(`美团接口商品数: ${meituanProducts.length}`);

  const meituanMap = new Map();
  meituanProducts.forEach((p: any) => {
    // 使用第一个 SKU 的 sourceFoodCode 作为标识
    const code = p.wmProductSkus[0]?.sourceFoodCode;
    if (code) {
      meituanMap.set(code, p.name);
    }
  });

  // 2. 加载 all_products.js
  const allProductsPath = path.join(__dirname, '../../../商品数据/all_products.js');
  const allProductsRaw = fs.readFileSync(allProductsPath, 'utf-8');
  // 提取数组部分
  const jsonMatch = allProductsRaw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('无法解析 all_products.js');
    return;
  }
  const allProducts = JSON.parse(jsonMatch[0]);
  console.log(`all_products.js 已处理商品数: ${allProducts.length}`);

  const processedHot = allProducts.filter((p: any) => 
    p.categories && p.categories.includes('热卖爆款【推荐】')
  );
  console.log(`all_products.js 中热卖爆款数: ${processedHot.length}`);

  const processedMap = new Map();
  processedHot.forEach((p: any) => {
    const code = p.skus[0]?.source_food_code;
    if (code) {
      processedMap.set(code, p.original_name);
    }
  });

  // 3. 查询数据库
  const dbCategory = await prisma.storeCategory.findFirst({
    where: { name: '热卖爆款【推荐】' },
    include: {
      products: {
        include: {
            product: {
                include: {
                    variants: true
                }
            }
        }
      }
    }
  });

  const dbProducts = dbCategory?.products || [];
  console.log(`数据库中热卖爆款关联商品数: ${dbProducts.length}`);

  const dbMap = new Map();
  dbProducts.forEach((cp: any) => {
    const p = cp.product;
    const code = p.variants[0]?.storeCode;
    if (code) {
      dbMap.set(code, p.name);
    }
  });

  // --- 比对分析 ---

  console.log('\n--- 1. 美团接口 vs all_products.js ---');
  const missingInAllProducts: string[] = [];
  meituanMap.forEach((name, code) => {
    if (!processedMap.has(code)) {
      missingInAllProducts.push(`[${code}] ${name}`);
    }
  });
  console.log(`美团有但 all_products.js 没标热卖的商品 (${missingInAllProducts.length}):`);
  missingInAllProducts.forEach(m => console.log(`  - ${m}`));

  console.log('\n--- 2. all_products.js vs 数据库 ---');
  const missingInDb: string[] = [];
  processedMap.forEach((name, code) => {
    if (!dbMap.has(code)) {
      missingInDb.push(`[${code}] ${name}`);
    }
  });
  console.log(`all_products.js 有但数据库没关联的商品 (${missingInDb.length}):`);
  missingInDb.forEach(m => console.log(`  - ${m}`));

  console.log('\n--- 3. 详细调查：缺失的 2 个具体商品 ---');
  // 按照用户说的，美团 27，系统 25。
  // 我们重点看 missingInAllProducts
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
