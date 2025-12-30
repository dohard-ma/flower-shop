import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sku = '3004119556059';
  console.log(`Checking SKU: ${sku}`);

  const variant = await prisma.productVariant.findFirst({
    where: { storeCode: sku },
    include: {
      product: {
        include: {
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
      }
    }
  });

  if (!variant) {
    console.log('SKU not found in ProductVariant table.');
    return;
  }

  console.log('--- ProductVariant ---');
  console.log(JSON.stringify(variant, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));

  console.log('--- Product ---');
  console.log(JSON.stringify(variant.product, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
