
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStyles() {
  const styles = await prisma.productStyle.findMany({
    orderBy: { name: 'asc' }
  });
  
  const counts: Record<string, { count: number, ids: string[] }> = {};
  styles.forEach(s => {
    const key = `${s.storeId}:${s.name}`;
    if (!counts[key]) {
      counts[key] = { count: 0, ids: [] };
    }
    counts[key].count++;
    counts[key].ids.push(s.id);
  });
  
  const duplicates = Object.entries(counts).filter(([_, data]) => data.count > 1);
  
  console.log(`Total styles: ${styles.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n--- Duplicates Found ---');
    duplicates.forEach(([key, data]) => {
      console.log(`Key: [${key}], Count: ${data.count}, IDs: ${data.ids.join(', ')}`);
    });
  } else {
    console.log('\nNo duplicates found in storeId:name pairs.');
  }

  // Also check for leading/trailing spaces or invisible characters
  const uniqueNames = new Set(styles.map(s => s.name));
  console.log(`Unique style names: ${uniqueNames.size}`);
  uniqueNames.forEach(name => {
      if (name.trim() !== name) {
          console.log(`Warning: Name "${name}" has whitespace!`);
      }
  });
}

checkStyles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
