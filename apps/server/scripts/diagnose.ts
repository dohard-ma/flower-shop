import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const storeId = 'cmjgulwyt0000twew6x0nap84';
  const targetDisplayId = 'P75703964';
  
  console.log('Test 1: Find target product by displayId');
  const target = await prisma.product.findFirst({
    where: { storeId, displayId: targetDisplayId }
  });
  console.log('Target found:', target ? 'YES' : 'NO');
  if (target) {
    console.log('Status:', target.status);
  }

  console.log('\nTest 2: Query first page (like frontend does)');
  const page = 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const products = await prisma.product.findMany({
    where: { storeId },
    skip,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
    select: {
      displayId: true,
      status: true,
      createdAt: true
    }
  });

  console.log(`Found ${products.length} products on page 1`);
  const targetInPage = products.find(p => p.displayId === targetDisplayId);
  console.log('Target in page 1:', targetInPage ? 'YES' : 'NO');
  
  if (!targetInPage && target) {
    console.log('\nTest 3: Find position of target product');
    const allProducts = await prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: { displayId: true, createdAt: true }
    });
    
    const position = allProducts.findIndex(p => p.displayId === targetDisplayId);
    console.log(`Target position: ${position + 1} of ${allProducts.length}`);
    console.log(`Target would be on page: ${Math.ceil((position + 1) / pageSize)}`);
    console.log(`Target createdAt: ${target.createdAt}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
