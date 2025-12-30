import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 验证同步功能的脚本
 * 用途:检查某个商品的基本信息是否正确更新
 */
async function main() {
  const targetSku = '3004119556059'; // 测试用的 SKU
  
  console.log('=== 查询商品信息 ===');
  const variant = await prisma.productVariant.findFirst({
    where: { storeCode: targetSku },
    include: {
      product: {
        include: {
          categories: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });

  if (!variant) {
    console.log('❌ 未找到该 SKU 的商品');
    return;
  }

  console.log('\n✅ 找到商品:');
  console.log(`  SPU ID: ${variant.product.displayId}`);
  console.log(`  商品名称: ${variant.product.name}`);
  console.log(`  排序值: ${variant.product.sortOrder}`);
  console.log(`  图片数量: ${Array.isArray(variant.product.images) ? (variant.product.images as any[]).length : 0}`);
  if (Array.isArray(variant.product.images) && (variant.product.images as any[]).length > 0) {
    console.log(`  第一张图片: ${(variant.product.images as any[])[0]}`);
  }
  
  console.log(`\n  分类信息:`);
  if (variant.product.categories.length === 0) {
    console.log('    ⚠️  无分类');
  } else {
    variant.product.categories.forEach(c => {
      console.log(`    - ${c.category.name}`);
    });
  }

  console.log(`\n  SKU 信息:`);
  console.log(`    规格名称: ${variant.name}`);
  console.log(`    库存: ${variant.stock}`);
  console.log(`    价格: ${variant.price}`);
  console.log(`    店内码: ${variant.storeCode}`);

  console.log('\n=== 验证提示 ===');
  console.log('请检查以下内容:');
  console.log('1. 商品名称是否已清理(去除促销词和【】符号)');
  console.log('2. 分类是否正确(应该匹配美团的 tagList)');
  console.log('3. 图片是否已更新');
  console.log('4. 排序值是否合理(应该反映商品在美团列表中的位置)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
