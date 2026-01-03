
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanStyles() {
  console.log('🚀 Starting ProductStyle cleanup...');
  
  const styles = await prisma.productStyle.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  const styleGroups: Record<string, string[]> = {};
  styles.forEach(s => {
    const key = `${s.storeId}:${s.name.trim()}`;
    if (!styleGroups[key]) {
      styleGroups[key] = [];
    }
    styleGroups[key].push(s.id);
  });
  
  let totalMerged = 0;
  
  for (const [key, ids] of Object.entries(styleGroups)) {
    if (ids.length > 1) {
      const canonicalId = ids[0];
      const duplicateIds = ids.slice(1);
      
      console.log(`\n📦 Merging [${key}]:`);
      console.log(`   - Canonical ID: ${canonicalId}`);
      console.log(`   - Duplicates to remove: ${duplicateIds.length}`);
      
      // Update all products pointing to duplicates
      const updateResult = await prisma.product.updateMany({
        where: { styleId: { in: duplicateIds } },
        data: { styleId: canonicalId }
      });
      
      console.log(`   - Updated ${updateResult.count} products.`);
      
      // Delete duplicate styles
      const deleteResult = await prisma.productStyle.deleteMany({
        where: { id: { in: duplicateIds } }
      });
      
      console.log(`   - Deleted ${deleteResult.count} duplicate style entries.`);
      totalMerged += deleteResult.count;
    }
  }
  
  console.log(`\n✅ Cleanup complete. Total duplicate styles removed: ${totalMerged}`);
}

cleanStyles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
