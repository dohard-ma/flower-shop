import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const storeId = 'cmjgulwyt0000twew6x0nap84'; // 从脚本输出中获取
  
  console.log('=== 测试 1: 查询所有商品(不带任何过滤) ===');
  const allProducts = await prisma.product.findMany({
    where: { storeId },
    select: {
      id: true,
      displayId: true,
      name: true,
      status: true,
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(`找到 ${allProducts.length} 个商品:`);
  allProducts.forEach(p => {
    console.log(`  - ${p.displayId}: ${p.name.substring(0, 30)}... [${p.status}]`);
  });

  console.log('\n=== 测试 2: 查询 INACTIVE 状态的商品 ===');
  const inactiveProducts = await prisma.product.findMany({
    where: { 
      storeId,
      status: 'INACTIVE'
    },
    select: {
      id: true,
      displayId: true,
      name: true,
      status: true,
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(`找到 ${inactiveProducts.length} 个 INACTIVE 商品:`);
  inactiveProducts.forEach(p => {
    console.log(`  - ${p.displayId}: ${p.name.substring(0, 30)}... [${p.status}]`);
  });

  console.log('\n=== 测试 3: 查询目标商品 P75703964 ===');
  const targetProduct = await prisma.product.findFirst({
    where: {
      storeId,
      displayId: 'P75703964'
    },
    select: {
      id: true,
      displayId: true,
      name: true,
      status: true,
      createdAt: true,
      categories: {
        include: {
          category: true
        }
      },
      channels: {
        include: {
          channel: true
        }
      }
    }
  });

  if (targetProduct) {
    console.log('✅ 找到目标商品:');
    console.log(`  ID: ${targetProduct.id}`);
    console.log(`  DisplayID: ${targetProduct.displayId}`);
    console.log(`  Name: ${targetProduct.name}`);
    console.log(`  Status: ${targetProduct.status}`);
    console.log(`  CreatedAt: ${targetProduct.createdAt}`);
    console.log(`  Categories: ${targetProduct.categories.map(c => c.category.name).join(', ')}`);
    console.log(`  Channels: ${targetProduct.channels.map(c => `${c.channel.name}(isListed:${c.isListed})`).join(', ')}`);
  } else {
    console.log('❌ 未找到目标商品');
  }

  console.log('\n=== 测试 4: 模拟前端 API 查询(全部商品,第1页) ===');
  const page = 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        variants: {
          orderBy: {
            sortOrder: 'asc'
          }
        },
        channels: {
          include: {
            channel: true
          }
        }
      },
    }),
    prisma.product.count({ where: { storeId } }),
  ]);

  console.log(`总共 ${total} 个商品,第 ${page} 页显示 ${products.length} 个:`);
  const targetInList = products.find(p => p.displayId === 'P75703964');
  if (targetInList) {
    console.log(`✅ 目标商品 P75703964 在第 ${page} 页中!`);
  } else {
    console.log(`❌ 目标商品 P75703964 不在第 ${page} 页中`);
    console.log(`前 5 个商品:`);
    products.slice(0, 5).forEach(p => {
      console.log(`  - ${p.displayId}: ${p.name.substring(0, 30)}... [${p.status}]`);
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
