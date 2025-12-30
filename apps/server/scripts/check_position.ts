import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const storeId = 'cmjgulwyt0000twew6x0nap84';
  const targetDisplayId = 'P75703964';
  
  const target = await prisma.product.findFirst({
    where: { storeId, displayId: targetDisplayId },
    select: { createdAt: true, status: true }
  });

  if (!target) {
    console.log('Product not found');
    return;
  }

  const allProducts = await prisma.product.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    select: { displayId: true, createdAt: true }
  });
  
  const position = allProducts.findIndex(p => p.displayId === targetDisplayId);
  const pageSize = 20;
  const pageNumber = Math.ceil((position + 1) / pageSize);
  
  console.log(JSON.stringify({
    found: true,
    status: target.status,
    createdAt: target.createdAt.toISOString(),
    totalProducts: allProducts.length,
    position: position + 1,
    pageNumber: pageNumber,
    isOnFirstPage: pageNumber === 1
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
