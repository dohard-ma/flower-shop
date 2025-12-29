
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const store = await prisma.store.findFirst();
  const channels = await prisma.channel.findMany();
  console.log(JSON.stringify({ store, channels }));
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
