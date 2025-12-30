import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const storeId = 'cmjgulwyt0000twew6x0nap84';
  
  // Test 1: Search by displayId
  console.log('=== Test 1: Search by displayId "P75703964" ===');
  const byDisplayId = await prisma.product.findMany({
    where: {
      storeId,
      OR: [
        { name: { contains: 'P75703964' } },
        { displayId: { contains: 'P75703964' } },
      ]
    },
    select: { displayId: true, name: true, status: true }
  });
  console.log(`Found ${byDisplayId.length} products`);
  byDisplayId.forEach(p => console.log(`  - ${p.displayId} [${p.status}]`));

  // Test 2: Search by name keyword
  console.log('\n=== Test 2: Search by name "落雪" ===');
  const byName = await prisma.product.findMany({
    where: {
      storeId,
      OR: [
        { name: { contains: '落雪' } },
        { displayId: { contains: '落雪' } },
      ]
    },
    select: { displayId: true, name: true, status: true },
    take: 5
  });
  console.log(`Found ${byName.length} products`);
  byName.forEach(p => console.log(`  - ${p.displayId}: ${p.name.substring(0, 20)}... [${p.status}]`));

  // Test 3: Filter by INACTIVE status
  console.log('\n=== Test 3: INACTIVE products (first page) ===');
  const inactive = await prisma.product.findMany({
    where: {
      storeId,
      status: 'INACTIVE'
    },
    orderBy: { createdAt: 'desc' },
    select: { displayId: true, createdAt: true },
    take: 20
  });
  console.log(`Total INACTIVE products on first page: ${inactive.length}`);
  const targetInInactive = inactive.find(p => p.displayId === 'P75703964');
  console.log(`Target P75703964 in INACTIVE first page: ${targetInInactive ? 'YES' : 'NO'}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
